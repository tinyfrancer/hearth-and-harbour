/**
 * The tide-pool cave's doors (B15), on the grotto's footprints (doors.ts)
 * so a room is laid out the same in either theme, drawn as a sea cave's:
 *
 * - **Open**, the way is lit by daylight from beyond, never by a lamp: in a
 *   side wall the passage runs out into bright sand and the sea's edge; in
 *   the wall you face, a natural arch in the beds of the rock shows the sky
 *   and the sea. A glass float in its net hangs by it, catching the light.
 * - **Barred**, a barricade of driftwood stakes lashed with rope (and a net
 *   in the arch) stands across it, and beyond is shadow.
 *
 * Their glows shine by day (`always`): the cave's palette has no evening
 * lights.
 */
import { darker, tgrid, type Cell, type TGrid } from '../town2/cells';
import { cell } from './cave';
import { TILE2 as P } from './tiles';
import { tideFaceAt, tideFaceHighAt, tideRockAt, tideWallTopAt } from './tidepool';
import { cheeks, type DoorPiece2 } from './doors';
import { DAYLIGHT2_RGB } from './light';

const flip = (g: TGrid): TGrid => {
  const out = tgrid(g.w, g.h);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) out.d[y * g.w + x] = g.d[y * g.w + g.w - 1 - x]!;
  return out;
};

const set = (g: TGrid, x: number, y: number, c: Cell) => {
  if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c;
};

/** A glass fishing float in a net of cord, hanging: bright where the way is open, dull where shut. */
function float(g: TGrid, x: number, y: number, lit: boolean): void {
  const rows = ['..c..', '..c..', '.cgc.', 'cGgcc', 'cgggc', 'cgghc', '.chc.'];
  const pin: Record<string, Cell> = {
    c: cell('thatch', 4),
    g: lit ? cell('sea', 1) : cell('glass', 4),
    G: lit ? cell('sea', 0) : cell('glass', 3),
    h: lit ? cell('sea', 3) : cell('glass', 5),
  };
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (r[i] !== '.') set(g, x + i, y + j, pin[r[i]!]!);
  });
}

/** A round driftwood post seen from above: a silvered disc, its top lit, grain rings. */
function post(g: TGrid, cx: number, cy: number, r: number): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r) continue;
      const lit = x + 0.5 - cx + (y + 0.5 - cy) < -r * 0.4;
      set(g, x, y, cell('willow', d > r - 1 ? (lit ? 2 : 4) : Math.abs(d - r * 0.5) < 0.6 ? 3 : 1));
    }
}

/**
 * A door in a side wall, 48 x 72, the room to the east (`roomWest` turns
 * it): the passage through the rock's top as the grotto's, opening to the
 * day beyond, or barricaded with driftwood.
 */
export function tideSideDoorPiece(
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
      if (y < top - 3 || y > bottom + 3) c = tideWallTopAt(X, Y);
      else if (y < top) c = y === top - 1 ? cell('tiderock', 6) : cell('tiderock', y % 2 ? 3 : 2);
      else if (y > bottom)
        c = y === bottom + 1 ? cell('tiderock', 1) : cell('tiderock', y % 2 ? 2 : 1);
      else if (barred) {
        c =
          x < 30
            ? cell('tiderock', y < top + 4 ? 6 : 5)
            : darker(tideRockAt(X, Y), x < 37 ? 2 : x < 42 ? 1 : 0);
      } else {
        // The day beyond: the sea's edge at the passage's end, bright sand coming in.
        const edge = y < top + 2 || y > bottom - 2;
        if (x < 9) c = cell('sea', (x + y) % 7 === 0 ? 0 : edge ? 2 : 1);
        else if (x < 11) c = cell('sea', 0);
        else if (x < 24) c = cell('tidesand', edge ? 1 : 0);
        else if (x < 31) c = cell('tidesand', edge ? 2 : 1);
        else if (x < 36) c = cell('tidesand', 2);
        else c = tideRockAt(X, Y);
        if (y === top) c = darker(c, 1);
      }
      g.d[y * W + x] = c;
    }
  // Driftwood posts at each end of the opening, at the room's edge.
  post(g, 41.5, O0 - 6, 4.5);
  post(g, 41.5, O1 + 7, 4.5);
  if (barred) {
    // Stakes of driftwood across the passage, lashed together with rope.
    for (let y = O0 - 1; y <= O1 + 1; y++) {
      for (const [x, t] of [
        [30, 1],
        [31, 2],
        [32, 3],
        [33, 1],
        [34, 2],
        [35, 4],
      ] as const)
        set(g, x, y, cell('willow', (y * 7 + x) % 11 === 0 ? t + 1 : t));
      set(g, 36, y, darker(g.d[y * W + 36]!, 1));
    }
    for (let y = O0 + 4; y < O1; y += 9)
      for (let x = 29; x <= 36; x++) {
        set(g, x, y, cell('thatch', 2));
        set(g, x, y + 1, cell('thatch', 4));
      }
  }
  float(g, 39, O0 - 18, !barred);
  if (!barred) {
    const shut = tideSideDoorPiece(true, x0, y0, roomWest).grid;
    cheeks(g, roomWest ? flip(shut) : shut, O0, O1, (x, y) =>
      tideWallTopAt(x0 + (roomWest ? W - 1 - x : x), y0 + y),
    );
  }
  const out = roomWest ? flip(g) : g;
  const mx = (x: number) => (roomWest ? W - 1 - x : x);
  return {
    grid: out,
    glows: barred
      ? []
      : [
          { x: mx(41), y: O0 - 14, radius: 12, strength: 0.35, always: true, rgb: DAYLIGHT2_RGB },
          {
            x: mx(24),
            y: (O0 + O1) / 2,
            radius: 26,
            strength: 0.45,
            always: true,
            rgb: DAYLIGHT2_RGB,
          },
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
            rgb: DAYLIGHT2_RGB,
          },
        }),
  };
}

/**
 * A door in the wall you face, 72 x 72, the door's cell the bottom middle: a
 * natural arch worn through the beds of the rock, kelp hanging from it;
 * open, the sky and the sea beyond; barred, driftwood stakes and a net.
 */
export function tideFaceDoorPiece(barred: boolean, x0: number, y0: number): DoorPiece2 {
  const W = P * 3;
  const H = P * 3;
  const g = tgrid(W, H);
  const OX0 = 21;
  const OX1 = 50;
  const OY0 = 12;
  const cx = (OX0 + OX1) / 2;
  const R = (OX1 - OX0 + 1) / 2;
  const inArch = (x: number, y: number, r: number, top: number) =>
    y >= top + r || Math.hypot(x + 0.5 - cx, y + 0.5 - (top + r)) <= r;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const X = x0 + x;
      const Y = y0 + y;
      let c: Cell =
        y < P
          ? tideWallTopAt(X, Y)
          : y < P * 2
            ? tideFaceHighAt(X, y - P, Y)
            : tideFaceAt(X, y - P * 2, Y);
      const rag = Math.round(Math.sin(y * 0.9 + x) * 0.8);
      const opening = x >= OX0 + rag && x <= OX1 + rag && inArch(x, y, R, OY0);
      const rim = !opening && inArch(x, y, R + 3, OY0 - 3) && x >= OX0 - 3 && x <= OX1 + 3;
      if (rim) {
        // The arch's worn edge: lit where it faces the light (upper left), deep where it turns away.
        const left = x < cx;
        c = cell('tiderock', y < OY0 + 2 ? 1 : left ? 2 : 4);
      } else if (opening) {
        if (barred) {
          c = cell('tiderock', y < OY0 + 18 ? 6 : 5);
          if (y >= 60) c = darker(tideRockAt(X, Y), 2);
        } else {
          // Sky, a far headland, the bright sea with its glints, sand running out to it.
          const horizon = 40;
          if (y < horizon - 4) c = cell('glass', y < OY0 + 10 ? 1 : 0);
          else if (y < horizon && x > cx + 3) c = cell('pine', y === horizon - 4 ? 2 : 3);
          else if (y < horizon + 12)
            c = cell('sea', (x * 3 + y * 5) % 13 === 0 ? 0 : y < horizon + 3 ? 2 : 1);
          else if (y < horizon + 14) c = cell('sea', 0);
          else c = cell('tidesand', y < 60 ? 0 : 1);
        }
      }
      g.d[y * W + x] = c;
    }
  // Kelp hanging from the arch's crown.
  for (const [kx, len] of [
    [OX0 + 4, 6],
    [OX0 + 9, 9],
    [OX1 - 6, 7],
  ] as const)
    for (let j = 0; j < len; j++)
      set(
        g,
        kx + (j > len / 2 ? 1 : 0),
        OY0 - 1 + j,
        cell('kelp', j === len - 1 ? 4 : 2 + (j % 2)),
      );
  if (barred) {
    // Stakes across the arch, a net hung on them.
    for (let x = OX0 + 2; x <= OX1 - 1; x += 6)
      for (let y = OY0 + 4; y < H; y++) {
        if (!inArch(x, y, R, OY0)) continue;
        set(g, x, y, cell('willow', 1));
        set(g, x + 1, y, cell('willow', 3));
        set(g, x + 2, y, darker(g.d[y * W + x + 2]!, 1));
      }
    for (let y = OY0 + 14; y < H - 4; y++)
      for (let x = OX0; x <= OX1; x++)
        if (inArch(x, y, R, OY0) && ((x + y) % 6 === 0 || (x - y + 60) % 6 === 0))
          set(g, x, y, cell('thatch', 3));
    for (const by of [30, 52])
      for (let x = OX0; x <= OX1; x++) {
        set(g, x, by, cell('thatch', 2));
        set(g, x, by + 1, cell('thatch', 4));
      }
  }
  float(g, 8, 30, !barred);
  float(g, 59, 30, !barred);
  return {
    grid: g,
    glows: barred
      ? []
      : [{ x: Math.round(cx), y: 40, radius: 28, strength: 0.4, always: true, rgb: DAYLIGHT2_RGB }],
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
            rgb: DAYLIGHT2_RGB,
          },
        }),
  };
}
