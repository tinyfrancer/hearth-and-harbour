/**
 * The tide-pool cave's ground (B15): the same tile kinds, wears and joins as
 * the grotto's (tiles.ts composes both), drawn as a shallow sea cave open to
 * daylight, so it never reads as the grotto recoloured:
 *
 * - **Rock** lies in beds, not lumps: the walls' faces are strata of warm,
 *   water-worn sandstone, each bed lit along its top and shadowed under, with
 *   a band of green weed and a crust of mussels and barnacles at the tide's
 *   mark; the floor's rock is broad smooth slabs with lit rounded edges,
 *   green film in their hollows and barnacles in crusts.
 * - **Sand** is a beach's, bright, finely rippled, with shell grit.
 * - **Water** is clear: the pools turquoise over sand with the sun's
 *   caustics netting their floor, the sea in the cave blue-green and bright.
 *
 * Palette `CAVE_TIDEPOOL` (day). Floors still never use red or orange: its
 * starfish on the floor are purple, its anemones only on props.
 */
import { hash, type Cell, type TGrid } from '../town2/cells';
import { noise } from '../town2/texture';
import { cell, swap2 } from './cave';
import {
  cracked,
  cround,
  lumpAt,
  planksAt,
  ripple,
  TILE2,
  type TileLook,
  type Tile2Kind,
} from './tiles';

const P = TILE2;
const lim = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
const frac = (v: number) => v - Math.floor(v);

/** Beach sand: bright, soft patches, fine ripples lit on their crests, grit of shell. */
function sandAt(x: number, y: number): Cell {
  const v = noise(x, y, 18, 301) * 0.6 + noise(x, y, 7, 302) * 0.4;
  let t = cround(1.7 + (v - 0.5) * 1.3, x, y, 303, 0.6);
  // Ripples only in patches, their crests catching the light, broken along their length.
  const f = frac(
    (y + 3 * Math.sin(x / 6 + y / 13) + 4 * Math.sin(x / 17) + 6 * noise(x, y, 14, 304)) / 6,
  );
  const show = noise(x, y, 20, 305) * 0.7 + noise(x, y, 5, 307) * 0.3;
  if (show > 0.68 && f > 0.86) t += 1;
  else if (show > 0.72 && f < 0.1) t -= 1;
  const gr = hash(x, y, 306);
  if (gr < 0.004) return cell('shell', 1);
  if (gr > 0.992) t += 1;
  return cell('tidesand', lim(t, 0, 3));
}

/** Wet sand: the beach a step darker, the sea lying in its ripples, the sky's shine along it. */
function wetAt(x: number, y: number): Cell {
  const v = noise(x, y, 16, 311) * 0.6 + noise(x, y, 7, 312) * 0.4;
  let t = cround(2.9 + (v - 0.5) * 1.2, x, y, 313, 0.6);
  const f = ripple(x, y);
  if (f < 0.2 && noise(x, y, 9, 314) > 0.45)
    return cell('pool', f < 0.07 && hash(x, y, 315) < 0.4 ? 1 : 2);
  if (noise(x, y * 3, 9, 316) > 0.74) t -= 1;
  if (hash(x, y, 317) < 0.015) t += 1;
  return cell('tidesand', lim(t, 1, 4));
}

/**
 * The floor's rock: broad water-worn slabs, each domed and lit on its upper
 * left with a rounded lip, a dark seam where two meet, green film in the
 * hollows, barnacles in crusts and water in the deepest cracks.
 */
function rockAt(x0: number, y0: number): Cell {
  // Slabs' edges wander (worn by the sea), never the straight cuts of paving.
  const x = x0 + Math.round((noise(x0, y0, 9, 330) - 0.5) * 7);
  const y = y0 + Math.round((noise(x0, y0, 9, 331) - 0.5) * 7);
  const S = 21;
  const seam = cracked(x, y, S, 321, false);
  if (seam) return noise(x0, y0, 6, 322) > 0.88 ? cell('pool', 3) : cell('tiderock', 5);
  const l = lumpAt(x, y, S, 321);
  // The lip just inside a seam above or to the left catches the light.
  if (cracked(x, y - 1, S, 321, false) || cracked(x - 1, y, S, 321, false))
    return cell('tiderock', 1);
  if (cracked(x, y + 1, S, 321, false) || cracked(x + 1, y, S, 321, false))
    return cell('tiderock', 4);
  let t = cround(
    2.6 + l.tilt * 0.3 - l.lit * 1.5 + (noise(x0, y0, 7, 323) - 0.5) * 0.5,
    x0,
    y0,
    324,
    0.5,
  );
  // Green film low on each slab, barnacles in crusts.
  const film = noise(x0, y0, 9, 325);
  if (film > 0.64 && l.lit < 0.1) return cell('moss', lim(t + 1, 3, 5));
  if (noise(x0, y0, 5, 326) > 0.78 && hash(x0, y0, 327) < 0.4)
    return cell('cream', hash(x0, y0, 328) < 0.5 ? 1 : 3);
  if (hash(x0, y0, 329) < 0.015) t += 1;
  return cell('tiderock', lim(t, 1, 4));
}

/** Clear water over sand: turquoise, the sun's caustics netting the floor, ripples under them. */
function shallowsAt(x: number, y: number): Cell {
  const v = noise(x, y, 18, 331) * 0.6 + noise(x, y * 2, 8, 332) * 0.4;
  let t = cround(2.1 + (v - 0.5) * 1.1, x, y, 333, 0.7);
  // Caustics: where two wandering waves meet, a net of bright lines.
  const a = Math.sin(x * 0.33 + Math.sin(y * 0.29) * 1.7 + noise(x, y, 11, 334) * 3);
  const b = Math.sin(y * 0.41 + Math.sin(x * 0.23) * 1.5 + noise(x, y, 13, 335) * 3);
  const net = Math.abs(a + b);
  if (net < 0.16) return cell('pool', hash(x, y, 336) < 0.25 ? 0 : 1);
  if (ripple(x + 2, y + 1) < 0.14) t += 1;
  return cell('pool', lim(t, 1, 4));
}

/** The sea in the cave: blue-green in a slow swell, glints on it. */
function deepAt(x: number, y: number): Cell {
  const s = Math.sin(Math.PI * 2 * (y / 10 + 0.6 * noise(x, y, 18, 341))) * 0.5;
  const v = noise(x, y * 2, 8, 342) - 0.5;
  const t = cround(3.3 + s * 0.9 + v * 1.0, x, y, 343, 0.8);
  if (noise(x, y * 4, 5, 344) > 0.8 && hash(x, y, 345) < 0.5) return cell('tidedeep', 1);
  return cell('tidedeep', lim(t, 2, 5));
}

/** Silvered old boards: the grotto's planks in driftwood grey. */
const silver = swap2({ wood: 'willow' });
const planksTide = (x: number, y: number): Cell => silver(planksAt(x, y));

/**
 * The rock's top seen from above: big rounded boulders, warm and quiet, each
 * with a lit rim on its upper left, weed in the cracks between.
 */
function wallTopAt(x: number, y: number): Cell {
  // Quiet: broad masses in two tones, a rim of light on the upper left of some, a few cracks.
  if (cracked(x, y, 23, 351, true) && noise(x, y, 6, 352) < 0.45)
    return noise(x, y, 4, 354) > 0.7 ? cell('moss', 5) : cell('tiderock', 6);
  const l = lumpAt(x, y, 23, 351);
  if (l.lit > 0.72 - l.tilt * 0.1) return cell('tiderock', 3);
  if (l.lit < -0.75) return cell('tiderock', 6);
  const v = noise(x, y, 11, 353);
  if (v > 0.74 && l.lit < 0.2) return cell('moss', 5);
  return cell('tiderock', l.tilt > 0 || v > 0.62 ? 5 : 4);
}

/** Which bed of the rock a row of the room is in, wandering a pixel or two along it. */
function bedAt(x: number, wy: number): { bed: number; at: number; size: number } {
  // B16: the beds dip gently across the room and wander more along it, so no join runs level
  // for long (straight level joins read as coursed masonry from close up).
  const w =
    wy +
    Math.round(
      x * 0.07 +
        (noise(x, 0, 41, 360) - 0.5) * 9 +
        (noise(x, 0, 23, 361) - 0.5) * 5 +
        (noise(x, 0, 7, 367) - 0.5) * 1.6,
    );
  // Beds of their own thickness, 4 to 7 rows.
  let top = 0;
  let bed = 0;
  let size = 5;
  // Walk the beds from a fixed row so the same room row is always the same bed.
  const start = Math.floor(w / 64) * 64;
  top = start;
  bed = Math.floor(start / 64) * 100;
  for (;;) {
    size = 3 + Math.floor(hash(bed, 0, 362) * 7);
    if (top + size > w) break;
    top += size;
    bed++;
  }
  return { bed, at: w - top, size };
}

/**
 * A bed of the cliff: its top edge lit, its underside shadowed, its own tone,
 * worn into shallow pockets here and there. B16: no upright joints (they cut
 * the beds into blocks, like coursed stone); weed lodged along some joins in
 * lines with strands hanging from them; barnacles freckling the beds, more
 * of them lower down (`wet`, 0 high on the face to 1 at the tide's mark).
 */
function strata(x: number, wy: number, base: number, wet = 0): Cell {
  const { bed, at, size } = bedAt(x, wy);
  const h = hash(bed, 1, 363);
  // Beds of their own tone: some pale and hard, standing proud; some dark and soft, worn back.
  const tone = h < 0.3 ? -0.8 : h > 0.72 ? 0.9 : 0;
  // The join under a bed: a shadow where a soft bed is worn back under a hard one, broken along it;
  // where the join is deep enough, weed has lodged in it.
  const joint = noise(x, wy, 9, 368 + (bed % 5));
  const weed = noise(x, bed, 13, 375);
  if (at === size - 1 && joint > 0.3) {
    if (weed > 0.64) return cell('moss', weed > 0.76 ? 4 : 5);
    return cell('tiderock', lim(base + 1.6 + tone * 0.5, 2, 6));
  }
  // Strands of that weed hanging over the top of the bed below.
  if (at <= 2 && weed > 0.7 && hash(x, bed, 376) < 0.45 && at < 1 + hash(x, bed, 377) * 3)
    return cell('moss', at === 0 ? 4 : 5);
  if (at === 0 && tone <= 0 && joint > 0.45) return cell('tiderock', lim(base - 1.2, 0, 5));
  // Barnacles: pale specks in loose clusters, thicker toward the tide's mark.
  const crust = noise(x, wy, 8, 378);
  if (crust > 0.62 - wet * 0.14 && hash(x, wy, 379) < 0.05 + wet * 0.07)
    return cell('cream', hash(x, wy, 380) < 0.6 ? 1 : 3);
  // Within a bed, wide worn lumps (rock splits along its beds), each lit on its upper left.
  const l = lumpAt(x, wy * 2.2, 16, 371 + (bed % 9));
  let t =
    base +
    tone -
    l.lit * 0.6 +
    (noise(x, wy, 9, 364) - 0.5) * 0.9 +
    (noise(x, wy, 3, 365) - 0.5) * 0.3;
  // A pocket worn by the sea: a dark hollow.
  const pocket = noise(x, wy, 6, 365 + (bed % 7));
  if (pocket > 0.8 && at > 1) t += 1.4;
  return cell('tiderock', lim(cround(t, x, wy, 366, 0.6), 1, 5));
}

/** The upper face: the top's ragged lip, then beds in shade, darker high up. */
function faceHighAt(x: number, y: number, wy: number): Cell {
  const lip = 2 + Math.round((noise(x, 0, 7, 371) - 0.5) * 4);
  if (y < lip - 1) return wallTopAt(x, wy);
  if (y === lip - 1) return cell('tiderock', 2);
  if (y === lip) return cell('tiderock', 6);
  if (y === lip + 1 && hash(x, 0, 372) < 0.6) return cell('tiderock', 5);
  // Weed hanging over the lip in strands.
  if (y < lip + 6 && noise(x, 3, 3, 373) > 0.72 && y - lip < 2 + noise(x, 4, 2, 374) * 5)
    return cell('moss', y === lip + 2 ? 3 : 4);
  return strata(x, wy, 3.6 - (y / 24) * 0.8);
}

/**
 * The lower face, in the light: beds lit by the bright floor, then the
 * tide's mark (a band of green weed, a crust of mussels with barnacles on
 * them) and a wet dark foot that anything standing in front reads against.
 */
function faceAt(x: number, y: number, wy: number): Cell {
  if (y >= 22) return cell('tiderock', y === 23 ? 6 : 5);
  const weedTop = 11 + Math.round((noise(x, 0, 9, 381) - 0.5) * 4);
  const musselTop = 16 + Math.round((noise(x, 1, 7, 382) - 0.5) * 3);
  if (y >= musselTop) {
    // Mussels: blue-black shells in rows, a glint on each; barnacles pale among them.
    const h = hash(Math.floor(x / 2), y, 383);
    if (h < 0.12) return cell('cream', 1);
    if (h < 0.18) return cell('cream', 3);
    return cell('midnight', (x + y) % 3 === 0 ? 3 : y === musselTop ? 4 : 5);
  }
  if (y >= weedTop) {
    const t = y === weedTop ? 2 : 3 + (hash(x, y, 384) < 0.3 ? 1 : 0);
    // Strands hang below the band's foot.
    return cell('moss', t);
  }
  return strata(x, wy, 2.6 + (y / 12) * 0.3, Math.min(1, y / 11));
}

/** Now and then a detail: shells, pebbles, a purple starfish, a razor shell, weed, a pool, limpets, mussels. */
function details(g: TGrid, kind: Tile2Kind, wear: number): void {
  const set = (x: number, y: number, c: Cell) => {
    if (x >= 0 && y >= 0 && x < P && y < P) g.d[y * P + x] = c;
  };
  const r = (i: number) => hash(wear, i, 390 + kind.length);
  const cx = 7 + Math.floor(r(1) * 10);
  const cy = 8 + Math.floor(r(2) * 9);
  if (kind === 'sand' || kind === 'wet_sand') {
    const base = kind === 'sand' ? 1 : 3;
    if (wear === 3) {
      // A cockle, ribbed, its shadow below.
      set(cx, cy, cell('shell', 1));
      set(cx + 1, cy, cell('shell', 2));
      set(cx + 2, cy, cell('shell', 3));
      set(cx, cy + 1, cell('shell', 2));
      set(cx + 1, cy + 1, cell('shell', 3));
      set(cx + 2, cy + 1, cell('shell', 4));
      set(cx + 1, cy + 2, cell('tidesand', base + 2));
      set(cx + 2, cy + 2, cell('tidesand', base + 2));
    } else if (wear === 9) {
      for (const [dx, dy] of [
        [0, 0],
        [3, 1],
        [1, 3],
      ] as const) {
        set(cx + dx, cy + dy, cell('tiderock', 2));
        set(cx + dx + 1, cy + dy, cell('tiderock', 3));
        set(cx + dx + 1, cy + dy + 1, cell('tidesand', base + 2));
      }
    } else if (wear === 14) {
      // A small purple starfish: five arms, a lit centre.
      for (const [dx, dy, t] of [
        [2, 0, 2],
        [1, 1, 2],
        [2, 1, 1],
        [3, 1, 3],
        [0, 2, 2],
        [1, 2, 2],
        [2, 2, 2],
        [3, 2, 3],
        [4, 2, 3],
        [1, 3, 3],
        [3, 3, 4],
        [0, 4, 3],
        [4, 4, 4],
      ] as const)
        set(cx + dx, cy + dy, cell('plum', t));
      set(cx + 2, cy + 4, cell('tidesand', base + 2));
      set(cx + 3, cy + 4, cell('tidesand', base + 2));
    } else if (wear === 17) {
      // A razor shell, long and thin.
      for (let i = 0; i < 6; i++) {
        set(cx + i, cy, cell('shell', i < 2 ? 1 : 2));
        set(cx + i, cy + 1, cell('tidesand', base + 2));
      }
    } else if (wear === 6 && kind === 'wet_sand') {
      // A strand of kelp the tide left, a bladder or two on it.
      for (let i = 0; i < 7; i++) {
        const dy = Math.round(Math.sin(i * 1.1));
        set(cx + i, cy + dy, cell('kelp', i % 3 === 1 ? 1 : 3));
        set(cx + i, cy + 1 + dy, cell('kelp', 5));
      }
    }
  } else if (kind === 'rock_floor') {
    if (wear === 4 || wear === 12) {
      // A rock pool: a rim lit on its far side, clear water inside, a pink anemone at its edge.
      for (let y = -3; y <= 3; y++)
        for (let x = -5; x <= 5; x++) {
          const d = (x / 5.5) ** 2 + (y / 3.4) ** 2;
          if (d > 1) continue;
          set(
            cx + x,
            cy + y,
            d > 0.6
              ? cell('tiderock', y < 0 ? 5 : 1)
              : cell('pool', y < -1 ? 3 : x < -1 && y < 1 ? 0 : 2),
          );
        }
      set(cx + 3, cy - 1, cell('anemone', 2));
      set(cx + 4, cy - 1, cell('anemone', 3));
    } else if (wear === 11) {
      for (const [dx, dy] of [
        [0, 0],
        [2, -1],
        [3, 1],
        [1, 2],
        [5, 0],
      ] as const) {
        set(cx + dx, cy + dy, cell('cream', 0));
        set(cx + dx + 1, cy + dy, cell('cream', 2));
        set(cx + dx, cy + dy + 1, cell('tiderock', 5));
      }
    } else if (wear === 7) {
      // Limpets: pale cones, each with its shadow.
      for (const [dx, dy] of [
        [0, 0],
        [4, 2],
      ] as const) {
        set(cx + dx + 1, cy + dy, cell('sail', 0));
        set(cx + dx, cy + dy + 1, cell('sail', 1));
        set(cx + dx + 1, cy + dy + 1, cell('sail', 2));
        set(cx + dx + 2, cy + dy + 1, cell('sail', 4));
        set(cx + dx + 1, cy + dy + 2, cell('tiderock', 5));
        set(cx + dx + 2, cy + dy + 2, cell('tiderock', 5));
      }
    } else if (wear === 13) {
      // A clump of mussels in a crack.
      for (let i = 0; i < 6; i++) {
        set(cx + i, cy + (i % 2), cell('midnight', i % 2 ? 4 : 3));
        set(cx + i, cy + 1 + (i % 2), cell('midnight', 5));
      }
      set(cx + 1, cy, cell('midnight', 1));
    } else if (wear === 17) {
      for (let i = 0; i < 5; i++) {
        set(cx + i, cy + (i % 2), cell('moss', 2));
        set(cx + i, cy + 1 + (i % 2), cell('moss', 4));
      }
    }
  } else if (kind === 'planks' && wear === 2) {
    for (let x = 8; x < 15; x++) set(x, 14, cell('willow', x % 3 === 0 ? 4 : 5));
  }
}

let look: TileLook | null = null;

/** The tide-pool cave's look, made on first ask (tiles.ts and this file need each other). */
export function tidepoolLook(): TileLook {
  look ??= {
    key: 'tidepool',
    floor: {
      sand: sandAt,
      wet_sand: wetAt,
      rock_floor: rockAt,
      shallows: shallowsAt,
      deep_water: deepAt,
      planks: planksTide,
      wall_top: wallTopAt,
    },
    face: faceAt,
    faceHigh: faceHighAt,
    rock: 'tiderock',
    sand: 'tidesand',
    shoal: 'pool',
    deep: 'tidedeep',
    wrack: 'kelp',
    wood: 'willow',
    details,
  };
  return look;
}

/** For the doors and props drawn in this cave: the same textures by name. */
export const tideRockAt = rockAt;
export const tideWallTopAt = wallTopAt;
export const tideFaceAt = faceAt;
export const tideFaceHighAt = faceHighAt;
export const tideSandAt = sandAt;
