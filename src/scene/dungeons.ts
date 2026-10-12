/*
 * Every dungeon the scene can play, by id: its rooms (a `DungeonPlan`, in a
 * module of its own: `grotto.ts`, `tidepool.ts`), the words that are its own
 * (the results card, the prompt to turn the phone, what a boss shouts), any
 * cast it fights by that the game's tables do not hold yet, and its lessons.
 * Everything else about a run (the rules, the drawing, keeping it through a
 * reload, the worker that paints its rooms) takes any of these by id.
 *
 * A third dungeon is a plan module and a row here (see
 * `docs/status/lane-c.md`, "Adding a dungeon").
 */
import type { Content } from '../core/content';
import type { SayLine } from './battle';
import { GROTTO_CAST, GROTTO_ID, type CastDef } from './cast';
import { buildDungeon, type Dungeon, type DungeonPlan } from './dungeon';
import { BADGER_SAYS, BURROW_ID, BURROW_STAND_IN_CAST } from './burrow';
import { CAPTAIN_SAYS } from './grottoWords';
import { BURROW_LESSONS, CAVE_LESSONS, type Lesson } from './lessons';
import { DUNGEON_PLANS } from './plans';
import { TIDEPOOL_ID, TIDEPOOL_SAYS } from './tidepool';

/** What a dungeon says that is its own. */
export interface DungeonWords {
  /** The results card's heading and line: cleared, or knocked down and brought home. */
  readonly cleared: { readonly title: string; readonly line: string };
  readonly fell: { readonly title: string; readonly line: string };
  /** Under "Turn your phone on its side": before the run has begun, and once it has. */
  readonly turn: { readonly before: string; readonly during: string };
  /** What a screen reader hears for a room. */
  readonly label: string;
  /** What each boss shouts as its fight turns, by its monster id and the line's id. */
  readonly says?: Readonly<Record<string, Partial<Record<SayLine, string>>>>;
}

export interface DungeonScene {
  readonly plan: DungeonPlan;
  readonly words: DungeonWords;
  /**
   * Rows the scene fights by where the game's tables (`content.dungeons[id].cast`)
   * have none yet. The tables' rows win: a number is changed in one place.
   */
  readonly cast?: Readonly<Record<string, CastDef>>;
  /** What a new player is shown the first time each thing is useful (`lessons.ts`). */
  readonly lessons?: readonly Lesson[];
  /**
   * Drawn with stand-ins until the art lane draws it (`fromLaneB.ts`): said
   * in a small tag in a corner of the screen, so nobody takes them for the
   * real thing. Absent once its own pictures are in.
   */
  readonly standIn?: string;
}

export const DUNGEON_SCENES: Readonly<Record<string, DungeonScene>> = {
  [GROTTO_ID]: {
    plan: DUNGEON_PLANS[GROTTO_ID]!,
    cast: GROTTO_CAST,
    words: {
      cleared: {
        title: 'The grotto is cleared',
        line: 'The captain has been seen off, and his crew with him. Their belongings have come with you.',
      },
      fell: {
        title: 'Washed back to town',
        line: 'The tide put you back on the quay, damp but whole. Everything you picked up came with you.',
      },
      turn: {
        before: 'The grotto is wide and low. So, to be fair, is the boat.',
        during: 'The grotto will wait. Nothing in it is going anywhere.',
      },
      label: 'A sea cave. Tap the ground to walk there, or something to fight it.',
      says: { brinebeard: CAPTAIN_SAYS },
    },
  },
  [TIDEPOOL_ID]: {
    plan: DUNGEON_PLANS[TIDEPOOL_ID]!,
    lessons: CAVE_LESSONS,
    words: {
      cleared: {
        title: 'The cave is cleared',
        line: 'The snapper has gone back under its rock to think about things. You found the way through.',
      },
      fell: {
        title: 'Back on the quay',
        line: 'The ferryman fished you out and rowed you home. Everything you picked up came with you.',
      },
      turn: {
        before: 'The cave is wide and low. Turn your phone on its side to row in.',
        during: 'The cave will wait. The crabs are not going anywhere.',
      },
      label: 'A little sea cave. Tap the ground to walk there, or something to fight it.',
      says: TIDEPOOL_SAYS,
    },
  },
  [BURROW_ID]: {
    plan: DUNGEON_PLANS[BURROW_ID]!,
    // Until lane A's rows are on `main`; theirs win from the moment they are (`castOf`).
    cast: BURROW_STAND_IN_CAST,
    lessons: BURROW_LESSONS,
    standIn: 'Stand-in art',
    words: {
      cleared: {
        title: 'The burrow is quiet',
        line: 'The king has been seen off, crown and all. His court has gone to ground, and the lanterns are yours.',
      },
      fell: {
        title: 'Carried out by the roots',
        line: 'Something large and polite put you back on the shore. Everything you picked up came with you.',
      },
      turn: {
        before: 'The burrow is wide and low. Mind your head on the way in.',
        during: 'The burrow will wait. It is very good at waiting in the dark.',
      },
      label:
        'An overgrown burrow, dark but for its lanterns. Tap the ground to walk there, something to fight it, or a lantern to light it.',
      says: { badger_king: BADGER_SAYS },
    },
  },
};

/** The dungeons in the order their plans are listed. */
export const DUNGEON_IDS: readonly string[] = Object.keys(DUNGEON_SCENES);

/** A dungeon's scene by id; null for one this scene does not know. */
export function dungeonScene(id: string): DungeonScene | null {
  return Object.hasOwn(DUNGEON_SCENES, id) ? DUNGEON_SCENES[id]! : null;
}

const built = new Map<string, Dungeon>();

/** A dungeon read from its plan, by id, built once a page; null for one not known. */
export function dungeonById(id: string): Dungeon | null {
  const scene = dungeonScene(id);
  if (!scene) return null;
  let made = built.get(id);
  if (!made) {
    made = buildDungeon(scene.plan);
    built.set(id, made);
  }
  return made;
}

const dimmed = new Map<string, Dungeon>();

/**
 * A dungeon as a darker day shows it (`Room.dim`): the same rooms, ground
 * and doors, their lights laying smaller pools. Drawing only: every rule
 * reads the same ground. The dungeon itself at `dim` 1.
 */
export function dimDungeon(dungeon: Dungeon, dim: number): Dungeon {
  if (dim === 1) return dungeon;
  const key = `${dungeon.id} ${dim}`;
  let made = dimmed.get(key);
  if (!made) {
    made = {
      ...dungeon,
      rooms: Object.fromEntries(
        Object.entries(dungeon.rooms).map(([id, room]) => [id, { ...room, dim }]),
      ),
    };
    dimmed.set(key, made);
  }
  return made;
}

/** Every dungeon built so far this page: for letting their rooms' pictures go. */
export function builtDungeons(): readonly Dungeon[] {
  return [...built.values(), ...dimmed.values()];
}

/**
 * The rows a dungeon's run fights by: the tables' monsters, then the
 * dungeon's own cast from the tables (`content.dungeons[id].cast`), each
 * given the dungeon as its area, then any row the scene holds for one the
 * tables do not have yet.
 */
export function castOf(content: Content, id: string): Record<string, CastDef> {
  const own: Record<string, CastDef> = {};
  for (const foe of content.dungeons?.[id]?.cast ?? []) own[foe.id] = { ...foe, area: id };
  const standIn = dungeonScene(id)?.cast ?? {};
  const missing = Object.fromEntries(Object.entries(standIn).filter(([foe]) => !(foe in own)));
  return { ...(content.monsters ?? {}), ...missing, ...own };
}

/** How much each kind of food heals, by item id: what a run lets the player eat if found. */
export function healsOf(content: Content): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of Object.values(content.items)) if (item.heals) out[item.id] = item.heals;
  return out;
}

/** What a boss says, by the dungeon, the boss and the line; null if it says nothing. */
export function sayingOf(dungeon: string, monster: string, line: SayLine): string | null {
  return dungeonScene(dungeon)?.words.says?.[monster]?.[line] ?? null;
}
