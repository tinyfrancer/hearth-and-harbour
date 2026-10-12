/**
 * Thistlewood Burrow's light pieces and ground effects (B20), drawn for lane
 * C to lay where its rules put them:
 *
 * - **A spore cloud** (`sporeCloud`): the puffs' cloud hanging over the
 *   floor, in frames that drift. It must read as "do not stand here" and
 *   still let the floor show (lane C draws its marks and telegraphs over it
 *   at full brightness), so it is never a filled shape: a ring of hollow
 *   puffs of sulphur-green spores, back ones raised behind and front ones
 *   lower, motes rising inside it, the floor seen through every gap.
 * - **The king going under** (`burrowMound`): a ridge of churned earth that
 *   travels; and **coming up** (`burrowEruption`): the ground cracking,
 *   bursting, clods flying, a hole ringed with spoil.
 * - **The hero's own small light** (`HERO_LIGHT2`), as numbers.
 *
 * Every piece is a picture and an anchor (its middle on the floor): draw it
 * at (x - anchor.x, y - anchor.y).
 */
import { hash, outlined, put, tgrid, type Picture2, type TGrid } from '../town2/cells';
import { cell } from './cave';
import { dome } from './kit';
import { clumps } from '../town2/texture';

/** A piece of a ground effect: its picture and where its middle on the floor is. */
export interface BurrowPiece2 {
  readonly picture: Picture2;
  readonly anchor: { readonly x: number; readonly y: number };
}

const lim = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
const TAU = Math.PI * 2;

/** How flat the floor lies (its pools' and marks' squash). */
const SQUASH = 0.62;

/** Frames of a spore cloud's drift, and how long each shows. */
export const SPORE_CLOUD2_FRAMES = 6;
export const SPORE_CLOUD2_FRAME_MS = 140;

/**
 * A puff of spores: an irregular soft lump, its spores in clumps with the
 * floor showing between them (never filled), denser at its rim and lit along
 * its top, so it reads as a cloud and not a shape painted on the floor.
 */
function puff(g: TGrid, cx: number, cy: number, r: number, front: boolean, k: number): void {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
      const rr = r * (1 + Math.sin(a * 3 + k) * 0.12 + Math.sin(a * 5 + k * 2) * 0.06);
      const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.15);
      if (d > rr) continue;
      const rim = d > rr - 1.6;
      const keep = rim
        ? hash(x, y, 1101 + k) < 0.5
        : clumps(x + k * 7, y, 1105) > (front ? 0.57 : 0.63);
      if (!keep) continue;
      const lit = -Math.sin(a + 0.6) * (rim ? 1 : 0.5);
      put(g, x, y, cell('spore', lim((front ? 2.4 : 3.3) - lit * 1.3 + (rim ? 0 : 0.7), 1, 5)));
    }
}

/**
 * A spore cloud whose footprint on the floor is `radius` across each way
 * (lane C's cloud radius), squashed as the floor is seen, its puffs rising a
 * little over it. `frame` drifts it (`SPORE_CLOUD2_FRAMES`). Never filled:
 * the floor shows through.
 */
export function sporeCloud(radius: number, frame = 0): BurrowPiece2 {
  const r = Math.max(10, Math.round(radius));
  const f = ((Math.floor(frame) % SPORE_CLOUD2_FRAMES) + SPORE_CLOUD2_FRAMES) % SPORE_CLOUD2_FRAMES;
  const rise = Math.round(r * 0.55);
  const W = r * 2 + 12;
  const H = Math.round(r * SQUASH * 2) + rise + 12;
  const g = tgrid(W, H);
  const cx = W / 2;
  const cy = H - 6 - Math.round(r * SQUASH);
  const n = Math.max(7, Math.round(r / 4.2));
  const spin = (f / SPORE_CLOUD2_FRAMES) * (TAU / n);
  // The back puffs first (behind), then motes, then the front puffs.
  const puffs: [number, number, number, boolean][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + spin;
    const pr = r * (0.2 + 0.08 * hash(i, 1, 1102)) + 2;
    const bob = Math.sin(a * 2 + f * 1.05 + i) * 1.2;
    const px = cx + Math.cos(a) * (r - pr * 0.7);
    const py = cy + Math.sin(a) * (r - pr * 0.7) * SQUASH - pr * 0.6 + bob;
    puffs.push([px, py, pr, Math.sin(a) > 0]);
  }
  for (const [px, py, pr, front] of puffs)
    if (!front) puff(g, px, py - rise * 0.35, pr, false, Math.round(px));
  // A low haze of spores over the whole of its floor, in clumps, the floor showing through.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x + 0.5 - cx) / (r - 2), (y + 0.5 - cy) / ((r - 2) * SQUASH));
      if (d > 1) continue;
      if (clumps(x + f * 2, y - f, 1106) > 0.68 + d * 0.06)
        put(g, x, y, cell('spore', d < 0.6 ? 4 : 3));
    }
  // Motes rising through the middle, each on its own loop.
  const motes = Math.round(r * 0.9);
  for (let i = 0; i < motes; i++) {
    const a = hash(i, 2, 1103) * TAU;
    const d = Math.sqrt(hash(i, 3, 1103)) * (r - 3);
    const t = (hash(i, 4, 1103) + f / SPORE_CLOUD2_FRAMES) % 1;
    const x = Math.round(cx + Math.cos(a) * d + Math.sin(t * TAU) * 1.5);
    const y = Math.round(cy + Math.sin(a) * d * SQUASH - t * rise);
    put(g, x, y, cell('spore', t > 0.75 ? 3 : i % 3 === 0 ? 0 : 1));
  }
  for (const [px, py, pr, front] of puffs) if (front) puff(g, px, py, pr, true, Math.round(px));
  // A faint ring on the floor where it settles: spores in a broken line.
  for (let i = 0; i < r * 5; i++) {
    const a = (i / (r * 5)) * TAU;
    if (hash(i, f, 1104) < 0.55) continue;
    put(
      g,
      Math.round(cx + Math.cos(a) * r),
      Math.round(cy + Math.sin(a) * r * SQUASH),
      cell('spore', 3),
    );
  }
  return { picture: { grid: g, glows: [] }, anchor: { x: Math.round(cx), y: cy } };
}

/* ------------------------------------------------------------ going under */

/** Frames of the mound travelling, and of the eruption. */
export const BURROW_MOUND2_FRAMES = 3;
export const BURROW_ERUPTION2_FRAMES = 4;
export const BURROW_ERUPTION2_FRAME_MS = 110;

/** A clod of earth: a little lump lit on its upper left. */
function clod(g: TGrid, x: number, y: number, r: number, k: number): void {
  dome(g, x, y, r, r * 0.8, k % 3 === 0 ? 'clay' : 'soil', 2.6, 1.6);
}

/**
 * The ridge of churned earth the king raises as he goes under the floor,
 * about two tiles long, its earth heaving a little each frame: a travelling
 * hump, clods shaken loose at its edges, a root torn up across it.
 */
export function burrowMound(frame = 0): BurrowPiece2 {
  const f =
    ((Math.floor(frame) % BURROW_MOUND2_FRAMES) + BURROW_MOUND2_FRAMES) % BURROW_MOUND2_FRAMES;
  const W = 52;
  const H = 20;
  const g = tgrid(W, H);
  const cx = W / 2;
  // The hump: soil, lit along its crest, a dark furrow along its foot.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - cx) / 22;
      if (Math.abs(u) > 1) continue;
      const crest = H - 4 - (1 - u * u) * (9 + Math.sin(x * 0.5 + f * 2) * 1.2);
      if (y < crest || y > H - 3) continue;
      const lit = (crest + 2 - y) * 0.6 - u * 0.8;
      const lump = hash(Math.floor((x + f * 3) / 3), Math.floor(y / 3), 1111) < 0.25 ? 1 : 0;
      put(g, x, y, cell('soil', lim(3 - lit + lump, 1, 5)));
    }
  for (let x = 4; x < W - 4; x++) put(g, x, H - 2, cell('soil', 6));
  // Clods shaken loose either side.
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const x = cx + side * (16 + hash(i, f, 1112) * 8);
    const y = H - 3 - hash(i, f, 1113) * 4;
    clod(g, x, y, 1.6, i);
  }
  // A torn root across its back.
  for (let x = 14; x < 30; x++)
    put(g, x + f, Math.round(9 + Math.sin(x * 0.6) * 1.5), cell('root', 2));
  return { picture: { grid: outlined(g), glows: [] }, anchor: { x: Math.round(cx) + 1, y: H - 1 } };
}

/**
 * The king coming up through the floor, in four frames: the ground bulging
 * and cracking; bursting, clods flung up; clods high and falling, the hole
 * open; the hole ringed with spoil. About three tiles across at its widest.
 */
export function burrowEruption(frame = 0): BurrowPiece2 {
  const f =
    ((Math.floor(frame) % BURROW_ERUPTION2_FRAMES) + BURROW_ERUPTION2_FRAMES) %
    BURROW_ERUPTION2_FRAMES;
  const W = 72;
  const H = 64;
  const g = tgrid(W, H);
  const cx = W / 2;
  const cy = H - 14;
  const ring = (rx: number, rIn: number, height: number) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / (rx * SQUASH);
        const d = Math.hypot(dx, dy);
        if (d > 1) continue;
        const inner = d < rIn / rx;
        if (inner) {
          put(g, x, y, cell('shade', dy < 0 ? 4 : 3));
          continue;
        }
        const lit = -dx * 0.5 - dy * 0.9 + (height > 0 ? 0.4 : 0);
        put(
          g,
          x,
          y,
          cell('soil', lim(3 - lit * 1.6 + (hash(x >> 1, y >> 1, 1121) < 0.2 ? 1 : 0), 1, 5)),
        );
      }
  };
  if (f === 0) {
    // A bulge, cracks running out from it.
    ring(16, 0, 1);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + 0.3;
      for (let i = 4; i < 20 + (k % 3) * 4; i++) {
        const x = Math.round(cx + Math.cos(a) * i + Math.sin(i * 0.7 + k) * 1.2);
        const y = Math.round(cy + Math.sin(a) * i * SQUASH);
        put(g, x, y, cell('soil', 6));
      }
    }
  } else {
    ring(f === 1 ? 20 : 26, f === 1 ? 6 : 11, 1);
    // Clods flung up, then falling back, a torn root among them.
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + hash(i, 0, 1122);
      const spread = (f === 1 ? 12 : f === 2 ? 22 : 28) * (0.6 + hash(i, 1, 1122) * 0.5);
      const up = f === 1 ? 18 + hash(i, 2, 1122) * 20 : f === 2 ? 24 + hash(i, 2, 1122) * 14 : 0;
      const x = cx + Math.cos(a) * spread;
      const y = cy + Math.sin(a) * spread * SQUASH - up;
      if (y < 3 || y > H - 3) continue;
      clod(g, x, y, f === 3 ? 1.6 : 2.2 + hash(i, 3, 1122), i);
    }
    if (f < 3)
      for (let i = 0; i < 9; i++)
        put(
          g,
          Math.round(cx - 6 + i),
          Math.round(cy - 18 - f * 6 + Math.sin(i) * 2),
          cell('root', 2),
        );
  }
  return {
    picture: { grid: outlined(g), glows: [] },
    anchor: { x: Math.round(cx) + 1, y: cy + 1 },
  };
}

/**
 * The hero's own small light (lane C's `HERO_POOL`, 36 across each way, its
 * middle four above his feet): a faint warm glow round him, as a light
 * (`Light2`, at his feet: move it with `lightAt`). A darker day draws it
 * smaller (lane C's `DARKER_HERO`).
 */
export const HERO_LIGHT2 = {
  x: 0,
  y: -26,
  radius: 34,
  strength: 0.22,
  drop: 22,
  pool: 36,
  flicker: 0.06,
} as const;
