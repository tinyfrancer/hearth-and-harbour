/**
 * Texture helpers shared by the C-scale town's buildings, props and grounds.
 * Taken from the approved scale study (study/scale-detail/texture.ts and the
 * cylinder light in props.ts), trimmed to what is used. Everything is worked
 * out from position, so a texture painted in pieces lines up and the same
 * town comes out the same every time.
 */
import { hash } from './cells';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** 0..1 ordered-dither threshold for a pixel. */
export const bayer = (x: number, y: number): number =>
  ((BAYER[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16;

/** Rounds with a narrow checked band only where the value sits near the half. */
export function softRound(t: number, x: number, y: number, band = 0.18): number {
  const f = t - Math.floor(t);
  if (Math.abs(f - 0.5) > band) return Math.round(t);
  return ((x + y) & 1) === 0 ? Math.floor(t) : Math.ceil(t);
}

/** Smooth value noise, 0..1, with features about `size` pixels across. */
export function noise(x: number, y: number, size: number, k = 0): number {
  const fx = x / size;
  const fy = y / size;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const s = (t: number) => t * t * (3 - 2 * t);
  const sx = s(fx - x0);
  const sy = s(fy - y0);
  const a = hash(x0, y0, k);
  const b = hash(x0 + 1, y0, k);
  const c = hash(x0, y0 + 1, k);
  const d = hash(x0 + 1, y0 + 1, k);
  const top = a + (b - a) * sx;
  return top + (c + (d - c) * sx - top) * sy;
}

/** Two octaves of noise. */
export const fbm = (x: number, y: number, size: number, k = 0): number =>
  noise(x, y, size, k) * 0.65 + noise(x, y, size / 2.3, k + 7) * 0.35;

const LX = -0.55;
const LZ = 0.78;

/**
 * The step for a cylinder's surface across its width, from -1 (left edge) to
 * 1 (right edge), lit from the left: `base` where it faces the viewer, `k`
 * steps of contrast. Barrels, posts, rods, trunks and masts.
 */
export function cyl(nx: number, base: number, k: number): number {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
  const lam = (nx * LX + nz * LZ) / Math.hypot(LX, LZ);
  return base + (k * (0.82 - lam)) / 0.5;
}

/** A whole number between `lo` and `hi`, both included. */
export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, Math.round(v)));
