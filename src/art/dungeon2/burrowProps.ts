/**
 * Thistlewood Burrow's props and light pieces (B20), drawn to metres beside a
 * 64-pixel person and shaded as solids, lit from the upper left, outlined in
 * each material's darkest step:
 *
 * - **The lantern on a post** (`post_lantern` burning, `post_lantern_out`),
 *   one tile wide, its foot two pixels above its tile's bottom as lane C
 *   stands it: a crooked post of root-wood on a cairn of mossy stones, a crook
 *   at its top and an iron lantern hanging from it. Its states as frames
 *   (`postLanternFrame`): out, being lit (a spark, a flame catching), burning
 *   (the flame wavering) and snuffed (a wisp of smoke from its cap). Every
 *   frame is the same canvas, foot and base, so a state changes in place.
 * - **Floor props** as lane C's letters name them, each standing on its own
 *   tile: toadstools, a tangle of roots, brambles, a mossy stone, a fallen
 *   log, and the root throne's segment (a run of `J`s makes the throne's back,
 *   each segment ending clean against the next); and the whole throne as one
 *   piece (`badger_throne`) for a scene that stands it once.
 * - **What makes it lived in**: a mushroom-folk dwelling, the larder (a
 *   shelf dug under a root with jars and hanging roots), the court's bench,
 *   the king's banner on its pole.
 *
 * Rasterize with `CAVE_BURROW` (or a level of `burrowNight`). The lanterns'
 * flames and the fungus keep their colours in the dark.
 */
import { hash, outlined, put, tgrid, type Cell, type TGrid } from '../town2/cells';
import { cell, type Mat2 } from './cave';
import type { Glow } from '../raster';
import { FUNGUS2_RGB, type Light2 } from './light';
import { dome, line, paint, poly, rod, shaped, sprite } from './kit';

export interface BurrowProp {
  readonly grid: TGrid;
  readonly base: number;
  /** The middle of its foot on the base row (before the outline), if not its middle. */
  readonly foot?: number;
  readonly glows: readonly Glow[];
  readonly light?: Light2;
}

const lim = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/* ------------------------------------------------------------ the lantern */

/** What a lantern on a post is doing. */
export type PostLanternState = 'out' | 'lighting' | 'lit' | 'snuffed';

/** Frames of each state, and how long each frame shows (lighting takes lane C's 1.2 s in four). */
export const POST_LANTERN2_FRAMES: Readonly<Record<PostLanternState, number>> = {
  out: 1,
  lighting: 4,
  lit: 4,
  snuffed: 4,
};
export const POST_LANTERN2_FRAME_MS: Readonly<Record<PostLanternState, number>> = {
  out: 1000,
  lighting: 300,
  lit: 130,
  snuffed: 160,
};

/** The post's canvas (before the outline): room above the lantern for its smoke. */
const LW = 28;
const LH = 74;
/** The post's middle, its foot's column. */
const PX = 9;
/** The lantern's cage: its left column and top row; the flame's place in it. */
const CX = 15;
const CY = 22;
const FX = CX + 4;
const FY = CY + 7;

/** The lantern's light by the rules: its pool's middle four below its foot, 66 across each way. */
export const POST_LANTERN2_LIGHT = {
  radius: 70,
  strength: 0.55,
  pool: 66,
  flicker: 0.12,
} as const;

function postAndCairn(g: TGrid): void {
  // The cairn of stones round its foot, moss on them.
  for (const [x, y, rx, ry] of [
    [4, LH - 4, 4, 3],
    [14, LH - 4, 4.4, 3.2],
    [9, LH - 6, 4, 3],
  ] as const)
    dome(g, x, y, rx, ry, 'caverock', 2.8, 1.8);
  for (const [x, y] of [
    [7, LH - 9],
    [8, LH - 9],
    [12, LH - 8],
    [3, LH - 7],
    [16, LH - 7],
  ] as const)
    put(g, x, y, cell('moss', (x + y) % 2 ? 2 : 3));
  // The post: a crooked length of root-wood, lit on its left, a knot or two, leaning a little.
  const lean = (y: number) => Math.round(Math.sin((y / LH) * 3.1) * 1.2);
  for (let y = 14; y < LH - 6; y++) {
    const x0 = PX - 2 + lean(y);
    for (let i = 0; i < 5; i++) {
      const t = i === 0 ? 1 : i === 1 ? 2 : i < 4 ? 3 : 4;
      const knot = hash(Math.floor(y / 7), 0, 931) < 0.3 && y % 7 === 3 && i > 1 && i < 4;
      put(g, x0 + i, y, cell('bark', knot ? 5 : t + (hash(x0 + i, y, 932) < 0.12 ? 1 : 0)));
    }
  }
  // Its crook over the top, curling out to the right, the lantern's chain from its end.
  rod(g, PX + lean(14), 15, PX + 2, 10, 4, 'bark', [1, 2, 3, 4]);
  rod(g, PX + 2, 10, CX + 3, 9, 4, 'bark', [1, 2, 3, 4]);
  rod(g, CX + 3, 9, CX + 6, 12, 3, 'bark', [2, 3, 4]);
  // A rag of moss hanging from the crook.
  for (const [x, y] of [
    [PX + 3, 13],
    [PX + 3, 14],
    [PX + 4, 13],
    [PX + 4, 15],
  ] as const)
    put(g, x, y, cell('moss', y > 13 ? 4 : 3));
  line(g, CX + 4, 12, CX + 4, CY - 1, cell('iron', 3));
}

/**
 * The lantern: a cap, a cage of four panes, a candle. `glow` 0 dark panes,
 * 1 to 3 the panes warming, 4 burning; `flame` which shape it burns in (0
 * none; 1 a spark; 2 small; 3 to 6 the full flame wavering).
 */
function lanternCage(g: TGrid, glow: number, flame: number): void {
  const pane: Cell =
    glow === 0
      ? cell('pane', 5)
      : glow === 1
        ? cell('lamp', 5)
        : glow === 2
          ? cell('lamp', 4)
          : glow === 3
            ? cell('lamp', 3)
            : cell('lamp', 2);
  // Unlit panes are `pane` (a window that stays dark at dusk), never `glass` (which lights up).
  const inner: Cell = glow === 0 ? cell('pane', 4) : cell('lamp', Math.max(0, 4 - glow));
  sprite(
    g,
    CX,
    CY,
    [
      '...ab....',
      '..aaab...',
      '.aaaabb..',
      'abbbbbbc.',
      'aPPaPPbc.',
      'aPIaIPbc.',
      'aPIaIPbc.',
      'aPPaPPbc.',
      'aPPaPPbc.',
      'abbbbbbc.',
      '.bbcccc..',
      '..bcc....',
    ],
    {
      a: ['iron', 2],
      b: ['iron', 3],
      c: ['iron', 5],
      P: ['pane', 5],
      I: ['pane', 4],
    },
  );
  // The panes and the light inside them.
  for (let y = CY + 4; y <= CY + 8; y++)
    for (let x = CX + 1; x <= CX + 5; x++) {
      if (x === CX + 3) continue;
      const mid = (x === CX + 2 || x === CX + 4) && y >= CY + 5 && y <= CY + 6;
      put(g, x, y, mid ? inner : pane);
    }
  // The candle and its wick.
  put(g, FX - 1, FY + 1, cell('plaster', 1));
  put(g, FX - 1, FY, cell('tar', 4));
  // The flame, standing on the wick.
  const shapes: Record<number, readonly (readonly [number, number, number])[]> = {
    1: [[0, 0, 0]],
    2: [
      [0, 0, 2],
      [0, -1, 1],
    ],
    3: [
      [0, 0, 2],
      [0, -1, 1],
      [0, -2, 0],
      [1, 0, 3],
    ],
    4: [
      [0, 0, 2],
      [0, -1, 1],
      [1, -1, 2],
      [0, -2, 0],
      [-1, 0, 3],
    ],
    5: [
      [0, 0, 2],
      [0, -1, 0],
      [0, -2, 1],
      [1, -2, 0],
      [1, 0, 3],
    ],
    6: [
      [0, 0, 2],
      [-1, -1, 1],
      [0, -1, 0],
      [0, -2, 1],
      [-1, 0, 3],
    ],
  };
  for (const [dx, dy, t] of shapes[flame] ?? []) put(g, FX - 1 + dx, FY - 1 + dy, cell('fire', t));
}

/** Smoke from the lantern's cap: a wisp rising and leaning, thinning as it goes (frames 0 to 3). */
function smoke(g: TGrid, f: number): void {
  const n = [9, 12, 12, 9][f]!;
  for (let i = 0; i < n; i++) {
    const y = CY - 1 - i - f * 2;
    if (y < 0) break;
    const x = CX + 4 + Math.round(Math.sin(i * 0.55 + f * 0.9) * (1 + i * 0.18));
    const fade = Math.min(5, 1 + Math.floor((i + f * 2) / 4));
    if (fade >= 5 && hash(i, f, 941) < 0.5) continue;
    put(g, x, y, cell('smoke', fade));
    if (i > 3 && i < n - 2 && hash(i, f, 942) < 0.5)
      put(g, x + 1, y, cell('smoke', Math.min(5, fade + 1)));
  }
  // The wick still glowing for a moment.
  if (f < 2) put(g, FX - 1, FY - 1, cell('ember', 4 + f));
}

/** A lantern on a post in a state, at a frame of it: the grid before the outline. */
function postLanternGrid(state: PostLanternState, frame: number): TGrid {
  const g = tgrid(LW, LH);
  postAndCairn(g);
  const f =
    ((Math.floor(frame) % POST_LANTERN2_FRAMES[state]) + POST_LANTERN2_FRAMES[state]) %
    POST_LANTERN2_FRAMES[state];
  if (state === 'out') lanternCage(g, 0, 0);
  else if (state === 'lighting') lanternCage(g, f, [1, 2, 3, 4][f]!);
  else if (state === 'lit') lanternCage(g, 4, [3, 4, 5, 6][f]!);
  else {
    lanternCage(g, 0, 0);
    smoke(g, f);
  }
  return g;
}

/** Whether a state's frame gives light (its glows and pool): burning, and lighting from its third frame. */
export const postLanternShines = (state: PostLanternState, frame: number): boolean =>
  state === 'lit' || (state === 'lighting' && ((frame % 4) + 4) % 4 >= 2);

/** A lantern on a post in a state, at a frame, as a prop. Its light only while it shines. */
export function postLanternProp(state: PostLanternState, frame = 0): BurrowProp {
  const shines = postLanternShines(state, frame);
  const strength = state === 'lighting' ? (((frame % 4) + 4) % 4 === 2 ? 0.6 : 0.85) : 1;
  return {
    grid: outlined(postLanternGrid(state, frame)),
    base: LH,
    foot: PX,
    glows: shines
      ? [
          { x: FX - 0.5, y: FY - 1, radius: 24, strength: 0.55 * strength },
          { x: FX - 0.5, y: FY - 1, radius: POST_LANTERN2_LIGHT.radius, strength: 0.28 * strength },
        ]
      : [],
    ...(shines
      ? {
          light: {
            x: FX - 0.5,
            y: FY - 1,
            ...POST_LANTERN2_LIGHT,
            // Its pool's middle four below the foot (the outline moves both a row down alike).
            drop: LH - 1 + 4 - (FY - 1),
          },
        }
      : {}),
  };
}

/* ----------------------------------------------------------------- floors */

/** A toadstool: a domed cap with its gills' dark rim under it on a pale stem, spots or a glow. */
function toadstool(
  g: TGrid,
  x: number,
  foot: number,
  h: number,
  r: number,
  cap: Mat2,
  spots: boolean,
): void {
  // The stem, a pale cylinder, a ring on it.
  for (let y = foot - h; y <= foot; y++)
    for (let i = -1; i <= 1; i++) put(g, x + i, y, cell('stalk', i < 0 ? 1 : i === 0 ? 2 : 4));
  if (h > 6)
    for (let i = -2; i <= 2; i++) put(g, x + i, foot - h + 3, cell('stalk', i < 0 ? 1 : 3));
  // The gills' rim.
  for (let i = -r + 1; i <= r - 1; i++) put(g, x + i, foot - h, cell('stalk', 5));
  // The cap, a flattened dome.
  const top = foot - h - Math.max(2, Math.round(r * 0.7));
  paint(g, x - r, top, r * 2 + 1, foot - h - top, (px, py) => {
    const nx = (px + 0.5 - x - 0.5) / (r + 0.5);
    const ny = (py + 0.5 - (foot - h)) / (foot - h - top + 0.5);
    if (nx * nx + ny * ny > 1) return 0;
    const lit = -(nx * 0.6 + ny * 0.8);
    return cell(cap, lim(2.6 - lit * 1.8, cap === 'glowcap' ? 2 : 1, cap === 'glowcap' ? 4 : 5));
  });
  if (spots)
    for (const [dx, dy] of [
      [-r + 2, -1],
      [0, -2],
      [r - 2, -1],
      [-1, -1],
    ] as const)
      if (hash(x + dx, dy, 951) < 0.8) put(g, x + dx, foot - h - 1 + dy, cell('cream', 1));
}

/** A clump of toadstools on a tile: a tall tawny one, a short one beside it, a knot of little glowing ones at its foot. */
function toadstools(): BurrowProp {
  const W = 24;
  const H = 30;
  const g = tgrid(W, H);
  // Their bed: leaf mould heaped at their feet.
  dome(g, 12, H - 2, 10, 2.6, 'soil', 3.2, 1.2);
  toadstool(g, 9, H - 3, 12, 6, 'ochre', true);
  toadstool(g, 16, H - 3, 6, 4, 'umber', false);
  // A knot of little glowing caps, each a dome on a pale stem, close together so they read as one
  // clump (two apart in the dark read as a pair of eyes).
  toadstool(g, 20, H - 2, 4, 2, 'glowcap', false);
  toadstool(g, 17, H - 1, 2, 1, 'glowcap', false);
  toadstool(g, 22, H - 1, 1, 1, 'glowcap', false);
  return {
    grid: outlined(g),
    base: H,
    glows: [{ x: 21, y: H - 6, radius: 9, strength: 0.26, always: true, rgb: FUNGUS2_RGB }],
  };
}

/** A tangle of roots arching out of the floor and back into it, about a tile across. */
function rootTangle(): BurrowProp {
  const W = 30;
  const H = 22;
  const g = tgrid(W, H);
  // The earth heaved up where they break the floor.
  dome(g, 15, H - 2, 13, 2.4, 'soil', 3.4, 1.2);
  // Arches of root, the far ones darker, each a rod bent over in steps.
  const arch = (x0: number, x1: number, top: number, w: number, far: boolean) => {
    const n = 12;
    let px = x0;
    let py = H - 2;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t;
      const y = H - 2 - Math.sin(t * Math.PI) * (H - 2 - top);
      rod(g, px, py, x, y, w, 'root', far ? [3, 4, 5] : [1, 2, 3, 4]);
      px = x;
      py = y;
    }
  };
  arch(3, 18, 6, 3, true);
  arch(12, 28, 3, 4, false);
  arch(1, 13, 9, 3, false);
  // Hair roots trailing from the arches.
  for (const [x, y] of [
    [8, 10],
    [9, 11],
    [21, 8],
    [21, 9],
    [22, 10],
  ] as const)
    put(g, x, y, cell('root', 4));
  return { grid: outlined(g), base: H, glows: [] };
}

/** A bramble patch: a mound of arching briar stems, thorns pale on them, a few dark berries and leaves. */
function bramblePatch(): BurrowProp {
  const W = 30;
  const H = 24;
  const g = tgrid(W, H);
  // The mound of dark leaves under the stems.
  shaped(
    g,
    poly([
      [1, H - 1],
      [3, 12],
      [9, 7],
      [16, 5],
      [23, 8],
      [28, 13],
      [29, H - 1],
    ]),
    'briar',
    {
      base: 3.4,
      contrast: 1.4,
      radius: 4,
      tex: (x, y, t) =>
        hash(x >> 1, y >> 1, 961) < 0.25 ? t + 1 : hash(x, y, 962) > 0.93 ? t - 1 : t,
    },
  );
  // Arching stems over it, lit on top, thorns along them.
  const stem = (x0: number, x1: number, top: number) => {
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / (x1 - x0);
      const y = Math.round(H - 3 - Math.sin(t * Math.PI) * (H - 3 - top));
      put(g, x, y - 1, cell('root', 2));
      put(g, x, y, cell('root', 3));
      put(g, x, y + 1, cell('briar', 5));
      if ((x * 7 + top) % 4 === 0) put(g, x, y - 2, cell('cream', 1));
    }
  };
  stem(2, 20, 4);
  stem(9, 28, 6);
  stem(5, 14, 10);
  // Berries in little clusters.
  for (const [x, y] of [
    [7, 13],
    [8, 14],
    [20, 11],
    [21, 12],
    [20, 13],
    [14, 16],
  ] as const) {
    put(g, x, y, cell('plum', 4));
    put(g, x - 1, y - 1, cell('plum', 1));
  }
  return { grid: outlined(g), base: H, glows: [] };
}

/** A mossy stone: a lumpy boulder, moss in cushions over its top, wet and dark where it sits. */
function mossyStone(): BurrowProp {
  const W = 26;
  const H = 22;
  const g = tgrid(W, H);
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 1 + (hash(i, 3, 971) - 0.5) * 0.2;
    pts.push([13 + Math.cos(a) * 11 * r, 13 + Math.sin(a) * 9 * r * (Math.sin(a) > 0 ? 0.85 : 1)]);
  }
  const rock = poly(pts);
  shaped(g, rock, 'clay', { base: 3, contrast: 1.5, radius: 5 });
  // Moss over its top: cushions lit on their upper left, hanging a little over its shoulders.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!rock(x, y)) continue;
      const edge =
        9 + Math.sin(x * 0.7) * 1.5 + (hash(x, 0, 972) < 0.3 ? 2 : 0) - Math.abs(x - 12) * 0.2;
      if (y < edge) {
        // Cushions: each a little dome lit on its upper left, a dark rim where it overhangs.
        const cx = Math.floor(x / 4) * 4 + 2;
        const lit = (cx - x) * 0.4 + (edge - 4 - y) * 0.3;
        put(g, x, y, cell('moss', lim(y > edge - 1.2 ? 5 : 2.8 - lit, 1, 5)));
      }
    }
  // Its foot wet and dark.
  for (let x = 4; x < 22; x++) put(g, x, H - 2, cell('caverock', 5));
  return { grid: outlined(g), base: H, glows: [] };
}

/** A fallen log across a tile: bark in ridges, a cut end showing its rings, moss and a shelf of fungus. */
function fallenLog(): BurrowProp {
  const W = 32;
  const H = 18;
  const g = tgrid(W, H);
  const top = 4;
  const bottom = H - 2;
  // The log, a cylinder lying across, lit along its top.
  for (let y = top; y <= bottom; y++)
    for (let x = 3; x < W - 4; x++) {
      const v = (y - top) / (bottom - top);
      const ridge = (x + Math.round(Math.sin(y * 1.3) * 1.2)) % 4 === 0;
      put(g, x, y, cell('bark', lim(1.5 + v * 3 + (ridge ? 1 : 0), 1, 5)));
    }
  // The cut end on the right, rings of pale wood.
  for (let y = top; y <= bottom; y++)
    for (let x = W - 6; x < W; x++) {
      const nx = (x + 0.5 - (W - 3.5)) / 3;
      const ny = (y + 0.5 - (top + bottom + 1) / 2) / ((bottom - top + 1) / 2);
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      const ring = Math.round(Math.sqrt(d) * 4);
      put(g, x, y, cell('root', d > 0.8 ? 4 : ring % 2 ? 2 : 1));
    }
  // The broken end on the left, splintered.
  for (const [x, y] of [
    [2, 6],
    [1, 8],
    [2, 10],
    [1, 12],
    [2, 14],
  ] as const)
    put(g, x, y, cell('root', 3));
  // Moss along its top.
  for (let x = 6; x < 22; x++)
    if (hash(x, 1, 981) < 0.7) put(g, x, top - (x % 3 === 0 ? 1 : 0), cell('moss', x % 2 ? 2 : 3));
  // Brackets of fungus stepped up its side, each a half-disc lit on top (not glowing: two logs end
  // to end, as lane C lays them, made a pair of eyes in the dark).
  for (const [x, y, r] of [
    [14, 12, 3],
    [17, 9, 2],
    [12, 9, 2],
  ] as const)
    for (let dy = 0; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (dx * dx + (dy * 1.6) ** 2 <= r * r + 1)
          put(g, x + dx, y + dy, cell('ochre', dy === 0 ? 1 : dy === r ? 4 : 2));
  return {
    grid: outlined(g),
    base: H,
    glows: [],
  };
}

/* ------------------------------------------------------------ the throne */

/**
 * One segment of the root throne's back, a tile wide: roots woven upright
 * and across, so a run of them (lane C's `JJJJ`) stands as one woven wall
 * behind the king. Each segment ends in an upright at both edges.
 */
function rootThrone(): BurrowProp {
  const W = 24;
  const H = 58;
  const g = tgrid(W, H);
  // Three uprights a segment, each wandering a pixel either way as a root does, the earth
  // packed between them; withies woven across, over one upright and under the next.
  const ups = [2, 10, 18];
  const wob = (i: number, y: number) => Math.round(Math.sin(y * 0.21 + i * 2.1) * 1.1);
  const tops = [5, 2, 6];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let c: Cell = 0;
      ups.forEach((u, i) => {
        const dx = x - (u + wob(i, y));
        if (y >= tops[i]! && dx >= 0 && dx < 5)
          c = cell('root', dx === 0 ? 1 : dx === 1 ? 2 : dx < 4 ? 3 : 5);
      });
      const band = Math.floor((y - 8) / 7);
      const by = (y - 8) % 7;
      if (y >= 8 && by < 3) {
        // Which upright the withy is between, and whether it passes over it here.
        const seg = Math.floor((x + 2) / 8);
        const over = (seg + band) % 2 === 0;
        if (!c || over) c = cell('root', by === 0 ? 2 : by === 1 ? 3 : 4);
      }
      if (!c && y >= 7) c = cell('soil', by >= 5 ? 5 : 4);
      if (c) put(g, x, y, c);
    }
  // Rounded tops on the uprights, a shoot sprouting from the tallest.
  ups.forEach((u, i) => {
    for (let dx = 1; dx < 4; dx++) put(g, u + wob(i, tops[i]!) + dx, tops[i]! - 1, cell('root', 2));
  });
  put(g, 12, 0, cell('moss', 2));
  put(g, 13, 0, cell('moss', 3));
  put(g, 14, 1, cell('moss', 3));
  // Moss low down where the damp gets in.
  for (let x = 0; x < W; x++)
    if (hash(x, 2, 993) < 0.55) put(g, x, H - 1 - (x % 3 === 0 ? 1 : 0), cell('moss', 4));
  return { grid: outlined(g), base: H, glows: [] };
}

/**
 * The badger king's throne, whole (four tiles): a great chair grown of roots,
 * its back a fan of roots woven together and rising to a crown of shoots,
 * arms of thick root ending in knots, a seat with a faded crimson cushion and
 * a moth-eaten fur thrown over it. Stand it once, its foot at its middle.
 */
function badgerThrone(): BurrowProp {
  const W = 96;
  const H = 70;
  const g = tgrid(W, H);
  const cx = W / 2;
  // The back: roots fanning up from the seat, woven across, its top a ragged crown of shoots.
  for (let i = -6; i <= 6; i++) {
    const x0 = cx + i * 3.2;
    const x1 = cx + i * 6.4;
    const top = 6 + Math.abs(i) * 2.6 + (i % 2 ? 2 : 0);
    rod(g, x0, H - 26, x1, top, 4, 'root', Math.abs(i) > 3 ? [2, 3, 4, 5] : [1, 2, 3, 4]);
    // A shoot at its tip.
    put(g, Math.round(x1), Math.round(top) - 1, cell('moss', 2));
    put(g, Math.round(x1) + 1, Math.round(top) - 2, cell('moss', 3));
  }
  for (const y of [18, 28, 38]) {
    const half = 30 - (y - 18) * 0.45;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      put(g, x, y + Math.round(Math.sin(x * 0.4) * 1.2), cell('root', 2));
      put(g, x, y + 1 + Math.round(Math.sin(x * 0.4) * 1.2), cell('root', 4));
    }
  }
  // The seat: a block of packed earth faced with roots.
  paint(g, cx - 22, H - 26, 45, 22, (x, y) => {
    const lip = y < H - 22;
    const face = (x + Math.round(Math.sin(y * 0.6) * 1.5)) % 6;
    return cell(
      lip ? 'root' : 'soil',
      lip ? (y === H - 26 ? 1 : 2) : face === 0 ? 5 : face < 3 ? 3 : 4,
    );
  });
  // The cushion, faded crimson, a tassel; the fur thrown over its left end.
  shaped(
    g,
    poly([
      [cx - 18, H - 26],
      [cx - 16, H - 31],
      [cx + 16, H - 31],
      [cx + 18, H - 26],
    ]),
    'crimson',
    { base: 3, contrast: 1.4, radius: 3 },
  );
  put(g, Math.round(cx + 18), H - 25, cell('gold', 2));
  put(g, Math.round(cx + 18), H - 24, cell('gold', 3));
  shaped(
    g,
    poly([
      [cx - 26, H - 30],
      [cx - 14, H - 32],
      [cx - 10, H - 22],
      [cx - 20, H - 12],
      [cx - 27, H - 18],
    ]),
    'fur',
    {
      base: 2.6,
      contrast: 1.2,
      radius: 3,
      tex: (x, y, t) => (hash(x >> 1, y, 991) < 0.22 ? t + 1 : t),
    },
  );
  // The arms: thick roots running forward, each ending in a great knot.
  for (const side of [-1, 1]) {
    const x0 = cx + side * 26;
    rod(g, cx + side * 20, H - 30, x0, H - 26, 6, 'root', [1, 2, 3, 4, 5]);
    rod(g, x0, H - 26, x0, H - 3, 6, 'root', [1, 2, 3, 4, 5]);
    dome(g, x0, H - 30, 5, 4, 'root', 2.4, 1.6);
  }
  // Toadstools growing at its feet, one glowing.
  toadstool(g, Math.round(cx - 36), H - 2, 6, 4, 'ochre', true);
  toadstool(g, Math.round(cx + 37), H - 2, 3, 3, 'glowcap', false);
  return {
    grid: outlined(g),
    base: H,
    glows: [{ x: cx + 38, y: H - 8, radius: 9, strength: 0.32, always: true, rgb: FUNGUS2_RGB }],
  };
}

/* ------------------------------------------------------- lived in */

/** A mushroom-folk dwelling: a toadstool as tall as a man, a round door in its stem, a window, a pipe. */
function mushroomDwelling(): BurrowProp {
  const W = 46;
  const H = 66;
  const g = tgrid(W, H);
  const cx = 23;
  // The stem: a fat pale barrel, lit on its left, a round door, a window with a warm light.
  paint(g, cx - 11, 26, 23, H - 27, (x, y) => {
    const t = (y - 26) / (H - 27);
    const half = 8 + t * 3.4;
    const nx = (x + 0.5 - cx) / half;
    if (Math.abs(nx) > 1) return 0;
    return cell('stalk', lim(2.4 + nx * 1.6 + (hash(x, y >> 2, 1001) < 0.1 ? 1 : 0), 1, 5));
  });
  // The door: round-topped planks, a ring.
  paint(g, cx - 5, H - 16, 10, 15, (x, y) => {
    const dy = y - (H - 11);
    if (dy < 0 && Math.hypot(x + 0.5 - cx, dy) > 5) return 0;
    return cell('wood', (x - (cx - 5)) % 3 === 0 ? 5 : x < cx ? 2 : 3);
  });
  put(g, cx + 2, H - 8, cell('gold', 2));
  // The window, lit from inside, its frame and a shutter.
  sprite(g, cx + 3, 33, ['abbba', 'bLLLb', 'bLlLb', 'abbba'], {
    a: ['wood', 4],
    b: ['wood', 3],
    L: ['glass', 1],
    l: ['glass', 0],
  });
  // The cap: a broad dome, brown with cream spots, gills under its rim.
  for (let x = cx - 21; x <= cx + 21; x++) put(g, x, 26, cell('stalk', 5));
  paint(g, cx - 22, 2, 45, 25, (x, y) => {
    const nx = (x + 0.5 - cx - 0.5) / 22.5;
    const ny = (y + 0.5 - 26) / 24;
    if (nx * nx + ny * ny > 1 || y > 25) return 0;
    const lit = -(nx * 0.6 + ny * 0.8);
    return cell('umber', lim(2.6 - lit * 1.9, 1, 5));
  });
  for (const [x, y, r] of [
    [cx - 12, 14, 2],
    [cx - 2, 7, 2.5],
    [cx + 10, 12, 2],
    [cx + 4, 18, 1.5],
    [cx - 16, 21, 1.5],
    [cx + 16, 20, 1.5],
  ] as const)
    dome(g, x, y, r, r * 0.8, 'cream', 1.6, 1);
  // A crooked chimney pipe through the cap with a wisp.
  rod(g, cx + 12, 10, cx + 14, 0, 3, 'iron', [2, 3, 5]);
  return {
    grid: outlined(g),
    base: H,
    glows: [{ x: cx + 6, y: 36, radius: 14, strength: 0.45 }],
  };
}

/** The larder: a shelf dug in under a great root, jars and crocks on it, roots and herbs hanging. */
function larder(): BurrowProp {
  const W = 40;
  const H = 44;
  const g = tgrid(W, H);
  // The root arching over it and the earth behind.
  paint(g, 2, 6, 36, H - 8, (x, y) =>
    cell('soil', y < 10 ? 4 : 5 + (hash(x, y, 1011) < 0.1 ? 1 : 0)),
  );
  rod(g, 0, 10, 20, 2, 6, 'root', [1, 2, 3, 4, 5]);
  rod(g, 20, 2, 39, 9, 6, 'root', [1, 2, 3, 4, 5]);
  // Two shelves of plank.
  for (const sy of [18, 32])
    for (let x = 3; x < 37; x++) {
      put(g, x, sy, cell('wood', 1));
      put(g, x, sy + 1, cell('wood', 3));
      put(g, x, sy + 2, cell('wood', 5));
    }
  // Jars and crocks: each a little vessel with a lit side, a lid or a cloth tied over it.
  const jar = (x: number, sy: number, w: number, h: number, mat: Mat2, lid: Mat2) => {
    paint(g, x, sy - h, w, h, (px) => cell(mat, px === x ? 1 : px === x + w - 1 ? 4 : 2));
    for (let i = 0; i < w; i++) put(g, x + i, sy - h - 1, cell(lid, i === 0 ? 1 : 3));
  };
  jar(5, 18, 4, 6, 'clay', 'linen');
  jar(11, 18, 5, 8, 'pane', 'wood');
  jar(19, 18, 3, 5, 'ochre', 'linen');
  jar(25, 18, 5, 7, 'clay', 'madder');
  jar(6, 32, 6, 8, 'clay', 'wood');
  jar(15, 32, 4, 6, 'pane', 'linen');
  jar(22, 32, 5, 9, 'umber', 'linen');
  // Roots and herbs hanging in bunches from the root above.
  for (const [x, n, mat] of [
    [8, 7, 'root'],
    [14, 5, 'moss'],
    [31, 8, 'root'],
    [34, 5, 'moss'],
  ] as const)
    for (let i = 0; i < n; i++)
      put(g, x + (i > n / 2 ? 1 : 0), 5 + i + (x > 20 ? 3 : 0), cell(mat, i === n - 1 ? 4 : 2));
  // A sack slumped at its foot.
  dome(g, 31, H - 6, 6, 4.5, 'linen', 2.4, 1.6);
  return { grid: outlined(g), base: H, glows: [] };
}

/** The court's bench: a split log on two stumps, worn smooth where the court sits. */
function courtBench(): BurrowProp {
  const W = 40;
  const H = 18;
  const g = tgrid(W, H);
  for (const x of [5, 30]) {
    paint(g, x, 7, 6, H - 7, (px, py) =>
      cell('bark', px === x ? 2 : px === x + 5 ? 5 : 3 + (py % 4 === 0 ? 1 : 0)),
    );
  }
  for (let x = 0; x < W; x++) {
    put(g, x, 4, cell('wood', x % 9 === 0 ? 2 : 1));
    put(g, x, 5, cell('wood', 2));
    put(g, x, 6, cell('wood', 3));
    put(g, x, 7, cell('bark', 4));
    put(g, x, 8, cell('bark', 5));
  }
  return { grid: outlined(g), base: H, glows: [] };
}

/** The king's banner: a pole of root-wood, a crossbar, a banner of faded purple with a crowned badger's head. */
function settBanner(): BurrowProp {
  const W = 26;
  const H = 70;
  const g = tgrid(W, H);
  rod(g, 4, 2, 4, H - 1, 3, 'bark', [1, 3, 4]);
  rod(g, 2, 6, 24, 6, 2, 'bark', [2, 4]);
  put(g, 24, 5, cell('gold', 1));
  // The banner: hanging cloth, its foot cut in a swallowtail, a fold or two.
  paint(g, 7, 8, 17, 36, (x, y) => {
    const tail = y > 38 && Math.abs(x - 15) < (y - 38) * 1.3;
    if (tail) return 0;
    const fold = (x - 7) % 6 === 5 ? 1 : (x - 7) % 6 === 0 ? -1 : 0;
    return cell('violet', lim(3 + fold + (y > 30 ? 0.5 : 0), 1, 5));
  });
  // The badger's head on it: a white face with the dark stripes, a gold crown.
  sprite(
    g,
    10,
    15,
    [
      '..g.g.g..',
      '..ggggg..',
      '.kwwkwwk.',
      '.kwkkkwk.',
      '.wwkkkww.',
      '..wkkkw..',
      '..wwkww..',
      '...wkw...',
      '....k....',
    ],
    { g: ['gold', 1], k: ['badger', 5], w: ['linen', 1] },
  );
  // A gold border.
  for (let y = 8; y < 40; y++) {
    put(g, 7, y, cell('gold', 3));
    put(g, 23, y, cell('gold', 4));
  }
  return { grid: outlined(g), base: H - 1, foot: 4, glows: [] };
}

/** The Burrow's props, by id (the lantern by its two states' ids). */
export const BURROW_PROPS: Readonly<Record<string, () => BurrowProp>> = {
  post_lantern: () => postLanternProp('lit', 0),
  post_lantern_out: () => postLanternProp('out', 0),
  toadstools,
  root_tangle: rootTangle,
  bramble_patch: bramblePatch,
  mossy_stone: mossyStone,
  fallen_log: fallenLog,
  root_throne: rootThrone,
  badger_throne: badgerThrone,
  mushroom_dwelling: mushroomDwelling,
  larder,
  court_bench: courtBench,
  sett_banner: settBanner,
};
