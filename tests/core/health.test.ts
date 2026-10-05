import { describe, expect, it } from 'vitest';
import { advance, startAction } from '../../src/core/actions';
import { catchUp } from '../../src/core/away';
import {
  REGEN_MS,
  hitPoints,
  maxHp,
  playerCombat,
  rest,
  startFight,
  stopFight,
} from '../../src/core/combat';
import type { Content } from '../../src/core/content';
import { settleRun } from '../../src/core/run';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';

// Hit points carry from one fight to the next and come back slowly out of
// one. Tables of the test's own.
const item = (id: string, extra = {}) => ({ id, name: id, description: '', value: 1, ...extra });
const content: Content = {
  skills: {
    melee: { id: 'melee', name: 'Melee', verb: 'Fighting', group: 'Combat' },
    defence: { id: 'defence', name: 'Defence', verb: 'Fighting', group: 'Combat' },
    vitality: { id: 'vitality', name: 'Vitality', verb: 'Fighting', group: 'Combat' },
    digging: { id: 'digging', name: 'Digging', verb: 'Digging', group: 'Gathering' },
  },
  items: {
    sword: item('sword', { equip: { slot: 'main_hand', style: 'melee', attack: 6, strength: 5 } }),
    fish: item('fish', { heals: 6 }),
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
      always: [],
      rare: [],
    },
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
      always: [],
      rare: [],
    },
  },
};

const HOUR = 60 * 60 * 1000;
const ok = (result: { ok: true; state: GameState } | { ok: false; reason: string }): GameState => {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};
/** A level-1 swordsman (20 hit points) with `hp` of them. */
const hurtAt = (hp: number, extra: Partial<GameState> = {}): GameState => ({
  ...newGame('Cody', 1),
  equipment: { main_hand: { item: 'sword', qty: 1 } },
  health: { hp, regenMs: 0 },
  ...extra,
});

describe('healing out of a fight', () => {
  it('gives back a hit point every six seconds, carrying the time towards the next', () => {
    const start = hurtAt(5);
    expect(rest(start, REGEN_MS - 1).health).toEqual({ hp: 5, regenMs: REGEN_MS - 1 });
    expect(rest(start, REGEN_MS).health).toEqual({ hp: 6, regenMs: 0 });
    expect(rest(start, 3 * REGEN_MS + 7).health).toEqual({ hp: 8, regenMs: 7 });
  });

  it('stops at full health, which is no health kept at all', () => {
    expect(rest(hurtAt(19), REGEN_MS).health).toBeNull();
    expect(rest(hurtAt(19), HOUR).health).toBeNull();
    const fresh = newGame('Cody', 1);
    expect(rest(fresh, HOUR)).toBe(fresh);
    expect(hitPoints(fresh)).toBe(20);
  });

  it('happens while idle, while doing something else, and while away', () => {
    expect(advance(hurtAt(5), 2 * REGEN_MS, content).health).toEqual({ hp: 7, regenMs: 0 });
    const digging = ok(startAction(hurtAt(5), 'dig', content));
    const dug = advance(digging, 2 * REGEN_MS, content);
    expect(dug.health).toEqual({ hp: 7, regenMs: 0 });
    expect(dug.bank.mud).toBe(12);
    // Away and idle: healed, and nothing to report.
    expect(catchUp(hurtAt(5), HOUR, content)).toEqual({
      state: { ...hurtAt(5), health: null },
      report: null,
    });
  });

  it('lands in the same place however the time is cut', () => {
    const start = ok(startAction(hurtAt(2), 'dig', content));
    const total = 60 * 1000 + 17;
    const whole = advance(start, total, content);
    let r = 3;
    let framed = start;
    for (let spent = 0; spent < total;) {
      r = (r * 48271) % 2147483647;
      const step = Math.min(1 + (r % 40), total - spent);
      framed = advance(framed, step, content);
      spent += step;
    }
    expect(framed).toEqual(whole);
    expect(whole.health).toEqual({ hp: 12, regenMs: 17 });
  });
});

describe('hit points between fights', () => {
  it('carry into the next fight, and out of one that is stopped', () => {
    const fighting = ok(startFight(hurtAt(12), 'rat', content));
    expect(fighting.fight!.hp).toBe(12);
    expect(fighting.health).toBeNull();
    expect(playerCombat(fighting, content)).toMatchObject({ hp: 12, maxHp: 20 });
    const stopped = stopFight({ ...fighting, fight: { ...fighting.fight!, hp: 9 } });
    expect(stopped.fight).toBeNull();
    expect(stopped.health).toEqual({ hp: 9, regenMs: 0 });
    expect(playerCombat(stopped, content).hp).toBe(9);
  });

  it('carry out of a fight left for something else', () => {
    const fighting = ok(startFight(hurtAt(12), 'rat', content));
    const digging = ok(startAction(fighting, 'dig', content));
    expect(digging.health).toEqual({ hp: 12, regenMs: 0 });
  });

  it('are topped up from the food slot before a fight starts below the line', () => {
    const start = hurtAt(3, { food: { item: 'fish', qty: 5 }, eatAt: 60 });
    const fighting = ok(startFight(start, 'rat', content));
    // 3 and 9 are below 60% of 20; 15 is not.
    expect(fighting.fight).toMatchObject({ hp: 15, eaten: 2 });
    expect(fighting.food).toEqual({ item: 'fish', qty: 3 });
    const fed = ok(startFight(hurtAt(15, { food: { item: 'fish', qty: 5 } }), 'rat', content));
    expect(fed.fight).toMatchObject({ hp: 15, eaten: 0 });
  });

  it('come back a tenth at a time after a knock-out, which then heals', () => {
    const start = ok(startFight(hurtAt(20), 'brute', content));
    const after = advance(start, 60_000, content);
    expect(after.fight).toBeNull();
    // Comes round with a tenth of 20, and has been healing since.
    expect(after.health!.hp).toBeGreaterThanOrEqual(2);
    expect(after.health!.hp).toBeLessThan(20);
    expect(advance(after, HOUR, content).health).toBeNull();
  });

  it('start a fresh character, or one healed, at full health', () => {
    const fighting = ok(startFight({ ...hurtAt(1), health: null }, 'rat', content));
    expect(fighting.fight!.hp).toBe(20);
  });

  it('are the most there can be for a character who levels Vitality while hurt', () => {
    const levelled = { ...hurtAt(10), skills: { vitality: xpForLevel(5) } };
    expect(maxHp(levelled)).toBe(36);
    expect(rest(levelled, 25 * REGEN_MS).health).toEqual({ hp: 35, regenMs: 0 });
    expect(rest(levelled, 26 * REGEN_MS).health).toBeNull();
  });
});

describe('a dungeon run', () => {
  it('brings its hit points home when it says what they were', () => {
    expect(settleRun(newGame('Cody', 1), { hp: 7 }).health).toEqual({ hp: 7, regenMs: 0 });
    expect(settleRun(hurtAt(5), {}).health).toEqual({ hp: 5, regenMs: 0 });
    expect(settleRun(hurtAt(5), { hp: 25 }).health).toBeNull();
    // Knocked out in the dungeon: comes round as from any other knock-out.
    expect(settleRun(newGame('Cody', 1), { hp: 0 }).health).toEqual({ hp: 2, regenMs: 0 });
  });
});
