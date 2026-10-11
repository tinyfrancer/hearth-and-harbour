import { describe, expect, it } from 'vitest';
import {
  ACTIVITY2_IDS,
  FIGURE2_H,
  FIGURE2_W,
  KNIGHT_GEAR2,
  activityFrameMs2,
  activityFrames2,
  activityHitFrame2,
  activityProp2,
  characterActivity2,
  characterActivityPicture2,
  characterPicture2,
} from '../../src/art/character2';
import { isMat, stepOf, type TGrid } from '../../src/art/town2/cells';

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
    // B17: and rowing, for a dungeon run idle (not a skill).
    expect([...ACTIVITY2_IDS].sort()).toEqual([...SKILLS, 'dungeon'].sort());
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
    for (const id of [...SKILLS, 'dungeon'])
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

// B14: the props stood too close to the front foot and some tools landed short.
describe('activity poses at work on their props (B14)', () => {
  /** A prop's drawn pixels on the hero's canvas, where the menu will put it. */
  function propPixels(id: string): Set<string> {
    const p = activityProp2(id)!;
    const g = p.picture.grid;
    const out = new Set<string>();
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++)
        if (g.d[y * g.w + x])
          out.add(`${28 + p.at.x - p.foot.x + x},${70 + p.at.y - p.foot.y + y}`);
    return out;
  }
  const at = (s: string) => s.split(',').map(Number) as [number, number];

  it('stands every prop clear of the hero’s front foot, in every frame', () => {
    for (const id of SKILLS.filter((s) => !COMBAT.includes(s) && s !== 'fishing')) {
      const prop = [...propPixels(id)].map(at);
      // The prop's nearest pixel in the bottom rows (where the feet are).
      const propLeft = Math.min(...prop.filter(([, y]) => y >= 62).map(([x]) => x));
      for (let f = 0; f < activityFrames2(id); f++) {
        const g = characterActivityPicture2({}, [], id, f).grid;
        let foot = -1;
        for (let y = 62; y < g.h; y++)
          for (let x = 0; x < g.w; x++) if (g.d[y * g.w + x]) foot = Math.max(foot, x);
        expect(propLeft - foot - 1, `${id} ${f}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('lands the work on its prop: the tool or hand touches it at the blow', () => {
    // The frame where the work lands, by skill.
    const contact: Record<string, number> = {
      woodcutting: 2,
      mining: 3,
      smithing: 2,
      cooking: 1,
      crafting: 0,
      foraging: 1,
      thieving: 1,
      alchemy: 3,
      fishing: 0,
    };
    for (const [id, f] of Object.entries(contact)) {
      const prop = propPixels(id);
      const g = characterActivityPicture2({}, [], id, f).grid;
      let touch = false;
      for (let y = 0; y < g.h && !touch; y++)
        for (let x = 0; x < g.w && !touch; x++) {
          if (!g.d[y * g.w + x] || y >= 62) continue;
          for (const [dx, dy] of [
            [0, 0],
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
          ] as const)
            if (prop.has(`${x + dx},${y + dy}`)) touch = true;
        }
      expect(touch, id).toBe(true);
    }
  });
});

// B17: rowing the little boat, for a dungeon run idle (S16).
describe('rowing (B17)', () => {
  const frames = activityFrames2('dungeon');
  const boat = activityProp2('dungeon')!;

  it('is a four-frame stroke with its own boat round the hero, inside the strip’s stage', () => {
    expect(frames).toBe(4);
    expect(activityHitFrame2('dungeon')).toBe(1);
    expect(activityFrameMs2('dungeon')).toBeGreaterThan(150);
    // The boat's top-left is the hero canvas's: it never reaches left of it or below the soles,
    // nor further right than the fishing prop, so the "now doing" stage keeps its size.
    expect(boat.front).toBe(false);
    expect(28 + boat.at.x - boat.foot.x).toBe(0);
    expect(70 + boat.at.y - boat.foot.y).toBe(0);
    const fish = activityProp2('fishing')!;
    expect(boat.picture.grid.w).toBeLessThanOrEqual(
      28 + fish.at.x - fish.foot.x + fish.picture.grid.w,
    );
    expect(boat.picture.grid.h).toBeLessThanOrEqual(71);
  });

  it('lays the near hull over him exactly as the boat has it, so the two meet without a seam', () => {
    for (const o of OUTFITS)
      for (let f = 0; f < frames; f++) {
        const g = characterActivityPicture2(o.look, o.worn, 'dungeon', f, o.extra).grid;
        const b = boat.picture.grid;
        let same = 0;
        let hull = 0;
        // Below the hull's top row, under the hero's canvas, the frame is the boat but for the oar.
        for (let y = 56; y < 63; y++)
          for (let x = 2; x < 20; x++) {
            hull++;
            if (g.d[y * g.w + x] === b.d[y * b.w + x]) same++;
          }
        expect(same / hull, `${f}`).toBeGreaterThan(0.85);
        // No boot or greave shows below the gunwale: the hero is seated in it.
        for (let y = 56; y < 70; y++)
          for (let x = 0; x < g.w; x++) {
            const c = g.d[y * g.w + x]!;
            if (c)
              expect(
                ['wood', 'sail', 'crimson', 'sea', 'willow'].some((m) => isMat(c, m as never)),
                `${f} ${x},${y}`,
              ).toBe(true);
          }
      }
  });

  it('dips the blade in the water through the stroke and carries it clear on the recovery', () => {
    const wet = (f: number) => {
      const g = characterActivityPicture2({}, [], 'dungeon', f).grid;
      return [...g.d].filter(
        (c, i) => c && isMat(c, 'sea') && Math.floor(i / g.w) >= 63 && stepOf(c) === 0,
      ).length;
    };
    // Foam where the blade bites on the catch and the drive; none on the recovery.
    expect(wet(1)).toBeGreaterThan(wet(3));
    expect(wet(0)).toBeGreaterThan(0);
    const oarRows = (f: number) => {
      const g = characterActivityPicture2({}, [], 'dungeon', f).grid;
      let low = 0;
      for (let i = 0; i < g.d.length; i++)
        if (g.d[i] && isMat(g.d[i]!, 'willow')) low = Math.max(low, Math.floor(i / g.w));
      return low;
    };
    expect(oarRows(3)).toBeLessThan(62);
  });
});
