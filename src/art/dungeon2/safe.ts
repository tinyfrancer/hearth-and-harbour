/**
 * Each portrait's safe box, as data (B10a): the box, in art pixels from the
 * portrait's top-left, that holds everything naming the face (the head, its
 * hat, ears, horns, whiskers, the gesture beside it). Below `SHOULDERS` only
 * shoulders and the ends of beards are drawn, and the frame's bottom cuts
 * them. Written out from the drawings (`measureSafe2`) and held to them by
 * `tests/art/dungeonArt2.test.ts`.
 */
import { BUST } from './bust';
import { heroBustPicture, portraitBust2, type HeroBust } from './faces2';
import { outlineIn } from '../figure2/engine';
import type { TGrid } from '../town2/cells';

/** A box in art pixels. */
export interface Box2 {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** The row the shoulders begin on: everything that names a face is above it. */
export const SHOULDERS = 56;

/** The drawn pixels' box above the shoulders, outline included. */
export function faceBox(bust: TGrid): Box2 {
  let x0 = BUST;
  let y0 = BUST;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < SHOULDERS; y++)
    for (let x = 0; x < bust.w; x++)
      if (bust.d[y * bust.w + x]) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** A face's safe box worked out from its drawing; null for an id with none. */
export function measureSafe2(id: string): Box2 | null {
  const bust = portraitBust2(id);
  return bust && faceBox(bust);
}

/** The hero's bust alone (no disc), outlined, for measuring. */
export function heroBust2Grid(o: HeroBust): TGrid {
  return outlineIn(heroBustPicture(o, false).grid);
}

// Written out by `measureSafe2` (B11, from the redrawn faces, which fill the square as the
// first scale's did); keep in step with the drawings.
export const PORTRAIT2_SAFE: Readonly<Record<string, Box2>> = {
  smith: { x: 5, y: 4, w: 62, h: 52 },
  trader: { x: 5, y: 1, w: 57, h: 55 },
  pirate: { x: 0, y: 0, w: 72, h: 56 },
  alewife: { x: 7, y: 6, w: 56, h: 50 },
  market: { x: 6, y: 0, w: 62, h: 56 },
  docker: { x: 3, y: 5, w: 66, h: 51 },
  elder: { x: 11, y: 6, w: 50, h: 50 },
  dock_rat: { x: 5, y: 5, w: 62, h: 51 },
  sand_crab: { x: 3, y: 3, w: 68, h: 53 },
  thieving_gull: { x: 2, y: 10, w: 68, h: 46 },
  bramble_boar: { x: 3, y: 2, w: 66, h: 54 },
  footpad: { x: 6, y: 2, w: 64, h: 54 },
  grey_wolf: { x: 6, y: 3, w: 60, h: 53 },
  smuggler: { x: 5, y: 0, w: 62, h: 56 },
  marsh_troll: { x: 0, y: 3, w: 72, h: 53 },
  goblin_poacher: { x: 0, y: 3, w: 71, h: 53 },
  bramble_wyrm: { x: 5, y: 3, w: 64, h: 53 },
  deckhand: { x: 5, y: 2, w: 62, h: 54 },
  powder_monkey: { x: 6, y: 7, w: 65, h: 49 },
  giant_crab: { x: 0, y: 0, w: 72, h: 56 },
  ships_parrot: { x: 5, y: 8, w: 63, h: 48 },
  brinebeard: { x: 0, y: 0, w: 72, h: 56 },
};

/** The hero's safe box: the union over every hairstyle and head gear. */
export const HERO_PORTRAIT2_SAFE: Box2 = { x: 3, y: 0, w: 66, h: 56 };
