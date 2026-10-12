/**
 * Thistlewood Burrow's ground (B20): the same tile kinds, wears and joins as
 * the grotto's (tiles.ts composes every look), drawn as a warren dug under
 * the old forest, so it never reads as a sea cave recoloured:
 *
 * - **Walls** are dug earth, not rock: beds of soil and paler clay dipping
 *   across the room, stones lodged in them, a lattice of pale roots grown
 *   down through the face from the forest above, and the older tunnels shored
 *   with worm-eaten timbers (posts and a beam under the lip). Fungus grows
 *   at the timbers' feet and along the face's foot and glows cold in the
 *   dark (`glowcap`, which the dark never dims: `NIGHT_EXEMPT`).
 * - **Floors** are trodden earth with pebbles, surface roots, moss cushions
 *   and drifts of leaf litter (`rock_floor`); a deep carpet of fallen leaves
 *   (`sand`); a bed of moss (`wet_sand`); and the badger's flagstones
 *   (`planks`). Higher spills over lower as everywhere: leaves over moss over
 *   earth. A room laid out in lane C's rows (`.` the floor) is earth; its
 *   other letters choose the rest.
 * - **The top** of a wall seen from above is the dark mass of the forest's
 *   floor over the warren: humped earth, roots across it, moss.
 *
 * Palette `CAVE_BURROW` (dusk) in the light, `burrowNight(level)` beyond it.
 * Floors never use red or orange: the litter is dun and olive.
 */
import { hash, type Cell, type TGrid } from '../town2/cells';
import { noise } from '../town2/texture';
import type { Glow } from '../raster';
import { cell } from './cave';
import { FUNGUS2_RGB } from './light';
import { cracked, cround, lumpAt, TILE2, type TileLook, type Tile2Kind } from './tiles';

// Read inside functions, never at load: tiles.ts and this file import each other (B17's lesson).
const tile = (): number => TILE2;
const lim = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/* ------------------------------------------------------------------ floors */

/** A pebble's pixel near (x, y), if one lies there: jittered on a seven-pixel grid, a few of them. */
function pebbleAt(x: number, y: number, k: number, share: number): Cell | 0 {
  const gx = Math.floor(x / 7);
  const gy = Math.floor(y / 6);
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i;
      const cy = gy + j;
      if (hash(cx, cy, k) > share) continue;
      const px = (cx + 0.2 + 0.6 * hash(cx, cy, k + 1)) * 7;
      const py = (cy + 0.2 + 0.6 * hash(cx, cy, k + 2)) * 6;
      const r = 1.1 + hash(cx, cy, k + 3) * 0.9;
      const dx = x + 0.5 - px;
      const dy = y + 0.5 - py;
      const d = Math.hypot(dx / 1.3, dy);
      if (d < r) return cell('clay', dx + dy < -0.4 ? 1 : dx + dy < 0.8 ? 2 : 4);
      // Its little shadow below and to the right.
      if (Math.hypot((dx - 1) / 1.3, dy - 1) < r) return cell('soil', 5);
    }
  return 0;
}

/**
 * A leaf of the litter at (x, y) if one covers it: the topmost of the leaves
 * near it, each a pointed blade lying its own way with a midrib, lit along
 * its upper edge and shadowed along its lower, its own tone, so a carpet of
 * them reads leaf by leaf.
 */
function leafAt(x: number, y: number, k: number): { t: number } | null {
  const SX = 6;
  const SY = 5;
  const gx = Math.floor(x / SX);
  const gy = Math.floor(y / SY);
  let best: { t: number; z: number } | null = null;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i;
      const cy = gy + j;
      const px = (cx + hash(cx, cy, k)) * SX;
      const py = (cy + hash(cx, cy, k + 1)) * SY;
      const a = (hash(cx, cy, k + 2) - 0.5) * 2.2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const dx = x + 0.5 - px;
      const dy = y + 0.5 - py;
      const u = dx * ca + dy * sa;
      const v = -dx * sa + dy * ca;
      // A blade 9 long and 4 wide, pointed at both ends.
      const L = 4.4;
      const half = 2 * (1 - (u / L) ** 2);
      if (Math.abs(u) > L || Math.abs(v) > half + 0.6) continue;
      const z = hash(cx, cy, k + 3);
      if (best && best.z > z) continue;
      const tone = Math.floor(hash(cx, cy, k + 4) * 3);
      // Its edge: a dark line along its lower side (it lies on the one below), lit along its upper.
      let t: number;
      if (Math.abs(v) > half) t = v > 0 ? 5 : 3.6 + tone * 0.5;
      else if (v < -half * 0.45) t = 1 + tone * 0.9;
      else if (Math.abs(v) < 0.45 && Math.abs(u) < L - 1) t = 2.4 + tone * 0.9;
      else t = 1.8 + tone * 0.9;
      best = { t, z };
    }
  return best ? { t: best.t } : null;
}

/** A root running along the floor's surface: a band where a slow noise crosses its middle. */
function surfaceRoot(x: number, y: number): number {
  const r = noise(x, y, 26, 521);
  const on = noise(x, y, 48, 522) > 0.62;
  if (!on) return 0;
  const d = Math.abs(r - 0.5);
  if (d > 0.022) return 0;
  // Which side of the root's middle: the upper lip lit, the lower in shade.
  const up = noise(x, y - 1, 26, 521);
  return (up - 0.5) * (r - 0.5) < 0 || d < 0.008 ? 2 : r > up ? 4 : 3;
}

/** Trodden earth: soft patches, pebbles, a root breaking the surface, moss cushions, drifted leaves. */
function earthAt(x: number, y: number): Cell {
  const v = noise(x, y, 19, 501) * 0.6 + noise(x, y, 7, 502) * 0.4;
  let t = cround(2.75 + (v - 0.5) * 0.95, x, y, 503, 0.6);
  // A drift of leaves lying in the hollows.
  const drift = noise(x, y, 23, 505) * 0.75 + noise(x, y, 6, 506) * 0.25;
  if (drift > 0.68) {
    const leaf = leafAt(x, y, 507);
    if (leaf && hash(x >> 2, y >> 1, 508) < (drift - 0.68) * 7)
      return cell('litter', lim(leaf.t + 0.4, 1, 5));
  }
  // Moss in cushions where it is damp.
  const damp = noise(x, y, 27, 511) * 0.7 + noise(x, y, 5, 512) * 0.3;
  if (damp > 0.7) {
    const l = lumpAt(x, y, 6, 513);
    if (damp > 0.73 || l.lit > 0) return cell('moss', lim(3.3 - l.lit * 1.1 + l.tilt * 0.3, 2, 5));
    return cell('soil', 4);
  }
  const root = surfaceRoot(x, y);
  if (root) return cell('root', root);
  const p = pebbleAt(x, y, 515, 0.045);
  if (p) return p;
  // Prints and scuffs: a few darker crumbs, a few lit grains.
  const gr = hash(x, y, 516);
  if (gr < 0.025) t += 1;
  else if (gr > 0.985) t -= 1;
  return cell('soil', lim(t, 2, 4));
}

/** A deep carpet of fallen leaves: blades overlapping, the earth showing dark between them. */
function litterAt(x: number, y: number): Cell {
  const leaf = leafAt(x, y, 531);
  if (leaf) {
    const v = noise(x, y, 15, 532);
    return cell('litter', lim(leaf.t + (v - 0.5) * 0.8, 1, 5));
  }
  return cell('soil', hash(x, y, 533) < 0.4 ? 4 : 5);
}

/** A bed of moss: cushions lit on their upper left, dark where they meet, a few seed heads. */
function mossAt(x: number, y: number): Cell {
  // Soft cushions: each lit on its upper left, the gaps between them only darker, never ruled.
  const l = lumpAt(x, y, 7, 541);
  const v = noise(x, y, 17, 543);
  const t = 2.8 - l.lit * 1.2 + (noise(x, y, 4, 542) - 0.5) * 0.8 + (v - 0.5) * 0.9;
  if (hash(x, y, 544) < 0.012) return cell('litter', 1);
  return cell('moss', lim(cround(t, x, y, 545, 0.5), 1, 4));
}

/**
 * The badger's flagstones: big worn flags, wider than tall, each lit on its
 * upper left lip, earth and moss in the joints, hollows worn where he walks.
 */
function flagsAt(x0: number, y0: number): Cell {
  const x = x0 + Math.round((noise(x0, y0, 11, 551) - 0.5) * 3);
  const y = y0 + Math.round((noise(x0, y0, 11, 552) - 0.5) * 3);
  const S = 15;
  if (cracked(x, y, S, 553, false))
    return noise(x0, y0, 7, 554) > 0.55 ? cell('moss', 4) : cell('soil', 5);
  if (cracked(x, y - 1, S, 553, false) || cracked(x - 1, y, S, 553, false)) return cell('flag', 1);
  if (cracked(x, y + 1, S, 553, false) || cracked(x + 1, y, S, 553, false)) return cell('flag', 4);
  const l = lumpAt(x, y, S, 553);
  let t = 2.5 + l.tilt * 0.45 + (noise(x0, y0, 8, 555) - 0.5) * 0.9;
  if (noise(x0, y0, 5, 556) > 0.82) t += 1;
  if (hash(x0, y0, 557) < 0.02) t += 1;
  return cell('flag', lim(cround(t, x0, y0, 558, 0.5), 1, 4));
}

/** Water seeping into a hollow: still and black, a cold glint where the fungus shows in it. */
function seepAt(x: number, y: number): Cell {
  const v = noise(x, y, 14, 561);
  if (noise(x, y * 3, 5, 562) > 0.86 && hash(x, y, 563) < 0.4) return cell('slate', 3);
  return cell('slate', lim(4.5 + (v - 0.5) * 1.2, 4, 5));
}

/** Deep water: darker still. */
function deepAt(x: number, y: number): Cell {
  const v = noise(x, y, 18, 571);
  if (noise(x, y * 4, 5, 572) > 0.9 && hash(x, y, 573) < 0.4) return cell('slate', 4);
  return cell('slate', lim(5 + (v - 0.5) * 1.2, 4, 6));
}

/** The flagstones' kerb (a deck's beams in the composition) is the flag's own stone. */
const flagEdge = flagsAt;

/**
 * The top of a wall seen from above: the forest's floor over the warren,
 * humped dark earth, a root or two across it, moss on the humps. Quiet.
 */
function topAt(x: number, y: number): Cell {
  const r = noise(x, y, 21, 581);
  if (Math.abs(r - 0.5) < 0.02 && noise(x, y, 37, 582) > 0.55)
    return cell('root', noise(x, y - 1, 21, 581) > r ? 4 : 5);
  if (cracked(x, y, 14, 583, true) && noise(x, y, 5, 584) < 0.5) return cell('soil', 6);
  const l = lumpAt(x, y, 14, 583);
  if (l.lit > 0.6 - l.tilt * 0.1)
    return noise(x, y, 9, 585) > 0.62 ? cell('moss', 5) : cell('soil', 4);
  if (l.lit < -0.72) return cell('soil', 6);
  return cell('soil', 5);
}

/* ------------------------------------------------------------------- walls */

/** Rows of the face, from the top of its upper tile (0) to the floor (48). */
const FACE = 48;

/** Which bed of the earth a row of the face is in: soil or clay, 3 to 8 rows, dipping and bending. */
function bedAt(x: number, wy: number): { bed: number; at: number; size: number } {
  const w =
    wy +
    Math.round(
      -x * 0.05 +
        (noise(x, 0, 71, 591) - 0.5) * 12 +
        (noise(x, 0, 29, 592) - 0.5) * 6 +
        (noise(x, 0, 9, 593) - 0.5) * 1.8,
    );
  const start = Math.floor(w / 72) * 72;
  let top = start;
  let bed = Math.floor(start / 72) * 100;
  let size = 5;
  for (;;) {
    size = 3 + Math.floor(hash(bed, 0, 594) * 6);
    if (top + size > w) break;
    top += size;
    bed++;
  }
  return { bed, at: w - top, size };
}

/** A stone lodged in the face near (x, wy), shaded as a dome; a dark pocket under it. */
function stoneAt(x: number, wy: number): Cell | 0 {
  const gx = Math.floor(x / 11);
  const gy = Math.floor(wy / 9);
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i;
      const cy = gy + j;
      if (hash(cx, cy, 601) > 0.09) continue;
      const px = (cx + 0.2 + 0.6 * hash(cx, cy, 602)) * 11;
      const py = (cy + 0.2 + 0.6 * hash(cx, cy, 603)) * 9;
      const rx = 2 + hash(cx, cy, 604) * 2.6;
      const ry = rx * (0.6 + hash(cx, cy, 605) * 0.3);
      const nx = (x + 0.5 - px) / rx;
      const ny = (wy + 0.5 - py) / ry;
      const d = nx * nx + ny * ny;
      if (d <= 1) {
        const lit = -(nx * 0.6 + ny * 0.8);
        return cell('clay', lim(2.6 - lit * 1.5, 1, 5));
      }
      // The pocket it sits in: darker earth just under its lower edge.
      const ny2 = (wy - 0.8 + 0.5 - py) / ry;
      if (nx * nx + ny2 * ny2 <= 1.15 && ny > 0) return cell('soil', 6);
    }
  return 0;
}

/**
 * A root of the lattice grown down through the face: two families of
 * leaning lines, each wandering, only where a slow noise lets it, so the
 * roots cross in places and leave bare earth in others. 0 for none, else
 * the step (its left lip lit).
 */
function rootIn(x: number, H: number, wy: number): number {
  for (const [lean, k, gap] of [
    [0.45, 611, 19],
    [-0.35, 612, 27],
  ] as const) {
    const u = x + H * lean + (noise(x, wy, 13, k) - 0.5) * 9;
    const band = Math.floor(u / gap);
    if (hash(band, 0, k) > 0.62) continue;
    if (noise(band * 7, wy, 17, k + 10) < 0.35) continue;
    const off = u - band * gap - (3 + hash(band, 1, k) * (gap - 8));
    const thick = 1.8 + hash(band, 2, k) * 1.6 - H / 60;
    if (off >= 0 && off < thick + 0.5) return off < 0.9 ? 1 : off < thick - 0.4 ? 2 : 4;
    // Its shadow on the earth to its right.
    if (off >= thick + 0.5 && off < thick + 1.5) return -1;
  }
  return 0;
}

/** Shoring timbers: where along the face a pair of posts stands, and the beam between them. */
interface Shore {
  /** The posts' left columns (each 6 wide). */
  readonly a: number;
  readonly b: number;
  readonly band: number;
}

const SHORE_EVERY = 168; // a pair of posts every seven tiles, give or take
function shoreAt(x: number): Shore | null {
  const band = Math.floor(x / SHORE_EVERY);
  if (hash(band, 0, 621) > 0.7) return null;
  const a = band * SHORE_EVERY + 18 + Math.floor(hash(band, 1, 621) * 70);
  return { a, b: a + 44 + Math.floor(hash(band, 2, 621) * 16), band };
}

/** A worm-eaten timber's pixel: lit left edge, grain, the worm's holes, a dark right edge. */
function timber(x: number, H: number, left: number, w: number): Cell {
  const i = x - left;
  if (i === 0) return cell('wood', 2);
  if (i === w - 1) return cell('wood', 6);
  if (i === w - 2) return cell('wood', 5);
  // Worm holes: dark specks in clusters, a pale rim under each.
  if (noise(x, H, 4, 631) > 0.7 && hash(x, H, 632) < 0.35) return cell('wood', 6);
  if (noise(x, H, 4, 631) > 0.7 && hash(x, H - 1, 632) < 0.35) return cell('wood', 2);
  const grain = (i + Math.round(noise(x, H, 9, 633) * 2)) % 3 === 0;
  return cell('wood', grain ? 5 : i < w / 2 ? 3 : 4);
}

/** A cluster of glowing fungus at the foot of the face or a timber, as a few small caps. */
interface Clump {
  readonly x: number;
  readonly H: number;
  readonly n: number;
  readonly k: number;
}

/** Where fungus grows on the face, along its whole length: by hash bands, never at random. */
function clumpsNear(x: number): Clump[] {
  const out: Clump[] = [];
  const band = Math.floor(x / 37);
  for (let b = band - 1; b <= band + 1; b++) {
    if (hash(b, 0, 641) > 0.42) continue;
    out.push({
      x: b * 37 + 6 + Math.floor(hash(b, 1, 641) * 25),
      H: 36 + Math.floor(hash(b, 2, 641) * 8),
      n: 2 + Math.floor(hash(b, 3, 641) * 3),
      k: b,
    });
  }
  // At each shoring post's foot, a clump too.
  for (const s of [shoreAt(x - SHORE_EVERY), shoreAt(x), shoreAt(x + SHORE_EVERY)])
    if (s && hash(s.band, 4, 641) < 0.8) out.push({ x: s.b + 11, H: 42, n: 3, k: s.band + 900 });
  return out;
}

/** A fungus cap's pixel in a clump at (x, H), if one is there: domed cap lit cold, a pale stem. */
function fungusAt(x: number, H: number): Cell | 0 {
  for (const c of clumpsNear(x)) {
    for (let i = 0; i < c.n; i++) {
      const cx = c.x + Math.round((hash(c.k, i, 651) - 0.5) * 10);
      const top = c.H - Math.floor(hash(c.k, i, 652) * 5);
      const r = 1 + Math.floor(hash(c.k, i, 653) * 2);
      const dx = x - cx;
      const dy = H - top;
      // The stem, under the cap.
      if (dx === 0 && dy > 0 && dy <= 2 + r) return cell('stalk', 3);
      // The cap: a flat dome, its top lit.
      if (dy >= -r && dy <= 0 && Math.abs(dx) <= r + 1 + dy) {
        return cell('glowcap', dy === -r ? 1 : dx < 0 ? 2 : 3);
      }
    }
  }
  return 0;
}

/**
 * The face of the earth at a row `H` of its 48 (0 the top of the upper tile):
 * beds of soil and clay, stones in them, the lattice of roots over them,
 * timbers where the tunnel is shored, fungus low down. Darker high up, lit by
 * the floor below, as the grotto's.
 */
function earthFace(x: number, H: number, wy: number): Cell {
  // The lip: the forest floor's edge at the top, roots hanging over it.
  const lip = 2 + Math.round((noise(x, 0, 7, 661) - 0.5) * 4);
  if (H < lip - 1) return topAt(x, wy);
  if (H === lip - 1) return cell('soil', 3);
  if (H === lip || (H === lip + 1 && hash(x, 0, 662) < 0.7)) return cell('soil', 6);
  // Fine roots hanging from the lip, leaning a little, darkening to their tips.
  const k = H - lip - 2;
  const hx = x - Math.floor(Math.max(0, k) / 3);
  const len = 3 + noise(hx, 4, 2, 663) * 9;
  if (H < lip + 12 && noise(hx, 3, 3, 664) > 0.74 && H - lip < len)
    return cell('root', k <= 0 ? 3 : H - lip >= len - 1 ? 5 : 4);
  // The foot: dark, damp earth, a few leaves blown against it.
  if (H >= FACE - 2) return cell('soil', H === FACE - 1 ? 6 : 5);
  if (H >= FACE - 4 && hash(x, H, 665) < 0.25) return cell('litter', 3);
  const f = fungusAt(x, H);
  if (f) return f;
  // Shoring: a pair of timber posts and a beam between them under the lip.
  const s = shoreAt(x);
  if (s) {
    const beamTop = lip + 3;
    const inPost = (x >= s.a && x < s.a + 8) || (x >= s.b && x < s.b + 8);
    if (x >= s.a - 2 && x < s.b + 10 && H >= beamTop && H < beamTop + 6) {
      if (H === beamTop) return cell('wood', 2);
      if (H === beamTop + 5) return cell('wood', 6);
      if (noise(x, H, 4, 667) > 0.72 && hash(x, H, 668) < 0.4) return cell('wood', 6);
      return cell(
        'wood',
        (x + Math.round(noise(x, H, 11, 669) * 3)) % 5 === 0 ? 5 : H === beamTop + 1 ? 3 : 4,
      );
    }
    if (H === beamTop + 6 && x >= s.a - 2 && x < s.b + 10) return cell('soil', 6);
    if (inPost && H > beamTop) return timber(x, H, x < s.a + 8 ? s.a : s.b, 8);
    // The posts' shadow on the earth to their right.
    if ((x === s.a + 8 || x === s.b + 8) && H > beamTop) return cell('soil', 6);
  }
  const root = rootIn(x, H, wy);
  if (root > 0) return cell('root', lim(root + (1 - H / FACE) * 1.2, 1, 5));
  const stone = stoneAt(x, wy);
  if (stone) return stone;
  const { bed, at, size } = bedAt(x, wy);
  const clay = hash(bed, 1, 671) < 0.36;
  const mat = clay ? 'clay' : 'soil';
  // Each bed lit along its top and shadowed under, its own tone, worn into hollows.
  const tone = (hash(bed, 2, 672) - 0.5) * 0.9;
  let t =
    2.9 + (1 - H / FACE) * 1.5 + tone + (noise(x, wy, 8, 673) - 0.5) * 0.8 + (root < 0 ? 1.2 : 0);
  if (at === 0 && noise(x, wy, 9, 674) > 0.35) t -= 1;
  if (at === size - 1 && noise(x, wy, 9, 675) > 0.3) t += 1.3;
  if (noise(x, wy, 6, 676 + (bed % 5)) > 0.8) t += 1;
  return cell(mat, lim(cround(t, x, wy, 677, 0.6), 1, 5));
}

const faceHighAt = (x: number, y: number, wy: number): Cell => earthFace(x, y, wy);
const faceAt = (x: number, y: number, wy: number): Cell => earthFace(x, y + 24, wy);

/* ------------------------------------------------------------------ details */

/** Now and then a detail: a toadstool, a snail shell, a feather, an acorn, a fern, a glowing button. */
function details(g: TGrid, kind: Tile2Kind, wear: number): void {
  const P = tile();
  const set = (x: number, y: number, c: Cell) => {
    if (x >= 0 && y >= 0 && x < P && y < P) g.d[y * P + x] = c;
  };
  const r = (i: number) => hash(wear, i, 690 + kind.length);
  const cx = 7 + Math.floor(r(1) * 10);
  const cy = 8 + Math.floor(r(2) * 9);
  if (kind === 'rock_floor' || kind === 'wet_sand' || kind === 'sand') {
    if (wear === 3) {
      // A ring of little glowing caps, each a domed top on a pale stem, its shadow beside it.
      for (const [dx, dy, big] of [
        [0, 0, 1],
        [4, 2, 0],
        [-1, 4, 0],
      ] as const) {
        set(cx + dx, cy + dy, cell('glowcap', 1));
        set(cx + dx + 1, cy + dy, cell('glowcap', 2));
        if (big) set(cx + dx + 2, cy + dy, cell('glowcap', 3));
        set(cx + dx + 1, cy + dy + 1, cell('stalk', 3));
        set(cx + dx + 2, cy + dy + 1, cell('soil', 5));
      }
    } else if (wear === 9) {
      // An acorn and its cup.
      set(cx, cy, cell('soil', 1));
      set(cx + 1, cy, cell('soil', 2));
      set(cx, cy + 1, cell('soil', 2));
      set(cx + 1, cy + 1, cell('soil', 3));
      set(cx - 1, cy - 1, cell('bark', 3));
      set(cx, cy - 1, cell('bark', 2));
      set(cx + 1, cy - 1, cell('bark', 4));
      set(cx + 1, cy + 2, cell('soil', 5));
    } else if (wear === 14) {
      // An empty snail shell, a spiral, lit on its left.
      const rows = ['.ab.', 'abcb', 'bcdc', '.cd.'];
      rows.forEach((row, j) => {
        for (let i = 0; i < 4; i++) {
          const ch = row[i];
          if (ch === '.') continue;
          set(cx + i, cy + j, cell('clay', ch === 'a' ? 0 : ch === 'b' ? 1 : ch === 'c' ? 3 : 5));
        }
      });
    } else if (wear === 6 && kind === 'rock_floor') {
      // A dropped feather, its quill pale.
      for (let i = 0; i < 6; i++) {
        set(cx + i, cy - (i >> 1), cell('mothwing', i === 0 ? 0 : 2));
        set(cx + i, cy + 1 - (i >> 1), cell('mothwing', 4));
      }
    } else if (wear === 17) {
      // A curl of fern.
      for (let i = 0; i < 6; i++) {
        set(cx + i, cy + (i % 2), cell('moss', 2));
        set(cx + i, cy - 1 + (i % 2), cell('moss', i % 2 ? 3 : 1));
        set(cx + i, cy + 1 + (i % 2), cell('moss', 5));
      }
    }
  } else if (kind === 'planks' && wear === 2) {
    // A crack across a flag, darkening down it.
    for (let x = 7; x < 16; x++) set(x, 12 + ((x * 3) % 2), cell('flag', x % 3 === 0 ? 4 : 5));
  }
}

/* ------------------------------------------------------------------ glows */

/**
 * The fungus's glows within a tile of the face (`kind` `wall_face` or
 * `wall_face_high`): one per clump whose caps
 * fall in it (the tile's left at room column `x0`, in pixels), in the tile's own coordinates, a cool light that shines in the
 * dark. Empty for every other kind.
 */
export function burrowFungusGlows(kind: string, x0: number): Glow[] {
  if (kind !== 'wall_face' && kind !== 'wall_face_high') return [];
  const P = tile();
  const H0 = kind === 'wall_face' ? 24 : 0;
  const seen = new Set<number>();
  const out: Glow[] = [];
  for (let x = x0 - 8; x < x0 + P + 8; x += 6)
    for (const c of clumpsNear(x)) {
      const key = c.x * 1000 + c.H;
      if (seen.has(key)) continue;
      seen.add(key);
      const gx = c.x - x0;
      const gy = c.H - 2 - H0;
      if (gx < 0 || gx >= P || gy < 0 || gy >= P) continue;
      out.push({
        x: gx + 0.5,
        y: gy,
        radius: 9 + c.n,
        strength: 0.32,
        always: true,
        rgb: FUNGUS2_RGB,
      });
    }
  return out;
}

let look: TileLook | null = null;

/** Thistlewood Burrow's look, made on first ask (tiles.ts and this file need each other). */
export function burrowLook(): TileLook {
  look ??= {
    key: 'burrow',
    floor: {
      sand: litterAt,
      wet_sand: mossAt,
      rock_floor: earthAt,
      shallows: seepAt,
      deep_water: deepAt,
      planks: flagEdge,
      wall_top: topAt,
    },
    face: faceAt,
    faceHigh: faceHighAt,
    rock: 'soil',
    sand: 'litter',
    shoal: 'slate',
    deep: 'slate',
    wrack: 'soil',
    wood: 'flag',
    details,
  };
  return look;
}

/** For the doors and props drawn in the Burrow: the same textures by name. */
export const burrowEarthAt = earthAt;
export const burrowTopAt = topAt;
export const burrowFaceAt = faceAt;
export const burrowFaceHighAt = faceHighAt;
export const burrowFlagsAt = flagsAt;
export const burrowLitterAt = litterAt;
export const burrowMossAt = mossAt;
