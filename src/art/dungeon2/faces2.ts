/**
 * Portraits at the C scale: a 72 x 72 bust on a dark disc for every face the
 * game shows (the townsfolk, every monster the idle game fights, the grotto's
 * cast and its captain) and the hero's own, in the look and head gear worn.
 * Drawn at this size, each with one clear expression and the silhouette that
 * names it, recognisable from its figure: the people each by hand as their
 * own head (folkFaces.ts, B11), the hero by the look (heroFace.ts), the
 * creatures here.
 *
 * Everything that matters (face, hat, ears, horns) lies inside the safe box
 * (`PORTRAIT2_SAFE`), so a frame that must crop a portrait can crop to it.
 */
import { hash, put, stamp, tgrid, type Picture2, type TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Mat2 as Mat } from './cave';
import { outlineIn } from '../figure2/engine';
import { furTex, paint, poly, rod, seam, shaped, sprite } from './kit';
import { mass } from './beasts';
import { BUST, disc } from './bust';
import * as BEAST from './beastFaces';
import * as FOLK from './folkFaces';
import * as MARKS from './markFaces';
import { drawHero, type HeroBust } from './heroFace';

export type { HeroBust };

/** A portrait's size at the C scale, in art pixels. */
export const PORTRAIT2_SIZE = BUST;

type Painter = FOLK.Painter;
type FaceDef = FOLK.FaceDef;

/* ------------------------------------------------------------ the beasts */

const RAT: FaceDef = {
  disc: 'slate',
  draw(g) {
    // The body behind, hunched.
    shaped(
      g,
      poly([
        [2, 72],
        [6, 54],
        [20, 46],
        [50, 46],
        [66, 54],
        [70, 72],
      ]),
      'fur',
      {
        base: 2.8,
        contrast: 1.6,
        radius: 8,
        tex: furTex(41, -0.5, 0.22),
      },
    );
    // Round ears, pink inside.
    for (const [cx, cy, s] of [
      [17, 18, 2.2],
      [51, 16, 2.8],
    ] as const) {
      const ear = (x: number, y: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 10;
      shaped(g, ear, 'fur', { base: s, contrast: 1.6, radius: 3 });
      shaped(g, (x, y) => Math.hypot(x + 0.5 - cx - 1, y + 0.5 - cy - 1) < 6.5, 'shell', {
        base: 2.8,
        contrast: 1.4,
        radius: 3,
      });
    }
    // The head: wide at the cheeks, coming to a point at the nose.
    const head = poly([
      [14, 34],
      [20, 24],
      [30, 20],
      [42, 20],
      [52, 24],
      [58, 34],
      [54, 44],
      [44, 52],
      [38, 60],
      [34, 60],
      [28, 52],
      [18, 44],
    ]);
    shaped(g, head, 'fur', {
      base: 2.1,
      contrast: 1.9,
      radius: 9,
      tex: (x, y, t) => furTex(43, 0.3, 0.16)(x, y, t - (y > 46 ? 0.6 : 0)),
    });
    seam(g, head, 1);
    // Beady black eyes with a glint, close together, a sly look.
    for (const ex of [25, 41])
      sprite(g, ex, 31, ['.aaaa.', 'abccca', 'acccca', 'acccca', '.aaaa.'], {
        a: ['fur', 5],
        b: ['eye', 0],
        c: ['eye', 4],
      });
    // Brows slanting in over them, very sure of itself; one cocked higher.
    sprite(g, 22, 26, ['aa......', '.aaaa...', '...aaaa.'], { a: ['fur', 5] });
    sprite(g, 40, 25, ['.....aaa', '..aaaa..', 'aaa.....'], { a: ['fur', 5] });
    // A pink nose, whiskers out either side.
    sprite(g, 33, 55, ['.ab.', 'abbc', '.cc.'], {
      a: ['shell', 2],
      b: ['shell', 3],
      c: ['shell', 4],
    });
    for (const [x0, y0, dx, dy] of [
      [30, 55, -14, -3],
      [30, 57, -15, 1],
      [40, 55, 14, -3],
      [40, 57, 15, 1],
    ] as const)
      for (let i = 0; i <= 12; i++)
        put(
          g,
          x0 + Math.round((dx * i) / 12),
          y0 + Math.round((dy * i) / 12),
          cell('cream', i < 6 ? 1 : 2),
        );
    // A crooked grin up to one side, a buck tooth showing.
    sprite(g, 29, 58, ['a.........a', '.aaaaaaaaa.', '...bcbb....', '...bcb.....'], {
      a: ['fur', 5],
      b: ['cream', 2],
      c: ['cream', 0],
    });
  },
};

const GULL: FaceDef = {
  disc: 'sea',
  draw(g) {
    // Grey back and a white breast below the head.
    shaped(
      g,
      poly([
        [0, 72],
        [2, 58],
        [14, 50],
        [30, 48],
        [44, 54],
        [50, 72],
      ]),
      'smoke',
      {
        base: 1.8,
        contrast: 1.6,
        radius: 8,
      },
    );
    shaped(
      g,
      poly([
        [0, 60],
        [6, 52],
        [18, 50],
        [26, 56],
        [24, 72],
        [0, 72],
      ]),
      'stone',
      {
        base: 2.4,
        contrast: 1.6,
        radius: 5,
        tex: (x, y, t) => ((y + Math.floor(x / 4)) % 4 === 0 ? t + 1 : t),
      },
    );
    // The head, side on: a flat brow, a round white crown, a thick neck.
    const head = poly([
      [14, 28],
      [18, 18],
      [26, 12],
      [36, 11],
      [44, 15],
      [48, 22],
      [50, 30],
      [46, 42],
      [40, 52],
      [24, 54],
      [16, 44],
    ]);
    shaped(g, head, 'smoke', { base: 1.3, contrast: 1.8, radius: 9, lo: 0 });
    seam(g, head, 1);
    // The beak: long, yellow, hooked at the tip, a red spot, a stolen chip crosswise in it.
    const beak = poly([
      [45, 26],
      [64, 27],
      [69, 30],
      [67, 33],
      [62, 32],
      [46, 34],
    ]);
    shaped(g, beak, 'gold', { base: 1.6, contrast: 1.6, radius: 2 });
    for (let x = 47; x <= 64; x++) put(g, x, 31, cell('gold', 4));
    sprite(g, 60, 32, ['ab', 'bb'], { a: ['crimson', 1], b: ['crimson', 3] });
    // The chip.
    const chip = poly([
      [49, 20],
      [53, 19],
      [60, 40],
      [56, 41],
    ]);
    shaped(g, chip, 'cream', { base: 0.8, contrast: 1.4, radius: 1, lo: 0 });
    seam(g, chip, 2);
    // A fierce eye: a pale ring, a black pupil, a brow drawn down hard.
    sprite(
      g,
      31,
      17,
      ['aa......', '.aaaaa..', '...aaaaa', '..bbbbb.', '.bccddb.', '.bccddb.', '..bbbb..'],
      {
        a: ['stone', 5],
        b: ['crimson', 3],
        c: ['gold', 1],
        d: ['eye', 4],
      },
    );
  },
};

const BOAR: FaceDef = {
  disc: 'pine',
  draw(g) {
    // Shoulders, a heap of bristle.
    shaped(
      g,
      poly([
        [0, 72],
        [4, 54],
        [18, 48],
        [54, 48],
        [68, 54],
        [72, 72],
      ]),
      'umber',
      {
        base: 2.8,
        contrast: 1.6,
        radius: 8,
        tex: furTex(31, 0.6, 0.26),
      },
    );
    // Ears out to the sides, pointed, dark inside.
    const earL = poly([
      [4, 12],
      [21, 18],
      [14, 28],
    ]);
    const earR = poly([
      [51, 18],
      [68, 10],
      [59, 27],
    ]);
    shaped(g, earL, 'umber', { base: 2.2, contrast: 1.8, radius: 2 });
    shaped(g, earR, 'umber', { base: 2.8, contrast: 1.8, radius: 2 });
    shaped(
      g,
      poly([
        [8, 14],
        [18, 19],
        [14, 24],
      ]),
      'shell',
      { base: 4.5, contrast: 0.5, radius: 1 },
    );
    shaped(
      g,
      poly([
        [55, 19],
        [64, 13],
        [59, 23],
      ]),
      'shell',
      { base: 4.5, contrast: 0.5, radius: 1 },
    );
    // The head, a great wedge coming at you.
    const head = poly([
      [12, 30],
      [18, 18],
      [28, 12],
      [44, 12],
      [54, 18],
      [60, 30],
      [58, 42],
      [50, 52],
      [36, 58],
      [22, 52],
      [14, 42],
    ]);
    shaped(g, head, 'umber', {
      base: 2.2,
      contrast: 2,
      radius: 9,
      tex: (x, y, t) => {
        const jowl = (x < 22 || x > 48) && y > 34;
        return furTex(33, 0.25, 0.2)(x, y, t - (jowl ? 0.9 : 0));
      },
    });
    seam(g, head, 1);
    // A crest of black bristles over the crown, brambles caught in it.
    for (let x = 20; x <= 52; x++) {
      const top = 13 - Math.round(3 * Math.sin(((x - 20) / 32) * Math.PI));
      const tall = 2 + Math.round(hash(x, 1, 35) * 3) + (x % 3 === 0 ? 1 : 0);
      for (let j = 0; j < tall; j++)
        put(g, x, top - j, cell('tar', j === tall - 1 ? 4 : 2 + (j % 2)));
    }
    for (const [x, y] of [
      [22, 6],
      [35, 3],
      [47, 6],
    ] as const)
      sprite(g, x, y, ['.ab.c', 'aaba.', '.ad..', 'a....'], {
        a: ['leaf', 3],
        b: ['leaf', 5],
        c: ['crimson', 2],
        d: ['crimson', 4],
      });
    // Small mean eyes, red-rimmed, under brows slanting in.
    sprite(
      g,
      17,
      24,
      ['aaaa......', '.aaaaaa...', '...aaaaaa.', '..bbcdab..', '..bccdbb..', '...eeee...'],
      {
        a: ['tar', 4],
        b: ['crimson', 2],
        c: ['gold', 1],
        d: ['eye', 4],
        e: ['umber', 4],
      },
    );
    sprite(
      g,
      45,
      24,
      ['......aaaa', '...aaaaaa.', '.aaaaaa...', '..badcbb..', '..bbdccb..', '...eeee...'],
      {
        a: ['tar', 4],
        b: ['crimson', 2],
        c: ['gold', 1],
        d: ['eye', 4],
        e: ['umber', 4],
      },
    );
    // Tusks, curling up beside the snout.
    sprite(g, 17, 38, ['a....', 'ab...', 'ab...', '.ab..', '.abb.', '..bbc', '...cc'], {
      a: ['cream', 0],
      b: ['cream', 1],
      c: ['cream', 3],
    });
    sprite(g, 50, 38, ['....a', '...ba', '...ba', '..ba.', '.bba.', 'cbb..', 'cc...'], {
      a: ['cream', 0],
      b: ['cream', 2],
      c: ['cream', 3],
    });
    // The snout: a pink disc, wet, two nostrils, the mouth's line under it.
    const snout = (x: number, y: number) => Math.hypot((x + 0.5 - 36) / 11, (y + 0.5 - 45) / 8) < 1;
    shaped(g, snout, 'shell', { base: 2.8, contrast: 1.6, radius: 4 });
    seam(g, snout, 2);
    for (const nx of [30, 39])
      sprite(g, nx, 43, ['.aa.', 'abba', '.aa.'], { a: ['shade', 2], b: ['shade', 4] });
    for (let x = 27; x <= 45; x++) put(g, x, 55 + Math.round(Math.abs(x - 36) / 6), cell('tar', 4));
  },
};

const WOLF: FaceDef = {
  disc: 'midnight',
  draw(g) {
    // The ruff, thick, over the shoulders.
    shaped(
      g,
      poly([
        [2, 72],
        [6, 56],
        [16, 48],
        [36, 52],
        [58, 48],
        [68, 58],
        [72, 72],
      ]),
      'fur',
      {
        base: 2.4,
        contrast: 1.6,
        radius: 8,
        tex: furTex(21, -0.4, 0.22),
      },
    );
    // Ears, tall and pricked, dark inside.
    const earL = poly([
      [15, 26],
      [17, 4],
      [32, 18],
    ]);
    const earR = poly([
      [42, 17],
      [55, 3],
      [59, 26],
    ]);
    shaped(g, earL, 'fur', { base: 2.2, contrast: 1.8, radius: 2 });
    shaped(g, earR, 'fur', { base: 2.6, contrast: 1.8, radius: 2 });
    shaped(
      g,
      poly([
        [19, 22],
        [19, 10],
        [28, 19],
      ]),
      'shell',
      { base: 4, contrast: 0.6, radius: 1 },
    );
    shaped(
      g,
      poly([
        [46, 18],
        [54, 9],
        [55, 22],
      ]),
      'shell',
      { base: 4.5, contrast: 0.6, radius: 1 },
    );
    // The head: a broad skull narrowing to a long muzzle, the cheeks' ruff flaring out.
    const head = poly([
      [13, 34],
      [18, 22],
      [28, 15],
      [46, 15],
      [56, 22],
      [61, 34],
      [58, 42],
      [50, 46],
      [46, 56],
      [38, 62],
      [30, 56],
      [26, 46],
      [17, 42],
    ]);
    shaped(g, head, 'fur', {
      base: 2.0,
      contrast: 1.8,
      radius: 9,
      tex: (x, y, t) => {
        // The mask: the brow and between the eyes dark, the muzzle and cheeks pale.
        const muzzle = x > 28 && x < 46 && y > 38;
        const cheek = (x < 25 || x > 50) && y > 32;
        const mask = x > 33 && x < 41 && y > 18 && y < 34;
        return furTex(23, 0.2, 0.16)(x, y, t + (mask ? 1.4 : 0) - (muzzle || cheek ? 1.2 : 0));
      },
    });
    seam(g, head, 1);
    // Eyes, pale gold and slanted, under a lowered brow.
    sprite(g, 22, 29, ['aaaa....', '.abccd..', '..aeed..', '...aa...'], {
      a: ['fur', 5],
      b: ['gold', 0],
      c: ['gold', 1],
      d: ['eye', 4],
      e: ['gold', 2],
    });
    sprite(g, 43, 29, ['....aaaa', '..dccba.', '..deeba.', '...aa...'], {
      a: ['fur', 5],
      b: ['gold', 1],
      c: ['gold', 1],
      d: ['eye', 4],
      e: ['gold', 2],
    });
    // The nose, black and wet.
    sprite(g, 32, 46, ['.abbbbc.', 'abbddbbc', 'bbdbbdbc', '.cccccc.'], {
      a: ['tar', 1],
      b: ['tar', 3],
      c: ['tar', 5],
      d: ['tar', 6],
    });
    // The lip drawn back: long teeth, a dark gum.
    sprite(
      g,
      29,
      53,
      ['abbbbbbbbbbbbba', 'acdcdcccdcccdca', '.c.c.......c.c.', '..aaaaaaaaaaa..'],
      {
        a: ['shade', 3],
        b: ['crimson', 4],
        c: ['cream', 0],
        d: ['cream', 2],
      },
    );
  },
};

const WYRM: FaceDef = {
  disc: 'pine',
  draw(g) {
    mass(g, 24, 58, 18, 16, 'pine', { base: 3, tex: 'scale' });
    mass(g, 34, 34, 15, 12, 'pine', { base: 2.6, k: 2.4, tex: 'scale', k2: 2 });
    mass(g, 52, 40, 15, 8, 'pine', { base: 2.4, tex: 'scale', k2: 5 });
    // Horns swept back, thorns down the neck.
    rod(g, 30, 24, 14, 6, 4, 'bark', [1, 2, 4]);
    rod(g, 38, 23, 30, 4, 3, 'bark', [2, 3, 4]);
    for (let i = 0; i < 5; i++)
      sprite(g, 8 + i * 3, 46 + i * 4, ['.a', 'ab'], { a: ['bark', 2], b: ['bark', 4] });
    // A gold slit eye.
    paint(g, 37, 29, 6, 4, (x, y) =>
      Math.hypot(x - 40, y - 31) < 2.8 ? cell('gold', y < 31 ? 1 : 2) : 0,
    );
    paint(g, 40, 29, 1, 4, () => cell('eye', 4));
    rod(g, 35, 27, 44, 26, 2, 'pine', [5, 6]);
    // The jaw open, teeth, a forked tongue.
    paint(g, 44, 46, 24, 4, (_x, y) => cell(y === 46 ? 'crimson' : 'shade', y === 46 ? 4 : 3));
    sprite(g, 45, 44, ['a.a.a.a.a.a.', '............', '............', '.a.a.a.a.a..'], {
      a: ['cream', 0],
    });
    mass(g, 54, 54, 12, 4, 'pine', { base: 2.8, k: 2 });
    sprite(g, 62, 47, ['aa...', '..aaa', '..a..', '.a...'], { a: ['crimson', 2] });
  },
};

/** Every face, by the game's id. */
const FACES2: Readonly<Record<string, FaceDef>> = {
  smith: FOLK.SMITH,
  trader: FOLK.TRADER,
  pirate: FOLK.PIRATE,
  alewife: FOLK.ALEWIFE,
  market: FOLK.MARKET,
  docker: FOLK.DOCKER,
  elder: FOLK.ELDER,
  dock_rat: RAT,
  sand_crab: BEAST.SAND_CRAB,
  thieving_gull: GULL,
  bramble_boar: BOAR,
  footpad: FOLK.FOOTPAD,
  grey_wolf: WOLF,
  smuggler: FOLK.SMUGGLER,
  marsh_troll: BEAST.TROLL,
  goblin_poacher: FOLK.GOBLIN,
  bramble_wyrm: WYRM,
  deckhand: FOLK.DECKHAND,
  powder_monkey: FOLK.MONKEY,
  giant_crab: BEAST.GIANT_CRAB,
  ships_parrot: BEAST.PARROT,
  brinebeard: FOLK.BRINEBEARD,
  // The thieving marks (B12), by the game's action ids.
  steal_fisherman: MARKS.FISHERMAN,
  steal_fish_stall: MARKS.STALLHOLDER,
  steal_sailor: MARKS.SAILOR,
  steal_pedlar: MARKS.PEDLAR,
  steal_strongbox: MARKS.CLERK,
};

export const PORTRAIT2_IDS: readonly string[] = Object.keys(FACES2);

/** A bust on its disc: the bust outlined in its own darkest steps, cut by the frame's bottom. */
export function bustPicture(discMat: Mat, step: number, draw: Painter, withDisc = true): Picture2 {
  const g = tgrid(BUST, BUST);
  if (withDisc) disc(g, discMat, step);
  const b = tgrid(BUST, BUST);
  draw(b);
  stamp(g, outlineIn(b), 0, 0);
  return { grid: g, glows: [] };
}

/** A face's bust alone, outlined, without its disc (for checking it against the safe box). */
export function portraitBust2(id: string): TGrid | null {
  if (!Object.hasOwn(FACES2, id)) return null;
  const b = tgrid(BUST, BUST);
  FACES2[id]!.draw(b);
  return outlineIn(b);
}

const made = new Map<string, Picture2>();

/** A face as a picture, or null for an id with none; kept once drawn. */
export function portraitPicture2(id: string): Picture2 | null {
  if (!Object.hasOwn(FACES2, id)) return null;
  let pic = made.get(id);
  if (!pic) {
    const def = FACES2[id]!;
    pic = bustPicture(def.disc, def.discStep ?? 5, def.draw);
    made.set(id, pic);
  }
  return pic;
}

/* ------------------------------------------------------------- the hero */

/** The hero's bust: the look's skin and hair, the hairstyle under any head gear, the gear worn (heroFace.ts). */
export function heroBustPicture(o: HeroBust, withDisc = true): Picture2 {
  return bustPicture('teal', 6, (g) => drawHero(g, o), withDisc);
}
