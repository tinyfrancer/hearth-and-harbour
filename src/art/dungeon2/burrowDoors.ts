/**
 * Thistlewood Burrow's doors (B20), on the grotto's footprints (doors.ts) so
 * a room is laid out the same in every theme, drawn as a warren's:
 *
 * - **In a side wall** the way is a tunnel dug through the forest floor, its
 *   mouth framed by two old root-stumps at the room's edge and lined with the
 *   roots it was dug through. Open, the far end glows with the next room's
 *   lantern light (warm), and a lantern hangs from a root on the upper stump;
 *   barred, a woven hurdle of hazel stakes and withies, brambles wound
 *   through it, stands across it, the lantern dark, and beyond is black.
 * - **In the wall you face** it is a round badger-door, a ring of bent
 *   timbers set in the earth with a stone sill: open, the tunnel recedes to a
 *   round lit doorway; barred, a round door of planks, iron-studded, its ring
 *   hanging, a bar across it.
 *
 * Lit or shut, never ambiguous, as every door is.
 */
import { darker, tgrid, type Cell, type TGrid } from '../town2/cells';
import { cell } from './cave';
import { TILE2 as P } from './tiles';
import { burrowEarthAt, burrowFaceAt, burrowFaceHighAt, burrowTopAt } from './burrow';
import { cheeks, type DoorPiece2 } from './doors';

const flip = (g: TGrid): TGrid => {
  const out = tgrid(g.w, g.h);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) out.d[y * g.w + x] = g.d[y * g.w + g.w - 1 - x]!;
  return out;
};

const set = (g: TGrid, x: number, y: number, c: Cell) => {
  if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c;
};

/** A small lantern hung from a root: its panes lit where the way is open, dark where it is shut. */
function lantern(g: TGrid, x: number, y: number, lit: boolean): void {
  const rows = ['..r..', '..r..', '.iii.', 'iLLMi', 'iLMMi', '.iii.', '..i..'];
  const pin: Record<string, Cell> = {
    r: cell('root', 3),
    i: cell('iron', 4),
    L: lit ? cell('lamp', 0) : cell('glass', 4),
    M: lit ? cell('lamp', 1) : cell('glass', 5),
  };
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (r[i] !== '.') set(g, x + i, y + j, pin[r[i]!]!);
  });
}

/** An old root-stump seen from above: a gnarled disc of bark, its cut top ringed, lit on its upper left. */
function stump(g: TGrid, cx: number, cy: number, r: number): void {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
      const rr = r + Math.sin(a * 5 + cx) * 0.7;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > rr) continue;
      const lit = x + 0.5 - cx + (y + 0.5 - cy) < -r * 0.3;
      let c: Cell;
      if (d > rr - 1.2) c = cell('bark', lit ? 2 : 5);
      else if (Math.abs(d - rr * 0.55) < 0.5 || Math.abs(d - rr * 0.25) < 0.45) c = cell('root', 3);
      else c = cell('root', lit ? 1 : 2);
      set(g, x, y, c);
    }
}

/**
 * A door in a side wall, 48 x 72, the room to the east (`roomWest` turns
 * it): a tunnel through the forest floor, open to the warm light of the next
 * room or shut with a hurdle.
 */
export function burrowSideDoorPiece(
  barred: boolean,
  x0: number,
  y0: number,
  roomWest: boolean,
): DoorPiece2 {
  const W = P * 2;
  const H = P * 3;
  const g = tgrid(W, H);
  const O0 = 14;
  const O1 = 57;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const X = x0 + (roomWest ? W - 1 - x : x);
      const Y = y0 + y;
      const pinch = x < 24 ? Math.round((24 - x) / 8) : 0;
      const top = O0 + pinch;
      const bottom = O1 - pinch;
      let c: Cell;
      if (y < top - 3 || y > bottom + 3) c = burrowTopAt(X, Y);
      else if (y < top) {
        // The roots lining the tunnel's upper edge, its dark lip.
        c =
          y === top - 1 ? cell('soil', 6) : cell('root', (x + y * 2) % 5 === 0 ? 4 : y % 2 ? 3 : 2);
      } else if (y > bottom) {
        // Its lower edge toward the light: roots lit along the lip.
        c = y === bottom + 1 ? cell('root', 1) : cell('root', (x * 3 + y) % 7 === 0 ? 3 : 2);
      } else if (barred) {
        c =
          x < 30
            ? cell('shade', y < top + 4 ? 4 : 3)
            : darker(burrowEarthAt(X, Y), x < 37 ? 2 : x < 42 ? 1 : 0);
      } else {
        // The next room's lantern light down the tunnel, the trodden floor warming toward it.
        const edge = y < top + 2 || y > bottom - 2;
        if (x < 20) c = cell('lamp', edge ? 2 : 1);
        else if (x < 26) c = cell('lamp', edge ? 2 : x < 23 ? 0 : 1);
        else if (x < 30) c = cell('litter', edge ? 2 : 1);
        else if (x < 35) c = darker(cell('soil', 1), 1);
        else c = burrowEarthAt(X, Y);
        if (y === top) c = darker(c, 1);
      }
      g.d[y * W + x] = c;
    }
  // The root-stumps at each end of the opening, at the room's edge.
  stump(g, 41.5, O0 - 6, 5);
  stump(g, 41.5, O1 + 7, 5);
  if (barred) {
    // A woven hurdle: hazel stakes upright, withies over and under them, brambles through it.
    for (let y = O0 - 1; y <= O1 + 1; y++) {
      for (const sx of [30, 33, 36]) {
        set(g, sx, y, cell('bark', 2));
        set(g, sx + 1, y, cell('bark', 4));
      }
      const row = y - O0;
      const weave = Math.floor(row / 3) % 2;
      if (row % 3 !== 2)
        for (let x = 29; x <= 37; x++) {
          const over = (Math.floor((x - 29) / 3) + weave) % 2 === 0;
          if (over) set(g, x, y, cell('root', row % 3 === 0 ? 2 : 3));
        }
      set(g, 38, y, darker(g.d[y * W + 38]!, 1));
    }
    // Brambles wound through it, thorns pale.
    for (let y = O0 + 3; y < O1; y += 11)
      for (let i = 0; i < 10; i++) {
        const bx = 28 + i;
        const by = y + Math.round(Math.sin(i * 0.9) * 2);
        set(g, bx, by, cell('briar', i % 2 ? 3 : 2));
        if (i % 3 === 1) set(g, bx, by - 1, cell('cream', 1));
      }
  }
  lantern(g, 38, O0 - 19, !barred);
  if (!barred) {
    const shut = burrowSideDoorPiece(true, x0, y0, roomWest).grid;
    cheeks(
      g,
      roomWest ? flip(shut) : shut,
      O0,
      O1,
      (x, y) => burrowTopAt(x0 + (roomWest ? W - 1 - x : x), y0 + y),
      true,
    );
  }
  const out = roomWest ? flip(g) : g;
  const mx = (x: number) => (roomWest ? W - 1 - x : x);
  return {
    grid: out,
    glows: barred
      ? []
      : [
          { x: mx(40), y: O0 - 14, radius: 16, strength: 0.5 },
          { x: mx(24), y: (O0 + O1) / 2, radius: 24, strength: 0.5 },
        ],
    ...(barred
      ? {}
      : {
          light: {
            x: mx(W + 2),
            y: (O0 + O1) / 2 - 20,
            radius: 48,
            strength: 0.4,
            drop: 20,
            pool: 26,
            flicker: 0,
          },
        }),
  };
}

/**
 * A door in the wall you face, 72 x 72, the door's cell the bottom middle: a
 * round badger-door, a ring of bent timbers in the earth; open, a tunnel to a
 * round lit doorway; barred, a round studded door of planks.
 */
export function burrowFaceDoorPiece(barred: boolean, x0: number, y0: number): DoorPiece2 {
  const W = P * 3;
  const H = P * 3;
  const g = tgrid(W, H);
  const cx = 35.5;
  // A round door, a little taller than wide, its foot cut flat by the sill.
  const R = 18;
  const TALL = 1.4;
  const CY = 45;
  const dist = (x: number, y: number) => Math.hypot(x + 0.5 - cx, (y + 0.5 - CY) / TALL);
  const inOpening = (x: number, y: number, r: number) => dist(x, y) <= r;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const X = x0 + x;
      const Y = y0 + y;
      let c: Cell =
        y < P
          ? burrowTopAt(X, Y)
          : y < P * 2
            ? burrowFaceHighAt(X, y - P, Y)
            : burrowFaceAt(X, y - P * 2, Y);
      const opening = inOpening(x, y, R);
      const ring = !opening && inOpening(x, y, R + 4);
      if (ring && y < H - 3) {
        // The ring of bent timbers, each segment lit on its outer upper left, a joint between.
        const a = Math.atan2((y + 0.5 - CY) / TALL, x + 0.5 - cx);
        const d = dist(x, y);
        const seg = Math.floor((a + Math.PI) / 0.55);
        const joint = Math.abs(((a + Math.PI) % 0.55) - 0.275) > 0.25;
        const outer = d > R + 2.6;
        const lit = x + 0.5 < cx;
        c = joint
          ? cell('bark', 5)
          : cell('bark', outer ? (lit ? 1 : 3) : d < R + 1 ? 5 : lit ? 2 : 4);
        if (!joint && (seg * 7 + x + y) % 13 === 0) c = cell('bark', 6);
      } else if (opening) {
        if (barred) {
          // A round door of upright planks: grain, joints, iron studs, a ring and a bar.
          const plank = Math.floor((x - (cx - R)) / 6);
          const along = (x - Math.floor(cx - R)) % 6;
          c = cell('wood', along === 0 ? 5 : along === 1 ? 2 : (plank + y) % 7 === 0 ? 4 : 3);
          if (y > H - 4) c = darker(burrowEarthAt(X, Y), 3);
        } else {
          // The tunnel going away: its sides in shade, a round lit doorway at its end, the floor lit near it.
          const far =
            Math.hypot(x + 0.5 - cx, y + 0.5 - (CY + 4)) <= 7 ||
            (y >= CY + 4 && y <= 62 && Math.abs(x + 0.5 - cx) <= 7);
          if (far) c = cell('lamp', y < CY + 1 ? 2 : Math.abs(x + 0.5 - cx) > 5.9 ? 2 : 1);
          else if (y >= 60) c = burrowEarthAt(X, Y);
          else if (y >= 55) c = darker(burrowEarthAt(X, Y), 1);
          else c = cell('shade', Math.abs(x + 0.5 - cx) > 10 ? 2 : 3);
        }
      }
      g.d[y * W + x] = c;
    }
  if (barred) {
    for (const [sx, sy] of [
      [cx - 9, CY - 14],
      [cx + 8, CY - 14],
      [cx - 12, CY + 2],
      [cx + 11, CY + 2],
      [cx - 9, CY + 16],
      [cx + 8, CY + 16],
    ] as const) {
      set(g, Math.round(sx), sy, cell('iron', 1));
      set(g, Math.round(sx) + 1, sy + 1, cell('iron', 4));
    }
    // A bar across, in its brackets.
    for (let x = Math.round(cx - R); x <= Math.round(cx + R); x++) {
      if (!inOpening(x, CY - 2, R + 1)) continue;
      set(g, x, CY - 2, cell('wood', 1));
      set(g, x, CY - 1, cell('wood', 3));
      set(g, x, CY, cell('wood', 5));
    }
    // The ring hanging from the door's middle.
    for (const [dx, dy] of [
      [0, 0],
      [-1, 1],
      [1, 1],
      [-2, 2],
      [2, 2],
      [-1, 3],
      [1, 3],
      [0, 4],
    ] as const)
      set(g, Math.round(cx) + dx, CY + 4 + dy, cell('iron', dy < 2 ? 2 : 4));
  }
  // The stone sill, lit along its top.
  for (let x = Math.round(cx - R - 3); x <= Math.round(cx + R + 3); x++) {
    set(g, x, H - 3, cell('caverock', 1));
    set(g, x, H - 2, cell('caverock', 3));
    set(g, x, H - 1, cell('caverock', 5));
  }
  lantern(g, 3, 28, !barred);
  lantern(g, 64, 28, !barred);
  return {
    grid: g,
    glows: barred
      ? []
      : [
          { x: 5, y: 32, radius: 16, strength: 0.5 },
          { x: 66, y: 32, radius: 16, strength: 0.5 },
          { x: Math.round(cx), y: CY + 8, radius: 22, strength: 0.4 },
        ],
    ...(barred
      ? {}
      : {
          light: {
            x: Math.round(cx),
            y: 52,
            radius: 44,
            strength: 0.34,
            drop: 22,
            pool: 26,
            flicker: 0,
          },
        }),
  };
}
