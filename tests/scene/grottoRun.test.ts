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

  it('is not made easy by bracing every heavy blow: quicker when it clears, but it clears less', () => {
    // Wave 17: Brace is answered (`BRACE_REEL_MS`): the foe reels and his swing comes at once.
    // A player who braces every heavy blow he can, and walks out of the cannon's lines, takes
    // half of each blow instead of none of it, and the captain's blows are big: measured on
    // these seeds, 4 clears of 12 (the careful player: 10), the median clear 7.2 minutes (8.3),
    // heavy blows costing 117 hit points a run on average (7). At half strength, none.
    const careful = preparedRuns();
    const braced = SEEDS.map((seed) =>
      playThrough(prepared(), seed, { reactMs: REACT_MS, brace: true }),
    );
    const clears = braced.filter((r) => r.cleared);
    expect(clears.length).toBeGreaterThanOrEqual(1);
    expect(clears.length).toBeLessThanOrEqual(Math.ceil(SEEDS.length * 0.6));
    expect(clears.length).toBeLessThan(careful.filter((r) => r.cleared).length);
    for (const r of clears) expect(minutes(r.ms)).toBeGreaterThanOrEqual(6);
    expect(minutes(median(clears.map((r) => r.ms)))).toBeLessThanOrEqual(
      minutes(median(careful.filter((r) => r.cleared).map((r) => r.ms))),
    );
    const heavy = (runs: readonly Outcome[]): number =>
      runs.reduce((n, r) => n + (r.hurt.heavy ?? 0), 0) / runs.length;
    expect(heavy(braced)).toBeGreaterThan(5 * heavy(careful));
    const weak = SEEDS.map((seed) =>
      playThrough(halfStrength(), seed, { reactMs: REACT_MS, brace: true }),
    );
    expect(weak.filter((r) => r.cleared)).toHaveLength(0);
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
