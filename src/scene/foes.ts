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
}

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
    ...(kind.boss
      ? {
          boss: {
            ...kind.boss,
            volleys: {
              ...kind.boss.volleys,
              half: kind.boss.volleys.half * k,
              gap: kind.boss.volleys.gap * k,
            },
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
  const size = foeSize2(id);
  if (size) return size.box;
  return { w: first.box.w * DUNGEON.distance, h: first.box.h * DUNGEON.distance };
}

export function foeKind(monster: string): FoeKind {
  return FOE_KINDS[monster] ?? FOE_KINDS.dock_rat!;
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
