/**
 * The tide-pool cave's props (B15), drawn to metres beside a 64-pixel
 * person like the grotto's and shaded as solids, lit from the upper left:
 * a rock pool, kelp on a rock, starfish on a rock, anemones and mussels, a
 * silvered driftwood log, an old rowing boat's ribs in the sand; and two
 * pieces of the cave itself, the cave's mouth with the sea beyond (three
 * tiles tall, like a door) and a shaft of sun through a crack above (an
 * overlay: its glows and its light are what it is).
 *
 * Rasterize with `CAVE_TIDEPOOL`. Their glows shine by day (`always`).
 */
import { hash, outlined, put, tgrid, type Cell, type TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Glow } from '../raster';
import { DAYLIGHT2_RGB, SHAFT_LIGHT2, type Light2 } from './light';
import { paint, poly, rod, shaped, sprite } from './kit';

export interface TideProp {
  readonly grid: TGrid;
  readonly base: number;
  /** The middle of its foot on the base row, if not its middle. */
  readonly foot?: number;
  readonly glows: readonly Glow[];
  readonly light?: Light2;
}

/** A water-worn boulder: a lumpy dome of the cave's rock, lit from the upper left, barnacled low down. */
function boulder(g: TGrid, cx: number, cy: number, rx: number, ry: number, k = 0): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 1 + (hash(i, k, 701) - 0.5) * 0.18;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r * (Math.sin(a) > 0 ? 0.7 : 1)]);
  }
  shaped(g, poly(pts), 'tiderock', {
    base: 2.4,
    contrast: 1.4,
    radius: Math.max(2, Math.min(rx, ry) * 0.6),
    tex: (x, y, t) => {
      if (y > cy + ry * 0.2 && hash(x, y, 702 + k) < 0.12) return t + 1;
      return hash(x, y, 703 + k) < 0.04 ? t - 1 : t;
    },
  });
  // A wet dark band where it sits in the sand, and green film on its shaded foot.
  for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const y = Math.round(cy + ry * 0.62);
    if (x > cx && hash(x, 1, 704 + k) < 0.7) put(g, x, y - 1, cell('moss', 4));
  }
}

/** A rock pool: a ring of boulders round clear water, a purple starfish under it, an anemone on its rim. */
function rockPool(): TideProp {
  const W = 46;
  const H = 26;
  const g = tgrid(W, H);
  // The water first, in its hollow: lit sand under clear water, caustics across it.
  for (let y = 4; y < H - 3; y++)
    for (let x = 3; x < W - 3; x++) {
      const d = ((x + 0.5 - W / 2) / (W / 2 - 4)) ** 2 + ((y + 0.5 - 12.5) / 8) ** 2;
      if (d > 1) continue;
      const net = Math.abs(
        Math.sin(x * 0.6 + Math.sin(y * 0.7) * 1.6) + Math.sin(y * 0.8 + x * 0.21),
      );
      const t = y < 8 ? 3 : net < 0.25 ? 0 : d > 0.7 ? 2 : 1;
      g.d[y * W + x] = cell('pool', t);
    }
  // The starfish on the bottom, seen through the water (a step paler).
  sprite(g, 25, 11, ['..a..', '.aba.', 'abbba', '.a.a.', 'a...a'], {
    a: ['plum', 1],
    b: ['plum', 0],
  });
  // Rocks round the rim: big ones at the back, small ones in front.
  for (const [x, y, rx, ry, k] of [
    [5, 9, 6, 5, 1],
    [14, 5, 6, 4, 2],
    [25, 4, 7, 4, 3],
    [36, 5, 6, 4, 4],
    [42, 10, 4, 5, 5],
    [4, 18, 4, 4, 6],
    [41, 19, 4, 3, 7],
    [15, 21, 5, 3, 8],
    [30, 21, 6, 3, 9],
  ] as const)
    boulder(g, x, y, rx, ry, k);
  // An anemone on the rim, open, its tentacles soft pink.
  for (const [dx, dy] of [
    [-2, -1],
    [-1, -2],
    [0, -2],
    [1, -2],
    [2, -1],
    [-2, 0],
    [2, 0],
  ] as const)
    put(g, 36 + dx, 2 + dy, cell('anemone', 2 + ((dx + 3) % 2)));
  paint(g, 35, 2, 3, 2, (_x, y) => cell('anemone', y === 2 ? 3 : 4));
  return { grid: outlined(g), base: H, glows: [] };
}

/** A heap of kelp the tide left: a low tangle of olive ribbons, strands trailing out over the sand, bladders. */
function kelpClump(): TideProp {
  const W = 40;
  const H = 18;
  const g = tgrid(W, H);
  const ground = H - 2;
  // Strands trailing out flat over the sand, under the heap.
  for (const [x0, x1, y, k] of [
    [2, 18, ground - 1, 1],
    [22, 38, ground - 1, 2],
    [6, 20, ground, 3],
    [20, 34, ground, 4],
  ] as const) {
    let px: number = x0;
    let py: number = y;
    for (let i = 1; i <= 6; i++) {
      const x = x0 + ((x1 - x0) * i) / 6;
      const yy = y - Math.round(Math.sin(i * 1.3 + k) * 1.2);
      rod(g, px, py, x, yy, 2, 'kelp', [3, 4]);
      px = x;
      py = yy;
    }
  }
  // The heap: overlapping folds, each lit along its top edge, darker in the folds between.
  for (let i = 0; i < 9; i++) {
    const cx = 9 + i * 2.6 + Math.sin(i * 2.1) * 2;
    const cy = ground - 3 - Math.sin((i / 8) * Math.PI) * 5 + Math.cos(i * 1.7);
    const rx = 4 + (i % 3);
    const ry = 2.2 + (i % 2);
    paint(
      g,
      Math.floor(cx - rx),
      Math.floor(cy - ry),
      Math.ceil(rx * 2) + 1,
      Math.ceil(ry * 2) + 1,
      (x, y) => {
        const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
        if (d > 1) return 0;
        return cell('kelp', y + 0.5 < cy - ry * 0.4 ? 2 : d > 0.6 && y > cy ? 4 : 3);
      },
    );
  }
  // Bladders, pale and round, and a broken frond end curling up.
  for (const [x, y] of [
    [12, ground - 6],
    [21, ground - 8],
    [28, ground - 5],
    [5, ground - 2],
  ] as const) {
    put(g, x, y, cell('kelp', 0));
    put(g, x + 1, y, cell('kelp', 1));
    put(g, x, y + 1, cell('kelp', 2));
  }
  rod(g, 30, ground - 6, 34, ground - 11, 2, 'kelp', [2, 3]);
  return { grid: outlined(g), base: H, glows: [] };
}

/** Starfish on a low rock: a big orange one, two purple, limpets round them. */
function starfishCluster(): TideProp {
  const W = 34;
  const H = 18;
  const g = tgrid(W, H);
  boulder(g, 17, 10, 15, 7, 21);
  const star = (x: number, y: number, m: 'ochre' | 'plum', big: boolean) =>
    sprite(
      g,
      x,
      y,
      big
        ? ['...a...', '...a...', 'aaabbcc', '.abbbc.', '.ab.bc.', 'a.....c']
        : ['..a..', 'aabcc', '.b.c.', 'a...c'],
      { a: [m, 1], b: [m, 2], c: [m, 4] },
    );
  star(9, 3, 'ochre', true);
  star(19, 6, 'plum', false);
  star(24, 2, 'plum', false);
  for (const [x, y] of [
    [5, 9],
    [27, 10],
    [16, 12],
  ] as const)
    sprite(g, x, y, ['.a.', 'abc'], { a: ['sail', 0], b: ['sail', 2], c: ['sail', 4] });
  return { grid: outlined(g), base: H, glows: [] };
}

/** Anemones and mussels on a rock: three open anemones, a crust of blue-black shells below. */
function anemoneRock(): TideProp {
  const W = 30;
  const H = 24;
  const g = tgrid(W, H);
  boulder(g, 15, 14, 12, 9, 31);
  for (let x = 6; x < 25; x++)
    for (let y = 17; y < 21; y++)
      if (hash(x, y, 705) < 0.7) put(g, x, y, cell('midnight', (x + y) % 3 === 0 ? 2 : 4));
  for (const [ax, ay, r] of [
    [9, 7, 3],
    [17, 5, 4],
    [23, 9, 3],
  ] as const) {
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      for (let k = 1; k <= r; k++)
        put(
          g,
          Math.round(ax + Math.cos(a) * k),
          Math.round(ay + Math.sin(a) * k * 0.8),
          cell('anemone', k === r ? 1 : 2),
        );
    }
    paint(g, ax - 1, ay, 3, 3, (_x, y) => cell('anemone', y === ay ? 4 : 3));
  }
  return { grid: outlined(g), base: H, glows: [] };
}

/** A driftwood log, silvered by the sea: branch stubs, a knot, cracks along the grain, kelp tangled on it. */
function driftwood(): TideProp {
  const W = 62;
  const H = 20;
  const g = tgrid(W, H);
  const log = poly([
    [2, 10],
    [6, 6],
    [30, 5],
    [56, 7],
    [60, 10],
    [57, 14],
    [30, 15],
    [5, 15],
  ]);
  shaped(g, log, 'willow', {
    base: 2,
    contrast: 1.5,
    radius: 4,
    tex: (x, y, t) => {
      if ((y === 9 || y === 12) && hash(Math.floor(x / 5), y, 706) < 0.6) return t + 1.5;
      return hash(x, y, 707) < 0.05 ? t + 1 : t;
    },
  });
  // Branch stubs, worn round.
  rod(g, 18, 6, 15, 1, 3, 'willow', [1, 2, 3]);
  rod(g, 42, 6, 46, 2, 3, 'willow', [1, 2, 4]);
  // A knot, and the broken end's rings.
  sprite(g, 30, 9, ['.ab.', 'abcb', '.bb.'], {
    a: ['willow', 2],
    b: ['willow', 3],
    c: ['willow', 5],
  });
  paint(g, 56, 8, 4, 6, (x, y) =>
    Math.hypot(x + 0.5 - 58, y + 0.5 - 11) < 2.6 ? cell('willow', (x + y) % 2 ? 1 : 3) : 0,
  );
  for (let i = 0; i < 8; i++) put(g, 8 + i, 14 + (i % 2), cell('kelp', 2 + (i % 3)));
  return { grid: outlined(g), base: H, glows: [] };
}

/** An old rowing boat's ribs, half buried in the sand: seen from above, the hull's line, its ribs across, the stem post. */
function boatRibs(): TideProp {
  const W = 76;
  const H = 40;
  const g = tgrid(W, H);
  const cx = 37;
  const cy = 22;
  const rx = 33;
  const ry = 13;
  // Where the hull is: a long boat shape, its bow (right) pointed, its stern (left) squarer.
  const halfAt = (x: number) => {
    const u = (x + 0.5 - cx) / rx;
    if (Math.abs(u) > 1) return -1;
    const bow = u > 0 ? Math.sqrt(1 - u ** 2.2) : Math.sqrt(1 - Math.abs(u) ** 5);
    return ry * bow;
  };
  // Sand drifted inside the hull, darker in the hull's shade on its far side.
  for (let x = 0; x < W; x++) {
    const h = halfAt(x);
    if (h < 0) continue;
    for (let y = Math.ceil(cy - h); y <= cy + h; y++)
      put(g, x, y, cell('tidesand', y < cy - h + 3 ? 3 : y > cy + h - 2 ? 2 : 1));
  }
  // The keel down the middle, half buried.
  for (let x = cx - rx + 3; x < cx + rx - 2; x++) {
    put(g, x, cy, cell('tar', 2));
    if (hash(x, 0, 710) < 0.6) put(g, x, cy + 1, cell('tar', 4));
  }
  // Ribs across, each bowed toward the bow, the far half shaded; some broken short.
  for (let i = 0; i < 7; i++) {
    const x0 = cx - rx + 8 + i * 8.5;
    const h = halfAt(Math.round(x0));
    if (h < 3) continue;
    const top = i === 2 ? cy - h * 0.4 : cy - h - 1;
    const bottom = i === 5 ? cy + h * 0.5 : cy + h + 1;
    for (let y = Math.round(top); y <= Math.round(bottom); y++) {
      const t = (y - cy) / (h + 1);
      const x = Math.round(x0 + (1 - t * t) * 2.5);
      const far = y < cy;
      put(g, x, y, cell(far ? 'wood' : 'tar', far ? 4 : 1));
      put(g, x + 1, y, cell(far ? 'wood' : 'tar', far ? 5 : 3));
    }
  }
  // The gunwale: what is left of the rim, broken, its top edge lit on the near side.
  for (let x = 0; x < W; x++) {
    const h = halfAt(x);
    if (h < 0) continue;
    const yN = Math.round(cy + h);
    const yF = Math.round(cy - h);
    if (hash(Math.floor(x / 6), 1, 711) < 0.75) {
      put(g, x, yN, cell('willow', 2));
      put(g, x, yN + 1, cell('willow', 4));
    }
    if (hash(Math.floor(x / 5), 2, 711) < 0.6) put(g, x, yF, cell('willow', 4));
  }
  // Two planks still on near the stern, nail heads in them.
  for (const [y0, x0, x1] of [
    [cy + 6, cx - 26, cx - 4],
    [cy + 9, cx - 22, cx + 8],
  ] as const)
    for (let x = x0; x < x1; x++) {
      if (halfAt(x) < y0 - cy + 1) continue;
      put(g, x, y0, cell('willow', 1));
      put(g, x, y0 + 1, cell('willow', 3));
      if (x % 8 === 0) put(g, x, y0, cell('iron', 3));
    }
  // The stem post standing up at the bow, and a starfish on the sand inside.
  rod(g, cx + rx - 1, cy, cx + rx + 2, cy - 14, 4, 'tar', [1, 2, 3, 4]);
  sprite(g, cx + 6, cy + 2, ['..a..', 'aabcc', '.b.c.'], {
    a: ['plum', 1],
    b: ['plum', 2],
    c: ['plum', 4],
  });
  for (let x = cx - 20; x < cx + 24; x += 9) put(g, x, cy - 1, cell('kelp', 3));
  return { grid: outlined(g), base: H, glows: [] };
}

/**
 * The cave's mouth, three tiles tall like a door (72): a ragged opening
 * worn through the wall to the day, the sky, a far headland, the bright sea
 * with its glints and a line of foam on the sand running in; its worn rim
 * lit on the left and top. Stand it at the wall face's foot (its base on
 * the first floor row below the face), over the face's tiles.
 */
function caveMouth(): TideProp {
  const W = 70;
  const H = 72;
  const g = tgrid(W, H);
  const cx = W / 2;
  const open = (x: number, y: number) => {
    const r = 25 + Math.sin(y * 0.4 + 1) * 1.5 + Math.sin(y * 0.13) * 2;
    if (y > 30) return Math.abs(x + 0.5 - cx) < r - (y > 64 ? 0 : 0);
    return Math.hypot(x + 0.5 - cx, (y + 0.5 - 30) * 1.25) < r;
  };
  const rimOf = (x: number, y: number) => {
    if (open(x, y)) return false;
    for (let k = 1; k <= 5; k++)
      if (
        open(x - k, y) ||
        open(x + k, y) ||
        open(x, y + k) ||
        open(x - k, y + k) ||
        open(x + k, y + k)
      )
        return k;
    return false;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (open(x, y)) {
        const horizon = 38;
        let c: Cell;
        if (y < horizon - 5) c = cell('glass', y < 14 ? 1 : 0);
        else if (y < horizon && x > cx - 6 && x < cx + 22)
          c = cell('pine', y === horizon - 5 ? 2 : 3);
        else if (y < horizon) c = cell('glass', 0);
        else if (y < 56) c = cell('sea', (x * 3 + y * 5) % 11 === 0 ? 0 : y < horizon + 3 ? 2 : 1);
        else if (y < 59) c = cell('sea', hash(x, y, 708) < 0.6 ? 0 : 1);
        else c = cell('tidesand', y < 64 ? 0 : 1);
        // A cloud.
        if (y >= 8 && y <= 11 && x > cx - 14 && x < cx - 2 + (y === 8 ? -4 : 0))
          c = cell('sail', y === 8 ? 0 : 1);
        g.d[y * W + x] = c;
      } else {
        const k = rimOf(x, y);
        if (k === false) continue;
        // The worn rim: lit on the sunward (left, top) side, turned away on the right; ragged outside.
        const left = x < cx;
        if (k > 3 && hash(x, y, 712) < (k - 3) * 0.4) continue;
        const t = (y < 18 ? (left ? 1 : 2) : left ? 2 : 4) + (k > 2 ? 1 : 0);
        g.d[y * W + x] = cell('tiderock', Math.min(5, t));
      }
    }
  // Kelp hanging from the crown, barnacles on the rim.
  for (const [kx, len] of [
    [cx - 12, 8],
    [cx - 6, 12],
    [cx + 9, 9],
  ] as const)
    for (let j = 0; j < len; j++) {
      const y = 6 + Math.round(Math.abs(kx - cx) * 0.3) + j;
      put(
        g,
        Math.round(kx) + (j > len / 2 ? 1 : 0),
        y,
        cell('kelp', j === len - 1 ? 4 : 2 + (j % 2)),
      );
    }
  return {
    grid: outlined(g),
    base: H,
    glows: [
      { x: cx, y: 40, radius: 34, strength: 0.42, always: true, rgb: DAYLIGHT2_RGB },
      { x: cx, y: 66, radius: 26, strength: 0.3, always: true, rgb: DAYLIGHT2_RGB },
    ],
    light: {
      x: cx,
      y: H - 6,
      radius: 44,
      strength: 0.4,
      drop: 8,
      pool: 46,
      flicker: 0,
      always: true,
      rgb: DAYLIGHT2_RGB,
    },
  };
}

/**
 * A shaft of sun through a crack in the rock above, falling down and to the
 * right onto the floor: the crack's bright slit at its top, motes drifting
 * in it, and a chain of glows along it (the shaft itself is light, not
 * paint). Stand it at the spot on the floor it lights (its foot and base);
 * its top reaches the rock above the wall. Light the floor with its `light`
 * as a lantern's. No outline: it is light.
 */
function lightShaft(): TideProp {
  const W = 58;
  const H = 112;
  const g = tgrid(W, H);
  const top: [number, number] = [14, 3];
  const floor: [number, number] = [42, 104];
  // The crack: a jagged slit of sky with a dark lip.
  sprite(
    g,
    6,
    0,
    ['..aaaa.....', '.abbbba....', 'abcccbbaa..', '.abccccbba.', '..aabbbcca.', '.....aaba..'],
    { a: ['tiderock', 6], b: ['tiderock', 5], c: ['glass', 0] },
  );
  // B16: the beam's body, so it shows on a scene that adds no glows: a band of sunlight widening
  // as it falls, dithered (a checker in its heart, a sparser one at its edges) so the rock and the
  // floor show through it, thinning out near the slit and where it lands.
  const [dx, dy] = [floor[0] - top[0], floor[1] - top[1]];
  const len = Math.hypot(dx, dy);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = ((x - top[0]) * dx + (y - top[1]) * dy) / (len * len);
      if (t < 0.06 || t > 1) continue;
      const across = Math.abs((x - top[0]) * dy - (y - top[1]) * dx) / len;
      const half = 2.5 + t * 9;
      if (across > half) continue;
      // B17: rays, not a checker (enlarged, the checker read as a screen door). The beam is split
      // into rays fanning from the slit, each a pixel wide and broken along its length, the middle
      // ones longer and brighter; between them the rock shows through.
      const signed = ((x - top[0]) * dy - (y - top[1]) * dx) / len;
      // Each one-pixel lane along the beam (fanning with it) is cut into streaks a few pixels long,
      // each streak lit or not by its own draw against how dense the light is there: thick in the
      // heart, thin at the edges and the ends.
      const lane = Math.round((signed / half) * 7);
      const streak = Math.floor(t * 26 + hash(lane, 1, 711) * 4);
      const u = Math.abs(signed) / half;
      const ends = Math.min(1, (t - 0.06) / 0.12, (1 - t) / 0.14);
      const dense = (u < 0.6 ? 0.58 : 0.58 - (u - 0.6) * 0.95) * ends;
      if (hash(lane, streak, 712) > dense) continue;
      const heart = u < 0.5 && t > 0.14 && t < 0.92;
      if (!g.d[y * W + x]) put(g, x, y, cell(heart ? 'lamp' : 'sail', 0));
    }
  // Motes in the beam, placed along it.
  for (let i = 0; i < 18; i++) {
    const t = 0.12 + hash(i, 1, 709) * 0.8;
    const x = top[0] + (floor[0] - top[0]) * t + (hash(i, 2, 709) - 0.5) * 10;
    const y = top[1] + (floor[1] - top[1]) * t;
    put(g, Math.round(x), Math.round(y), cell(hash(i, 3, 709) < 0.5 ? 'lamp' : 'sail', 0));
  }
  const glows: Glow[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    glows.push({
      x: top[0] + (floor[0] - top[0]) * t,
      y: top[1] + (floor[1] - top[1]) * t,
      radius: 8 + t * 12,
      strength: 0.2 + t * 0.12,
      always: true,
      rgb: DAYLIGHT2_RGB,
    });
  }
  // Where it lands, a bright haze on the floor.
  glows.push({
    x: floor[0],
    y: floor[1] - 2,
    radius: 26,
    strength: 0.3,
    always: true,
    rgb: DAYLIGHT2_RGB,
  });
  // Padded a pixel each side, as an outlined picture would be, so the door's offsets hold.
  const pad = tgrid(W + 2, H + 2);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) pad.d[(y + 1) * pad.w + x + 1] = g.d[y * W + x]!;
  return {
    grid: pad,
    base: floor[1] + 1,
    foot: floor[0],
    glows,
    light: { x: floor[0], y: floor[1], ...SHAFT_LIGHT2 },
  };
}

export const TIDE_PROPS: Readonly<Record<string, () => TideProp>> = {
  rock_pool: rockPool,
  kelp_clump: kelpClump,
  starfish_cluster: starfishCluster,
  anemone_rock: anemoneRock,
  driftwood,
  boat_ribs: boatRibs,
  cave_mouth: caveMouth,
  light_shaft: lightShaft,
};

/** The tide-pool cave's prop ids (B15), in `PROP2_IDS` with the grotto's. */
export const TIDEPOOL2_PROP_IDS: readonly string[] = Object.keys(TIDE_PROPS);
