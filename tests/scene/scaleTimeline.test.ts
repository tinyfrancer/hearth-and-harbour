import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as Metrics from '../../src/scene/dungeonMetrics';

// The proof that the switch to the C scale moved no balance: the same rooms
// (the same rows), the same seed and the same scripted player
// (`grottoBot.ts`, as `grottoRun.test.ts` plays him), played once with the
// first scale's numbers (16-pixel tiles, every distance as written) and once
// with the C scale's (24-pixel tiles, every distance and pace ×1.5). Times
// are not scaled, so the two must be the same run: every blow, miss, heal,
// mark, splash and kill on the same millisecond for the same amount, every
// hit point the same at every tick, the same loot home, and everyone in the
// same place counted in tiles. All twenty-four of the balance test's runs.

type Name = 'FIRST_SCALE' | 'C_SCALE';
type Strength = 'prepared' | 'half';

interface Tick {
  readonly clock: number;
  readonly room: string;
  readonly hp: number;
  readonly foes: string;
  readonly kills: number;
  readonly eaten: number;
}

interface Timeline {
  readonly ticks: Tick[];
  /** Where the hero and every foe stand at each tick, in tiles. */
  readonly places: number[][];
  readonly events: string[];
  readonly ending: string | null;
  readonly loot: Readonly<Record<string, number>>;
}

async function playAt(name: Name, seed: number, strength: Strength): Promise<Timeline> {
  vi.resetModules();
  vi.doMock('../../src/scene/dungeonMetrics', async (importOriginal) => {
    const real = await importOriginal<typeof Metrics>();
    const m = real[name];
    return { ...real, DUNGEON: m, far: (px: number) => px * m.distance };
  });
  const bot = await import('./grottoBot');
  const { advanceRun } = await import('../../src/scene/dungeon');
  const { DUNGEON } = await import('../../src/scene/dungeonMetrics');
  const T = DUNGEON.tile;
  expect(T).toBe(name === 'FIRST_SCALE' ? 16 : 24);

  let run = bot.begin(strength === 'prepared' ? bot.prepared() : bot.halfStrength(), seed);
  const ticks: Tick[] = [];
  const places: number[][] = [];
  const events: string[] = [];
  const seen = new Set<string>();
  for (let t = 0; t < 20 * 60_000 && !run.finished; t += 100) {
    run = bot.decide(run);
    run = advanceRun(bot.GROTTO_DUNGEON, run, run.play, 100);
    const b = run.battle!;
    for (const e of b.effects) {
      const amount = 'amount' in e ? e.amount : '';
      const on = 'on' in e ? e.on : '';
      const key = `${e.from} ${e.kind} ${on} ${amount}`;
      if (!seen.has(key)) {
        seen.add(key);
        events.push(key);
      }
    }
    ticks.push({
      clock: b.clock,
      room: run.room,
      hp: b.hp,
      foes: b.foes.map((f) => `${f.key}:${f.hp}`).join(' '),
      kills: b.tally.kills,
      eaten: b.tally.eaten,
    });
    const hero = run.play.walker.at;
    places.push([hero.x / T, hero.y / T, ...b.foes.flatMap((f) => [f.at.x / T, f.at.y / T])]);
  }
  return { ticks, places, events, ending: run.ending ?? null, loot: run.battle!.tally.loot };
}

afterEach(() => {
  vi.doUnmock('../../src/scene/dungeonMetrics');
  vi.resetModules();
});

describe('the switch to the C scale, old numbers against new', () => {
  const cases: [number, Strength][] = (['prepared', 'half'] as const).flatMap((s) =>
    Array.from({ length: 12 }, (_, i): [number, Strength] => [(i + 1) * 7919, s]),
  );
  for (const [seed, strength] of cases) {
    it(`plays the same run, event for event on the same millisecond (seed ${seed}, ${strength})`, async () => {
      const first = await playAt('FIRST_SCALE', seed, strength);
      const c = await playAt('C_SCALE', seed, strength);
      expect(c.ending).toBe(first.ending);
      expect(c.events).toEqual(first.events);
      expect(c.ticks).toEqual(first.ticks);
      expect(c.loot).toEqual(first.loot);
      // The same places in tiles: a ×1.5 multiplied float differs only in its last digits.
      let worst = 0;
      first.places.forEach((row, i) =>
        row.forEach((v, k) => (worst = Math.max(worst, Math.abs(v - c.places[i]![k]!)))),
      );
      expect(worst).toBeLessThan(1e-4);
      // A real fight, not two empty ones.
      expect(first.events.filter((e) => e.includes(' hit ')).length).toBeGreaterThan(50);
    }, 120_000);
  }
});
