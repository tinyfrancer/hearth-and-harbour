import { combatLevelOf, payBounty, type BountyBook } from './bounty';
import {
  DEFENCE,
  DEFENCE_XP_PER_MAX_HIT,
  PLAYER_ATTACK_MS,
  REGEN_MS,
  VITALITY,
  XP_PER_DAMAGE,
  attackRating,
  attackSkill,
  comeRound,
  defenceRating,
  hitChance,
  hitPoints,
  hurt,
  leaveTask,
  maxHpFor,
  maxHitFor,
  rest,
  type ResultOf,
} from './combat';
import type { Content, DungeonDef, DungeonFoe, ModifierEffects } from './content';
import { dungeonDef } from './dungeons';
import { combatStyle, equipmentTotals } from './equipment';
import {
  dailyModifier,
  effectsOf,
  foeUnder,
  foodUnder,
  heroMaxHitUnder,
  idleModifier,
  localDay,
  mayIdle,
  modifierOn,
  scaled,
} from './progress';
import { Dice } from './rng';
import {
  skillLevel,
  type GameState,
  type IdleFoe,
  type IdleRun,
  type MonsterRecord,
} from './state';
import { Trained } from './xp';

/**
 * A dungeon run idle (S16: "send the hero through it idle"): once a dungeon
 * has been cleared by hand, the hero can be sent through it over and over as
 * the idle task, live or away. Each rule in a sentence:
 *
 * - A run is the dungeon's rooms in order (`DungeonDef.idle.rooms`): a walk
 *   to each, then everyone met there at once, every one of them striking the
 *   hero from the moment they are met, the hero striking the first still up.
 *   The blows are idle combat's own (`src/core/fight.ts`, `combat.ts`): the
 *   same ratings, chances, max hits, waits and XP, on the dungeon's own cast
 *   rows. What a hand only does in a scene (stepping out of a heavy blow,
 *   bracing, the tide) is not part of it: the hero sent alone is taken to
 *   have stepped out of what is telegraphed, and to have done nothing clever.
 * - No breather between foes, as in a dungeon; the hero eats from the food
 *   slot by idle combat's rule (under the eating line, after a blow lands).
 * - Between runs the hero rows home and back (`tripMs`), healing a hit point
 *   every `REGEN_MS` of it; a new run starts at once on the far side.
 * - Each run is played under the day's modifier as it sets out
 *   (`modifierOn` the local day of the run's calendar) if that is a kind
 *   one: its fight effects (`foeUnder`, `heroMaxHitUnder`, `foodUnder`) and
 *   rewards (`loot` on the regular drops, `coins`, `xp`) through the same
 *   effects as a hand run. A trade day is played plain, its catch and its
 *   bonus both left out (`idleModifier`, wave 18): the hero sent alone cannot
 *   bring more fish for a hard day, so a night away never ends at midnight.
 * - Only a share of what falls is kept (`lootPercent`: each drop, and a
 *   kill's coins, kept on a roll), and the rarest things (`activeOnly`) never
 *   fall idle. No first-clear reward and no challenge is ever paid idle, and
 *   an idle run is never a clear.
 * - Kills count to the bestiary and to a bounty held, as a dungeon's kills
 *   do; with auto bounty on, the kill that finishes one hands it in and
 *   takes the next, and the runs go on.
 * - Knocked out, the runs are over and the hero comes round as from any
 *   knock-out; out of arrows, likewise over. Potions help no combat, so none
 *   helps an idle run.
 *
 * Time: chance, so walked event by event (each walk's end, each blow, in the
 * order they fall; at the same moment the hero strikes first, then the foes in
 * their order), with the save's dice rolled only inside an event and in a
 * fixed order. However the time is cut, the same events fall at the same
 * moments and roll the same dice, so advance(a) then advance(b) equals
 * advance(a + b) exactly, and a night away equals the night in frames.
 */

/** Why runs that were going before some time passed are not any more. */
export type IdleRunEnd = 'died' | 'no_arrows' | 'gone';

/** The idle shape of a dungeon, if it has one and every foe of its rooms is in its cast. */
function idleOf(dungeon: DungeonDef | undefined): {
  dungeon: DungeonDef;
  cast: Map<string, DungeonFoe>;
} | null {
  const idle = dungeon?.idle;
  if (!dungeon || dungeon.comingSoon || !idle || idle.rooms.length === 0) return null;
  const cast = new Map((dungeon.cast ?? []).map((foe) => [foe.id, foe]));
  if (!idle.rooms.every((room) => room.foes.length > 0 && room.foes.every((id) => cast.has(id))))
    return null;
  return { dungeon, cast };
}

/** The first walk of a run: rowing out, then to the first room. */
function setOutMs(dungeon: DungeonDef): number {
  const idle = dungeon.idle!;
  return Math.max(1, idle.tripMs + idle.rooms[0]!.walkMs);
}

/**
 * Send the hero through a dungeon idle, from `now` on the app's clock with
 * the phone `utcOffset` minutes ahead of UTC (for the day's modifier). It
 * stops whatever else was running; asking again for the one running changes
 * nothing, so a double tap loses nothing.
 */
export function startIdleRun(
  state: GameState,
  dungeonId: string,
  content: Content,
  now: number,
  utcOffset = 0,
): ResultOf {
  if (state.idleRun?.dungeon === dungeonId) return { ok: true, state };
  const shape = idleOf(dungeonDef(content, dungeonId));
  if (!shape) return { ok: false, reason: 'That dungeon cannot be run idle.' };
  if (!mayIdle(state, dungeonId, content)) {
    return { ok: false, reason: `Clear ${shape.dungeon.name} by hand first.` };
  }
  if (combatStyle(state, content) === 'ranged' && !state.equipment.ammo) {
    return { ok: false, reason: 'A bow needs arrows. Ready some first.' };
  }
  const left = leaveTask(state);
  const hp = hitPoints(left);
  const offset = Math.round(utcOffset);
  return {
    ok: true,
    state: {
      ...left,
      action: null,
      fight: null,
      health: null,
      idleRun: {
        dungeon: dungeonId,
        clock: Math.max(0, Math.floor(now)),
        utcOffset: offset,
        modifier: idleModifier(content, dailyModifier(now, dungeonId, content, offset)),
        room: 0,
        walkMs: setOutMs(shape.dungeon),
        hp,
        playerMs: PLAYER_ATTACK_MS,
        foes: [],
        runs: 0,
        kills: 0,
        coins: 0,
        loot: {},
        eaten: 0,
        arrows: 0,
      },
    },
  };
}

/** Call the hero home: the runs stop, and the hit points come out with them. */
export function stopIdleRun(state: GameState): GameState {
  return state.idleRun ? leaveTask(state) : state;
}

/**
 * Set the runs' calendar to the app's clock: when the idle clock starts again
 * after a dungeon played by hand, and after time away is paid (a gap longer
 * than the 24-hour cap is not all paid). Only the calendar moves: nothing is
 * paid, and the run under way keeps the modifier it set out with.
 */
export function alignIdleClock(state: GameState, now: number, utcOffset = 0): GameState {
  const run = state.idleRun;
  if (!run) return state;
  const clock = Math.max(0, Math.floor(now));
  const offset = Math.round(utcOffset);
  if (run.clock === clock && run.utcOffset === offset) return state;
  return { ...state, idleRun: { ...run, clock, utcOffset: offset } };
}

/** Move idle runs forward by `ms`: their half of `advance`. A run that ends leaves the rest to heal in. */
export function advanceIdleRun(state: GameState, ms: number, content: Content): GameState {
  const { state: after, left } = walkIdle(state, ms, content);
  return left > 0 ? rest(after, left) : after;
}

/** The walk, and the time left when the runs ended (0 if they did not). */
function walkIdle(
  state: GameState,
  ms: number,
  content: Content,
): { state: GameState; left: number } {
  const run = state.idleRun;
  if (!run || !(ms > 0)) return { state, left: 0 };
  const shape = idleOf(dungeonDef(content, run.dungeon));
  // A save can outlive the dungeon (or a foe) it was running; stop rather than guess.
  if (!shape || run.room >= shape.dungeon.idle!.rooms.length) {
    return { state: leaveTask(state), left: ms };
  }
  const { dungeon, cast } = shape;
  const idle = dungeon.idle!;
  if (run.foes.some((foe) => !cast.has(foe.id))) return { state: leaveTask(state), left: ms };
  const activeOnly = new Set(idle.activeOnly ?? []);

  const totals = equipmentTotals(state, content);
  const ranged = totals.style === 'ranged';
  const skill = attackSkill(totals.style);
  const attacking = new Trained(state.skills[skill] ?? 0);
  const defence = new Trained(state.skills[DEFENCE] ?? 0);
  const vitality = new Trained(state.skills[VITALITY] ?? 0);
  const otherAttack = skillLevel(state, attackSkill(ranged ? 'melee' : 'ranged'));
  const dice = new Dice(state.rng);
  const healing = state.food ? (content.items[state.food.item]?.heals ?? 0) : 0;

  let { room, walkMs, hp, playerMs, runs, kills, coins, eaten, arrows } = run;
  // A run saved before wave 18 may have set out under a trade day: from now it is played plain.
  let modifier = idleModifier(content, run.modifier);
  let foes: IdleFoe[] = run.foes.map((foe) => ({ ...foe }));
  let food = state.food?.qty ?? 0;
  let ammo = state.equipment.ammo?.qty ?? 0;
  const loot: Record<string, number> = { ...run.loot };
  let bank: Record<string, number> | null = null;
  let records: Record<string, MonsterRecord> | null = null;
  let finished = 0;
  let ended: IdleRunEnd | null = null;
  let time = ms;
  let hunting = state.bounty;
  let hunted = hunting?.done ?? 0;
  let book: BountyBook | null = null;

  /** The run's foes as its modifier makes them, worked out once a run. */
  let effects: ModifierEffects = effectsOf(content, modifier);
  let heals = foodUnder(healing, effects);
  const rows = new Map<string, DungeonFoe>();
  const rowsUnder = (): void => {
    rows.clear();
    for (const [id, foe] of cast) rows.set(id, foeUnder(foe, effects));
    heals = foodUnder(healing, effects);
  };
  rowsUnder();
  const gain = (amount: number): number => scaled(amount, effects.xp);

  const claim = (): void => {
    const level = combatLevelOf(
      Math.max(attacking.level, otherAttack),
      defence.level,
      vitality.level,
    );
    const was = book ?? state;
    book = payBounty(
      {
        bounty: { ...hunting!, done: hunted },
        bountyPoints: was.bountyPoints,
        coins: was.coins,
        stats: was.stats,
        lastBounty: was.lastBounty,
        bountyBoard: was.bountyBoard,
      },
      content,
      level,
      dice,
      true,
    );
    hunting = book.bounty;
    hunted = 0;
  };

  const kill = (foe: IdleFoe): void => {
    const row = cast.get(foe.id)!;
    kills += 1;
    bank ??= { ...state.bank };
    records ??= {};
    const record = (records[foe.id] ??= {
      kills: state.bestiary[foe.id]?.kills ?? 0,
      seen: [...(state.bestiary[foe.id]?.seen ?? [])],
    });
    record.kills += 1;
    if (hunting?.monster === foe.id && hunted < hunting.count) hunted += 1;
    const kept = (): boolean => dice.next() * 100 < idle.lootPercent;
    // The purse is one drop: kept whole or not at all.
    const purse = dice.between(row.coins[0], row.coins[1]);
    if (kept()) coins += scaled(purse, effects.coins);
    const drop = (item: string, qty: number): void => {
      if (qty <= 0) return;
      loot[item] = (loot[item] ?? 0) + qty;
      bank![item] = (bank![item] ?? 0) + qty;
      if (!record.seen.includes(item)) record.seen.push(item);
    };
    for (const { item, min, max } of row.always) {
      if (activeOnly.has(item) || !kept()) continue;
      drop(item, scaled(dice.between(min, max), effects.loot));
    }
    for (const { item, min, max, oneIn } of row.rare) {
      if (activeOnly.has(item) || dice.next() * oneIn >= 1 || !kept()) continue;
      drop(item, dice.between(min, max));
    }
    if (row.pick && row.pick.items.length > 0 && dice.next() * row.pick.oneIn < 1) {
      const item = row.pick.items[Math.floor(dice.next() * row.pick.items.length)]!;
      if (!activeOnly.has(item) && kept()) drop(item, 1);
    }
    if (state.autoBounty && hunting && hunting.monster === foe.id && hunted >= hunting.count) {
      claim();
    }
  };

  /** The room's foes arrive, and the hero squares up. */
  const meet = (): void => {
    foes = idle.rooms[room]!.foes.map((id) => {
      const row = rows.get(id)!;
      return { id, hp: row.hp, ms: row.speedMs };
    });
    playerMs = PLAYER_ATTACK_MS;
  };

  /** A room cleared: on to the next, or the run done and the next set out. */
  const cleared = (): void => {
    foes = [];
    room += 1;
    if (room < idle.rooms.length) {
      walkMs = idle.rooms[room]!.walkMs;
      return;
    }
    runs += 1;
    finished += 1;
    room = 0;
    // Rowing home and back: a hit point every REGEN_MS of it, at once.
    hp = Math.min(maxHpFor(vitality.level), hp + Math.floor(idle.tripMs / REGEN_MS));
    // The next run sets out under its own day's modifier, if it is a kind one.
    const at = run.clock + (ms - time);
    modifier = idleModifier(content, modifierOn(localDay(at, run.utcOffset), dungeon.id, content));
    effects = effectsOf(content, modifier);
    rowsUnder();
    walkMs = setOutMs(dungeon);
  };

  const strike = (): void => {
    playerMs = PLAYER_ATTACK_MS;
    if (ranged) {
      ammo -= 1;
      arrows += 1;
    }
    const target = foes[0]!;
    const row = rows.get(target.id)!;
    if (dice.next() < hitChance(attackRating(attacking.level, totals.attack), row.defence)) {
      const most = heroMaxHitUnder(maxHitFor(attacking.level, totals.strength), effects);
      const dealt = Math.min(dice.between(1, most), target.hp);
      target.hp -= dealt;
      attacking.add(gain(XP_PER_DAMAGE * dealt));
      vitality.add(gain(Math.floor((XP_PER_DAMAGE * dealt) / 2)));
    }
    if (target.hp === 0) {
      foes.shift();
      kill(target);
      if (foes.length === 0) cleared();
    }
  };

  const struck = (foe: IdleFoe): void => {
    const row = rows.get(foe.id)!;
    foe.ms = row.speedMs;
    const earned = DEFENCE_XP_PER_MAX_HIT * row.maxHit;
    if (dice.next() < hitChance(row.attack, defenceRating(defence.level, totals.armour))) {
      hp -= dice.between(1, row.maxHit);
    }
    defence.add(gain(earned));
    vitality.add(gain(Math.floor(earned / 2)));
    if (hp <= 0) {
      ended = 'died';
      return;
    }
    if (effects.noFood) return;
    const most = maxHpFor(vitality.level);
    while (food > 0 && heals > 0 && hp * 100 < state.eatAt * most) {
      hp = Math.min(most, hp + heals);
      food -= 1;
      eaten += 1;
    }
  };

  while (!ended) {
    if (foes.length === 0) {
      // Walking (or rowing): the only thing to happen is arriving.
      if (walkMs > time) {
        walkMs -= time;
        time = 0;
        break;
      }
      time -= walkMs;
      walkMs = 0;
      meet();
      continue;
    }
    let step = playerMs;
    for (const foe of foes) step = Math.min(step, foe.ms);
    if (step > time) {
      playerMs -= time;
      for (const foe of foes) foe.ms -= time;
      time = 0;
      break;
    }
    time -= step;
    playerMs -= step;
    for (const foe of foes) foe.ms -= step;
    if (playerMs === 0) {
      if (ranged && ammo === 0) {
        ended = 'no_arrows';
        break;
      }
      strike();
      if (ranged && ammo === 0) ended = 'no_arrows';
      if (ended) break;
      // A room cleared by the blow: its foes struck nothing at the same moment.
      if (foes.length === 0) continue;
    }
    for (const foe of [...foes]) {
      if (foe.ms === 0) struck(foe);
      if (ended) break;
    }
  }

  // Assigned inside the closures above, which the compiler does not follow.
  const end = ended as IdleRunEnd | null;
  const banked = bank as Record<string, number> | null;
  const learnt = records as Record<string, MonsterRecord> | null;
  const paid = book as BountyBook | null;
  const skills = { ...state.skills };
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
  const going: IdleRun | null = end
    ? null
    : {
        ...run,
        clock: run.clock + ms,
        modifier,
        room,
        walkMs,
        hp,
        playerMs,
        foes,
        runs,
        kills,
        coins,
        loot,
        eaten,
        arrows,
      };
  const next: GameState = {
    ...state,
    skills,
    equipment,
    food: state.food && food > 0 ? { item: state.food.item, qty: food } : null,
    rng: dice.seed,
    health: !end ? null : end === 'died' ? comeRound(most) : hurt(hp, most),
    idleRun: going,
  };
  if (banked) next.bank = banked;
  if (coins !== run.coins) next.coins = state.coins + coins - run.coins;
  if (learnt) next.bestiary = { ...state.bestiary, ...learnt };
  if (finished > 0) {
    const record = state.dungeons[dungeon.id] ?? { clears: 0 };
    next.dungeons = {
      ...state.dungeons,
      [dungeon.id]: { ...record, idleRuns: (record.idleRuns ?? 0) + finished },
    };
  }
  if (paid) {
    next.coins = (next.coins ?? state.coins) + paid.coins - state.coins;
    next.bountyPoints = paid.bountyPoints;
    next.stats = paid.stats;
    next.lastBounty = paid.lastBounty;
    next.bountyBoard = paid.bountyBoard;
    next.bounty = paid.bounty && { ...paid.bounty, done: hunted };
  } else if (hunting && hunted !== hunting.done) {
    next.bounty = { ...hunting, done: hunted };
  }
  return { state: next, left: end ? time : 0 };
}

/**
 * Why idle runs going in `before` are over in `after`, when only time passed;
 * null if they are not. Read from what is left, as `fightEnded` is.
 */
export function idleRunEnded(
  before: GameState,
  after: GameState,
  content: Content,
): IdleRunEnd | null {
  if (!before.idleRun || after.idleRun) return null;
  if (!idleOf(dungeonDef(content, before.idleRun.dungeon))) return 'gone';
  if (combatStyle(after, content) === 'ranged' && !after.equipment.ammo) return 'no_arrows';
  return 'died';
}
