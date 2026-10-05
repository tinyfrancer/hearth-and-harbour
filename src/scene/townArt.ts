/*
 * The town's pictures, put together from the art lane's pieces the way
 * `src/art/plates.ts` puts its small scenes together: ground painted with
 * grass and cobbles, standing things on it with their shadows. Nothing here
 * draws a building or a prop; plots for pieces the art lane has not drawn yet
 * are a flat base-ramp colour. Pure, so it can be tested without a canvas.
 */
import { FIGURE_H, HERO_OUTFIT, figure } from '../art/figure';
import {
  blit,
  clear,
  ellipse,
  get,
  grid,
  groundShadow,
  outline,
  rect,
  type Grid,
} from '../art/grid';
import type { Shade } from '../art/palette';
import { picture, type Glow, type Picture } from '../art/raster';
import { seeded } from '../art/rng';
import {
  barrel,
  cobbles,
  crate,
  grass,
  lamp,
  noticeBoard,
  pine,
  tavern,
  well,
} from '../art/scenery';
import type { Box } from './things';
import type { Point } from './tileMap';

/** A picture and the soft shadow it casts, relative to its top-left (by default under its middle). */
export interface Piece {
  readonly picture: Picture;
  readonly shadow?: {
    readonly x?: number;
    readonly y?: number;
    readonly rx: number;
    readonly ry: number;
  };
}

export type PieceId =
  | 'tavern'
  | 'well'
  | 'board'
  | 'lamp'
  | 'barrel'
  | 'crate'
  | 'pine1'
  | 'pine2'
  | 'pine3'
  | 'smithyPlot'
  | 'stallPlot';

/** A plot for a piece still to come: a flat block of one base-ramp step, outlined like everything else. */
export function plot(w: number, h: number, shade: Shade): Picture {
  const g = grid(w - 2, h - 2);
  rect(g, 0, 0, w - 2, h - 2, shade);
  return picture(outline(g));
}

/** The pieces the town is built from. The seeds fix where the wear and flecks land. */
export function townPieces(): Record<PieceId, Piece> {
  const trees = seeded(33);
  return {
    // The mock-up's long shadow along the tavern's front.
    tavern: { picture: tavern(seeded(21)), shadow: { x: 66, y: 117, rx: 66, ry: 4 } },
    well: { picture: picture(well()), shadow: { rx: 14, ry: 3.5 } },
    board: { picture: picture(noticeBoard()), shadow: { rx: 11, ry: 2.6 } },
    lamp: { picture: lamp(), shadow: { rx: 5, ry: 2.2 } },
    barrel: { picture: picture(barrel()), shadow: { rx: 7, ry: 2.2 } },
    crate: { picture: picture(crate()), shadow: { rx: 8, ry: 2.4 } },
    pine1: { picture: picture(pine(trees)), shadow: { rx: 11, ry: 2.6 } },
    pine2: { picture: picture(pine(trees)), shadow: { rx: 11, ry: 2.6 } },
    pine3: { picture: picture(pine(trees)), shadow: { rx: 11, ry: 2.6 } },
    // Roughly the mock-up's smithy (96 x 88) and stall (60 x 42), outlined.
    smithyPlot: { picture: plot(98, 90, 'slate2') },
    stallPlot: { picture: plot(62, 44, 'wood2') },
  };
}

/** The hero as approved: lane B's standard body in the hero's outfit, facing right. */
export function heroPicture(): Picture {
  return picture(figure('standard', HERO_OUTFIT));
}

/** Where the hero's feet are in the hero's picture: the middle of the 40-wide canvas, its bottom row of boots. */
export const HERO_FEET: Point = { x: 20, y: FIGURE_H - 1 };

/** Ground steps a shadow can fall on, and the dark step of each it is drawn in. */
const SHADOW_OF: Readonly<Record<string, Shade>> = {
  grass: 'grass3',
  cobble: 'cobble3',
  sand: 'sand3',
  wood: 'wood3',
  stone: 'stone3',
};

/** The step a shadow on the ground at `point` is drawn in, or null where nothing casts one (water). */
export function shadowShadeAt(ground: Grid, point: Point): Shade | null {
  const shade = get(ground, Math.round(point.x), Math.round(point.y));
  if (!shade) return null;
  return SHADOW_OF[shade.replace(/\d$/, '')] ?? null;
}

/** The size of a walker's shadow picture, and where its middle is. */
export const SHADOW_W = 23;
export const SHADOW_H = 7;
export const SHADOW_MIDDLE: Point = { x: 11, y: 3 };

/** A walker's shadow in one step, the mock-up's size, to be laid under their feet. */
export function walkerShadow(shade: Shade): Picture {
  const g = grid(SHADOW_W, SHADOW_H);
  ellipse(g, SHADOW_MIDDLE.x, SHADOW_MIDDLE.y, 10, 2.6, shade);
  return picture(g);
}

/** Where the grounds of the town lie, in art pixels. */
export interface GroundPlan {
  readonly width: number;
  readonly height: number;
  /** How far down the forest along the top reaches. Its trees skip the road. */
  readonly forestDepth: number;
  /** The road north: its middle, half its width, and where it stops. */
  readonly road: { readonly centre: number; readonly half: number; readonly until: number };
  /** The cobbled square. Its top edge is ragged where it meets the grass. */
  readonly square: Box;
  /** Plots painted flat until lane B's pieces arrive. */
  readonly quay: Box;
  readonly sea: Box;
  readonly pier: Box;
}

/** A shadow to lay on the ground, in art pixels. */
export interface GroundShadow {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
}

/**
 * The town's ground, one grid the size of the map: grass, the forest along
 * the top, the road, the square, the flat plots, and the shadows of
 * everything that stands, cast on whatever ground is under each.
 */
export function paintGround(
  plan: GroundPlan,
  pines: readonly Grid[],
  shadows: readonly GroundShadow[],
): Grid {
  const rand = seeded(21);
  const g = grid(plan.width, plan.height);
  grass(g, rand, { x: 0, y: 0, w: plan.width, h: plan.sea.y });

  // The road, flat sand until lane B's road with its ruts arrives; it wanders a little as in the mock-up.
  const { centre, half, until } = plan.road;
  for (let y = 0; y < until; y++) {
    const cx = centre + Math.round(5 * Math.sin(y / 20));
    rect(g, cx - half, y, half * 2, 1, 'sand2');
  }

  // The square: cobbles, worn back to grass along the top in the mock-up's ragged steps.
  const sq = plan.square;
  const stones = grid(plan.width, plan.height);
  cobbles(stones, rand, sq);
  for (let y = sq.y; y < sq.y + sq.h; y++) {
    const rag = Math.max(0, (sq.y + 6 - y) * 4);
    const left = sq.x + rag + ((rand() * 2) | 0);
    const right = sq.x + sq.w - rag - ((rand() * 2) | 0);
    for (let x = sq.x; x < sq.x + sq.w; x++) if (x < left || x >= right) clear(stones, x, y);
  }
  blit(g, stones, 0, 0);

  // The forest along the top, in four staggered rows, leaving a gap for the road.
  const gap = (x: number, w: number) => Math.abs(x + w / 2 - centre) < half + 14;
  const rows: [start: number, top: number, spread: number][] = [
    [-2, -26, 8],
    [-10, -12, 10],
    [-2, 2, 8],
    [-10, plan.forestDepth - 52, 6],
  ];
  rows.forEach(([start, top, spread], r) => {
    for (let x = start, i = r; x < plan.width; x += 15, i++) {
      const tree = pines[i % pines.length]!;
      if (gap(x, tree.w)) continue;
      blit(g, tree, x, top + ((rand() * spread) | 0));
    }
  });

  rect(g, plan.quay.x, plan.quay.y, plan.quay.w, plan.quay.h, 'stone2');
  rect(g, plan.sea.x, plan.sea.y, plan.sea.w, plan.sea.h, 'sea2');
  rect(g, plan.pier.x, plan.pier.y, plan.pier.w, plan.pier.h, 'wood2');

  for (const s of shadows) {
    const shade = shadowShadeAt(g, s);
    if (shade) groundShadow(g, s.x, s.y, shade, s.rx, s.ry);
  }
  return g;
}

/** Whether a glow's light reaches into a box. */
function reaches(glow: Glow, box: Box): boolean {
  const nx = Math.max(box.x, Math.min(glow.x, box.x + box.w));
  const ny = Math.max(box.y, Math.min(glow.y, box.y + box.h));
  return Math.hypot(glow.x - nx, glow.y - ny) < glow.radius;
}

/**
 * A picture standing at `at`, lit by every light in the scene that reaches
 * it (its own included), so a barrel beside a lamp catches the lamp's light
 * as it did in the mock-up, where the whole town was one drawing.
 */
export function litBy(pic: Picture, at: Point, lights: readonly Glow[]): Picture {
  const box = { x: at.x, y: at.y, w: pic.grid.w, h: pic.grid.h };
  return picture(
    pic.grid,
    lights
      .filter((glow) => reaches(glow, box))
      .map((glow) => ({ ...glow, x: glow.x - at.x, y: glow.y - at.y })),
  );
}
