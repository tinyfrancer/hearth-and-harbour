/*
 * A run in progress as plain data and back, for a save to keep it through a
 * reload (lane A's design, "A run that survives a reload", in
 * docs/status/lane-a.md). Pure functions only: where it is kept, when it is
 * handed over and what a reload does with it are lane A's, with the save's
 * version.
 *
 * A `Run` is already plain data (rooms by id, points, numbers, the battle's
 * dice as the number they have reached), except that a few numbers are
 * infinite (a foe never struck, a bird in flight) and JSON cannot hold them;
 * here they are written as `{ "$n": "-Infinity" }` and read back. What comes
 * back rolls exactly what the unbroken run would have: restoring and going
 * on equals going on (`tests/scene/runSave.test.ts`).
 *
 * `scene` is this snapshot's own version: a change to the shape of a run
 * bumps it, and a snapshot of another version is not restored (the save
 * settles its spoils instead), so the scene's shapes can change without a
 * save migration.
 */
import type { RunSpoils } from '../core/run';
import { spoilsOf } from './battle';
import type { Run } from './dungeon';

/** The version of the shape a snapshot is in. */
export const RUN_SCENE_VERSION = 1;

/** A JSON value. */
export type Plain = null | boolean | number | string | Plain[] | { [key: string]: Plain };

/** What a save keeps of a run under way: lane A's `SavedRun`, as the design names it. */
export interface SavedRun {
  readonly dungeon: string;
  /** `RUN_SCENE_VERSION` when it was taken. */
  readonly scene: number;
  /** What the run has picked up so far, in the shape `settleRun` takes: never lost, whatever `data` is. */
  readonly spoils: RunSpoils;
  /** The run itself, opaque to the save. */
  readonly data: Plain;
}

/** A number JSON cannot hold, written as an object no run ever holds. */
const NUMBER = '$n';

function encode(value: unknown): Plain | undefined {
  if (value === null) return null;
  switch (typeof value) {
    case 'number':
      return Number.isFinite(value) ? value : { [NUMBER]: String(value) };
    case 'string':
    case 'boolean':
      return value;
    case 'undefined':
      return undefined;
    case 'object': {
      if (Array.isArray(value)) return value.map((v) => encode(v) ?? null);
      const out: { [key: string]: Plain } = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const e = encode(v);
        if (e !== undefined) out[k] = e;
      }
      return out;
    }
    default:
      throw new Error(`A run holds something that is not data: ${typeof value}.`);
  }
}

function decode(value: Plain): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(decode);
  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === NUMBER) {
    const n = value[NUMBER];
    if (n === 'Infinity') return Infinity;
    if (n === '-Infinity') return -Infinity;
    if (n === 'NaN') return NaN;
    throw new Error('Not a number this writes.');
  }
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = decode(value[k]!);
  return out;
}

/** A run as plain data: what `JSON.stringify` keeps whole, and `restoreRun` reads back. */
export function snapshotRun(run: Run): Plain {
  return encode(run) ?? null;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isPoint = (v: unknown): boolean =>
  isObject(v) && Number.isFinite(v.x) && Number.isFinite(v.y);

/**
 * A run read back from `snapshotRun`'s data (after JSON or not), or null if
 * it is not one this version can take up: another `scene` version, or
 * anything missing or of the wrong kind where a run must have it.
 */
export function restoreRun(data: unknown, scene = RUN_SCENE_VERSION): Run | null {
  if (scene !== RUN_SCENE_VERSION) return null;
  let run: unknown;
  try {
    run = decode(data as Plain);
  } catch {
    return null;
  }
  if (!isObject(run)) return null;
  if (typeof run.dungeon !== 'string' || typeof run.room !== 'string') return null;
  if (!Number.isFinite(run.ms) || typeof run.finished !== 'boolean') return null;
  const play = run.play;
  if (!isObject(play) || !isObject(play.walker) || !isPoint(play.walker.at)) return null;
  if (!Array.isArray(play.walker.path) || !play.walker.path.every(isPoint)) return null;
  if (play.facing !== 'left' && play.facing !== 'right') return null;
  if (!isObject(play.visits)) return null;
  if (run.doorway !== null && !isObject(run.doorway)) return null;
  const battle = run.battle;
  if (battle !== null) {
    if (!isObject(battle)) return null;
    if (!Number.isFinite(battle.seed) || !Number.isFinite(battle.clock)) return null;
    if (!Number.isFinite(battle.hp) || !isObject(battle.fighter) || !isObject(battle.monsters))
      return null;
    if (!Array.isArray(battle.foes) || !battle.foes.every((f) => isObject(f) && isPoint(f.at)))
      return null;
    if (!Array.isArray(battle.piles) || !Array.isArray(battle.effects)) return null;
    if (!isObject(battle.tally) || !isObject(battle.ready)) return null;
  }
  return run as unknown as Run;
}

/** A run under way as a save would keep it (`SavedRun`): its dungeon, this version, its spoils so far, itself. */
export function savedRunOf(run: Run): SavedRun {
  const spoils: RunSpoils = run.battle
    ? spoilsOf(run.battle)
    : { xp: {}, loot: {}, coins: 0, foodEaten: 0, arrowsUsed: 0 };
  return { dungeon: run.dungeon, scene: RUN_SCENE_VERSION, spoils, data: snapshotRun(run) };
}
