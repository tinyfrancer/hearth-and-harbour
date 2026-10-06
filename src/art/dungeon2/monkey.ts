/**
 * The powder monkey at the C scale (B10a), drawn whole by hand on the figure
 * canvas (56 x 72, anchor 28, 70) rather than dressed from the hero's
 * wardrobe: a small, wiry grown man a head shorter than the hero, bald and
 * stubbled, grinning a gap-toothed grin with his brows up, bare-armed in an
 * open indigo vest, a red kerchief at his throat, ragged linen breeches and
 * bare feet, holding a lit powder keg over his head in both hands. Never a
 * child: the stubble, the wiry forearms, the jaw.
 *
 * He walks and breathes on the hero's rig (his legs bend at his own joints);
 * his arms and the keg move with his body, so the keg rides over his head
 * whatever his legs do. Throwing, the keg is gone from his hands.
 */
import { tgrid, type TGrid } from '../town2/cells';
import { cyl } from '../town2/texture';
import type { Glow } from '../raster';
import { outlineIn } from '../figure2/engine';
import {
  HERO_RIG,
  IDLE2,
  STAND2,
  posedFigure,
  walkKey,
  type Boned,
  type Key2,
  type Rig2,
} from '../figure2/walk';
import { cell } from './cave';
import { lim, paint, rod, sprite } from './kit';
import { FUSE_LIGHT2 } from './light';
import { gridPart, laid } from './pose';

type Pin = readonly [Parameters<typeof cell>[0], number];
type Pins = Readonly<Record<string, Pin>>;

/** Skin, eyes and the shading letters every part of him shares. */
const SKIN: Pins = {
  o: ['skin', 0],
  s: ['skin', 1],
  t: ['skin', 2],
  u: ['skin', 3],
  v: ['skin', 4],
  w: ['skin', 5],
  K: ['eye', 4],
  W: ['eye', 0],
  I: ['eye', 3],
  J: ['eye', 2],
  b: ['hairblack', 3],
  B: ['hairblack', 4],
  h: ['hairblack', 2],
  d: ['shade', 4],
  m: ['crimson', 4],
};

/** His joints: a head shorter than the hero, so hips, knees and shoulders sit lower. */
export const MONKEY_RIG: Rig2 = {
  ...HERO_RIG,
  hip: 50,
  knee: 58,
  ankle: 64,
  sole: 69,
  split: 29,
  feet: [
    [21, 27],
    [30, 36],
  ],
  shoulder: 36,
  wrists: [16, 16],
  swing: [0, 0],
  skirt: [50, 58],
  cloak: [36, 60],
  chest: [0, 47],
  half: 8,
};

/** The head, bald, a shine on the crown, stubble, brows up, the grin: every pixel placed. */
const HEAD_ROWS = [
  '...............',
  '.....sssttu....',
  '...ssoosssttu..',
  '..ssoossssttuv.',
  '.ssbBbsssBbbtuv',
  '.sbssssssssbtuv',
  '.sssssssssstuuv',
  'stssKIKsstKIKuv',
  'tusWWIWsstWIWuv',
  'stssssssstttuuv',
  '.hsssssttuuthv.',
  '.hhsvWWWdWWWvh.',
  '..hhvWWWWWWvh..',
  '...hhhvvvhhh...',
  '....hhhhhhh....',
  '.....tuuvw.....',
  '.....tuuvw.....',
  '....ttuuvvw....',
];
/** Struck: eyes screwed shut, mouth an O. */
const OUCH_ROWS = HEAD_ROWS.map((r, i) =>
  i === 7
    ? 'stssKKKsstKKKuv'
    : i === 8
      ? 'tussvvvsstvvvuv'
      : i === 11
        ? '.hhssvddvsthh..'
        : i === 12
          ? '..hhsvddvthh...'
          : r,
);
/** Down: eyes crossed shut, tongue out. */
const DOWN_ROWS = HEAD_ROWS.map((r, i) =>
  i === 7
    ? 'stssKsKsstKsKuv'
    : i === 8
      ? 'tusssKssstsKsuv'
      : i === 11
        ? '.hhsvvvvvvthh..'
        : i === 12
          ? '..hhsvmmvthh...'
          : r,
);

const HEAD_AT = [21, 17] as const;

function head(rows: readonly string[]): TGrid {
  const g = tgrid(56, 72);
  sprite(g, HEAD_AT[0], HEAD_AT[1], rows, SKIN);
  // The near ear, out from the skull.
  sprite(g, HEAD_AT[0] - 1, HEAD_AT[1] + 6, ['.s', 'st', 'tu', 'su', '.u'], SKIN);
  return g;
}

/** The kerchief knotted at his throat, its ends blowing back. */
function kerchief(): TGrid {
  const g = tgrid(56, 72);
  sprite(g, 24, 33, ['.12222223..', '1122222334.', '.1222233445', '..2233.3445', '.......4.5.'], {
    '1': ['crimson', 1],
    '2': ['crimson', 2],
    '3': ['crimson', 3],
    '4': ['crimson', 4],
    '5': ['crimson', 5],
  });
  return g;
}

/** Bare wiry chest and belly in an open vest, a rope belt. */
function torso(): TGrid {
  const g = tgrid(56, 72);
  // Rows 35 to 47, cols 22 to 35: the vest's two panels, the chest between them.
  for (let y = 35; y <= 47; y++) {
    const x0 = y < 37 ? 23 : 22;
    const x1 = y < 37 ? 34 : 35;
    for (let x = x0; x <= x1; x++) {
      const vestNear = x <= 25 + (y > 43 ? 1 : 0);
      const vestFar = x >= 31 - (y > 43 ? 1 : 0);
      if (vestNear) {
        const t = x === x0 ? 1 : x === 25 ? 3 : 2;
        g.d[y * 56 + x] = cell('indigo', t + (y > 44 ? 1 : 0));
      } else if (vestFar) {
        const t = x === 31 ? 2 : x === x1 ? 5 : 3 + (x > 33 ? 1 : 0);
        g.d[y * 56 + x] = cell('indigo', t);
      } else {
        // The chest: lit on the near side, ribs a line of shadow, the belly button.
        let t = x <= 27 ? 1 : x <= 29 ? 2 : 3;
        if ((y === 40 || y === 42) && x >= 27 && x <= 29) t += 1;
        if (y === 45 && x === 28) t = 4;
        g.d[y * 56 + x] = cell('skin', t);
      }
    }
  }
  // The vest's lit edge down its opening.
  for (let y = 36; y <= 46; y++) g.d[y * 56 + 31] = cell('indigo', 1);
  // A rope belt, knotted.
  for (let x = 22; x <= 35; x++) {
    g.d[48 * 56 + x] = cell('linen', (x + 1) % 3 === 0 ? 3 : x < 28 ? 1 : 2);
    g.d[49 * 56 + x] = cell('linen', (x % 3 === 0 ? 4 : 3) + (x > 31 ? 1 : 0));
  }
  sprite(g, 25, 48, ['22', '34', '.4', '.3'], {
    '2': ['linen', 1],
    '3': ['linen', 3],
    '4': ['linen', 4],
  });
  return g;
}

/** Ragged breeches to the knee, bare shins and feet: the near leg and the far. */
function legs(): TGrid {
  const g = tgrid(56, 72);
  const L = {
    '1': ['linen', 1],
    '2': ['linen', 2],
    '3': ['linen', 3],
    '4': ['linen', 4],
    '5': ['linen', 5],
  } as const;
  // Breeches, rows 50 to 58, each leg its own, the hem torn.
  sprite(
    g,
    22,
    50,
    [
      '12222223.22333334',
      '12222234.22333344',
      '1222223..2233334.',
      '1222223..2233334.',
      '1222234..2233344.',
      '122234...223334..',
      '12234.4..22.3344.',
      '1.24.....2.4.3...',
    ],
    L,
  );
  // Shins and feet, the near foot turned out toward the facing, toes splayed.
  sprite(
    g,
    23,
    58,
    [
      '.stu....stu..',
      '.stu....stu..',
      '.stu....stu..',
      '.stu....stu..',
      '.stu....stuv.',
      '.stu....stuv.',
      '.stu....stuv.',
      '.stuv...stuv.',
      'sstuuv..stuuv',
      'ssttuuvsttuuv',
      'ostsotvssttuv',
      'uvvwuvwuvvwvw',
    ],
    SKIN,
  );
  return g;
}

/** A powder keg on its side: staves lit along the top, two iron hoops, a skull painted on, the fuse lit. */
function keg(g: TGrid, kx: number, ky: number, lit: boolean): void {
  const W = 26;
  const H = 12;
  paint(g, kx, ky, W, H, (x, y) => {
    const nx = ((x - kx + 0.5) / W) * 2 - 1;
    const ny = ((y - ky + 0.5) / H) * 2 - 1;
    // The ends round off: a barrel's bulge seen from the side.
    if (Math.abs(nx) > 0.94 && Math.abs(ny) > 0.55) return 0;
    if (Math.abs(nx) > 0.86 && Math.abs(ny) > 0.85) return 0;
    let t = cyl(ny, 2.3, 1.5);
    if (Math.abs(nx) > 0.9) t += 1;
    const hoop = Math.abs(nx - -0.62) < 0.05 || Math.abs(nx - 0.62) < 0.05;
    if (hoop) return cell('iron', lim(t - 0.5, 1, 5));
    // Stave seams along it.
    if ((y - ky) % 4 === 3 && Math.abs(nx) < 0.9) t += 1;
    return cell('wood', lim(t, 1, 5));
  });
  // The skull, white paint on the staves.
  sprite(g, kx + 10, ky + 2, ['.ccc.', 'ccccc', 'cKcKc', 'ccKcc', '.c.c.'], {
    c: ['sail', 0],
    K: ['wood', 6],
  });
  // The bung and the fuse, curling up from the keg's top, alight.
  sprite(
    g,
    kx + 19,
    ky - 5,
    lit ? ['..FE', '.fF.', '.f..', 'f...', 'nn..'] : ['....', '.f..', '.f..', 'f...', 'nn..'],
    { f: ['tar', 2], F: ['fire', 1], E: ['fire', 3], n: ['iron', 3] },
  );
}

/** The fuse's spark, where `keg` puts it. */
const sparkAt = (kx: number, ky: number) => ({ x: kx + 21.5, y: ky - 4.5 });

/**
 * Both arms up, hands under the keg: the near arm lit, the far one in
 * shade; wiry, a knot of muscle at the elbow, soot on the hands.
 */
function armsUp(kx: number, ky: number): TGrid {
  const g = tgrid(56, 72);
  const hand = (x: number, y: number, far: boolean) =>
    sprite(
      g,
      x,
      y,
      ['.sst.', 'sstuu', 'tuuvw', '.vww.'],
      far ? { ...SKIN, s: ['skin', 2], t: ['skin', 3], u: ['skin', 4], v: ['skin', 5] } : SKIN,
    );
  // Near: shoulder (23, 37) up and out to the elbow, then up to the hand under the keg's near end.
  rod(g, 23, 38, 17, 29, 3, 'skin', [1, 2, 3]);
  rod(g, 17, 29, kx + 4, ky + 12, 3, 'skin', [1, 2, 3]);
  // Far: from the far shoulder, in shade.
  rod(g, 34, 38, 40, 29, 3, 'skin', [2, 3, 4]);
  rod(g, 40, 29, kx + 21, ky + 12, 3, 'skin', [2, 3, 4]);
  keg(g, kx, ky, true);
  hand(kx + 2, ky + 9, false);
  hand(kx + 19, ky + 9, true);
  return g;
}

/** Arms flung forward after the keg, hands open. */
function armsThrown(): TGrid {
  const g = tgrid(56, 72);
  rod(g, 33, 38, 41, 33, 3, 'skin', [2, 3, 4]);
  rod(g, 41, 33, 47, 27, 3, 'skin', [2, 3, 4]);
  sprite(g, 46, 23, ['.t.t', 'tt.u', 'tuuv', '.uv.'], SKIN);
  rod(g, 23, 38, 32, 35, 3, 'skin', [1, 2, 3]);
  rod(g, 32, 35, 41, 30, 3, 'skin', [1, 2, 3]);
  sprite(g, 40, 26, ['s.s.', 'ss.t', 'sttu', '.tu.'], SKIN);
  return g;
}

/** What he is doing with his arms and the keg. */
type Arms = 'hold' | 'wind' | 'throw' | 'ouch' | 'drop';

/** Where the keg rides for each: over his head; drawn back for the throw; jolted onto his head; tumbling. */
const KEG_AT: Readonly<Record<Exclude<Arms, 'throw'>, readonly [number, number]>> = {
  hold: [15, 5],
  wind: [11, 3],
  ouch: [14, 8],
  drop: [0, 55],
};

function partsFor(arms: Arms, face: readonly string[]): { boned: Boned[]; glows: Glow[] } {
  const boned: Boned[] = [
    { part: gridPart(legs(), 1, { bone: 'legs' }), bone: 'legs' },
    { part: gridPart(torso(), 2, { bone: 'body' }), bone: 'body' },
    { part: gridPart(kerchief(), 4, { bone: 'body' }), bone: 'body' },
    { part: gridPart(head(face), 3, { bone: 'head', cast: false }), bone: 'head' },
  ];
  let glows: Glow[] = [];
  const glow = (kx: number, ky: number): Glow => ({
    ...sparkAt(kx, ky),
    radius: FUSE_LIGHT2.radius,
    strength: FUSE_LIGHT2.strength,
    always: true,
  });
  if (arms === 'throw')
    boned.push({ part: gridPart(armsThrown(), 6, { bone: 'body' }), bone: 'body' });
  else if (arms === 'drop') {
    // The keg tumbles down behind him, still lit; his arms fly up.
    boned.push({ part: gridPart(armsThrown(), 6, { bone: 'body' }), bone: 'body' });
    glows = [glow(...KEG_AT.drop)];
  } else {
    const [kx, ky] = KEG_AT[arms];
    boned.push({ part: gridPart(armsUp(kx, ky), 6, { bone: 'body' }), bone: 'body' });
    glows = [glow(kx, ky)];
  }
  return { boned, glows };
}

/** The poses he has, and how many frames each. */
export const MONKEY_FRAMES = { idle: 2, walk: 8, windup: 1, strike: 1, hurt: 1, fall: 2 } as const;
export type MonkeyPose = keyof typeof MONKEY_FRAMES;

const RECOIL: Key2 = { ...STAND2, bob: 1, lean: -1 };
const BUCKLE: Key2 = {
  ...STAND2,
  bob: 6,
  near: { dx: 3, lift: 0, knee: 5 },
  far: { dx: -2, lift: 0, knee: 4 },
};

/** A frame of the powder monkey, facing right: its picture, its glow (the fuse), and where he stands. */
export function monkeyFrame(
  pose: MonkeyPose,
  frame: number,
): { grid: TGrid; glows: readonly Glow[]; anchor: { x: number; y: number } } {
  const f = ((Math.floor(frame) % MONKEY_FRAMES[pose]) + MONKEY_FRAMES[pose]) % MONKEY_FRAMES[pose];
  let arms: Arms = 'hold';
  let face = HEAD_ROWS;
  let key: Key2 = STAND2;
  switch (pose) {
    case 'idle':
      key = IDLE2[f]!;
      break;
    case 'walk':
      key = walkKey('right', f, MONKEY_RIG.half);
      break;
    case 'windup':
      arms = 'wind';
      key = { ...STAND2, lean: -1 };
      break;
    case 'strike':
      arms = 'throw';
      key = { ...STAND2, bob: 1, lean: 2 };
      break;
    case 'hurt':
      arms = 'ouch';
      face = OUCH_ROWS;
      key = RECOIL;
      break;
    case 'fall':
      arms = 'drop';
      face = DOWN_ROWS;
      key = BUCKLE;
      break;
  }
  // Down, the keg has rolled away: he lies with nothing in his hands.
  const { boned, glows } = partsFor(pose === 'fall' && f === 1 ? 'throw' : arms, face);
  const grid = posedFigure(boned, MONKEY_RIG, key);
  // The glow rides with the body's bob (the keg is the body's), but for a keg on the ground.
  const dropped = arms === 'drop' && f === 0;
  const moved = glows.map((g) => ({ ...g, y: g.y + (dropped ? 0 : key.bob - (key.breath ?? 0)) }));
  if (dropped) {
    // The keg on the ground behind him: drawn where nothing of him is.
    const k = tgrid(56, 72);
    keg(k, KEG_AT.drop[0], KEG_AT.drop[1], true);
    const out = outlineIn(k);
    for (let i = 0; i < grid.d.length; i++) if (!grid.d[i] && out.d[i]) grid.d[i] = out.d[i]!;
  }
  if (pose === 'fall' && f === 1) {
    const lying = laid(grid);
    let low = 0;
    for (let i = 0; i < lying.d.length; i++) if (lying.d[i]) low = Math.floor(i / lying.w);
    return { grid: lying, glows: [], anchor: { x: 58, y: low } };
  }
  return { grid, glows: moved, anchor: { x: 28, y: 70 } };
}
