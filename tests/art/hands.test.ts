import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, characterPicture } from '../../src/art/character';
import { DEPTH } from '../../src/art/depth';
import {
  FIGURE_LEGEND,
  HERO_OUTFIT,
  WARDROBE,
  dress,
  type FigurePart,
  type GearDef,
} from '../../src/art/figure';
import { get, parseSprite, type Grid } from '../../src/art/grid';
import type { Shade } from '../../src/art/palette';
import { TOWNSFOLK_GEAR } from '../../src/art/townsfolk';
import { FIST_PART } from '../../src/art/wardrobe';

// The hand rule (docs/style-guide.md, "How things are held"): a held thing's
// grip runs through the fist and the fingers cover it; the rest of it is in
// front of the arm and body, showing directly above the fist and directly
// below it; only a bowstring goes behind. B5 wrote it after Cody saw weapons
// "appearing behind the character's hand": the blades were one layer behind
// the arm, and a fist-sized grip stood where the hand should have been.

type Cell = readonly [x: number, y: number, step: Shade];
const key = (x: number, y: number) => `${x},${y}`;

function cells(part: FigurePart): Cell[] {
  const g = parseSprite(part.rows, FIGURE_LEGEND);
  const out: Cell[] = [];
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = get(g, x, y);
      if (c) out.push([part.at[0] + x, part.at[1] + y, c]);
    }
  return out;
}

const partsAt = (gear: GearDef, depth: number) =>
  gear.parts.filter((p) => p.depth === depth).flatMap(cells);

const FIST = cells(FIST_PART);
const fistAt = new Set(FIST.map(([x, y]) => key(x, y)));
const FIST_COLUMNS = [...new Set(FIST.map(([x]) => x))];
const fistTop = (x: number) => Math.min(...FIST.filter(([fx]) => fx === x).map(([, y]) => y));
const fistBottom = (x: number) => Math.max(...FIST.filter(([fx]) => fx === x).map(([, y]) => y));

const townsfolkGear = new Set(TOWNSFOLK_GEAR.map((g) => g.id));
/** Everything the standard body holds in its weapon hand, the hero's sword included. */
const HELD = WARDROBE.gear.filter((g) => g.slot === 'weapon' && !townsfolkGear.has(g.id));
const SHIELDS = WARDROBE.gear.filter((g) => g.slot === 'shield');
const EVERYDAY = ['short_hair', 'teal_tunic', 'grey_trousers', 'leather_boots', 'leather_belt'];
/** What may be worn with a held thing, layered on the arm or chest. */
const OUTFITS: readonly (readonly string[])[] = [
  EVERYDAY,
  ['short_hair', 'linen_tunic', 'linen_trousers', 'leather_boots', 'leather_belt', 'linen_hood'],
  [...EVERYDAY, 'bronze_jerkin', 'bronze_cap', 'shell_bracelet', 'shell_necklace'],
  [...EVERYDAY, 'iron_mail', 'iron_nasal_helm', 'arrow_quiver'],
  HERO_OUTFIT.filter((id) => id !== 'iron_sword'),
];
const isBow = (g: GearDef) => g.id.endsWith('_shortbow');

describe('the hand rule', () => {
  it('covers every held thing: the knight’s sword, the swords, the axes and the bows', () => {
    expect(HELD.map((g) => g.id).sort()).toEqual([
      'bronze_hatchet',
      'bronze_shortsword',
      'iron_arming_sword',
      'iron_bearded_axe',
      'iron_sword',
      'oak_shortbow',
      'pine_shortbow',
      'willow_shortbow',
    ]);
  });

  it('draws each in the hand’s three layers: grip, and in front; behind only for a bowstring', () => {
    for (const held of HELD) {
      for (const part of held.parts)
        expect([DEPTH.HELD_BEHIND, DEPTH.GRIP, DEPTH.HELD_FRONT], held.id).toContain(part.depth);
      expect(partsAt(held, DEPTH.GRIP).length, held.id).toBeGreaterThan(0);
      expect(partsAt(held, DEPTH.HELD_FRONT).length, held.id).toBeGreaterThan(0);
      const behind = partsAt(held, DEPTH.HELD_BEHIND);
      if (!isBow(held)) expect(behind, held.id).toEqual([]);
      // A bowstring: one straight column, clear of the hand.
      else expect(new Set(behind.map(([x]) => x)).size, held.id).toBe(1);
    }
  });

  it('runs the grip through the fist, so the fingers cover all of it', () => {
    for (const held of HELD)
      for (const [x, y] of partsAt(held, DEPTH.GRIP))
        expect(fistAt.has(key(x, y)), `${held.id} ${x},${y}`).toBe(true);
  });

  it('shows the held thing directly above the fist and directly below it', () => {
    for (const held of HELD) {
      const front = new Set(partsAt(held, DEPTH.HELD_FRONT).map(([x, y]) => key(x, y)));
      const above = FIST_COLUMNS.filter((x) => front.has(key(x, fistTop(x) - 1)));
      const below = FIST_COLUMNS.filter((x) => front.has(key(x, fistBottom(x) + 1)));
      expect(above.length, `${held.id} above`).toBeGreaterThan(0);
      expect(below.length, `${held.id} below`).toBeGreaterThan(0);
    }
  });

  it('never draws the fist over a blade, guard or head, nor them over the fist', () => {
    for (const held of HELD)
      for (const [x, y] of [
        ...partsAt(held, DEPTH.HELD_FRONT),
        ...partsAt(held, DEPTH.HELD_BEHIND),
      ])
        expect(fistAt.has(key(x, y)), `${held.id} ${x},${y}`).toBe(false);
  });

  it('shows the whole fist, and all of the held thing but its grip, in every outfit', () => {
    for (const held of HELD)
      for (const outfit of OUTFITS)
        for (const shield of [null, ...SHIELDS]) {
          const worn = outfit.filter((id) => !shield || id !== 'kite_shield');
          const gear = [
            ...worn,
            held.id,
            ...(shield && !worn.includes(shield.id) ? [shield.id] : []),
          ];
          const g = dress('standard', [...new Set(gear)]);
          const what = `${held.id} with ${gear.join()}`;
          for (const [x, y, step] of FIST)
            expect(get(g, x, y), `${what}: fist ${x},${y}`).toBe(step);
          // In front of the arm and the body: nothing but a helmet's or hood's
          // edge or the shield on the other arm could be over it, and nothing is.
          for (const [x, y, step] of [
            ...partsAt(held, DEPTH.HELD_FRONT),
            ...partsAt(held, DEPTH.HELD_BEHIND),
          ])
            expect(get(g, x, y), `${what}: ${x},${y}`).toBe(step);
        }
  });

  it('keeps a blade or haft on one line through the fist', () => {
    for (const held of HELD.filter((g) => !isBow(g))) {
      const all = [...partsAt(held, DEPTH.HELD_FRONT), ...partsAt(held, DEPTH.GRIP)];
      // The shaft: the rows just above the fist (below any head) and those
      // through and below it, leaving out the guard's row, which is wider.
      const rows = new Map<number, number[]>();
      for (const [x, y] of all) rows.set(y, [...(rows.get(y) ?? []), x]);
      const shaft = [...rows.entries()]
        .filter(([y, xs]) => y >= 20 && xs.length <= 4)
        .map(([y, xs]) => [(Math.min(...xs) + Math.max(...xs)) / 2, y] as const);
      expect(shaft.length, held.id).toBeGreaterThanOrEqual(8);
      const n = shaft.length;
      const my = shaft.reduce((s, [, y]) => s + y, 0) / n;
      const mx = shaft.reduce((s, [x]) => s + x, 0) / n;
      const b =
        shaft.reduce((s, [x, y]) => s + (y - my) * (x - mx), 0) /
        shaft.reduce((s, [, y]) => s + (y - my) ** 2, 0);
      const bend = Math.max(...shaft.map(([x, y]) => Math.abs(x - (mx + b * (y - my)))));
      expect(bend, held.id).toBeLessThanOrEqual(1);
      // It leans out from the hand towards the top, as the forearm's line runs.
      expect(b, held.id).toBeGreaterThan(0);
      // And it passes through the middle of the fist, not past its edge.
      const middle = mx + b * (28 - my);
      expect(middle, held.id).toBeGreaterThanOrEqual(Math.min(...FIST_COLUMNS) + 0.5);
      expect(middle, held.id).toBeLessThanOrEqual(Math.max(...FIST_COLUMNS) - 0.5);
    }
  });

  it('holds a bow at the middle of its stave, string outward', () => {
    for (const bow of HELD.filter(isBow)) {
      const stave = [...partsAt(bow, DEPTH.HELD_FRONT), ...partsAt(bow, DEPTH.GRIP)].map(
        ([, y]) => y,
      );
      const middle = (Math.min(...stave) + Math.max(...stave)) / 2;
      const fistRows = FIST.map(([, y]) => y);
      expect(middle, bow.id).toBeGreaterThanOrEqual(Math.min(...fistRows));
      expect(middle, bow.id).toBeLessThanOrEqual(Math.max(...fistRows));
      const string = partsAt(bow, DEPTH.HELD_BEHIND)[0]!;
      expect(string[0], bow.id).toBeLessThan(Math.min(...FIST_COLUMNS) - 3);
    }
  });

  it('closes the hand only when something is held: no fist on the resting arm', () => {
    const atEase = dress('standard_at_ease', EVERYDAY);
    for (const [x, y] of FIST) expect(get(atEase, x, y), `${x},${y}`).toBeNull();
  });

  it('shows a hand on the character holding anything, in any look', () => {
    for (const held of ['bronze_sword', 'iron_sword', 'bronze_axe', 'iron_axe', 'oak_shortbow']) {
      const g: Grid = characterPicture(DEFAULT_LOOK, [held, 'iron_breastplate']).grid;
      // The fist, one pixel in on the outlined picture.
      const skin = FIST.filter(([x, y]) => get(g, x + 1, y + 1)?.startsWith('skin'));
      expect(skin.length, held).toBe(FIST.length);
    }
  });
});

describe('a shield', () => {
  it('hides the hand it is strapped to, holding something or not', () => {
    const swordsAndBows = ['iron_arming_sword', 'oak_shortbow'];
    for (const shield of SHIELDS)
      for (const [body, held] of [
        ['standard_at_ease', []],
        ...swordsAndBows.map((id) => ['standard', [id]] as const),
      ] as const) {
        const g = dress(body, [...EVERYDAY, shield.id, ...held]);
        // The shield arm, from the elbow down, is columns 23 and on.
        for (let y = 21; y <= 28; y++)
          for (let x = 23; x < g.w; x++)
            expect(
              get(g, x, y)?.startsWith('skin') ?? false,
              `${shield.id} ${body} ${x},${y}`,
            ).toBe(false);
      }
  });
});
