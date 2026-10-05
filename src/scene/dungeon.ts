/*
 * A dungeon as data and rules: rooms that are tile maps, doors that join
 * them, and a run through them from the boat to the marked spot at the end.
 * The rules are pure (a run is a value, and time and the walker's feet move
 * it on), so they are tested without a canvas; `dungeonView.ts` shows them.
 */
import { grid, rect, ellipse, type Grid } from '../art/grid';
import type { Shade } from '../art/palette';
import { picture, type Picture } from '../art/raster';
import {
  advanceBattle,
  BEAT_MS,
  roomLocked,
  startBattle,
  type Battle,
  type Fighter,
  type Place,
} from './battle';
import type { MonsterDef } from '../core/content';
import { advancePlay, startPlay, type Facing, type Play } from './play';
import type { Scene } from './things';
import {
  TILE,
  cellAt,
  centreOf,
  inMap,
  isSolid,
  parseMap,
  type Cell,
  type Point,
  type TileKind,
  type TileMap,
} from './tileMap';
import { SHADOW_MIDDLE, walkerShadow } from './townArt';

/** A dungeon as written: each room's rows of characters (see `grotto.ts` for the key). */
export interface DungeonPlan {
  readonly id: string;
  /** The room the boat lands in. */
  readonly first: string;
  readonly rooms: Readonly<Record<string, readonly string[]>>;
  /** Who is waiting in each room, by monster id, and where they stand to begin with. */
  readonly foes?: Readonly<Record<string, readonly FoeSpot[]>>;
}

/** A monster placed in a room as written. */
export interface FoeSpot {
  readonly monster: string;
  readonly at: Cell;
}

export type RoomTile = 'rock' | 'floor' | 'water' | 'door' | 'end';

export const ROOM_KINDS: Readonly<Record<RoomTile, TileKind>> = {
  rock: { solid: true },
  floor: { solid: false },
  water: { solid: true },
  // A door is walked into: stepping onto it takes you through.
  door: { solid: false },
  end: { solid: false },
};

/** A room's tiles while it is being fought in: the doors are barred. */
const SHUT_KINDS: Readonly<Record<RoomTile, TileKind>> = { ...ROOM_KINDS, door: { solid: true } };

const KEY: Readonly<Record<string, RoomTile>> = {
  '#': 'rock',
  '.': 'floor',
  '~': 'water',
  s: 'floor',
  x: 'end',
};

const DOOR_LETTER = /^[a-z]$/;

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
  readonly map: TileMap<RoomTile>;
  readonly doors: readonly Door[];
  /** Where the boat puts you ashore, in the first room. */
  readonly start: Cell | null;
  /** The marked spot that ends the run. */
  readonly end: Cell | null;
  /** The same ground with its doors shut, while something in the room still stands. */
  readonly shut: TileMap<RoomTile>;
  readonly foes: readonly FoeSpot[];
}

export interface Dungeon {
  readonly id: string;
  readonly first: string;
  readonly rooms: Readonly<Record<string, Room>>;
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
 * with nowhere to lead or no floor beside it, two starts, are errors here
 * rather than a hero stuck in a wall.
 */
export function buildDungeon(plan: DungeonPlan): Dungeon {
  const letters = new Map<string, string[]>();
  for (const [id, rows] of Object.entries(plan.rooms)) {
    for (const ch of new Set(rows.join(''))) {
      if (!DOOR_LETTER.test(ch) || ch in KEY) continue;
      if (cellsOf(rows, ch).length !== 1) throw new Error(`Room ${id} has door ${ch} twice.`);
      letters.set(ch, [...(letters.get(ch) ?? []), id]);
    }
  }
  for (const [ch, rooms] of letters) {
    if (rooms.length !== 2) throw new Error(`Door ${ch} is in ${rooms.length} rooms, not two.`);
  }

  const rooms: Record<string, Room> = {};
  for (const [id, rows] of Object.entries(plan.rooms)) {
    const key: Record<string, RoomTile> = { ...KEY };
    for (const ch of letters.keys()) key[ch] = 'door';
    const map = parseMap(rows, key, ROOM_KINDS);
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
    const foes = plan.foes?.[id] ?? [];
    for (const foe of foes) {
      const tile = inMap(map, foe.at) ? map.tiles[foe.at.row]![foe.at.col] : null;
      if (tile !== 'floor') throw new Error(`A ${foe.monster} in ${id} is not standing on floor.`);
    }
    rooms[id] = {
      id,
      map,
      doors,
      start: starts[0] ?? null,
      end: ends[0] ?? null,
      shut: { ...map, kinds: SHUT_KINDS },
      foes,
    };
  }
  for (const room of Object.keys(plan.foes ?? {})) {
    if (!rooms[room]) throw new Error(`Foes are placed in ${room}, which is not a room.`);
  }
  if (!rooms[plan.first]?.start) throw new Error(`The first room needs a start.`);
  return { id: plan.id, first: plan.first, rooms };
}

/** The door whose tile `point` is on, if any. */
export function doorAt(room: Room, point: Point): Door | null {
  const cell = cellAt(point);
  return room.doors.find((d) => d.cell.col === cell.col && d.cell.row === cell.row) ?? null;
}

/** Whether `point` is on the room's marked spot. */
export function atEnd(room: Room, point: Point): boolean {
  if (!room.end) return false;
  const cell = cellAt(point);
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
 * How a run ended: the last room cleared (or, in a dungeon with nothing to
 * fight, its end reached), the hero knocked down, or the player rowing back.
 */
export type RunEnding = 'cleared' | 'fell' | 'left';

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
}

/** What a run fights with: the character as they rowed out, the monsters' rows, and the dice's seed. */
export interface RunSetup {
  readonly fighter: Fighter;
  readonly monsters: Readonly<Record<string, MonsterDef>>;
  readonly seed: number;
}

export function startRun(dungeon: Dungeon, setup?: RunSetup): Run {
  const room = dungeon.rooms[dungeon.first]!;
  const battle = setup
    ? startBattle(
        setup.fighter,
        setup.monsters,
        Object.values(dungeon.rooms).flatMap((r) =>
          r.foes.map((f) => ({ room: r.id, monster: f.monster, at: centreOf(f.at) })),
        ),
        setup.seed,
      )
    : null;
  return {
    dungeon: dungeon.id,
    room: room.id,
    play: startPlay(centreOf(room.start!)),
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
  return { room: room.id, map: runLocked(run) ? room.shut : room.map, last: room.end !== null };
}

/** A run ended by the player rowing back: nothing more happens in it. */
export function leaveRun(run: Run): Run {
  return run.finished ? run : { ...run, finished: true, ending: 'left' };
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
        play: { ...startPlay(centreOf(door.inside)), facing: facingIn(door, play.facing) },
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
  if (door) {
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

/* ----- How a room looks, grey-boxed ----- */

/** The flat placeholder colours of each kind of tile, until the dungeon's tiles are drawn. */
const FILL: Readonly<Record<RoomTile, Shade>> = {
  rock: 'slate3',
  floor: 'sand2',
  water: 'sea2',
  door: 'navy2',
  end: 'sand2',
};

/** Rows of rock face shown where rock stands above floor, so walls read as walls. */
const FACE = 5;

/**
 * A room's ground, in flat colours: rock with a lighter face where it meets
 * the floor below, water, floor, doors as dark openings with posts, and the
 * marked spot as a gold ring.
 */
export function paintRoom(room: Room): Grid {
  const { map } = room;
  const g = grid(map.cols * TILE, map.rows * TILE);
  const kind = (col: number, row: number): RoomTile | null =>
    inMap(map, { col, row }) ? map.tiles[row]![col]! : null;
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const k = kind(col, row)!;
      const x = col * TILE;
      const y = row * TILE;
      rect(g, x, y, TILE, TILE, FILL[k]);
      const below = kind(col, row + 1);
      if (k === 'rock' && below && below !== 'rock')
        rect(g, x, y + TILE - FACE, TILE, FACE, 'slate2');
      if (k === 'water' && kind(col, row - 1) !== 'water') rect(g, x, y, TILE, 1, 'foam1');
      if (k === 'door') {
        rect(g, x, y, 2, TILE, 'wood2');
        rect(g, x + TILE - 2, y, 2, TILE, 'wood3');
      }
    }
  }
  if (room.end) {
    const { x, y } = centreOf(room.end);
    ellipse(g, x, y, 7, 4, 'gold2');
    ellipse(g, x, y, 5, 2.5, 'gold1');
    ellipse(g, x, y, 3, 1.5, 'sand2');
  }
  return g;
}

/** The step a walker's shadow is drawn in on each kind of ground; none on water or in a doorway. */
const SHADOW_ON: Partial<Record<RoomTile, Shade>> = { floor: 'sand3', end: 'sand3' };

export interface RoomArt {
  readonly ground: Picture;
  shadowAt(feet: Point): { readonly picture: Picture; readonly middle: Point } | null;
}

/** Whether a room's doors are shut, set by whoever shows it; its scene's ground follows. */
export interface RoomLock {
  shut: boolean;
}

const rooms = new WeakMap<Room, { scene: Scene; art: RoomArt; lock: RoomLock }>();

/**
 * A room as the stage needs it: its scene (nothing standing in it; what
 * fights is drawn by the run), its ground, and the lock that says whether its
 * doors can be walked into. Made once a page, so going back through a door
 * finds the room already painted.
 */
export function roomScene(room: Room): { scene: Scene; art: RoomArt; lock: RoomLock } {
  let made = rooms.get(room);
  if (made) return made;
  const shadow = walkerShadow('sand3');
  const lock: RoomLock = { shut: false };
  made = {
    lock,
    scene: {
      get map() {
        return lock.shut ? room.shut : room.map;
      },
      things: [],
    },
    art: {
      ground: picture(paintRoom(room)),
      shadowAt(feet) {
        const cell = cellAt(feet);
        if (!inMap(room.map, cell)) return null;
        return SHADOW_ON[room.map.tiles[cell.row]![cell.col]!]
          ? { picture: shadow, middle: SHADOW_MIDDLE }
          : null;
      },
    },
  };
  rooms.set(room, made);
  return made;
}
