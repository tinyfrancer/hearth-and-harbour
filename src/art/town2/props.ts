/**
 * The C-scale town's props, each to scale with a 64-pixel person and lit as
 * a solid. The barrel (a cylinder with staves and hoops), the crate (a box
 * with a lit top and a braced front) and the street lamp (a lit rod and a
 * hooded lantern) are taken from the approved scale study (study/scale-detail/
 * props.ts); the rest are the current town's props (src/art/scenery.ts and
 * harbour.ts: the well, notice board, signpost, anvil, bucket, net, crab and
 * buoy, the stall, smoke and gulls) drawn fresh at this size in the same way.
 */
import type { Glow } from '../raster';
import {
  at,
  box,
  cell,
  dim,
  hash,
  isMat,
  oval,
  put,
  solid,
  tgrid,
  type Cell,
  type Picture2,
  type TGrid,
} from './cells';
import type { Mat } from './ramps';
import { m } from './scale';
import { bayer, clamp, cyl, fbm, softRound } from './texture';
import { beamH, beamV, tileRoof } from './walls';

const C = cell;

/** A prop's drawing and the lights in it, before its outline. */
export interface Drawn {
  readonly grid: TGrid;
  readonly glows: readonly Glow[];
}
const plain = (grid: TGrid, glows: readonly Glow[] = []): Drawn => ({ grid, glows });

// ------------------------------------------------------------------ the study's three

export function barrel(): Drawn {
  const bw = m(0.62);
  const bh = m(0.9);
  const ry = Math.max(3, Math.round(bw * 0.2));
  const g = tgrid(bw + 2, bh + ry + 2);
  const cx = (bw - 1) / 2;
  const hw = (y: number) => (bw / 2) * (0.86 + 0.14 * Math.sin((Math.PI * y) / bh));
  const staveW = Math.max(3, m(0.1));
  const hoopH = Math.max(2, m(0.05));
  const hoops = [0.1, 0.3, 0.7, 0.9].map((f) => Math.round(ry + f * bh));
  for (let y = ry; y < bh + ry; y++) {
    const w = hw(y - ry);
    for (let x = Math.ceil(cx - w); x <= Math.floor(cx + w); x++) {
      const nx = (x - cx) / (w + 0.5);
      let t = cyl(nx, 2, 1.25);
      const ang = Math.asin(Math.max(-1, Math.min(1, nx))) * (bw / 2);
      const stave = Math.round(ang + 100) % staveW === 0;
      let mat: Mat = 'wood';
      const hoop = hoops.find((hy) => y >= hy && y < hy + hoopH + 1);
      if (hoop !== undefined) {
        mat = 'iron';
        t = cyl(nx, 2, 1.3) + (y === hoop ? -1 : y === hoop + hoopH ? 1.5 : 0);
      } else if (stave && Math.abs(nx) < 0.92) t += 1;
      else if (hash(x, Math.floor(y / 4), 9) < 0.12) t += 1;
      if (y > bh + ry - 3) t += 0.7;
      put(g, x + 1, y + 1, C(mat, clamp(softRound(t, x, y, 0.1), mat === 'iron' ? 0 : 1, 5)));
    }
  }
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
  put(g, Math.round(cx + rx * 0.35) + 1, ry + 1, C('wood', 4));
  return plain(g);
}

export function crate(): Drawn {
  const s = m(0.72);
  const top = Math.max(4, Math.round(s * 0.3));
  const fw = Math.max(3, m(0.11));
  const g = tgrid(s, s + top);
  const bw = Math.max(3, m(0.13));
  for (let y = 0; y < top; y++)
    for (let x = 0; x < s; x++) {
      let t = 1;
      if (y % bw === bw - 1) t = 3;
      if (x === s - 1) t = 2;
      if (y === 0 || x === 0) t = 0;
      put(g, x, y, C('wood', t));
    }
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
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
      put(g, x, y + top, C('wood', t));
    }
  const n = s - 2 * fw;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < fw; j++) {
      const x = fw + i;
      const y = top + s - fw - 1 - i + j - Math.floor(fw / 2);
      if (y < top + fw || y >= top + s - fw) continue;
      put(g, x, y, C('wood', j === 0 ? 1 : j === fw - 1 ? 4 : 2));
    }
  for (const [x, y] of [
    [1, top + 1],
    [s - 2, top + 1],
    [1, top + s - 2],
    [s - 2, top + s - 2],
  ] as const)
    put(g, x, y, C('iron', 1));
  return plain(g);
}

/** A street lamp on an iron post: glass panes in a hooded lantern, lit at dusk. */
export function lamp(): Drawn {
  const h = m(3.1);
  const lw = Math.max(7, m(0.44)) | 1;
  const g = tgrid(lw + 6, h + 2);
  const cx = Math.floor((lw + 6) / 2);
  const pw = Math.max(3, m(0.13));
  const px0 = cx - Math.floor(pw / 2);
  const rod = (x: number, y: number, w: number, k = 0) => {
    for (let i = 0; i < w; i++) {
      const nx = ((i + 0.5) / w) * 2 - 1;
      put(g, x + i, y, C('iron', clamp(cyl(nx, 2.2, 1.5) + k, 0, 5)));
    }
  };
  const lanH = Math.max(8, m(0.62));
  const capH = Math.max(4, m(0.22));
  const lanTop = capH + 1;
  for (let y = lanTop + lanH; y < h; y++) rod(px0, y, pw);
  const fh = Math.max(3, m(0.28));
  for (let j = 0; j < fh; j++) {
    const w = pw + 2 + Math.round((j / fh) * m(0.24));
    rod(cx - Math.floor(w / 2), h - fh + j, w, j === 0 ? -0.5 : 0);
  }
  for (let j = 0; j < 2; j++) rod(px0 - 1, Math.round(h * 0.55) + j, pw + 2, -0.3);
  // Arms under the lantern.
  for (let i = 0; i < 4; i++) {
    put(g, cx - 2 - i, lanTop + lanH + 2 + i, C('iron', 2));
    put(g, cx + 2 + i, lanTop + lanH + 2 + i, C('iron', 4));
  }
  const lx = cx - Math.floor(lw / 2);
  for (let y = lanTop; y < lanTop + lanH; y++) {
    const taper = y > lanTop + lanH * 0.75 ? 1 : 0;
    for (let i = taper; i < lw - taper; i++) {
      const bar = i === taper || i === lw - 1 - taper || i === Math.floor(lw / 2);
      let c: Cell;
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
      put(
        g,
        cx - Math.floor(w / 2) + i,
        lanTop - capH + j,
        C('iron', clamp(cyl(nx, 2, 1.4), 0, 5)),
      );
    }
  }
  put(g, cx, 0, C('iron', 1));
  return plain(g, [
    { x: cx + 0.5, y: lanTop + lanH / 2, radius: m(2.6), strength: 0.62 },
    { x: cx + 0.5, y: lanTop + lanH / 2, radius: m(0.7), strength: 0.5 },
  ]);
}

// ------------------------------------------------------------------ the square

/**
 * Letters for signs, three wide and five tall: enough to say where a road
 * goes. Only those the town's signs use.
 */
const LETTERS: Readonly<Record<string, readonly string[]>> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  N: ['#.#', '###', '###', '###', '#.#'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  Q: ['###', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
};

/** Writes a word in `LETTERS` at (x, y), cut into wood: dark letters with a lit lower edge. */
export function letters(g: TGrid, word: string, x: number, y: number, mat: Mat): number {
  let cx = x;
  for (const ch of word) {
    const rows = LETTERS[ch];
    if (rows) {
      rows.forEach((row, j) =>
        [...row].forEach((p, i) => {
          if (p !== '#') return;
          put(g, cx + i, y + j, C(mat, 5));
          if (rows[j + 1]?.[i] !== '#') {
            const below = at(g, cx + i, y + j + 1);
            if (below && !isMat(below, mat)) put(g, cx + i, y + j + 1, (below & ~7) | 1);
          }
        }),
      );
    }
    cx += 4;
  }
  return cx - x - 1;
}

/** The signpost: a post with one arm to the road north and one to the quay. */
export function signpost(): Drawn {
  const h = m(2.5);
  const W = m(2.0);
  const g = tgrid(W, h);
  const cx = Math.floor(W / 2) - 2;
  const pw = Math.max(4, m(0.14));
  for (let y = 4; y < h; y++)
    for (let i = 0; i < pw; i++) {
      const nx = ((i + 0.5) / pw) * 2 - 1;
      let t = cyl(nx, 2.4, 1.3);
      if (hash(cx + i, Math.floor(y / 6), 3) < 0.15) t += 1;
      put(g, cx + i, y, C('wood', clamp(t, 1, 5)));
    }
  // A cap on the post.
  for (let i = -1; i <= pw; i++) {
    put(g, cx + i, 3, C('wood', i < 1 ? 1 : 3));
    put(g, cx + i, 2, C('wood', 1));
  }
  // Arms: pointed boards, the upper to the right, the lower to the left.
  const arm = (y: number, dir: 1 | -1, word: string) => {
    const ah = 9;
    const len = m(0.95);
    const x0 = dir > 0 ? cx - 3 : cx + pw + 3 - len;
    for (let j = 0; j < ah; j++)
      for (let i = 0; i < len; i++) {
        const tip = dir > 0 ? len - 1 - i : i;
        if (tip < 5 && Math.abs(j - (ah - 1) / 2) > tip) continue;
        let t = j === 0 ? 1 : j === ah - 1 ? 5 : j === ah - 2 ? 3 : 2;
        if (hash(x0 + i, Math.floor(j / 3), 5) < 0.1) t += 1;
        put(g, x0 + i, y + j, C('wood', t));
      }
    letters(g, word, dir > 0 ? x0 + 4 : x0 + 7, y + 2, 'wood');
    // The arm's shadow on the post below it.
    for (let i = 0; i < pw; i++) dim(g, cx + i, y + ah, 2);
  };
  arm(m(0.35), 1, 'NORTH');
  arm(m(0.75), -1, 'QUAY');
  return plain(g);
}

/** The notice board: a planked board on two posts under a little roof, papers pinned to it. */
export function noticeBoard(): Drawn {
  const W = m(1.7);
  const H = m(2.2);
  const g = tgrid(W, H);
  const pw = Math.max(4, m(0.14));
  const bTop = m(0.42);
  const bH = m(0.95);
  const bx = 3;
  const bw = W - 6;
  for (const px of [bx + 3, bx + bw - 3 - pw]) beamV(g, px, bTop, pw, H - bTop, 7 + px);
  for (let j = 0; j < bH; j++)
    for (let i = 0; i < bw; i++) {
      const plank = Math.floor(j / 7);
      let t = j % 7 === 6 ? 4 : j % 7 === 0 ? 1 : 2;
      if (i === 0) t = 1;
      if (i === bw - 1 || j === bH - 1) t = 5;
      if (hash(i + plank * 50, plank, 4) < 0.05) t = 3;
      put(g, bx + i, bTop + j, C('wood', t));
    }
  // Papers, each with lines of writing and a pin, one with a red seal, one a little crooked.
  const papers = [
    [6, 5, 16, 20, 0],
    [25, 4, 14, 14, 1],
    [42, 7, 13, 18, 0],
    [24, 21, 16, 12, 0],
  ] as const;
  papers.forEach(([px, py, pw2, ph, crooked], n) => {
    for (let j = 0; j < ph; j++)
      for (let i = 0; i < pw2; i++) {
        const sx = bx + px + i + (crooked ? Math.floor(j / 6) : 0);
        let t = i === 0 || j === 0 ? 0 : i === pw2 - 1 || j === ph - 1 ? 3 : 1;
        if (
          j > 3 &&
          j < ph - 2 &&
          j % 3 === 1 &&
          i > 1 &&
          i < pw2 - 2 &&
          hash(i, j + n * 9, 6) < 0.8
        )
          t = 4;
        put(g, sx, bTop + py + j, C('linen', t));
      }
    for (let j = 1; j <= ph; j++)
      dim(g, bx + px + pw2 + (crooked ? Math.floor(j / 6) : 0), bTop + py + j, 2);
    put(g, bx + px + Math.floor(pw2 / 2), bTop + py + 1, C(n === 2 ? 'crimson' : 'iron', 2));
  });
  // A wax seal on the first.
  oval(g, bx + 12, bTop + 22, 2.2, 2.2, C('crimson', 2));
  put(g, bx + 11, bTop + 21, C('crimson', 0));
  // The roof: two pitches of planks over the board, and its shadow.
  const rTop = 2;
  for (let j = 0; j < bTop - rTop; j++) {
    const half = Math.round(((j + 2) / (bTop - rTop + 1)) * (W / 2));
    for (let i = -half; i < half; i++) {
      const x = Math.floor(W / 2) + i;
      let t = i < 0 ? 2 : 3;
      if (j === bTop - rTop - 1) t = 5;
      else if (Math.abs(i) === half - 1 || Math.abs(i) === half) t = i < 0 ? 1 : 4;
      else if ((x + 100) % 6 === 0) t += 1;
      put(g, x, rTop + j, C('wood', t));
    }
  }
  for (let i = 0; i < bw; i++) {
    dim(g, bx + i, bTop, 2);
    dim(g, bx + i, bTop + 1, 1);
  }
  return plain(g);
}

/** The well: a stone ring with dark water, two posts, a little tiled roof, a winch, rope and bucket. */
export function well(): Drawn {
  const W = m(1.8);
  const H = m(2.6);
  const g = tgrid(W, H);
  const cx = W / 2;
  const rx = m(0.78);
  const ringTop = H - m(0.95);
  const ry = m(0.26);
  const ringH = m(0.6);
  // The ring's body: a cylinder of stones in two courses.
  for (let y = ringTop; y < ringTop + ringH + ry; y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx;
      if (Math.abs(nx) > 1) continue;
      const bottomY = ringTop + ringH + Math.sqrt(1 - nx * nx) * ry;
      if (y > bottomY) continue;
      const course = Math.floor((y - ringTop) / 8);
      const ang = Math.asin(nx) * rx;
      const blk = Math.floor((ang + 100 + (course % 2) * 6) / 12);
      const edge = (y - ringTop) % 8 === 7 || Math.round(ang + 100 + (course % 2) * 6) % 12 === 0;
      let t = cyl(nx, 2, 1.3) + (hash(blk, course, 2) < 0.25 ? 1 : 0);
      if (edge) t = 5;
      put(g, x, y, C('stone', clamp(t, 1, 5)));
    }
  // Its top: a lit coping round dark water.
  oval(g, cx, ringTop, rx + 1, ry + 1, C('stone', 1));
  for (let y = ringTop - ry; y <= ringTop + ry; y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const a = (x + 0.5 - cx) / (rx - 4);
      const b = (y + 0.5 - ringTop) / (ry - 2.5);
      const d = a * a + b * b;
      // Inside: the far wall's stones going down into the dark, a glint of water at the bottom.
      if (d <= 1) {
        if (b < 0.25) put(g, x, y, C('stone', b < -0.5 ? 4 : 5));
        else put(g, x, y, C('shade', d < 0.35 ? 3 : 2));
        if (b > 0.35 && b < 0.6 && Math.abs(a) < 0.35) put(g, x, y, C('sea', 5));
      } else {
        const a2 = (x + 0.5 - cx) / (rx + 1);
        const b2 = (y + 0.5 - ringTop) / (ry + 1);
        if (a2 * a2 + b2 * b2 <= 1) put(g, x, y, C('stone', b2 > 0.2 ? 3 : a2 > 0.4 ? 2 : 1));
      }
    }
  // Posts, the roof and the winch.
  const pw = Math.max(4, m(0.12));
  const pTop = m(0.75);
  for (const px of [Math.round(cx - rx) + 1, Math.round(cx + rx) - pw])
    beamV(g, px, pTop, pw, ringTop - pTop + 3, 3 + px);
  const wy = pTop + m(0.38);
  for (let x = Math.round(cx - rx) + pw; x < Math.round(cx + rx) - pw; x++)
    for (let j = 0; j < 5; j++) put(g, x, wy + j, C('wood', j === 0 ? 1 : j === 4 ? 5 : 3));
  // The crank on the right.
  for (let j = 0; j < 7; j++) put(g, Math.round(cx + rx) + 1, wy + 2 + j, C('iron', 2));
  for (let i = 0; i < 4; i++) put(g, Math.round(cx + rx) + 1 + i, wy + 9, C('iron', 3));
  // Rope down to a bucket hanging over the water.
  const rx0 = Math.round(cx);
  for (let y = wy + 5; y < ringTop - ry + 2; y++) put(g, rx0, y, C('linen', y % 3 === 0 ? 2 : 3));
  const bkW = m(0.3);
  const bkH = m(0.28);
  const bkY = ringTop + Math.round(ry * 0.3) - bkH;
  for (let j = 0; j < bkH; j++)
    for (let i = 0; i < bkW - Math.floor(j / 5); i++) {
      const w2 = bkW - Math.floor(j / 5);
      const nx = ((i + 0.5) / w2) * 2 - 1;
      const hoop = j === 1 || j === bkH - 2;
      put(
        g,
        Math.round(cx - rx) + 6 + i,
        bkY + j,
        C(hoop ? 'iron' : 'wood', clamp(cyl(nx, 2.2, 1.2), 1, 5)),
      );
    }
  for (let i = 0; i < bkW; i++) {
    const y = bkY - 2 - Math.round(Math.sin((i / (bkW - 1)) * Math.PI) * 4);
    put(g, Math.round(cx - rx) + 6 + i, y, C('iron', i < bkW / 2 ? 2 : 4));
  }
  const roofG = { xl: 1, xr: W - 2, yTop: 4, yBot: pTop + 2, hip: m(0.5) };
  tileRoof(g, roofG, 41);
  beamH(g, 1, pTop + 2, W - 3, 3, 42);
  for (let x = Math.round(cx - rx) + pw; x < Math.round(cx + rx); x++) dim(g, x, pTop + 5, 2);
  return plain(g);
}

/** The anvil on its oak stump, the horn to the left, its face polished. */
export function anvil(): Drawn {
  const W = m(1.0);
  const H = m(0.95);
  const g = tgrid(W, H);
  // The stump: bark cylinder, cut top with rings.
  const sw = m(0.56);
  const sx = Math.round((W - sw) / 2);
  const sTop = m(0.5);
  for (let y = sTop; y < H; y++)
    for (let i = 0; i < sw; i++) {
      const nx = ((i + 0.5) / sw) * 2 - 1;
      let t = cyl(nx, 2.3, 1.3);
      if (hash(sx + i, Math.floor(y / 5), 8) < 0.25) t += 1;
      put(g, sx + i, y, C('bark', clamp(t, 1, 5)));
    }
  oval(g, sx + sw / 2, sTop, sw / 2, 3.5, C('wood', 1));
  oval(g, sx + sw / 2, sTop, sw / 2 - 4, 2, C('wood', 2));
  // The anvil: feet, waist, body and face, with the horn reaching out to the left.
  const top = 4;
  const bodyX = Math.round(W * 0.28);
  const bodyW = Math.round(W * 0.56);
  const faceH = 6;
  for (let j = 0; j < faceH; j++)
    for (let i = 0; i < bodyW; i++) {
      let t = j === 0 ? 0 : j === 1 ? 1 : i < 2 ? 2 : i > bodyW - 3 ? 4 : 3;
      if (j === faceH - 1) t = 5;
      put(g, bodyX + i, top + j, C('iron', t));
    }
  for (let i = 0; i < bodyX; i++) {
    const th = Math.max(1, Math.round(((i + 1) / bodyX) * (faceH - 1)));
    for (let j = 0; j < th; j++)
      put(
        g,
        i + 1,
        top + Math.round((faceH - th) / 2) + j,
        C('iron', j === 0 ? 1 : j === th - 1 ? 5 : 3),
      );
  }
  const waistTop = top + faceH;
  for (let j = 0; j < sTop - waistTop + 2; j++) {
    const ins = j < 6 ? Math.min(6, j * 2) : Math.max(0, 6 - (j - 6) * 2);
    for (let i = ins; i < bodyW - ins; i++)
      put(g, bodyX + i, waistTop + j, C('iron', i === ins ? 2 : i === bodyW - ins - 1 ? 5 : 4));
  }
  return plain(g);
}

/** A wooden bucket with iron hoops, half full of sea water. */
export function bucket(): Drawn {
  const W = m(0.36);
  const H = m(0.42);
  const g = tgrid(W, H);
  const top = 6;
  for (let j = top; j < H; j++) {
    const ins = Math.floor((j - top) / 6);
    for (let i = ins; i < W - ins; i++) {
      const nx = ((i - ins + 0.5) / (W - 2 * ins)) * 2 - 1;
      const hoop = j === top + 2 || j === H - 3;
      put(g, i, j, C(hoop ? 'iron' : 'wood', clamp(cyl(nx, 2.2, 1.3) + (hoop ? -0.3 : 0), 1, 5)));
    }
  }
  oval(g, W / 2, top, W / 2, 3, C('wood', 3));
  oval(g, W / 2, top, W / 2 - 2, 1.8, C('sea', 3));
  put(g, W / 2 - 2, top - 1, C('sea', 0));
  for (let i = 0; i < W; i++) {
    const y = top - 2 - Math.round(Math.sin((i / (W - 1)) * Math.PI) * 5);
    put(g, i, y, C('iron', i < W / 2 ? 2 : 4));
  }
  return plain(g);
}

/** A fishing net spread out flat to dry: a diamond mesh of cord with cork floats along one edge. */
export function net(): Drawn {
  const W = m(2.6);
  const H = m(1.0);
  const g = tgrid(W, H);
  const inside = (x: number, y: number) => {
    const a = (x - W / 2) / (W / 2 - 2);
    const b = (y - H / 2) / (H / 2 - 2);
    return a * a * 0.9 + b * b + (fbm(x, y, 10, 3) - 0.5) * 0.6 < 1;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const d1 = (x + y * 2) % 7;
      const d2 = (x - y * 2 + 700) % 7;
      if (d1 === 0 || d2 === 0) put(g, x, y, C('linen', d1 === 0 && d2 === 0 ? 1 : 3));
    }
  // A heavier rope round its edge, and floats.
  for (let x = 4; x < W - 4; x++) {
    let y = 0;
    while (y < H && !inside(x, y)) y++;
    if (y < H) {
      put(g, x, y, C('linen', 2));
      if (x % 12 === 0) oval(g, x, y, 2.2, 1.6, C('wood', 1));
    }
  }
  return plain(g);
}

/** A shore crab, claws up. */
export function crab(): Drawn {
  const W = m(0.55);
  const H = m(0.34);
  const g = tgrid(W, H);
  const cx = W / 2;
  // Legs first, three a side, splayed.
  for (const s of [-1, 1])
    for (let l = 0; l < 3; l++) {
      const x0 = cx + s * 5;
      const y0 = H - 6 + l;
      for (let i = 0; i < 6; i++)
        put(
          g,
          x0 + s * (i + 2),
          y0 + Math.floor(i / 2) - (i > 3 ? 1 : 0),
          C('tile', s < 0 ? 3 : 4),
        );
    }
  solid(
    g,
    Math.round(cx - 7),
    H - 10,
    15,
    8,
    (x, y) => ((x - 7) / 7.5) ** 2 + ((y - 4) / 4) ** 2 <= 1,
    'tile',
    {
      base: 2.2,
      contrast: 1.4,
      radius: 3,
    },
  );
  // Claws, raised.
  for (const s of [-1, 1]) {
    const ccx = cx + s * 8;
    solid(
      g,
      Math.round(ccx - 3),
      1,
      7,
      6,
      (x, y) => ((x - 3) / 3.5) ** 2 + ((y - 3) / 3) ** 2 <= 1,
      'tile',
      {
        base: 2,
        contrast: 1.4,
        radius: 2,
      },
    );
    put(g, ccx + s, 1, 0);
    put(g, ccx + s, 2, 0);
    put(g, ccx - s * 2, 7, C('tile', 3));
    put(g, ccx - s * 3, 8, C('tile', 3));
  }
  // Eyes on stalks.
  for (const s of [-1, 1]) {
    put(g, cx + s * 2 - 0.5, H - 11, C('tile', 3));
    put(g, cx + s * 2 - 0.5, H - 12, C('shade', 3));
  }
  return plain(g);
}

/** A red and white buoy afloat, a cage on top. Its waterline is at its base. */
export function buoy(): Drawn {
  const W = m(0.8);
  const H = m(1.2);
  const g = tgrid(W, H);
  const cx = W / 2;
  const bodyTop = m(0.45);
  const bodyBot = H - 3;
  for (let y = bodyTop; y < bodyBot; y++) {
    const f = (y - bodyTop) / (bodyBot - bodyTop);
    const hw = W * 0.28 + f * W * 0.18;
    for (let x = Math.ceil(cx - hw); x <= Math.floor(cx + hw); x++) {
      const nx = (x + 0.5 - cx) / hw;
      const band = Math.floor(f * 3) % 2 === 0;
      put(g, x, y, C(band ? 'crimson' : 'linen', clamp(cyl(nx, band ? 2.2 : 1.6, 1.4), 0, 5)));
    }
  }
  // The cage and its ball.
  for (let y = 5; y < bodyTop; y++) {
    put(g, cx - 4, y, C('iron', 2));
    put(g, cx + 3, y, C('iron', 4));
  }
  oval(g, cx - 0.5, 5, 3.5, 3.5, C('iron', 3));
  oval(g, cx - 1, 4, 2, 2, C('iron', 1));
  // The waterline: the buoy darker where wet, foam round it.
  for (let x = 0; x < W; x++) {
    dim(g, x, bodyBot - 1, 1);
    if (Math.abs(x - cx) < W / 2 - 1) put(g, x, bodyBot + 1, C('sea', x % 3 === 0 ? 0 : 1));
  }
  for (let x = 2; x < W - 2; x++) put(g, x, bodyBot, C('sea', 0));
  return plain(g);
}

/** A gull gliding: white body, grey back and wings with black tips, a yellow bill. */
export function gull(): Drawn {
  const W = m(0.7);
  const H = m(0.3);
  const g = tgrid(W, H);
  const cx = Math.floor(W / 2);
  for (let i = -cx; i <= cx; i++) {
    const a = Math.abs(i) / cx;
    const y = 3 + Math.round(-Math.sin(a * Math.PI) * 3) + (a > 0.8 ? 1 : 0);
    const tip = a > 0.72;
    put(g, cx + i, y, C(tip ? 'slate' : 'smoke', tip ? 5 : 1));
    put(g, cx + i, y + 1, C(tip ? 'slate' : 'smoke', tip ? 6 : 3));
    if (a < 0.4) put(g, cx + i, y + 2, C('smoke', 2));
  }
  oval(g, cx, 5, 3, 2, C('sail', 0));
  put(g, cx + 3, 5, C('gold', 2));
  put(g, cx + 4, 5, C('gold', 3));
  return plain(g);
}

/**
 * Chimney smoke: puffs that grow and drift to the right as they rise, each
 * a soft ball lit on its left, its edge thinning out in an ordered dither so
 * it reads as vapour rather than stone. Drawn without an outline.
 */
export function smoke(dark: boolean): Drawn {
  const W = m(1.3);
  const H = m(1.7);
  const g = tgrid(W, H);
  const puffs = [
    [0.36, 0.9, 0.09],
    [0.42, 0.76, 0.13],
    [0.52, 0.58, 0.17],
    [0.64, 0.36, 0.2],
    [0.72, 0.14, 0.16],
  ] as const;
  puffs.forEach(([fx, fy, fr], n) => {
    const r = W * fr;
    const pcx = W * fx;
    const pcy = H * fy;
    const thin = n / (puffs.length - 1);
    for (let y = Math.floor(pcy - r); y <= pcy + r; y++)
      for (let x = Math.floor(pcx - r); x <= pcx + r; x++) {
        const dx = (x + 0.5 - pcx) / r;
        const dy = (y + 0.5 - pcy) / r;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        // The higher the puff, the more of it has thinned away.
        const edge = 1 - thin * 0.55;
        if (
          d > edge * edge &&
          bayer(x, y) < (d - edge * edge) / (1 - edge * edge + 0.01) + thin * 0.25
        )
          continue;
        const lam = -dx * 0.6 - dy * 0.5 + Math.sqrt(Math.max(0, 1 - d)) * 0.6;
        const t = (dark ? 2.4 : 1.5) + thin * 0.4 - lam * 1.3;
        put(g, x, y, C('smoke', clamp(t, 0, 4)));
      }
  });
  return plain(g);
}

/** A boulder: a big field stone, lit as a solid, lichen on its top, sunk a little in the grass. */
export function boulder(): Drawn {
  const W = m(1.6);
  const H = m(1.1);
  const g = tgrid(W, H);
  const inside = (x: number, y: number) => {
    const a = (x - W / 2) / (W / 2 - 1);
    const b = (y - H * 0.58) / (H * 0.5);
    return a * a + b * b * (b > 0 ? 0.5 : 1) + (fbm(x, y, 9, 21) - 0.5) * 0.5 < 1 && y < H - 1;
  };
  solid(g, 0, 0, W, H, inside, 'rock', { base: 2.3, contrast: 1.6, radius: 8 });
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++)
      if (isMat(at(g, x, y), 'rock') && fbm(x, y, 5, 22) > 0.68 && y < H * 0.5)
        put(g, x, y, C('moss', 2));
  // A crack down its face.
  let cx = W * 0.55;
  for (let y = Math.round(H * 0.3); y < H * 0.8; y++) {
    put(g, cx, y, C('rock', 5));
    put(g, cx + 1, y, C('rock', 1));
    cx += hash(y, 3, 23) < 0.4 ? 1 : 0;
  }
  return plain(g);
}

/** A bench: a slatted seat and back on iron ends. */
export function bench(): Drawn {
  const W = m(1.6);
  const H = m(0.95);
  const g = tgrid(W, H);
  const seatY = H - m(0.45);
  // Iron ends, scrolled at the arm.
  for (const ex of [3, W - 6])
    for (let y = 2; y < H; y++)
      for (let i = 0; i < 3; i++) put(g, ex + i, y, C('iron', i === 0 ? 1 : i === 2 ? 4 : 2));
  // The back: two slats.
  for (const by of [4, 10])
    for (let x = 1; x < W - 1; x++)
      for (let j = 0; j < 4; j++) put(g, x, by + j, C('wood', j === 0 ? 1 : j === 3 ? 5 : 2));
  // The seat, seen from above a little: three slats, lit, and its front edge.
  for (let j = 0; j < 9; j++)
    for (let x = 0; x < W; x++) {
      let t = j % 3 === 2 ? 4 : j % 3 === 0 ? 1 : 2;
      if (j === 8) t = 5;
      put(g, x, seatY - 6 + j, C('wood', t));
    }
  for (let x = 6; x < W - 6; x++) dim(g, x, seatY + 3, 2);
  return plain(g);
}

/** A stone planter of flowers. */
export function planter(): Drawn {
  const W = m(0.9);
  const H = m(0.95);
  const g = tgrid(W, H);
  const top = H - m(0.5);
  for (let y = top; y < H; y++)
    for (let x = 2; x < W - 2; x++) {
      const nx = ((x - 2 + 0.5) / (W - 4)) * 2 - 1;
      let t = cyl(nx, 2.2, 1.2);
      if (y === top || y === top + 1) t -= 1;
      if (y === top + 4) t += 1;
      put(g, x, y, C('stone', clamp(t, 1, 5)));
    }
  // Leaves heaped over the rim, flowers among them.
  for (let n = 0; n < 9; n++) {
    const cx = 5 + Math.floor(hash(n, 1, 41) * (W - 10));
    const cy = top - 2 - Math.floor(hash(n, 2, 41) * m(0.35));
    const r = 4 + Math.floor(hash(n, 3, 41) * 3);
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++) {
        if (i * i + j * j * 1.3 > r * r) continue;
        const lam = -(i / r) * 0.6 - (j / r) * 0.8;
        put(g, cx + i, cy + j, C('leaf', clamp(3 - lam * 1.6 + (cy - top) * -0.05, 1, 5)));
      }
  }
  for (let n = 0; n < 7; n++) {
    const fx = 5 + Math.floor(hash(n, 4, 42) * (W - 10));
    const fy = top - 4 - Math.floor(hash(n, 5, 42) * m(0.35));
    const hue = n % 3;
    const c = hue === 0 ? 3 : hue === 1 ? 1 : 0;
    put(g, fx, fy, C('flower', c));
    put(g, fx + 1, fy, C('flower', c + 1));
    put(g, fx, fy + 1, C('flower', c + 1));
    put(g, fx + 1, fy + 1, C('flower', c + 2));
  }
  return plain(g);
}

/** A low post-and-rail fence two metres long. */
export function fence(): Drawn {
  const W = m(2.0) + 6;
  const H = m(1.1);
  const g = tgrid(W, H);
  const pw = Math.max(4, m(0.13));
  const rh = Math.max(3, m(0.08));
  for (const ry of [Math.round(H * 0.25), Math.round(H * 0.58)])
    for (let x = 0; x < W; x++)
      for (let j = 0; j < rh; j++) {
        let t = j === 0 ? 1 : j === rh - 1 ? 5 : 3;
        if (hash(Math.floor(x / 8), ry, 3) < 0.15 && j > 0 && j < rh - 1) t = 4;
        put(g, x, ry + j, C('wood', t));
      }
  for (const px of [1, W - pw - 1])
    for (let j = 0; j < H; j++)
      for (let i = 0; i < pw; i++) {
        let t = i === 0 ? 1 : i === pw - 1 ? 4 : 2;
        if (j === 0) t = 1;
        if (j === 1 && i > 0) t = 3;
        put(g, px + i, j, C('wood', t));
      }
  // Rails cast a little shadow on the posts' right faces under them.
  return plain(g);
}

/** The market stall: a counter with goods under a striped awning on four posts. */
export function stall(): Drawn {
  const W = m(3.4);
  const H = m(2.9);
  const g = tgrid(W, H);
  const pw = Math.max(4, m(0.12));
  const counterTop = H - m(1.0);
  const awnTop = 2;
  const awnBot = m(0.95);
  // The back: a dark cloth hung behind the counter, posts.
  box(g, pw, awnBot - 4, W - 2 * pw, counterTop - awnBot + 4, C('shade', 1));
  for (let y = awnBot; y < counterTop; y++)
    for (let x = pw; x < W - pw; x++)
      if ((x + Math.floor(y / 3)) % 11 === 0) put(g, x, y, C('shade', 2));
  for (const px of [0, W - pw]) beamV(g, px, awnTop + 4, pw, H - awnTop - 4, 9 + px);
  // Goods on the counter: a basket of apples, loaves, bottles, a wheel of cheese.
  const shelf = counterTop - 1;
  const goods: [number, (x: number) => void][] = [
    [
      m(0.25),
      (x) => {
        const bw = m(0.62);
        for (let j = 0; j < 9; j++)
          for (let i = 0; i < bw - Math.floor(j / 3); i++)
            put(
              g,
              x + Math.floor(j / 6) + i,
              shelf - 9 + j,
              C('wood', (i + j) % 3 === 0 ? 3 : i < 3 ? 1 : 2),
            );
        for (let n = 0; n < 9; n++) {
          const ax = x + 3 + (n % 5) * 4 + (n >= 5 ? 2 : 0);
          const ay = shelf - 11 - (n >= 5 ? 3 : 0);
          solid(g, ax - 2, ay - 2, 5, 5, (i, j) => (i - 2) ** 2 + (j - 2) ** 2 <= 5, 'crimson', {
            base: 2,
            contrast: 1.4,
            radius: 2,
            lo: 0,
          });
        }
      },
    ],
    [
      m(1.0),
      (x) => {
        for (let n = 0; n < 3; n++)
          solid(
            g,
            x + n * 9,
            shelf - 8 - (n === 1 ? 2 : 0),
            12,
            8,
            (i, j) => ((i - 6) / 6) ** 2 + ((j - 4.5) / 4) ** 2 <= 1,
            'dirt',
            {
              base: 1.8,
              contrast: 1.5,
              radius: 3,
            },
          );
      },
    ],
    [
      m(1.85),
      (x) => {
        const mats: Mat[] = ['teal', 'blue', 'crimson', 'teal', 'gold'];
        mats.forEach((mt, n) => {
          const bx = x + n * 6;
          const bh = 12 + (n % 2) * 3;
          for (let j = 0; j < bh; j++)
            for (let i = 0; i < 5; i++) {
              const neck = j < 5 && (i === 0 || i === 4);
              if (neck) continue;
              put(
                g,
                bx + i,
                shelf - bh + j,
                C(mt, clamp(cyl(((i + 0.5) / 5) * 2 - 1, 2.4, 1.6), 0, 5)),
              );
            }
          put(g, bx + 2, shelf - bh - 1, C('wood', 2));
          put(g, bx + 1, shelf - bh + 6, C(mt, 0));
        });
      },
    ],
    [
      m(2.75),
      (x) => {
        solid(
          g,
          x,
          shelf - 9,
          16,
          9,
          (i, j) => ((i - 8) / 8) ** 2 + ((j - 4.5) / 4.6) ** 2 <= 1,
          'gold',
          {
            base: 2.6,
            contrast: 1.3,
            radius: 3,
          },
        );
      },
    ],
  ];
  for (const [x, draw] of goods) draw(x);
  // The counter: boards across, lit top edge, a darker kick at the foot.
  for (let y = counterTop; y < H; y++)
    for (let x = 1; x < W - 1; x++) {
      const j = y - counterTop;
      let t = j < 3 ? (j === 0 ? 0 : 1) : (j - 3) % 8 === 7 ? 5 : (j - 3) % 8 === 0 ? 1 : 3;
      if (x === 1) t = Math.min(t, 1);
      if (x === W - 2) t = 5;
      if (j > 3 && hash(Math.floor(x / 10), Math.floor((j - 3) / 8), 4) < 0.2)
        t = Math.min(5, t + 1);
      put(g, x, y, C('wood', t));
    }
  for (let x = 1; x < W - 1; x++) dim(g, x, counterTop + 3, 1);
  // The awning: stripes running down the slope, each shaded as a shallow trough, a scalloped valance.
  const stripe = m(0.3);
  for (let y = awnTop; y < awnBot; y++) {
    const f = (y - awnTop) / (awnBot - awnTop);
    const ins = Math.round((1 - f) * m(0.25));
    for (let x = ins; x < W - ins; x++) {
      const sx = x - W / 2;
      const s = Math.floor((sx * (1 - 0.15 * (1 - f)) + 1000 * stripe) / stripe);
      const red = s % 2 === 0;
      const lx = (((sx * (1 - 0.15 * (1 - f))) % stripe) + stripe) % stripe;
      let t = 1 + (lx > stripe - 3 ? 1 : 0) + (f < 0.12 ? 1 : 0);
      if (x - ins < 2) t = 0;
      if (W - ins - x < 3) t += 1;
      put(g, x, y, C(red ? 'crimson' : 'linen', clamp(t + (red ? 0.5 : 0), 0, 5)));
    }
  }
  for (let x = 0; x < W; x++) {
    const s = Math.floor((x - W / 2 + 1000 * stripe) / stripe);
    const red = s % 2 === 0;
    const lx = (((x - W / 2) % stripe) + stripe) % stripe;
    const drop = Math.round(Math.sin((lx / stripe) * Math.PI) * 5);
    for (let j = 0; j < 5 + drop; j++)
      put(g, x, awnBot + j, C(red ? 'crimson' : 'linen', j === 4 + drop ? 4 : j === 0 ? 3 : 2));
  }
  // The awning's shadow on the goods and the back.
  for (let y = awnBot + 5; y < awnBot + m(0.5); y++)
    for (let x = pw; x < W - pw; x++) {
      const c = at(g, x, y);
      if (c && !isMat(c, 'crimson') && !isMat(c, 'linen')) dim(g, x, y, 1);
    }
  return plain(g);
}

/** A picture from a prop's drawing, outline added. */
export function asPicture(d: Drawn, outline: (g: TGrid) => TGrid): Picture2 {
  return {
    grid: outline(d.grid),
    glows: d.glows.map((gl) => ({ ...gl, x: gl.x + 1, y: gl.y + 1 })),
  };
}
