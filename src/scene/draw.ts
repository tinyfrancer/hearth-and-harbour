/*
 * The part of the scene engine that touches a canvas. It is kept thin: where
 * things are, what the camera sees and how big a pixel is are all worked out
 * by pure functions elsewhere, and this only puts colour where they say.
 */
import { SCENE_COLOURS, type SceneColour } from './colours';
import { TILE, type Point, type TileMap } from './tileMap';

/** How a placeholder tile is filled: a base, a second colour for texture, and a darker lip at its foot. */
export interface TileLook {
  readonly base: SceneColour;
  readonly fleck: SceneColour;
  readonly lip?: SceneColour;
}

export type Looks<K extends string> = Readonly<Record<K, { readonly look: TileLook }>>;

/** A small fixed hash, so the ground's speckle is the same every time it is drawn. */
function speckle(col: number, row: number, i: number): number {
  let n = (col * 374761393 + row * 668265263 + i * 2147483647) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/**
 * Paints the whole map once, one canvas pixel per art pixel. Each frame then
 * copies the part in view, scaled by a whole number, rather than redrawing
 * every tile.
 */
export function paintGround<K extends string>(
  map: TileMap<K>,
  looks: Looks<K>,
  ground: HTMLCanvasElement,
): boolean {
  ground.width = map.cols * TILE;
  ground.height = map.rows * TILE;
  const ctx = ground.getContext('2d');
  if (!ctx) return false;
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const kind = map.tiles[row]![col]!;
      const { base, fleck, lip } = looks[kind].look;
      const x = col * TILE;
      const y = row * TILE;
      ctx.fillStyle = SCENE_COLOURS[base];
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = SCENE_COLOURS[fleck];
      for (let i = 0; i < 6; i++) {
        const fx = Math.floor(speckle(col, row, i) * (TILE - 1));
        const fy = Math.floor(speckle(col, row, i + 6) * (TILE - 1));
        ctx.fillRect(x + fx, y + fy, 2, 1);
      }
      // A solid tile with open ground below it shows a face, so walls read as standing up.
      const below = map.tiles[row + 1]?.[col];
      if (lip && below !== kind) {
        ctx.fillStyle = SCENE_COLOURS[lip];
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
      }
    }
  }
  return true;
}

export interface Frame {
  readonly ground: HTMLCanvasElement;
  readonly scale: number;
  readonly camera: Point;
  /** The walker's feet. */
  readonly walker: Point;
  /** Where the walker is heading, if anywhere. */
  readonly target: Point | null;
}

const colour = (ctx: CanvasRenderingContext2D, name: SceneColour): void => {
  ctx.fillStyle = SCENE_COLOURS[name];
};

/** Draws one frame. The camera and the walker are rounded to whole art pixels, so nothing shimmers. */
export function drawFrame(ctx: CanvasRenderingContext2D, frame: Frame): void {
  const { scale, camera } = frame;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  colour(ctx, 'navy1');
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale, 0, 0, scale, -camera.x * scale, -camera.y * scale);
  ctx.drawImage(frame.ground, 0, 0);
  if (frame.target) drawTarget(ctx, round(frame.target));
  drawWalker(ctx, round(frame.walker));
}

const round = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) });

/** A small gold cross where the walk ends. */
function drawTarget(ctx: CanvasRenderingContext2D, { x, y }: Point): void {
  colour(ctx, 'ink');
  ctx.fillRect(x - 3, y - 1, 7, 3);
  ctx.fillRect(x - 1, y - 3, 3, 7);
  colour(ctx, 'gold1');
  ctx.fillRect(x - 2, y, 5, 1);
  ctx.fillRect(x, y - 2, 1, 5);
}

/**
 * A placeholder figure standing with its feet at the point: just enough of a
 * person to see where they are and which way the camera goes. The real hero
 * comes from the art lane.
 */
function drawWalker(ctx: CanvasRenderingContext2D, { x, y }: Point): void {
  // Ground shadow.
  ctx.globalAlpha = 0.35;
  colour(ctx, 'ink');
  ctx.fillRect(x - 5, y - 1, 11, 2);
  ctx.fillRect(x - 4, y - 2, 9, 4);
  ctx.globalAlpha = 1;
  // Outline first, then the parts over it.
  colour(ctx, 'ink');
  ctx.fillRect(x - 4, y - 7, 9, 7); // legs
  ctx.fillRect(x - 6, y - 17, 13, 11); // body
  ctx.fillRect(x - 5, y - 26, 11, 10); // head
  colour(ctx, 'navy2');
  ctx.fillRect(x - 3, y - 6, 3, 5);
  ctx.fillRect(x + 1, y - 6, 3, 5);
  colour(ctx, 'red2');
  ctx.fillRect(x - 5, y - 16, 11, 9);
  colour(ctx, 'red1');
  ctx.fillRect(x - 5, y - 16, 3, 9);
  colour(ctx, 'skin1');
  ctx.fillRect(x - 4, y - 24, 9, 7);
  colour(ctx, 'wood4');
  ctx.fillRect(x - 4, y - 25, 9, 3);
  colour(ctx, 'ink');
  ctx.fillRect(x - 2, y - 21, 1, 2);
  ctx.fillRect(x + 2, y - 21, 1, 2);
}
