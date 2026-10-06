/*
 * How each monster behaves in a dungeon, and what it looks like until the art
 * lane draws it. A monster's numbers (hit points, attack, defence, max hit,
 * speed, drops) are in the content tables, or for the grotto's own cast in
 * `cast.ts`; this is only what a room needs on top of them: how fast it
 * walks, how far it sees, how close it must be to strike, and its heavy
 * attack if it has one. All of it is data, never measured from a picture.
 */
import { foePicture } from '../art/dungeonArt';
import { ellipse, grid, line, outline, rect, type Grid } from '../art/grid';
import { picture, type Picture } from '../art/raster';
import type { Facing } from './play';
import type { Point } from './tileMap';
import { mirrored } from './walkerArt';

/**
 * A heavy attack: a patch of ground marked first, filling until it lands, and
 * landing hard on whoever is still in it. No dice: in it is hit, out of it is
 * not. Fair means there is always time to walk out from its worst spot, even
 * wading (`tests/scene/battle.test.ts` holds every one to it).
 */
export interface Heavy {
  /**
   * Round itself (a slam), at where the hero stood when it began (thrown), or
   * swung out in front of it towards him (a sweep).
   */
  readonly aim: 'self' | 'thrown' | 'sweep';
  /** The mark's radius in art pixels. A hero whose feet are nearer its middle than this is hit. */
  readonly radius: number;
  /** A sweep's width, in radians, centred on where the hero stood when it began. */
  readonly spread?: number;
  /** From the mark appearing to the blow landing. */
  readonly warnMs: number;
  /** From one landing to the next being allowed to start. */
  readonly everyMs: number;
  /** From first noticing the hero to the first being allowed. */
  readonly firstMs: number;
  /** It begins only with the hero this near, in art pixels. */
  readonly range: number;
  /** It does this many times the monster's max hit. */
  readonly times: number;
  /** A lit keg: one that lands in water goes out and hurts nobody. */
  readonly douse?: boolean;
  /** Only from this phase of a boss's fight. */
  readonly fromPhase?: number;
}

/** A boss's cannon volleys: lines marked straight down the room, each landing on whoever is in it. */
export interface Volleys {
  /** Half a line's width, in art pixels: feet nearer its middle than this are hit. */
  readonly half: number;
  readonly damage: number;
  /** From the boss noticing the hero to the first volley. */
  readonly firstMs: number;
  /** Two lines in one volley are never nearer each other than this, so there is always a way between. */
  readonly gap: number;
  /** By phase, from the first: how often, how many lines, and how long each is marked before it lands. */
  readonly phases: readonly {
    readonly everyMs: number;
    readonly lines: number;
    readonly warnMs: number;
  }[];
}

/** How a boss's fight changes as it is beaten. */
export interface BossRules {
  /** The fraction of its hit points at or below which each later phase begins: [second, third]. */
  readonly phases: readonly number[];
  readonly volleys: Volleys;
  /** Who comes to help when the second phase begins. */
  readonly calls: { readonly monster: string; readonly count: number };
}

/** Something that flies: it sits out of reach on a perch, comes down to peck, and goes back up. */
export interface Flight {
  /** Flying speed, art pixels a second. */
  readonly speed: number;
  /** How long it sits on a perch between visits. */
  readonly perchMs: number;
  /** How long it stays down beside the hero before it flies off again. */
  readonly downMs: number;
}

/** A foe that makes others near it hit faster while it lives. */
export interface Rally {
  /** How near, in art pixels, the others must be. */
  readonly radius: number;
  /** How much faster their blows come: their timers run this many times as fast. */
  readonly pace: number;
}

export type FoeLook =
  'rat' | 'crab' | 'smuggler' | 'deckhand' | 'monkey' | 'giant_crab' | 'parrot' | 'captain';

export interface FoeKind {
  readonly look: FoeLook;
  /** Walking speed, art pixels a second. The hero walks at 64. */
  readonly speed: number;
  /** How near the hero must come, in art pixels and in sight, to be noticed. */
  readonly notice: number;
  /** How near, feet to feet, it must be to strike an ordinary blow. */
  readonly reach: number;
  /** How near it comes before it stops: its reach, or further off for one that throws. */
  readonly keep: number;
  readonly heavy: Heavy | null;
  /** Where it can be tapped, from its feet: this wide, centred, and this tall above them. */
  readonly box: { readonly w: number; readonly h: number };
  /** Backs away from a hero who comes nearer than this, to keep its distance. */
  readonly shy?: number;
  /** One of a crew: a parrot's squawking makes it hit faster. */
  readonly crew?: boolean;
  readonly flies?: Flight;
  readonly rally?: Rally;
  readonly boss?: BossRules;
}

/**
 * The monsters a dungeon uses, by id. One not here still fights, as a rat
 * does: the tables can gain a monster before a room knows how it moves.
 */
export const FOE_KINDS: Readonly<Record<string, FoeKind>> = {
  dock_rat: {
    look: 'rat',
    speed: 52,
    notice: 72,
    reach: 22,
    keep: 20,
    heavy: null,
    box: { w: 22, h: 14 },
  },
  sand_crab: {
    look: 'crab',
    speed: 30,
    notice: 64,
    reach: 30,
    keep: 26,
    // A two-claw slam round itself: punishes standing beside it too long.
    heavy: {
      aim: 'self',
      radius: 40,
      warnMs: 1300,
      everyMs: 6000,
      firstMs: 2500,
      range: 32,
      times: 2,
    },
    box: { w: 26, h: 16 },
  },
  smuggler: {
    look: 'smuggler',
    speed: 40,
    notice: 120,
    reach: 22,
    keep: 72,
    // Something heavy and corked, lobbed at where the hero is standing.
    heavy: {
      aim: 'thrown',
      radius: 26,
      warnMs: 1300,
      everyMs: 4500,
      firstMs: 1200,
      range: 136,
      times: 2,
    },
    box: { w: 20, h: 36 },
  },

  /* ----- Brinebeard's Grotto ----- */

  // Walks up and hits: a boathook reaches a little further than a fist.
  deckhand: {
    look: 'deckhand',
    speed: 44,
    notice: 104,
    reach: 26,
    keep: 24,
    heavy: null,
    box: { w: 22, h: 44 },
    crew: true,
  },
  // Keeps away and lobs lit kegs, standing still while each one burns: that is when to catch him.
  powder_monkey: {
    look: 'monkey',
    speed: 50,
    notice: 150,
    reach: 22,
    keep: 92,
    shy: 60,
    heavy: {
      aim: 'thrown',
      radius: 28,
      warnMs: 1800,
      everyMs: 4600,
      firstMs: 1500,
      range: 168,
      times: 3,
      douse: true,
    },
    box: { w: 18, h: 36 },
    crew: true,
  },
  // Slow, and a slam as wide as it is.
  giant_crab: {
    look: 'giant_crab',
    speed: 22,
    notice: 96,
    reach: 32,
    keep: 30,
    heavy: {
      aim: 'self',
      radius: 46,
      warnMs: 1700,
      everyMs: 5600,
      firstMs: 2200,
      range: 40,
      times: 3,
    },
    box: { w: 44, h: 26 },
  },
  // Out of reach on a perch, down to peck, and every pirate near it hits faster.
  ships_parrot: {
    look: 'parrot',
    speed: 40,
    notice: 176,
    reach: 22,
    keep: 20,
    heavy: null,
    box: { w: 22, h: 22 },
    flies: { speed: 110, perchMs: 6000, downMs: 2800 },
    rally: { radius: 120, pace: 1.5 },
  },
  // The captain: in person with cannon behind him, then the sea, then the anchor.
  brinebeard: {
    look: 'captain',
    speed: 34,
    notice: 220,
    reach: 30,
    keep: 26,
    heavy: {
      aim: 'sweep',
      radius: 58,
      spread: (210 * Math.PI) / 180,
      warnMs: 1600,
      everyMs: 7000,
      firstMs: 2500,
      range: 44,
      times: 2,
      fromPhase: 3,
    },
    box: { w: 36, h: 56 },
    crew: true,
    boss: {
      phases: [2 / 3, 1 / 3],
      volleys: {
        half: 10,
        damage: 18,
        firstMs: 4000,
        gap: 48,
        phases: [
          { everyMs: 7000, lines: 2, warnMs: 2000 },
          { everyMs: 7000, lines: 2, warnMs: 2000 },
          { everyMs: 4500, lines: 3, warnMs: 1600 },
        ],
      },
      calls: { monster: 'deckhand', count: 2 },
    },
  },
};

export function foeKind(monster: string): FoeKind {
  return FOE_KINDS[monster] ?? FOE_KINDS.dock_rat!;
}

/* ----- Placeholder figures: one silhouette and one colour ramp each ----- */

/** A figure and where its feet are in it, facing right. */
export interface FoeFigure {
  readonly picture: Picture;
  readonly feet: Point;
}

/** Low and long, grey, with a pink tail and nose. */
function rat(): Grid {
  const g = grid(20, 11);
  line(g, 4, 7, 0, 3, 'flush2');
  ellipse(g, 9, 6, 6, 3.5, 'stone2');
  ellipse(g, 8, 4.5, 4, 1.5, 'stone1');
  ellipse(g, 15, 5.5, 3, 2.5, 'stone2');
  rect(g, 13, 2, 2, 2, 'flush2');
  rect(g, 18, 6, 1, 1, 'flush1');
  rect(g, 16, 4, 1, 1, 'ink1');
  rect(g, 6, 9, 1, 2, 'stone3');
  rect(g, 12, 9, 1, 2, 'stone3');
  return g;
}

/** Wide and red, claws up, eyes on stalks. */
function crab(): Grid {
  const g = grid(26, 15);
  for (const x of [6, 9, 16, 19]) line(g, x, 9, x + (x < 13 ? -3 : 3), 14, 'red3');
  line(g, 7, 7, 3, 4, 'red2');
  line(g, 18, 7, 22, 4, 'red2');
  ellipse(g, 3, 3, 3, 2.5, 'red1');
  ellipse(g, 22, 3, 3, 2.5, 'red1');
  rect(g, 2, 0, 1, 2, 'red3');
  rect(g, 21, 0, 1, 2, 'red3');
  ellipse(g, 12.5, 9, 7.5, 4, 'red2');
  ellipse(g, 11, 7.5, 4.5, 1.6, 'red1');
  rect(g, 10, 3, 1, 3, 'red3');
  rect(g, 15, 3, 1, 3, 'red3');
  rect(g, 10, 2, 1, 1, 'ink1');
  rect(g, 15, 2, 1, 1, 'ink1');
  return g;
}

/** Tall, in a navy coat and a red headscarf, cutlass out. */
function smuggler(): Grid {
  const g = grid(20, 34);
  // Cutlass, held out in front.
  line(g, 14, 18, 18, 10, 'metal1');
  line(g, 15, 18, 19, 11, 'metal2');
  rect(g, 13, 18, 3, 2, 'gold2');
  // Legs and boots.
  rect(g, 6, 24, 3, 8, 'navy2');
  rect(g, 10, 24, 3, 8, 'navy2');
  rect(g, 5, 31, 4, 3, 'shade1');
  rect(g, 10, 31, 4, 3, 'shade1');
  // Coat, long, wider at the hem.
  rect(g, 4, 12, 10, 14, 'navy1');
  rect(g, 3, 20, 12, 6, 'navy1');
  rect(g, 4, 12, 3, 14, 'slate2');
  rect(g, 4, 18, 10, 2, 'red2');
  // Arm reaching to the cutlass.
  rect(g, 11, 14, 3, 5, 'navy1');
  rect(g, 13, 18, 2, 2, 'skin2');
  // Head, scarf, a scowl.
  ellipse(g, 9, 8, 3.5, 4, 'skin1');
  rect(g, 11, 7, 1, 1, 'ink1');
  rect(g, 9, 6, 3, 1, 'beard2');
  rect(g, 8, 10, 3, 1, 'beard1');
  ellipse(g, 9, 4.5, 4.5, 2.5, 'red2');
  rect(g, 3, 4, 2, 4, 'red3');
  return g;
}

/** A striped shirt, bare feet, a boathook held across. */
function deckhand(): Grid {
  const g = grid(22, 33);
  // The boathook: a long haft, a hook at the front.
  line(g, 2, 26, 19, 9, 'wood2');
  line(g, 19, 9, 20, 6, 'metal2');
  rect(g, 20, 5, 1, 2, 'metal2');
  rect(g, 18, 5, 2, 1, 'metal2');
  // Legs in rolled trousers, bare feet.
  rect(g, 6, 22, 3, 7, 'sail2');
  rect(g, 11, 22, 3, 7, 'sail2');
  rect(g, 6, 29, 3, 2, 'skin2');
  rect(g, 11, 29, 4, 2, 'skin2');
  // Striped shirt.
  rect(g, 5, 12, 10, 11, 'white1');
  for (const y of [13, 16, 19, 22]) rect(g, 5, y, 10, 1, 'navy1');
  rect(g, 5, 12, 2, 11, 'stone1');
  // Arms on the haft.
  rect(g, 13, 14, 3, 4, 'skin2');
  rect(g, 4, 14, 2, 6, 'skin2');
  // Head, a red cap, stubble.
  ellipse(g, 10, 8, 3.5, 4, 'skin1');
  rect(g, 12, 7, 1, 1, 'ink1');
  rect(g, 8, 10, 4, 1, 'beard1');
  ellipse(g, 10, 4.5, 4, 2, 'red2');
  rect(g, 6, 4, 2, 2, 'red3');
  return g;
}

/** Small and quick, a powder-black face, a lit keg under one arm. */
function monkey(): Grid {
  const g = grid(18, 25);
  rect(g, 5, 17, 3, 6, 'wood3');
  rect(g, 9, 17, 3, 6, 'wood3');
  rect(g, 5, 22, 3, 2, 'shade1');
  rect(g, 9, 22, 3, 2, 'shade1');
  rect(g, 4, 10, 9, 8, 'red2');
  rect(g, 4, 10, 2, 8, 'red1');
  // The keg, a fuse burning.
  ellipse(g, 13, 14, 3.5, 4, 'wood2');
  rect(g, 10, 12, 7, 1, 'metal3');
  rect(g, 10, 16, 7, 1, 'metal3');
  rect(g, 14, 8, 1, 3, 'sand3');
  rect(g, 14, 7, 1, 1, 'fire1');
  ellipse(g, 8, 6, 3.5, 3.5, 'skin2');
  rect(g, 9, 5, 1, 1, 'ink1');
  rect(g, 7, 7, 3, 1, 'shade1');
  rect(g, 5, 2, 6, 2, 'navy1');
  return g;
}

/** A crab the size of a rowing boat: barnacled shell, claws raised. */
function giantCrab(): Grid {
  const g = grid(46, 26);
  for (const x of [10, 15, 30, 35]) line(g, x, 15, x + (x < 23 ? -5 : 5), 25, 'red3');
  line(g, 12, 12, 5, 6, 'red2');
  line(g, 34, 12, 41, 6, 'red2');
  ellipse(g, 5, 4, 5, 4, 'red1');
  ellipse(g, 41, 4, 5, 4, 'red1');
  rect(g, 3, 0, 2, 3, 'red3');
  rect(g, 40, 0, 2, 3, 'red3');
  ellipse(g, 23, 15, 14, 7.5, 'red2');
  ellipse(g, 20, 12, 8, 3, 'red1');
  for (const [x, y] of [
    [16, 16],
    [27, 13],
    [30, 18],
  ] as const)
    rect(g, x, y, 2, 2, 'stone1');
  rect(g, 18, 4, 1, 5, 'red3');
  rect(g, 27, 4, 1, 5, 'red3');
  rect(g, 17, 3, 2, 2, 'ink1');
  rect(g, 27, 3, 2, 2, 'ink1');
  return g;
}

/** Green, red and loud. */
function parrot(): Grid {
  const g = grid(16, 17);
  rect(g, 6, 13, 1, 3, 'gold2');
  rect(g, 9, 13, 1, 3, 'gold2');
  ellipse(g, 7.5, 9, 4, 5, 'pine1');
  ellipse(g, 6, 9, 2.5, 4, 'pine2');
  line(g, 3, 12, 0, 16, 'red2');
  line(g, 4, 12, 2, 16, 'blue2');
  ellipse(g, 10, 4, 3.5, 3.5, 'red1');
  rect(g, 11, 3, 1, 1, 'ink1');
  rect(g, 13, 4, 2, 2, 'gold1');
  rect(g, 14, 6, 1, 1, 'gold2');
  return g;
}

/** Big, a tricorn, a long coat, a beard you could lose a gull in, the anchor over a shoulder. */
function captain(): Grid {
  const g = grid(34, 46);
  // The anchor on his shoulder: shank, stock, flukes behind him.
  line(g, 4, 6, 12, 26, 'metal3');
  line(g, 5, 6, 13, 26, 'metal2');
  rect(g, 1, 8, 8, 2, 'metal3');
  line(g, 9, 28, 14, 24, 'metal2');
  line(g, 9, 28, 6, 23, 'metal2');
  // Boots.
  rect(g, 11, 38, 5, 7, 'shade1');
  rect(g, 18, 38, 5, 7, 'shade1');
  // The coat: long, red, gold buttons and cuffs.
  rect(g, 9, 17, 16, 22, 'crimson1');
  rect(g, 8, 30, 18, 9, 'crimson1');
  rect(g, 9, 17, 4, 22, 'red1');
  rect(g, 16, 17, 2, 22, 'crimson2');
  for (const y of [20, 24, 28]) rect(g, 18, y, 2, 2, 'gold1');
  rect(g, 8, 30, 18, 2, 'gold2');
  // An arm across, a fist.
  rect(g, 22, 20, 5, 4, 'crimson2');
  rect(g, 26, 20, 3, 3, 'skin2');
  // Head, beard, the hat.
  ellipse(g, 17, 12, 5, 5, 'skin1');
  rect(g, 19, 10, 1, 1, 'ink1');
  rect(g, 17, 9, 4, 1, 'beard2');
  ellipse(g, 17, 17, 6.5, 5, 'beard1');
  ellipse(g, 16, 18, 4, 4, 'beard2');
  rect(g, 18, 15, 3, 1, 'lips2');
  ellipse(g, 17, 6, 9, 2.5, 'navy2');
  rect(g, 11, 2, 12, 4, 'navy2');
  rect(g, 11, 6, 13, 1, 'gold2');
  rect(g, 16, 3, 2, 2, 'white1');
  return g;
}

const DRAWN: Readonly<Record<FoeLook, () => Grid>> = {
  rat,
  crab,
  smuggler,
  deckhand,
  monkey,
  giant_crab: giantCrab,
  parrot,
  captain,
};

const figures = new Map<string, FoeFigure>();

/** A monster's placeholder figure facing either way, outlined, with its feet. Made once. */
export function foeFigure(look: FoeLook, facing: Facing): FoeFigure {
  const key = `${look} ${facing}`;
  let made = figures.get(key);
  if (!made) {
    const g = outline(DRAWN[look]());
    const pic = facing === 'right' ? g : mirrored(g);
    const x = Math.floor(g.w / 2);
    made = { picture: picture(pic), feet: { x: facing === 'right' ? x : g.w - 1 - x, y: g.h - 1 } };
    figures.set(key, made);
  }
  return made;
}

const sprites = new Map<string, FoeFigure | null>();

/**
 * How a monster looks facing either way: the art lane's sprite for its id if
 * there is one (mirrored for facing left, its feet with it), otherwise this
 * scene's placeholder. Asked once per monster and way, and kept.
 */
export function foeSprite(monster: string, facing: Facing): FoeFigure {
  const key = `${monster} ${facing}`;
  if (!sprites.has(key)) {
    const drawn = foePicture(monster);
    let made: FoeFigure | null = null;
    if (drawn) {
      const { w } = drawn.picture.grid;
      made =
        facing === 'right'
          ? { picture: drawn.picture, feet: { ...drawn.feet } }
          : {
              picture: picture(
                mirrored(drawn.picture.grid),
                drawn.picture.glows.map((glow) => ({ ...glow, x: w - glow.x })),
              ),
              feet: { x: w - 1 - drawn.feet.x, y: drawn.feet.y },
            };
    }
    sprites.set(key, made);
  }
  return sprites.get(key) ?? foeFigure(foeKind(monster).look, facing);
}

/** A pile of loot on the floor: a sack with a glint of coin. */
export const LOOT_PILE: FoeFigure = (() => {
  const g = grid(9, 7);
  ellipse(g, 4, 4, 3.5, 2.5, 'apron1');
  ellipse(g, 3, 3.5, 1.5, 1, 'sand1');
  rect(g, 3, 0, 3, 2, 'apron2');
  rect(g, 6, 5, 2, 2, 'gold1');
  return { picture: picture(outline(g)), feet: { x: 5, y: 8 } };
})();

/* ----- The ability buttons' pictures, 12 x 12 before the outline ----- */

function sweepIcon(): Grid {
  const g = grid(12, 12);
  // A blade's path: a wide arc round to the right.
  for (let a = -160; a <= 20; a += 4) {
    const t = (a * Math.PI) / 180;
    rect(g, Math.round(6 + Math.cos(t) * 5), Math.round(7 + Math.sin(t) * 5), 1, 1, 'metal1');
    rect(g, Math.round(6 + Math.cos(t) * 4), Math.round(7 + Math.sin(t) * 4), 1, 1, 'metal2');
  }
  rect(g, 10, 8, 2, 2, 'gold2');
  rect(g, 11, 10, 1, 2, 'wood3');
  return g;
}

function braceIcon(): Grid {
  const g = grid(12, 12);
  rect(g, 2, 1, 8, 7, 'metal2');
  rect(g, 3, 8, 6, 2, 'metal2');
  rect(g, 4, 10, 4, 1, 'metal2');
  rect(g, 2, 1, 2, 7, 'metal1');
  rect(g, 5, 1, 2, 10, 'gold2');
  return g;
}

function doubleIcon(): Grid {
  const g = grid(12, 12);
  for (const dy of [0, 4]) {
    line(g, 0, 4 + dy, 8, dy, 'wood1');
    rect(g, 8, dy, 2, 2, 'metal1');
    rect(g, 0, 3 + dy, 2, 2, 'red2');
  }
  return g;
}

function stepBackIcon(): Grid {
  const g = grid(12, 12);
  rect(g, 3, 5, 9, 2, 'sand1');
  line(g, 0, 6, 4, 2, 'sand1');
  line(g, 0, 6, 4, 10, 'sand1');
  line(g, 1, 6, 4, 3, 'sand2');
  line(g, 1, 6, 4, 9, 'sand2');
  return g;
}

const ICONS: Readonly<Record<string, () => Grid>> = {
  sweep: sweepIcon,
  brace: braceIcon,
  double: doubleIcon,
  step_back: stepBackIcon,
};

/** An ability's picture for its button, by the ability's id; null for one not drawn. */
export function abilityPicture(id: string): Picture | null {
  const draw = ICONS[id];
  return draw ? picture(outline(draw())) : null;
}
