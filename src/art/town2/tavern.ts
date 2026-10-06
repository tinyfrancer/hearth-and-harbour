/**
 * The tavern at the C scale: the approved study's tavern (study/scale-detail/
 * buildings.ts, option C, five bays), which is the approved mock-up's tavern
 * (src/art/scenery.ts) drawn to scale: timber frame and plaster on a stone
 * plinth, an oversailing upper floor on joists, a patched red tiled roof with
 * a chimney, teal shutters, a window box, a lantern by the door and a hanging
 * sign. Changed from the study: moss grows as cushions, the plaster is broken
 * up by tone patches, stains under the sills, cracks and a spalled patch;
 * windows light at dusk; the sign is painted with a gull over an anchor.
 */
import type { Glow } from '../raster';
import { cell, dim, hash, outlined, put, tgrid, type Picture2, type TGrid } from './cells';
import { m } from './scale';
import { bayer } from './texture';
import {
  ashlar,
  beamH,
  beamV,
  brace,
  chimney,
  doorAt,
  doorStep,
  hangingSign,
  moss,
  overhangShadow,
  render,
  spall,
  tileRoof,
  timberShadows,
  wallLantern,
  windowAt,
  type Rect,
} from './walls';

const C = cell;

/** What a building's drawing tells the town: where it meets the ground and where its door is. */
export interface Building {
  readonly picture: Picture2;
  /** The row, from the top, of the lowest pixel that is not outline: where it stands. */
  readonly base: number;
  /** Where a person's feet stand to use it, from its top-left. */
  readonly spots: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
  /** Its walls' left and right at the ground, for laying its shadow. */
  readonly wallX0: number;
  readonly wallX1: number;
  /** The middle of its chimney's top, where smoke rises from, if it has one. */
  readonly chimney?: { readonly x: number; readonly y: number };
}

/** Paints a gull in flight over an anchor on a sign's face, in the sign's own colours. */
export function gullAndAnchor(g: TGrid, f: Rect): void {
  const cx = f.x + Math.round(f.w / 2);
  // The anchor: shank, stock, ring and curved arms with flukes, in iron.
  const top = f.y + Math.round(f.h * 0.3);
  const bot = f.y + f.h - 4;
  for (let y = top; y <= bot; y++) {
    put(g, cx - 1, y, C('gold', 1));
    put(g, cx, y, C('gold', 3));
  }
  for (let i = -5; i <= 5; i++) {
    put(g, cx + i, top + 3, C('gold', i < 0 ? 1 : 2));
    put(g, cx + i, top + 4, C('gold', 4));
  }
  for (let a = 0; a < 20; a++) {
    const th = (a / 20) * Math.PI * 2;
    put(g, cx - 0.5 + Math.cos(th) * 2, top - 2 + Math.sin(th) * 2, C('gold', a < 10 ? 3 : 1));
  }
  const ar = Math.round(f.w * 0.3);
  for (let a = 0; a <= 24; a++) {
    const th = (a / 24) * Math.PI;
    const x = cx - 0.5 + Math.cos(th) * ar;
    const y = bot - 2 - ar * 0.55 + Math.sin(th) * ar * 0.55;
    put(g, x, y, C('gold', 2));
    put(g, x, y + 1, C('gold', 4));
  }
  for (const s of [-1, 1]) {
    const fx = cx + s * ar - (s > 0 ? 1 : 0);
    const fy = bot - 2 - Math.round(ar * 0.55);
    put(g, fx, fy - 1, C('gold', 1));
    put(g, fx - s, fy - 1, C('gold', 2));
    put(g, fx, fy - 2, C('gold', 1));
  }
  // The gull: white wings in a shallow M over the anchor's ring, dark tips, a yellow bill.
  const gy = f.y + Math.round(f.h * 0.2);
  const wing = Math.round(f.w * 0.36);
  for (let i = -wing; i <= wing; i++) {
    const a = Math.abs(i) / wing;
    const y = gy - Math.round(Math.sin(a * Math.PI) * 3) + (a > 0.85 ? 1 : 0);
    const tip = a > 0.75;
    put(g, cx + i, y, C(tip ? 'shade' : 'sail', tip ? 4 : 0));
    if (!tip) put(g, cx + i, y + 1, C('sail', 2));
  }
  put(g, cx, gy, C('sail', 0));
  put(g, cx, gy + 1, C('sail', 1));
  put(g, cx + 1, gy + 1, C('gold', 2));
}

/** The tavern. `k` seeds its wear; the town's is 3. */
export function tavern(k = 3): Building {
  const bays = 5;
  const doorBay = 2;
  const shutters = [0, 3];
  const windowBoxBay = 1;
  // Upper windows lit at dusk: the outer ones stay dark (rooms let, nobody in).
  const upperLit = [1, 2, 3];
  const tb = m(0.21);
  const bayW = m(2.5);
  const wallW = bays * bayW + tb;
  const jo = m(0.16);
  const eo = m(0.42);
  const plinthH = m(0.5);
  const g1 = m(3.05) - plinthH;
  const jb = tb + Math.max(2, Math.round(tb / 2));
  const g2 = m(2.45);
  const rh = m(3.2);
  const chimH = m(1.4);
  const signOut = m(1.55);
  const left = jo + eo + 2;
  const W = left + wallW + jo + eo + signOut + 3;
  const roofTop = chimH + 2;
  const roofBot = roofTop + rh;
  const upTop = roofBot - m(0.4);
  const upBot = roofBot + g2;
  const jTop = upBot;
  const gTop = jTop + jb;
  const gBot = gTop + g1;
  const base = gBot + plinthH;
  const H = base + m(0.25) + 2;
  const g = tgrid(W, H);
  const timber = new Uint8Array(W * H);
  const glows: Glow[] = [];

  // Walls.
  const ux0 = left - jo;
  const uw = wallW + 2 * jo;
  render(g, { x: ux0, y: upTop, w: uw, h: upBot - upTop }, upBot, k);
  render(g, { x: left, y: gTop, w: wallW, h: gBot - gTop }, gBot - m(0.9), k + 1);

  // Upper floor timbers: posts, a rail under the windows, chevron braces below it, studs.
  const upRail = upBot - m(0.95);
  const upPost = (i: number) => ux0 + Math.round((i * (uw - tb)) / bays);
  beamH(g, ux0, upRail, uw, tb, k + 1, timber);
  for (let i = 0; i < bays; i++) {
    const p0 = upPost(i) + tb;
    const p1 = upPost(i + 1);
    const mid = Math.round((p0 + p1) / 2);
    brace(g, p0 + tb * 0.4, upBot - 1, mid - tb * 0.2, upRail + tb, tb, timber);
    brace(g, p1 - tb * 0.4, upBot - 1, mid + tb * 0.2, upRail + tb, tb, timber);
    const ww = m(1.1);
    for (const sx of [mid - Math.round(ww / 2) - tb - m(0.45), mid + Math.round(ww / 2) + m(0.45)])
      beamV(g, sx, upTop, tb, upRail - upTop, k + 3 + i, timber);
  }
  for (let i = 0; i <= bays; i++) beamV(g, upPost(i), upTop, tb, upBot - upTop, k + 20 + i, timber);

  // Ground floor timbers: posts and a rail under the windows, broken by the door.
  const gPost = (i: number) => left + i * bayW;
  const gRail = base - m(1.0);
  for (let i = 0; i < bays; i++)
    if (i !== doorBay) beamH(g, gPost(i), gRail, bayW + tb, tb, k + 40 + i, timber);
  for (let i = 0; i <= bays; i++) beamV(g, gPost(i), gTop, tb, gBot - gTop, k + 50 + i, timber);
  timberShadows(g, timber, { x: ux0, y: upTop, w: uw, h: gBot - upTop }, Math.max(1, m(0.05)));

  // A patch where the plaster has fallen, low on the ground floor beside the door.
  spall(g, gPost(doorBay + 1) + m(0.75), gRail - m(0.35), m(0.32), m(0.2), k + 5);

  // Windows: upper floor one a bay, ground floor one a bay but the door's.
  for (let i = 0; i < bays; i++) {
    const p0 = upPost(i) + tb;
    const p1 = upPost(i + 1);
    const ww = m(1.1);
    const wh = m(1.05);
    const glow = windowAt(g, Math.round((p0 + p1 - ww) / 2), upRail - wh - m(0.28), ww, wh, {
      nx: 2,
      ny: 2,
      lit: upperLit.includes(i),
      ...(shutters.includes(i) ? { shutters: 'teal' as const } : {}),
      stains: true,
      k: k + i,
    });
    if (glow) glows.push(glow);
  }
  let door: Rect | null = null;
  for (let i = 0; i < bays; i++) {
    const cx = gPost(i) + Math.round((bayW + tb) / 2);
    if (i === doorBay) {
      const dw = m(1.05);
      const dh = m(2.0);
      door = { x: cx - Math.round(dw / 2), y: base - dh, w: dw, h: dh };
      continue;
    }
    const ww = m(1.45);
    const wh = m(1.12);
    const glow = windowAt(g, cx - Math.round(ww / 2), gRail - wh - m(0.1) - m(0.1), ww, wh, {
      nx: 3,
      ny: 2,
      lit: true,
      stains: true,
      k: k + 10 + i,
    });
    if (glow) glows.push(glow);
  }

  // The oversailing upper floor: its beam, the joist ends under it, and its shadow.
  beamH(g, ux0, jTop, uw, jb, k + 60, timber);
  overhangShadow(g, left, left + wallW, gTop, m(0.42));
  const js = Math.max(3, m(0.16));
  for (let x = left + m(0.3); x < left + wallW - js; x += m(0.62)) {
    for (let j = 0; j < js; j++)
      for (let i = 0; i < js; i++) {
        const t = i === 0 || j === 0 ? 1 : i === js - 1 || j === js - 1 ? 4 : 2;
        put(g, x + i, gTop + j, C('wood', t));
      }
    for (let j = 0; j < js; j++) dim(g, x + js, gTop + j + 1, 2);
    for (let i = 0; i < js; i++) dim(g, x + i + 1, gTop + js, 2);
  }

  ashlar(g, { x: left, y: gBot, w: wallW, h: plinthH }, k + 70);

  if (door) {
    const glow = doorAt(g, door.x, door.y, door.w, door.h, { grille: true, k });
    if (glow) glows.push(glow);
    doorStep(g, door.x - m(0.22), base - 1, door.w + m(0.44));
  }

  // Roof: the eaves' shadow on the wall, tiles over it, a fascia board, moss.
  const roof = { xl: ux0 - eo, xr: ux0 + uw + eo - 1, yTop: roofTop, yBot: roofBot, hip: 0 };
  const hipRoof = { ...roof, hip: Math.round(rh * 0.55) };
  overhangShadow(g, ux0, ux0 + uw, roofBot + m(0.1) - 1, m(0.36));
  tileRoof(g, hipRoof, k + 80);
  moss(g, hipRoof, k + 81, 9, 'tile');
  beamH(g, roof.xl + 1, roofBot, roof.xr - roof.xl - 1, Math.max(3, m(0.1)), k + 81);

  // Chimney, standing on the far slope.
  const cw = m(0.85);
  const chX = Math.round(left + wallW * 0.7);
  chimney(g, chX, 2 + m(0.25), roofTop + Math.round(rh * 0.36), cw, k + 90);

  // The sign on its bracket at the right end of the upper floor.
  hangingSign(
    g,
    ux0 + uw,
    upTop + m(0.55),
    signOut,
    m(1.15),
    m(0.95),
    (face) => gullAndAnchor(g, face),
    k,
    'teal',
  );

  // A lantern beside the door, and a window box of flowers.
  if (door) glows.push(wallLantern(g, door.x + door.w + m(0.42), door.y + m(0.15)));
  windowBox(g, upPost(windowBoxBay) + tb, upPost(windowBoxBay + 1), upRail, k);

  // Damp rising at the plinth's foot.
  for (let x = left; x < left + wallW; x++)
    for (let j = 0; j < 4; j++) if (bayer(x, j) < 0.6 - j * 0.15) dim(g, x, base - 1 - j, 1);

  const out = outlined(g);
  const spots: Building['spots'] = door
    ? { door: { x: door.x + 1 + Math.round(door.w / 2), y: lowestRow(out) + 2 } }
    : {};
  return {
    picture: {
      grid: out,
      glows: glows.map((gl) => ({ ...gl, x: gl.x + 1, y: gl.y + 1 })),
    },
    base: lowestRow(out),
    spots,
    wallX0: left + 1,
    wallX1: left + wallW + 1,
    chimney: { x: chX + 1 + Math.round(cw / 2), y: 2 + m(0.25) - m(0.22) + 1 },
  };
}

/** A box of flowers under a window between two posts, its shadow on the wall below. */
export function windowBox(g: TGrid, p0: number, p1: number, rail: number, k: number): void {
  const bw = m(1.35);
  const bx = Math.round((p0 + p1 - bw) / 2);
  const by = rail - m(0.28) + m(0.1) + m(0.08);
  const bh = Math.max(4, m(0.26));
  const fr = Math.max(2, m(0.07));
  for (let n = 0; n < Math.round(bw / (fr * 1.6)); n++) {
    const fx = bx + 2 + Math.floor(((n + hash(n, k)) / Math.round(bw / (fr * 1.6))) * (bw - 4));
    const fy = by - Math.floor(hash(n + 7, k) * m(0.25)) - 1;
    for (let j = -fr; j <= fr + 1; j++)
      for (let i = -fr; i <= fr; i++)
        if (i * i + j * j <= fr * fr + 1) put(g, fx + i, fy + j + 2, C('leaf', i < 0 ? 2 : 4));
    const hue = hash(n + 3, k) < 0.5;
    put(g, fx, fy, C('flower', hue ? 3 : 1));
    put(g, fx + 1, fy, C('flower', hue ? 4 : 2));
    put(g, fx, fy - 1, C('flower', hue ? 2 : 0));
  }
  for (let j = 0; j < bh; j++)
    for (let i = 0; i < bw; i++) {
      let t = j === 0 ? 1 : j === bh - 1 ? 5 : 3;
      if (i === 0 && j > 0) t = 2;
      if (i === bw - 1) t = 5;
      put(g, bx + i, by + j, C('wood', t));
    }
  for (let i = 1; i <= bw; i++) {
    dim(g, bx + i, by + bh, 2);
    dim(g, bx + i + 1, by + bh + 1, 1);
  }
}

/** The lowest row with anything but outline in it. */
export function lowestRow(g: TGrid): number {
  for (let y = g.h - 1; y >= 0; y--)
    for (let x = 0; x < g.w; x++) {
      const c = g.d[y * g.w + x] as number;
      if (c && (c & 7) !== 6) return y;
    }
  return -1;
}
