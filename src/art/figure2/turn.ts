/**
 * The standing figure turned toward its facing (B17; the three-quarter turn
 * had been one column since B9). Not a second drawing: the front figure,
 * before its outline, has each row's pixels moved about the body's middle,
 * the near side (the viewer's left) widened and the far side drawn in, the
 * head turned furthest (its face and features carried over toward the far
 * cheek, the far eye narrowed to two columns, the far ear gone), the chest
 * less and the legs least; then the outline is drawn round the result. So it
 * holds for every look and every wearable at once, a shield turned with the
 * arm it is on and a hat with the head, and there is never a turned head on
 * a square body.
 *
 * Rows are only moved sideways and resampled to the nearest pixel, so lit
 * edges stay unbroken; the near side gains a repeated column here and there
 * and the far side loses some (mail rings, a far pauldron's lames drawn in).
 */
import { tgrid, type TGrid } from '../town2/cells';

/** The column the turn is made about: the body's middle. */
const AXIS = 28.5;

/** How each band of rows turns: [near widened by, far drawn in to, columns moved toward the facing]. */
const HEAD: readonly [number, number, number] = [1.2, 0.58, 3];
const CHEST: readonly [number, number, number] = [1.1, 0.74, 1];
const LEGS: readonly [number, number, number] = [1.06, 0.82, 1];
/** Where each band's turn holds whole, blending between: the head to the jaw, the chest from the shoulders to the belt, the legs from the hips. */
const JAW = 17;
const SHOULDERS = 24;
const BELT = 42;
const HIPS = 48;

const mix = (a: readonly number[], b: readonly number[], t: number): [number, number, number] =>
  [0, 1, 2].map((i) => a[i]! + (b[i]! - a[i]!) * t) as [number, number, number];

/** The turn for a row: whole in each band, eased through the neck and the hips. */
function turnAt(y: number): readonly [number, number, number] {
  if (y <= JAW) return HEAD;
  if (y < SHOULDERS) return mix(HEAD, CHEST, (y - JAW) / (SHOULDERS - JAW));
  if (y <= BELT) return CHEST;
  if (y < HIPS) return mix(CHEST, LEGS, (y - BELT) / (HIPS - BELT));
  return LEGS;
}

/** The front figure (before its outline) turned toward the right. */
export function turnFigure(g: TGrid): TGrid {
  const out = tgrid(g.w, g.h);
  for (let y = 0; y < g.h; y++) {
    const [near, far, shift] = turnAt(y);
    for (let x = 0; x < g.w; x++) {
      const t = x - shift;
      const from = t < AXIS ? AXIS - (AXIS - t) / near : AXIS + (t - AXIS) / far;
      const sx = Math.round(from - 0.25);
      if (sx < 0 || sx >= g.w) continue;
      out.d[y * g.w + x] = g.d[y * g.w + sx]!;
    }
  }
  return out;
}
