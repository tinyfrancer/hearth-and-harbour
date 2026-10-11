/**
 * Six home-screen icon options on a 36 x 36 art-pixel grid: 5 device pixels a
 * pixel at iPhone size (180 px, 60 pt at 3x), 14 at 512 (504, the field run
 * out 4 px each side). Each is a field and a motif; the motif is drawn in the
 * middle 36 and the field can be grown round it (`size` 44) for the maskable
 * Android variant, so the same drawing keeps its motif inside the safe zone.
 *
 * Shapes are worked out from geometry and lit the town's way (`solid` from
 * town2/cells.ts: a bevel from the upper left), then corrected by hand where a
 * pixel sits wrong; letters are hand-placed rows. Three or four colours each.
 */
import { at, cell, put, solid, tgrid, type TGrid } from '../../src/art/town2/cells';
import { clamp, clumps } from '../../src/art/town2/texture';
import { X, isX, xpal, type BandGlow, type XMat, type XPal } from './pal';

const C = cell;

export interface IconArt {
  id: string;
  name: string;
  pal: XPal;
  draw: (size: number) => { g: TGrid; glows: BandGlow[] };
}

/** A radial field in flat bands from `centre` step to `edge` step. */
function radial(g: TGrid, m: XMat, centre: number, edge: number, cx = g.w / 2, cy = g.h / 2, k = 1): void {
  const R = Math.hypot(g.w / 2, g.h / 2);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R;
      const t = centre + (edge - centre) * d * 1.2 + (clumps(x, y, k) - 0.5) * 0.5;
      put(g, x, y, X(m, clamp(t, Math.min(centre, edge), Math.max(centre, edge))));
    }
}

/** Outlines every cell of material `m` that touches a cell of anything else in its line step. */
function lineRound(g: TGrid, isIt: (c: number) => boolean, line: number): void {
  const src = new Int16Array(g.d);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = src[y * g.w + x] as number;
      if (isIt(c)) continue;
      const nb = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([a, b]) => a! >= 0 && b! >= 0 && a! < g.w && b! < g.h && isIt(src[b! * g.w + a!] as number));
      if (nb) g.d[y * g.w + x] = line;
    }
}

/** Hand-placed rows: each character a cell from the legend, '.' leaves what is there. */
function rows(g: TGrid, x0: number, y0: number, art: readonly string[], legend: Record<string, number>): void {
  art.forEach((r, j) => [...r].forEach((ch, i) => ch !== '.' && legend[ch] !== undefined && put(g, x0 + i, y0 + j, legend[ch]!)));
}

// 1 -----------------------------------------------------------------------

/** The anchor's left half by hand (the right is its mirror): ring collar, stock, shank, arms, flukes, crown. */
const ANCHOR_HALF = [
  '...............###',
  '...............###',
  '................##',
  '..........########',
  '.........#########',
  '..........########',
  '................##',
  '................##',
  '................##',
  '....#...........##',
  '....##..........##',
  '...####.........##',
  '..######........##',
  '....####........##',
  '.....####.......##',
  '......####......##',
  '.......#####....##',
  '.........#####.###',
  '...........#######',
  '.............#####',
  '...............###',
  '................##',
];
const ANCHOR_TOP = 11;
function anchorMask(x: number, y: number): boolean {
  const r = ANCHOR_HALF[y - ANCHOR_TOP];
  if (!r) return false;
  const hx = x < 18 ? x : 35 - x;
  return r[hx] === '#';
}

function flame(g: TGrid, cx: number, base: number, scale: number): void {
  const tongues = [
    [-3, 3.2, 7],
    [0, 4.2, 11],
    [3, 3, 6.5],
  ] as const;
  const heat = new Map<number, number>();
  for (const [ox, w, h] of tongues)
    for (let y = 0; y < h * scale; y++) {
      const f = y / (h * scale);
      const half = w * scale * Math.pow(1 - f, 0.8);
      for (let x = Math.floor(-half); x <= Math.ceil(half); x++) {
        if (Math.abs(x + 0.5 - 0.5) > half + 0.3) continue;
        const hv = 1 - f * 0.8 - (Math.abs(x) / Math.max(1, half)) * 0.5;
        const key = (base - y) * 100 + Math.round(cx + ox * scale + x);
        if (hv > (heat.get(key) ?? -1)) heat.set(key, hv);
      }
    }
  for (const [key, hv] of heat) {
    const y = Math.floor(key / 100);
    const x = key % 100;
    put(g, x, y, X('fire', hv > 0.72 ? 0 : hv > 0.52 ? 1 : hv > 0.32 ? 2 : 3));
  }
}

const hearthAnchor: IconArt = {
  id: '1',
  name: 'Hearth and anchor',
  pal: xpal('day'),
  draw: (size) => {
    const g = tgrid(size, size);
    const o = (size - 36) / 2;
    radial(g, 'navy', 2, 5, size / 2, size / 2 - 3);
    solid(g, o, o, 36, 36, (x, y) => anchorMask(x, y), 'gold', { base: 2, contrast: 1.6, radius: 1.6, lo: 0, hi: 4 });
    flame(g, o + 17.5, o + 11, 1);
    lineRound(g, (c) => isX(c, 'gold'), C('gold', 6));
    lineRound(g, (c) => isX(c, 'fire'), X('fire', 6));
    return { g, glows: [{ x: size / 2, y: o + 7, r: 13, strength: 0.25, bands: 3 }] };
  },
};

// 2 -----------------------------------------------------------------------

const lantern: IconArt = {
  id: '2',
  name: 'The lantern',
  pal: xpal('day'),
  draw: (size) => {
    const g = tgrid(size, size);
    const o = (size - 36) / 2;
    radial(g, 'skyHi', 4, 7, size / 2, size / 2 + 2, 4);
    // The halo: flat rings warming toward the lamp, their edges clumped.
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x + 0.5 - size / 2, (y + 0.5 - (o + 17.5)) * 0.92) + (clumps(x, y, 6) - 0.5) * 1.4;
        if (d < 10.5) put(g, x, y, X('skyLo', 3));
        else if (d < 13) put(g, x, y, X('skyLo', 5));
        else if (d < 15.5) put(g, x, y, X('skyLo', 7));
      }
    const L = {
      I: C('iron', 6),
      i: C('iron', 4),
      j: C('iron', 2),
      h: C('iron', 1),
      g: C('lamp', 0),
      G: C('lamp', 1),
      a: C('glass', 3),
      f: X('fire', 1),
      F: X('fire', 2),
      w: X('fire', 0),
      c: C('sail', 1),
    };
    rows(g, o, o, [
      '................IIII................',
      '...............IjiiI................',
      '...............Ii..iI...............',
      '...............IjiiiI...............',
      '................IiiI................',
      '...............IIjiII...............',
      '.............IIjhjiiiII.............',
      '...........IIjhjjjiiiiII............',
      '..........IIjhjjjjjjiiiiII..........',
      '.........IjjjjjjjjjiiiiiiiI.........',
      '.........IIIIIIIIIIIIIIIIII.........',
      '.........IjhggggGGGGGGaaiiI.........',
      '.........IjhgggGGGGGGGaaiiI.........',
      '.........IjhgggGGGwGGGaaiiI.........',
      '.........IjhggGGGwwGGGaaiiI.........',
      '.........IjhggGGwwwfGGaaiiI.........',
      '.........IjhggGGwwwfGGaaiiI.........',
      '.........IjhggGGfwwfGGaaiiI.........',
      '.........IjhggGGGffGGGaaiiI.........',
      '.........IjhggGGGccGGaaaiiI.........',
      '.........IjhggGGGccGGaaaiiI.........',
      '.........IjhgGGGGccGGaaaiiI.........',
      '.........IjhgGGGGGGGaaaaiiI.........',
      '........IIIIIIIIIIIIIIIIIIII........',
      '........IjjjjjjjjjiiiiiiiiiI........',
      '.........IIjjjjjjjiiiiiiII..........',
      '...........IIIIjjiiiIIII............',
      '..............IIjiiII...............',
      '...............IIiII................',
      '................III.................',
    ], L);
    return {
      g,
      glows: [
        { x: size / 2 - 0.5, y: o + 17.5, r: 9, strength: 0.2, bands: 2 },
      ],
    };
  },
};

// 3 -----------------------------------------------------------------------

const helmFace: IconArt = {
  id: '3',
  name: 'The hero in his helm',
  pal: xpal('day'),
  draw: (size) => {
    const g = tgrid(size, size);
    const o = (size - 36) / 2;
    radial(g, 'banner', 2, 5, size / 2, size / 2 - 4, 6);
    const L = {
      K: C('plate', 6),
      '0': C('plate', 0),
      '1': C('plate', 1),
      '2': C('plate', 2),
      '3': C('plate', 3),
      '4': C('plate', 4),
      '5': C('plate', 5),
      S: C('skin', 6),
      s: C('skin', 1),
      t: C('skin', 2),
      u: C('skin', 3),
      v: C('skin', 4),
      b: C('hair', 4),
      e: C('eye', 4),
      w: C('eye', 0),
      i: C('eye', 2),
      I: C('eye', 3),
      m: C('iron', 3),
      M: C('iron', 5),
      n: C('iron', 2),
      r: C('gold', 2),
    };
    rows(g, o, o, [
      '................KKKK................',
      '..............KK0012KK..............',
      '.............K00112233K.............',
      '............K0011222334K............',
      '...........K00112222333K............',
      '..........K001122222333 4K..........'.replace(' ', ''),
      '..........K0112222223334K...........',
      '.........K01122222223334K...........',
      '.........K0112222222333 44K.........'.replace(' ', ''),
      '........K01122222222233344K.........',
      '........K01122222222233344K.........',
      '........K11122222222233344K.........',
      '........KK1r1111221111r33KK.........',
      '........K1111111221111333K..........',
      '........KKKKKKKK12KKKKKKKK..........',
      '........KSsssbbK12KbbuuuvSK.........',
      '........KSssbbsK12KsbbuuvSK.........',
      '........KSseeesK12KseeeuvSK.........',
      '........KSswiwsK12KswiwuvSK.........',
      '........KSswIwsK12KswIwuvSK.........',
      '........KSsssssK12KsuuuuvSK.........',
      '........KSssssstK2KtuuuuvSK.........',
      '........KSsssssstvuuuuuuvSK.........',
      '.........SssssssuvvuuuuuvS..........',
      '.........SStssssvvvuuuuvSS..........',
      '..........SttssSSSSuuuvvS...........',
      '..........SSttssuuuuuvvSS...........',
      '...........SSttuuuuuvSS.............',
      '..........MmSSSSSSSSSSmM............',
    ], L);
    // The coif: mail in offset rows of rings, lit high on the left.
    for (let j = 0; j < 7; j++) {
      const y = o + 29 + j;
      const half = 8 + j * 1.6;
      for (let x = Math.round(17.5 - half); x <= Math.round(17.5 + half); x++) {
        const edge = x <= Math.round(17.5 - half) || x >= Math.round(17.5 + half);
        const ring = (x + (j % 2) * 2) % 4;
        const lit = x < 15 && j < 4;
        const t = edge ? 6 : ring === 0 ? (lit ? 1 : 2) : ring === 2 ? 4 : 3;
        put(g, o + x, y, C('iron', t));
      }
    }
    return { g, glows: [] };
  },
};

// 4 -----------------------------------------------------------------------

const shipSunset: IconArt = {
  id: '4',
  name: 'The ship at sunset',
  pal: xpal('day'),
  draw: (size) => {
    const g = tgrid(size, size);
    const o = (size - 36) / 2;
    const hz = o + 24;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (y < hz) {
          const f = y / hz;
          const s = clamp(6.4 - f * 6.6 + (clumps(x / 2, y, 3) - 0.5) * 0.7, 0, 7);
          put(g, x, y, X('skyLo', s));
        } else {
          const f = (y - hz) / (size - hz);
          put(g, x, y, X('sunsea', clamp(2 + f * 4 + (clumps(x / 3, y, 5) - 0.5) * 1.2, 1, 6)));
        }
      }
    // The sun, low, off to the right of the mast, so half of it shows past the sail.
    const sun = { x: o + 18.5, y: o + 16 };
    for (let y = 0; y < hz; y++)
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x + 0.5 - sun.x, y + 0.5 - sun.y);
        if (d <= 13.5) put(g, x, y, X('gilt', d < 11 ? 0 : d < 12.5 ? 1 : 2));
      }
    // Its road on the water.
    for (let y = hz + 1; y < size; y++) {
      const f = (y - hz) / (size - hz);
      const half = 3 + f * 7;
      for (let x = Math.round(sun.x - half); x <= sun.x + half; x++)
        if ((x + y * 3) % 5 < 2 + (1 - f) * 2) put(g, x, y, X('gilt', y % 2 ? 1 : 2));
    }
    // The cutter as a silhouette: one mast, the mainsail full of wind, a jib,
    // the raised stern, the bowsprit, the flag; one dark, nothing fussy.
    const inPoly = (pts: readonly (readonly [number, number])[], x: number, y: number) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i]!;
        const [xj, yj] = pts[j]!;
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    };
    const MAIN = [[17.5, 6], [24, 6.5], [27.5, 10], [28.5, 15], [27, 21.5], [17.5, 21.5]] as const;
    const JIB = [[16, 6.5], [15.5, 21.5], [6, 21.5]] as const;
    const HULL = [[4, 21], [27, 21], [27, 18.5], [32.5, 18.5], [32, 21.5], [29, 25], [9, 25]] as const;
    const D = C('tar', 6);
    for (let y = 0; y < 36; y++)
      for (let x = 0; x < 36; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const mast = x === 17 && y >= 3 && y <= 21;
        const sprit = y === 20 && x >= 1 && x <= 6;
        const flag = y >= 2 && y <= 4 && x >= 18 && x <= 21 - (y === 4 ? 1 : 0);
        if (mast || sprit || flag || inPoly(MAIN, px, py) || inPoly(JIB, px, py) || inPoly(HULL, px, py)) put(g, o + x, o + y, D);
      }
    // The waterline: a lit lip where the hull meets the sea.
    for (let x = 9; x <= 29; x++) put(g, o + x, o + 25, X('sunsea', 0));
    return { g, glows: [] };
  },
};

// 5 -----------------------------------------------------------------------

const monogram: IconArt = {
  id: '5',
  name: 'H&H monogram crest',
  pal: xpal('day'),
  draw: (size) => {
    const g = tgrid(size, size);
    const o = (size - 36) / 2;
    radial(g, 'navy', 2, 5, size / 2, size / 2 - 3, 8);
    // The shield.
    const inS = (x: number, y: number) => {
      const fx = (x + 0.5 - 18) / 13.5;
      const fy = (y + 0.5 - 4) / 29;
      if (fy < 0 || fy > 1) return false;
      if (fy < 0.42) return Math.abs(fx) <= 1;
      const t = (fy - 0.42) / 0.58;
      return Math.abs(fx) <= Math.sqrt(Math.max(0, 1 - t * t));
    };
    for (let y = 0; y < 36; y++)
      for (let x = 0; x < 36; x++) {
        if (!inS(x, y)) continue;
        const rim = !inS(x - 2, y) || !inS(x + 2, y) || !inS(x, y - 2) || !inS(x, y + 2);
        const edge = !inS(x - 1, y) || !inS(x + 1, y) || !inS(x, y - 1) || !inS(x, y + 1);
        const lit = x < 18 && y < 24;
        put(g, o + x, o + y, edge ? X('gilt', 6) : rim ? X('gilt', lit ? 1 : 3) : X('banner', x < 18 ? 2 : 3));
      }
    const L = { '#': X('gilt', 2), h: X('gilt', 0), s: X('gilt', 4), k: X('gilt', 6) };
    const H = [
      'kkkkkkkkkk',
      'khhhkkhhhk',
      'kk#skks#kk',
      '.k#sk.k#sk',
      '.k#skkk#sk',
      '.k#hhhh#sk',
      '.k######sk',
      '.k#skkk#sk',
      '.k#sk.k#sk',
      'kk#skks#kk',
      'k###kk###k',
      'kkkkkkkkkk',
    ];
    const A = [
      '.kkkkk..',
      'kkhhhkk.',
      'kh#k#sk.',
      'kh#k#sk.',
      'kk##skkk',
      'kh###k#k',
      'h#kh#ssk',
      'h#kk#skk',
      'h#kk##sk',
      'kh###k#k',
      '.kkkkkkk',
      '........',
    ];
    rows(g, o + 3, o + 10, H, L);
    rows(g, o + 14, o + 10, A, L);
    rows(g, o + 23, o + 10, H, L);
    // A little star of gold above, in the chief.
    rows(g, o + 16, o + 6, ['.h.', 'h#h', '.s.'], L);
    return { g, glows: [] };
  },
};

// 6 -----------------------------------------------------------------------

const cottage: IconArt = {
  id: '6',
  name: 'Home at dusk',
  pal: xpal('dusk'),
  draw: (size) => {
    const g = tgrid(size, size);
    const o = (size - 36) / 2;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const f = y / size;
        put(g, x, y, f < 0.62 ? X('skyHi', clamp(6 - f * 9 + (clumps(x / 2, y, 2) - 0.5), 1, 7)) : X('skyLo', clamp(6 - (f - 0.62) * 6 + (clumps(x / 2, y, 2) - 0.5), 4, 7)));
      }
    for (const [x, y] of [
      [4, 4],
      [29, 3],
      [10, 9],
      [24, 7],
    ] as const) {
      put(g, o + x, o + y, X('star', 0));
    }
    put(g, o + 29, o + 2, X('star', 3));
    put(g, o + 29, o + 4, X('star', 3));
    put(g, o + 28, o + 3, X('star', 3));
    put(g, o + 30, o + 3, X('star', 3));
    const L = {
      T: C('thatch', 6),
      '1': C('thatch', 1),
      '2': C('thatch', 2),
      '3': C('thatch', 3),
      '4': C('thatch', 4),
      W: C('limewash', 6),
      w: C('limewash', 1),
      v: C('limewash', 2),
      u: C('limewash', 3),
      g: C('glass', 0),
      G: C('glass', 2),
      b: C('blue', 2),
      B: C('blue', 4),
      s: C('stone', 2),
      S: C('stone', 4),
      k: C('stone', 6),
      m: C('smoke', 2),
      n: C('smoke', 3),
      q: C('grass', 3),
      Q: C('grass', 5),
      d: C('wood', 4),
    };
    rows(g, o, o, [
      '....................................',
      '....................................',
      '..........................mm........',
      '.........................mmnn.......',
      '........................mmn.........',
      '.........................mn.........',
      '..........................n.........',
      '.........................kk.........',
      '..............TTTTTTT...ksSk........',
      '............TT1122223TT.ksSk........',
      '..........TT11122222233TsSSk........',
      '.........T1112222222223334sSk.......',
      '........T111222222222223334Sk.......',
      '.......T1112222222222222333 4T......'.replace(' ', ''),
      '......T11122222222222222223334T.....',
      '.....T1112222222222222222223334T....',
      '....T111222222222222222222223334T...',
      '...T44444444444444444444444444444T..',
      '....TTTTTTTTTTTTTTTTTTTTTTTTTTTTT...',
      '.....WwwwwwwwwwwwwwwwwwwwwvvvuuW....',
      '.....WwbggGbwwwwWWWWwwwbggGbvuuW....',
      '.....WwbgGGbwwwWBbbBWwwbgGGbvuuW....',
      '.....WwbGGGbwwwWBbbBWwwbGGGbvuuW....',
      '.....WwbGGGbwwwWBbbBWwwbGGGbvuuW....',
      '.....WwwwwwwwwwWBbbBWwwwwwwwvuuW....',
      '.....WwwwwwwwwwWBbgBWwwwwwwwvuuW....',
      '.....WwwwwwwwwwWBbbBWwwwwwwvvuuW....',
      '.....WsssssssssWBbbBWsssssssSSSW....',
      '...qqWSSSSSSSSSWddddWSSSSSSSSSSWqq..',
      '.qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq.',
      'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      'QqqqQqqqqQqqqqqQqqqqqQqqqqqQqqqqQqqq',
      'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',
      'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',
      'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',
      'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',
    ], L);
    // Grass to the field's edge when it is grown for the maskable variant.
    for (let y = o + 30; y < size; y++) for (let x = 0; x < size; x++) if (!at(g, x, y) || y >= o + 31) put(g, x, y, C('grass', y < o + 31 ? 3 : 5));
    return {
      g,
      glows: [
        { x: o + 9.5, y: o + 22, r: 6, strength: 0.3, bands: 2 },
        { x: o + 25.5, y: o + 22, r: 6, strength: 0.3, bands: 2 },
      ],
    };
  },
};

export const ICONS: readonly IconArt[] = [hearthAnchor, lantern, helmFace, shipSunset, monogram, cottage];
