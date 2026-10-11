import { describe, expect, it } from 'vitest';
import { settleRun } from '../../src/core/run';
import { CONTENT } from '../../src/data';
import { spoilsOf } from '../../src/scene/battle';
import { TIDEPOOL_ID } from '../../src/scene/tidepool';
import { LESSONS, novice, playCave, type CaveOutcome } from './caveBot';

// The Tidepool Cave's balance, held by playing it as a brand-new character
// would (`caveBot.ts`): level 1, the linen a first hour of Crafting makes, no
// weapon, nothing to eat brought; doing what each lesson says, a little slowly
// (0.6 s to notice anything, 1.2 s to read a lesson). The cast's numbers are
// lane A's (`src/data/dungeons.ts`); the rooms and how many are in each are
// this lane's (`src/scene/tidepool.ts`). The seeds are fixed, so the result
// is the same every time; a change to either that breaks one is a decision,
// not a fix-the-test.

const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919);
const REACT_MS = 600;
const median = (xs: readonly number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

let bracing: CaveOutcome[] | null = null;
const braced = (): CaveOutcome[] =>
  (bracing ??= SEEDS.map((seed) => playCave(novice(), seed, { reactMs: REACT_MS, brace: true })));
let stepping: CaveOutcome[] | null = null;
const steppedOut = (): CaveOutcome[] =>
  (stepping ??= SEEDS.map((seed) => playCave(novice(), seed, { reactMs: REACT_MS, brace: false })));

describe('the Tidepool Cave, played by a new player', () => {
  it('is cleared on nearly every seed, in two to three minutes', () => {
    const runs = braced();
    const clears = runs.filter((r) => r.cleared);
    expect(clears.length).toBeGreaterThanOrEqual(SEEDS.length - 1);
    // On lane A's wave 16 numbers the scripted player takes 2:17 to 2:38 bracing (a person
    // takes longer: he never misses a tap). Wave 15's 1:36 to 2:00 was under the two minutes asked.
    const minutes = median(clears.map((r) => r.ms)) / 60_000;
    expect(minutes).toBeGreaterThanOrEqual(2);
    expect(minutes).toBeLessThanOrEqual(3);
    for (const r of clears) expect(r.ms / 60_000).toBeLessThan(3.5);
    // The lessons cost a few seconds of reading on top, never a long wait.
    for (const r of clears) expect(r.pageMs - r.ms).toBeLessThan(15_000);
  }, 60_000);

  it('is usually survived by a player who never braces', () => {
    const runs = steppedOut();
    expect(runs.filter((r) => r.cleared).length).toBeGreaterThanOrEqual(SEEDS.length - 2);
    expect(runs.every((r) => r.braced === 0)).toBe(true);
  }, 60_000);

  it('makes bracing a real choice: quicker than stepping out, at some cost in health', () => {
    const brace = braced().filter((r) => r.cleared);
    const step = steppedOut().filter((r) => r.cleared);
    // A braced slam is answered (BRACE_REEL_MS): the fight goes on, and so is shorter...
    expect(median(brace.map((r) => r.ms))).toBeLessThan(median(step.map((r) => r.ms)) - 4000);
    // ...and the half taken shows: stepping out keeps more health. Neither is a mistake.
    expect(median(step.map((r) => r.lowest))).toBeGreaterThan(median(brace.map((r) => r.lowest)));
    for (const r of [...brace, ...step]) expect(r.lowest).toBeGreaterThanOrEqual(5);
  }, 60_000);

  it('teaches eating when it is needed: hurt in the rock pools, before the boss, on most seeds', () => {
    for (const runs of [braced(), steppedOut()]) {
      const early = runs.filter((r) => r.shownIn.eat?.room === 'pools');
      expect(early.length).toBeGreaterThanOrEqual(8);
      // Every seed is shown it somewhere, and a fish is eaten.
      for (const r of runs) expect(r.shownIn.eat).toBeDefined();
    }
  }, 60_000);

  it('is cleared under a minute and a half again with the first clear’s bronze sword (Quick Study)', () => {
    const armed = {
      ...novice(),
      equipment: { ...novice().equipment, main_hand: { item: 'bronze_sword', qty: 1 } },
    };
    // A returning player: no lessons, everything already learned.
    const runs = SEEDS.map((seed) =>
      playCave(armed, seed, { reactMs: REACT_MS, brace: true, lessons: false }),
    );
    expect(runs.every((r) => r.cleared)).toBe(true);
    expect(median(runs.map((r) => r.ms))).toBeLessThan(90_000);
  }, 60_000);

  it('shows every lesson once, in the order they are written, on nearly every seed', () => {
    const order = LESSONS.map((l) => l.id);
    const runs = braced();
    for (const r of runs) expect(new Set(r.shown).size).toBe(r.shown.length);
    const inOrder = runs.filter((r) => r.shown.join(',') === order.join(','));
    expect(inOrder.length).toBeGreaterThanOrEqual(SEEDS.length - 1);
  }, 60_000);

  it('brings a clear home: the cave cleared, its kills and what was picked up, less the fish eaten', () => {
    const runs = braced().filter((r) => r.cleared);
    // Somebody ate a fish: the eat lesson is learned on the way.
    expect(runs.some((r) => (r.run.battle!.tally.ateFound?.cooked_shrimp ?? 0) > 0)).toBe(true);
    for (const clear of runs) {
      const battle = clear.run.battle!;
      const spoils = spoilsOf(battle, TIDEPOOL_ID);
      expect(spoils.cleared).toBe(TIDEPOOL_ID);
      expect(spoils.kills).toEqual({ dock_rat: 4, sand_crab: 2, old_snapper: 1 });
      // The crate's fish were eaten from what was picked up, never from a food slot he did not have.
      expect(spoils.foodEaten).toBe(0);
      const ate = battle.tally.ateFound?.cooked_shrimp ?? 0;
      expect(spoils.loot?.cooked_shrimp ?? 0).toBe(4 - ate);
      const home = settleRun(novice(), { ...spoils, timeMs: clear.ms }, CONTENT);
      expect(home.food).toBeNull();
      // A first clear, timed, and lane A's reward for it.
      expect(home.dungeons[TIDEPOOL_ID]).toEqual({ clears: 1, bestMs: Math.floor(clear.ms) });
      expect(home.bank.bronze_sword).toBe(1);
    }
  }, 60_000);
});
