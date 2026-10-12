/*
 * How each monster behaves in a dungeon. A monster's numbers (hit points,
 * attack, defence, max hit, speed, drops) are in the content tables, or for
 * the grotto's own cast in `cast.ts`; this is only what a room needs on top
 * of them: how fast it walks, how far it sees, how close it must be to
 * strike, its heavy attack if it has one, and where it can be tapped. All of
 * it is data, never measured from a picture: the tap box is the art lane's
 * declared size (`FOE2_SIZES`), not the sprite's pixels.
 */
import { foeSize2 } from '../art/dungeonArt2';
import { grid, line, outline, rect, type Grid } from '../art/grid';
import { picture, type Picture } from '../art/raster';
import { DUNGEON } from './dungeonMetrics';
import { foeArtId } from './fromLaneB';

/**
 * A heavy attack: a patch of ground marked first, filling until it lands, and
 * landing hard on whoever is still in it. No dice: in it is hit, out of it is
 * not. Fair means there is always time to walk out from its worst spot, even
 * wading (`tests/scene/battle.test.ts` holds every one to it).
 */
export interface Heavy {
  /**
   * Round itself (a slam), at where the hero stood when it began (thrown),
   * swung out in front of it towards him (a sweep), or a charge straight
   * through where he stood to the wall beyond (a lane, `stuckMs`).
   */
  readonly aim: 'self' | 'thrown' | 'sweep' | 'charge';
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
  /** A charge: how long it is stuck where it ends (in the wall, or a lantern's post) before it moves again. */
  readonly stuckMs?: number;
  /** Leaves a cloud of spores where it lands, hanging this long (`light.ts`). */
  readonly spores?: number;
  /** Puts out any lantern whose post is in its mark when it lands. */
  readonly smashes?: boolean;
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
  /**
   * By phase, from the first: how often, how many lines, and how long each is
   * marked before it lands. None: no volleys at all.
   */
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
  /** More help, by the phase it comes at (the Burrow's king calls his court more than once). */
  readonly more?: readonly {
    readonly phase: number;
    readonly monster: string;
    readonly count: number;
  }[];
  /**
   * Going under the ground in these phases: out of reach and out of sight,
   * coming up every `everyMs` (the first after `firstMs`) under ground marked
   * `warnMs` before: where the hero stands if he is in the dark, under the
   * lantern lighting him if he is not (which it puts out). Up again for
   * `upMs`, and fought as anything else, before it goes back under.
   */
  readonly burrow?: {
    readonly phases: readonly number[];
    readonly firstMs: number;
    readonly everyMs: number;
    readonly warnMs: number;
    readonly radius: number;
    readonly times: number;
    readonly upMs: number;
  };
  /** From this phase its blows and heavy blows come this many times as fast. */
  readonly rage?: { readonly phase: number; readonly pace: number };
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

export interface FoeKind {
  /** Walking speed, art pixels a second. The hero walks at 64 (at the first scale). */
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
  /**
   * Walks only in the dark (`light.ts`): in a lantern's pool it holds still,
   * and still fights whatever comes into its reach.
   */
  readonly creeps?: boolean;
  /** Flies to the nearest burning lantern and puts it out after `snuffMs` (`light.ts`). */
  readonly seeksLight?: { readonly snuffMs: number };
  /** Drawn this high over where it is (art pixels): a moth on the wing. Drawing and tapping only. */
  readonly hovers?: number;
  /**
   * Its front blocks every blow (a shield-like cap): it is struck only from
   * behind, or while staggered by a braced blow. It turns to face the hero
   * `turnMs` after he gets behind it, and not at all for `recoverMs` after
   * its own heavy blow lands (committed to it).
   */
  readonly guard?: { readonly turnMs: number; readonly recoverMs: number };
  /** Bursts into a cloud of spores where it falls, this wide and hanging this long. */
  readonly bursts?: { readonly radius: number; readonly ms: number };
}

/* ----- Thistlewood Burrow (wave 19; `docs/status/lane-c.md` has the design) ----- */

/**
 * The Burrow's cast, each built round one thing to do about it: spore puffs
 * creep in the dark and leave clouds; cap guards are flanked or braced; a
 * bramble hound's charge is walked out of its lane, and it sticks in the
 * wall; a lantern moth is caught before it reaches a light; and the badger
 * king fights round the lanterns.
 */
export const BURROW_KINDS: Readonly<Record<string, FoeKind>> = {
  // Small and slow, and only on the move in the dark. Swells and puffs a cloud round itself
  // (marked green: it leaves spores), and bursts into one more when it falls.
  spore_puff: {
    speed: 26,
    notice: 90,
    reach: 20,
    keep: 18,
    heavy: {
      aim: 'self',
      radius: 30,
      warnMs: 1400,
      everyMs: 6500,
      firstMs: 2600,
      range: 28,
      times: 1,
      spores: 6000,
    },
    box: { w: 20, h: 22 },
    creeps: true,
    bursts: { radius: 24, ms: 5000 },
  },
  // A mushroom soldier behind its cap: blows from the front glance off. It bashes with the cap
  // in front of it; step round behind it as it does (it cannot turn while committed), or brace.
  cap_guard: {
    speed: 30,
    notice: 100,
    reach: 26,
    keep: 24,
    heavy: {
      aim: 'sweep',
      radius: 44,
      spread: (140 * Math.PI) / 180,
      warnMs: 1500,
      everyMs: 5200,
      firstMs: 2000,
      range: 34,
      times: 2,
    },
    box: { w: 24, h: 40 },
    guard: { turnMs: 1200, recoverMs: 1500 },
  },
  // A thorny beast that charges in a straight line through where you stood, to the wall: its
  // lane is marked; out of it, it sticks fast for a moment, open to a blow. A charge that ends
  // at a lantern's post knocks the lantern out.
  bramble_hound: {
    speed: 46,
    notice: 130,
    reach: 24,
    keep: 22,
    heavy: {
      aim: 'charge',
      radius: 12,
      warnMs: 1300,
      everyMs: 5600,
      firstMs: 1800,
      range: 150,
      times: 3,
      stuckMs: 2600,
    },
    box: { w: 40, h: 28 },
  },
  // Drawn to light: flies to a burning lantern and puts it out, unless a blow lands on it.
  lantern_moth: {
    speed: 70,
    notice: 160,
    reach: 22,
    keep: 20,
    heavy: null,
    box: { w: 26, h: 22 },
    hovers: 14,
    seeksLight: { snuffMs: 4000 },
  },
  // The boss: in person with a slam that puts out what it lands on; then under the ground,
  // coming up where you stand in the dark or under the lantern you stand by; then all fury.
  badger_king: {
    speed: 30,
    notice: 220,
    reach: 30,
    keep: 28,
    heavy: {
      aim: 'self',
      radius: 46,
      warnMs: 1800,
      everyMs: 6500,
      firstMs: 3000,
      range: 40,
      times: 2,
      smashes: true,
    },
    box: { w: 40, h: 52 },
    boss: {
      phases: [2 / 3, 1 / 3],
      volleys: { half: 0, damage: 0, firstMs: 0, gap: 0, phases: [] },
      calls: { monster: 'spore_puff', count: 2 },
      more: [
        { phase: 2, monster: 'lantern_moth', count: 1 },
        { phase: 3, monster: 'bramble_hound', count: 1 },
      ],
      burrow: {
        phases: [2],
        firstMs: 2000,
        everyMs: 2500,
        warnMs: 1700,
        radius: 34,
        times: 2,
        upMs: 6000,
      },
      rage: { phase: 3, pace: 1.35 },
    },
  },
};

/**
 * The monsters a dungeon uses, at the first scale: what the rows below were
 * written at, and what `kindAtScale` turns into the dungeons' own. Each tap
 * box here is the first scale's, kept only for the scale's arithmetic; the
 * one a fight uses is the art lane's (`tapBox`).
 */
export const FIRST_KINDS: Readonly<Record<string, FoeKind>> = {
  dock_rat: {
    speed: 52,
    notice: 72,
    reach: 22,
    keep: 20,
    heavy: null,
    box: { w: 22, h: 14 },
  },
  sand_crab: {
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

  /* ----- The Tidepool Cave ----- */

  // The cave's boss, built round one thing to learn: when the ground round it
  // is marked, it is about to come down on it with all its shell. Slow to
  // walk, slow to wind up, the mark wide and plain, and nothing else going on:
  // no cannon behind it (no volleys) and nobody to call.
  old_snapper: {
    speed: 16,
    notice: 150,
    reach: 30,
    keep: 28,
    heavy: {
      aim: 'self',
      radius: 50,
      warnMs: 2200,
      everyMs: 7000,
      firstMs: 4000,
      range: 46,
      times: 2,
    },
    box: { w: 48, h: 30 },
    boss: {
      phases: [],
      volleys: { half: 0, damage: 0, firstMs: 0, gap: 0, phases: [] },
      calls: { monster: 'dock_rat', count: 0 },
    },
  },

  ...BURROW_KINDS,
};

/**
 * A monster's row at `k` times the first scale's distances: paces, how far
 * it notices and reaches, how near it keeps, its tap box, its heavy blow's
 * mark and range, a flier's speed, a rally's reach, a boss's volley lines.
 * Times stay as they are. At 1, the row itself.
 */
export function kindAtScale(kind: FoeKind, k: number): FoeKind {
  if (k === 1) return kind;
  const heavy = kind.heavy && {
    ...kind.heavy,
    radius: kind.heavy.radius * k,
    range: kind.heavy.range * k,
  };
  return {
    ...kind,
    speed: kind.speed * k,
    notice: kind.notice * k,
    reach: kind.reach * k,
    keep: kind.keep * k,
    heavy,
    box: { w: kind.box.w * k, h: kind.box.h * k },
    ...(kind.shy !== undefined ? { shy: kind.shy * k } : {}),
    ...(kind.flies ? { flies: { ...kind.flies, speed: kind.flies.speed * k } } : {}),
    ...(kind.rally ? { rally: { ...kind.rally, radius: kind.rally.radius * k } } : {}),
    ...(kind.hovers !== undefined ? { hovers: kind.hovers * k } : {}),
    ...(kind.bursts ? { bursts: { ...kind.bursts, radius: kind.bursts.radius * k } } : {}),
    ...(kind.boss
      ? {
          boss: {
            ...kind.boss,
            volleys: {
              ...kind.boss.volleys,
              half: kind.boss.volleys.half * k,
              gap: kind.boss.volleys.gap * k,
            },
            ...(kind.boss.burrow
              ? { burrow: { ...kind.boss.burrow, radius: kind.boss.burrow.radius * k } }
              : {}),
          },
        }
      : {}),
  };
}

/**
 * The monsters a dungeon uses, by id, at the dungeons' scale
 * (`dungeonMetrics.ts`). One not here still fights, as a rat does: the
 * tables can gain a monster before a room knows how it moves.
 */
export const FOE_KINDS: Readonly<Record<string, FoeKind>> = Object.fromEntries(
  Object.entries(FIRST_KINDS).map(([id, kind]) => [
    id,
    { ...kindAtScale(kind, DUNGEON.distance), box: tapBox(id, kind) },
  ]),
);

/**
 * Where a foe can be tapped, from its feet: the art lane's declared box for
 * it (as wide as its body, as tall as its drawing), or, for a monster it has
 * no size for, the first scale's box at the dungeons' scale.
 */
export function tapBox(id: string, first: FoeKind): { readonly w: number; readonly h: number } {
  const size = foeSize2(foeArtId(id));
  if (size) return size.box;
  return { w: first.box.w * DUNGEON.distance, h: first.box.h * DUNGEON.distance };
}

export function foeKind(monster: string): FoeKind {
  return FOE_KINDS[monster] ?? FOE_KINDS.dock_rat!;
}

/**
 * How far across from its feet the middle of a foe's body is, as it faces
 * now, in art pixels: lane B's `mid` (B16, a long-tailed beast standing on
 * its front feet: Old Snapper's is 14 behind them), mirrored facing left; 0
 * for a body over its feet. Its tap box, contact shadow, rings and health bar
 * centre there. Drawing and tapping only: reach is still from the feet.
 */
export function bodyMid(monster: string, facing: 'left' | 'right'): number {
  const mid = foeSize2(foeArtId(monster))?.mid ?? 0;
  if (mid === 0) return 0;
  return facing === 'right' ? mid : -mid;
}

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
