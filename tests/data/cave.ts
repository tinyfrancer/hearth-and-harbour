import { PLAYER_ATTACK_MS, hitChance, playerCombat } from '../../src/core/combat';
import type { DungeonFoe } from '../../src/core/content';
import { Dice, seedFrom } from '../../src/core/rng';
import type { GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';

// The Tidepool Cave is a lesson, not a test (Cody's #21): a brand-new
// character, nothing worn and nothing to eat, should clear it with reasonable
// play and cannot be knocked out by standing still in its first room. The
// scene plays the rooms (src/scene); this holds the cave's numbers to that
// on the rules' own formulas, played as plainly as a fight can be:
//
// - Everyone in a room comes at the hero at once and strikes from the first
//   moment (the worst case); the hero strikes the first of them still up,
//   every 2.4 s, from the first moment. No breather on a kill, no food: the
//   dungeons have neither unless food is carried.
// - Health carries from room to room: rats, then crabs, then the boss.
// - A heavy blow (the crab's slam, as `src/scene/foes.ts` has it, and
//   whatever the scene gives the boss, here three times its max hit every
//   7 s: the most it should be, docs/status/lane-a.md) lands unless dodged;
//   `dodge` is the share dodged. Standing
//   still dodges none.

export const CAVE = CONTENT.dungeons!.tidepool_cave!;
const foe = (id: string): DungeonFoe => CAVE.cast!.find((row) => row.id === id)!;
export const ROOMS: readonly (readonly string[])[] = [
  ['dock_rat', 'dock_rat'],
  ['sand_crab', 'sand_crab'],
  ['old_snapper'],
];
/** Heavy blows by foe: how many times its max hit, the first after, then every. */
const HEAVY: Readonly<Record<string, { times: number; firstMs: number; everyMs: number }>> = {
  sand_crab: { times: 2, firstMs: 2500, everyMs: 6000 },
  old_snapper: { times: 3, firstMs: 4000, everyMs: 7000 },
};
const TICK = 100;

export interface Outcome {
  cleared: boolean;
  /** Health left at the end, of the most there is. */
  left: number;
  /** Rooms got through. */
  rooms: number;
  /** Time spent fighting, room by room added up (walking not counted). */
  ms: number;
}

/** Plays rooms in order with the dice of `seed`. */
export function play(
  state: GameState,
  seed: number,
  { dodge = 0, rooms = ROOMS }: { dodge?: number; rooms?: readonly (readonly string[])[] } = {},
): Outcome {
  const me = playerCombat(state, CONTENT);
  const dice = new Dice(seedFrom(seed));
  let hp = me.maxHp;
  let through = 0;
  let ms = 0;
  for (const room of rooms) {
    const foes = room.map((id) => ({ row: foe(id), hp: foe(id).hp, next: 0, heavy: 0 }));
    for (const f of foes) f.heavy = HEAVY[f.row.id]?.firstMs ?? Infinity;
    let myNext = 0;
    let clock = 0;
    for (; foes.some((f) => f.hp > 0); clock += TICK) {
      if (clock > 30 * 60_000) throw new Error('a room that never ends');
      const target = foes.find((f) => f.hp > 0)!;
      if (clock >= myNext) {
        myNext += PLAYER_ATTACK_MS;
        if (dice.next() < hitChance(me.attack, target.row.defence))
          target.hp -= dice.between(1, me.maxHit);
      }
      for (const f of foes) {
        if (f.hp <= 0) continue;
        if (clock >= f.next) {
          f.next += f.row.speedMs;
          if (dice.next() < hitChance(f.row.attack, me.defence))
            hp -= dice.between(1, f.row.maxHit);
        }
        const heavy = HEAVY[f.row.id];
        if (heavy && clock >= f.heavy) {
          f.heavy += heavy.everyMs;
          if (dice.next() >= dodge) hp -= heavy.times * f.row.maxHit;
        }
      }
      if (hp <= 0) return { cleared: false, left: 0, rooms: through, ms: ms + clock };
    }
    ms += clock;
    through += 1;
  }
  return { cleared: true, left: hp / me.maxHp, rooms: through, ms };
}

export const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);
export const many = (state: GameState, options: Parameters<typeof play>[2] = {}) => {
  const outcomes = SEEDS.map((seed) => play(state, seed, options));
  const cleared = outcomes.filter((o) => o.cleared);
  return {
    rate: cleared.length / outcomes.length,
    left: cleared.reduce((sum, o) => sum + o.left, 0) / Math.max(1, cleared.length),
    worst: Math.min(...outcomes.map((o) => o.left)),
    /** The quickest clear's fighting time. */
    quickest: Math.min(...cleared.map((o) => o.ms)),
  };
};
