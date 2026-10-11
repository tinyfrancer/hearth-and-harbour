import {
  DEFENCE,
  MELEE,
  PLAYER_ATTACK_MS,
  RANGED,
  RESPAWN_MS,
  VITALITY,
  hitChance,
  leaveFight,
  maxHitFor,
  monsterDef,
} from './combat';
import type { Content, MonsterDef, ShopEntry } from './content';
import { Dice } from './rng';
import {
  bankCount,
  skillLevel,
  type Bounty,
  type BountyOffer,
  type GameState,
  type StatId,
} from './state';

/**
 * Bounties: the notice board asks for so many kills of one monster. Each rule
 * in a sentence:
 * - The character's combat level is the better of Melee and Ranged, Defence
 *   and Vitality, averaged and rounded down.
 * - The board may post any monster with a bounty row at or below that level
 *   (bounty-only ones too; before the weakest is reached, the weakest), more
 *   likely the nearer it is to the strongest of them (`bountyWeight`): so
 *   variety at every level, leaning to a fair fight, and never one above.
 * - It shows three different ones at a time (`BOARD_SIZE`), never the one
 *   just finished or given up while anything else is open; the player takes
 *   one, or asks for three fresh ones for a point (`REROLL_COST`).
 * - Each offer is a number of kills between the row's two numbers, and pays
 *   points for the time those kills should take a character of that combat
 *   level (`expectedKillMs`): a minute's hunting pays about the same whatever
 *   is hunted, so an easy target is never the poor relation of a hard one
 *   (Cody's review: "I only got marsh trolls over and over"; held by
 *   tests/data/pacing.test.ts). Handing in pays those points and a hundred
 *   coins each.
 * - Kills of that monster count while the bounty is held, live or away, until
 *   it asks for no more (src/core/fight.ts counts them, blow by blow).
 * - Giving one up costs three points, or what there is if fewer, breaks the
 *   run of bounties seen through, and puts three fresh offers up.
 * - With auto bounty on, a bounty done in a fight is handed in on the kill
 *   that finishes it, the first of the fresh offers taken, and the fight goes
 *   on against that monster: inside `advance`, so live and away agree.
 * - A monster only bounty hunters go after can be fought only while the
 *   bounty held names it; handing in or giving up on it ends that fight.
 *
 * The dice are rolled only when the board is posted (read, rerolled, a bounty
 * handed in or given up, or auto bounty taking the next), in that one rule, in
 * a fixed order (for each offer, the monster then the count), so a save posts
 * the same board however it got there.
 */

export type BountyResult = { ok: true; state: GameState } | { ok: false; reason: string };

export const COINS_PER_POINT = 100;
/** What giving up a bounty costs, at most. */
export const GIVE_UP_COST = 3;
/** Offers on the board at once. */
export const BOARD_SIZE = 3;
/** What three fresh offers cost. */
export const REROLL_COST = 1;
/**
 * How a monster's chance of being posted falls with how far it is below the
 * strongest the board may post: the strongest weighs this much, each level
 * below one less, and nothing less than one.
 */
export const WEIGHT_SPAN = 12;
/**
 * Bounty points an hour of hunting pays, by `expectedKillMs`, at a combat
 * level: fifteen, and one and a half more a level. Rising with the level, as
 * the old fixed rows did for the monster of one's own level (about 20 an hour
 * at 5, 45 at 20), but the same for every monster at a level.
 */
export function pointsAnHour(level: number): number {
  return 15 + 1.5 * level;
}

export function combatLevel(state: GameState): number {
  return combatLevelOf(
    Math.max(skillLevel(state, MELEE), skillLevel(state, RANGED)),
    skillLevel(state, DEFENCE),
    skillLevel(state, VITALITY),
  );
}

/** The combat level from its three parts: the better attacking skill, Defence and Vitality. */
export function combatLevelOf(attack: number, defence: number, vitality: number): number {
  return Math.floor((attack + defence + vitality) / 3);
}

/** The monsters the board may post at a combat level, weakest first. */
export function bountyPool(level: number, content: Content): MonsterDef[] {
  const posted = Object.values(content.monsters ?? {})
    .filter((monster) => monster.bounty)
    .sort((a, b) => a.level - b.level);
  const open = posted.filter((monster) => monster.level <= level);
  // Before the weakest is reached, the weakest: there is always something.
  return open.length > 0 ? open : posted.filter((m) => m.level === posted[0]?.level);
}

/** The monsters the board may post for this character, weakest first. */
export function bountyChoices(state: GameState, content: Content): MonsterDef[] {
  return bountyPool(combatLevel(state), content);
}

/** How likely a monster is to be posted, beside the strongest (`top`, a level) the board may post. */
export function bountyWeight(monster: MonsterDef, top: number): number {
  return Math.max(1, WEIGHT_SPAN - (top - monster.level));
}

/**
 * Expected blows to kill something of `hp` with a chance `chance` to land
 * blows of 1 to `most`, each equally likely: worked out exactly, from the
 * fewest hit points up, as the fight's own rules roll them.
 */
function expectedBlows(hp: number, chance: number, most: number): number {
  const blows = [0];
  for (let left = 1; left <= hp; left += 1) {
    let sum = 0;
    for (let hit = 1; hit <= most; hit += 1) sum += blows[Math.max(0, left - hit)]!;
    blows[left] = (1 + (chance / most) * sum) / chance;
  }
  return blows[hp]!;
}

/**
 * How long one kill of a monster should take a character of a combat level,
 * from one arrival to the next: the wait for a monster, then blows until it
 * falls. The character is judged by the level alone, wearing gear worth
 * `6 + level / 3` in attack and strength (about what tier 1's gear gives at
 * each level), never by what they wear now: taking a sword off before
 * reading the board must not make bounties pay more.
 */
export function expectedKillMs(level: number, monster: MonsterDef): number {
  const gear = 6 + Math.floor(level / 3);
  const chance = hitChance(10 + level + gear, monster.defence);
  return RESPAWN_MS + expectedBlows(monster.hp, chance, maxHitFor(level, gear)) * PLAYER_ATTACK_MS;
}

/** Points for `count` kills of a monster at a combat level: its hunting time, at `pointsAnHour`. */
export function bountyPoints(level: number, monster: MonsterDef, count: number): number {
  const hours = (count * expectedKillMs(level, monster)) / 3_600_000;
  return Math.max(1, Math.round(hours * pointsAnHour(level)));
}

/**
 * Up to `BOARD_SIZE` offers, each a different monster drawn by weight from
 * the pool at `level` less those in `avoid`, then its count; where avoiding
 * them leaves nothing, the pool less `last`, and then the whole pool.
 */
function drawOffers(
  level: number,
  content: Content,
  dice: Dice,
  avoid: ReadonlySet<string>,
  last: string | null,
): BountyOffer[] {
  const pool = bountyPool(level, content);
  let open = pool.filter((monster) => !avoid.has(monster.id));
  if (open.length === 0) open = pool.filter((monster) => monster.id !== last);
  if (open.length === 0) open = pool;
  const top = Math.max(...pool.map((monster) => monster.level));
  const offers: BountyOffer[] = [];
  while (offers.length < BOARD_SIZE && open.length > 0) {
    const weights = open.map((monster) => bountyWeight(monster, top));
    let pick = dice.next() * weights.reduce((sum, weight) => sum + weight, 0);
    let at = 0;
    while (at < open.length - 1 && pick >= weights[at]!) {
      pick -= weights[at]!;
      at += 1;
    }
    const monster = open[at]!;
    open = open.filter((_, index) => index !== at);
    const [least, most] = monster.bounty!.kills;
    const count = dice.between(least, most);
    offers.push({ monster: monster.id, count, points: bountyPoints(level, monster, count) });
  }
  return offers;
}

/** The state with a fresh board posted, its dice moved on. */
function post(state: GameState, content: Content, avoid: ReadonlySet<string>): GameState {
  const dice = new Dice(state.rng);
  const bountyBoard = drawOffers(combatLevel(state), content, dice, avoid, state.lastBounty);
  return { ...state, rng: dice.seed, bountyBoard };
}

/** A fight against a bounty-only monster ends when the bounty no longer names it. */
function stillAllowed(state: GameState, content: Content): GameState {
  const fighting = state.fight && monsterDef(content, state.fight.monster);
  if (fighting?.bountyOnly && state.bounty?.monster !== fighting.id) return leaveFight(state);
  return state;
}

/** Look at the notice board, when no bounty is held and nothing is posted yet. */
export function readBoard(state: GameState, content: Content): BountyResult {
  if (state.bounty) {
    return { ok: false, reason: 'One bounty at a time. Finish or give up the one you hold.' };
  }
  if (state.bountyBoard.length > 0) return { ok: true, state };
  const next = post(state, content, new Set(state.lastBounty ? [state.lastBounty] : []));
  if (next.bountyBoard.length === 0) return { ok: false, reason: 'The notice board is bare.' };
  return { ok: true, state: next };
}

/** Take one of the offers on the board (the first, if not said). */
export function takeBounty(state: GameState, content: Content, index = 0): BountyResult {
  if (state.bounty) {
    return { ok: false, reason: 'One bounty at a time. Finish or give up the one you hold.' };
  }
  const offer = state.bountyBoard[index];
  if (!offer || !monsterDef(content, offer.monster)) {
    return { ok: false, reason: 'That notice is not on the board.' };
  }
  return {
    ok: true,
    state: { ...state, bounty: { ...offer, done: 0 }, bountyBoard: [] },
  };
}

/** Three fresh offers for a point, none of them those just shown where anything else is open. */
export function rerollBoard(state: GameState, content: Content): BountyResult {
  if (state.bounty) return { ok: false, reason: 'You hold a bounty already.' };
  if (state.bountyPoints < REROLL_COST) {
    return { ok: false, reason: `Fresh notices cost ${REROLL_COST} bounty point.` };
  }
  const shown = state.bountyBoard.map((offer) => offer.monster);
  const avoid = new Set([...shown, ...(state.lastBounty ? [state.lastBounty] : [])]);
  return {
    ok: true,
    state: post({ ...state, bountyPoints: state.bountyPoints - REROLL_COST }, content, avoid),
  };
}

/** Whether the bounty held has all its kills. */
export function bountyReady(state: GameState): boolean {
  return state.bounty !== null && state.bounty.done >= state.bounty.count;
}

/**
 * What a bounty pays: the points it was offered at, and coins for each. One
 * taken before offers carried their points pays its monster's old points.
 */
export function rewardOf(
  bounty: Bounty | null,
  content: Content,
): { points: number; coins: number } {
  const points = !bounty
    ? 0
    : (bounty.points ?? monsterDef(content, bounty.monster)?.bounty?.points ?? 0);
  return { points, coins: points * COINS_PER_POINT };
}

/** What handing in the bounty held pays. */
export function bountyReward(
  state: GameState,
  content: Content,
): { points: number; coins: number } {
  return rewardOf(state.bounty, content);
}

/** The parts of the state handing in a bounty changes, so a fight's walk can do it too. */
export type BountyBook = Pick<
  GameState,
  'bounty' | 'bountyPoints' | 'coins' | 'stats' | 'lastBounty' | 'bountyBoard'
>;

/**
 * Hand in the bounty in `book`, which must be done: its points and coins
 * paid, the run of them counted, and a fresh board posted with `dice` at a
 * combat level, without the one just done. With `takeNext`, the first offer
 * is taken at once (auto bounty).
 */
export function payBounty<B extends BountyBook>(
  book: B,
  content: Content,
  level: number,
  dice: Dice,
  takeNext: boolean,
): B {
  const done = book.bounty!;
  const { points, coins } = rewardOf(done, content);
  const count = (id: StatId): number => book.stats[id] ?? 0;
  const streak = count('streak') + 1;
  const board = drawOffers(level, content, dice, new Set([done.monster]), done.monster);
  const next = takeNext ? board[0] : undefined;
  return {
    ...book,
    bountyPoints: book.bountyPoints + points,
    coins: book.coins + coins,
    stats: {
      ...book.stats,
      bounties: count('bounties') + 1,
      streak,
      bestStreak: Math.max(count('bestStreak'), streak),
    },
    lastBounty: done.monster,
    bounty: next ? { ...next, done: 0 } : null,
    bountyBoard: next ? [] : board,
  };
}

/** Hand in a finished bounty: points and coins in, and the board's fresh offers to choose from. */
export function handInBounty(state: GameState, content: Content): BountyResult {
  const bounty = state.bounty;
  if (!bounty) return { ok: false, reason: 'You hold no bounty.' };
  if (bounty.done < bounty.count) {
    const left = bounty.count - bounty.done;
    return { ok: false, reason: `Not yet: ${left} more to go.` };
  }
  const dice = new Dice(state.rng);
  const paid = payBounty(state, content, combatLevel(state), dice, false);
  return { ok: true, state: stillAllowed({ ...paid, rng: dice.seed }, content) };
}

/** What giving up the bounty held would cost now. */
export function giveUpCost(state: GameState): number {
  return Math.min(GIVE_UP_COST, state.bountyPoints);
}

/** Give up the bounty held, for a few points, and see three fresh offers. */
export function giveUpBounty(state: GameState, content: Content): BountyResult {
  const bounty = state.bounty;
  if (!bounty) return { ok: false, reason: 'You hold no bounty.' };
  // Giving up breaks the run of bounties seen through.
  const paid: GameState = {
    ...state,
    bountyPoints: state.bountyPoints - giveUpCost(state),
    stats: { ...state.stats, streak: 0 },
    bounty: null,
    lastBounty: bounty.monster,
  };
  return { ok: true, state: stillAllowed(post(paid, content, new Set([bounty.monster])), content) };
}

/**
 * Hand in a done bounty and take the next, as auto bounty does, outside a
 * fight's walk: when it is switched on with one already done, or a dungeon
 * run finishes one. A fight on the old target goes on against the new one.
 */
export function autoHandIn(state: GameState, content: Content): GameState {
  if (!state.autoBounty || !bountyReady(state)) return state;
  const was = state.bounty!.monster;
  const dice = new Dice(state.rng);
  const paid = { ...payBounty(state, content, combatLevel(state), dice, true), rng: dice.seed };
  const next = paid.bounty && monsterDef(content, paid.bounty.monster);
  if (paid.fight?.monster === was && next && next.id !== was) {
    // The monster in front of the character is finished with; the next one is the new kind.
    return { ...paid, fight: { ...paid.fight, monster: next.id, foeHp: 0, foeMs: RESPAWN_MS } };
  }
  return stillAllowed(paid, content);
}

/** Switch auto bounty on or off. On, a bounty already done is handed in and the next taken. */
export function setAutoBounty(state: GameState, on: boolean, content: Content): GameState {
  const set = { ...state, autoBounty: on };
  return autoHandIn(set, content);
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
