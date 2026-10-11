import { describe, expect, it } from 'vitest';
import {
  ACTIVITY2_IDS,
  FIGURE2_H,
  FIGURE2_W,
  KNIGHT_GEAR2,
  activityFrameMs2,
  activityFrames2,
  activityProp2,
  characterActivity2,
  characterActivityPicture2,
  characterPicture2,
} from '../../src/art/character2';
import type { TGrid } from '../../src/art/town2/cells';

// The hero at work (B13, for the idle menu next wave; docs/style-guide.md,
// "Activity poses"): a short loop for each skill the game has, side-on, with
// the work's own tool in hand and a prop to do it on, in any look and outfit.

/** The test's own copy of the game's skill ids (src/data/skills.ts), so art never imports the game. */
const SKILLS = [
  'woodcutting',
  'fishing',
  'mining',
  'foraging',
  'cooking',
  'smithing',
  'crafting',
  'fletching',
  'alchemy',
  'melee',
  'ranged',
  'defence',
  'vitality',
  'thieving',
];
const COMBAT = ['melee', 'ranged', 'defence', 'vitality'];
const OUTFITS: readonly { look: object; worn: string[]; extra?: string[] }[] = [
  { look: {}, worn: [] },
  {
    look: { hair: 'long', beard: 'full_beard', skin: 'deep' },
    worn: ['linen_tunic', 'linen_trousers'],
  },
  {
    look: { hair: 'twin_braids' },
    worn: ['iron_helmet', 'iron_breastplate', 'iron_greaves', 'iron_shield', 'iron_sword'],
  },
  { look: { hair: 'mohawk' }, worn: ['captains_coat', 'tricorn', 'pirate_cutlass'] },
  { look: {}, worn: [], extra: [...KNIGHT_GEAR2] },
];

const drawn = (g: TGrid) => [...g.d].filter(Boolean).length;
const same = (a: TGrid, b: TGrid) => a.d.every((c, i) => c === b.d[i]);

describe('activity poses', () => {
  it('has a loop for every skill the game has', () => {
    expect([...ACTIVITY2_IDS].sort()).toEqual([...SKILLS].sort());
    for (const id of SKILLS) {
      const n = activityFrames2(id);
      if (id === 'vitality') expect(n).toBe(2);
      else expect(n, id).toBeGreaterThanOrEqual(4);
      expect(n, id).toBeLessThanOrEqual(6);
      expect(activityFrameMs2(id), id).toBeGreaterThan(60);
    }
    expect(activityFrames2('juggling')).toBe(0);
  });

  it('draws every frame on the figure’s canvas, moving, in every outfit and look', () => {
    for (const id of SKILLS)
      for (const o of OUTFITS) {
        const frames = Array.from(
          { length: activityFrames2(id) },
          (_, f) => characterActivityPicture2(o.look, o.worn, id, f, o.extra).grid,
        );
        for (const g of frames) {
          expect(g.w).toBe(FIGURE2_W);
          expect(g.h).toBe(FIGURE2_H);
          expect(drawn(g), id).toBeGreaterThan(900);
          // The soles' outline is the lowest row; nothing on the canvas's last row.
          for (let x = 0; x < g.w; x++) expect(g.d[(g.h - 1) * g.w + x], `${id} last row`).toBe(0);
        }
        // A loop moves: no two frames in a row the same.
        for (let f = 0; f < frames.length; f++)
          expect(same(frames[f]!, frames[(f + 1) % frames.length]!), `${id} ${f}`).toBe(false);
      }
  });

  it('puts the weapon and shield down for the work’s own tool, and is never the standing picture', () => {
    const worn = ['iron_helmet', 'iron_breastplate', 'iron_shield', 'iron_sword'];
    const stand = characterPicture2({}, worn).grid;
    for (const id of SKILLS.filter((s) => !COMBAT.includes(s)))
      for (let f = 0; f < activityFrames2(id); f++) {
        const a = characterActivityPicture2({}, worn, id, f).grid;
        const b = characterActivityPicture2({}, ['iron_helmet', 'iron_breastplate'], id, f).grid;
        expect(same(a, b), `${id} ${f}`).toBe(true);
        expect(same(a, stand), `${id} ${f}`).toBe(false);
      }
  });

  it('gives each gathering and making skill a prop beside the hero, and combat none', () => {
    for (const id of SKILLS) {
      const p = activityProp2(id);
      if (COMBAT.includes(id)) {
        expect(p, id).toBeNull();
        continue;
      }
      expect(p, id).not.toBeNull();
      const g = p!.picture.grid;
      expect(p!.foot.x).toBeGreaterThanOrEqual(0);
      expect(p!.foot.x).toBeLessThan(g.w);
      expect(p!.foot.y).toBeLessThan(g.h);
      // In front of the hero, where the work lands.
      expect(p!.at.x, id).toBeGreaterThan(12);
      expect(drawn(g), id).toBeGreaterThan(40);
    }
  });

  it('keeps its frames and their canvases once drawn', () => {
    const a = characterActivityPicture2({}, [], 'mining', 2);
    expect(characterActivityPicture2({}, [], 'mining', 2)).toBe(a);
    expect(characterActivityPicture2({}, [], 'mining', 6)).toBe(a);
    expect(characterActivity2({}, [], 'day', 'mining', 2)).toBe(
      characterActivity2({}, [], 'day', 'mining', 2),
    );
    // An unknown activity is the hero standing.
    expect(characterActivityPicture2({}, [], 'juggling', 0)).toBe(characterPicture2({}, []));
  });
});
