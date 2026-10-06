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

// Written out by `measureSafe2` (B10a); keep in step with the drawings.
export const PORTRAIT2_SAFE: Readonly<Record<string, Box2>> = {
  smith: { x: 16, y: 9, w: 37, h: 47 },
  trader: { x: 12, y: 6, w: 42, h: 50 },
  pirate: { x: 10, y: 3, w: 52, h: 53 },
  alewife: { x: 8, y: 8, w: 45, h: 48 },
  market: { x: 16, y: 2, w: 37, h: 54 },
  docker: { x: 15, y: 6, w: 46, h: 50 },
  elder: { x: 16, y: 9, w: 37, h: 47 },
  dock_rat: { x: 5, y: 5, w: 62, h: 51 },
  sand_crab: { x: 1, y: 7, w: 66, h: 49 },
  thieving_gull: { x: 2, y: 10, w: 68, h: 46 },
  bramble_boar: { x: 3, y: 2, w: 66, h: 54 },
  footpad: { x: 11, y: 5, w: 56, h: 51 },
  grey_wolf: { x: 6, y: 3, w: 60, h: 53 },
  smuggler: { x: 16, y: 5, w: 38, h: 51 },
  marsh_troll: { x: 0, y: 4, w: 72, h: 52 },
  goblin_poacher: { x: 5, y: 7, w: 63, h: 49 },
  bramble_wyrm: { x: 5, y: 3, w: 64, h: 53 },
  deckhand: { x: 11, y: 7, w: 42, h: 49 },
  powder_monkey: { x: 15, y: 9, w: 57, h: 47 },
  giant_crab: { x: 2, y: 9, w: 68, h: 47 },
  ships_parrot: { x: 6, y: 8, w: 61, h: 48 },
  brinebeard: { x: 2, y: 0, w: 65, h: 56 },
};

/** The hero's safe box: the union over every hairstyle and head gear. */
export const HERO_PORTRAIT2_SAFE: Box2 = { x: 8, y: 0, w: 56, h: 56 };
