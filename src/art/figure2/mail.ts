/**
 * Salt-iron mail (B19), shared by the knight's aventail and the skirt under
 * his plate, front, profile and back: rings over row spans, a step darker
 * than his plate so the plate reads as lying over it.
 */
import { DEPTH } from '../depth';
import type { Part2 } from './engine';

/**
 * Mail laid by hand over a set of row spans (B19): rings in offset rows, lit
 * on the left of the span and shaded to the right, the lowest row a dark
 * scalloped edge. Rows are given as [y, x0, x1, ...more spans] in canvas
 * columns; the part is placed at (`left`, the first row's y).
 */
export function mailSpans(
  left: number,
  spans: readonly (readonly number[])[],
  depth: number = DEPTH.HELMET - 0.5,
  edge = true,
): Part2 {
  const y0 = spans[0]![0]!;
  const last = spans[spans.length - 1]![0]!;
  const rows = spans.map((s) => {
    const y = s[0]!;
    const cells: string[] = [];
    for (let i = 1; i + 1 < s.length; i += 2) {
      const a = s[i]!;
      const b = s[i + 1]!;
      for (let x = a; x <= b; x++) {
        while (cells.length < x - left) cells.push('.');
        const t = b === a ? 0 : (x - a) / (b - a);
        const side = x === a ? 0 : x >= b - 1 ? 2 : t >= 0.62 ? 1 : 0;
        // Rings in offset rows, as the guard's mail (armour.ts): a ring's lit
        // top, its shadowed underside, the next row's ring between; now and
        // then one sits crooked a step darker.
        const ring = (x + (Math.floor(y / 2) % 2)) % 2 === 0;
        const top = y % 2 === 0;
        const weave = (ring ? (top ? 0 : 1) : top ? 1 : 0) + (y % 4 === 3 ? 1 : 0);
        const crooked = (x * 7 + y * 13) % 17 === 0 ? 1 : 0;
        let step = Math.min(4, 2 + side + weave + crooked);
        if (edge && y === last) step = ring ? 4 : 5;
        cells[x - left] = String(step);
      }
    }
    return cells.join('');
  });
  return { at: [left, y0], depth, mat: 'saltiron', rows };
}
