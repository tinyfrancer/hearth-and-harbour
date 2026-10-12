/*
 * Thistlewood Burrow's balance, held by playing it (`burrowBot.ts`), as the
 * grotto's is (`grottoRun.test.ts`): twelve fixed seeds, a person's 0.4 s to
 * notice anything new, and the cast's numbers as this lane asks lane A for
 * them (`BURROW_ASKED`). A careful player at level 40 in tier-2 gear with a
 * slot of swordfish clears it in seven to ten minutes, in real danger; one
 * who never lights a lantern usually does not, nor one ten levels under;
 * and every day of its pool is a fair trade, cleared nearly as often and
 * harder in the way it says. A number that breaks one is a decision.
 */
import { describe, expect, it } from 'vitest';
import type { ModifierEffects } from '../../src/core/content';
import { effectsOf, isKind } from '../../src/core/progress';
import { CONTENT } from '../../src/data';
import { spoilsOf } from '../../src/scene/battle';
import { BURROW_ID } from '../../src/scene/burrow';
import { runStats, type RunModifier } from '../../src/scene/modifiers';
import { playBurrow, tier2, type BurrowOutcome } from './burrowBot';

const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919);
const REACT_MS = 400;
const minutes = (ms: number): number => ms / 60_000;
const median = (xs: readonly number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? NaN;
const clears = (runs: readonly BurrowOutcome[]): number => runs.filter((r) => r.cleared).length;
const clearTime = (runs: readonly BurrowOutcome[]): number =>
  median(runs.filter((r) => r.cleared).map((r) => r.ms));

const played = new Map<string, BurrowOutcome[]>();
function burrow(who: 'careful' | 'careless' | 'under', modifier?: RunModifier): BurrowOutcome[] {
  const key = `${who} ${modifier?.id ?? ''}`;
  let runs = played.get(key);
  if (!runs) {
    runs = SEEDS.map((seed) =>
      playBurrow(tier2(who === 'under' ? 30 : 40), seed, {
        reactMs: REACT_MS,
        light: who !== 'careless',
        ...(modifier ? { modifier } : {}),
      }),
    );
    played.set(key, runs);
  }
  return runs;
}

describe('Thistlewood Burrow, played through', () => {
  it('is cleared by a careful player at level 40 in seven to ten minutes, in real danger', () => {
    const runs = burrow('careful');
    expect(clears(runs)).toBeGreaterThanOrEqual(11);
    expect(minutes(clearTime(runs))).toBeGreaterThanOrEqual(7);
    expect(minutes(clearTime(runs))).toBeLessThanOrEqual(10);
    for (const r of runs.filter((x) => x.cleared)) expect(minutes(r.ms)).toBeLessThan(12);
    // Real danger: on the median run he came down well under half his health.
    expect(median(runs.map((r) => r.lowestShare))).toBeLessThan(0.45);
    // Where one fails, it is at the king.
    for (const r of runs.filter((x) => !x.cleared)) expect(r.room).toBe('sett');
    // He lights lanterns, and moths and the king put some out.
    expect(median(runs.map((r) => r.lit))).toBeGreaterThanOrEqual(10);
    expect(median(runs.map((r) => r.snuffed))).toBeGreaterThanOrEqual(5);
  }, 240_000);

  it('usually sends home a player who never lights a lantern', () => {
    const careless = burrow('careless');
    expect(clears(careless)).toBeLessThanOrEqual(5);
    expect(clears(careless)).toBeLessThanOrEqual(clears(burrow('careful')) - 6);
    for (const r of careless) expect(r.lit).toBe(0);
    // ...and not at the door: he gets as far as the king, most of the time.
    expect(careless.filter((r) => r.room === 'sett').length).toBeGreaterThanOrEqual(9);
  }, 240_000);

  it('usually sends home a careful player ten levels under', () => {
    expect(clears(burrow('under'))).toBeLessThanOrEqual(5);
  }, 240_000);

  it('brings a clear home: kills by monster and the Burrow cleared', () => {
    const clear = burrow('careful').find((r) => r.cleared)!;
    const spoils = spoilsOf(clear.run.battle!, BURROW_ID);
    expect(spoils.cleared).toBe(BURROW_ID);
    expect(spoils.kills).toMatchObject({ badger_king: 1, cap_guard: 3 });
    expect(spoils.kills!.bramble_hound).toBeGreaterThanOrEqual(2);
    expect(runStats(clear.run).timeMs).toBeGreaterThan(0);
  }, 240_000);
});

/**
 * The one day this lane asks lane A to change, played as asked: against the
 * asked cast, Deep Gloom's hero damage of 0.85 on top of the dark is cleared
 * on 9 of 12 seeds (20 of 24 more); at 0.9 it is 10 of 12 (23 of 24) and
 * still the longest day. Its rewards are as they were. (Swift Hounds as it
 * stands is cleared on exactly 10: on the line.)
 */
const ASKED_DAYS: Readonly<Record<string, ModifierEffects>> = {
  deep_gloom: { darker: true, heroDamage: 0.9, foeSpeed: 0.9, xp: 1.25, loot: 1.1 },
};

/** The Burrow's days: its pool in the tables (`DungeonDef.modifiers`), with the asked one as asked. */
const POOL: readonly RunModifier[] = (() => {
  const ids = CONTENT.dungeons?.[BURROW_ID]?.modifiers ?? [];
  return ids.map((id) => ({ id, effects: ASKED_DAYS[id] ?? effectsOf(CONTENT, id) }));
})().filter((m) => !isKind(m.effects));

const times = (k: number | undefined): number =>
  typeof k === 'number' && Number.isFinite(k) && k > 0 ? k : 1;

/** How a day says it is harder, from its effects alone (as `modifierRun.test.ts` reads the grotto's). */
function stated(e: ModifierEffects): { longer: boolean; hurt: boolean; food: boolean } {
  return {
    longer: times(e.foeHealth) > 1 || times(e.heroDamage) < 1 || !!e.darker,
    hurt: times(e.foeDamage) > 1 || times(e.foeSpeed) > 1,
    food: times(e.foodHeals) < 1,
  };
}

const lost = (runs: readonly BurrowOutcome[]): number =>
  median(runs.map((r) => r.run.battle!.count?.damage ?? 0));
const eatenPerHurt = (runs: readonly BurrowOutcome[]): number =>
  runs.reduce((n, r) => n + runStats(r.run).foodEaten, 0) /
  Math.max(
    1,
    runs.reduce((n, r) => n + runStats(r.run).damageTaken, 0),
  );

describe('the Burrow’s days, held to lane A’s target', () => {
  it('has five days, every one a trade', () => {
    expect(POOL.map((m) => m.id)).toEqual([
      'thick_caps',
      'fierce_brambles',
      'swift_hounds',
      'short_rations',
      'deep_gloom',
    ]);
  });

  it.each(POOL.map((m) => [m.id, m] as const))(
    '%s: cleared on at least 10 of 12 seeds by the careful player, and harder in its stated way',
    (_id, modifier) => {
      const plain = burrow('careful');
      const runs = burrow('careful', modifier);
      expect(clears(runs)).toBeGreaterThanOrEqual(10);
      const how = stated(modifier.effects);
      if (how.longer) expect(clearTime(runs)).toBeGreaterThan(clearTime(plain) * 1.04);
      if (how.hurt) expect(lost(runs)).toBeGreaterThan(lost(plain) * 1.02);
      if (how.food) expect(eatenPerHurt(runs)).toBeGreaterThan(eatenPerHurt(plain) * 1.14);
    },
    240_000,
  );
});
