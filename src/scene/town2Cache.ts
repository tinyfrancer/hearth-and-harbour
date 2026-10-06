/*
 * The finished town kept between visits, so a second visit shows it at once
 * rather than working it out again (about two seconds of a worker's time).
 *
 * Kept per time of day, under the version of the code that made it: the
 * worker's own address, which the build names by a hash of everything in it
 * (the art lane's drawing and this lane's town alike), so a new deploy that
 * changes a pixel changes the version and the kept town is never shown; it
 * is worked out afresh and kept again over the old one. The development
 * server's addresses are not hashed, so nothing is kept there.
 *
 * It fails safe: anything kept that cannot be read, is from another version,
 * does not fit the town as it is, or a shelf that throws, and the town is
 * worked out as if nothing were kept. Keeping is done after the town has
 * been sent, so a cold visit is never slower for it, and a shelf that will
 * not take it costs nothing but the next visit's time. Nothing here touches
 * the game's save: the town is kept in a database of its own.
 *
 * The rules are here, pure, with the shelf and the way pictures are packed
 * passed in; `town2Shelf.ts` has the browser's (IndexedDB, PNG).
 */
import { TOWN2_H, TOWN2_W } from '../art/town2/town';
import type { TimeOfDay } from './daylight';
import { TOWNSFOLK2_AT } from './town2';
import type { Raw, TownFacts, TownPaint } from './town2Facts';

/** The shape of what is kept. A change to it is a new number, and older keeps are not read. */
export const KEPT_FORMAT = 1;

/** Somewhere to keep a town by its time of day. Either may throw or reject. */
export interface Shelf {
  get(time: TimeOfDay): Promise<unknown>;
  put(time: TimeOfDay, kept: Kept<unknown>): Promise<void>;
}

/** How a painted town is packed to keep (`P`) and unpacked to show (`I`, bitmaps in a browser). */
export interface Packer<P, I> {
  pack(paint: TownPaint<Raw>): Promise<P>;
  /** Throws on anything it cannot read. */
  unpack(packed: P): Promise<TownPaint<I>>;
}

/** One time of day's town as kept. */
export interface Kept<P> {
  readonly format: number;
  readonly version: string;
  readonly time: TimeOfDay;
  readonly facts: TownFacts;
  readonly packed: P;
}

/** The version a worker's code keeps towns under: its own hashed address, or null where it has none. */
export function versionOf(workerUrl: string, dev: boolean): string | null {
  if (dev) return null;
  // A build names its files `name-hash.js`; anything else is not a version to trust.
  return /-[\w-]{6,}\.js(?:$|\?)/.test(workerUrl) ? workerUrl : null;
}

const isKept = (x: unknown, time: TimeOfDay, version: string): x is Kept<unknown> => {
  if (typeof x !== 'object' || x === null) return false;
  const k = x as Partial<Kept<unknown>>;
  return (
    k.format === KEPT_FORMAT &&
    k.version === version &&
    k.time === time &&
    typeof k.facts === 'object' &&
    k.facts !== null &&
    Array.isArray(k.facts.lights) &&
    Array.isArray(k.facts.smoke) &&
    Array.isArray(k.facts.scene?.things) &&
    k.packed !== undefined
  );
};

/** Whether an unpacked town fits the town as this code has it. */
export function fits<I>(paint: TownPaint<I>, facts: TownFacts, time: TimeOfDay): boolean {
  return (
    paint.time === time &&
    paint.cells instanceof Int16Array &&
    paint.cells.length === TOWN2_W * TOWN2_H &&
    paint.folk.length === TOWNSFOLK2_AT.length &&
    paint.smoke.length === facts.smoke.length &&
    paint.standing.every((s) => s.piece >= 0 && s.piece < paint.pieces.length) &&
    !!paint.still
  );
}

/** The town kept for this time of day and version, or null for anything less than sound. */
export async function recall<P, I>(
  shelf: Shelf,
  packer: Packer<P, I>,
  time: TimeOfDay,
  version: string,
): Promise<{ facts: TownFacts; paint: TownPaint<I> } | null> {
  try {
    const kept = await shelf.get(time);
    if (!isKept(kept, time, version)) return null;
    const paint = await packer.unpack(kept.packed as P);
    return fits(paint, kept.facts, time) ? { facts: kept.facts, paint } : null;
  } catch {
    return null;
  }
}

/** Keeps a town for next time; false if it could not be kept, which is never an error. */
export async function keep<P, I>(
  shelf: Shelf,
  packer: Packer<P, I>,
  time: TimeOfDay,
  version: string,
  facts: TownFacts,
  paint: TownPaint<Raw>,
): Promise<boolean> {
  try {
    const packed = await packer.pack(paint);
    await shelf.put(time, { format: KEPT_FORMAT, version, time, facts, packed });
    return true;
  } catch {
    return false;
  }
}
