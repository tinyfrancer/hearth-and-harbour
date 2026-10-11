/**
 * Title B, the hearth: the tavern's great fireplace at night, at the town's
 * own scale. A plastered, timbered room (the tavern's materials, drawn with
 * the town's own walls.ts and ground.ts helpers: render, ashlar, beams,
 * flagstones), the stone chimney breast with the hero's kite shield and two
 * long swords hung over the mantel, the nasal helm on the mantel, the red
 * cloak on a peg, boots drying on the hearth, a window onto the harbour at
 * dusk with the cutter's stern lantern, and the town's real barrel and crate.
 * Everything is lit by the fire alone: steps darken in clumped bands with
 * distance from it, and a warm light is added in flat rings.
 *
 * The name is carved into an oak board hung from the rafters and gilded.
 *
 * What moves: the flames (three frames' worth of tongues, never repeating
 * exactly), sparks rising, the firelight's rings breathing, the candle, the
 * stars and the lantern in the window.
 */
import { at, cell, hash, outlined, put, solid, stamp, tgrid, type TGrid } from '../../src/art/town2/cells';
import { ashlar, beamH, beamV, render } from '../../src/art/town2/walls';
import { barrel, crate } from '../../src/art/town2/props';
import { clamp, clumps, cyl, noise } from '../../src/art/town2/texture';
import { X, isX, xmatOf, xpal, type BandGlow, type XMat } from './pal';
import { bands, run, stars } from './paint';
import { farShip } from './far';
import { lockupUncial } from './lockups';
import { stampF } from './logo';
import { SCREEN_H, SCREEN_W, type Frame, type Title } from './screen';

const C = cell;
const LOOP = 2400;
const FIRE = { x: 195, y: 612 };
const FLOOR = 660;
const LANTERN = { x: 362, y: 252 };

/** Things that give light, or are seen through glass, and so are never darkened by distance. */
const LIGHTS: readonly XMat[] = ['fire', 'ember', 'lamp', 'glass', 'skyHi', 'skyLo', 'star', 'hazeDusk', 'gilt'];

function shieldAndSwords(g: TGrid, cx: number, top: number): void {
  // Two long swords crossed behind the shield, hilts down.
  const sword = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    const ux = (x1 - x0) / n;
    const uy = (y1 - y0) / n;
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const px = x0 + ux * i;
      const py = y0 + uy * i;
      if (f < 0.12) {
        // Grip (leather) and pommel.
        for (let w = -1; w <= 1; w++) put(g, px - uy * w, py + ux * w, C(f < 0.03 ? 'gold' : 'leather', f < 0.03 ? 2 : 2 + w));
      } else if (f < 0.14) {
        for (let w = -7; w <= 7; w++) put(g, px - uy * w, py + ux * w, C('gold', w < 0 ? 1 : 3));
      } else {
        const half = f > 0.94 ? 1 : 2;
        for (let w = -half; w <= half; w++) put(g, px - uy * w, py + ux * w, C('plate', w === -half ? 0 : w === half ? 4 : w === 0 ? 3 : 2));
      }
    }
  };
  sword(cx - 64, top + 168, cx + 62, top - 14);
  sword(cx + 64, top + 168, cx - 62, top - 14);
  // The kite shield: rounded top, sides sweeping to a point.
  const W = 76;
  const H = 114;
  const x0 = cx - W / 2;
  const inside = (x: number, y: number) => {
    const fx = (x + 0.5) / W - 0.5;
    const fy = (y + 0.5) / H;
    if (fy < 0.14) {
      const r = 0.14;
      const dy = (r - fy) / r;
      return Math.abs(fx) <= 0.5 - (1 - Math.sqrt(Math.max(0, 1 - dy * dy * 0.6))) * 0.5;
    }
    const t = (fy - 0.14) / 0.86;
    return Math.abs(fx) <= 0.5 * (1 - Math.pow(t, 1.9));
  };
  const mask = solid(g, x0, top, W, H, inside, 'blue', { base: 2.4, contrast: 1.3, radius: 6 });
  // Iron rim and the gold cross.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue;
      const edge =
        !mask[y * W + x - 1] || !mask[y * W + x + 1] || !mask[(y - 1) * W + x] || !mask[(y + 1) * W + x] ||
        !mask[y * W + x - 2] || !mask[y * W + x + 2] || !mask[(y - 2) * W + x];
      const vx = Math.abs(x + 0.5 - W / 2) < 5;
      const hy = y >= 30 && y < 39;
      if (edge) put(g, x0 + x, top + y, C('iron', x < W / 2 && y < H * 0.6 ? 1 : 3));
      else if (vx || hy) {
        const left = x + 0.5 < W / 2 - 2 || (hy && y === 30);
        put(g, x0 + x, top + y, C('gold', left ? 1 : y % 9 === 0 ? 3 : 2));
      }
    }
}

function helm(g: TGrid, cx: number, base: number): void {
  // A conical nasal helm sitting on the mantel.
  const H = 22;
  for (let y = 0; y < H; y++) {
    const f = y / H;
    const half = Math.round(2 + Math.pow(f, 0.55) * 9);
    for (let x = -half; x <= half; x++) {
      const nx = x / (half + 0.5);
      let t = clamp(cyl(nx, 2.2, 1.6), 0, 5);
      if (y > H - 5) t = clamp(cyl(nx, 2.8, 1.4), 1, 5);
      put(g, cx + x, base - H + y, C('iron', t));
    }
  }
  for (let x = -11; x <= 11; x++) put(g, cx + x, base - 5, C('iron', x < 0 ? 1 : 3));
  // The nasal, down the front.
  for (let y = 0; y < 6; y++) {
    put(g, cx, base - 4 + y, C('iron', 2));
    put(g, cx + 1, base - 4 + y, C('iron', 4));
  }
  put(g, cx - 4, base - 12, C('iron', 0));
}

function cloak(g: TGrid, px: number, top: number): void {
  // The red cloak hanging from its peg: shoulders, then folds that start at
  // the peg and fan out as they fall, the hem uneven, the hood behind.
  const H = 156;
  const folds = [-0.62, -0.25, 0.08, 0.42, 0.7];
  for (let y = 0; y < H; y++) {
    const f = y / H;
    const half = 7 + Math.pow(f, 0.6) * 15 + (f < 0.08 ? f * 30 : 0);
    const hem = H - Math.round(3 + Math.sin(y * 0 + 1) * 2);
    for (let x = Math.round(-half); x <= Math.round(half); x++) {
      const nx = x / half;
      if (y > hem - Math.round(Math.abs(Math.sin(nx * 5)) * 4)) continue;
      let t = 2.2 + nx * 1.0;
      for (const fx of folds) {
        const at0 = fx * (0.35 + f * 0.65);
        const d = nx - at0;
        if (Math.abs(d) < 0.07 + f * 0.05) t += 1.6;
        else if (d > 0 && d < 0.16 + f * 0.08) t -= 0.7;
      }
      put(g, px + x, top + y, C('crimson', clamp(t, 0, 5)));
    }
  }
  // The hood, gathered over the peg.
  for (let y = -6; y < 14; y++)
    for (let x = -11; x <= 11; x++)
      if ((x / 11) ** 2 + ((y - 3) / 9) ** 2 <= 1)
        put(g, px + x, top + y, C('crimson', clamp(1.4 + x / 5 + (y > 7 ? 1.4 : 0) + (Math.abs(x) < 3 && y > 4 ? 1 : 0), 0, 5)));
  for (let x = -2; x <= 3; x++) put(g, px + x, top - 8, C('wood', x < 0 ? 2 : 4));
  put(g, px - 1, top + 14, C('gold', 1));
  put(g, px, top + 14, C('gold', 2));
  put(g, px - 1, top + 15, C('gold', 3));
}

function boots(g: TGrid, x: number, base: number): void {
  for (const [bx, lean] of [
    [x, 0],
    [x + 14, 1],
  ] as const) {
    for (let y = 0; y < 22; y++)
      for (let i = 0; i < 9; i++) {
        const nx = (i - 4) / 4.5;
        put(g, bx + i + (y < 6 ? lean : 0), base - 22 + y, C('leather', clamp(cyl(nx, 2.4, 1.4) + (y < 2 ? -1 : 0), 0, 5)));
      }
    for (let i = 0; i < 14; i++)
      for (let y = 0; y < 5; y++) put(g, bx + i - 1, base - 5 + y, C('leather', clamp(2 + y * 0.6 + (i > 10 ? 1 : 0), 0, 5)));
  }
}

/**
 * A rug before the hearth, in perspective: madder red with a gold border and
 * a lozenge down its middle, its near edge fringed.
 */
function rug(g: TGrid): void {
  const y0 = FLOOR + 26;
  const y1 = 812;
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / (y1 - y0);
    const half = 120 + f * 60;
    const cx = FIRE.x;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = (x - cx) / half;
      const edge = Math.abs(u) > 0.9 || y - y0 < 4 + f * 2 || y1 - y < 6;
      const stripe = Math.abs(Math.abs(u) - 0.82) < 0.025 || Math.abs(y - y0 - (8 + f * 4)) < 1 + f;
      const loz = Math.abs(u) * 2.4 + Math.abs(f - 0.5) * 2 < 0.62 && Math.abs(u) * 2.4 + Math.abs(f - 0.5) * 2 > 0.5;
      const loz2 = Math.abs(u) * 2.4 + Math.abs(f - 0.5) * 2 < 0.28;
      let c = C('madder', 2 + ((Math.floor(x / 6) + Math.floor(y / 4)) % 5 === 0 ? 1 : 0));
      if (edge) c = C('madder', 4);
      if (stripe || loz) c = C('ochre', 2);
      if (loz2) c = C('indigo', 2);
      put(g, x, y, c);
    }
    put(g, Math.round(FIRE.x - half) - 1, y, C('madder', 6));
    put(g, Math.round(FIRE.x + half) + 1, y, C('madder', 6));
  }
  // Fringe along the near edge.
  for (let x = FIRE.x - 178; x <= FIRE.x + 178; x += 2)
    for (let j = 0; j < 4; j++) put(g, x, y1 + j, C('linen', 2 + j));
}

export function chair(g: TGrid): void {
  // A high-backed settle, its back to us, facing the fire: dark, rim-lit on the fire's side.
  const x0 = 0;
  const x1 = 96;
  const top = 690;
  for (let y = top; y < SCREEN_H; y++)
    for (let x = x0; x <= x1; x++) {
      const post = x < 10 || x > x1 - 12;
      const rail = (y - top) % 46 < 8;
      let t = post || rail ? 4 : 5;
      if (x > x1 - 3) t = 1;
      else if (x > x1 - 5) t = 3;
      if ((y - top) % 46 === 0 && !post) t = 3;
      put(g, x, y, C('wood', t));
    }
  // The finial.
  for (let y = -12; y < 0; y++)
    for (let x = -5; x <= 5; x++)
      if (x * x + (y + 6) * (y + 6) <= 30) put(g, x1 - 6 + x, top + y, C('wood', x > 2 ? 1 : 4));
}

function window_(g: TGrid, ph: number): BandGlow[] {
  const x0 = 12;
  const y0 = 252;
  const w = 34;
  const h = 150;
  // The view: dusk over the harbour.
  bands(g, y0, y0 + 112, [...run('skyHi', 6, 0), ...run('skyLo', 7, 1)], { k: 8, stretch: 5, x0, x1: x0 + w });
  stars(g, x0, y0, w, 50, { density: 0.02, k: 9, phase: ph * 8 });
  for (let x = x0; x < x0 + w; x++) {
    const top = y0 + 100 + Math.round(noise(x / 9, 0, 1, 3) * 6);
    for (let y = top; y < y0 + 114; y++) put(g, x, y, X('hazeDusk', 3));
  }
  for (let y = y0 + 114; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) put(g, x, y, C('sea', 4 + (clumps(x / 6 + ph * 4, y, 3) > 0.6 ? 1 : 0)));
  const sub = tgrid(SCREEN_W, SCREEN_H);
  const glows = farShip(sub, x0 - 4, y0 + 126, 0.19, true, ph);
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const c = at(sub, x, y);
      if (c) put(g, x, y, c);
    }
  // Leading in diamonds over the glass, and the casement's frame.
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const u = (x - x0 + (y - y0) * 0.6) % 12;
      const v = (x - x0 - (y - y0) * 0.6 + 400) % 12;
      if (u < 1 || v < 1) put(g, x, y, C('iron', 5));
    }
  for (let y = y0 - 6; y < y0 + h + 6; y++)
    for (let x = x0 - 6; x < x0 + w + 6; x++) {
      const inside = x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
      if (inside) continue;
      const mull = false;
      // The stone reveal: its right inner face turned to the fire is lit.
      const t = x >= x0 + w ? 1 : x < x0 ? 4 : y < y0 ? 4 : 2;
      put(g, x, y, C('stone', mull ? 3 : t));
    }
  for (let y = y0; y < y0 + h; y++) {
    put(g, x0 + w / 2, y, C('wood', 4));
    put(g, x0 + w / 2 + 1, y, C('wood', 5));
  }
  beamH(g, x0 - 10, y0 + h + 6, w + 20, 7, 4);
  return glows.map((gl) => ({ ...gl, r: gl.r * 0.6 }));
}

function fire(g: TGrid, t: number): void {
  const ph = (t % LOOP) / LOOP;
  // Firedogs and logs.
  for (const fx of [118, 270]) {
    for (let y = FLOOR - 26; y < FLOOR; y++) {
      put(g, fx, y, C('iron', 3));
      put(g, fx + 1, y, C('iron', 5));
    }
    for (let x = -3; x <= 4; x++) put(g, fx + x, FLOOR - 1, C('iron', 4));
    for (let x = -1; x <= 2; x++) put(g, fx + x, FLOOR - 28, C('gold', x < 1 ? 1 : 3));
  }
  const log = (x0: number, y0: number, x1: number, y1: number, r: number) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const px = x0 + ((x1 - x0) * i) / n;
      const py = y0 + ((y1 - y0) * i) / n;
      for (let j = -r; j <= r; j++) {
        const glow = j < 0 ? 0 : 1;
        const ember = hash(Math.round(px / 3), j, 5) < 0.25;
        put(g, px, py + j, j === -r ? C('bark', 2) : ember && j > 0 ? X('ember', 2 + glow) : C('bark', clamp(3 + j / r, 1, 5)));
      }
      put(g, px, py + r + 1, C('bark', 6));
    }
  };
  // The back log, behind the flames.
  log(124, FLOOR - 10, 268, FLOOR - 30, 6);
  // Flames: a hot body over the logs, and tongues of uneven width and height
  // rising from it, leaning and curling with time; hotter wins where they overlap.
  const heatAt = new Float32Array(SCREEN_W * SCREEN_H);
  const add = (px: number, py: number, h: number) => {
    px = Math.round(px);
    py = Math.round(py);
    if (px < 0 || py < 0 || px >= SCREEN_W || py >= SCREEN_H) return;
    const i = py * SCREEN_W + px;
    if (h > (heatAt[i] as number)) heatAt[i] = h;
  };
  const top = FLOOR - 20;
  for (let x = 104; x <= 286; x++) {
    const fx = (x - 195) / 92;
    const hb = 26 * Math.max(0, 1 - fx * fx) + 4;
    for (let y = 0; y < hb; y++) add(x, top - y + 6, 0.95 - (y / hb) * 0.35 - Math.abs(fx) * 0.2);
  }
  const TONGUES = [
    [118, 9, 38],
    [134, 13, 62],
    [152, 11, 84],
    [168, 16, 108],
    [186, 14, 122],
    [204, 17, 116],
    [222, 12, 96],
    [238, 15, 78],
    [256, 10, 58],
    [272, 9, 40],
    [178, 8, 70],
    [214, 8, 66],
  ] as const;
  TONGUES.forEach(([bx, wb, h0], i) => {
    const hh =
      h0 *
      (0.82 + 0.22 * Math.sin(ph * Math.PI * 2 * (2 + (i % 3)) + i * 1.7) + 0.06 * Math.sin(ph * Math.PI * 2 * 5 + i));
    for (let y = 0; y < hh; y++) {
      const f = y / hh;
      const sway = Math.sin(f * 3.4 + ph * Math.PI * 2 * 3 + i * 0.9) * f * f * 9 + (bx - 195) * f * 0.12;
      const half = wb * Math.pow(1 - f, 0.85) * (1 + 0.18 * Math.sin(f * 7 + i));
      for (let x = Math.round(-half); x <= Math.round(half); x++) {
        const across = Math.abs(x) / Math.max(1, half);
        add(bx + x + sway, top - y, 1 - f * 0.85 - across * 0.45);
      }
    }
    // Now and then a tongue's tip breaks off and rises on its own.
    const lift = (ph * (3 + (i % 2)) + i * 0.37) % 1;
    if (lift < 0.45) {
      const ty = top - hh - 6 - lift * 30;
      const tx = bx + Math.sin(lift * 6 + i) * 6;
      for (let y = -3; y <= 3; y++)
        for (let x = -2; x <= 2; x++) if (x * x + y * y * 0.6 <= 4) add(tx + x, ty + y, 0.18 - lift * 0.2);
    }
  });
  for (let y = 0; y < SCREEN_H; y++)
    for (let x = 0; x < SCREEN_W; x++) {
      const h = heatAt[y * SCREEN_W + x] as number;
      if (h <= 0) continue;
      const step = h > 0.82 ? 0 : h > 0.66 ? 1 : h > 0.46 ? 2 : h > 0.26 ? 3 : h > 0.1 ? 4 : 5;
      put(g, x, y, X('fire', step));
    }
  // The front log, across the flames' foot, its top rimmed by the fire behind it.
  log(108, FLOOR - 14, 284, FLOOR - 8, 7);
  for (let x = 108; x <= 284; x++) {
    const y = Math.round(FLOOR - 14 + ((x - 108) / 176) * 6) - 7;
    put(g, x, y, X('ember', hash(x >> 2, 3, 2) < 0.5 ? 0 : 1));
  }
  // Embers in the bed.
  for (let x = 100; x < 292; x++)
    for (let y = FLOOR - 5; y < FLOOR; y++)
      if (hash(x, y, Math.floor(ph * 6)) < 0.5) put(g, x, y, X('ember', 1 + Math.floor(hash(x, y, 7) * 4)));
  // Sparks.
  for (let i = 0; i < 7; i++) {
    const f = (ph * 2 + i / 7) % 1;
    const sx = 150 + hash(i, 2, 9) * 90 + Math.sin(f * 9 + i) * 8;
    const sy = FLOOR - 90 - f * 100;
    if (sy > 468) put(g, sx, sy, X('fire', f < 0.5 ? 1 : 3));
  }
}

/**
 * The flagged floor in perspective: slabs in courses that deepen toward us,
 * their joints running back to a point at the fire, each slab lit on its far
 * and left edges like the town's flagstones.
 */
function floor(g: TGrid): void {
  const hy = 590;
  const A = 1400;
  for (let y = FLOOR; y < SCREEN_H; y++) {
    const r = A / (y - hy);
    const row = Math.floor(r);
    const rowNext = Math.floor(A / (y + 1 - hy));
    const rowPrev = Math.floor(A / (y - 1 - hy));
    for (let x = 0; x < SCREEN_W; x++) {
      const u = ((x - FIRE.x) / (y - hy)) * 1.4 + (row % 2) * 0.5;
      const col = Math.floor(u);
      const ul = Math.floor(((x - 1 - FIRE.x) / (y - hy)) * 1.4 + (row % 2) * 0.5);
      const tone = 2 + (hash(col, row, 4) < 0.25 ? 1 : 0) - (hash(col, row, 5) < 0.15 ? 1 : 0);
      let t = tone;
      if (rowNext !== row) t = 5;
      else if (ul !== col) t = 5;
      else if (rowPrev !== row) t = tone - 1;
      else if (Math.floor(((x - 2 - FIRE.x) / (y - hy)) * 1.4 + (row % 2) * 0.5) !== col) t = tone - 1;
      put(g, x, y, C('cobble', clamp(t, 1, 5)));
    }
  }
}

function backdrop(): TGrid {
  const g = tgrid(SCREEN_W, SCREEN_H);
  render(g, { x: 0, y: 0, w: SCREEN_W, h: FLOOR }, FLOOR, 7);
  // Indoors the render is smoke-stained and even: fold its patches a step toward the middle.
  for (let i = 0; i < g.d.length; i++) {
    const c = g.d[i] as number;
    if (c && (c >> 3) === (C('plaster', 0) >> 3) && (c & 7) === 1) g.d[i] = C('plaster', 2);
  }
  // Corner posts and the ceiling beam either side of the chimney.
  beamV(g, 0, 0, 8, FLOOR, 3);
  beamV(g, 382, 0, 8, FLOOR, 4);
  beamH(g, 0, 214, SCREEN_W, 20, 5);
  for (let y = 0; y < 40; y++) for (let x = 0; x < SCREEN_W; x++) put(g, x, y, C('wood', (x >> 4) % 2 ? 5 : 4));
  beamH(g, 0, 40, SCREEN_W, 14, 6);
  // The chimney breast, cut stone, up through the ceiling.
  ashlar(g, { x: 58, y: 0, w: 274, h: 440 }, 9, 11);
  // Mantel shelf and the great oak lintel (the bressummer).
  beamH(g, 50, 430, 290, 8, 2);
  beamH(g, 64, 438, 262, 26, 3);
  // The opening: soot-black back, firebricks, stone cheeks.
  for (let y = 464; y < FLOOR; y++)
    for (let x = 64; x < 326; x++) {
      const cheek = x < 80 || x >= 310;
      if (cheek) put(g, x, y, C('stone', x < 80 ? (x < 70 ? 2 : 3) : x < 316 ? 4 : 3));
      else {
        const back = y < 500 ? 0 : Math.floor((y - 500) / 34);
        put(g, x, y, C('shade', clamp(2 - back * 0.5 + (hash(x >> 3, y >> 2, 4) < 0.3 ? 1 : 0), 0, 4)));
        if (y > 500 && ((y - 500) % 9 === 0 || (x + Math.floor((y - 500) / 9) * 7) % 14 === 0)) put(g, x, y, C('shade', 4));
      }
    }
  floor(g);
  // The hearthstone, a step proud of the floor.
  for (let y = FLOOR; y < FLOOR + 16; y++)
    for (let x = 52; x < 338; x++)
      put(g, x, y, C('stone', y === FLOOR ? 1 : y >= FLOOR + 14 ? 5 : 2 + (hash(x >> 4, 1, 3) < 0.3 ? 1 : 0)));
  shieldAndSwords(g, 195, 270);
  helm(g, 300, 430);
  // A tankard on the mantel.
  for (let y = 0; y < 14; y++)
    for (let x = 0; x < 10; x++)
      put(g, 92 + x, 416 + y, C('iron', clamp(cyl((x - 4.5) / 5, 2, 1.5) + (y === 0 || y === 10 ? -1 : 0), 0, 5)));
  for (let y = 2; y < 10; y++) put(g, 103, 416 + y, C('iron', 3));
  // The peg rail, the cloak.
  beamH(g, 336, 286, 46, 5, 8);
  cloak(g, 360, 300);
  boots(g, 334, FLOOR + 44);
  rug(g);
  const b = outlined(barrel().grid);
  stamp(g, b, 340, 818 - b.h);
  stamp(g, outlined(barrel().grid), 312, 830 - b.h);
  const c = outlined(crate().grid);
  stamp(g, c, 358, 830 - c.h);
  return g;
}

let base: TGrid | null = null;

/** The carved board the name is cut into, hung on chains from the rafters. */
export function board(g: TGrid, by = 70): void {
  const L = lockupUncial({ xh: 30, treatment: 'carved', drop: 0, rim: undefined });
  const pad = 14;
  const bw = L.g.w + pad * 2;
  const bh = L.g.h + pad * 2 - 6;
  const bx = Math.round((SCREEN_W - bw) / 2);
  for (const cx of [bx + 30, bx + bw - 30])
    for (let y = 0; y < by; y++) put(g, cx, y, C('iron', y % 4 < 2 ? 2 : 4));
  beamH(g, bx, by, bw, bh, 13, undefined, 'wood');
  // Bevelled edges and a gilt fillet inside.
  for (let x = bx; x < bx + bw; x++) {
    put(g, x, by, C('wood', 1));
    put(g, x, by + bh - 1, C('wood', 5));
    put(g, x, by + bh, C('wood', 6));
  }
  for (let y = by; y < by + bh; y++) {
    put(g, bx, y, C('wood', 1));
    put(g, bx + bw - 1, y, C('wood', 5));
  }
  for (let x = bx + 5; x < bx + bw - 5; x++) {
    put(g, x, by + 5, X('gilt', 4));
    put(g, x, by + bh - 6, X('gilt', 2));
  }
  for (let y = by + 5; y < by + bh - 5; y++) {
    put(g, bx + 5, y, X('gilt', 4));
    put(g, bx + bw - 6, y, X('gilt', 2));
  }
  stampF(g, L, bx + pad, by + pad - 3);
}

export function drawB(t: number): Frame {
  base ??= backdrop();
  const g = tgrid(SCREEN_W, SCREEN_H);
  g.d.set(base.d);
  const ph = (t % LOOP) / LOOP;
  const winGlows = window_(g, ph);
  board(g);
  fire(g, t);
  // Candle on the mantel.
  for (let y = 0; y < 12; y++) {
    put(g, 74, 418 + y, C('sail', 1));
    put(g, 75, 418 + y, C('sail', 3));
  }
  const fl = Math.round(Math.sin(ph * Math.PI * 6) * 0.6);
  put(g, 74 + fl, 414, X('fire', 1));
  put(g, 74, 415, X('fire', 0));
  put(g, 74, 416, X('fire', 2));
  put(g, 74, 417, C('felt', 5));
  // A wall lantern on its bracket by the peg rail.
  for (let i = 0; i < 10; i++) put(g, LANTERN.x + 4 - i, LANTERN.y - 12, C('iron', 3));
  for (let j = -12; j < -8; j++) put(g, LANTERN.x - 5, LANTERN.y + j, C('iron', 4));
  for (let j = 0; j < 12; j++)
    for (let i = -4; i <= 4; i++) {
      const frame = Math.abs(i) === 4 || j === 0 || j === 11 || i === 0;
      put(g, LANTERN.x + i, LANTERN.y - 9 + j, frame ? C('iron', i < 0 ? 2 : 4) : C('lamp', j < 5 ? 0 : 1));
    }
  for (let i = -5; i <= 5; i++) put(g, LANTERN.x + i, LANTERN.y - 10, C('iron', i < 0 ? 1 : 3));
  // Firelight: every lit-able step darkens with distance from the fire, in clumped bands.
  for (let y = 0; y < SCREEN_H; y++)
    for (let x = 0; x < SCREEN_W; x++) {
      const c = at(g, x, y);
      if (!c) continue;
      const m = xmatOf(c);
      if (m && LIGHTS.includes(m) && m !== 'gilt') continue;
      const d = Math.hypot((x - FIRE.x) / 1.1, (y - FIRE.y) * (y < FIRE.y ? 0.8 : 1.25));
      const jit = (clumps(x / 3, y / 3, 21) - 0.5) * 0.55;
      let n = clamp(d / 84 + jit - 0.9, 0, 4);
      // The wall lantern by the cloak lights its own corner a little.
      const dl = Math.hypot(x - LANTERN.x, (y - LANTERN.y) * 0.8);
      n = Math.min(n, clamp(dl / 24 + jit + 1.1, 0, 4));
      if (m === 'gilt') n = Math.min(1, n);
      if (n > 0) put(g, x, y, (c & ~7) | Math.min(6, (c & 7) + n));
    }
  const breath = Math.sin(ph * Math.PI * 2 * 3) * 0.04 + Math.sin(ph * Math.PI * 2 * 7) * 0.02;
  const glows: BandGlow[] = [
    { x: FIRE.x, y: FIRE.y - 20, r: 270 * (1 + breath), strength: 0.2, bands: 5, colour: [255, 130, 50] },
    { x: FIRE.x, y: FIRE.y, r: 120 * (1 + breath * 2), strength: 0.22, bands: 3, colour: [255, 170, 70] },
    { x: 74, y: 415, r: 22, strength: 0.3, bands: 2 },
    { x: LANTERN.x, y: LANTERN.y - 4, r: 40, strength: 0.2, bands: 3 },
    ...winGlows,
  ];
  return { g, glows };
}

export const TITLE_B: Title = {
  id: 'B',
  name: 'The hearth',
  // Night indoors: the town's dusk palette, warmed, every light kept as it is.
  pal: xpal('dusk', (c, m) => (LIGHTS.includes(m) ? c : [Math.min(255, c[0] * 1.04), c[1] * 0.95, c[2] * 0.9])),
  draw: drawB,
  ui: 'tap',
  uiTop: 744,
  animated: true,
  loop: LOOP,
};
