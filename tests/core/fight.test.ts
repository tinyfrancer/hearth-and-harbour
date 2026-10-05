import { describe, expect, it } from 'vitest';
import { advance, startAction } from '../../src/core/actions';
import { catchUp } from '../../src/core/away';
import {
  DEFENCE_XP_PER_MAX_HIT,
  PLAYER_ATTACK_MS,
  RESPAWN_MS,
  XP_PER_DAMAGE,
  startFight,
} from '../../src/core/combat';
import type { Content } from '../../src/core/content';
import { fightEnded } from '../../src/core/fight';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';

// Tables of the test's own: the rules are checked apart from the game's numbers.
const skill = (id: string, name: string) => ({ id, name, verb: 'Fighting', group: 'Combat' });
const item = (id: string, extra = {}) => ({ id, name: id, description: '', value: 1, ...extra });
const content: Content = {
  skills: {
    melee: skill('melee', 'Melee'),
    ranged: skill('ranged', 'Ranged'),
    defence: skill('defence', 'Defence'),
    vitality: skill('vitality', 'Vitality'),
    digging: { id: 'digging', name: 'Digging', verb: 'Digging', group: 'Gathering' },
  },
  items: {
    sword: item('sword', { equip: { slot: 'main_hand', style: 'melee', attack: 6, strength: 5 } }),
    bow: item('bow', {
      equip: { slot: 'main_hand', twoHanded: true, style: 'ranged', attack: 8, strength: 6 },
    }),
    arrows: item('arrows', { equip: { slot: 'ammo', style: 'ranged', strength: 3 } }),
    tunic: item('tunic', { equip: { slot: 'body', armour: 2 } }),
    fish: item('fish', { heals: 6 }),
    hide: item('hide'),
    gem: item('gem'),
    mud: item('mud'),
  },
  actions: {
    dig: {
      id: 'dig',
      skill: 'digging',
      name: 'Dig',
      level: 1,
      durationMs: 1000,
      xp: 5,
      gives: [{ item: 'mud', qty: 1 }],
    },
  },
  areas: { yard: { id: 'yard', name: 'Yard', description: '' } },
  monsters: {
    rat: {
      id: 'rat',
      name: 'Rat',
      description: '',
      area: 'yard',
      level: 1,
      hp: 8,
      attack: 9,
      defence: 6,
      maxHit: 2,
      speedMs: 2400,
      coins: [1, 3],
      always: [{ item: 'hide', min: 1, max: 1 }],
      rare: [{ item: 'gem', min: 1, max: 2, oneIn: 6 }],
    },
    // Too much for anyone in these tables, and quick about it.
    brute: {
      id: 'brute',
      name: 'Brute',
      description: '',
      area: 'yard',
      level: 30,
      hp: 120,
      attack: 60,
      defence: 40,
      maxHit: 7,
      speedMs: 1700,
      coins: [10, 10],
      always: [{ item: 'hide', min: 2, max: 3 }],
      rare: [],
    },
  },
};

const HOUR = 60 * 60 * 1000;

const ok = (result: { ok: true; state: GameState } | { ok: false; reason: string }): GameState => {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

/** A character made at `seed`, wearing what is given, with food, fighting `monster`. */
function fighter(
  monster: string,
  {
    seed = 1,
    worn = { main_hand: { item: 'sword', qty: 1 } } as GameState['equipment'],
    food = 0,
    level = 1,
    eatAt = 50,
  } = {},
): GameState {
  const xp = xpForLevel(level);
  const state: GameState = {
    ...newGame('Cody', seed),
    equipment: worn,
    food: food > 0 ? { item: 'fish', qty: food } : null,
    eatAt,
    skills: level > 1 ? { melee: xp, ranged: xp, defence: xp, vitality: xp } : {},
  };
  return ok(startFight(state, monster, content));
}

const archer = (monster: string, arrows: number, extra = {}) =>
  fighter(monster, {
    worn: { main_hand: { item: 'bow', qty: 1 }, ammo: { item: 'arrows', qty: arrows } },
    ...extra,
  });

/** The same time, given as frames of 1 to 40 ms as a live session gives them. */
function inFrames(start: GameState, total: number, seed = 5): GameState {
  let r = seed;
  const random = (): number => (r = (r * 48271) % 2147483647) / 2147483647;
  let state = start;
  for (let spent = 0; spent < total;) {
    const step = Math.min(1 + Math.floor(random() * 40), total - spent);
    state = advance(state, step, content);
    spent += step;
  }
  return state;
}

/** The first moment, to the millisecond, that something is true of a fight (it must stay true). */
function firstMoment(start: GameState, test: (state: GameState) => boolean, within = HOUR): number {
  let lo = 0;
  let hi = within;
  if (!test(advance(start, hi, content))) throw new Error('it never happens');
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (test(advance(start, mid, content))) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Whole, and in two pieces cut at each of `cuts`: all must land in the same place. */
function expectCutsAgree(start: GameState, total: number, cuts: number[]): GameState {
  const whole = advance(start, total, content);
  for (const cut of cuts) {
    expect(advance(advance(start, cut, content), total - cut, content), `cut at ${cut}`).toEqual(
      whole,
    );
  }
  return whole;
}

const around = (t: number): number[] => [t - 1, t, t + 1];

describe('a fight, blow by blow', () => {
  const ratFight = fighter('rat');

  it('opens at full health with both blows a full wait away', () => {
    expect(ratFight.fight).toEqual({
      monster: 'rat',
      hp: 20,
      foeHp: 8,
      playerMs: PLAYER_ATTACK_MS,
      foeMs: 2400,
      kills: 0,
      coins: 0,
      loot: {},
      eaten: 0,
      arrows: 0,
    });
    expect(ratFight.action).toBeNull();
  });

  it('does nothing with no time, and never changes the state it was given', () => {
    expect(advance(ratFight, 0, content)).toBe(ratFight);
    expect(advance(ratFight, -5, content)).toBe(ratFight);
    expect(advance(ratFight, Number.NaN, content)).toBe(ratFight);
    const before = structuredClone(ratFight);
    advance(ratFight, HOUR, content);
    expect(ratFight).toEqual(before);
  });

  it('rolls no dice until the first blow falls, and rolls them on it', () => {
    const waiting = advance(ratFight, PLAYER_ATTACK_MS - 1, content);
    expect(waiting.rng).toBe(ratFight.rng);
    expect(waiting.fight).toMatchObject({ playerMs: 1, foeMs: 1 });
    const struck = advance(ratFight, PLAYER_ATTACK_MS, content);
    expect(struck.rng).not.toBe(ratFight.rng);
    expect(struck.fight).toMatchObject({ playerMs: PLAYER_ATTACK_MS });
  });

  it('is exactly repeatable from a save', () => {
    const half = advance(ratFight, HOUR / 2, content);
    const reloaded = JSON.parse(JSON.stringify(half)) as GameState;
    expect(advance(reloaded, HOUR / 2, content)).toEqual(advance(half, HOUR / 2, content));
    expect(advance(half, HOUR / 2, content)).toEqual(advance(ratFight, HOUR, content));
  });

  it('goes differently with different dice', () => {
    const other = { ...ratFight, rng: ratFight.rng + 1 };
    expect(advance(other, HOUR, content).skills).not.toEqual(
      advance(ratFight, HOUR, content).skills,
    );
  });

  it('pays loot to the bank and coins to the purse, and learns what the monster drops', () => {
    const hour = advance(ratFight, HOUR, content);
    const { kills, coins, loot } = hour.fight!;
    expect(kills).toBeGreaterThan(100);
    expect(hour.bank.hide).toBe(kills);
    expect(loot.hide).toBe(kills);
    expect(coins).toBe(hour.coins);
    expect(coins).toBeGreaterThanOrEqual(kills);
    expect(coins).toBeLessThanOrEqual(3 * kills);
    // One in six kills drops one or two gems.
    expect(hour.bank.gem! / kills).toBeGreaterThan(0.15);
    expect(hour.bank.gem! / kills).toBeLessThan(0.4);
    expect(hour.bestiary).toEqual({ rat: { kills, seen: ['hide', 'gem'] } });
  });

  it('waits three seconds for the next monster, and the character gets their breath back', () => {
    const killedAt = firstMoment(ratFight, (state) => (state.fight?.kills ?? 0) > 0);
    const killed = advance(ratFight, killedAt, content);
    expect(killed.fight).toMatchObject({ foeHp: 0, foeMs: RESPAWN_MS });
    const waiting = advance(killed, RESPAWN_MS - 1, content);
    expect(waiting.fight).toMatchObject({ foeHp: 0, foeMs: 1 });
    expect(waiting.rng).toBe(killed.rng);
    const next = advance(killed, RESPAWN_MS, content);
    expect(next.fight).toMatchObject({ foeHp: 8, playerMs: PLAYER_ATTACK_MS, foeMs: 2400 });
  });

  it('splits XP: 4 a point of damage dealt, 2 a point of max hit a monster attack, half of both to Vitality', () => {
    const hour = advance(ratFight, HOUR, content);
    const { melee = 0, defence = 0, vitality = 0, ranged } = hour.skills;
    expect(ranged).toBeUndefined();
    // Every rat's eight hit points were dealt, plus the one under way.
    const dealt = 8 * hour.fight!.kills + (8 - hour.fight!.foeHp) * Number(hour.fight!.foeHp > 0);
    expect(melee).toBe(XP_PER_DAMAGE * dealt);
    expect(defence % (DEFENCE_XP_PER_MAX_HIT * 2)).toBe(0);
    expect(vitality).toBe((melee + defence) / 2);
  });

  it('never keeps a skill at no XP, nor touches another activity', () => {
    const first = advance(ratFight, 100, content);
    expect(first.skills).toEqual({});
    expect(first.action).toBeNull();
  });
});

describe('food', () => {
  it('is eaten when hit points fall below the line, and the fight goes on when it runs out', () => {
    const start = fighter('brute', { food: 3, level: 10, eatAt: 90 });
    const firstBite = firstMoment(start, (state) => (state.fight?.eaten ?? 0) > 0 || !state.fight);
    const bitten = advance(start, firstBite, content);
    expect(bitten.food).toEqual({ item: 'fish', qty: 2 });
    const outAt = firstMoment(start, (state) => state.food === null);
    const out = advance(start, outAt, content);
    expect(out.fight?.eaten ?? 3).toBe(3);
    expect(out.food).toBeNull();
  });

  it('is not eaten above the line', () => {
    const start = fighter('rat', { food: 10, level: 10, eatAt: 10 });
    expect(advance(start, HOUR, content).food).toEqual({ item: 'fish', qty: 10 });
  });
});

describe('the end of a fight', () => {
  it('comes with death: the character is idle, keeps what was won, and owes nothing', () => {
    const start = fighter('brute');
    const after = advance(start, HOUR, content);
    expect(after.fight).toBeNull();
    expect(after.action).toBeNull();
    expect(after.skills.defence).toBeGreaterThan(0);
    expect(fightEnded(start, after, content)).toBe('died');
    // Nothing more happens once it is over.
    expect(advance(after, HOUR, content)).toBe(after);
  });

  it('comes with the last arrow, on the shot that uses it', () => {
    const start = archer('rat', 5);
    const last = firstMoment(start, (state) => !state.equipment.ammo);
    const fifth = advance(start, last, content);
    expect(fifth.fight).toBeNull();
    expect(fifth.equipment).toEqual({ main_hand: { item: 'bow', qty: 1 } });
    expect(fightEnded(start, fifth, content)).toBe('no_arrows');
    const fourth = advance(start, last - 1, content);
    expect(fourth.equipment.ammo).toEqual({ item: 'arrows', qty: 1 });
    expect(fourth.fight).toMatchObject({ arrows: 4, playerMs: 1 });
    expect(fifth.skills.melee).toBeUndefined();
    expect(fifth.skills.ranged).toBeGreaterThan(0);
  });

  it('will not start with a bow and no arrows', () => {
    const state = { ...newGame('Cody', 1), equipment: { main_hand: { item: 'bow', qty: 1 } } };
    expect(startFight(state, 'rat', content)).toEqual({
      ok: false,
      reason: 'A bow needs arrows. Ready some first.',
    });
  });

  it('comes when the arrows are taken off, at the next shot', () => {
    const start = archer('rat', 50);
    const stripped = { ...start, equipment: { main_hand: { item: 'bow', qty: 1 } } };
    expect(advance(stripped, PLAYER_ATTACK_MS - 1, content).fight).not.toBeNull();
    const after = advance(stripped, PLAYER_ATTACK_MS, content);
    expect(after.fight).toBeNull();
    expect(fightEnded(stripped, after, content)).toBe('no_arrows');
  });

  it('comes when the monster is no longer in the tables', () => {
    const lost = { ...fighter('rat'), fight: { ...fighter('rat').fight!, monster: 'gone' } };
    const after = advance(lost, 1000, content);
    expect(after.fight).toBeNull();
    expect(fightEnded(lost, after, content)).toBe('gone');
  });

  it('is nothing to say about a fight still going, or none at all', () => {
    const start = fighter('rat');
    expect(fightEnded(start, advance(start, 5000, content), content)).toBeNull();
    expect(fightEnded(newGame('Cody', 1), newGame('Cody', 1), content)).toBeNull();
  });
});

describe('one thing at a time', () => {
  it('stops an action to fight, and a fight to act', () => {
    const digging = ok(startAction(newGame('Cody', 1), 'dig', content));
    const fighting = ok(startFight(digging, 'rat', content));
    expect(fighting.action).toBeNull();
    expect(fighting.fight?.monster).toBe('rat');
    const back = ok(startAction(fighting, 'dig', content));
    expect(back.fight).toBeNull();
    expect(back.action).toEqual({ id: 'dig', progressMs: 0 });
  });

  it('keeps the fight under way when the same monster is picked again', () => {
    const half = advance(fighter('rat'), 10_000, content);
    expect(ok(startFight(half, 'rat', content))).toBe(half);
    expect(ok(startFight(half, 'brute', content)).fight).toMatchObject({
      monster: 'brute',
      kills: 0,
    });
  });
});

// The promise the whole game rests on: time away gives exactly what the same
// time of live play would have, dice and all.
describe('however the time is cut up', () => {
  it('lands in the same place across random frames, through kills, respawns and level-ups', () => {
    const start = fighter('rat', { food: 20 });
    const total = 20 * 60 * 1000;
    const whole = advance(start, total, content);
    expect(whole.fight!.kills).toBeGreaterThan(30);
    expect(inFrames(start, total)).toEqual(whole);
    expect(inFrames(start, total, 77)).toEqual(whole);
  });

  it('lands in the same place cut between a kill and the next monster', () => {
    const start = fighter('rat');
    const killed = firstMoment(start, (state) => (state.fight?.kills ?? 0) > 2);
    expectCutsAgree(start, 10 * 60 * 1000, [
      ...around(killed),
      killed + 1500,
      ...around(killed + RESPAWN_MS),
    ]);
  });

  it('lands in the same place cut on the blow that kills the character', () => {
    const start = fighter('brute', { food: 4, eatAt: 70 });
    const died = firstMoment(start, (state) => state.fight === null);
    const whole = expectCutsAgree(start, HOUR, [...around(died), died - 1700, died + 5000]);
    expect(fightEnded(start, whole, content)).toBe('died');
    expect(inFrames(start, died + 10_000)).toEqual(whole);
  });

  it('lands in the same place cut on the last arrow', () => {
    const start = archer('rat', 40);
    const last = firstMoment(start, (state) => !state.equipment.ammo);
    // Forty shots' waits, and a respawn's pause for every kill before the last shot.
    const killsBefore = advance(start, last - 1, content).fight!.kills;
    expect(last).toBe(40 * PLAYER_ATTACK_MS + killsBefore * RESPAWN_MS);
    const whole = expectCutsAgree(start, HOUR, [
      ...around(last),
      ...around(last - PLAYER_ATTACK_MS),
    ]);
    expect(fightEnded(start, whole, content)).toBe('no_arrows');
    expect(inFrames(start, HOUR)).toEqual(whole);
  });

  it('lands in the same place cut on the last fish', () => {
    const start = fighter('brute', { food: 5, level: 10, eatAt: 80 });
    const lastFish = firstMoment(start, (state) => state.food === null);
    const whole = expectCutsAgree(start, HOUR, [...around(lastFish), lastFish + 999]);
    expect(whole.food).toBeNull();
    expect(inFrames(start, lastFish + 60_000)).toEqual(advance(start, lastFish + 60_000, content));
  });

  it('gives a night away exactly what a night of 16 ms frames gives', () => {
    const start = fighter('rat', { food: 50 });
    const night = 8 * HOUR + 1234;
    let live = start;
    for (let spent = 0; spent < night; spent += 16) {
      live = advance(live, Math.min(16, night - spent), content);
    }
    const away = catchUp(start, night, content);
    expect(away.state).toEqual(live);
    expect(away.state.fight!.kills).toBeGreaterThan(1000);
  });
});

describe('the away report for a fight', () => {
  it('counts kills, loot, coins, XP, food and arrows, and says how it ended', () => {
    const start = archer('rat', 300, { food: 10, eatAt: 60 });
    const { state, report } = catchUp(start, 2 * HOUR, content);
    expect(state.fight).toBeNull();
    const kills = state.bestiary.rat!.kills;
    expect(report).toMatchObject({
      actionId: null,
      fight: { monster: 'rat', kills, arrows: 300, eaten: 10 - (state.food?.qty ?? 0) },
      coins: state.coins,
      stopped: { reason: 'no_arrows' },
    });
    expect(report!.items.hide).toBe(kills);
    expect(report!.xp.ranged).toBe(state.skills.ranged);
    expect(report!.levels.ranged!.to).toBeGreaterThan(1);
  });

  it('says so when the character died', () => {
    const { report } = catchUp(fighter('brute'), HOUR, content);
    expect(report).toMatchObject({
      fight: { monster: 'brute', kills: 0 },
      stopped: { reason: 'died' },
    });
  });

  it('has nothing to stop for a fight still going', () => {
    const { report } = catchUp(fighter('rat', { food: 10 }), HOUR, content);
    expect(report).toMatchObject({
      fight: { monster: 'rat', arrows: 0 },
      stopped: null,
      potion: null,
    });
  });
});
