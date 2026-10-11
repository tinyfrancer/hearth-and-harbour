import { describe, expect, it } from 'vitest';
import { settleRun } from '../../src/core/run';
import { CONTENT } from '../../src/data';
import { spoilsOf } from '../../src/scene/battle';
import { TIDEPOOL_ID } from '../../src/scene/tidepool';
import { LESSONS, novice, playCave, type CaveOutcome } from './caveBot';

// The Tidepool Cave's balance, held by playing it as a brand-new character
// would (`caveBot.ts`): level 1, the linen a first hour of Crafting makes, no
// weapon, nothing to eat brought; doing what each lesson says, a little slowly
// (0.6 s to notice anything, 1.2 s to read a lesson). The seeds are fixed, so
// the result is the same every time; a change to the cave's rooms or its
// cast's numbers that breaks one is a decision, not a fix-the-test.

const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919);
const REACT_MS = 600;
const median = (xs: readonly number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

let bracing: CaveOutcome[] | null = null;
const braced = (): CaveOutcome[] =>
  (bracing ??= SEEDS.map((seed) => playCave(novice(), seed, { reactMs: REACT_MS, brace: true })));

describe('the Tidepool Cave, played by a new player', () => {
  it('is cleared on nearly every seed, in two to three minutes', () => {
    const runs = braced();
    const clears = runs.filter((r) => r.cleared);
    expect(clears.length).toBeGreaterThanOrEqual(SEEDS.length - 1);
    const minutes = median(clears.map((r) => r.ms)) / 60_000;
    expect(minutes).toBeGreaterThanOrEqual(2);
    expect(minutes).toBeLessThanOrEqual(3);
    for (const r of clears) expect(r.ms / 60_000).toBeLessThan(3.5);
    // The lessons cost a few seconds of reading on top, never a long wait.
    for (const r of clears) expect(r.pageMs - r.ms).toBeLessThan(15_000);
  }, 60_000);

  it('is usually survived by a player who never braces', () => {
    const runs = SEEDS.map((seed) => playCave(novice(), seed, { reactMs: REACT_MS, brace: false }));
    expect(runs.filter((r) => r.cleared).length).toBeGreaterThanOrEqual(SEEDS.length - 2);
    expect(runs.every((r) => r.braced === 0)).toBe(true);
  }, 60_000);

  it('shows every lesson once, in the order they are written, on nearly every seed', () => {
    const order = LESSONS.map((l) => l.id);
    const runs = braced();
    for (const r of runs) expect(new Set(r.shown).size).toBe(r.shown.length);
    const inOrder = runs.filter((r) => r.shown.join(',') === order.join(','));
    expect(inOrder.length).toBeGreaterThanOrEqual(SEEDS.length - 1);
  }, 60_000);

  it('brings a clear home: the cave cleared, its kills and what was picked up, less the fish eaten', () => {
    const clear = braced().find((r) => r.cleared)!;
    const battle = clear.run.battle!;
    const spoils = spoilsOf(battle, TIDEPOOL_ID);
    expect(spoils.cleared).toBe(TIDEPOOL_ID);
    expect(spoils.kills).toMatchObject({ dock_rat: 4, sand_crab: 1, old_snapper: 1 });
    // The crate's fish were eaten from what was picked up, never from a food slot he did not have.
    expect(spoils.foodEaten).toBe(0);
    const ate = battle.tally.ateFound?.cooked_shrimp ?? 0;
    expect(ate).toBeGreaterThan(0);
    expect(spoils.loot?.cooked_shrimp ?? 0).toBe(4 - ate);
    const home = settleRun(novice(), spoils, CONTENT);
    expect(home.food).toBeNull();
  }, 60_000);
});
