/*
 * A dungeon as data and rules: rooms on ground the tide comes and goes over
 * (`ground.ts`), doors that join them, and a run through them from the boat
 * to the end. The rules are pure (a run is a value, and time and the
 * walker's feet move it on), so they are tested without a canvas;
 * `dungeonView.ts` shows them and `grottoArt.ts` draws the rooms.
 */
import type { MonsterDef } from '../core/content';
import {
  advanceBattle,
  BEAT_MS,
  mapOf,
  roomLocked,
  startBattle,
  type Battle,
  type Fighter,
  type Place,
} from './battle';
import { DUNGEON } from './dungeonMetrics';
import { foeKind } from './foes';
import {
  groundMap,
  isDoorLetter,
  readGround,
  standable,
  type Ground,
  type RoomTile,
} from './ground';
import type { LessonsState } from './lessons';
import {
  battleMods,
  modifiedFighter,
  modifiedHeals,
  modifiedMonsters,
  type RunModifier,
} from './modifiers';
import { advancePlay, startPlay, type Facing, type Play } from './play';
import { cellAt, centreOf, inMap, isSolid, type Cell, type Point, type TileMap } from './tileMap';

/** A tile's side in the dungeons, in art pixels (`dungeonMetrics.ts`). */
const T = DUNGEON.tile;

/** A dungeon as written: each room's rows of characters (see `ground.ts` for the key). */
export interface DungeonPlan {
  readonly id: string;
  /** The room the boat lands in. */
  readonly first: string;
  readonly rooms: Readonly<Record<string, readonly string[]>>;
  /** Who is waiting in each room, by monster id, and where they stand to begin with. */
  readonly foes?: Readonly<Record<string, readonly FoeSpot[]>>;
  /** Where a flier in a room sits between visits; it starts on the first. */
  readonly perches?: Readonly<Record<string, readonly Cell[]>>;
  /** Where help a boss calls comes in. */
  readonly spawns?: Readonly<Record<string, readonly Cell[]>>;
  /** Rooms whose tide is their boss's, not the one the dungeon shares. */
  readonly ownTide?: readonly string[];
  /** Rooms where the tide comes up over a stone floor rather than a beach. */
  readonly stoneTide?: readonly string[];
  /** Each room's name, shown as the hero comes in. */
  readonly titles?: Readonly<Record<string, string>>;
  /**
   * Things lying in a room from the start, picked up as loot that fell is
   * (`PICKUP`): a crate's fish. Food among them can be eaten in the run.
   */
  readonly finds?: Readonly<Record<string, readonly Find[]>>;
  /**
   * The art lane's set its rooms are drawn with (B15: `'tidepool'`); the
   * grotto's when not given.
   */
  readonly theme?: string;
  /**
   * What the dungeon is about, beside the fight: the sea's tide (`tide.ts`:
   * its rooms' sand has heights, `0`-`3`), or light (`light.ts`: its rooms
   * have lanterns on posts, `Q`/`Y`). What changes is read from the rooms'
   * own ground; this says which, so a plan is checked against it.
   */
  readonly mechanic?: 'tide' | 'light';
}

/** Something lying on a room's floor from the start: where, and what is in it. */
export interface Find {
  readonly at: Cell;
  readonly loot: Readonly<Record<string, number>>;
}

/** A monster placed in a room as written, and the wave of cells it waits in (a brig's). */
export interface FoeSpot {
  readonly monster: string;
  readonly at: Cell;
  readonly wave?: number;
}

/** A door in a room: where it is, and the room and door on the other side. */
export interface Door {
  readonly letter: string;
  readonly cell: Cell;
  /** The open tile just inside it, where someone coming through it stands. */
  readonly inside: Cell;
  readonly to: string;
}

export interface Room {
  readonly id: string;
  /** The dungeon it is in (a worker paints it by both ids); absent in a room made by hand. */
  readonly dungeon?: string;
  /** The art lane's set it is drawn with; the grotto's when absent. */
  readonly theme?: string;
  readonly ground: Ground;
  /** The ground at low water, doors open, every cell open: the room as drawn. */
  readonly map: TileMap<RoomTile>;
  /** The same with its doors barred and its cells shut, while something in the room stands. */
  readonly shut: TileMap<RoomTile>;
  readonly doors: readonly Door[];
  /** Where the boat puts you ashore, in the first room. */
  readonly start: Cell | null;
  /** The marked spot that ends the run. */
  readonly end: Cell | null;
  readonly foes: readonly FoeSpot[];
  readonly perches: readonly Point[];
  readonly spawns: readonly Point[];
  readonly title: string | null;
  /**
   * How much of its light it has, 0 to 1: a darker day's (S16 `darker`,
   * `dimOf`) lights lay pools this much as wide. Drawing only; absent is all.
   */
  readonly dim?: number;
  /**
   * Which of its lanterns on posts burn, as it is shown (bit `i` for the
   * ground's lantern `i`): a room whose light is a rule is drawn once for
   * each way its lanterns stand (`litRoom`). Drawing only; absent is as the
   * room is written.
   */
  readonly lit?: number;
}

export interface Dungeon {
  readonly id: string;
  readonly first: string;
  readonly rooms: Readonly<Record<string, Room>>;
  /** What lies in each room from the start, in art pixels. */
  readonly finds?: readonly {
    readonly room: string;
    readonly at: Point;
    readonly loot: Readonly<Record<string, number>>;
  }[];
}

const SIDES: readonly [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

/** Every cell in `rows` holding `ch`. */
function cellsOf(rows: readonly string[], ch: string): Cell[] {
  const cells: Cell[] = [];
  rows.forEach((line, row) => {
    [...line].forEach((c, col) => {
      if (c === ch) cells.push({ col, row });
    });
  });
  return cells;
}

/**
 * Reads a plan into rooms, checking it as it goes: a typo in a room, a door
 * with nowhere to lead or no floor beside it, two starts, someone standing in
 * a wall, are errors here rather than a hero stuck in one.
 */
export function buildDungeon(plan: DungeonPlan): Dungeon {
  const letters = new Map<string, string[]>();
  for (const [id, rows] of Object.entries(plan.rooms)) {
    for (const ch of new Set(rows.join(''))) {
      if (!isDoorLetter(ch)) continue;
      if (cellsOf(rows, ch).length !== 1) throw new Error(`Room ${id} has door ${ch} twice.`);
      letters.set(ch, [...(letters.get(ch) ?? []), id]);
    }
  }
  for (const [ch, rooms] of letters) {
    if (rooms.length !== 2) throw new Error(`Door ${ch} is in ${rooms.length} rooms, not two.`);
  }

  const rooms: Record<string, Room> = {};
  for (const [id, rows] of Object.entries(plan.rooms)) {
    const ground = readGround(
      rows,
      plan.ownTide?.includes(id) ?? false,
      plan.stoneTide?.includes(id) ?? false,
    );
    const map = groundMap(ground, { level: 0, shut: false, released: ground.bars.length });
    const doors: Door[] = [];
    for (const [ch, joined] of letters) {
      const cell = cellsOf(rows, ch)[0];
      if (!cell) continue;
      const inside = SIDES.map(([dc, dr]) => ({ col: cell.col + dc, row: cell.row + dr })).filter(
        (c) => inMap(map, c) && !isSolid(map, c) && map.tiles[c.row]![c.col] !== 'door',
      );
      if (inside.length !== 1) {
        throw new Error(`Door ${ch} in ${id} needs exactly one open tile beside it.`);
      }
      doors.push({ letter: ch, cell, inside: inside[0]!, to: joined.find((r) => r !== id)! });
    }
    const starts = cellsOf(rows, 's');
    const ends = cellsOf(rows, 'x');
    if (starts.length > 1 || ends.length > 1) throw new Error(`Room ${id} has two starts or ends.`);
    const perches = (plan.perches?.[id] ?? []).map((c) => centreOf(c, T));
    const foes = plan.foes?.[id] ?? [];
    for (const foe of foes) {
      if (foeKind(foe.monster).flies) {
        const on = centreOf(foe.at, T);
        if (!perches.some((p) => p.x === on.x && p.y === on.y))
          throw new Error(`A ${foe.monster} in ${id} is not on a perch.`);
        continue;
      }
      const tile = inMap(map, foe.at) ? map.tiles[foe.at.row]![foe.at.col] : undefined;
      if (!standable(tile) || tile === 'door')
        throw new Error(`A ${foe.monster} in ${id} is not standing on floor.`);
    }
    for (const find of plan.finds?.[id] ?? []) {
      const tile = inMap(map, find.at) ? map.tiles[find.at.row]![find.at.col] : undefined;
      if (!standable(tile) || tile === 'door')
        throw new Error(`Something found in ${id} is not lying on floor.`);
    }
    if (plan.mechanic === 'light' && ground.tidal)
      throw new Error(`Room ${id} has a tide in a dungeon of light.`);
    if (plan.mechanic === 'tide' && ground.lamps.length > 0)
      throw new Error(`Room ${id} has lanterns on posts in a dungeon of the tide.`);
    rooms[id] = {
      id,
      dungeon: plan.id,
      ...(plan.theme ? { theme: plan.theme } : {}),
      ground,
      map,
      shut: groundMap(ground, { level: 0, shut: true, released: 0 }),
      doors,
      start: starts[0] ?? null,
      end: ends[0] ?? null,
      foes,
      perches,
      spawns: (plan.spawns?.[id] ?? []).map((c) => centreOf(c, T)),
      title: plan.titles?.[id] ?? null,
    };
  }
  for (const key of ['foes', 'perches', 'spawns', 'titles', 'finds'] as const) {
    for (const room of Object.keys(plan[key] ?? {})) {
      if (!rooms[room]) throw new Error(`${key} are given for ${room}, which is not a room.`);
    }
  }
  if (!rooms[plan.first]?.start) throw new Error(`The first room needs a start.`);
  const finds = Object.entries(plan.finds ?? {}).flatMap(([room, list]) =>
    list.map((f) => ({ room, at: centreOf(f.at, T), loot: f.loot })),
  );
  return { id: plan.id, first: plan.first, rooms, ...(finds.length ? { finds } : {}) };
}

/** The door whose tile `point` is on, if any. */
export function doorAt(room: Room, point: Point): Door | null {
  const cell = cellAt(point, T);
  return room.doors.find((d) => d.cell.col === cell.col && d.cell.row === cell.row) ?? null;
}

/** Whether `point` is on the room's marked spot. */
export function atEnd(room: Room, point: Point): boolean {
  if (!room.end) return false;
  const cell = cellAt(point, T);
  return cell.col === room.end.col && cell.row === room.end.row;
}

/** How long each half of going through a door takes: the screen dims, the next room shows. */
export const DOOR_FADE_MS = 180;

/** Going through a door: to which room and door, and how far along. */
export interface Doorway {
  readonly room: string;
  readonly door: string;
  readonly ms: number;
}

/**
 * How a run ended by itself: the last room cleared (or, in a dungeon with
 * nothing to fight, its end reached), or the hero knocked down. Rowing back
 * early is the player's, and ends it from outside.
 */
export type RunEnding = 'cleared' | 'fell';

/** A run through a dungeon. Not saved; a run lasts as long as the page. */
export interface Run {
  /** Which dungeon. */
  readonly dungeon: string;
  readonly room: string;
  readonly play: Play;
  /** Time spent in the run while it was being played: sideways, not behind the prompt. */
  readonly ms: number;
  readonly doorway: Doorway | null;
  readonly finished: boolean;
  /** How it ended, once it has. */
  readonly ending: RunEnding | null;
  /** The fighting, for a run with someone to fight it; null for a walk through. */
  readonly battle: Battle | null;
  /** Where the dungeon's lessons stand for this run (`lessons.ts`); absent for one with none. */
  readonly lessons?: LessonsState;
  /** The day's modifier, as it was when the boat rowed out (`modifiers.ts`); absent for none. */
  readonly modifier?: RunModifier;
}

/** What a run fights with: the character as they rowed out, the monsters' rows, the dice's seed, and the items the game knows. */
export interface RunSetup {
  readonly fighter: Fighter;
  readonly monsters: Readonly<Record<string, MonsterDef>>;
  readonly seed: number;
  readonly known?: Iterable<string>;
  /** How much each kind of food heals, by item id: food found in the run can be eaten. */
  readonly heals?: Readonly<Record<string, number>>;
  /** The day's modifier, fixed as the boat rows out; none for a plain run. */
  readonly modifier?: RunModifier;
}

export function startRun(dungeon: Dungeon, setup?: RunSetup): Run {
  const room = dungeon.rooms[dungeon.first]!;
  const effects = setup?.modifier?.effects;
  // Each room's lanterns on posts as written (`light.ts`): those rooms only.
  const lamps = Object.fromEntries(
    Object.values(dungeon.rooms)
      .filter((r) => r.ground.lamps.length > 0)
      .map((r) => [r.id, r.ground.lamps.map((l) => l.lit)]),
  );
  const lightRule = Object.keys(lamps).length > 0;
  const fought = setup
    ? startBattle(
        modifiedFighter(setup.fighter, effects),
        modifiedMonsters(setup.monsters, effects),
        Object.values(dungeon.rooms).flatMap((r) =>
          r.foes.map((f) => ({
            room: r.id,
            monster: f.monster,
            at: centreOf(f.at, T),
            ...(f.wave !== undefined ? { wave: f.wave } : {}),
          })),
        ),
        setup.seed,
        {
          ...(setup.known ? { known: setup.known } : {}),
          ...(dungeon.finds ? { finds: dungeon.finds } : {}),
          // Food found heals under the day's modifier too (Short Rations).
          ...(setup.heals ? { heals: modifiedHeals(setup.heals, effects)! } : {}),
          ...(lightRule ? { lamps } : {}),
        },
      )
    : null;
  const mods = battleMods(effects, lightRule);
  const battle = fought && mods ? { ...fought, mods } : fought;
  return {
    ...(setup?.modifier ? { modifier: setup.modifier } : {}),
    dungeon: dungeon.id,
    room: room.id,
    play: startPlay(centreOf(room.start!, T)),
    ms: 0,
    doorway: null,
    finished: false,
    ending: null,
    battle,
  };
}

/** Whether the room the run is in has its doors shut. */
export function runLocked(run: Run): boolean {
  return !!run.battle && roomLocked(run.battle, run.room);
}

/** The room a run is in, as its battle needs it. */
export function placeOf(dungeon: Dungeon, run: Run): Place {
  const room = dungeon.rooms[run.room]!;
  return {
    room: room.id,
    ground: room.ground,
    last: room.end !== null,
    perches: room.perches,
    spawns: room.spawns,
  };
}

/** The ground the run's room has under it now: tide, doors and cells as they are. */
export function groundNow(dungeon: Dungeon, run: Run): TileMap<RoomTile> {
  const room = dungeon.rooms[run.room]!;
  if (!run.battle) return room.map;
  return mapOf(run.battle, placeOf(dungeon, run));
}

/** Which way someone faces coming in through `door`: away from it. */
function facingIn(door: Door, was: Facing): Facing {
  if (door.inside.col > door.cell.col) return 'right';
  if (door.inside.col < door.cell.col) return 'left';
  return was;
}

/**
 * A run after `ms` of play, with the walker going where `play` has him going:
 * he walks, and whatever is in the room fights him (`advanceBattle`).
 * Stepping onto a door stops him and starts the way through; halfway through,
 * the next room is there with him at the matching door, facing in. Doors are
 * shut while something in the room stands. Clearing the last room ends the
 * run a moment after the last blow, as does falling; in a room with nothing
 * to fight, reaching the marked spot ends it. The clock stops when it ends.
 */
export function advanceRun(dungeon: Dungeon, run: Run, play: Play, ms: number): Run {
  if (run.finished) return run;
  const elapsed = run.ms + ms;
  if (run.doorway) {
    // Between rooms nobody walks.
    play = { ...run.play, walker: { ...run.play.walker, path: [] } };
    const along = run.doorway.ms + ms;
    if (along >= 2 * DOOR_FADE_MS) return { ...run, play, ms: elapsed, doorway: null };
    if (run.doorway.ms < DOOR_FADE_MS && along >= DOOR_FADE_MS) {
      const next = dungeon.rooms[run.doorway.room]!;
      const door = next.doors.find((d) => d.letter === run.doorway!.door)!;
      return {
        ...run,
        room: next.id,
        play: { ...startPlay(centreOf(door.inside, T)), facing: facingIn(door, play.facing) },
        ms: elapsed,
        doorway: { ...run.doorway, ms: along },
      };
    }
    return { ...run, play, ms: elapsed, doorway: { ...run.doorway, ms: along } };
  }
  const room = dungeon.rooms[run.room]!;
  let battle = run.battle;
  if (battle) {
    const fought = advanceBattle(battle, placeOf(dungeon, run), play, ms);
    battle = fought.battle;
    play = fought.play;
    const over = battle.over;
    if (over) {
      const done = battle.clock >= over.at + BEAT_MS;
      return { ...run, play, ms: elapsed, battle, finished: done, ending: done ? over.why : null };
    }
  } else {
    play = advancePlay({ map: room.map, things: [] }, play, ms);
  }
  run = { ...run, battle };
  if (atEnd(room, play.walker.at) && !runLocked(run))
    return { ...run, play, ms: elapsed, finished: true, ending: 'cleared' };
  const door = doorAt(room, play.walker.at);
  if (door && !runLocked(run)) {
    return {
      ...run,
      play: { ...play, walker: { ...play.walker, path: [] } },
      ms: elapsed,
      doorway: { room: door.to, door: door.letter, ms: 0 },
    };
  }
  return { ...run, play, ms: elapsed };
}

/** How dark the screen is going through a door: 0 not at all, 1 black. */
export function doorwayDark(doorway: Doorway | null): number {
  if (!doorway) return 0;
  const t = doorway.ms / DOOR_FADE_MS;
  return Math.max(0, Math.min(1, t <= 1 ? t : 2 - t));
}

/** A run's time as the results screen gives it: minutes and seconds, `1:05`. */
export function runTime(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The run can be played only on a screen wider than it is tall: a phone on its side. */
export function sideways(size: { readonly width: number; readonly height: number }): boolean {
  return size.width > size.height;
}
