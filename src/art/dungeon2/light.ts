/**
 * How a cave is lit (B10a). A cave is dark, and is not drawn dark: its tiles
 * are drawn in their own steps, as the town's grounds are, and the light is
 * laid over them afterwards, so the same tiles serve a lit room and an unlit
 * one, and moving a lantern moves its light.
 *
 * Two things make a lantern's light, as at dusk in town:
 *
 * - **A pool, in steps.** Ground near a light is drawn one or two of its own
 *   steps lighter, ground out of every light's reach a step darker, the
 *   rings' edges broken into clumps (never a dither) and squashed to lie on
 *   the floor as it is seen, a little from above. This is the light a pixel
 *   artist would place: the floor's own colours, never a grey wash, and it
 *   reaches the wall's face behind the lantern too.
 * - **A glow**, the warm haze the town's lamps give (`Glow`, `addGlow`),
 *   which the scene adds where it draws, lighting walkers and props.
 *
 * A light's `drop` is how far below its flame the middle of its pool lies:
 * a lantern hangs about a metre and a half up, so its pool is on the floor
 * in front of the wall, not on the rock above it.
 */
import { darker, hash, isMat, type TGrid } from '../town2/cells';
import { noise } from '../town2/texture';
import type { Glow } from '../raster';

/** A light in a room: its glow (where the flame is) and the pool it lays on the floor below. */
export interface Light2 extends Glow {
  /** How far below the flame the pool's middle lies, in art pixels. */
  readonly drop: number;
  /** The pool's half-width, in art pixels: the ground inside it is lit by steps. */
  readonly pool: number;
  /** How much its strength wavers (0 for a steady light), for `flicker2`. */
  readonly flicker: number;
}

/** The scheme's numbers, in one place. */
export const DUNGEON2_LIGHT = {
  /**
   * Steps lighter in the pool's heart (inside `heart` of its half-width) and
   * its ring (inside 1). The tiles are drawn as lit ground, so the ring is
   * the ground as drawn and only the heart is lifted.
   */
  heartSteps: 1,
  ringSteps: 0,
  heart: 0.45,
  /** Steps darker beyond every pool: the cave's dark. Past `deep` of a pool's half-width, one more. */
  darkSteps: 1,
  deep: 2.2,
  /** How flat a pool lies: its height is this much of its width (the floor seen a little from above). */
  squash: 0.62,
  /** How ragged a ring's edge is, as a share of the half-width. */
  ragged: 0.16,
} as const;

/** A lantern's light, in its own picture's coordinates (the lantern prop carries this). */
export const LANTERN_LIGHT2 = {
  radius: 66,
  strength: 0.55,
  drop: 46,
  pool: 70,
  flicker: 0.12,
} as const;

/** A lit fuse: small, bright, wavering, and on the ground (or held), so no drop. */
export const FUSE_LIGHT2 = { radius: 14, strength: 0.75, drop: 0, pool: 18, flicker: 0.3 } as const;

/**
 * The ground lit: a copy of `ground` with every cell in a light's pool
 * stepped lighter and every cell beyond all of them stepped darker. Lights
 * are in the grid's own pixels. Line steps (6) are left alone, so an
 * outline never brightens into the colour it bounds. Pure; the same lights
 * always give the same picture.
 */
export function lightGround2(ground: TGrid, lights: readonly Light2[]): TGrid {
  const L = DUNGEON2_LIGHT;
  const out: TGrid = { w: ground.w, h: ground.h, d: ground.d.slice() };
  for (let y = 0; y < ground.h; y++)
    for (let x = 0; x < ground.w; x++) {
      const i = y * ground.w + x;
      const c = ground.d[i]!;
      if (!c || (c & 7) === 6) continue;
      // How far into the nearest pool, 0 at its middle and 1 at its edge.
      let t = Infinity;
      for (const l of lights) {
        const dx = (x + 0.5 - l.x) / l.pool;
        const dy = (y + 0.5 - (l.y + l.drop)) / (l.pool * L.squash);
        t = Math.min(t, Math.hypot(dx, dy));
      }
      const rag = (noise(x, y, 4, 211) - 0.5) * 2 * L.ragged + (hash(x, y, 7) - 0.5) * 0.04;
      const u = t + rag;
      let steps = 0;
      // Planks are not lifted at the heart (B11: their warm wood under the warm glow read orange).
      if (u < L.heart) steps = isMat(c, 'wood') ? 0 : -L.heartSteps;
      else if (u < 1) steps = -L.ringSteps;
      else if (u > L.deep) steps = L.darkSteps + 1;
      else steps = L.darkSteps;
      const s = c & 7;
      out.d[i] = steps < 0 ? (c & ~7) | Math.max(0, s + steps) : darker(c, steps);
    }
  return out;
}

/** A light's glow at a moment: its strength wavering by its `flicker`, smoothly, the same at the same time. */
export function flicker2(light: Light2, ms: number, k = 0): Glow {
  const w = noise(ms / 90, k * 13.7, 1, 917) * 0.65 + noise(ms / 37, k * 7.3, 1, 919) * 0.35;
  return {
    x: light.x,
    y: light.y,
    radius: light.radius,
    strength: light.strength * (1 - light.flicker * w),
  };
}

/** A light moved by (dx, dy): a prop's light placed in a room. */
export const lightAt = (light: Light2, dx: number, dy: number): Light2 => ({
  ...light,
  x: light.x + dx,
  y: light.y + dy,
});
