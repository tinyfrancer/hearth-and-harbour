/**
 * Light on the title: halos drawn as a pixel artist would, in a few flat
 * rings whose borders interlock in a one-pixel checker, never a soft
 * gradient. A halo adds warm light to whatever is under it.
 */

/** A halo: centre and radius in art pixels, strength the light added in its brightest ring. */
export interface Halo {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly strength: number;
  /** The light's colour; a lamp's warm amber when left out. */
  readonly rgb?: readonly [number, number, number];
  /** Squash vertically (a pool of light on water or ground). */
  readonly squash?: number;
  /** How many rings (3 when left out). */
  readonly bands?: number;
}

const WARM = [255, 158, 72] as const;

/**
 * Adds halos to packed pixels (`px`, `w` wide, holding rows `y0`.. of the
 * picture): each ring is flat; at a ring's edge alternate pixels belong to
 * the inner and the outer ring, a checker one pixel wide.
 */
export function addHalos(
  px: Uint32Array,
  w: number,
  rows: number,
  halos: readonly Halo[],
  y0 = 0,
): void {
  for (const h of halos) {
    const col = h.rgb ?? WARM;
    const bands = h.bands ?? 3;
    const ry = h.r * (h.squash ?? 1);
    const ya = Math.max(y0, Math.floor(h.y - ry));
    const yb = Math.min(y0 + rows - 1, Math.ceil(h.y + ry));
    const xa = Math.max(0, Math.floor(h.x - h.r));
    const xb = Math.min(w - 1, Math.ceil(h.x + h.r));
    for (let y = ya; y <= yb; y++)
      for (let x = xa; x <= xb; x++) {
        const d = Math.hypot((x + 0.5 - h.x) / h.r, (y + 0.5 - h.y) / ry);
        if (d >= 1) continue;
        const b = (1 - d) * bands;
        const fl = Math.floor(b);
        // Within a fifth of a ring's edge, the checker decides.
        const q =
          b - fl < 0.22 && ((x + y) & 1) === 1
            ? fl
            : b - fl > 0.78 && ((x + y) & 1) === 0
              ? fl + 1
              : fl;
        if (q <= 0) continue;
        const a = (h.strength * Math.min(bands, q)) / bands;
        const i = (y - y0) * w + x;
        const p = px[i] as number;
        if (!p) continue;
        const r = Math.min(255, (p & 255) + col[0] * a);
        const g = Math.min(255, ((p >>> 8) & 255) + col[1] * a);
        const bl = Math.min(255, ((p >>> 16) & 255) + col[2] * a);
        px[i] = ((255 << 24) | (Math.round(bl) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
      }
  }
}
