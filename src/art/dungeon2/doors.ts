/**
 * The grotto's doors as the way onward (B13; Cody: "Dungeon doors to new
 * areas too small"). B11's doors were a single 24-pixel tile: on a phone held
 * sideways, beside a 64-pixel hero, a dark slot in the rock. A door is now a
 * piece three tiles tall, so it stands a figure high:
 *
 * - **In a side wall** (`door_side_open`, `door_side_barred`; every grotto
 *   door today), 24 x 72 over the door's cell and the rock above and below
 *   it: the passage cut through the rock's top is a metre and more across (40
 *   pixels, splayed toward the room), framed by squared timber posts at its
 *   ends and a beam across it at the room's edge, its jambs a lit lip and a
 *   dark sliver. Open, the far end of the passage is lit by the room beyond,
 *   warm and bright, and a lantern hangs on the upper post; barred, an iron
 *   grille stands across it, its bars' heads catching the light, and beyond
 *   is dark.
 * - **In the wall the viewer faces** (`door_open`, `door_barred`), 72 x 72
 *   over the door's cell and the two cells either side and the two above: a
 *   stone portal standing against the face, taller than the wall, its lintel
 *   stone's top lit, an opening 28 wide and 58 tall. Open, a passage recedes
 *   to a lit doorway and a lantern burns either side; barred, a portcullis of
 *   iron fills it.
 *
 * The single tiles by the same ids are each piece's slice over the door's
 * own cell, so a room laid out with tiles alone still reads.
 */
import { darker, tgrid, type Cell, type TGrid } from '../town2/cells';
import { cell } from './cave';
import { faceAt, faceHighAt, rockAt, TILE2 as P, wallTopAt } from './tiles';
import type { Light2 } from './light';
import type { Glow } from '../raster';
import type { Dungeon2Theme } from './theme';
import { tideFaceDoorPiece, tideSideDoorPiece } from './tideDoors';

export type DoorKind2 = 'door_open' | 'door_barred' | 'door_side_open' | 'door_side_barred';

/** A door piece's footprint: its size in tiles and where the door's own cell is in it. */
export interface DoorFootprint2 {
  readonly cols: number;
  readonly rows: number;
  /** The door's own cell, in tiles from the piece's top-left. */
  readonly door: readonly [col: number, row: number];
}

/**
 * Each door piece's footprint, drawn with the room to the south (a face's
 * door) or to the east (a side door: the passage runs on through the cell to
 * the west of the door's). With the room to the west a side door's piece is
 * mirrored, and its door cell is column 0 (`footprint2`).
 */
export const DOOR2_FOOTPRINTS: Readonly<Record<DoorKind2, DoorFootprint2>> = {
  door_open: { cols: 3, rows: 3, door: [1, 2] },
  door_barred: { cols: 3, rows: 3, door: [1, 2] },
  door_side_open: { cols: 2, rows: 3, door: [1, 1] },
  door_side_barred: { cols: 2, rows: 3, door: [1, 1] },
};

export interface DoorPiece2 {
  readonly grid: TGrid;
  /** Lanterns' glows, in the piece's own coordinates. */
  readonly glows: readonly Glow[];
  /** An open door's light from beyond, to light the room's floor by (as a lantern's), in its own coordinates. */
  readonly light?: Light2;
}

/** A door's footprint as it is placed: a side door's turned round when its room is to the west. */
export function footprint2(kind: DoorKind2, roomWest: boolean): DoorFootprint2 {
  const f = DOOR2_FOOTPRINTS[kind];
  const side = kind === 'door_side_open' || kind === 'door_side_barred';
  return side && roomWest ? { ...f, door: [f.cols - 1 - f.door[0], f.door[1]] } : f;
}

export const isDoorKind2 = (kind: string): kind is DoorKind2 =>
  Object.hasOwn(DOOR2_FOOTPRINTS, kind);

/** A door's piece for its cell (`col`, `row`), with its top-left in the room in art pixels. */
export function placeDoor2(
  kind: DoorKind2,
  roomWest: boolean,
  col: number,
  row: number,
  theme: Dungeon2Theme = 'grotto',
): { piece: DoorPiece2; x: number; y: number } {
  const f = footprint2(kind, roomWest);
  const x = (col - f.door[0]) * P;
  const y = (row - f.door[1]) * P;
  const barred = kind === 'door_barred' || kind === 'door_side_barred';
  const side = kind === 'door_side_open' || kind === 'door_side_barred';
  const piece =
    theme === 'tidepool'
      ? side
        ? tideSideDoorPiece(barred, x, y, roomWest)
        : tideFaceDoorPiece(barred, x, y)
      : side
        ? sideDoorPiece(barred, x, y, roomWest)
        : faceDoorPiece(barred, x, y);
  return { piece, x, y };
}

/** The piece's slice over the door's own cell: the single tile by the door's id. */
export function doorTileOf(piece: DoorPiece2, kind: DoorKind2, roomWest = false): TGrid {
  const f = footprint2(kind, roomWest);
  const out = tgrid(P, P);
  for (let y = 0; y < P; y++)
    for (let x = 0; x < P; x++)
      out.d[y * P + x] = piece.grid.d[(f.door[1] * P + y) * piece.grid.w + f.door[0] * P + x]!;
  return out;
}

/** A small lantern on an iron bracket, its panes lit (or dark when the way is shut). */
function lantern(g: TGrid, x: number, y: number, lit: boolean): void {
  const rows = ['.ii.', 'iLLi', 'iLMi', 'iMMi', 'iiii', '.i..'];
  const pin: Record<string, Cell> = {
    i: cell('iron', 4),
    L: lit ? cell('lamp', 0) : cell('glass', 4),
    M: lit ? cell('lamp', 1) : cell('glass', 5),
  };
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const ch = r[i]!;
      if (ch === '.') continue;
      const px = x + i;
      const py = y + j;
      if (px >= 0 && py >= 0 && px < g.w && py < g.h) g.d[py * g.w + px] = pin[ch]!;
    }
  });
  // The bracket into the rock.
  for (let i = -2; i < 0; i++) {
    const px = x + i;
    if (px >= 0 && px < g.w) g.d[(y + 2) * g.w + px] = cell('iron', 3);
  }
}

/**
 * A door in a side wall: 48 x 72, the door's cell the middle of the inner
 * column, the passage running on through the cell beyond it. Drawn with the
 * room to the east; `roomWest` turns it round. `x0`, `y0` are the piece's
 * place in the room in art pixels, so its rock runs on from its neighbours'.
 */
export function sideDoorPiece(
  barred: boolean,
  x0: number,
  y0: number,
  roomWest: boolean,
): DoorPiece2 {
  const W = P * 2;
  const H = P * 3;
  const g = tgrid(W, H);
  // The opening, a metre and more across, narrowing a little as it goes away from the room.
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
      if (y < top - 3 || y > bottom + 3) c = wallTopAt(X, Y);
      else if (y < top) {
        // The jamb above: a stone sill lit along its edge, a dark sliver of its face below.
        c = y === top - 1 ? cell('caverock', 6) : stone(x, y, true);
      } else if (y > bottom) {
        // The jamb below: its lit lip toward the light.
        c = y === bottom + 1 ? cell('caverock', 1) : stone(x, y, false);
      } else if (barred) {
        // Into the dark: black beyond the grille, the floor this side of it fading.
        c =
          x < 31
            ? cell('shade', y < top + 4 ? 4 : x < 24 ? 4 : 3)
            : darker(rockAt(X, Y), x < 37 ? 2 : x < 42 ? 1 : 0);
      } else {
        // Lit from the room beyond, warm and bright, within the door's own cell
        // (the cell beyond it may be off the map), the floor glowing toward it.
        const edge = y < top + 2 || y > bottom - 2;
        if (x < 24) c = cell('lamp', edge ? 2 : 1);
        else if (x < 29) c = cell('lamp', edge ? 2 : x < 26 ? 0 : 1);
        else if (x < 32) c = cell('cavesand', edge ? 2 : 1);
        else if (x < 36) c = darker(cell('cavesand', 1), 1);
        else c = rockAt(X, Y);
        if (y === top) c = darker(c, 1);
      }
      g.d[y * W + x] = c;
    }
  // The posts at each end of the opening, squared timbers seen from above, at the room's edge.
  for (const py of [O0 - 10, O1 + 3])
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 9; x++)
        g.d[(py + y) * W + 37 + x] = cell(
          'wood',
          x === 0 || y === 0 ? 1 : x === 8 || y === 7 ? 4 : (x + y) % 5 === 0 ? 3 : 2,
        );
  if (barred) {
    // An iron grille across the passage: a heavy band, the bars' heads catching the light.
    for (let y = O0; y <= O1; y++) {
      g.d[y * W + 32] = cell('iron', 2);
      g.d[y * W + 33] = cell('iron', 3);
      g.d[y * W + 34] = cell('iron', 4);
      g.d[y * W + 35] = darker(g.d[y * W + 35]!, 1);
    }
    for (let y = O0 + 1; y < O1; y += 3) {
      g.d[y * W + 31] = cell('iron', 3);
      g.d[y * W + 32] = cell('iron', 0);
      g.d[y * W + 33] = cell('iron', 1);
      g.d[y * W + 34] = cell('iron', 3);
      g.d[(y + 1) * W + 31] = cell('iron', 5);
    }
  }
  // A lantern on the upper post: lit where the way is open, dark where it is shut.
  lantern(g, 40, O0 - 18, !barred);
  if (!barred) {
    const shut = sideDoorPiece(true, x0, y0, roomWest).grid;
    cheeks(g, roomWest ? flip(shut) : shut, O0, O1, (x, y) =>
      wallTopAt(x0 + (roomWest ? W - 1 - x : x), y0 + y),
    );
  }
  const out = roomWest ? flip(g) : g;
  const mx = (x: number) => (roomWest ? W - 1 - x : x);
  return {
    grid: out,
    glows: barred
      ? []
      : [
          { x: mx(42), y: O0 - 15, radius: 18, strength: 0.5 },
          { x: mx(27), y: (O0 + O1) / 2, radius: 22, strength: 0.5 },
        ],
    // The light from beyond, laid on the floor at the doorway's mouth.
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
 * B15: the open passage's rock where it runs on past the room's edge (the
 * cell beyond the door's, which a scene may show only where the open piece
 * differs from the barred one). Its jambs are lit from beyond, a step
 * lighter than when the way is shut, and the rock either side of the
 * passage catches that light too, out to a ragged edge a few rows off, so
 * the lit passage reads as cut through rock rather than floating in the dark.
 * Every pixel of that surround differs from the barred piece's.
 */
/** The highest and lowest rows the open passage's surround reaches past the room's edge. */
const CHEEK_TOP = 9;
const CHEEK_BOTTOM = 62;

export function cheeks(
  g: TGrid,
  barred: TGrid,
  top0: number,
  bottom0: number,
  rockAt: (x: number, y: number) => Cell,
): void {
  const W = g.w;
  for (let x = 0; x < 31; x++) {
    // The passage narrows a little as it goes away from the room (as the pieces draw it).
    const pinch = x < 24 ? Math.round((24 - x) / 8) : 0;
    const top = top0 + pinch;
    const bottom = bottom0 - pinch;
    // A ragged edge, kept inside the rows a scene shows of the passage past the room's edge (it
    // shows where the pieces differ and four rows round that, inside the piece's middle rows).
    const raggedUp = 4 + Math.round(Math.abs(Math.sin(x * 1.7)) * 2 + (x % 5 === 0 ? 1 : 0));
    const raggedDown = 4 + Math.round(Math.abs(Math.cos(x * 1.3)) * 2 + (x % 4 === 1 ? 1 : 0));
    const reachUp = Math.min(raggedUp, top - CHEEK_TOP);
    const reachDown = Math.min(raggedDown, CHEEK_BOTTOM - bottom);
    for (let y = top - reachUp; y <= bottom + reachDown; y++) {
      if (y >= top && y <= bottom) continue;
      if (y < 0 || y >= g.h) continue;
      const i = y * W + x;
      const near = y < top ? top - y : y - bottom;
      let c = g.d[i]!;
      if (near > 2) {
        // The rock beyond the jamb, lit from the passage and fading out.
        const lit = rockAt(x, y);
        c = (lit & ~7) | Math.max(1, Math.min(5, (lit & 7) - (near < 6 ? 2 : 1)));
      } else c = (c & ~7) | Math.max(0, (c & 7) - 1);
      if (c === barred.d[i])
        c = (c & ~7) | Math.max(0, Math.min(5, (c & 7) + ((c & 7) > 2 ? -1 : 1)));
      if (c === barred.d[i]) c = (c & ~7) | ((c & 7) === 1 ? 2 : 1);
      g.d[i] = c;
    }
  }
}

/** A stone of a door's jamb seen from above: squared blocks with dark joints, lit on the side toward the light. */
function stone(x: number, y: number, above: boolean): Cell {
  const joint = x % 7 === 0;
  if (joint) return cell('caverock', 5);
  return cell('caverock', above ? (y % 3 === 0 ? 2 : 3) : y % 3 === 0 ? 2 : 1);
}

const flip = (g: TGrid): TGrid => {
  const out = tgrid(g.w, g.h);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) out.d[y * g.w + x] = g.d[y * g.w + g.w - 1 - x]!;
  return out;
};

/**
 * A door in the wall the viewer faces: 72 x 72, the door's cell the bottom
 * middle. A stone portal against the face, taller than the wall; open, a
 * passage receding to a lit doorway, a lantern either side; barred, a
 * portcullis of iron.
 */
export function faceDoorPiece(barred: boolean, x0: number, y0: number): DoorPiece2 {
  const W = P * 3;
  const H = P * 3;
  const g = tgrid(W, H);
  // The opening (inside the jambs) and the portal (the stones round it).
  const OX0 = 22;
  const OX1 = 49;
  const OY0 = 13;
  const FX0 = 16;
  const FX1 = 55;
  const FY0 = 3;
  const archR = (OX1 - OX0 + 1) / 2;
  const cx = (OX0 + OX1) / 2;
  const inArch = (x: number, y: number, r: number, top: number) =>
    y >= top + r || Math.hypot(x - cx, y - (top + r)) <= r;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const X = x0 + x;
      const Y = y0 + y;
      let c: Cell =
        y < P ? wallTopAt(X, Y) : y < P * 2 ? faceHighAt(X, y - P, Y) : faceAt(X, y - P * 2, Y);
      const opening = x >= OX0 && x <= OX1 && inArch(x, y, archR, OY0);
      const portal = x >= FX0 && x <= FX1 && inArch(x, y, archR + (OX0 - FX0), FY0) && !opening;
      if (portal) {
        // Squared stones, lit on their top and left, a dark joint between courses.
        const course = Math.floor((y - FY0) / 6);
        const joint = (y - FY0) % 6 === 5 || (x + course * 3) % 9 === 0;
        const left = x < cx;
        const edge = x === FX0 || x === FX1 || y === FY0;
        c = cell('caverock', edge ? 6 : joint ? 5 : (y - FY0) % 6 === 0 ? 1 : left ? 2 : 3);
        // The lintel stone's top, lit, standing proud of the wall's lip.
        if (y <= FY0 + 1 && !edge) c = cell('caverock', y === FY0 + 1 ? 0 : 1);
      } else if (opening) {
        if (barred) {
          c = cell('shade', y < OY0 + 20 ? 4 : y < 56 ? 3 : 2);
          if (y >= 60) c = darker(rockAt(X, Y), 3);
        } else {
          // A passage going away: its floor lit near the door, a lit doorway at its end.
          const far = x >= cx - 6 && x <= cx + 5 && y >= 30 && y <= 58;
          if (far) c = cell('lamp', y < 34 ? 2 : x === cx - 6 || x === cx + 5 ? 2 : 1);
          else if (y >= 59) c = rockAt(X, Y);
          else if (y >= 54) c = darker(rockAt(X, Y), 1);
          else c = cell('shade', x < cx - 9 || x > cx + 8 ? 2 : 3);
        }
      }
      g.d[y * W + x] = c;
    }
  if (barred) {
    // A portcullis: thick bars, two bands across, points at the foot.
    for (let x = OX0 + 2; x <= OX1 - 1; x += 5)
      for (let y = OY0; y < H; y++) {
        if (!inArch(x, y, archR, OY0)) continue;
        g.d[y * W + x] = cell('iron', 1);
        g.d[y * W + x + 1] = cell('iron', 3);
        if (x + 2 <= OX1) g.d[y * W + x + 2] = darker(g.d[y * W + x + 2]!, 1);
      }
    for (const by of [26, 44, 62])
      for (let x = OX0; x <= OX1; x++) {
        g.d[by * W + x] = cell('iron', 2);
        g.d[(by + 1) * W + x] = cell('iron', 4);
      }
    for (let x = OX0 + 2; x <= OX1 - 1; x += 5) g.d[26 * W + x] = cell('iron', 0);
  }
  lantern(g, 8, 28, !barred);
  lantern(g, 60, 28, !barred);
  return {
    grid: g,
    glows: barred
      ? []
      : [
          { x: 10, y: 30, radius: 16, strength: 0.5 },
          { x: 62, y: 30, radius: 16, strength: 0.5 },
          { x: Math.round(cx), y: 44, radius: 22, strength: 0.4 },
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
