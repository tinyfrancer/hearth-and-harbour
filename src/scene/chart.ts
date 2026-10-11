/*
 * The harbour chart as data: every dungeon on the tables, in its order, at
 * its landing on lane B's map, with where the character stands with it
 * (lane A's `dungeonStatus`), and the route the rowboat takes there. Pure,
 * so the chart's rules are tested without a screen; `chartPanel.ts` shows it.
 */
import { combatLevel } from '../core/bounty';
import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import { dungeonScene } from './dungeons';
import { chartRow, dungeonsInOrder, dungeonStatus, mayEnter, type DungeonState } from './fromLaneA';
import type { HarbourChart } from './fromLaneB';
import type { Point } from './tileMap';

/** A landing on the chart, as the panel shows it. */
export interface Landing {
  readonly id: string;
  readonly state: DungeonState;
  /** Its name; null for a landing to come (a silhouette). */
  readonly name: string | null;
  readonly description: string | null;
  readonly recommended: number;
  /** What unlocks it, in a line. */
  readonly unlock: string;
  readonly clears: number;
  readonly bestMs?: number;
  /** Where it is on the map, in map pixels. */
  readonly at: Point;
  /** Whether the boat will row there now: open or cleared, and a dungeon this scene can play. */
  readonly rowable: boolean;
}

/**
 * Every landing on the chart for this character, in the tables' order, each
 * at its place on the map: a dungeon's own landing by its id, a landing to
 * come at the map's next spare one (`unknown_1`, `unknown_2`…). A dungeon
 * the map has no place for is left off.
 */
export function landings(state: GameState, content: Content, map: HarbourChart): Landing[] {
  const spare = Object.keys(map.landings).filter((id) => id.startsWith('unknown_'));
  const out: Landing[] = [];
  for (const row of dungeonsInOrder(content)) {
    const status = dungeonStatus(state, row.id, content);
    if (!status) continue;
    const at = map.landings[row.id] ?? (status.state === 'soon' ? spare.shift() : undefined);
    const place = typeof at === 'string' ? map.landings[at] : at;
    if (!place) continue;
    const soon = status.state === 'soon';
    out.push({
      id: row.id,
      state: status.state,
      name: soon ? null : (chartRow(content, row.id)?.name ?? row.name),
      description: soon ? null : row.description,
      recommended: status.recommended,
      unlock: status.unlock,
      clears: status.clears,
      ...(status.bestMs !== undefined ? { bestMs: status.bestMs } : {}),
      at: place,
      rowable: mayEnter(state, row.id, content) && dungeonScene(row.id) !== null,
    });
  }
  return out;
}

/**
 * Which landing the chart opens on: the first open one never cleared (where
 * a player should go next), else the last one rowable, else the first.
 */
export function firstPick(list: readonly Landing[]): string | null {
  return (
    list.find((l) => l.state === 'open' && l.rowable)?.id ??
    [...list].reverse().find((l) => l.rowable)?.id ??
    list[0]?.id ??
    null
  );
}

/** How far under a landing's recommended level a character may be before the chart says so plainly. */
export const UNDER_BY = 5;

/** The plain warning for a character well under a landing's level, or null. */
export function levelWarning(state: GameState, landing: Landing): string | null {
  const level = combatLevel(state);
  if (landing.state === 'soon' || level + UNDER_BY > landing.recommended) return null;
  return `Well under that: ${landing.recommended - level} levels short. Expect to be sent home wet.`;
}

/** What to bring, in a line, for a landing. */
export function whatToBring(state: GameState, landing: Landing): string {
  if (landing.recommended <= 1)
    return 'Nothing but yourself: there are fish to find in the cave.';
  const food = state.food ? '' : ' You have no food in your food slot.';
  return `Armour, a weapon, and a good stack of cooked fish in your food slot.${food}`;
}

/** How long the dotted route takes to draw itself out to a landing, in ms. */
export const ROUTE_MS = 1400;

/**
 * The route from home to a landing: a gentle curve (out from the harbour,
 * round towards it), as points every few map pixels. The same every time.
 */
export function routeTo(home: Point, to: Point): Point[] {
  const mid = { x: (home.x + to.x) / 2, y: (home.y + to.y) / 2 };
  const dx = to.x - home.x;
  const dy = to.y - home.y;
  const length = Math.hypot(dx, dy) || 1;
  // Bowed to seaward (right of the way out) by a fifth of its length.
  const bow = { x: mid.x - (dy / length) * length * 0.2, y: mid.y + (dx / length) * length * 0.2 };
  const steps = Math.max(2, Math.round(length / 3));
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    points.push({
      x: a * home.x + b * bow.x + c * to.x,
      y: a * home.y + b * bow.y + c * to.y,
    });
  }
  return points;
}

/** How much of the route shows `ms` after a landing was picked, 0 to 1. */
export function routeShown(ms: number): number {
  return Math.max(0, Math.min(1, ms / ROUTE_MS));
}
