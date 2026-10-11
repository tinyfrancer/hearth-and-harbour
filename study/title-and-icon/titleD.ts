/**
 * Title D, the emblem: an illuminated, heraldic composition. A blue field
 * diapered in lozenges with gold studs, framed in a gilt rope; a shield party
 * per fess, red over blue-and-silver waves, charged with a gold anchor whose
 * ring is a hearth flame; heraldic pines either side; for a crest, the cutter
 * in gold on a red-and-gold wreath; and the name in gilt capitals on a red
 * ribbon bowed beneath, the letters following its curve (a third logotype
 * treatment).
 *
 * All new drawing, in the town's ramps (banner red, blue, gold, pine, iron)
 * and the menus' gold; the crest's ship is the far cutter from far.ts recast
 * in gold step for step.
 *
 * What moves: a glint sweeping across the gold now and then, the flame on the
 * anchor flickering, the waves on the shield running.
 */
import { at, cell, hash, put, solid, tgrid, type TGrid } from '../../src/art/town2/cells';
import { clamp, clumps } from '../../src/art/town2/texture';
import { X, isX, xmatOf, xpal, type BandGlow } from './pal';
import { farShip } from './far';
import { capsWord, uncialGlyph, mget, type Mask } from './glyphs';
import { inkRows, treat } from './logo';
import { SCREEN_H, SCREEN_W, type Frame, type Title } from './screen';

const C = cell;
const LOOP = 3600;
const CX = 195;
const SH = { top: 230, w: 226, h: 272 };
/** The anchor and flame were drawn for a 196-wide shield; they scale with it. */
const K = SH.w / 196;

function field(g: TGrid): void {
  for (let y = 0; y < SCREEN_H; y++)
    for (let x = 0; x < SCREEN_W; x++) {
      // Lozenges 26 wide, 30 tall, studded at the corners.
      const u = (x - CX + 1300) / 13;
      const v = (y + 15) / 15;
      const a = Math.floor((u + v) / 2);
      const b = Math.floor((u - v + 200) / 2);
      const fa = (u + v) / 2 - a;
      const fb = (u - v + 200) / 2 - b;
      const line = fa < 0.06 || fb < 0.06;
      let s = (a + b) % 2 ? 4 : 5;
      if (line) s = 6;
      // A vignette in flat steps: the field darkens toward its edges.
      const d = Math.hypot((x - CX) / 220, (y - 390) / 470);
      const n = clamp(d * 2.2 - 0.9 + (clumps(x / 4, y / 4, 5) - 0.5) * 0.3, 0, 2);
      put(g, x, y, X('azure', Math.min(7, s + n)));
    }
  // Gold studs where the lozenges' lines cross: a small lit diamond each.
  for (let a = -40; a < 80; a++)
    for (let b = -40; b < 120; b++) {
      // Invert the lozenge coordinates: u + v = 2a, u - v + 200 = 2b.
      const u = a + b - 100;
      const v = a - b + 100;
      const x = Math.round(u * 13 + CX - 1300);
      const y = Math.round(v * 15 - 15);
      if (x < -3 || y < -3 || x > SCREEN_W + 3 || y > SCREEN_H + 3) continue;
      for (const [dx, dy, s] of [
        [0, -1, 1],
        [-1, 0, 2],
        [0, 0, 2],
        [1, 0, 4],
        [0, 1, 4],
      ] as const)
        put(g, x + dx, y + dy, X('gilt', s));
    }
}

/** A twisted gilt rope round the screen, `inset` from the edge, `w` thick. */
function rope(g: TGrid, inset: number, w: number): void {
  const x0 = inset;
  const y0 = inset;
  const x1 = SCREEN_W - inset - 1;
  const y1 = SCREEN_H - inset - 1;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dl = x - x0;
      const dr = x1 - x;
      const dt = y - y0;
      const db = y1 - y;
      const d = Math.min(dl, dr, dt, db);
      if (d >= w) continue;
      // Position along the rope and across it.
      const along = d === dt || d === db ? x : y;
      const across = d;
      const strand = (along + across * 1.2) / 5;
      const f = strand - Math.floor(strand);
      let s = f < 0.15 ? 5 : f < 0.45 ? 1 : f < 0.8 ? 2 : 3;
      if (across === 0 || across === w - 1) s = 6;
      put(g, x, y, X('gilt', s));
    }
}

/** The shield's outline: a heater, flat top, sides curving in to a point. */
function inShield(x: number, y: number): boolean {
  const fx = (x + 0.5) / SH.w - 0.5;
  const fy = (y + 0.5) / SH.h;
  if (fy < 0 || fy > 1) return false;
  if (fy < 0.42) return Math.abs(fx) <= 0.5;
  const t = (fy - 0.42) / 0.58;
  return Math.abs(fx) <= 0.5 * Math.sqrt(Math.max(0, 1 - t * t));
}

function shield(g: TGrid, ph: number): void {
  const x0 = CX - SH.w / 2;
  const fess = Math.round(SH.h * 0.44);
  for (let y = 0; y < SH.h; y++)
    for (let x = 0; x < SH.w; x++) {
      if (!inShield(x, y)) continue;
      const edge =
        !inShield(x - 5, y) || !inShield(x + 5, y) || !inShield(x, y - 5) || !inShield(x, y + 5);
      if (edge) continue;
      let c: number;
      if (y < fess) {
        // Gules, damasked: a faint lozenge pattern a step apart.
        const dam = ((x + y) >> 3) % 2 === ((x - y + 400) >> 3) % 2;
        c = X('banner', 2 + (dam ? 0 : 1) + (x > SH.w * 0.6 ? 1 : 0));
      } else {
        // Barry wavy azure and argent, running with the phase.
        const wave = Math.sin(x / 9 + ph * Math.PI * 2) * 3;
        const band = Math.floor((y - fess + wave) / 12);
        c =
          band % 2
            ? C('sail', 1 + (x > SH.w * 0.6 ? 1 : 0))
            : C('blue', 2 + (x > SH.w * 0.6 ? 1 : 0));
      }
      put(g, x0 + x, SH.top + y, c);
    }
  // The bordure: a gilt rim, lit on the upper left.
  for (let y = 0; y < SH.h; y++)
    for (let x = 0; x < SH.w; x++) {
      if (!inShield(x, y)) continue;
      const e5 =
        !inShield(x - 5, y) || !inShield(x + 5, y) || !inShield(x, y - 5) || !inShield(x, y + 5);
      if (!e5) continue;
      const outer =
        !inShield(x - 1, y) || !inShield(x + 1, y) || !inShield(x, y - 1) || !inShield(x, y + 1);
      const inner = !(
        !inShield(x - 4, y) ||
        !inShield(x + 4, y) ||
        !inShield(x, y - 4) ||
        !inShield(x, y + 4)
      );
      const lit = x < SH.w / 2 && y < SH.h * 0.7;
      put(g, x0 + x, SH.top + y, X('gilt', outer ? 6 : inner ? 5 : lit ? 1 : 3));
    }
  // The fess line.
  for (let x = 5; x < SH.w - 5; x++) {
    put(g, x0 + x, SH.top + fess, X('gilt', 5));
    put(g, x0 + x, SH.top + fess - 1, X('gilt', 2));
  }
  anchor(g, ph);
}

function anchor(g: TGrid, ph: number): void {
  // A mask of the anchor, then lit as a solid in gold.
  const W = Math.round(150 * K);
  const H = Math.round(180 * K);
  const ax = CX - W / 2;
  const ay = SH.top + Math.round(34 * K);
  const inside = (px: number, py: number) => {
    const x = px / K;
    const y = py / K;
    const W = 150;
    const H = 180;
    const cx = W / 2;
    // Shank.
    if (Math.abs(x + 0.5 - cx) < 7 && y > 20 && y < H - 22) return true;
    // Stock, with rounded ends.
    if (y >= 34 && y < 46 && Math.abs(x + 0.5 - cx) < 46) return true;
    if (
      Math.hypot(x + 0.5 - (cx - 46), y - 40) < 7.5 ||
      Math.hypot(x + 0.5 - (cx + 46), y - 40) < 7.5
    )
      return true;
    // Arms: an arc under the crown.
    const r = Math.hypot(x + 0.5 - cx, y + 0.5 - (H - 82));
    const ang = Math.atan2(y + 0.5 - (H - 82), x + 0.5 - cx);
    if (r > 54 && r < 66 && ang > 0.35 && ang < Math.PI - 0.35) return true;
    // Flukes: barbed points at the arms' ends, turned up and out.
    for (const s of [-1, 1]) {
      const fx = cx + s * 58;
      const fy = H - 82 + 22;
      const dx = (x + 0.5 - fx) * s;
      const dy = y + 0.5 - fy;
      if (dy < 6 && dy > -26 && Math.abs(dx + dy * 0.25) < 10 + dy * 0.45) return true;
    }
    // The crown: a point at the bottom.
    if (y > H - 26 && Math.abs(x + 0.5 - cx) < (H - y) * 0.7) return true;
    return false;
  };
  solid(g, ax, ay, W, H, inside, 'gold', { base: 2.2, contrast: 1.6, radius: 4 * K, lo: 0, hi: 5 });
  // Its line, the gold's own darkest.
  for (let y = -1; y <= H; y++)
    for (let x = -1; x <= W; x++) {
      if (inside(x, y)) continue;
      if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1))
        put(g, ax + x, ay + y, C('gold', 6));
    }
  // The flame where the ring would be: the hearth on the harbour's anchor.
  const fx = CX;
  const fb = ay + Math.round(18 * K);
  // A shallow gold cup on the shank's head holds it.
  for (let j = 0; j < 7; j++) {
    const half = Math.round((16 - j * 1.2) * K);
    for (let x = -half; x <= half; x++)
      put(
        g,
        fx + x,
        fb + j - 3,
        j === 0
          ? C('gold', 1)
          : j === 6
            ? C('gold', 6)
            : C('gold', x < -half * 0.4 ? 1 : x > half * 0.4 ? 4 : 2 + (j > 3 ? 1 : 0)),
      );
  }
  for (let i = 0; i < 5; i++) {
    const tw = [7, 10, 13, 10, 7][i]! * K;
    const th =
      [24, 38, 52, 36, 22][i]! *
      K *
      (0.88 + 0.14 * Math.sin(ph * Math.PI * 2 * (3 + (i % 3)) + i * 2));
    const ox = [-13, -7, 0, 7, 13][i]! * K;
    for (let y = 0; y < th; y++) {
      const f = y / th;
      const sway = Math.sin(f * 3 + ph * Math.PI * 4 + i) * f * 3;
      const half = tw * Math.pow(1 - f, 0.8);
      for (let x = Math.round(-half); x <= Math.round(half); x++) {
        const heat = 1 - f * 0.8 - (Math.abs(x) / Math.max(1, half)) * 0.5;
        const s = heat > 0.75 ? 0 : heat > 0.55 ? 1 : heat > 0.35 ? 2 : heat > 0.18 ? 3 : 4;
        const px = Math.round(fx + ox + x + sway);
        const py = fb - y;
        const cur = at(g, px, py);
        if (cur && isX(cur, 'fire') && (cur & 7) <= s) continue;
        put(g, px, py, X('fire', s));
      }
    }
  }
  // Outline the flame in the fire's own darkest red.
  const src = new Int16Array(g.d);
  for (let y = fb - 70; y <= fb - 4; y++)
    for (let x = fx - 40; x <= fx + 40; x++) {
      const c = src[y * g.w + x] as number;
      if (isX(c, 'fire')) continue;
      const n = [
        src[y * g.w + x - 1],
        src[y * g.w + x + 1],
        src[(y - 1) * g.w + x],
        src[(y + 1) * g.w + x],
      ];
      if (n.some((v) => isX(v as number, 'fire'))) put(g, x, y, X('fire', 6));
    }
}

/** A heraldic pine: symmetric drooping tiers, gilt-edged, on a gold trunk. */
function pine(g: TGrid, cx: number, base: number, h: number): void {
  const tiers = 6;
  const tr = 14;
  for (let y = base - tr; y < base; y++)
    for (let x = -3; x <= 3; x++) put(g, cx + x, y, X('gilt', x < -1 ? 1 : x > 1 ? 4 : 2));
  for (let t = 0; t < tiers; t++) {
    const ty0 = base - h + Math.round((t / tiers) * (h - tr) * 0.9);
    const th = Math.round((h - tr) / tiers) + 12;
    const maxHalf = 8 + (t / (tiers - 1)) * 30;
    const tips = 2 + Math.floor(t / 2);
    for (let y = 0; y < th; y++) {
      const f = y / th;
      const half = maxHalf * (0.2 + 0.8 * f);
      for (let x = Math.round(-half); x <= Math.round(half); x++) {
        const nx = x / Math.max(1, half);
        // The tier's foot droops into points, a few each side, the boughs' tips.
        const across = Math.abs(nx) * tips;
        const tipCurve = Math.abs((across % 1) - 0.5) * 2;
        if (f > 0.78 && tipCurve * 0.3 + 0.78 < f) continue;
        const under = f > 0.7;
        const s = under ? 4 : nx < -0.55 ? 1 : nx > 0.35 ? 3 : 2;
        put(g, cx + x, ty0 + y, C('pine', s));
      }
    }
  }
  // Gilt edge: every pine pixel that touches the field.
  const src = new Int16Array(g.d);
  for (let y = base - h - 2; y < base + 1; y++)
    for (let x = cx - 44; x <= cx + 44; x++) {
      const c = src[y * g.w + x] as number;
      if (!c || xmatOf(c) !== 'azure') continue;
      const n = [
        src[y * g.w + x - 1],
        src[y * g.w + x + 1],
        src[(y - 1) * g.w + x],
        src[(y + 1) * g.w + x],
      ];
      if (n.some((v) => xmatOf(v as number) === 'pine')) put(g, x, y, X('gilt', 3));
    }
}

/** The crest: a wreath (torse) of red and gold, the cutter on it in gold. */
function crest(g: TGrid, ph: number): void {
  const ty = SH.top - 16;
  for (let x = -66; x <= 66; x++)
    for (let y = 0; y < 12; y++) {
      const seg = Math.floor((x + 66 + y * 0.8) / 12);
      const f = ((x + 66 + y * 0.8) / 12) % 1;
      const red = seg % 2 === 0;
      const s = y === 0 ? 1 : y === 11 ? 4 : f < 0.25 ? 1 : f > 0.8 ? 4 : 2;
      put(g, CX + x, ty + y, red ? X('banner', s) : X('gilt', s));
    }
  // The ship, drawn small and recast in gold step for step.
  const sub = tgrid(SCREEN_W, SCREEN_H);
  farShip(sub, CX - 84, ty + 1, 0.68, false, ph * 2);
  for (let i = 0; i < sub.d.length; i++) {
    const c = sub.d[i] as number;
    if (!c) continue;
    const s = c & 7;
    g.d[i] = X('gilt', s >= 6 ? 6 : clamp(1 + s * 0.8, 1, 5));
  }
}

/** The ribbon bowed under the shield, and the name on it following the bow. */
export function ribbon(g: TGrid, y0 = SH.top + SH.h + 8): void {
  const half = 176;
  const H = 46;
  const bow = 18;
  const arc = (x: number) => Math.round(bow * (1 - ((x - CX) / half) ** 2));
  // Tails behind, folded back, notched.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 34; i++) {
      const x = CX + s * (half - 16 + i);
      const top = y0 + 12 + arc(CX + s * (half - 16)) - Math.round(i * 0.35);
      for (let j = 0; j < H - 6; j++) {
        const notch = i > 22 && Math.abs(j - (H - 6) / 2) < (i - 22) * 1.2;
        if (notch) continue;
        put(g, x, top + j, X('banner', j === 0 ? 3 : j === H - 7 ? 5 : 4));
      }
    }
  }
  for (let x = CX - half; x <= CX + half; x++) {
    const top = y0 + arc(x);
    for (let j = 0; j < H; j++) {
      const s =
        j === 0
          ? 6
          : j === 1
            ? 1
            : j === H - 2
              ? 4
              : j === H - 1
                ? 6
                : j < 6
                  ? 2
                  : j > H - 8
                    ? 3
                    : 2;
      put(g, x, top + j, X('banner', s));
    }
  }
  // Gilt fillets along both edges.
  for (let x = CX - half + 2; x <= CX + half - 2; x++) {
    const top = y0 + arc(x);
    put(g, x, top + 3, X('gilt', 2));
    put(g, x, top + H - 4, X('gilt', 4));
  }
  // The name, in one line, bent along the bow.
  const cap = 24;
  const words = [capsWord('HEARTH', cap), uncialGlyph('&', 16), capsWord('HARBOUR', cap)];
  const gap = 10;
  const total = words.reduce((s, m) => s + m.w, 0) + gap * 2;
  const line = { w: total, h: Math.max(...words.map((m) => m.h)), d: new Uint8Array(0) } as Mask;
  line.d = new Uint8Array(line.w * line.h);
  let lx = 0;
  words.forEach((m, i) => {
    const dy = i === 1 ? cap - 2 - inkRows(m)[1] : 0;
    for (let y = 0; y < m.h; y++)
      for (let x = 0; x < m.w; x++)
        if (mget(m, x, y) && y + dy >= 0 && y + dy < line.h) line.d[(y + dy) * line.w + lx + x] = 1;
    lx += m.w + gap;
  });
  const f = treat(line, 'gilt', { rim: ['banner', 6], rimW: 1, drop: 2, dropCell: ['banner', 6] });
  const sx = Math.round(CX - f.g.w / 2);
  const sy = y0 + Math.round((H - cap) / 2) - 2;
  for (let y = 0; y < f.g.h; y++)
    for (let x = 0; x < f.g.w; x++) {
      const c = f.g.d[y * f.g.w + x] as number;
      if (c) put(g, sx + x, sy + y + arc(sx + x), c);
    }
}

let base: TGrid | null = null;

function backdrop(): TGrid {
  const g = tgrid(SCREEN_W, SCREEN_H);
  field(g);
  rope(g, 8, 8);
  // Corner bosses on the rope.
  for (const [x, y] of [
    [12, 12],
    [SCREEN_W - 13, 12],
    [12, SCREEN_H - 13],
    [SCREEN_W - 13, SCREEN_H - 13],
  ] as const)
    for (let j = -8; j <= 8; j++)
      for (let i = -8; i <= 8; i++) {
        const d = Math.hypot(i, j);
        if (d <= 8) put(g, x + i, y + j, X('gilt', d > 7 ? 6 : i + j < -4 ? 0 : i + j < 2 ? 2 : 4));
      }
  pine(g, 48, SH.top + 236, 190);
  pine(g, SCREEN_W - 48, SH.top + 236, 190);
  return g;
}

export function drawD(t: number): Frame {
  base ??= backdrop();
  const g = tgrid(SCREEN_W, SCREEN_H);
  g.d.set(base.d);
  const ph = (t % LOOP) / LOOP;
  shield(g, ph);
  crest(g, ph);
  ribbon(g);
  // A glint sweeps across the gold once a loop: a diagonal band a step brighter.
  const sweep = ph * 1.6 - 0.3;
  for (let y = 0; y < SCREEN_H; y++)
    for (let x = 0; x < SCREEN_W; x++) {
      const d = (x + y * 0.5) / (SCREEN_W + SCREEN_H * 0.5) - sweep;
      if (Math.abs(d) > 0.025) continue;
      const c = at(g, x, y);
      if (!c) continue;
      const m = xmatOf(c);
      if ((m === 'gilt' || m === 'gold') && (c & 7) > 0 && (c & 7) < 6)
        put(g, x, y, (c & ~7) | ((c & 7) - (Math.abs(d) < 0.01 ? 2 : 1)));
    }
  void hash;
  const glows: BandGlow[] = [{ x: CX, y: SH.top + 40, r: 40, strength: 0.18, bands: 2 }];
  return { g, glows };
}

export const TITLE_D: Title = {
  id: 'D',
  name: 'The emblem',
  pal: xpal('day'),
  draw: drawD,
  ui: 'continue',
  uiTop: 664,
  animated: true,
  loop: LOOP,
};
