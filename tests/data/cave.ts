import { PLAYER_ATTACK_MS, hitChance, playerCombat } from '../../src/core/combat';
import type { DungeonFoe } from '../../src/core/content';
import { Dice, seedFrom } from '../../src/core/rng';
import type { GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';

// The Tidepool Cave is a lesson, not a test (Cody's #21): a brand-new
// character, nothing worn and nothing brought to eat, should clear it with
// reasonable play, cannot be knocked out by standing still in its first room,
// and (since wave 16) gets hurt enough to need the fish found on its landing.
// The scene plays the rooms (src/scene); this holds the cave's numbers to that
// on the rules' own formulas, played as plainly as a fight can be:
//
// - Everyone in a group comes at the hero at once and strikes from the first
//   moment (the worst case); the hero strikes the first of them still up,
//   every 2.4 s, from the first moment. No breather on a kill.
// - Health carries from group to group, in the order the scene meets them.
// - `food`: fish picked up on the way (the scene leaves four cooked shrimp on
//   the landing), eaten the moment health is under half, as the cave's eat
//   lesson teaches. None unless asked for.
// - A heavy blow (the crab's slam and the boss's, each twice its max hit, as
//   `src/scene/foes.ts` has them) lands unless dodged; `dodge` is the share
//   dodged. Standing still dodges none.

export const CAVE = CONTENT.dungeons!.tidepool_cave!;
const foe = (id: string): DungeonFoe => CAVE.cast!.find((row) => row.id === id)!;
/**
 * Who the scene puts in the cave (src/scene/tidepool.ts, wave 15), in the
 * groups it is met in: a rat on the landing; four rats under the pool, then
 * two crabs by the far door; the boss. (Until wave 16 this model held two
 * rats and two crabs, the cast it was first tuned to, and undercounted the
 * scene's.)
 */
export const ROOMS: readonly (readonly string[])[] = [
  ['dock_rat'],
  ['dock_rat', 'dock_rat', 'dock_rat', 'dock_rat'],
  ['sand_crab', 'sand_crab'],
  ['old_snapper'],
];
/** The cooked shrimp the scene leaves lying on the cave's landing. */
export const FOUND_FISH = 4;
/** Heavy blows by foe: how many times its max hit, the first after, then every. */
const HEAVY: Readonly<Record<string, { times: number; firstMs: number; everyMs: number }>> = {
  sand_crab: { times: 2, firstMs: 2500, everyMs: 6000 },
  old_snapper: { times: 2, firstMs: 4000, everyMs: 7000 },
};
const TICK = 100;
const FISH_HEALS = CONTENT.items.cooked_shrimp!.heals!;

export interface Outcome {
  cleared: boolean;
  /** Health left at the end, of the most there is. */
  left: number;
  /** The least health there was at any moment, of the most there is. */
  low: number;
  /** Rooms got through. */
  rooms: number;
  /** Time spent fighting, room by room added up (walking not counted). */
  ms: number;
}

/** Plays rooms in order with the dice of `seed`. */
export function play(
  state: GameState,
  seed: number,
  {
    dodge = 0,
    rooms = ROOMS,
    food = 0,
  }: { dodge?: number; rooms?: readonly (readonly string[])[]; food?: number } = {},
): Outcome {
  const me = playerCombat(state, CONTENT);
  const dice = new Dice(seedFrom(seed));
  let hp = me.maxHp;
  let fish = food;
  let low = me.maxHp;
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
      if (hp <= 0) return { cleared: false, left: 0, low: 0, rooms: through, ms: ms + clock };
      low = Math.min(low, hp);
      while (fish > 0 && hp < me.maxHp / 2) {
        fish -= 1;
        hp = Math.min(me.maxHp, hp + FISH_HEALS);
      }
    }
    ms += clock;
    through += 1;
  }
  return { cleared: true, left: hp / me.maxHp, low: low / me.maxHp, rooms: through, ms };
}

export const SEEDS = Array.from({ length: 400 }, (_, i) => i + 1);
export const many = (state: GameState, options: Parameters<typeof play>[2] = {}) => {
  const outcomes = SEEDS.map((seed) => play(state, seed, options));
  const cleared = outcomes.filter((o) => o.cleared);
  return {
    rate: cleared.length / outcomes.length,
    left: cleared.reduce((sum, o) => sum + o.left, 0) / Math.max(1, cleared.length),
    worst: Math.min(...outcomes.map((o) => o.left)),
    /** The least health of any run at any moment, and the median run's least. */
    lowest: Math.min(...outcomes.map((o) => o.low)),
    lowMedian: [...outcomes.map((o) => o.low)].sort((a, b) => a - b)[outcomes.length >> 1]!,
    /** The quickest clear's fighting time. */
    quickest: Math.min(...cleared.map((o) => o.ms)),
  };
};
