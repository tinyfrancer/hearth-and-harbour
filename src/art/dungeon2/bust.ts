/**
 * The square every portrait at the C scale is drawn on, and the disc behind
 * it. (B10a built every person's head here from one shape; B11 drew each by
 * hand instead, in folkFaces.ts and heroFace.ts, because the shared head
 * read as a mannequin.)
 */
import type { TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Mat2 as Mat } from './cave';
import { paint } from './kit';

export const BUST = 72;

/** A disc behind a bust: a dark step of a ramp, its upper-left rim a step lighter. */
export function disc(g: TGrid, mat: Mat, step = 5): void {
  paint(g, 0, 0, BUST, BUST, (x, y) => {
    const d = Math.hypot(x + 0.5 - 36, y + 0.5 - 37);
    if (d > 34.5) return 0;
    const rim = d > 32.6 && x + y < 74;
    return cell(mat, rim ? step - 1 : step);
  });
}
