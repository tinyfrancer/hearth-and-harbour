/*
 * The painted town kept between visits, so a page opened again shows the
 * town in a fraction of the two seconds it takes to work it out. All of it
 * runs in the town's worker (`town2Worker.ts`): the page's thread never
 * waits on storage, and the first frame never waits on anything.
 *
 * What is kept: the town's facts, and for each time of day its pictures as
 * PNG bytes (the still with every standing piece on it, each piece, the
 * foam, smoke, gull and townsfolk) and its ground cells, gzipped where the
 * browser can. About 3 MB a time of day, against 23 MB as raw pixels.
 *
 * The version it is kept under is the worker's own file name. In a built
 * game that name carries a hash of the worker's whole bundle, and every
 * line that decides a pixel of the town (the art lane's drawing, palettes,
 * layout and figures; this lane's painting, shadows, words and townsfolk)
 * is in that bundle: a deploy that changes any of them is a new name, so
 * stale art is never shown, and one that changes only the menus keeps the
 * kept town. Nothing outside `src/scene` is needed to know it. A worker with
 * no hash in its name (the dev server) keeps nothing. Each store throws away
 * whatever is kept under any other version.
 *
 * Storage is a nicety: unavailable (some private windows), slow (it gives up
 * after `STORE_WAIT_MS`), full, or failing in any way, the town is worked out
 * as before and simply not kept.
 */
import type { TimeOfDay } from './daylight';
import type { Raw } from './figures2';
import type { Facings, KeptReport, TownFacts, TownPaint } from './town2Facts';

/** Bumped when what is kept changes shape, so an old shape is never read as the new. */
export const CACHE_FORMAT = 1;

/** How long storage gets to answer before the town is worked out without it. */
export const STORE_WAIT_MS = 1500;

/**
 * The version a town is kept under, from the worker's own address: its file
 * name where a build has fingerprinted it (`town2Worker-Dc1iUHMo.js`), else
 * null, and nothing is kept.
 */
export function cacheVersion(address: string): string | null {
  let path: string;
  try {
    path = new URL(address).pathname;
  } catch {
    return null;
  }
  const file = path.split('/').pop() ?? '';
  return /-[\w-]{6,}\.js$/.test(file) ? `${CACHE_FORMAT}:${file}` : null;
}

/** Somewhere to keep things by key: IndexedDB in a browser, a map in tests. */
export interface Store {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  keys(): Promise<string[]>;
  delete(key: string): Promise<void>;
}

/** Turns pictures and cells into bytes to keep, and back. The worker's uses canvases; tests', plain copies. */
export interface Codec {
  encode(r: Raw): Promise<ArrayBuffer>;
  decode(bytes: ArrayBuffer): Promise<ImageBitmap>;
  pack(cells: Int16Array): Promise<{ bytes: ArrayBuffer; gz: boolean }>;
  unpack(bytes: ArrayBuffer, gz: boolean): Promise<Int16Array>;
}

/** A time of day's town as it is kept. */
export interface KeptTown {
  readonly format: number;
  readonly time: TimeOfDay;
  readonly still: ArrayBuffer;
  readonly pieces: readonly ArrayBuffer[];
  readonly standing: TownPaint<unknown>['standing'];
  readonly foam: { readonly x: number; readonly y: number; readonly image: ArrayBuffer };
  readonly smoke: readonly (readonly ArrayBuffer[])[];
  readonly gull: Facings<ArrayBuffer>;
  readonly folk: readonly (readonly Facings<ArrayBuffer>[])[];
  readonly cells: ArrayBuffer;
  readonly gz: boolean;
  readonly bytes: number;
}

const factsKey = (version: string): string => `${version} facts`;
const townKey = (version: string, time: TimeOfDay): string => `${version} ${time}`;

/** Waits for `p`, or gives up after `ms` with `fallback`; a failure is the fallback too. */
export function within<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

/** What was found kept for a time of day: its facts (if asked for and kept) and its pictures. */
export interface Found {
  readonly facts: TownFacts | null;
  readonly town: KeptTown | null;
}

const isKept = (v: unknown, time: TimeOfDay): v is KeptTown =>
  typeof v === 'object' &&
  v !== null &&
  (v as KeptTown).format === CACHE_FORMAT &&
  (v as KeptTown).time === time;

/** Looks for a kept town. Anything amiss (a failure, a slow store, an old shape) is nothing found. */
export async function findKept(
  store: Store,
  version: string,
  time: TimeOfDay,
  wantFacts: boolean,
): Promise<Found> {
  const nothing: Found = { facts: null, town: null };
  return within(
    (async () => {
      const town = await store.get(townKey(version, time));
      if (!isKept(town, time)) return nothing;
      const facts = wantFacts ? ((await store.get(factsKey(version))) as TownFacts | null) : null;
      if (wantFacts && !facts) return nothing;
      return { facts: facts ?? null, town };
    })(),
    STORE_WAIT_MS,
    nothing,
  );
}

/** A painted town turned into what is kept. */
export async function keptOf(paint: TownPaint<Raw>, codec: Codec): Promise<KeptTown> {
  const one = (r: Raw) => codec.encode(r);
  const maybe = async (r: Raw | null) => (r ? one(r) : null);
  const [still, pieces, foam, smoke, gullRight, gullLeft, folk, cells] = await Promise.all([
    one(paint.still),
    Promise.all(paint.pieces.map(one)),
    one(paint.foam.image),
    Promise.all(paint.smoke.map((frames) => Promise.all(frames.map(one)))),
    maybe(paint.gull.right),
    maybe(paint.gull.left),
    Promise.all(
      paint.folk.map((breaths) =>
        Promise.all(
          breaths.map(async (f) => ({ right: await maybe(f.right), left: await maybe(f.left) })),
        ),
      ),
    ),
    codec.pack(paint.cells),
  ]);
  const all = [
    still,
    ...pieces,
    foam,
    ...smoke.flat(),
    gullRight,
    gullLeft,
    ...folk.flat().flatMap((f) => [f.right, f.left]),
    cells.bytes,
  ];
  return {
    format: CACHE_FORMAT,
    time: paint.time,
    still,
    pieces,
    standing: paint.standing,
    foam: { x: paint.foam.x, y: paint.foam.y, image: foam },
    smoke,
    gull: { right: gullRight, left: gullLeft },
    folk,
    cells: cells.bytes,
    gz: cells.gz,
    bytes: all.reduce((sum, b) => sum + (b?.byteLength ?? 0), 0),
  };
}

/** A kept town as the page takes it: on bitmaps, its still composed. */
export async function paintOf(kept: KeptTown, codec: Codec): Promise<TownPaint<ImageBitmap>> {
  const one = (b: ArrayBuffer) => codec.decode(b);
  const maybe = async (b: ArrayBuffer | null) => (b ? one(b) : null);
  const [still, pieces, foam, smoke, right, left, folk, cells] = await Promise.all([
    one(kept.still),
    Promise.all(kept.pieces.map(one)),
    one(kept.foam.image),
    Promise.all(kept.smoke.map((frames) => Promise.all(frames.map(one)))),
    maybe(kept.gull.right),
    maybe(kept.gull.left),
    Promise.all(
      kept.folk.map((breaths) =>
        Promise.all(
          breaths.map(async (f) => ({ right: await maybe(f.right), left: await maybe(f.left) })),
        ),
      ),
    ),
    codec.unpack(kept.cells, kept.gz),
  ]);
  return {
    time: kept.time,
    composed: true,
    still,
    pieces,
    standing: kept.standing,
    foam: { x: kept.foam.x, y: kept.foam.y, image: foam },
    smoke,
    gull: { right, left },
    folk,
    cells,
  };
}

/**
 * Keeps a painted town (and the facts, once) under `version`, and throws
 * away whatever is kept under any other. Says how many bytes this version
 * now takes, or why nothing was kept.
 */
export async function keep(
  store: Store,
  version: string,
  facts: TownFacts | null,
  town: KeptTown,
): Promise<KeptReport> {
  try {
    for (const key of await store.keys())
      if (!key.startsWith(`${version} `)) await store.delete(key);
    if (facts) await store.put(factsKey(version), facts);
    await store.put(townKey(version, town.time), town);
    let bytes = 0;
    for (const time of ['day', 'dusk'] as const) {
      const kept = await store.get(townKey(version, time));
      if (isKept(kept, time)) bytes += kept.bytes;
    }
    return { how: 'stored', version, bytes };
  } catch (error) {
    // Full, or refused: the town was shown all the same; next time it is worked out again.
    return { how: 'none', version, bytes: null, why: String(error) };
  }
}

/* ----- In a browser ----- */

const DB = 'hearth-and-harbour-town';
const OBJECTS = 'town';

const done = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** IndexedDB as a `Store`; null where there is none, or it will not open in time. */
export async function openStore(): Promise<Store | null> {
  if (typeof indexedDB === 'undefined') return null;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(OBJECTS);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('blocked'));
  });
  let db: IDBDatabase | null;
  try {
    db = await within(opening, STORE_WAIT_MS, null);
  } catch {
    db = null;
  }
  if (!db) return null;
  const objects = (mode: IDBTransactionMode) => db.transaction(OBJECTS, mode).objectStore(OBJECTS);
  return {
    get: (key) => done(objects('readonly').get(key)),
    keys: async () => (await done(objects('readonly').getAllKeys())).map(String),
    put: async (key, value) => {
      await done(objects('readwrite').put(value, key));
    },
    delete: async (key) => {
      await done(objects('readwrite').delete(key));
    },
  };
}

/** Pictures as PNG bytes through a worker's canvases; cells gzipped where the browser can. */
export const workerCodec: Codec = {
  async encode(r) {
    const canvas = new OffscreenCanvas(r.w, r.h);
    canvas
      .getContext('2d')!
      .putImageData(new ImageData(r.data as Uint8ClampedArray<ArrayBuffer>, r.w, r.h), 0, 0);
    return (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer();
  },
  decode(bytes) {
    // Exactly the pixels kept: no colour management, no premultiplying.
    return createImageBitmap(new Blob([bytes], { type: 'image/png' }), {
      colorSpaceConversion: 'none',
      premultiplyAlpha: 'none',
    });
  },
  async pack(cells) {
    const raw = cells.buffer.slice(
      cells.byteOffset,
      cells.byteOffset + cells.byteLength,
    ) as ArrayBuffer;
    if (typeof CompressionStream === 'undefined') return { bytes: raw, gz: false };
    const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
    return { bytes: await new Response(stream).arrayBuffer(), gz: true };
  },
  async unpack(bytes, gz) {
    if (!gz) return new Int16Array(bytes.slice(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Int16Array(await new Response(stream).arrayBuffer());
  },
};
