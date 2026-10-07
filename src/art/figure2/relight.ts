/**
 * Walking left, lit from the left (B11). The left walk is the right one
 * mirrored (with the arms' jobs swapped first for the hero), and a mirror
 * moves the light to the upper right: every limb, garment and face lit on the
 * side away from the town's sun. Here the mirrored frame is re-lit run by
 * run: along each row, every unbroken run of one material (a sleeve, a
 * trouser leg, a face, a lock of hair) has its steps put back in the order
 * they had before the mirror, so its lit edge is on the left again while its
 * shape stays mirrored. Outlines and eyes are left where they are.
 */
import { isMat, LINE, mirror, stepOf, type TGrid } from '../town2/cells';

/** A frame mirrored, then each run of a material re-lit from the left. */
export function mirrorLit(g: TGrid): TGrid {
  const m = mirror(g);
  const out = m.d.slice();
  for (let y = 0; y < m.h; y++) {
    let x = 0;
    while (x < m.w) {
      const c = m.d[y * m.w + x]!;
      if (!c || stepOf(c) === LINE || isMat(c, 'eye')) {
        x++;
        continue;
      }
      const mat = c >> 3;
      let end = x;
      while (end + 1 < m.w) {
        const n = m.d[y * m.w + end + 1]!;
        if (!n || n >> 3 !== mat || stepOf(n) === LINE) break;
        end++;
      }
      // Reverse the run's steps: what was its left end (lit) before the mirror is its left end again.
      for (let i = x; i <= end; i++) out[y * m.w + i] = m.d[y * m.w + (x + end - i)]!;
      x = end + 1;
    }
  }
  return { w: m.w, h: m.h, d: out };
}
