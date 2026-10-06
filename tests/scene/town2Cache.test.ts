import { describe, expect, it } from 'vitest';
import { TOWN2_H, TOWN2_W } from '../../src/art/town2/town';
import type { TimeOfDay } from '../../src/scene/daylight';
import {
  KEPT_FORMAT,
  keep,
  recall,
  versionOf,
  type Kept,
  type Packer,
  type Shelf,
} from '../../src/scene/town2Cache';
import { TOWNSFOLK2_AT, town2Scene } from '../../src/scene/town2';
import type { Raw, TownFacts, TownPaint } from '../../src/scene/town2Facts';

// Keeping the finished town between visits: shown again only when it was
// made by this very build and reads back whole; anything else, and the town
// is worked out afresh as if nothing were kept. Never an error.

const raw = (): Raw => ({ w: 1, h: 1, data: new Uint8ClampedArray(4) });
const facts: TownFacts = {
  scene: town2Scene(),
  lights: [],
  smoke: [{ x: 1, y: 2 }],
  gulls: [],
  gull: { w: 1, h: 1 },
};
const paintOf = (time: TimeOfDay): TownPaint<Raw> => ({
  time,
  composed: false,
  still: raw(),
  pieces: [raw()],
  standing: [{ piece: 0, x: 0, y: 0, base: 0 }],
  foam: { x: 0, y: 0, image: raw() },
  smoke: [[raw()]],
  gull: { right: raw(), left: raw() },
  folk: TOWNSFOLK2_AT.map(() => ({ right: raw(), left: raw() })),
  cells: new Int16Array(TOWN2_W * TOWN2_H),
});

/** A shelf in a map, counting what it is asked; `broken` makes it throw. */
function shelf(broken: { get?: boolean; put?: boolean } = {}) {
  const kept = new Map<TimeOfDay, unknown>();
  const s: Shelf & { kept: typeof kept; puts: number } = {
    kept,
    puts: 0,
    async get(time) {
      if (broken.get) throw new Error('no database');
      return kept.get(time);
    },
    async put(time, k) {
      if (broken.put) throw new Error('quota');
      s.puts += 1;
      kept.set(time, k);
    },
  };
  return s;
}

/** Packs as it is; `corrupt` makes unpacking throw, as a damaged picture would. */
const packer = (corrupt = false): Packer<TownPaint<Raw>, Raw> => ({
  async pack(paint) {
    return paint;
  },
  async unpack(packed) {
    if (corrupt) throw new Error('not a PNG');
    return packed;
  },
});

const V = 'https://example.org/assets/town2Worker-Ab12Cd34.js';

describe('keeping the town between visits', () => {
  it('keeps a town by time of day and gives it back to the same build', async () => {
    const s = shelf();
    expect(await recall(s, packer(), 'day', V)).toBeNull();
    expect(await keep(s, packer(), 'day', V, facts, paintOf('day'))).toBe(true);
    const back = await recall(s, packer(), 'day', V);
    expect(back?.paint.time).toBe('day');
    expect(back?.facts.smoke).toEqual(facts.smoke);
    // Day's town is not dusk's.
    expect(await recall(s, packer(), 'dusk', V)).toBeNull();
  });

  it('never shows a town kept by another build: a new deploy works it out afresh', async () => {
    const s = shelf();
    await keep(s, packer(), 'day', V, facts, paintOf('day'));
    expect(await recall(s, packer(), 'day', V.replace('Ab12', 'Zz99'))).toBeNull();
    // Kept again under the new build, over the old.
    await keep(s, packer(), 'day', 'new', facts, paintOf('day'));
    expect((s.kept.get('day') as Kept<unknown>).version).toBe('new');
  });

  it('works the town out afresh for anything kept that does not read back whole', async () => {
    const s = shelf();
    await keep(s, packer(), 'day', V, facts, paintOf('day'));
    // A picture that will not unpack.
    expect(await recall(s, packer(true), 'day', V)).toBeNull();
    // Another shape of keep, or rubbish.
    const k = s.kept.get('day') as Kept<TownPaint<Raw>>;
    s.kept.set('day', { ...k, format: KEPT_FORMAT + 1 });
    expect(await recall(s, packer(), 'day', V)).toBeNull();
    for (const junk of [null, 'town', 42, {}, { ...k, facts: null }]) {
      s.kept.set('day', junk);
      expect(await recall(s, packer(), 'day', V)).toBeNull();
    }
    // A town that does not fit this one: cells cut short, someone missing, a piece out of range.
    const unfit = [
      { ...k.packed, cells: new Int16Array(10) },
      { ...k.packed, folk: k.packed.folk.slice(1) },
      { ...k.packed, standing: [{ piece: 3, x: 0, y: 0, base: 0 }] },
      { ...k.packed, time: 'dusk' as const },
    ];
    for (const packed of unfit) {
      s.kept.set('day', { ...k, packed });
      expect(await recall(s, packer(), 'day', V)).toBeNull();
    }
  });

  it('carries on without a shelf that throws, either way', async () => {
    expect(await recall(shelf({ get: true }), packer(), 'day', V)).toBeNull();
    expect(await keep(shelf({ put: true }), packer(), 'day', V, facts, paintOf('day'))).toBe(false);
  });

  it('keeps nothing on the development server, or for a script with no hash in its name', () => {
    expect(versionOf(V, false)).toBe(V);
    expect(versionOf(V, true)).toBeNull();
    expect(
      versionOf('http://localhost:5173/src/scene/town2Worker.ts?worker_file', false),
    ).toBeNull();
    expect(versionOf('blob:http://x/123', false)).toBeNull();
  });
});
