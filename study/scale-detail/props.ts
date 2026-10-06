/**
 * Art study (not shipped): props and grounds at `u` pixels a metre, kin to
 * the approved ones in src/art/scenery.ts (barrel, crate, street lamp, pine,
 * grass, cobbles) but lit as solids: a barrel is a cylinder, a crate a box
 * with a lit top, a lamp post a lit rod, each cobble a rounded stone.
 */
import { at, cell, darker, hash, put, selOut, tgrid, type TGrid } from './engine';
import { bayer, fbm, softRound } from './texture';

const C = cell;
const LX = -0.55;
const LZ = 0.78;
/** Step for a cylinder's surface at -1 (left edge) .. 1 (right edge), lit from the left. */
const cyl = (nx: number, base: number, k: number): number => {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
  const lam = (nx * LX + nz * LZ) / Math.hypot(LX, LZ);
  return base + (k * (0.82 - lam)) / 0.5;
};

export function barrel(u: number): TGrid {
  const bw = Math.round(0.62 * u);
  const bh = Math.round(0.9 * u);
  const ry = Math.max(2, Math.round(bw * 0.2));
  const g = tgrid(bw + 2, bh + ry + 2);
  const cx = (bw - 1) / 2;
  const hw = (y: number) => (bw / 2) * (0.86 + 0.14 * Math.sin((Math.PI * y) / bh));
  const staveW = Math.max(2, Math.round(0.1 * u));
  const hoopH = Math.max(1, Math.round(0.05 * u));
  const hoops = [0.1, 0.3, 0.7, 0.9].map((f) => Math.round(ry + f * bh));
  for (let y = ry; y < bh + ry; y++) {
    const w = hw(y - ry);
    for (let x = Math.ceil(cx - w); x <= Math.floor(cx + w); x++) {
      const nx = (x - cx) / (w + 0.5);
      let t = cyl(nx, 2, 1.25);
      const ang = Math.asin(Math.max(-1, Math.min(1, nx))) * (bw / 2);
      const stave = Math.round(ang + 100) % staveW === 0;
      let mat: 'wood' | 'iron' = 'wood';
      const hoop = hoops.find((hy) => y >= hy && y < hy + hoopH + 1);
      if (hoop !== undefined) {
        mat = 'iron';
        t = cyl(nx, 2, 1.3) + (y === hoop ? -1 : y === hoop + hoopH ? 1.5 : 0);
      } else if (stave && Math.abs(nx) < 0.92) t += 1;
      else if (hash(x, Math.floor(y / 4), 9) < 0.12) t += 1;
      if (y > bh + ry - 3) t += 0.7;
      put(
        g,
        x + 1,
        y + 1,
        C(mat, Math.max(mat === 'iron' ? 0 : 1, Math.min(5, softRound(t, x, y, 0.1)))),
      );
    }
  }
  // The lid, seen from a little above: an ellipse of boards, a rim, a bung.
  const rx = hw(0);
  for (let y = 0; y <= 2 * ry; y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const a = (x - cx) / (rx + 0.3);
      const b = (y - ry) / (ry + 0.3);
      const d = a * a + b * b;
      if (d > 1) continue;
      let t = 1;
      if (d > 0.62) t = b < 0 ? 2 : 4;
      else if ((y + 100) % Math.max(2, Math.round(ry * 0.8)) === 0) t = 2;
      if (a > 0.35 && d <= 0.62) t += 1;
      put(g, x + 1, y + 1, C('wood', t));
    }
  if (u >= 20) put(g, Math.round(cx + rx * 0.35) + 1, ry + 1, C('wood', 4));
  return selOut(g);
}

export function crate(u: number): TGrid {
  const s = Math.round(0.72 * u);
  const top = Math.max(3, Math.round(s * 0.3));
  const fw = Math.max(2, Math.round(0.11 * u));
  const g = tgrid(s, s + top);
  // Top face: lit boards running across.
  const bw = Math.max(2, Math.round(0.13 * u));
  for (let y = 0; y < top; y++)
    for (let x = 0; x < s; x++) {
      let t = 1;
      if (y % bw === bw - 1) t = 3;
      if (x === s - 1) t = 2;
      if (y === 0 || x === 0) t = 0;
      put(g, x, y, C('wood', t));
    }
  // Front face: a frame of battens, boards behind, and a diagonal brace.
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const yy = y + top;
      const frame = x < fw || y < fw || x >= s - fw || y >= s - fw;
      let t: number;
      if (frame) {
        t = 2;
        if (x === 0 || (y === 0 && x < s - 1)) t = 1;
        if (x === s - 1 || y === s - 1) t = 5;
        else if (x === s - fw || y === s - fw) t = 3;
        else if (x === fw - 1 || y === fw - 1) t = 3;
      } else {
        t = 3;
        if ((y - fw) % bw === bw - 1) t = 5;
        else if ((y - fw) % bw === 0) t = 2;
        if (x === fw || y === fw) t = 5;
      }
      put(g, x, yy, C('wood', t));
    }
  // The brace, bottom left to top right, over the boards.
  const n = s - 2 * fw;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < fw; j++) {
      const x = fw + i;
      const y = top + s - fw - 1 - i + j - Math.floor(fw / 2);
      if (y < top + fw || y >= top + s - fw) continue;
      put(g, x, y, C('wood', j === 0 ? 1 : j === fw - 1 ? 4 : 2));
    }
  // Nails.
  if (u >= 18)
    for (const [x, y] of [
      [Math.floor(fw / 2), top + Math.floor(fw / 2)],
      [s - 1 - Math.floor(fw / 2), top + Math.floor(fw / 2)],
      [Math.floor(fw / 2), top + s - 1 - Math.floor(fw / 2)],
      [s - 1 - Math.floor(fw / 2), top + s - 1 - Math.floor(fw / 2)],
    ] as const)
      put(g, x, y, C('iron', 1));
  return selOut(g);
}

/** A street lamp on an iron post, glass panes in a hooded lantern. */
export function lampPost(u: number): TGrid {
  const h = Math.round(3.1 * u);
  const lw = Math.max(5, Math.round(0.44 * u)) | 1;
  const g = tgrid(lw + 4, h + 2);
  const cx = Math.floor((lw + 4) / 2);
  const pw = Math.max(2, Math.round(0.13 * u));
  const px0 = cx - Math.floor(pw / 2);
  const rod = (x: number, y: number, w: number, k = 0) => {
    for (let i = 0; i < w; i++) {
      const nx = ((i + 0.5) / w) * 2 - 1;
      put(g, x + i, y, C('iron', Math.max(0, Math.min(5, Math.round(cyl(nx, 2.2, 1.5) + k)))));
    }
  };
  const lanH = Math.max(6, Math.round(0.62 * u));
  const capH = Math.max(3, Math.round(0.22 * u));
  const lanTop = capH + 1;
  for (let y = lanTop + lanH; y < h; y++) rod(px0, y, pw);
  // Base: a stepped foot.
  const fh = Math.max(2, Math.round(0.28 * u));
  for (let j = 0; j < fh; j++) {
    const w = pw + 2 + Math.round((j / fh) * Math.round(0.24 * u));
    rod(cx - Math.floor(w / 2), h - fh + j, w, j === 0 ? -0.5 : 0);
  }
  // A collar part way up.
  const col = Math.max(1, Math.round(0.06 * u));
  for (let j = 0; j < col; j++) rod(px0 - 1, Math.round(h * 0.55) + j, pw + 2, -0.3);
  // Lantern: glass between iron bars, a tray below, a hood and a finial above.
  const lx = cx - Math.floor(lw / 2);
  for (let y = lanTop; y < lanTop + lanH; y++) {
    const taper = y > lanTop + lanH * 0.75 ? 1 : 0;
    for (let i = taper; i < lw - taper; i++) {
      const bar = i === taper || i === lw - 1 - taper || i === Math.floor(lw / 2);
      let c;
      if (bar) c = C('iron', i === taper ? 2 : 4);
      else {
        const left = i < lw / 2;
        let t = left ? 1 : 2;
        if (y < lanTop + 2) t += 1;
        if (left && i === taper + 1 && y < lanTop + lanH * 0.5) t = 0;
        c = C('lamp', t);
      }
      put(g, lx + i, y, c);
    }
  }
  for (let i = -1; i <= lw; i++) put(g, lx + i, lanTop + lanH, C('iron', i < 1 ? 2 : 4));
  for (let j = 0; j < capH; j++) {
    const w = Math.max(1, Math.round(((j + 1) / capH) * (lw + 2)));
    for (let i = 0; i < w; i++) {
      const nx = ((i + 0.5) / w) * 2 - 1;
      put(g, cx - Math.floor(w / 2) + i, lanTop - capH + j, C('iron', Math.round(cyl(nx, 2, 1.4))));
    }
  }
  put(g, cx, 0, C('iron', 1));
  return selOut(g);
}

/** A pine: tiers of needles, lit on the left, each tier shading the top of the one below. */
export function pine(u: number, k: number): TGrid {
  const H = Math.round(6.2 * u);
  const W = Math.round(3.0 * u) | 1;
  const g = tgrid(W, H);
  const cx = (W - 1) / 2;
  const trunkH = Math.round(0.7 * u);
  const crownH = H - trunkH;
  const tiers = 6;
  const tierH = crownH / (tiers - 0.6);
  const tw = Math.max(2, Math.round(0.26 * u));
  for (let y = H - trunkH - Math.round(tierH * 0.3); y < H; y++)
    for (let i = 0; i < tw; i++) {
      const nx = ((i + 0.5) / tw) * 2 - 1;
      put(g, Math.round(cx - tw / 2) + i, y, C('wood', Math.round(cyl(nx, 3, 1.2))));
    }
  for (let tIdx = 0; tIdx < tiers; tIdx++) {
    const top = Math.round(tIdx * tierH * 0.86);
    const hgt = Math.round(tierH * 1.35);
    const halfW = (W / 2 - 1) * (0.28 + (0.72 * (tIdx + 1)) / tiers);
    for (let j = 0; j < hgt; j++) {
      const y = top + j;
      if (y >= H - trunkH + 1) break;
      const f = (j + 1) / hgt;
      const hwRow = halfW * Math.pow(f, 0.85);
      for (let x = Math.floor(cx - hwRow) - 1; x <= Math.ceil(cx + hwRow) + 1; x++) {
        const dx = (x - cx) / Math.max(1, hwRow);
        // A ragged edge of needle clumps, and drooping tips along the bottom.
        const rag = hash(x, y, k) * 0.35 + (j > hgt - 3 ? hash(x, tIdx, k + 1) * 0.6 : 0);
        if (Math.abs(dx) > 1 - rag * 0.3 && Math.abs(dx) > 0.55) continue;
        if (j === hgt - 1 && (x + tIdx) % 3 === 0) continue;
        let t = 2 + dx * 1.5;
        if (j < hgt * 0.25 && tIdx > 0) t += 0.6;
        t += (1 - f) * -0.4;
        const clump = fbm(x, y, Math.max(2, u * 0.18), k + 2);
        t += (clump - 0.5) * 2.2;
        put(g, x, y, C('pine', Math.max(1, Math.min(5, softRound(t, x, y, 0.15)))));
      }
    }
  }
  // Shadow under each tier on the one below.
  for (let tIdx = 1; tIdx < tiers; tIdx++) {
    const y0 = Math.round(tIdx * tierH * 0.86);
    for (let x = 0; x < W; x++)
      for (let j = 0; j < Math.max(1, Math.round(u * 0.06)); j++) {
        const c = at(g, x, y0 + j);
        if (c && x > cx - W * 0.3) put(g, x, y0 + j, darker(c, 1));
      }
  }
  return selOut(g);
}

// ---------------------------------------------------------------- ground

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Grass: broad patches of light and shade, tufts whose tips catch the sun, a few flowers. */
export function grass(g: TGrid, b: Box, u: number, k: number): void {
  for (let y = b.y; y < b.y + b.h; y++)
    for (let x = b.x; x < b.x + b.w; x++) {
      const t = 2.1 + (fbm(x, y, u * 2.2, k) - 0.5) * 1.25;
      put(g, x, y, C('grass', Math.max(1, Math.min(4, Math.round(t)))));
    }
  const bh = Math.max(2, Math.round(0.11 * u));
  const n = Math.round((b.w * b.h) / (u * u * 0.05));
  for (let i = 0; i < n; i++) {
    const x = b.x + Math.floor(hash(i, 1, k) * b.w);
    const y = b.y + Math.floor(hash(i, 2, k) * b.h);
    const base = at(g, x, y);
    if (!base) continue;
    const t0 = base & 7;
    for (const dx of [-1, 0, 1]) {
      const hh = bh - (dx === 0 ? 0 : 1);
      for (let j = 0; j < hh; j++) {
        const xx = x + dx + (dx !== 0 && j > hh / 2 ? dx : 0);
        put(
          g,
          xx,
          y - j,
          C('grass', j === hh - 1 ? Math.max(1, t0 - 1) : j === 0 ? Math.min(5, t0 + 1) : t0),
        );
      }
    }
  }
  const nf = Math.round((b.w * b.h) / (u * u * 1.6));
  for (let i = 0; i < nf; i++) {
    const x = b.x + Math.floor(hash(i, 5, k) * b.w);
    const y = b.y + Math.floor(hash(i, 6, k) * b.h);
    const c = hash(i, 7, k) < 0.6 ? C('flower', 0) : C('flower', 1);
    put(g, x, y, c);
    if (u >= 26) {
      put(g, x + 1, y, c);
      put(g, x, y + 1, C('grass', 4));
    }
  }
}

/** Cobbles: rounded stones in offset rows, lit top left, dark joints, a little grass in the cracks. */
export function cobbles(g: TGrid, b: Box, u: number, k: number): void {
  const sh0 = Math.max(3, Math.round(0.24 * u));
  const sw = Math.max(4, Math.round(0.3 * u));
  // Rows of slightly different heights, so the street does not read as brickwork.
  const rows: [number, number][] = [];
  for (let y = b.y, r = 0; y < b.y + b.h; r++) {
    const h = sh0 + (hash(r, 9, k) < 0.35 ? 1 : 0) - (hash(r, 8, k) < 0.2 ? 1 : 0);
    rows.push([y, h]);
    y += h;
  }
  rows.forEach(([y0, sh], row) => {
    let edge = b.x - Math.floor(hash(row, 0, k) * sw);
    let idx = 0;
    let w = sw + Math.round((hash(row, idx, k + 1) - 0.5) * sw * 0.7);
    for (let x = b.x; x < b.x + b.w; x++) {
      while (x >= edge + w) {
        edge += w;
        idx++;
        w = sw + Math.round((hash(row, idx, k + 1) - 0.5) * sw * 0.7);
      }
      const px = x - edge;
      const tone =
        2 + (hash(row, idx, k + 2) < 0.22 ? 1 : 0) - (hash(row, idx, k + 3) < 0.15 ? 1 : 0);
      // A stone is set a pixel up or down from its neighbours.
      const lift = hash(row, idx, k + 6) < 0.3 ? 1 : 0;
      for (let py = 0; py < sh; py++) {
        const y = y0 + py;
        if (y >= b.y + b.h) break;
        // Each stone a low dome in its cell: well rounded at the corners, lit top left.
        const nx = (px - (w - 2) / 2) / ((w - 1) / 2);
        const ny = (py + lift * 0.5 - (sh - 2) / 2) / ((sh - 1) / 2);
        const r = Math.abs(nx) ** 2.4 + Math.abs(ny) ** 2.4;
        const gap = py === sh - 1 || px === w - 1 || r > 1.0;
        let t = gap ? 5 : tone + Math.round((nx * 0.8 + ny * 1.1) * 1.0);
        if (!gap && r < 0.25 && nx < 0 && ny < 0) t = Math.min(t, tone - 1);
        if (!gap && fbm(x, y, u * 3, k + 4) < 0.22) t += 1;
        let c = C('cobble', Math.max(1, Math.min(5, t)));
        if (gap && hash(x, y, k + 5) < 0.05) c = C('grass', 3);
        put(g, x, y, c);
      }
    }
  });
}

/** A kerb of long dressed stones between the street and the grass. */
export function kerb(g: TGrid, x0: number, y: number, w: number, u: number, k: number): number {
  const h = Math.max(3, Math.round(0.28 * u));
  const top = Math.max(1, Math.round(h * 0.4));
  let x = x0 - Math.floor(hash(k, 1) * u);
  let i = 0;
  while (x < x0 + w) {
    const len = Math.round(u * (0.8 + hash(i, k) * 0.5));
    for (let j = 0; j < h; j++)
      for (let a = 0; a < len; a++) {
        let t = j < top ? 1 : 3;
        if (j === 0) t = 0;
        if (a === len - 1) t = 5;
        else if (a === 0) t = j < top ? 0 : 2;
        if (j === h - 1) t = 5;
        if (hash(x + a, y + j, k) < 0.06) t += 1;
        put(g, x + a, y + j, C('stone', Math.min(5, t)));
      }
    x += len;
    i++;
  }
  return h;
}

/** Darkens the ground in an ellipse: a soft shadow with a darker core where it touches. */
export function shadowOval(g: TGrid, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const a = (x + 0.5 - cx) / rx;
      const b = (y + 0.5 - cy) / ry;
      const d = a * a + b * b;
      if (d > 1) continue;
      const n = d < 0.45 ? 2 : d > 0.85 && bayer(x, y) > 0.5 ? 0 : 1;
      const c = at(g, x, y);
      if (c && n) put(g, x, y, darker(c, n));
    }
}

/** A low post-and-rail fence along a row, posts every two metres. */
export function fence(g: TGrid, x0: number, y: number, w: number, u: number): void {
  const ph = Math.round(1.0 * u);
  const pw = Math.max(2, Math.round(0.14 * u));
  const rh = Math.max(1, Math.round(0.08 * u));
  const step = Math.round(2.0 * u);
  for (const ry of [Math.round(ph * 0.25), Math.round(ph * 0.6)])
    for (let x = x0; x < x0 + w; x++)
      for (let j = 0; j < rh + 1; j++)
        put(g, x, y - ph + ry + j, C('wood', j === 0 ? 1 : j === rh ? 5 : 3));
  for (let x = x0 - (x0 % step); x < x0 + w; x += step) {
    for (let j = 0; j < ph; j++)
      for (let i = 0; i < pw; i++) {
        let t = i === 0 ? 1 : i === pw - 1 ? 4 : 2;
        if (j === 0) t = 1;
        put(g, x + i, y - ph + j, C('wood', t));
      }
    for (let j = 0; j < pw; j++) put(g, x + pw + j, y - 1, darker(at(g, x + pw + j, y - 1), 1));
  }
}
