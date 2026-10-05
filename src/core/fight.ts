import {
  DEFENCE,
  DEFENCE_XP_PER_MAX_HIT,
  PLAYER_ATTACK_MS,
  RESPAWN_MS,
  VITALITY,
  XP_PER_DAMAGE,
  attackRating,
  attackSkill,
  breatherFor,
  comeRound,
  defenceRating,
  hitChance,
  maxHitFor,
  hurt,
  leaveFight,
  maxHpFor,
  monsterDef,
  rest,
} from './combat';
import type { Content } from './content';
import { combatStyle, equipmentTotals } from './equipment';
import { Dice } from './rng';
import type { GameState, MonsterRecord } from './state';
import { Trained } from './xp';

/** Why a fight that was under way before some time passed is not any more. */
export type FightEnd = 'died' | 'no_arrows' | 'gone';

/**
 * Move a fight forward by `ms`: the fight's half of `advance`.
 *
 * A fight is chance, so it cannot be worked out by arithmetic as an action's
 * completions are. It is walked event by event instead (the character's next
 * blow, the monster's, the next monster arriving) in the order they fall,
 * with the dice rolled inside each event in a fixed order. Events are the
 * game's own, not slices of time: however the time is cut up, the same events
 * happen at the same moments and roll the same dice, so advance(a) then
 * advance(b) equals advance(a + b) exactly. An event falling exactly at the
 * end of the time is part of it, as a completion is.
 *
 * At the same moment, the character strikes before the monster: a monster
 * killed by that blow does not strike back.
 *
 * A fight that ends partway through the time leaves the rest of it to heal
 * in, as any time out of a fight is, so where the time was cut still does not
 * matter.
 */
export function advanceFight(state: GameState, ms: number, content: Content): GameState {
  const { state: after, left } = walkFight(state, ms, content);
  return left > 0 ? rest(after, left) : after;
}

/**
 * The walk itself, and how much of the time was left when the fight ended
 * (0 if it did not). It keeps its numbers in plain variables and builds one
 * new state at the end, because a day away is tens of thousands of events.
 */
function walkFight(
  state: GameState,
  ms: number,
  content: Content,
): { state: GameState; left: number } {
  const fight = state.fight;
  if (!fight || !(ms > 0)) return { state, left: 0 };
  const monster = monsterDef(content, fight.monster);
  // A save can outlive the monster it was fighting; stop rather than guess.
  if (!monster) return { state: leaveFight(state), left: ms };

  const totals = equipmentTotals(state, content);
  const ranged = totals.style === 'ranged';
  const skill = attackSkill(totals.style);
  const attacking = new Trained(state.skills[skill] ?? 0);
  const defence = new Trained(state.skills[DEFENCE] ?? 0);
  const vitality = new Trained(state.skills[VITALITY] ?? 0);
  const dice = new Dice(state.rng);
  const heals = state.food ? (content.items[state.food.item]?.heals ?? 0) : 0;

  let { hp, foeHp, playerMs, foeMs, kills, coins, eaten, arrows } = fight;
  let food = state.food?.qty ?? 0;
  let ammo = state.equipment.ammo?.qty ?? 0;
  // Copied on the first drop, so a frame with no kill copies nothing.
  let loot: Record<string, number> | null = null;
  let bank: Record<string, number> | null = null;
  let record: MonsterRecord | null = null;
  let ended = false;
  let knockedOut = false;
  let time = ms;
  // Kills count towards a bounty on this monster until it asks for no more.
  const hunting = state.bounty?.monster === monster.id ? state.bounty : null;
  let hunted = hunting?.done ?? 0;

  const kill = (): void => {
    kills += 1;
    loot ??= { ...fight.loot };
    bank ??= { ...state.bank };
    record ??= {
      kills: state.bestiary[monster.id]?.kills ?? 0,
      seen: [...(state.bestiary[monster.id]?.seen ?? [])],
    };
    record.kills += 1;
    if (hunting && hunted < hunting.count) hunted += 1;
    coins += dice.between(monster.coins[0], monster.coins[1]);
    const drop = (item: string, qty: number): void => {
      loot![item] = (loot![item] ?? 0) + qty;
      bank![item] = (bank![item] ?? 0) + qty;
      if (!record!.seen.includes(item)) record!.seen.push(item);
    };
    for (const { item, min, max } of monster.always) {
      drop(item, dice.between(min, max));
    }
    for (const { item, min, max, oneIn } of monster.rare) {
      if (dice.next() * oneIn < 1) drop(item, dice.between(min, max));
    }
    hp = Math.min(maxHpFor(vitality.level), hp + breatherFor(maxHpFor(vitality.level)));
    foeHp = 0;
    foeMs = RESPAWN_MS;
  };

  /** The character's blow. */
  const strike = (): void => {
    playerMs = PLAYER_ATTACK_MS;
    if (ranged) {
      ammo -= 1;
      arrows += 1;
    }
    if (dice.next() < hitChance(attackRating(attacking.level, totals.attack), monster.defence)) {
      const dealt = Math.min(dice.between(1, maxHitFor(attacking.level, totals.strength)), foeHp);
      foeHp -= dealt;
      attacking.add(XP_PER_DAMAGE * dealt);
      vitality.add(Math.floor((XP_PER_DAMAGE * dealt) / 2));
    }
    if (foeHp === 0) kill();
  };

  /** The monster's blow, and what the character eats after it. */
  const struck = (): void => {
    foeMs = monster.speedMs;
    const earned = DEFENCE_XP_PER_MAX_HIT * monster.maxHit;
    if (dice.next() < hitChance(monster.attack, defenceRating(defence.level, totals.armour))) {
      hp -= dice.between(1, monster.maxHit);
    }
    defence.add(earned);
    vitality.add(Math.floor(earned / 2));
    if (hp <= 0) {
      ended = true;
      knockedOut = true;
      return;
    }
    const most = maxHpFor(vitality.level);
    while (food > 0 && heals > 0 && hp * 100 < state.eatAt * most) {
      hp = Math.min(most, hp + heals);
      food -= 1;
      eaten += 1;
    }
  };

  while (!ended) {
    if (foeHp === 0) {
      // Between monsters: the only thing to happen is the next one arriving.
      if (foeMs > time) {
        foeMs -= time;
        break;
      }
      time -= foeMs;
      foeHp = monster.hp;
      playerMs = PLAYER_ATTACK_MS;
      foeMs = monster.speedMs;
      continue;
    }
    const step = Math.min(playerMs, foeMs);
    if (step > time) {
      playerMs -= time;
      foeMs -= time;
      break;
    }
    time -= step;
    playerMs -= step;
    foeMs -= step;
    if (playerMs === 0) {
      // Arrows taken off mid-fight are noticed when the next shot needs one.
      if (ranged && ammo === 0) {
        ended = true;
        break;
      }
      strike();
      // The last arrow ends the fight on the shot that uses it, as the last
      // of a material ends an action on the completion that uses it.
      if (ranged && ammo === 0) ended = true;
      if (foeHp === 0 || ended) continue;
    }
    if (foeMs === 0) struck();
  }

  // Assigned inside the closures above, which the compiler does not follow.
  const dropped = loot as Record<string, number> | null;
  const banked = bank as Record<string, number> | null;
  const learnt = record as MonsterRecord | null;
  const skills = { ...state.skills };
  // A skill gains an entry only once it has XP, as everywhere else.
  for (const [id, trained] of [
    [skill, attacking],
    [DEFENCE, defence],
    [VITALITY, vitality],
  ] as const) {
    if (trained.xp !== (state.skills[id] ?? 0)) skills[id] = trained.xp;
  }
  const equipment = { ...state.equipment };
  if (ranged && state.equipment.ammo) {
    if (ammo > 0) equipment.ammo = { item: state.equipment.ammo.item, qty: ammo };
    else delete equipment.ammo;
  }
  const most = maxHpFor(vitality.level);
  const next: GameState = {
    ...state,
    skills,
    equipment,
    food: state.food && food > 0 ? { item: state.food.item, qty: food } : null,
    rng: dice.seed,
    health: !ended ? null : knockedOut ? comeRound(most) : hurt(hp, most),
    fight: ended
      ? null
      : {
          monster: monster.id,
          hp,
          foeHp,
          playerMs,
          foeMs,
          kills,
          coins,
          loot: dropped ?? fight.loot,
          eaten,
          arrows,
        },
  };
  if (banked) next.bank = banked;
  if (coins !== fight.coins) next.coins = state.coins + coins - fight.coins;
  if (learnt) next.bestiary = { ...state.bestiary, [monster.id]: learnt };
  if (hunting && hunted !== hunting.done) next.bounty = { ...hunting, done: hunted };
  return { state: next, left: ended ? time : 0 };
}

/**
 * Why a fight under way in `before` is over in `after`, when only time passed
 * between them; null if it is not over. Read from what is left, since a fight
 * ends only three ways: its monster gone from the tables, a bow with no
 * arrows left (the last one ends it, so a death never leaves the quiver
 * empty), or the character's death.
 */
export function fightEnded(before: GameState, after: GameState, content: Content): FightEnd | null {
  if (!before.fight || after.fight) return null;
  if (!monsterDef(content, before.fight.monster)) return 'gone';
  if (combatStyle(after, content) === 'ranged' && !after.equipment.ammo) return 'no_arrows';
  return 'died';
}
