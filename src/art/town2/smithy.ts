/**
 * The smithy at the C scale: the approved mock-up's smithy (src/art/
 * harbour.ts: stone walls, a blue slate roof, a wide open front with the
 * forge glowing inside, tools on the wall, a chimney) drawn to scale with a
 * 64-pixel person, in the study's way of shading every element as a solid.
 * Its own materials, so it is never the tavern again: rubble walls with cut
 * quoins at the corners, a hipped slate roof, a heavy oak lintel over the
 * forge bay, a log store under a lean-to, a horseshoe sign.
 */
import type { Glow } from '../raster';
import { cell, dim, hash, outlined, put, tgrid, type TGrid } from './cells';
import { m } from './scale';
import { bayer, clamp, cyl } from './texture';
import { lowestRow, type Building } from './tavern';
import {
  ashlar,
  beamH,
  beamV,
  chimney,
  doorAt,
  doorStep,
  hangingSign,
  moss,
  overhangShadow,
  rubble,
  slateRoof,
  windowAt,
  type Rect,
} from './walls';

const C = cell;

/** Cut stones at a corner, long and short by turns, standing proud of the rubble. */
function quoins(g: TGrid, x: number, y0: number, y1: number, k: number, right: boolean): void {
  const ch = m(0.26);
  for (let y = y0, n = 0; y < y1; y += ch, n++) {
    const long = n % 2 === 0;
    const w = long ? m(0.62) : m(0.36);
    const bx = right ? x - w : x;
    ashlar(g, { x: bx, y, w, h: Math.min(ch, y1 - y) }, k + n, ch);
  }
}

/** Log ends stacked in a store: rings lit top-left, bark round each. */
function logPile(g: TGrid, r: Rect, k: number): void {
  const rad = m(0.11);
  for (let row = 0; ; row++) {
    const cy = r.y + r.h - rad - 1 - row * (rad * 2 - 1);
    if (cy - rad < r.y) break;
    for (let col = 0; ; col++) {
      const cx = r.x + rad + (row % 2) * rad + col * (rad * 2);
      if (cx + rad > r.x + r.w) break;
      const rr = rad - (hash(col, row, k) < 0.3 ? 1 : 0);
      for (let j = -rr; j <= rr; j++)
        for (let i = -rr; i <= rr; i++) {
          const d = Math.hypot(i, j);
          if (d > rr + 0.3) continue;
          let t: number;
          let mat: 'wood' | 'bark' = 'wood';
          if (d > rr - 1.2) {
            mat = 'bark';
            t = i + j < 0 ? 2 : 4;
          } else {
            t = 1 + (Math.round(d) % 3 === 0 ? 1 : 0) + (i + j > 2 ? 1 : 0);
          }
          put(g, cx + i, cy + j, C(mat, t));
        }
    }
  }
}

/** The forge bay's inside: dark, the hearth glowing, a hood, bellows and tools on the back wall. */
function forgeBay(g: TGrid, r: Rect, k: number): Glow[] {
  const { x, y, w, h } = r;
  // The back wall in deep shadow, its stones just showing; the floor beaten earth.
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const px = x + i;
      const py = y + j;
      const row = Math.floor(py / 6);
      const sx = Math.floor((px + (row % 2) * 5) / 10);
      const edge = py % 6 === 5 || (px + (row % 2) * 5) % 10 === 9 ? 1 : 0;
      let c = C('shade', 1 + edge + (hash(sx, row, k) < 0.2 ? 1 : 0));
      if (j > h - m(0.35)) c = C('dirt', 5);
      put(g, px, py, c);
    }
  // The hearth: a brick block waist high at the left, a bed of coals, a hood over it.
  const hx = x + m(0.35);
  const hw = m(1.4);
  const hTop = y + h - m(0.95);
  for (let j = 0; j < y + h - hTop; j++)
    for (let i = 0; i < hw; i++) {
      const row = Math.floor(j / 4);
      const bi = (i + (row % 2) * 4) % 8;
      // Dark brick, lit only near the fire on top; mortar in deep shadow.
      if (j % 4 === 3 || bi === 7) {
        put(g, hx + i, hTop + j, C('shade', 1));
        continue;
      }
      let t = j < 4 ? 3 : j < 12 ? 4 : 5;
      if ((j % 4 === 0 || bi === 0) && j < 8) t -= 1;
      put(g, hx + i, hTop + j, C('tile', t));
    }
  for (let i = 1; i < hw - 1; i++) {
    for (let j = -3; j < 1; j++) {
      const v = hash(hx + i, j, k + 5);
      put(
        g,
        hx + i,
        hTop + j,
        C('fire', j === -3 ? (v < 0.5 ? 3 : 4) : v < 0.3 ? 1 : v < 0.7 ? 2 : 3),
      );
    }
    if (hash(i, 9, k) < 0.25) put(g, hx + i, hTop - 4, C('fire', 4));
  }
  // The hood: a sloping iron canopy up into the flue.
  const hoodBot = hTop - m(0.75);
  for (let j = 0; j < m(0.55); j++) {
    const ins = Math.round(j * 0.55);
    for (let i = ins; i < hw - ins; i++) {
      const nx = (i - ins) / Math.max(1, hw - 2 * ins - 1);
      put(g, hx + i, hoodBot - j, C('iron', j === 0 ? 2 : nx < 0.15 ? 2 : nx > 0.85 ? 5 : 4));
    }
  }
  for (let yy = y; yy < hoodBot - m(0.55); yy++)
    for (let i = Math.round(hw * 0.3); i < Math.round(hw * 0.7); i++)
      put(g, hx + i, yy, C('iron', i === Math.round(hw * 0.3) ? 3 : 5));
  // Bellows beside it: a dark leather wedge with a wooden board.
  const bx = hx + hw + m(0.15);
  const by = hTop - m(0.1);
  for (let j = 0; j < m(0.4); j++)
    for (let i = 0; i < m(0.7) - j; i++) put(g, bx + i, by + j, C('tar', j === 0 ? 2 : 4));
  for (let i = 0; i < m(0.75); i++) put(g, bx + i, by - 1, C('wood', 3));
  // Tools hanging on the back wall: tongs, hammers, a rasp, catching the forge's light on their left.
  let tx = bx + m(0.95);
  for (let n = 0; tx < x + w - m(0.3); n++, tx += m(0.32)) {
    const len = m(0.55) + Math.floor(hash(n, k, 3) * m(0.25));
    const ty = y + m(0.4);
    put(g, tx, ty - 2, C('iron', 3));
    for (let j = 0; j < len; j++) {
      put(g, tx, ty + j, C(n % 3 === 1 ? 'wood' : 'iron', 2));
      put(g, tx + 1, ty + j, C(n % 3 === 1 ? 'wood' : 'iron', 4));
    }
    if (n % 3 === 1)
      for (let i = -2; i <= 3; i++) {
        put(g, tx + i, ty + len, C('iron', i < 1 ? 1 : 3));
        put(g, tx + i, ty + len + 1, C('iron', 4));
      }
    else if (n % 3 === 0) {
      put(g, tx - 1, ty + len, C('iron', 2));
      put(g, tx + 2, ty + len, C('iron', 3));
      put(g, tx - 1, ty + len + 1, C('iron', 2));
      put(g, tx + 2, ty + len + 1, C('iron', 3));
    }
  }
  // A quench tub at the front right, catching daylight from outside.
  const qw = m(0.6);
  const qh = m(0.5);
  const qx = x + w - qw - m(0.2);
  for (let j = 0; j < qh; j++)
    for (let i = 0; i < qw; i++) {
      const nx = ((i + 0.5) / qw) * 2 - 1;
      const hoop = j === 2 || j === qh - 3;
      put(g, qx + i, y + h - qh + j, C(hoop ? 'iron' : 'wood', clamp(cyl(nx, 2.4, 1.3), 1, 5)));
    }
  for (let i = 1; i < qw - 1; i++) put(g, qx + i, y + h - qh, C('sea', 4));
  return [
    { x: hx + hw / 2, y: hTop - 2, radius: m(1.4), strength: 0.42, byDay: true },
    { x: hx + hw / 2, y: hTop - 2, radius: m(2.6), strength: 0.7 },
  ];
}

/** A horseshoe on a sign's face, points up for luck, its nail holes dark. */
function horseshoe(g: TGrid, f: Rect): void {
  const cx = f.x + f.w / 2 - 0.5;
  const cy = f.y + f.h * 0.42;
  const ro = Math.min(f.w, f.h) * 0.36;
  const ri = ro - 3;
  for (let y = Math.floor(cy - ro); y <= f.y + f.h - 3; y++)
    for (let x = Math.floor(cx - ro); x <= Math.ceil(cx + ro); x++) {
      const dx = x - cx;
      const dy = Math.max(0, y - cy);
      const dd = Math.hypot(dx, y < cy ? 0 : dy);
      const inBand = y < cy ? Math.abs(dx) >= ri && Math.abs(dx) <= ro : dd >= ri && dd <= ro;
      if (!inBand || y < f.y + 2) continue;
      put(g, x, y, C('iron', dx < 0 ? 0 : 1));
    }
  for (const s of [-1, 1])
    for (const fy of [0.3, 0.55]) put(g, cx + s * (ri + 1.5), f.y + f.h * fy, C('iron', 4));
}

/** The smithy. `k` seeds its wear. */
export function smithy(k = 11): Building {
  const store = m(1.9);
  const wallW = m(9.0);
  const wallH = m(3.4);
  const eo = m(0.45);
  const rh = m(2.7);
  const chimH = m(1.6);
  const signOut = m(1.2);
  const left = store + 2;
  const W = left + wallW + eo + signOut + 4;
  const roofTop = chimH + 2;
  const roofBot = roofTop + rh;
  const wTop = roofBot - m(0.2);
  const base = wTop + wallH;
  const H = base + m(0.25) + 2;
  const g = tgrid(W, H);
  const glows: Glow[] = [];

  rubble(g, { x: left, y: wTop, w: wallW, h: base - wTop }, k);
  quoins(g, left, wTop, base, k + 30, false);
  quoins(g, left + wallW, wTop, base, k + 40, true);
  // A course of cut stone along the foot.
  ashlar(g, { x: left, y: base - m(0.3), w: wallW, h: m(0.3) }, k + 50, m(0.3));

  // The forge bay: a wide opening under an oak lintel on two posts.
  const bayX = left + m(0.8);
  const bayW = m(3.8);
  const bayTop = base - m(2.6);
  const lin = m(0.32);
  glows.push(...forgeBay(g, { x: bayX, y: bayTop, w: bayW, h: base - bayTop }, k));
  overhangShadow(g, bayX, bayX + bayW, bayTop, m(0.35));
  beamH(g, bayX - m(0.2), bayTop - lin, bayW + m(0.4), lin, k + 60);
  const post = m(0.24);
  beamV(g, bayX, bayTop, post, base - bayTop, k + 61);
  beamV(g, bayX + bayW - post, bayTop, post, base - bayTop, k + 62);
  for (let j = 0; j < base - bayTop; j++) {
    dim(g, bayX + post, bayTop + j, 2);
    dim(g, bayX + post + 1, bayTop + j, 1);
  }

  // The door and a window to its right.
  const dw = m(1.05);
  const dh = m(2.0);
  const door: Rect = { x: bayX + bayW + m(1.1), y: base - dh, w: dw, h: dh };
  doorAt(g, door.x, door.y, door.w, door.h, { k: k + 3 });
  doorStep(g, door.x - m(0.2), base - 1, door.w + m(0.4));
  const ww = m(1.0);
  const wh = m(1.0);
  const glow = windowAt(g, door.x + dw + m(0.9), base - m(2.05), ww, wh, {
    nx: 2,
    ny: 3,
    lit: true,
    frame: 'tar',
    k: k + 4,
  });
  if (glow) glows.push(glow);

  // The log store, a lean-to against the left wall.
  const sTop = wTop + m(1.1);
  for (let j = 0; j < base - sTop; j++)
    for (let i = 0; i < store; i++) put(g, 2 + i, sTop + j, C('shade', 1));
  logPile(g, { x: 2 + m(0.15), y: sTop + m(0.45), w: store - m(0.3), h: base - sTop - m(0.45) }, k);
  beamV(g, 2, sTop, m(0.18), base - sTop, k + 70);
  // Its pent roof of slates, seen from above as it falls away to the left, a fascia board
  // along its foot, and its shadow on the logs.
  const pr = m(0.9);
  for (let i = -2; i < store + 2; i++) {
    const drop = Math.round(((store - i) / store) * m(0.35));
    const top = sTop - pr + drop;
    for (let j = 0; j < pr; j++) {
      const y = top + j;
      const course = Math.floor(j / 5);
      const joint = (i + course * 4 + 100) % 9 === 0;
      let t = j % 5 === 4 ? 5 : j % 5 === 0 ? 1 : joint ? 4 : 2;
      if (i < 1) t = Math.min(5, t + 1);
      put(g, i + 2, y, C('slate', t));
    }
    for (let j = 0; j < 3; j++)
      put(g, i + 2, top + pr + j, C('wood', j === 0 ? 1 : j === 2 ? 5 : 3));
  }
  overhangShadow(g, 2, store + 2, sTop + 1, m(0.3));

  // Roof: hipped slate, the eaves' shadow on the wall, moss on the slates.
  const roof = { xl: left - eo, xr: left + wallW + eo, yTop: roofTop, yBot: roofBot, hip: m(1.6) };
  overhangShadow(g, left, left + wallW, roofBot, m(0.4));
  slateRoof(g, roof, k + 80);
  moss(g, roof, k + 81, 6, 'slate');
  beamH(
    g,
    roof.xl + 1,
    roofBot,
    roof.xr - roof.xl - 1,
    Math.max(3, m(0.1)),
    k + 82,
    undefined,
    'tar',
  );
  // The forge's chimney: big, over the hearth, brick-red at the top from the heat.
  const cw = m(1.0);
  chimney(g, bayX + m(0.25), 2 + m(0.25), roofTop + Math.round(rh * 0.45), cw, k + 90);
  for (let y = 2 + m(0.25) + m(0.15); y < 2 + m(0.25) + m(0.6); y++)
    for (let x = bayX + m(0.25); x < bayX + m(0.25) + cw; x++)
      if (bayer(x, y) < 0.35) dim(g, x, y, 1);

  hangingSign(
    g,
    left + wallW,
    wTop + m(0.5),
    signOut,
    m(0.85),
    m(0.85),
    (face) => horseshoe(g, face),
    k,
    'tar',
  );

  // Soot above the forge bay and a scorch round its lintel.
  for (let y = bayTop - lin - m(0.6); y < bayTop - lin; y++)
    for (let x = bayX + m(0.1); x < bayX + m(1.8); x++)
      if (bayer(x, y) < 0.45 * ((y - (bayTop - lin - m(0.6))) / m(0.6))) dim(g, x, y, 1);

  const out = outlined(g);
  return {
    picture: { grid: out, glows: glows.map((gl) => ({ ...gl, x: gl.x + 1, y: gl.y + 1 })) },
    base: lowestRow(out),
    spots: {
      door: { x: door.x + 1 + Math.round(dw / 2), y: lowestRow(out) + 2 },
      forge: { x: bayX + 1 + Math.round(bayW / 2), y: lowestRow(out) + 2 },
    },
    wallX0: 3,
    wallX1: left + wallW + 1,
    chimney: { x: bayX + m(0.25) + 1 + Math.round(cw / 2), y: 2 + m(0.25) - m(0.22) + 1 },
  };
}
