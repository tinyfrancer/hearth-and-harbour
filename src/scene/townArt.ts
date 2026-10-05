/*
 * The town's pictures, put together from the art lane's pieces the way its
 * townPicture() puts the approved mock-up together (src/art/town.ts): the
 * grounds painted in the same order with the same painters, the pieces from
 * its index, and a soft shadow on the ground under everything that stands.
 * Nothing here draws a building or a prop. Pure, so it can be tested without
 * a canvas.
 */
import { cobbledSquare, quayWall, QUAY_H, road, sea, wildflowers } from '../art/ground';
import { blit, ellipse, get, grid, groundShadow, set, type Grid } from '../art/grid';
import { net, pier, smoke } from '../art/harbour';
import type { Shade } from '../art/palette';
import { picture, type Glow, type Picture } from '../art/raster';
import { seeded } from '../art/rng';
import { grass } from '../art/scenery';
import { townPiece, type TownId } from '../art/town';
import { circling, cycling, risenPuffs, type Ambient, type Loop, type Puff } from './ambient';
import type { Facing } from './play';
import type { Box } from './things';
import type { Point } from './tileMap';

/** A piece as the town uses it: the art lane's picture, its base line, its shadow and its spots. */
export interface Piece {
  readonly picture: Picture;
  /** The row of the picture its feet or foundations stand on. */
  readonly base: number;
  /** Its ground shadow, from the picture's top-left. */
  readonly shadow?: {
    readonly x: number;
    readonly y: number;
    readonly rx: number;
    readonly ry: number;
  };
  /** Where a person stands to use it, from the picture's top-left. */
  readonly spots: Readonly<Record<string, Point>>;
}

export type PieceId = TownId;

/**
 * Shadows for pieces the mock-up drew without one (it painted the whole town
 * at once and could leave them out), sized to each piece's foot.
 */
const SMALL_SHADOWS: Partial<Record<PieceId, { rx: number; ry: number }>> = {
  lamp: { rx: 5, ry: 2.2 },
  barrel: { rx: 7, ry: 2.2 },
  crate: { rx: 8, ry: 2.4 },
  pine: { rx: 11, ry: 2.6 },
  pine_2: { rx: 11, ry: 2.6 },
  pine_3: { rx: 11, ry: 2.6 },
  notice_board: { rx: 11, ry: 2.6 },
  signpost: { rx: 6, ry: 2.2 },
  anvil: { rx: 9, ry: 2.4 },
  bucket: { rx: 6, ry: 2 },
  crab: { rx: 6, ry: 1.8 },
};

const pieces = new Map<PieceId, Piece>();

/** One of the art lane's pieces, with a shadow wherever it stands on ground. */
export function townPieceFor(id: PieceId): Piece {
  let piece = pieces.get(id);
  if (!piece) {
    const p = townPiece(id);
    const small = SMALL_SHADOWS[id];
    const shadow = p.shadow
      ? { x: p.shadow.cx, y: p.shadow.cy, rx: p.shadow.rx, ry: p.shadow.ry }
      : small && { x: p.w / 2, y: p.base, ...small };
    piece = { picture: p.picture, base: p.base, spots: p.spots, ...(shadow ? { shadow } : {}) };
    pieces.set(id, piece);
  }
  return piece;
}

/** The hero as approved: lane B's standard body in the hero's outfit, facing right. */
export function heroPicture(): Picture {
  return townPiece('hero').picture;
}

/** Where the hero's feet are in the hero's picture: the middle of the 40-wide canvas, its row of boots. */
export const HERO_FEET: Point = { x: 20, y: townPiece('hero').base };

/** A grid flipped left to right. */
export function mirrored(g: Grid): Grid {
  const out = grid(g.w, g.h);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) set(out, g.w - 1 - x, y, get(g, x, y));
  return out;
}

/** How finely the hero's light follows him, in art pixels: one lit picture per step of this. */
export const LIGHT_STEP = 4;

/**
 * The walker as he stands at `feet`, facing either way, lit at dusk by
 * whichever lamps and windows reach him, as everything else in the town is.
 * Each lit picture is made once for a place (to the nearest `LIGHT_STEP`) and
 * kept, so walking about at dusk paints a few small pictures, never a frame.
 */
export function litWalker(
  base: Picture,
  feetIn: Point,
  lights: readonly Glow[],
): (feet: Point, facing: Facing, lightsOn: boolean) => Picture {
  const plain: Record<Facing, Picture> = { right: base, left: picture(mirrored(base.grid)) };
  const lit = new Map<string, Picture>();
  return (feet, facing, lightsOn) => {
    if (!lightsOn) return plain[facing];
    const x = Math.round(feet.x / LIGHT_STEP) * LIGHT_STEP;
    const y = Math.round(feet.y / LIGHT_STEP) * LIGHT_STEP;
    const key = `${facing} ${x} ${y}`;
    let pic = lit.get(key);
    if (!pic) {
      const fx = facing === 'left' ? base.grid.w - 1 - feetIn.x : feetIn.x;
      pic = litBy(plain[facing], { x: x - fx, y: y - feetIn.y }, lights);
      if (pic.glows.length === 0) pic = plain[facing];
      lit.set(key, pic);
    }
    return pic;
  };
}

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
  /** How far down the forest along the top reaches. Its trees leave a gap for the road. */
  readonly forestDepth: number;
  /** The road north: its middle column, and the row it reaches down to (the square paints over its end). */
  readonly road: { readonly x: number; readonly until: number };
  /** Wild flowers in the grass: where, and how many. */
  readonly flowers: readonly { readonly box: Box; readonly n: number }[];
  /** The cobbled square. Its top edge is ragged where it meets the grass. */
  readonly square: Box;
  /** The quay wall's top row, and the columns of its mooring rings. */
  readonly quay: { readonly y: number; readonly rings: readonly number[] };
  /** The pier's top-left and its length; it lies on the ground over the quay and the water. */
  readonly pier: { readonly x: number; readonly y: number; readonly length: number };
  /** A net drying on the cobbles, by its top-left. */
  readonly net: Point;
}

/** Where the water starts: under the quay wall. */
export function seaTop(plan: GroundPlan): number {
  return plan.quay.y + QUAY_H;
}

/** A shadow to lay on the ground, in art pixels. */
export interface GroundShadow {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
}

/**
 * The town's ground, one grid the size of the map, painted in the mock-up's
 * order: grass, flowers, the road, the square, the forest along the top, the
 * quay wall, the sea, then what lies flat on it (the pier, the net), and last
 * the shadows of everything that stands, each in the dark step of whatever
 * ground is under it.
 */
export function paintGround(plan: GroundPlan, shadows: readonly GroundShadow[]): Grid {
  const rand = seeded(21);
  const g = grid(plan.width, plan.height);
  grass(g, rand, { x: 0, y: 0, w: plan.width, h: seaTop(plan) });
  for (const f of plan.flowers) wildflowers(g, rand, f.box, f.n);
  road(g, rand, plan.road.x, 0, plan.road.until);
  cobbledSquare(g, rand, plan.square);

  // The forest along the top, in four staggered rows, leaving a gap for the road.
  const pines = (['pine', 'pine_2', 'pine_3'] as const).map((id) => townPiece(id).picture.grid);
  const gap = (x: number, w: number) => Math.abs(x + w / 2 - plan.road.x) < 30;
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

  quayWall(g, rand, 0, plan.quay.y, plan.width, plan.quay.rings);
  sea(g, rand, { x: 0, y: seaTop(plan), w: plan.width, h: plan.height - seaTop(plan) });
  blit(g, pier(rand, plan.pier.length), plan.pier.x, plan.pier.y);
  blit(g, net(), plan.net.x, plan.net.y);

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

/* ----- A little life ----- */

/** The puffs the art lane's chimney smoke is drawn with (src/art/harbour.ts), and its size. */
export const CHIMNEY_SMOKE: Readonly<
  Record<'tavern_smoke' | 'smithy_smoke', { w: number; h: number; puffs: readonly Puff[] }>
> = {
  tavern_smoke: {
    w: 18,
    h: 18,
    puffs: [
      [5, 14, 4.5],
      [9, 8, 3.6],
      [14, 3, 3],
    ],
  },
  smithy_smoke: {
    w: 22,
    h: 24,
    puffs: [
      [5, 20, 4.5],
      [9, 13, 3.8],
      [14, 7, 3.2],
      [18, 2, 2.6],
    ],
  },
};

/** Room left round rising smoke for the top puff to thin away in. */
export const SMOKE_PAD = 6;
/** Frames in one rise of a plume, and how long each shows. */
export const SMOKE_FRAMES = 6;
export const SMOKE_FRAME_MS = 420;

/**
 * Chimney smoke rising: `SMOKE_FRAMES` pictures, each the art lane's puffs
 * risen a little further (`risenPuffs`), drawn `SMOKE_PAD` pixels in from the
 * top and right. The first is the art lane's own smoke, unmoved.
 */
export function smokeFrames(id: keyof typeof CHIMNEY_SMOKE): Picture[] {
  const { w, h, puffs } = CHIMNEY_SMOKE[id];
  return Array.from({ length: SMOKE_FRAMES }, (_, f) =>
    picture(
      smoke(
        w + SMOKE_PAD,
        h + SMOKE_PAD,
        risenPuffs(puffs, f / SMOKE_FRAMES).map(([x, y, r]) => [x, y + SMOKE_PAD, r] as Puff),
      ),
    ),
  );
}

/** Smoke from a chimney whose art-lane smoke would stand at `at`. */
export function chimneySmoke(id: keyof typeof CHIMNEY_SMOKE, at: Point, phaseMs: number): Ambient {
  return cycling(
    'above',
    smokeFrames(id),
    { x: at.x, y: at.y - SMOKE_PAD },
    SMOKE_FRAME_MS,
    phaseMs,
  );
}

/** Whether the foam is broken along the shore at column `x`, a little along at `shift`. */
export function foamAt(x: number, shift: number): boolean {
  const u = x + shift;
  return Math.sin(u * 0.6) + Math.sin(u * 0.21) > 0.2;
}

/** A small, fixed scatter for the second row of foam, so the strip is the same every time it is made. */
const speck = (x: number, shift: number): boolean => (x * 7 + shift * 13) % 10 < 4;

/** How far along the shore the foam moves between its two states. */
export const FOAM_SHIFT = 4;
export const FOAM_FRAME_MS = 1100;

/**
 * The shore foam moved along a little: the two rows of water under the quay
 * wall, copied from the painted ground with its foam washed off and laid
 * again `FOAM_SHIFT` pixels along. Empty over the pier, which lies on top.
 */
export function shiftedFoam(ground: Grid, plan: GroundPlan, lights: readonly Glow[]): Picture {
  const y0 = seaTop(plan);
  const g = grid(plan.width, 2);
  for (let x = 0; x < plan.width; x++) {
    if (x >= plan.pier.x && x < plan.pier.x + 44) continue;
    for (let row = 0; row < 2; row++) {
      const was = get(ground, x, y0 + row);
      set(g, x, row, was === 'foam1' ? 'sea2' : was);
    }
    if (foamAt(x, FOAM_SHIFT)) {
      set(g, x, 0, 'foam1');
      if (speck(x, FOAM_SHIFT)) set(g, x, 1, 'foam1');
    }
  }
  return litBy(picture(g), { x: 0, y: y0 }, lights);
}

/** The shore foam: as painted, then shifted along, then back. */
export function shoreFoam(ground: Grid, plan: GroundPlan, lights: readonly Glow[]): Ambient {
  const y0 = seaTop(plan);
  const asPainted = grid(plan.width, 2);
  for (let x = 0; x < plan.width; x++) {
    if (x >= plan.pier.x && x < plan.pier.x + 44) continue;
    for (let row = 0; row < 2; row++) set(asPainted, x, row, get(ground, x, y0 + row));
  }
  return cycling(
    'ground',
    [litBy(picture(asPainted), { x: 0, y: y0 }, lights), shiftedFoam(ground, plan, lights)],
    { x: 0, y: y0 },
    FOAM_FRAME_MS,
  );
}

/** Gulls over the harbour, each on a lazy loop. */
export function gulls(loops: readonly Loop[]): Ambient[] {
  const gull = townPiece('gull').picture;
  return loops.map((loop) => circling(gull, { x: 4, y: 2 }, loop));
}
