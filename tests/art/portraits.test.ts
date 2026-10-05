import { describe, expect, it } from 'vitest';
import { FACES } from '../../src/art/faces';
import { get } from '../../src/art/grid';
import { DAY, DUSK, type Shade } from '../../src/art/palette';
import {
  PORTRAIT_IDS,
  PORTRAIT_SIZE,
  portrait,
  portraitPicture,
  portraitScales,
} from '../../src/art/portraits';

// The test's own copy of the monsters' ids (src/data/monsters.ts), so that art
// never imports the game and a missing face fails here by name.
const MONSTERS = [
  'dock_rat',
  'sand_crab',
  'thieving_gull',
  'bramble_boar',
  'footpad',
  'grey_wolf',
  'smuggler',
  'marsh_troll',
];

describe('portrait', () => {
  it('answers null, and never throws, for a face art has not drawn', () => {
    for (const id of ['no_such_creature', '', 'toString', '__proto__', 'constructor']) {
      expect(portrait(id), id).toBeNull();
      expect(portraitPicture(id), id).toBeNull();
    }
  });

  it('draws a face for every monster, the three townsfolk and the grotto’s cast', () => {
    const grotto = ['deckhand', 'powder_monkey', 'giant_crab', 'ships_parrot', 'brinebeard'];
    for (const id of [...MONSTERS, 'smith', 'trader', 'pirate', ...grotto]) {
      expect(PORTRAIT_IDS, id).toContain(id);
      expect(portrait(id), id).not.toBeNull();
    }
  });

  it('is 48 x 48, on a dark disc, the bust outlined in front', () => {
    for (const id of PORTRAIT_IDS) {
      const g = portraitPicture(id)!.grid;
      expect([g.w, g.h], id).toEqual([PORTRAIT_SIZE, PORTRAIT_SIZE]);
      // The corners are clear: a disc, not a square.
      for (const [x, y] of [
        [0, 0],
        [47, 0],
      ] as const)
        expect(get(g, x, y), `${id} ${x},${y}`).toBeNull();
      const disc = FACES[id]!.disc;
      expect(g.d, id).toContain(disc[0]);
      expect(g.d, id).toContain('ink1');
      // The bust fills much of the square.
      const bust = g.d.filter((c) => c && !disc.includes(c)).length;
      expect(bust, id).toBeGreaterThan(48 * 48 * 0.3);
    }
  });

  it('keeps the disc darker than the face drawn on it, by day', () => {
    const light = (s: Shade) => {
      const hex = DAY.colours[s];
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
        number,
        number,
        number,
      ];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const id of PORTRAIT_IDS) {
      const def = FACES[id]!;
      const steps = Object.values(def.legend).filter((s) => s !== 'ink1');
      const mean = steps.reduce((sum, s) => sum + light(s), 0) / steps.length;
      expect(light(def.disc[0]), id).toBeLessThan(mean);
    }
  });

  it('never uses a light that switches on at dusk', () => {
    const lights = new Set<Shade>(['glass1', 'glass2', 'lamp1']);
    for (const id of PORTRAIT_IDS) {
      for (const s of [...Object.values(FACES[id]!.legend), ...FACES[id]!.disc])
        expect(lights.has(s), `${id} ${s}`).toBe(false);
      expect(DUSK.colours[FACES[id]!.disc[0]]).toBeDefined();
    }
  });

  it('carries a 3x and a 2x canvas, a whole number of device pixels per art pixel', () => {
    expect(portraitScales(3)).toEqual({ large: 9, small: 6 });
    expect(portraitScales(2)).toEqual({ large: 6, small: 4 });
    expect(portraitScales(1)).toEqual({ large: 3, small: 2 });
    // Rounded down, so a face never outgrows its 144 or 96 pixel frame.
    expect(portraitScales(2.625)).toEqual({ large: 7, small: 5 });
    const el = portrait('dock_rat')!;
    expect(el.classList.contains('portrait-art')).toBe(true);
    const large = el.querySelector<HTMLCanvasElement>('canvas.portrait-large')!;
    const small = el.querySelector<HTMLCanvasElement>('canvas.portrait-small')!;
    // jsdom's devicePixelRatio is 1: 144 and 96 CSS pixels.
    expect([large.style.width, large.style.height]).toEqual(['144px', '144px']);
    expect([small.style.width, small.style.height]).toEqual(['96px', '96px']);
  });
});
