/**
 * Your house at the C scale: a new building (the current town has none; the
 * design's "house you fill"). A cottage that is plainly nobody else's: warm
 * limewash over a rubble plinth, a deep golden thatch with an eyebrow over
 * the upper window, a blue door under a slate hood with a fanlight, blue
 * shutters, a climbing rose, and a stone chimney at the gable for the hearth.
 */
import type { Glow } from '../raster';
import { cell, dim, hash, isMat, at, outlined, put, tgrid, type TGrid } from './cells';
import { m } from './scale';
import { bayer, clamp } from './texture';
import { lowestRow, windowBox, type Building } from './tavern';
import {
  beamH,
  chimney,
  doorAt,
  doorStep,
  overhangShadow,
  render,
  rubble,
  spall,
  thatchRoof,
  windowAt,
  type Rect,
} from './walls';

const C = cell;

/** A climbing rose up a wall: clumps of leaves lit top-left, with blooms, over a woody stem. */
function rose(g: TGrid, x: number, bottom: number, top: number, k: number): void {
  for (let y = bottom; y > top; y--) {
    const sx = x + Math.round(Math.sin(y / 11) * 3);
    put(g, sx, y, C('bark', 3));
    put(g, sx + 1, y, C('bark', 5));
  }
  const clumps = Math.round((bottom - top) / 9);
  for (let n = 0; n < clumps; n++) {
    const cy = bottom - m(0.2) - Math.floor((n / clumps) * (bottom - top - m(0.3)));
    const cx = x + Math.round((hash(n, k, 1) - 0.4) * m(0.7));
    const r = 4 + Math.floor(hash(n, k, 2) * 4);
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++) {
        const d = (i * i + j * j * 1.4) / (r * r);
        if (d > 1 + (hash(cx + i, cy + j, k) - 0.5) * 0.5) continue;
        const lam = -(i / r) * 0.6 - (j / r) * 0.8;
        let t = 3 - Math.round(lam * 1.5);
        if (hash(cx + i, cy + j, k + 1) < 0.15) t += 1;
        put(g, cx + i, cy + j, C('leaf', clamp(t, 1, 5)));
      }
    for (let b = 0; b < 2 + (n % 2); b++) {
      const fx = cx + Math.round((hash(n, b, k + 3) - 0.5) * r * 1.4);
      const fy = cy + Math.round((hash(b, n, k + 4) - 0.5) * r);
      put(g, fx, fy, C('flower', 2));
      put(g, fx + 1, fy, C('flower', 3));
      put(g, fx, fy + 1, C('flower', 3));
      put(g, fx + 1, fy + 1, C('flower', 4));
      put(g, fx, fy - 1, C('flower', 0));
    }
  }
}

/**
 * An eyebrow in the thatch (redrawn in B9; B7's showed a half-moon of bare
 * wall under an arch, which read as a sign painted on the roof). The thatch
 * itself lifts over the window in a low wave: its cut edge, a fringe of straw
 * ends, runs just over the window's head and sweeps down either side to the
 * roof; the courses above it bend with it, lit along the swell's crown; under
 * the edge a band of deep shadow falls on the window's head; the window's
 * little wall shows only as narrow cheeks beside its frame.
 */
function eyebrow(g: TGrid, cx: number, sill: number, k: number): Glow | null {
  const ww = m(1.0);
  const wh = m(0.8);
  const wx = cx - Math.round(ww / 2);
  const wy = sill - wh;
  const face = { x: wx - m(0.16), y: wy - 3, w: ww + m(0.32), h: wh + 3 };
  render(g, face, face.y + face.h, k + 7, 'limewash');
  for (let y = face.y; y < face.y + face.h; y++)
    for (let x = face.x; x < face.x + face.w; x++) dim(g, x, y, 1);
  const glow = windowAt(g, wx, wy, ww, wh, { nx: 2, ny: 2, lit: true, k });
  // The edge's line: just over the window's head in the middle, sweeping down
  // either side of the cheeks to meet the roof below the sill.
  const inner = face.w / 2 + 1;
  const rx = inner + m(0.8);
  const lip = (x: number) => {
    const d = Math.abs(x + 0.5 - cx);
    if (d <= inner) return wy - 4 - Math.round((1 - (d / inner) ** 2) * 2);
    const f = Math.min(1, (d - inner) / (rx - inner));
    return Math.round(wy - 4 + f * f * (3 - 2 * f) * (wh + 7));
  };
  const thick = m(0.42);
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const ly = lip(x);
    const d = Math.abs(x + 0.5 - cx) / rx;
    const top = ly - thick - Math.round((1 - d * d) * m(0.18));
    for (let y = top - 6; y <= ly; y++) {
      if (y < top) {
        // The roof swelling up into the wave: a step lighter on its crown.
        if (isMat(at(g, x, y), 'thatch') && y >= top - 6 + Math.round(d * 4)) {
          const c = at(g, x, y) & 7;
          put(g, x, y, C('thatch', Math.max(1, c - 1)));
        }
        continue;
      }
      const v = (y - top) / Math.max(1, ly - top);
      // Courses bending with the wave, a stroke of straw now and then.
      const course = (y - top + Math.round(d * 3)) % 5 === 4;
      const straw = hash(Math.floor(x / 2), y, k + 3) < 0.18;
      let t = v < 0.35 ? 1 : v < 0.75 ? 2 : 3;
      if (course) t += 1;
      if (straw) t -= 1;
      if (x > cx) t += Math.round(d * 1.2);
      // The cut edge: straw ends, dark and ragged.
      if (y >= ly - 1) t = hash(x, k, 5) < 0.4 ? 5 : 4;
      put(g, x, y, C('thatch', clamp(t, 1, 5)));
    }
    // Ragged straw ends hanging a pixel below the edge here and there.
    if (hash(x, k, 6) < 0.3) put(g, x, ly + 1, C('thatch', 5));
    // The shadow the edge throws: deep under it, a step for a few rows more.
    for (let j = 1; j <= 4; j++) {
      const y = ly + j + (hash(x, k, 6) < 0.3 ? 1 : 0);
      const c = at(g, x, y);
      if (!c || isMat(c, 'glass')) {
        if (isMat(c, 'glass') && j <= 2) dim(g, x, y, 1);
        continue;
      }
      dim(g, x, y, j <= 2 ? 2 : 1);
    }
  }
  return glow;
}

/** Your house. `k` seeds its wear. */
export function house(k = 23): Building {
  const wallW = m(8.2);
  const wallH = m(2.9);
  const plinthH = m(0.45);
  const eo = m(0.5);
  const rh = m(3.3);
  const chimH = m(1.2);
  const left = eo + 2;
  const W = left + wallW + eo + 4;
  const roofTop = chimH + 2;
  const roofBot = roofTop + rh;
  const wTop = roofBot - m(0.3);
  const base = wTop + wallH;
  const H = base + m(0.25) + 2;
  const g = tgrid(W, H);
  const glows: Glow[] = [];

  render(g, { x: left, y: wTop, w: wallW, h: base - plinthH - wTop }, base - m(1.0), k, 'limewash');
  rubble(g, { x: left, y: base - plinthH, w: wallW, h: plinthH }, k + 1);
  spall(g, left + wallW - m(0.9), base - plinthH - m(0.55), m(0.3), m(0.18), k + 2);

  // The door, left of middle, under its hood; a window either side.
  const dw = m(1.0);
  const dh = m(1.95);
  const door: Rect = { x: left + m(3.2), y: base - dh, w: dw, h: dh };
  const dg = doorAt(g, door.x, door.y, door.w, door.h, { paint: 'blue', fanlight: true, k });
  if (dg) glows.push(dg);
  doorStep(g, door.x - m(0.2), base - 1, door.w + m(0.4));
  const wy = base - m(2.1);
  for (const [wx, lit] of [
    [left + m(0.8), true],
    [left + m(5.4), false],
  ] as const) {
    const glow = windowAt(g, wx, wy, m(1.2), m(1.0), {
      nx: 3,
      ny: 2,
      lit,
      shutters: 'blue',
      stains: true,
      k: k + wx,
    });
    if (glow) glows.push(glow);
  }
  windowBox(g, left + m(5.4) - m(0.08), left + m(5.4) + m(1.28), wy + m(1.3) + m(0.18), k + 4);

  // The porch hood over the door: slates on two brackets, its shadow below.
  const hx = door.x - m(0.35);
  const hw = dw + m(0.7);
  const hy = door.y - m(0.75);
  overhangShadow(g, hx + 2, hx + hw + 2, hy + m(0.32), m(0.4));
  for (let j = 0; j < m(0.32); j++)
    for (let i = 0; i < hw; i++) {
      const row = Math.floor(j / 4);
      const t = j % 4 === 3 ? 5 : j % 4 === 0 ? 1 : (i + row * 3) % 7 === 0 ? 4 : 2;
      put(g, hx + i, hy + j, C('slate', i === hw - 1 ? 5 : t));
    }
  beamH(g, hx - 1, hy + m(0.32), hw + 2, 3, k + 5);
  for (const bx of [hx + 2, hx + hw - 5])
    for (let j = 0; j < m(0.4); j++) {
      put(g, bx, hy + m(0.32) + 3 + j, C('wood', 2));
      put(g, bx + 1, hy + m(0.32) + 3 + j, C('wood', 4));
      if (j < m(0.4) - 2) put(g, bx + 2, hy + m(0.32) + 3 + j, C('wood', 5));
    }

  rose(g, door.x - m(0.42), base - plinthH, wTop + m(0.6), k + 6);

  // Thatch, deep at the eaves, and its heavy shadow on the wall.
  const roof = { xl: left - eo, xr: left + wallW + eo, yTop: roofTop, yBot: roofBot, hip: m(0.9) };
  overhangShadow(g, left, left + wallW, roofBot, m(0.55));
  thatchRoof(g, roof, k + 8);
  const eg = eyebrow(g, left + m(2.3), roofBot - m(0.55), k + 9);
  if (eg) glows.push(eg);
  // The eaves' lower edge: a thick rounded lip.
  for (let x = roof.xl + 2; x < roof.xr - 1; x++) {
    put(g, x, roofBot - 1, C('thatch', 4 + (hash(x, 1, k) < 0.3 ? 1 : 0)));
    if (hash(x, 2, k) < 0.5) put(g, x, roofBot, C('thatch', 5));
  }
  // The hearth's chimney at the right gable.
  const cw = m(0.9);
  const chX = left + wallW - m(1.4);
  chimney(g, chX, 2 + m(0.25), roofTop + Math.round(rh * 0.42), cw, k + 10);

  // Damp at the plinth's foot.
  for (let x = left; x < left + wallW; x++)
    for (let j = 0; j < 3; j++) if (bayer(x, j) < 0.5 - j * 0.15) dim(g, x, base - 1 - j, 1);

  const out = outlined(g);
  return {
    picture: { grid: out, glows: glows.map((gl) => ({ ...gl, x: gl.x + 1, y: gl.y + 1 })) },
    base: lowestRow(out),
    spots: { door: { x: door.x + 1 + Math.round(dw / 2), y: lowestRow(out) + 2 } },
    wallX0: left + 1,
    wallX1: left + wallW + 1,
    chimney: { x: chX + 1 + Math.round(cw / 2), y: 2 + m(0.25) - m(0.22) + 1 },
  };
}
