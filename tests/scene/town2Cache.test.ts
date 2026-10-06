import { describe, expect, it, vi } from 'vitest';
import {
  CACHE_FORMAT,
  STORE_WAIT_MS,
  cacheVersion,
  findKept,
  keep,
  keptOf,
  openStore,
  paintOf,
  type Codec,
  type Store,
} from '../../src/scene/town2Cache';
import type { Raw } from '../../src/scene/figures2';
import type { TownFacts, TownPaint } from '../../src/scene/town2Facts';

// The painted town kept between visits: under the worker's own fingerprinted
// name, found again on the next visit, thrown away when a new deploy brings a
// new name, and never in the way when storage fails.

/** Storage in a map, as IndexedDB would keep it. */
function memoryStore(): Store & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async (key) => structuredClone(data.get(key)),
    put: async (key, value) => {
      data.set(key, structuredClone(value));
    },
    keys: async () => [...data.keys()],
    delete: async (key) => {
      data.delete(key);
    },
  };
}

/** Pictures as their raw bytes, and back as a stand-in bitmap that remembers them. */
const plainCodec: Codec = {
  encode: async (r) => r.data.slice().buffer as ArrayBuffer,
  decode: async (bytes) =>
    ({ width: 0, height: 0, close() {}, bytes: new Uint8Array(bytes) }) as unknown as ImageBitmap,
  pack: async (cells) => ({ bytes: cells.slice().buffer as ArrayBuffer, gz: false }),
  unpack: async (bytes) => new Int16Array(bytes.slice(0)),
};

const raw = (fill: number, w = 4, h = 2): Raw => ({
  w,
  h,
  data: new Uint8ClampedArray(w * h * 4).fill(fill),
});

const painted = (time: 'day' | 'dusk'): TownPaint<Raw> => ({
  time,
  composed: false,
  still: raw(1, 8, 8),
  pieces: [raw(2), raw(3)],
  standing: [{ piece: 1, x: 5, y: 6, base: 8 }],
  foam: { x: 0, y: 7, image: raw(4) },
  smoke: [[raw(5), raw(6)]],
  gull: { right: raw(7), left: null },
  folk: [[{ right: raw(8), left: raw(9) }]],
  cells: new Int16Array([1, 2, 3, 4]),
});

const facts = { scene: { map: { cols: 1, rows: 1 } }, lights: [] } as unknown as TownFacts;
const bytesOf = (b: ImageBitmap) => [...(b as unknown as { bytes: Uint8Array }).bytes];

describe('the version a town is kept under', () => {
  it('is the worker’s fingerprinted file name, and nothing in development', () => {
    expect(cacheVersion('https://hearth.example/assets/town2Worker-Dc1iUHMo.js')).toBe(
      `${CACHE_FORMAT}:town2Worker-Dc1iUHMo.js`,
    );
    // A new deploy that changes anything the worker paints with is a new name.
    expect(cacheVersion('https://hearth.example/assets/town2Worker-COlgcfT7.js')).not.toBe(
      cacheVersion('https://hearth.example/assets/town2Worker-Dc1iUHMo.js'),
    );
    expect(
      cacheVersion('http://localhost:5173/src/scene/town2Worker.ts?worker_file&type=module'),
    ).toBeNull();
    expect(cacheVersion('not an address')).toBeNull();
  });
});

describe('keeping the town', () => {
  const v1 = cacheVersion('https://x/assets/town2Worker-AAAAAAAA.js')!;
  const v2 = cacheVersion('https://x/assets/town2Worker-BBBBBBBB.js')!;

  it('misses with nothing kept, then hits with the same pictures, cells and facts', async () => {
    const store = memoryStore();
    expect(await findKept(store, v1, 'day', true)).toEqual({ facts: null, town: null });
    const town = await keptOf(painted('day'), plainCodec);
    const report = await keep(store, v1, facts, town);
    expect(report).toMatchObject({ how: 'stored', version: v1 });
    expect(report.bytes).toBe(town.bytes);
    const found = await findKept(store, v1, 'day', true);
    expect(found.facts).toEqual(facts);
    const back = await paintOf(found.town!, plainCodec);
    expect(back.composed).toBe(true);
    expect(bytesOf(back.still)).toEqual([...painted('day').still.data]);
    expect(back.pieces.map(bytesOf)).toEqual([[...raw(2).data], [...raw(3).data]]);
    expect(back.standing).toEqual(painted('day').standing);
    expect(back.gull.left).toBeNull();
    expect(bytesOf(back.folk[0]![0]!.left!)).toEqual([...raw(9).data]);
    expect([...back.cells]).toEqual([1, 2, 3, 4]);
    // The other time of day is not kept yet; the facts alone are no hit.
    expect((await findKept(store, v1, 'dusk', true)).town).toBeNull();
  });

  it('counts both times of day once both are kept', async () => {
    const store = memoryStore();
    const day = await keptOf(painted('day'), plainCodec);
    const dusk = await keptOf(painted('dusk'), plainCodec);
    await keep(store, v1, facts, day);
    expect((await keep(store, v1, null, dusk)).bytes).toBe(day.bytes + dusk.bytes);
  });

  it('misses once a deploy changes the version, and throws the old one away when it keeps the new', async () => {
    const store = memoryStore();
    await keep(store, v1, facts, await keptOf(painted('day'), plainCodec));
    expect((await findKept(store, v2, 'day', true)).town).toBeNull();
    await keep(store, v2, facts, await keptOf(painted('day'), plainCodec));
    expect([...store.data.keys()].every((k) => k.startsWith(`${v2} `))).toBe(true);
    expect((await findKept(store, v2, 'day', true)).town).not.toBeNull();
  });

  it('reads nothing kept in an older shape', async () => {
    const store = memoryStore();
    const town = await keptOf(painted('day'), plainCodec);
    await store.put(`${v1} day`, { ...town, format: CACHE_FORMAT - 1 });
    await store.put(`${v1} facts`, facts);
    expect((await findKept(store, v1, 'day', true)).town).toBeNull();
  });

  it('falls back to working it out when storage fails, is full or never answers', async () => {
    const town = await keptOf(painted('day'), plainCodec);
    const failing: Store = {
      get: () => Promise.reject(new Error('no')),
      put: () => Promise.reject(new DOMException('full', 'QuotaExceededError')),
      keys: async () => [],
      delete: async () => {},
    };
    expect(await findKept(failing, v1, 'day', true)).toEqual({ facts: null, town: null });
    const report = await keep(failing, v1, facts, town);
    expect(report).toMatchObject({ how: 'none', bytes: null });
    expect(report.why).toMatch(/full/);

    vi.useFakeTimers();
    const silent: Store = {
      get: () => new Promise(() => {}),
      put: () => new Promise(() => {}),
      keys: () => new Promise(() => {}),
      delete: () => new Promise(() => {}),
    };
    const looking = findKept(silent, v1, 'day', true);
    vi.advanceTimersByTime(STORE_WAIT_MS + 1);
    expect(await looking).toEqual({ facts: null, town: null });
    vi.useRealTimers();
  });

  it('has no store where the browser has no IndexedDB (jsdom, some private windows)', async () => {
    expect(typeof indexedDB).toBe('undefined');
    expect(await openStore()).toBeNull();
  });
});
