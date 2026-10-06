/**
 * Art study (not shipped): texture helpers shared by buildings, props and
 * ground. Everything is worked out from position, so a texture painted in
 * pieces lines up, and the same scene comes out the same every time.
 */
import { hash } from './engine';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** 0..1 ordered-dither threshold for a pixel. */
export const bayer = (x: number, y: number): number =>
  ((BAYER[(y & 3) * 4 + (x & 3)] as number) + 0.5) / 16;

/** Rounds a fractional step to a whole one, dithering the in-between. */
export const dither = (t: number, x: number, y: number): number =>
  Math.floor(t + bayer(x, y) - 0.5 + 0.5);

/** Rounds with a narrow dithered band only where the value sits near the half. */
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
  const sx = fx - x0;
  const sy = fy - y0;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = hash(x0, y0, k);
  const b = hash(x0 + 1, y0, k);
  const c = hash(x0, y0 + 1, k);
  const d = hash(x0 + 1, y0 + 1, k);
  const top = a + (b - a) * s(sx);
  const bot = c + (d - c) * s(sx);
  return top + (bot - top) * s(sy);
}

/** Two octaves of noise. */
export const fbm = (x: number, y: number, size: number, k = 0): number =>
  noise(x, y, size, k) * 0.65 + noise(x, y, size / 2.3, k + 7) * 0.35;
