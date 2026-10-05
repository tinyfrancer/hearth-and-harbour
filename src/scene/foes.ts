/*
 * How each monster behaves in a dungeon, and what it looks like until the art
 * lane draws it. A monster's numbers (hit points, attack, defence, max hit,
 * speed, drops) are lane A's, in the content tables; this is only what a room
 * needs on top of them: how fast it walks, how far it sees, how close it must
 * be to strike, and its heavy attack if it has one. All of it is data, never
 * measured from a picture.
 */
import { ellipse, grid, line, outline, rect, type Grid } from '../art/grid';
import { picture, type Picture } from '../art/raster';
import type { Facing } from './play';
import type { Point } from './tileMap';
import { mirrored } from './townArt';

/**
 * A heavy attack: a patch of ground marked first, filling until it lands, and
 * landing hard on whoever is still in it. No dice: in it is hit, out of it is
 * not. Fair means there is always time to walk out from its middle.
 */
export interface Heavy {
  /** Round itself (a slam), or at where the hero stood when it began (thrown). */
  readonly aim: 'self' | 'thrown';
  /** The marked circle's radius in art pixels. A hero whose feet are nearer its middle than this is hit. */
  readonly radius: number;
  /** From the mark appearing to the blow landing. */
  readonly warnMs: number;
  /** From one landing to the next being allowed to start. */
  readonly everyMs: number;
  /** From first noticing the hero to the first being allowed. */
  readonly firstMs: number;
  /** It begins only with the hero this near, in art pixels. */
  readonly range: number;
  /** It does this many times the monster's max hit. */
  readonly times: number;
}

export type FoeLook = 'rat' | 'crab' | 'smuggler';

export interface FoeKind {
  readonly look: FoeLook;
  /** Walking speed, art pixels a second. The hero walks at 64. */
  readonly speed: number;
  /** How near the hero must come, in art pixels and in sight, to be noticed. */
  readonly notice: number;
  /** How near, feet to feet, it must be to strike an ordinary blow. */
  readonly reach: number;
  /** How near it comes before it stops: its reach, or further off for one that throws. */
  readonly keep: number;
  readonly heavy: Heavy | null;
  /** Where it can be tapped, from its feet: this wide, centred, and this tall above them. */
  readonly box: { readonly w: number; readonly h: number };
}

/**
 * The monsters a dungeon uses, by id. One not here still fights, as a rat
 * does: the tables can gain a monster before a room knows how it moves.
 */
export const FOE_KINDS: Readonly<Record<string, FoeKind>> = {
  dock_rat: {
    look: 'rat',
    speed: 52,
    notice: 72,
    reach: 16,
    keep: 14,
    heavy: null,
    box: { w: 22, h: 14 },
  },
  sand_crab: {
    look: 'crab',
    speed: 30,
    notice: 64,
    reach: 18,
    keep: 16,
    // A two-claw slam round itself: punishes standing beside it too long.
    heavy: {
      aim: 'self',
      radius: 30,
      warnMs: 1200,
      everyMs: 6000,
      firstMs: 2500,
      range: 26,
      times: 2,
    },
    box: { w: 26, h: 16 },
  },
  smuggler: {
    look: 'smuggler',
    speed: 40,
    notice: 120,
    reach: 18,
    keep: 72,
    // Something heavy and corked, lobbed at where the hero is standing.
    heavy: {
      aim: 'thrown',
      radius: 26,
      warnMs: 1300,
      everyMs: 4500,
      firstMs: 1200,
      range: 136,
      times: 2,
    },
    box: { w: 20, h: 36 },
  },
};

export function foeKind(monster: string): FoeKind {
  return FOE_KINDS[monster] ?? FOE_KINDS.dock_rat!;
}

/* ----- Placeholder figures: one silhouette and one colour ramp each ----- */

/** A figure and where its feet are in it, facing right. */
export interface FoeFigure {
  readonly picture: Picture;
  readonly feet: Point;
}

/** Low and long, grey, with a pink tail and nose. */
function rat(): Grid {
  const g = grid(20, 11);
  line(g, 4, 7, 0, 3, 'flush2');
  ellipse(g, 9, 6, 6, 3.5, 'stone2');
  ellipse(g, 8, 4.5, 4, 1.5, 'stone1');
  ellipse(g, 15, 5.5, 3, 2.5, 'stone2');
  rect(g, 13, 2, 2, 2, 'flush2');
  rect(g, 18, 6, 1, 1, 'flush1');
  rect(g, 16, 4, 1, 1, 'ink1');
  rect(g, 6, 9, 1, 2, 'stone3');
  rect(g, 12, 9, 1, 2, 'stone3');
  return g;
}

/** Wide and red, claws up, eyes on stalks. */
function crab(): Grid {
  const g = grid(26, 15);
  for (const x of [6, 9, 16, 19]) line(g, x, 9, x + (x < 13 ? -3 : 3), 14, 'red3');
  line(g, 7, 7, 3, 4, 'red2');
  line(g, 18, 7, 22, 4, 'red2');
  ellipse(g, 3, 3, 3, 2.5, 'red1');
  ellipse(g, 22, 3, 3, 2.5, 'red1');
  rect(g, 2, 0, 1, 2, 'red3');
  rect(g, 21, 0, 1, 2, 'red3');
  ellipse(g, 12.5, 9, 7.5, 4, 'red2');
  ellipse(g, 11, 7.5, 4.5, 1.6, 'red1');
  rect(g, 10, 3, 1, 3, 'red3');
  rect(g, 15, 3, 1, 3, 'red3');
  rect(g, 10, 2, 1, 1, 'ink1');
  rect(g, 15, 2, 1, 1, 'ink1');
  return g;
}

/** Tall, in a navy coat and a red headscarf, cutlass out. */
function smuggler(): Grid {
  const g = grid(20, 34);
  // Cutlass, held out in front.
  line(g, 14, 18, 18, 10, 'metal1');
  line(g, 15, 18, 19, 11, 'metal2');
  rect(g, 13, 18, 3, 2, 'gold2');
  // Legs and boots.
  rect(g, 6, 24, 3, 8, 'navy2');
  rect(g, 10, 24, 3, 8, 'navy2');
  rect(g, 5, 31, 4, 3, 'shade1');
  rect(g, 10, 31, 4, 3, 'shade1');
  // Coat, long, wider at the hem.
  rect(g, 4, 12, 10, 14, 'navy1');
  rect(g, 3, 20, 12, 6, 'navy1');
  rect(g, 4, 12, 3, 14, 'slate2');
  rect(g, 4, 18, 10, 2, 'red2');
  // Arm reaching to the cutlass.
  rect(g, 11, 14, 3, 5, 'navy1');
  rect(g, 13, 18, 2, 2, 'skin2');
  // Head, scarf, a scowl.
  ellipse(g, 9, 8, 3.5, 4, 'skin1');
  rect(g, 11, 7, 1, 1, 'ink1');
  rect(g, 9, 6, 3, 1, 'beard2');
  rect(g, 8, 10, 3, 1, 'beard1');
  ellipse(g, 9, 4.5, 4.5, 2.5, 'red2');
  rect(g, 3, 4, 2, 4, 'red3');
  return g;
}

const DRAWN: Readonly<Record<FoeLook, () => Grid>> = { rat, crab, smuggler };

const figures = new Map<string, FoeFigure>();

/** A monster's placeholder figure facing either way, outlined, with its feet. Made once. */
export function foeFigure(look: FoeLook, facing: Facing): FoeFigure {
  const key = `${look} ${facing}`;
  let made = figures.get(key);
  if (!made) {
    const g = outline(DRAWN[look]());
    const pic = facing === 'right' ? g : mirrored(g);
    const x = Math.floor(g.w / 2);
    made = { picture: picture(pic), feet: { x: facing === 'right' ? x : g.w - 1 - x, y: g.h - 1 } };
    figures.set(key, made);
  }
  return made;
}

/** A pile of loot on the floor: a sack with a glint of coin. */
export const LOOT_PILE: FoeFigure = (() => {
  const g = grid(9, 7);
  ellipse(g, 4, 4, 3.5, 2.5, 'apron1');
  ellipse(g, 3, 3.5, 1.5, 1, 'sand1');
  rect(g, 3, 0, 3, 2, 'apron2');
  rect(g, 6, 5, 2, 2, 'gold1');
  return { picture: picture(outline(g)), feet: { x: 5, y: 8 } };
})();
