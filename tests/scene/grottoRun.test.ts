import { describe, expect, it } from 'vitest';
import { settleRun } from '../../src/core/run';
import { CONTENT } from '../../src/data';
import { spoilsOf } from '../../src/scene/battle';
import { GROTTO_ID } from '../../src/scene/cast';
import { halfStrength, playThrough, prepared, type Outcome } from './grottoBot';

// The grotto's balance, held by playing it. A scripted hero (`grottoBot.ts`)
// plays it through as a careful player would, a little slow to react (0.4 s
// to notice anything new), and never using an ability. These seeds are
// fixed, so the result is the same every time; a change to the cast's
// numbers or the rooms that breaks one is a decision, not a fix-the-test.

const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919);
const REACT_MS = 400;
const minutes = (ms: number): number => ms / 60_000;
const median = (xs: readonly number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

let tier1: Outcome[] | null = null;
const preparedRuns = (): Outcome[] =>
  (tier1 ??= SEEDS.map((seed) => playThrough(prepared(), seed, { reactMs: REACT_MS })));

describe('Brinebeard’s Grotto, played through', () => {
  it('is cleared by a character at the end of tier 1, in seven to ten minutes, on most seeds', () => {
    const runs = preparedRuns();
    const clears = runs.filter((r) => r.cleared);
    expect(clears.length).toBeGreaterThanOrEqual(Math.ceil(SEEDS.length * 0.75));
    const time = median(clears.map((r) => r.ms));
    expect(minutes(time)).toBeGreaterThanOrEqual(7);
    expect(minutes(time)).toBeLessThanOrEqual(10);
    for (const r of clears) expect(minutes(r.ms)).toBeLessThan(11);
    // Where a prepared run fails, it fails at the captain, not on the way.
    for (const r of runs.filter((r) => !r.cleared)) expect(r.room).toBe('cove');
    // The captain takes two or three minutes of it.
    expect(median(clears.map((r) => r.rooms.cove!)) / 1000).toBeGreaterThanOrEqual(110);
    expect(median(clears.map((r) => r.rooms.cove!)) / 1000).toBeLessThanOrEqual(200);
  }, 120_000);

  it('sends a character at half that strength home wet', () => {
    const runs = SEEDS.map((seed) => playThrough(halfStrength(), seed, { reactMs: REACT_MS }));
    expect(runs.filter((r) => r.cleared)).toHaveLength(0);
    // ...and not at the door: it gets some way in first.
    expect(runs.every((r) => r.kills >= 3)).toBe(true);
  }, 120_000);

  it('brings a clear home: kills by monster, the dungeon cleared, and its loot paid into the bank', () => {
    const clear = preparedRuns().find((r) => r.cleared)!;
    const battle = clear.run.battle!;
    const spoils = spoilsOf(battle, GROTTO_ID);
    expect(spoils.cleared).toBe('brinebeards_grotto');
    expect(spoils.kills).toMatchObject({ giant_crab: 2, brinebeard: 1, ships_parrot: 1 });
    expect(Object.values(spoils.kills!).reduce((a, b) => a + b, 0)).toBe(battle.tally.kills);
    // Only loot the game knows is ever picked up; all of it goes into the bank.
    const state = prepared();
    const home = settleRun(state, spoils);
    for (const [item, qty] of Object.entries(spoils.loot ?? {})) {
      expect(CONTENT.items[item], item).toBeDefined();
      expect(home.bank[item]).toBe((state.bank[item] ?? 0) + qty);
    }
    expect(home.food?.qty ?? 0).toBe(20 - battle.tally.eaten);
    // The grotto's own loot, now the tables know it: every one of the cast drops doubloons.
    expect(home.bank.doubloon).toBeGreaterThanOrEqual(battle.tally.kills);
  }, 120_000);
});
