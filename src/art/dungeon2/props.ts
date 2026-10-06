/**
 * The grotto's props at the C scale, drawn to metres beside a 64-pixel
 * person (`m()`): a powder keg, a crate, a sea chest, the brig's bars, a
 * ship's lantern on a post, a spare anchor, a coil of rope, a cannon on its
 * carriage and a mooring post for the parrot. Each is the town's barrels and
 * crates' kin: shaded as a solid, lit from the upper left, outlined in its
 * own darkest steps.
 */
import { hash, outlined, put, tgrid, type Cell, type TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Glow } from '../raster';
import { LANTERN_LIGHT2, type Light2 } from './light';
import { cyl } from '../town2/texture';
import { dome, lim, line, paint, rod, sprite } from './kit';

export interface Prop2 {
  readonly grid: TGrid;
  /** The row, from the top, where it meets the ground: sort standing things by it. */
  readonly base: number;
  /** The middle of its foot on the base row. */
  readonly foot: number;
  readonly glows: readonly Glow[];
  /** Where something sitting on it stands (the perch's top), from the top-left. */
  readonly seat?: { readonly x: number; readonly y: number };
  /** The light it gives, in its own coordinates (the lantern's): its glow and the pool it lays below. */
  readonly light?: Light2;
}

/** A barrel's half-width at a row, bulging at its middle. */
const bulge = (y: number, h: number, w0: number, w1: number) =>
  w0 + (w1 - w0) * Math.sin((Math.PI * (y + 0.5)) / h);

/** A powder keg, about 0.6 m: staves, two iron hoops, a skull painted on, a fuse coiled on its lid. */
function powderKeg(): Omit<Prop2, 'foot'> {
  const W = 20;
  const H = 25;
  const g = tgrid(W, H);
  const cx = 10;
  const top = 4;
  for (let y = top; y < H; y++) {
    const r = bulge(y - top, H - top, 7, 9);
    for (let x = 0; x < W; x++) {
      const nx = (x + 0.5 - cx) / r;
      if (Math.abs(nx) > 1) continue;
      let t = cyl(nx, 2.6, 1.3);
      // Staves: a dark seam every few columns, following the bulge.
      const stave = (nx + 1) * 3.5;
      if (stave - Math.floor(stave) < 0.16) t += 1;
      const hoop = y === top + 3 || y === top + 4 || y === H - 5 || y === H - 4;
      if (hoop) {
        put(
          g,
          x,
          y,
          cell('iron', lim(cyl(nx, 2.4, 1.4) + (y === top + 4 || y === H - 4 ? 1 : 0), 1, 5)),
        );
        continue;
      }
      if (y === H - 1) t += 1;
      put(g, x, y, cell('wood', lim(t + (hash(x, y, 3) < 0.06 ? 1 : 0), 1, 5)));
    }
  }
  // The lid, seen from a little above: an ellipse of end grain, darker at its rim.
  paint(g, 0, 0, W, 8, (x, y) => {
    const nx = (x + 0.5 - cx) / 7.3;
    const ny = (y + 0.5 - (top + 0.6)) / 2.6;
    const d = nx * nx + ny * ny;
    if (d > 1) return 0;
    return cell('wood', d > 0.62 ? 3 : y < top ? 1 : 2);
  });
  // The skull, painted in pale on the front, a little worn.
  sprite(g, 6, 12, ['.ccc..', 'ccccc.', 'cKcKc.', '.ccc..', '.c.c..', 'b...b.'], {
    c: ['plaster', 1],
    K: ['wood', 5],
    b: ['plaster', 3],
  });
  // The fuse: a dark cord out of the bung, coiled once and its end standing up.
  sprite(g, 9, 0, ['...a', '..a.', '.aa.', 'aab.', '.bb.'], { a: ['tar', 2], b: ['tar', 4] });
  return { grid: outlined(g), base: H, glows: [] };
}

/** A crate, about 0.7 m: a lid of boards seen from above, the front's boards and a cross brace, a stencilled mark. */
function crate(): Omit<Prop2, 'foot'> {
  const W = 26;
  const H = 27;
  const g = tgrid(W, H);
  const lidH = 8;
  paint(g, 0, 0, W, H, (x, y) => {
    if (y < lidH) {
      // The lid: boards running across, lit; a frame round it.
      const edge = x === 0 || x === W - 1 || y === 0 || y === lidH - 1;
      if (edge) return cell('wood', y === 0 ? 1 : y === lidH - 1 ? 3 : x === 0 ? 1 : 3);
      return cell('wood', (y - 1) % 3 === 2 ? 3 : hash(x, y, 4) < 0.08 ? 2 : 1);
    }
    // The front: a frame of battens, boards between, the far side in shadow.
    const fy = y - lidH;
    const fh = H - lidH;
    const frame = x < 3 || x >= W - 3 || fy < 3 || fy >= fh - 3;
    if (frame) {
      const t =
        fy < 3
          ? fy === 0
            ? 2
            : 3
          : x < 3
            ? x === 0
              ? 2
              : 3
            : x >= W - 3
              ? 4
              : fy === fh - 1
                ? 5
                : 4;
      return cell('wood', t);
    }
    // The brace, corner to corner, lit on its upper edge.
    const along = (x - 3) / (W - 6);
    const by = 3 + (1 - along) * (fh - 7);
    if (fy >= by && fy < by + 3) return cell('wood', fy < by + 1 ? 2 : 3);
    if (fy >= by + 3 && fy < by + 4) return cell('wood', 5);
    return cell('wood', (fy - 3) % 4 === 3 ? 5 : hash(x, y, 5) < 0.06 ? 3 : 4);
  });
  // Nails at the corners of the battens.
  for (const [x, y] of [
    [1, lidH + 1],
    [W - 2, lidH + 1],
    [1, H - 2],
    [W - 2, H - 2],
  ] as const)
    put(g, x, y, cell('iron', 2));
  return { grid: outlined(g), base: H, glows: [] };
}

/** A sea chest, 0.9 m across: a rounded lid, brass corners and bands, a lock, coins at the lip and one dropped. */
function treasureChest(): Omit<Prop2, 'foot'> {
  const W = 36;
  const H = 25;
  const g = tgrid(W, H);
  const lid = 9;
  const bx0 = 1;
  const bx1 = 33;
  paint(g, bx0, 0, bx1 - bx0 + 1, H - 1, (x, y) => {
    const nx = ((x - bx0 + 0.5) / (bx1 - bx0 + 1)) * 2 - 1;
    if (y < lid) {
      // The lid, a curve front to back: lit along its crown.
      const ny = 1 - y / lid;
      const t =
        1.8 +
        ny * 0.2 +
        Math.max(0, nx) * 1.6 +
        (y < 2 ? 0.6 : 0) -
        (y >= 2 && y <= 3 && nx < 0 ? 1 : 0);
      return cell('wood', lim(t + (hash(x, y, 6) < 0.05 ? 1 : 0), 1, 4));
    }
    if (y === lid) return cell('wood', 5);
    const t = 3 + Math.max(0, nx) * 1.2 + ((y - lid) % 5 === 4 ? 1 : 0);
    return cell('wood', lim(t, 2, 5));
  });
  // The lid's ends, rounded.
  for (const x of [bx0, bx1]) {
    put(g, x, 0, 0);
    put(g, x, 1, 0);
  }
  // Brass bands over the lid and down the front, and the corners.
  for (const bx of [6, 27]) {
    for (let y = 0; y < H - 1; y++) {
      if (y === lid) continue;
      put(g, bx, y, cell('bronze', y < lid ? 1 : 2));
      put(g, bx + 1, y, cell('bronze', y < lid ? 2 : 3));
      put(g, bx + 2, y, cell('bronze', 4));
    }
    put(g, bx + 1, lid + 4, cell('bronze', 0));
    put(g, bx + 1, lid + 10, cell('bronze', 0));
  }
  for (const [x, y] of [
    [bx0, lid + 1],
    [bx1 - 2, lid + 1],
    [bx0, H - 4],
    [bx1 - 2, H - 4],
  ] as const) {
    paint(g, x, y, 3, 3, (xx, yy) => cell('bronze', xx === x && yy === y ? 1 : 3));
  }
  // The lock: a brass plate, a dark keyhole.
  sprite(g, 15, lid - 2, ['.aaaa.', 'abbbbc', 'abKKbc', 'abbKbc', 'abbbbc', '.cccc.'], {
    a: ['bronze', 1],
    b: ['bronze', 2],
    c: ['bronze', 4],
    K: ['shade', 3],
  });
  // Gold at the lip, where the lid does not quite shut.
  for (let x = 9; x < 26; x++) {
    if (x >= 15 && x <= 20) continue;
    if (hash(x, 1, 7) < 0.55) put(g, x, lid, cell('gold', hash(x, 2, 7) < 0.4 ? 0 : 2));
  }
  // A coin dropped beside it, on its side.
  sprite(g, 31, H - 3, ['.ab.', 'abbc', '.cc.'], {
    a: ['gold', 0],
    b: ['gold', 2],
    c: ['gold', 4],
  });
  return { grid: outlined(g), base: H - 1, glows: [] };
}

/** The brig's bars: one tile wide and 2 m tall, iron bars between timber rails, banded and riveted, rust weeping. */
function brigBars(): Omit<Prop2, 'foot'> {
  const W = 24;
  const H = 76;
  const g = tgrid(W, H);
  const rail = (y0: number, h: number) =>
    paint(g, 0, y0, W, h, (x, y) =>
      cell('wood', y === y0 ? 1 : y === y0 + h - 1 ? 5 : hash(x, y, 8) < 0.15 ? 3 : 2),
    );
  for (const bx of [2, 8, 14, 20]) {
    for (let y = 5; y < H - 5; y++) {
      put(g, bx, y, cell('iron', 1));
      put(g, bx + 1, y, cell('iron', 3));
      put(g, bx + 2, y, cell('iron', 5));
      // Rust weeping down from the bands.
      if ((y > 27 && y < 32 && hash(bx, y, 9) < 0.5) || (y > 53 && y < 59 && hash(bx, y, 10) < 0.4))
        put(g, bx + 1, y, cell('tile', 5));
    }
  }
  for (const by of [24, 50]) {
    paint(g, 0, by, W, 3, (_x, y) => cell('iron', y === by ? 2 : y === by + 1 ? 3 : 5));
    for (const rx of [3, 9, 15, 21]) put(g, rx, by + 1, cell('iron', 0));
  }
  rail(0, 6);
  rail(H - 6, 6);
  return { grid: outlined(g), base: H, glows: [] };
}

/**
 * A ship's lantern on a post, about 1.6 m: a squared timber with an iron arm,
 * the lantern hanging from it, its cage and panes lit by a candle. Its light
 * reaches far past the picture (a radius of 66): move the glow into the room
 * and light the room with it.
 */
function lantern(): Omit<Prop2, 'foot'> {
  const W = 26;
  const H = 62;
  const g = tgrid(W, H);
  // The post: squared, lit face and shadow face, a foot of stones round it.
  paint(g, 4, 6, 6, H - 6, (x, y) =>
    cell('wood', x === 4 ? 1 : x === 5 ? 2 : x < 8 ? 3 : 4 + (hash(x, y, 11) < 0.1 ? 1 : 0)),
  );
  paint(g, 2, H - 4, 10, 4, (x, y) => cell('caverock', y === H - 4 ? 2 : x < 5 ? 3 : 4));
  // The arm, iron, out to the right with a scroll under it.
  line(g, 9, 8, 22, 8, cell('iron', 2));
  line(g, 9, 9, 22, 9, cell('iron', 4));
  line(g, 10, 10, 13, 13, cell('iron', 3));
  // The lantern: a cap, a cage with four panes, a candle.
  sprite(
    g,
    14,
    10,
    [
      '...ab...',
      '...ab...',
      '..aaab..',
      '.aaaabb.',
      'abbbbbbc',
      'aLLaLLbc',
      'aLlaFlbc',
      'aLlaFlbc',
      'aLLaWLbc',
      'aLLaLLbc',
      'abbbbbbc',
      '.bbccc..',
      '..bcc...',
    ],
    {
      a: ['iron', 2],
      b: ['iron', 3],
      c: ['iron', 5],
      L: ['lamp', 2],
      l: ['lamp', 1],
      F: ['fire', 1],
      W: ['plaster', 1],
    },
  );
  return {
    grid: outlined(g),
    base: H,
    glows: [{ x: 19.5, y: 18.5, radius: LANTERN_LIGHT2.radius, strength: LANTERN_LIGHT2.strength }],
    light: { x: 19.5, y: 18.5, ...LANTERN_LIGHT2 },
  };
}

/** A spare anchor, about 1.3 m, standing on its crown: ring, wooden stock, shank, curved arms and flukes. */
function anchor(): Omit<Prop2, 'foot'> {
  const W = 34;
  const H = 50;
  const g = tgrid(W, H);
  const cx = 17;
  // The shank, a rod down the middle.
  rod(g, cx, 9, cx, H - 6, 3, 'iron', [2, 3, 5]);
  // The ring at the top.
  paint(g, cx - 4, 0, 9, 8, (x, y) => {
    const d = Math.hypot(x + 0.5 - (cx + 0.5), y + 0.5 - 4);
    if (d > 4 || d < 2.2) return 0;
    return cell('iron', y < 3 && x <= cx ? 1 : y > 5 || x > cx + 1 ? 4 : 2);
  });
  // The stock: a wooden bar across, banded.
  paint(g, cx - 12, 9, 25, 4, (x, y) => cell('wood', y === 9 ? 1 : y === 12 ? 4 : x < cx ? 2 : 3));
  for (const bx of [cx - 3, cx + 3]) {
    put(g, bx, 9, cell('iron', 2));
    put(g, bx, 10, cell('iron', 3));
    put(g, bx, 11, cell('iron', 3));
    put(g, bx, 12, cell('iron', 4));
  }
  // The arms: a curve up either side from the crown, lit on their upper side.
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI * (0.06 + (0.88 * i) / 40);
    const x = cx + 0.5 - Math.cos(a) * 14;
    const y = H - 7 - Math.sin(a) * 0 + Math.sin(a) * 6 - (1 - Math.sin(a)) * 12;
    for (let j = 0; j < 3; j++)
      put(g, Math.round(x), Math.round(y + j), cell('iron', j === 0 ? 2 : j === 1 ? 3 : 5));
  }
  // The flukes: broad spade ends on each arm.
  sprite(g, cx - 17, H - 24, ['.a.', 'aab', 'abb', 'abc', '.bc', '..c'], {
    a: ['iron', 2],
    b: ['iron', 3],
    c: ['iron', 5],
  });
  sprite(g, cx + 14, H - 24, ['.a.', 'abb', 'bbc', 'bcc', 'bc.', 'c..'], {
    a: ['iron', 2],
    b: ['iron', 3],
    c: ['iron', 5],
  });
  // The crown, where the arms meet the shank, resting on the ground; rust here and there.
  paint(g, cx - 2, H - 7, 5, 4, (x, y) => cell('iron', y === H - 7 ? 2 : x < cx ? 3 : 4));
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash(i, 1, 12) * W);
    const y = Math.floor(hash(i, 2, 12) * H);
    if (g.d[y * W + x]) put(g, x, y, cell('tile', 4));
  }
  return { grid: outlined(g), base: H - 3, glows: [] };
}

/** A coil of rope, lying flat: three turns round, each twisted, the end trailing. */
function ropeCoil(): Omit<Prop2, 'foot'> {
  const W = 30;
  const H = 14;
  const g = tgrid(W, H);
  const cx = 14.5;
  const cy = 6.5;
  for (const [rx, ry] of [
    [13, 5.6],
    [9.6, 4],
    [6.2, 2.6],
  ] as const) {
    paint(g, 0, 0, W, H, (x, y) => {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      if (d > 1 || d < 1 - 2.6 / rx) return 0;
      const ang = Math.atan2((y + 0.5 - cy) / ry, (x + 0.5 - cx) / rx);
      // The twist: a strand catching the light every few pixels round.
      const twist = ((ang * rx) / 2.2 + d * 3) % 2;
      const t = (y + 0.5 < cy ? 1.6 : 3) + (twist < 0.7 ? -1 : 0) + (d > 1 - 0.8 / rx ? 1 : 0);
      return cell('thatch', lim(t, 1, 5));
    });
  }
  // The hole in the middle, dark.
  paint(g, 0, 0, W, H, (x, y) =>
    Math.hypot((x + 0.5 - cx) / 3.6, (y + 0.5 - cy) / 1.4) <= 1 ? cell('thatch', 5) : 0,
  );
  // The end, trailing off to the right.
  for (let x = 26; x < W; x++) {
    put(g, x, 10 + (x > 27 ? 1 : 0), cell('thatch', x % 2 ? 2 : 3));
    put(g, x, 11 + (x > 27 ? 1 : 0), cell('thatch', 4));
  }
  return { grid: outlined(g), base: H - 1, glows: [] };
}

/** A cannon on its carriage, facing right: a black iron barrel with bands and a swell at the muzzle, a timber carriage on wheels. */
function cannon(): Omit<Prop2, 'foot'> {
  const W = 62;
  const H = 33;
  const g = tgrid(W, H);
  // The carriage: a timber cheek stepped up at the back, lit on top.
  paint(g, 4, 14, 40, 11, (x, y) => {
    const stepTop = x < 14 ? 14 : x < 26 ? 16 : 18;
    if (y < stepTop) return 0;
    return cell(
      'wood',
      y === stepTop ? 1 : y === 24 ? 5 : x < 8 ? 2 : hash(x, y, 13) < 0.1 ? 4 : 3,
    );
  });
  // Wheels: the far one dark, the near one with spokes and an iron tyre.
  const wheel = (cx: number, cy: number, r: number, far: boolean) =>
    paint(g, cx - r, cy - r, r * 2 + 1, r * 2 + 1, (x, y) => {
      const dx = x + 0.5 - cx - 0.5;
      const dy = y + 0.5 - cy - 0.5;
      const d = Math.hypot(dx, dy);
      if (d > r) return 0;
      if (far) return cell('wood', 5);
      if (d > r - 1.3) return cell('iron', dy < 0 && dx < 0 ? 2 : 4);
      if (d < 1.6) return cell('iron', 3);
      const spoke = Math.abs(Math.sin(Math.atan2(dy, dx) * 3)) < 0.28;
      return spoke ? cell('wood', dy < 0 ? 2 : 3) : cell('shade', 2);
    });
  wheel(40, 25, 6, true);
  wheel(13, 25, 7, false);
  wheel(36, 25, 7, false);
  // The barrel: a cylinder lying along the carriage, its breech at the left.
  for (let x = 6; x < W - 1; x++) {
    const muzzle = x > W - 7;
    const r = x < 10 ? 4 + (x - 6) * 0.4 : 5.6 - ((x - 10) / (W - 18)) * 1.6 + (muzzle ? 1.2 : 0);
    const cy = 12 - (x - 6) * 0.06;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const ny = (y + 0.5 - cy) / r;
      if (Math.abs(ny) > 1) continue;
      const band = x === 14 || x === 15 || x === 30 || x === 31 || x === W - 7;
      let t = cyl(ny, 3.2, 1.6);
      if (band) t -= 0.6;
      put(g, x, y, cell('iron', lim(t, 0, 5)));
    }
  }
  // The cascabel knob at the breech and the dark mouth.
  dome(g, 4, 12, 2.4, 2.4, 'iron', 3, 2);
  paint(g, W - 2, 9, 1, 6, () => cell('shade', 4));
  put(g, W - 2, 8, cell('iron', 3));
  // A touch hole and a glint along the barrel's top.
  put(g, 12, 7, cell('shade', 4));
  for (let x = 18; x < 50; x += 7) put(g, x, 8, cell('iron', 0));
  return { grid: outlined(g), base: H - 1, glows: [] };
}

/**
 * A mooring post in the water, where the parrot sits: a weathered timber with
 * a rope's turns round it, weed and barnacles below, a ring of foam where it
 * stands. `seat` is where a bird's feet go on its top.
 */
function perch(): Omit<Prop2, 'foot'> {
  const W = 20;
  const H = 40;
  const g = tgrid(W, H);
  const cx = 10;
  // Foam round its foot, on the water.
  paint(g, 0, H - 6, W, 6, (x, y) => {
    const d = Math.hypot((x + 0.5 - cx) / 9.5, (y + 0.5 - (H - 3)) / 2.8);
    if (d > 1 || d < 0.6) return 0;
    return cell('shoal', hash(x, y, 14) < 0.5 ? 0 : 1);
  });
  // The post, a cylinder, its top cut and worn round.
  for (let y = 2; y < H - 3; y++)
    for (let x = cx - 5; x < cx + 5; x++) {
      const nx = (x + 0.5 - cx) / 5;
      let t = cyl(nx, 2.8, 1.5);
      if (hash(x, Math.floor(y / 3), 15) < 0.12) t += 1;
      // Below the tide line: dark, weeded, barnacled.
      const low = y > H - 14;
      if (low) t += 1;
      put(
        g,
        x,
        y,
        low && hash(x, y, 16) < 0.22 ? cell('weed', 3 + (y % 2)) : cell('wood', lim(t, 1, 5)),
      );
      if (y > H - 17 && y < H - 13 && hash(x, y, 17) < 0.3) put(g, x, y, cell('cavesand', 1));
    }
  paint(g, cx - 5, 0, 10, 3, (x, y) => {
    const d = Math.hypot((x + 0.5 - cx) / 5, (y + 0.5 - 2) / 1.8);
    return d > 1 ? 0 : cell('wood', d < 0.6 ? 1 : 3);
  });
  // A rope's turns round it.
  for (const ry of [10, 14]) {
    for (let x = cx - 5; x < cx + 5; x++) {
      const nx = (x + 0.5 - cx) / 5;
      const yy = ry + Math.round(nx * 1.2);
      put(g, x, yy, cell('thatch', lim(cyl(nx, 2, 1.4), 1, 4)));
      put(g, x, yy + 1, cell('thatch', lim(cyl(nx, 3, 1.4), 2, 5)));
    }
  }
  line(g, cx + 5, 15, cx + 8, 19, cell('thatch', 3));
  return { grid: outlined(g), base: H - 2, glows: [], seat: { x: cx + 1, y: 2 } };
}

const MAKE: Readonly<Record<string, () => Omit<Prop2, 'foot'>>> = {
  powder_keg: powderKeg,
  crate,
  treasure_chest: treasureChest,
  brig_bars: brigBars,
  lantern,
  anchor,
  rope_coil: ropeCoil,
  cannon,
  perch,
};

export const PROP2_IDS: readonly string[] = Object.keys(MAKE);

const made = new Map<string, Prop2>();

/** A prop by id, drawn once and kept; null for an id with none. */
export function prop2(id: string): Prop2 | null {
  if (!Object.hasOwn(MAKE, id)) return null;
  let p = made.get(id);
  if (!p) {
    const m = MAKE[id]!();
    // The outline adds a pixel on every side: everything moves one in and one down.
    const glows = m.glows.map((gl) => ({ ...gl, x: gl.x + 1, y: gl.y + 1 }));
    p = {
      grid: m.grid,
      base: m.base,
      foot: Math.floor(m.grid.w / 2),
      glows,
      ...(m.seat ? { seat: { x: m.seat.x + 1, y: m.seat.y + 1 } } : {}),
      ...(m.light ? { light: { ...m.light, x: m.light.x + 1, y: m.light.y + 1 } } : {}),
    };
    made.set(id, p);
  }
  return p;
}

void (0 as unknown as Cell);
