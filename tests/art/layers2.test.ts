import { describe, expect, it } from 'vitest';
import {
  ITEM_LAYERS2,
  KNIGHT_GEAR2,
  TOWNSFOLK2_IDS,
  WALK2_FRAMES,
  characterFrameTagged2,
  townsfolkFrameTagged2,
} from '../../src/art/character2';
import type { Tagged } from '../../src/art/figure2/walk';

// The layer order of every facing that is drawn from the front drawing (toward
// the camera, away and breathing), held by what drew each pixel
// (docs/style-guide.md, "From behind: what covers what"). Walking away, the
// body is between the viewer and anything held: a weapon, a shield, a bow
// shows only where it reaches past the body, the cloak, the head and the
// limbs. Whatever hangs over the legs (a cloak, a skirt, a coat's tails) hides
// them down to its hem in every facing.

const SLOW = { timeout: 300000 };
const W = 56;

/** Everything that is the person, rather than something held. */
const PERSON = [
  'body',
  'arm',
  'hand',
  'fist',
  'cloak',
  'skirt',
  'leg',
  'foot',
  'head',
  'hair',
  'hat',
  'quiver',
];
const HELD = ['held', 'grip', 'shield'];
/** What hangs in front of the legs: a skirt in every facing; a cloak only from behind (it hangs at the back). */
const hangs = (facing: string) => (facing === 'up' ? ['cloak', 'skirt'] : ['skirt']);

function cover(t: Tagged, tags: readonly string[]): Uint8Array {
  const out = new Uint8Array(t.tags.length);
  for (const tag of tags) {
    const c = t.cover.get(tag);
    if (c) for (let i = 0; i < c.length; i++) out[i] ||= c[i]!;
  }
  return out;
}

/** Pixels where something held shows inside the person's silhouette. */
export function heldOverPerson(t: Tagged): string[] {
  const person = cover(t, PERSON);
  const out: string[] = [];
  t.tags.forEach((tag, i) => {
    if (tag && HELD.includes(tag) && person[i]) out.push(`${tag} at ${i % W},${Math.floor(i / W)}`);
  });
  return out;
}

/** Pixels where a leg or boot shows through what hangs over it. */
export function legsThroughHem(t: Tagged, facing: string): string[] {
  const over = cover(t, hangs(facing));
  const out: string[] = [];
  t.tags.forEach((tag, i) => {
    if ((tag === 'leg' || tag === 'foot') && over[i])
      out.push(`${tag} at ${i % W},${Math.floor(i / W)}`);
  });
  return out;
}

const HELD_ITEMS = Object.keys(ITEM_LAYERS2).filter(
  (id) =>
    /sword|axe|cutlass|cudgel|bow|shield|anchor|spyglass|trollstone/.test(id) &&
    id !== 'trollstone',
);
const OUTFITS: { name: string; worn: string[]; extra?: string[] }[] = [
  ...Object.keys(ITEM_LAYERS2).map((id) => ({ name: id, worn: [id] })),
  { name: 'the knight', worn: [], extra: [...KNIGHT_GEAR2] },
  {
    name: 'the knight without his cloak',
    worn: [],
    extra: KNIGHT_GEAR2.filter((g) => g !== 'red_cloak'),
  },
  ...HELD_ITEMS.map((id) => ({ name: `${id} under the cloak`, worn: [id], extra: ['red_cloak'] })),
  { name: 'iron', worn: ['iron_helmet', 'iron_breastplate', 'iron_shield', 'iron_sword'] },
  {
    name: 'linen and a bow',
    worn: ['linen_tunic', 'linen_trousers', 'linen_hood', 'pine_shortbow', 'bronze_arrows'],
  },
  { name: 'the coat', worn: ['captains_coat', 'tricorn', 'pirate_cutlass'] },
  { name: 'the coat and a spyglass', worn: ['captains_coat', 'spyglass', 'smugglers_cutlass'] },
  { name: 'a quiver under the cloak', worn: ['oak_shortbow', 'iron_arrows'], extra: ['red_cloak'] },
];

describe('walking away, the body is in front of what it holds', () => {
  it(
    'shows no weapon, bow or shield inside the body, cloak, head or limbs, in any frame',
    SLOW,
    () => {
      const faults: string[] = [];
      for (const o of OUTFITS)
        for (let f = 0; f < WALK2_FRAMES; f++) {
          const bad = heldOverPerson(characterFrameTagged2({}, o.worn, 'up', f, o.extra));
          if (bad.length)
            faults.push(`${o.name}, frame ${f}: ${bad.length} (${bad.slice(0, 3).join('; ')})`);
        }
      expect(faults).toEqual([]);
    },
  );

  it('holds for the townsfolk: the cutlass, the hammer, the tankard, the basket and the stick', () => {
    const faults: string[] = [];
    for (const id of TOWNSFOLK2_IDS)
      for (let f = 0; f < WALK2_FRAMES; f++) {
        const bad = heldOverPerson(townsfolkFrameTagged2(id, 'up', f)!);
        if (bad.length) faults.push(`${id}, frame ${f}: ${bad.slice(0, 3).join('; ')}`);
      }
    expect(faults).toEqual([]);
  });

  it('still shows each held thing where it reaches past the body', () => {
    for (const id of HELD_ITEMS) {
      const t = characterFrameTagged2({}, [id], 'up', 0);
      const shown = t.tags.filter((tag) => tag && HELD.includes(tag)).length;
      expect(shown, id).toBeGreaterThan(0);
    }
  });
});

describe('what hangs over the legs hides them down to its hem', () => {
  it('in every frame toward, away and breathing, for every outfit', SLOW, () => {
    const faults: string[] = [];
    for (const o of OUTFITS)
      for (const facing of ['up', 'down', 'idle'] as const)
        for (let f = 0; f < (facing === 'idle' ? 2 : WALK2_FRAMES); f++) {
          const bad = legsThroughHem(characterFrameTagged2({}, o.worn, facing, f, o.extra), facing);
          if (bad.length) faults.push(`${o.name} ${facing} ${f}: ${bad.slice(0, 3).join('; ')}`);
        }
    expect(faults).toEqual([]);
  });

  it('for the townsfolk, toward and away', () => {
    const faults: string[] = [];
    for (const id of TOWNSFOLK2_IDS)
      for (const facing of ['up', 'down'] as const)
        for (let f = 0; f < WALK2_FRAMES; f++) {
          const bad = legsThroughHem(townsfolkFrameTagged2(id, facing, f)!, facing);
          if (bad.length) faults.push(`${id} ${facing} ${f}: ${bad.slice(0, 3).join('; ')}`);
        }
    expect(faults).toEqual([]);
  });
});
