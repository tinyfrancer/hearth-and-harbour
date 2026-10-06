/*
 * The figures at the first scale (40 x 50, feet at the approved hero's), as
 * the dungeons still draw them: the hero lit by the lamps near him, mirrored
 * to face left, and the soft oval under his feet. Kept from the first town's
 * art (`townArt.ts`, retired with that town) because the grotto is drawn at
 * that scale until its own C-scale pass; it goes when the dungeons move.
 */
import { townPiece } from '../art/town';
import { ellipse, get, grid, set, type Grid } from '../art/grid';
import type { Shade } from '../art/palette';
import { picture, type Glow, type Picture } from '../art/raster';
import type { Facing } from './play';
import type { Box } from './things';
import type { Point } from './tileMap';

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
const LIGHT_STEP = 4;

/**
 * The walker as he stands at `feet`, facing either way, lit at dusk by
 * whichever lamps reach him. Each lit picture is made once for a place (to
 * the nearest `LIGHT_STEP`) and kept, so walking about at dusk paints a few
 * small pictures, never a frame.
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

/** The size of a walker's shadow picture, and where its middle is. */
const SHADOW_W = 23;
const SHADOW_H = 7;
export const SHADOW_MIDDLE: Point = { x: 11, y: 3 };

/** A walker's shadow in one step, the mock-up's size, to be laid under their feet. */
export function walkerShadow(shade: Shade): Picture {
  const g = grid(SHADOW_W, SHADOW_H);
  ellipse(g, SHADOW_MIDDLE.x, SHADOW_MIDDLE.y, 10, 2.6, shade);
  return picture(g);
}

/** Whether a glow's light reaches into a box. */
function reaches(glow: Glow, box: Box): boolean {
  const nx = Math.max(box.x, Math.min(glow.x, box.x + box.w));
  const ny = Math.max(box.y, Math.min(glow.y, box.y + box.h));
  return Math.hypot(glow.x - nx, glow.y - ny) < glow.radius;
}

/**
 * A picture standing at `at`, lit by every light in the scene that reaches
 * it (its own included), so a barrel beside a lantern catches its light.
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
