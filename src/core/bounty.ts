import { DEFENCE, MELEE, RANGED, VITALITY, leaveFight, monsterDef } from './combat';
import type { Content, MonsterDef, ShopEntry } from './content';
import { Dice } from './rng';
import { bankCount, skillLevel, stat, type GameState } from './state';

/**
 * Bounties: the notice board asks for so many kills of one monster. Each rule
 * in a sentence:
 * - The character's combat level is the better of Melee and Ranged, Defence
 *   and Vitality, averaged and rounded down.
 * - A bounty is posted on a monster with a bounty row whose level is from six
 *   below that combat level to the level itself (or, when none is, the
 *   strongest below it), chosen with the save's dice, every one equally
 *   likely; then the number of kills, between the row's two numbers.
 * - Kills of that monster count while the bounty is held, live or away, until
 *   it asks for no more (src/core/fight.ts counts them, blow by blow).
 * - Handing it in pays the row's points and ten coins a point, and posts the
 *   next.
 * - Swapping it for another costs three points, or what there is if fewer,
 *   so nobody is ever stuck with one.
 * - A monster only bounty hunters go after can be fought only while the
 *   bounty held names it; handing in or swapping away from it ends that fight.
 *
 * The dice are rolled only when the player takes, hands in or swaps a
 * bounty, in that one rule, in a fixed order (monster, then count), so a save
 * posts the same bounty however it got there.
 */

export type BountyResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** How far below the character's combat level a bounty may be posted. */
export const BOUNTY_BELOW = 6;
export const COINS_PER_POINT = 10;
export const SWAP_COST = 3;

export function combatLevel(state: GameState): number {
  const attack = Math.max(skillLevel(state, MELEE), skillLevel(state, RANGED));
  return Math.floor((attack + skillLevel(state, DEFENCE) + skillLevel(state, VITALITY)) / 3);
}

/** The monsters the board may post for this character, weakest first. */
export function bountyChoices(state: GameState, content: Content): MonsterDef[] {
  const level = combatLevel(state);
  const posted = Object.values(content.monsters ?? {})
    .filter((monster) => monster.bounty)
    .sort((a, b) => a.level - b.level);
  const near = posted.filter((m) => m.level <= level && m.level >= level - BOUNTY_BELOW);
  if (near.length > 0) return near;
  // Past everything in the tables, the strongest there is; before everything,
  // the weakest. Never one above the character while something is below.
  const below = posted.filter((m) => m.level <= level);
  const pick = below.length > 0 ? below.at(-1)!.level : posted[0]?.level;
  return posted.filter((m) => m.level === pick);
}

/** A new bounty from the board, on anything but `except` if there is anything else. */
function post(state: GameState, content: Content, except?: string): GameState {
  const all = bountyChoices(state, content);
  const others = all.filter((monster) => monster.id !== except);
  const pool = others.length > 0 ? others : all;
  if (pool.length === 0) return { ...state, bounty: null };
  const dice = new Dice(state.rng);
  const monster = pool[dice.between(0, pool.length - 1)]!;
  const [least, most] = monster.bounty!.kills;
  const count = dice.between(least, most);
  return { ...state, rng: dice.seed, bounty: { monster: monster.id, count, done: 0 } };
}

/** A fight against a bounty-only monster ends when the bounty no longer names it. */
function stillAllowed(state: GameState, content: Content): GameState {
  const fighting = state.fight && monsterDef(content, state.fight.monster);
  if (fighting?.bountyOnly && state.bounty?.monster !== fighting.id) return leaveFight(state);
  return state;
}

/** Take a bounty from the board, when none is held. */
export function takeBounty(state: GameState, content: Content): BountyResult {
  if (state.bounty) {
    return { ok: false, reason: 'One bounty at a time. Finish or swap the one you hold.' };
  }
  const next = post(state, content);
  if (!next.bounty) return { ok: false, reason: 'The notice board is bare.' };
  return { ok: true, state: next };
}

/** Whether the bounty held has all its kills. */
export function bountyReady(state: GameState): boolean {
  return state.bounty !== null && state.bounty.done >= state.bounty.count;
}

/** What handing in the bounty held pays: its monster's points, and coins for each. */
export function bountyReward(
  state: GameState,
  content: Content,
): { points: number; coins: number } {
  const points = state.bounty
    ? (monsterDef(content, state.bounty.monster)?.bounty?.points ?? 0)
    : 0;
  return { points, coins: points * COINS_PER_POINT };
}

/** Hand in a finished bounty: points and coins in, and the next one posted. */
export function handInBounty(state: GameState, content: Content): BountyResult {
  const bounty = state.bounty;
  if (!bounty) return { ok: false, reason: 'You hold no bounty.' };
  if (bounty.done < bounty.count) {
    const left = bounty.count - bounty.done;
    return { ok: false, reason: `Not yet: ${left} more to go.` };
  }
  const { points, coins } = bountyReward(state, content);
  const streak = stat(state, 'streak') + 1;
  const paid: GameState = {
    ...state,
    bountyPoints: state.bountyPoints + points,
    coins: state.coins + coins,
    stats: {
      ...state.stats,
      bounties: stat(state, 'bounties') + 1,
      streak,
      bestStreak: Math.max(stat(state, 'bestStreak'), streak),
    },
  };
  return { ok: true, state: stillAllowed(post(paid, content, bounty.monster), content) };
}

/** What swapping the bounty held would cost now. */
export function swapCost(state: GameState): number {
  return Math.min(SWAP_COST, state.bountyPoints);
}

/** Trade the bounty held for another, on a different monster, for a few points. */
export function swapBounty(state: GameState, content: Content): BountyResult {
  const bounty = state.bounty;
  if (!bounty) return { ok: false, reason: 'You hold no bounty.' };
  if (bountyChoices(state, content).every((monster) => monster.id === bounty.monster)) {
    return { ok: false, reason: 'There is nothing else on the board for you yet.' };
  }
  // A swap breaks the run of bounties seen through.
  const paid = {
    ...state,
    bountyPoints: state.bountyPoints - swapCost(state),
    stats: { ...state.stats, streak: 0 },
  };
  return { ok: true, state: stillAllowed(post(paid, content, bounty.monster), content) };
}

/** How many of an item the character has, in the bank or worn. */
export function held(state: GameState, item: string): number {
  const worn = Object.values(state.equipment).filter((slot) => slot?.item === item);
  return bankCount(state, item) + worn.reduce((sum, slot) => sum + (slot?.qty ?? 0), 0);
}

/** Why the shop will not sell this entry now, or null if it will. */
export function shopProblem(state: GameState, entry: ShopEntry): string | null {
  if (entry.once && held(state, entry.item) > 0) return 'You have one already.';
  if (state.bountyPoints < entry.cost) {
    return `Needs ${entry.cost} bounty points; you have ${state.bountyPoints}.`;
  }
  return null;
}

/** Buy from the bounty shop: points out, the thing into the bank. */
export function buyFromShop(state: GameState, entryId: string, content: Content): BountyResult {
  const entry = content.shop?.[entryId];
  if (!entry) return { ok: false, reason: 'The shop has no such thing.' };
  const problem = shopProblem(state, entry);
  if (problem) return { ok: false, reason: problem };
  return {
    ok: true,
    state: {
      ...state,
      bountyPoints: state.bountyPoints - entry.cost,
      bank: { ...state.bank, [entry.item]: bankCount(state, entry.item) + entry.qty },
    },
  };
}
