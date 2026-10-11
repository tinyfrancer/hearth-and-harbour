/**
 * Title C, the hero on the headland: dawn, a big sky, the sun just up out of
 * the sea on the left (so the light still comes from the upper left, as the
 * whole game's does), the harbour town small and far below in its bay with
 * the cutter standing out to sea, and the hero, from behind, on the cliff top
 * in the knight's gear, the red cloak lifting in the wind.
 *
 * Reuses the real hero (character2.ts: the knight's back view, the walk's
 * standing frame), the real wind-bent pine (trees.ts), long grass and wild
 * flowers (ground.ts) and gulls (props.ts). The far town, ship and cliff are
 * drawn new, in the town's materials under the dawn.
 *
 * What moves: clouds drifting, the sun's glitter path on the sea, the cloak
 * (its edge streaming out in the wind), gulls wheeling, the pine's top
 * swaying a pixel, smoke from the town's chimneys.
 */
import { at, hash, outlined, put, stamp, tgrid, type TGrid } from '../../src/art/town2/cells';
import { characterWalkPicture2, KNIGHT_GEAR2 } from '../../src/art/character2';
import { pineTree2 } from '../../src/art/town2/trees';
import { flowerDrift, longGrass } from '../../src/art/town2/ground';
import { gull } from '../../src/art/town2/props';
import { cell } from '../../src/art/town2/cells';
import { clamp, clumps, noise } from '../../src/art/town2/texture';
import { X, isX, xpal, type BandGlow } from './pal';
import { bands, run, type Stop } from './paint';
import { chimneyTop, farBuilding, farPine, farShip, farSmoke, type FarSpec } from './far';
import { lockupUncial, stampCentred } from './lockups';
import { SCREEN_H, SCREEN_W, type Frame, type Title } from './screen';

const C = cell;
const LOOP = 6000;
const HORIZON = 470;
const SUN = { x: 92, y: HORIZON };
const SKY: Stop[] = [...run('dawnHi', 7, 0), ...run('dawnLo', 7, 0)];
const HERO = { x: 240, y: 700 };

/** The headland's top edge: grass from the right, falling to the cliff's lip. */
const lip = (x: number) => 600 + Math.pow(Math.max(0, 390 - x) / 240, 1.6) * 110 + Math.sin(x / 13) * 2;
/** The cliff's foot in the sea. */
const LIP_X0 = 150;

const S = 0.62;
const TOWN: FarSpec[] = [
  {
    x: 36, base: 664, w: Math.round(120 * S), wallH: Math.round(50 * S), roofH: Math.round(30 * S),
    roof: 'tile', wall: 'timber',
    windows: [
      { x: 6, y: 5, lit: false, w: 4, h: 5 }, { x: 22, y: 5, lit: false, w: 4, h: 5 },
      { x: 40, y: 5, lit: false, w: 4, h: 5 }, { x: 58, y: 5, lit: false, w: 4, h: 5 },
      { x: 6, y: 19, lit: false, w: 4, h: 5 }, { x: 58, y: 19, lit: false, w: 4, h: 5 },
    ],
    door: { x: 34, w: 6, h: 10 }, chimney: { x: 54, w: 5, h: 9 }, k: 3,
  },
  {
    x: 150, base: 670, w: Math.round(96 * S), wallH: Math.round(36 * S), roofH: Math.round(24 * S),
    roof: 'slate', wall: 'rubble', windows: [{ x: 48, y: 7, lit: false, w: 4, h: 5 }],
    forge: { x: 8, w: 20, h: 14 }, chimney: { x: 16, w: 5, h: 10 }, k: 11,
  },
  {
    x: 128, base: 628, w: Math.round(72 * S), wallH: Math.round(30 * S), roofH: Math.round(26 * S),
    roof: 'thatch', wall: 'limewash',
    windows: [{ x: 6, y: 6, lit: false, w: 4, h: 5, shutters: true }, { x: 32, y: 6, lit: false, w: 4, h: 5, shutters: true }],
    door: { x: 20, w: 5, h: 9, mat: 'blue' }, chimney: { x: 36, w: 4, h: 8 }, k: 23,
  },
];

function backdrop(): { g: TGrid; glows: BandGlow[] } {
  const g = tgrid(SCREEN_W, SCREEN_H);
  bands(g, 0, HORIZON, SKY, { k: 12, stretch: 7, curve: (f) => Math.pow(f, 1.35) });
  const glows: BandGlow[] = [];
  // The far cape across the bay, in haze.
  for (let x = 0; x < 60; x++) {
    const top = HORIZON - 10 + Math.round(Math.pow(x / 60, 1.5) * 10 + noise(x / 6, 0, 1, 2) * 2);
    for (let y = top; y < HORIZON; y++) put(g, x, y, X('hazeDawn', y - top < 1 ? 2 : 3));
  }
  // The land behind the town: hills going up toward the headland, forest on them.
  for (let x = 0; x < SCREEN_W; x++) {
    const top = Math.round(560 - Math.pow(x / SCREEN_W, 1.3) * 40 + noise(x / 30, 0, 1, 8) * 14);
    for (let y = top; y < 664; y++) put(g, x, y, X('hazeDawn', y - top < 2 ? 3 : 4));
  }
  for (let i = 0; i < 40; i++) {
    const cx = Math.round(i * 10 + hash(i, 1, 9) * 8);
    const top = Math.round(560 - Math.pow(cx / SCREEN_W, 1.3) * 40 + noise(cx / 30, 0, 1, 8) * 14);
    farPine(g, cx, top + 10 + Math.round(hash(i, 2, 9) * 8), 16 + Math.round(hash(i, 3, 9) * 10), (lit, sh) =>
      X('hazeDawn', lit ? 3 : sh ? 6 : 5), i);
  }
  // Nearer slope, in the town's grass.
  for (let x = 0; x < SCREEN_W; x++) {
    const top = Math.round(608 + Math.sin(x / 50) * 6 - x * 0.04);
    for (let y = top; y < 664; y++) put(g, x, y, C('grass', 2 + (clumps(x / 2, y, 5) > 0.6 ? 1 : 0) + (y - top < 1 ? -1 : 0)));
  }
  // The town.
  glows.push(...farBuilding(g, TOWN[2]!, false));
  for (const [cx, base, h] of [
    [24, 640, 26],
    [118, 650, 30],
    [214, 660, 28],
    [236, 640, 24],
  ] as const)
    farPine(g, cx, base, h, (lit, sh) => C('pine', lit ? 2 : sh ? 4 : 3), cx);
  glows.push(...farBuilding(g, TOWN[0]!, false));
  glows.push(...farBuilding(g, TOWN[1]!, false));
  // The quay and the shore below it.
  for (let x = 0; x < 260; x++) {
    for (let y = 664; y < 670; y++) put(g, x, y, C('cobble', 2 + ((x + y) % 5 === 0 ? 1 : 0)));
    for (let y = 670; y < 676; y++) put(g, x, y, C('stone', y === 670 ? 1 : y > 673 ? 4 : 2));
  }
  return { g, glows };
}

/** Where the headland's grass ends on the bay side, by row: the cliff's top edge. */
const grassEdge = (y: number) => 214 + (y - 680) * 0.1 + noise(0, y / 8, 1, 5) * 6;
/** The cliff face's foot, flaring out toward the sea as it falls. */
const faceFoot = (y: number) => 206 - Math.pow(Math.max(0, y - 680) / 164, 0.9) * 110 + noise(1, y / 6, 1, 6) * 10;

/**
 * The cliff face on the bay side: rock in tall planes (facets around points
 * spread wider than tall, so strata run up and down), the planes turned to
 * the sun lit, the rest in shade, cracks between them dark or lit at the lip,
 * wet and dark at the foot where the sea foams on it.
 */
function cliff(g: TGrid, ph: number): void {
  const pts: [number, number, number][] = [];
  for (let j = 0; j < 8; j++)
    for (let i = 0; i < 10; i++) pts.push([110 + i * 14 + hash(i, j, 3) * 10, 670 + j * 26 + hash(i, j, 4) * 18, hash(i, j, 5)]);
  for (let y = 680; y < SCREEN_H; y++) {
    const x0 = Math.round(faceFoot(y));
    const x1 = Math.round(grassEdge(y));
    for (let x = x0; x <= x1; x++) {
      let best = 1e9;
      let second = 1e9;
      let pick = 0;
      for (const [px, py, r] of pts) {
        const d = ((px - x) * 1.6) ** 2 + ((py - y) * 0.6) ** 2;
        if (d < best) {
          second = best;
          best = d;
          pick = r;
        } else if (d < second) second = d;
      }
      const crack = Math.sqrt(second) - Math.sqrt(best) < 1.6;
      const across = (x - x0) / Math.max(1, x1 - x0);
      let t = 1.4 + pick * 1.8 + across * 1.6;
      if (crack) t = pick > 0.5 ? 5 : 0.5;
      if (y > SCREEN_H - 26) t += 1.4;
      if (x === x0) t = 6;
      put(g, x, y, C('rock', clamp(t, 0, 6)));
    }
    // Foam where the sea meets the foot, moving with the swell.
    if (y > SCREEN_H - 40)
      for (let i = 1; i < 5; i++)
        if (hash(y, i, Math.floor(ph * 8)) < 0.5 - i * 0.1) put(g, x0 - i, y, C('sea', 0));
  }
}

function headlandTop(g: TGrid): void {
  for (let y = 590; y < SCREEN_H; y++)
    for (let x = 0; x < SCREEN_W; x++) {
      const top = lip(x);
      if (y < top) continue;
      if (y >= 680 && x < grassEdge(y)) continue;
      if (y < 680 && x < 200) continue;
      const fromLip = y - top;
      let t = 2 + (clumps(x / 2, y / 1.5, 11) > 0.62 ? 1 : 0) - (fromLip < 1 ? 1 : 0);
      if (fromLip > 40) t += clumps(x / 3, y / 2, 13) > 0.5 ? 1 : 0;
      // The turf's lip over the cliff, lit, and a dark line of shadow under it.
      if (y >= 680 && x - grassEdge(y) < 2) t = 1;
      put(g, x, y, C('grass', t));
    }
  for (let y = 680; y < SCREEN_H; y++) {
    const x = Math.round(grassEdge(y)) - 1;
    put(g, x, y, C('grass', 6));
  }
  // A worn path up from the bottom right to where the hero stands.
  for (let y = HERO.y - 4; y < SCREEN_H; y++) {
    const f = (y - HERO.y) / (SCREEN_H - HERO.y);
    const cx = HERO.x + 4 + Math.sin(f * 2.4) * 30 + f * 70;
    const half = 3 + f * 14;
    for (let x = Math.round(cx - half); x <= cx + half; x++) {
      const e = Math.abs(x - cx) / half;
      if (e > 0.85 && clumps(x, y, 4) > 0.5) continue;
      put(g, x, y, C('dirt', 2 + (e > 0.7 ? 1 : 0) + (clumps(x / 2, y, 9) > 0.7 ? 1 : 0)));
    }
  }
  flowerDrift(g, 330, 790, 40, 20, 26, [1, 3, 4], 7);
  flowerDrift(g, 236, 770, 20, 12, 10, [1, 2], 9);
  longGrass(g, 226, 712, 30, 3);
  longGrass(g, 300, 706, 40, 5);
  longGrass(g, 214, 800, 30, 8);
}

let cache: { g: TGrid; glows: BandGlow[] } | null = null;

function clouds(g: TGrid, ph: number): void {
  // Cumulus: heaps of round puffs, flat-ish below, each puff lit from the low
  // sun on the left and from beneath, shadowed on its upper right.
  const heaps = [
    { cx: 262, cy: 300, w: 120, h: 34, n: 9, depth: 0.1, k: 1 },
    { cx: 40, cy: 352, w: 70, h: 18, n: 6, depth: 0.4, k: 2 },
    { cx: 330, cy: 394, w: 70, h: 14, n: 6, depth: 0.6, k: 3 },
  ];
  heaps.forEach((hp) => {
    const cx = ((hp.cx + ph * 50 * (1 - hp.depth * 0.6) + 200) % (SCREEN_W + 400)) - 200;
    const puffs: [number, number, number][] = [];
    for (let i = 0; i < hp.n; i++) {
      const f = i / (hp.n - 1);
      const px = cx - hp.w / 2 + f * hp.w + (hash(i, 1, hp.k) - 0.5) * 10;
      const r = hp.h * (0.45 + Math.sin(f * Math.PI) * 0.55) * (0.8 + hash(i, 2, hp.k) * 0.4);
      puffs.push([px, hp.cy - r * 0.55, r]);
    }
    for (let y = Math.floor(hp.cy - hp.h * 1.8); y <= hp.cy + 2; y++)
      for (let x = Math.floor(cx - hp.w / 2 - hp.h); x <= cx + hp.w / 2 + hp.h; x++) {
        let best = -1;
        let nx = 0;
        let ny = 0;
        for (const [px, py, r] of puffs) {
          const dx = (x + 0.5 - px) / r;
          const dy = (y + 0.5 - py) / r;
          const d = 1 - (dx * dx + dy * dy);
          if (d > best) {
            best = d;
            nx = dx;
            ny = dy;
          }
        }
        if (best < 0 || y > hp.cy + (hash(x >> 2, 0, hp.k) < 0.5 ? 1 : 0)) continue;
        const toSun = -nx * 0.7 + ny * 0.5;
        const t = 2.6 - toSun * 2.2 + hp.depth * 1.5 + (clumps(x / 2, y / 2, hp.k) - 0.5) * 0.7;
        put(g, x, y, X('cloud', clamp(t, 0, 6)));
      }
  });
  // Cirrus: long thin streaks near the horizon, tapered, lit along their lower edge.
  const streaks = [
    [150, 424, 120, 0.5],
    [40, 440, 80, 0.7],
    [300, 452, 110, 0.85],
    [200, 460, 70, 0.95],
  ] as const;
  streaks.forEach(([cx0, cy, half, depth], i) => {
    const cx = ((cx0 + ph * 30 * (1 - depth * 0.5) + 200) % (SCREEN_W + 400)) - 200;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const f = Math.abs(x - cx) / half;
      const th = Math.round((1 - f * f) * 3 + noise(x / 9, i, 1, 7) * 1.4);
      for (let j = 0; j < th; j++) put(g, x, cy - j, X('cloud', j === 0 ? 1 + depth : 2.4 + depth));
    }
  });
}

function sea(g: TGrid, ph: number): void {
  for (let y = HORIZON; y < SCREEN_H; y++) {
    const f = (y - HORIZON) / (SCREEN_H - HORIZON);
    for (let x = 0; x < SCREEN_W; x++) {
      if (at(g, x, y)) continue;
      // Far water takes the sky's dawn colour, nearer it is the sea's own blue.
      const v = f * 6 + (clumps(x / (8 + f * 20) + ph * 3, y, 15) - 0.5) * 1.2;
      const c = v < 0.6 ? X('dawnLo', 6) : v < 1.3 ? X('hazeDawn', 2) : v < 2.2 ? C('sea', 2) : v < 3.4 ? C('sea', 3) : C('sea', 4);
      put(g, x, y, c);
    }
  }
  // The sun's road on the water: dashes that widen and scatter toward us.
  for (let y = HORIZON + 1; y < SCREEN_H; y++) {
    const f = (y - HORIZON) / (SCREEN_H - HORIZON);
    const half = 4 + f * 70;
    for (let x = Math.round(SUN.x - half); x <= SUN.x + half; x++) {
      if (at(g, x, y) && !isX(at(g, x, y), 'sea') && !isX(at(g, x, y), 'dawnLo') && !isX(at(g, x, y), 'hazeDawn')) continue;
      const e = Math.abs(x - SUN.x) / half;
      const n = noise((x + ph * 30) / (4 + f * 14), y / (1 + f * 2), 1, 21);
      if (n > 0.55 + e * 0.35) put(g, x, y, n > 0.8 + e * 0.15 ? X('dawnLo', 0) : X('dawnLo', 1));
    }
  }
}

function heroWithWind(ph: number): TGrid {
  const pic = characterWalkPicture2({}, [], 'up', 2, KNIGHT_GEAR2);
  const src = pic.grid;
  const g = tgrid(src.w + 16, src.h);
  stamp(g, src, 0, 0);
  // The cloak's windward edge streams out to the left, more toward the hem.
  for (let y = 26; y < src.h - 1; y++) {
    let xl = -1;
    for (let x = 0; x < src.w; x++) {
      const c = at(src, x, y);
      if (c && (c >> 3) === (C('crimson', 0) >> 3)) {
        xl = x;
        break;
      }
    }
    if (xl < 1) continue;
    const f = (y - 26) / (src.h - 27);
    const e = Math.round(f * (3 + Math.sin(ph * Math.PI * 2 * 2 - y * 0.18) * 2.2));
    for (let i = 1; i <= e; i++) put(g, xl - i, y, C('crimson', i === e ? 6 : f > 0.8 ? 3 : 2));
  }
  return g;
}

export function drawC(t: number): Frame {
  cache ??= backdrop();
  const g = tgrid(SCREEN_W, SCREEN_H);
  const ph = (t % LOOP) / LOOP;
  // Sky first (from the cache's rows above the horizon), then clouds, then the rest.
  g.d.set(cache.g.d);
  clouds(g, ph);
  // The sun, half risen.
  for (let y = SUN.y - 22; y < SUN.y; y++)
    for (let x = SUN.x - 22; x <= SUN.x + 22; x++) {
      const d = Math.hypot(x + 0.5 - SUN.x, y + 0.5 - SUN.y);
      if (d <= 20) put(g, x, y, X('gilt', d < 15 ? 0 : d < 18.5 ? 1 : 2));
    }
  // Re-lay the land over the sun's lower edge where it sits in the cape's haze.
  for (let y = 560; y < SCREEN_H; y++)
    for (let x = 0; x < SCREEN_W; x++) {
      const c = cache.g.d[y * SCREEN_W + x] as number;
      if (c) put(g, x, y, c);
    }
  sea(g, ph);
  // The cutter, sails furled, standing out of the bay.
  const glows: BandGlow[] = [...cache.glows];
  farShip(g, 40 + Math.round(ph * 6), 726, 0.4, false, ph * 3);
  for (const s of TOWN) {
    const c = chimneyTop(s);
    if (c) farSmoke(g, c.x, c.y, ph * 2 % 1, { size: 0.7, n: 5 });
  }
  headlandTop(g);
  cliff(g, ph);
  // The wind-bent pine on the headland, at full size.
  const pine = pineTree2();
  stamp(g, pine.picture.grid, 400 - pine.foot - 20, 652 - pine.base);
  // The hero, standing on the cliff top, looking out.
  const hero = heroWithWind(ph);
  stamp(g, hero, HERO.x - 28, HERO.y - 70);
  // Gulls wheeling over the bay.
  const gp = outlined(gull().grid);
  for (const [cx, cy, r, off] of [
    [150, 520, 40, 0],
    [200, 560, 30, 0.4],
    [110, 590, 24, 0.7],
  ] as const) {
    const a = (ph + off) * Math.PI * 2;
    stamp(g, gp, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.35));
  }
  stampCentred(g, lockupUncial({ xh: 34 }), 54, -2);
  glows.push({ x: SUN.x, y: SUN.y - 6, r: 190, strength: 0.22, bands: 4, colour: [255, 214, 150] });
  return { g, glows };
}

export const TITLE_C: Title = {
  id: 'C',
  name: 'The hero on the headland',
  // Dawn: the day palette, warmed toward rose-gold.
  pal: xpal('day', (c, m) => {
    if (m === 'dawnHi' || m === 'dawnLo' || m === 'cloud' || m === 'star' || m === 'hazeDawn' || m === 'parch' || m === 'banner' || m === 'navy')
      return c;
    return [Math.min(255, c[0] * 0.96 + 18), c[1] * 0.9 + 6, c[2] * 0.86 + 8];
  }),
  draw: drawC,
  ui: 'tap',
  uiTop: 762,
  animated: true,
  loop: LOOP,
};
