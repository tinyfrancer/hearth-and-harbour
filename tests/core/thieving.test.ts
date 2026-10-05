import { describe, expect, it } from 'vitest';
import { advance, durationAt, startAction, stopAction } from '../../src/core/actions';
import { catchUp } from '../../src/core/away';
import { startFight } from '../../src/core/combat';
import type { ActionDef, Content } from '../../src/core/content';
import { MAX_STEAL_CHANCE, markChance, stealChance, thiefRating } from '../../src/core/thieving';
import { masteryLevel, newGame, skillLevel, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';

// Tables of the test's own: the rules are checked apart from the game's numbers.
const item = (id: string, extra = {}) => ({ id, name: id, description: '', value: 1, ...extra });
const mark = (id: string, level: number, extra: Partial<ActionDef> = {}): ActionDef => ({
  id,
  skill: 'thieving',
  name: id,
  level,
  durationMs: 3000,
  xp: 20,
  gives: [],
  steal: {
    description: '',
    difficulty: 12,
    stunMs: 4000,
    coins: [1, 5],
    loot: [{ item: 'gem', min: 1, max: 2, oneIn: 5 }],
  },
  ...extra,
});
const content: Content = {
  skills: {
    thieving: { id: 'thieving', name: 'Thieving', verb: 'Robbing', group: 'Roguery' },
    melee: { id: 'melee', name: 'Melee', verb: 'Fighting', group: 'Combat' },
    digging: { id: 'digging', name: 'Digging', verb: 'Digging', group: 'Gathering' },
  },
  items: {
    gem: item('gem'),
    mud: item('mud'),
    // A potion that names thieving: it still does not help a theft.
    tonic: item('tonic', {
      potion: {
        charges: 50,
        skills: ['thieving', 'digging'],
        effect: { kind: 'speed', percent: 50 },
      },
    }),
  },
  actions: {
    snooze: mark('snooze', 1),
    vault: mark('vault', 10, {
      durationMs: 5000,
      xp: 60,
      steal: {
        description: '',
        difficulty: 60,
        stunMs: 5000,
        coins: [20, 40],
        loot: [],
      },
    }),
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
  },
};

const HOUR = 60 * 60 * 1000;

const ok = (result: { ok: true; state: GameState } | { ok: false; reason: string }): GameState => {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

/** A thief made at `seed`, robbing `markId`. */
function thief(markId = 'snooze', { seed = 1, level = 1, extra = {} as Partial<GameState> } = {}) {
  const state: GameState = {
    ...newGame('Cody', seed),
    skills: level > 1 ? { thieving: xpForLevel(level) } : {},
    ...extra,
  };
  return ok(startAction(state, markId, content));
}

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

/** The first moment, to the millisecond, that something is true (it must stay true). */
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
const caught = (state: GameState): number => state.marks.snooze?.caught ?? 0;
const picked = (state: GameState): number => state.marks.snooze?.picked ?? 0;

describe('the formulas', () => {
  it('rate a thief at 10, the level, and half the mastery level rounded down', () => {
    expect(thiefRating(1, 1)).toBe(11);
    expect(thiefRating(10, 9)).toBe(24);
    expect(thiefRating(20, 40)).toBe(50);
  });

  it('succeed with the chance rating / (rating + difficulty), never above 95%', () => {
    expect(stealChance(10, 10)).toBe(0.5);
    expect(stealChance(30, 10)).toBe(0.75);
    expect(stealChance(1000, 1)).toBe(MAX_STEAL_CHANCE);
  });

  it('read the character: the chance rises with level and with mastery of the mark', () => {
    const fresh = newGame('Cody', 0);
    const snooze = content.actions.snooze!;
    expect(markChance(fresh, snooze)).toBeCloseTo(11 / 23);
    const levelled = { ...fresh, skills: { thieving: xpForLevel(5) } };
    expect(markChance(levelled, snooze)).toBeCloseTo(15 / 27);
    const practised = { ...levelled, mastery: { snooze: xpForLevel(6) } };
    expect(markChance(practised, snooze)).toBeCloseTo(18 / 30);
  });

  it('keep an attempt at its set time: mastery makes a theft surer, not quicker', () => {
    expect(durationAt(content.actions.snooze!, 1)).toBe(3000);
    expect(durationAt(content.actions.snooze!, 60)).toBe(3000);
  });
});

describe('a theft, attempt by attempt', () => {
  const start = thief();

  it('starts at the level it needs and is an action like any other', () => {
    expect(start.action).toEqual({ id: 'snooze', progressMs: 0 });
    expect(startAction(newGame('Cody', 1), 'vault', content)).toEqual({
      ok: false,
      reason: 'Needs Thieving level 10.',
    });
    expect(stopAction(start).action).toBeNull();
  });

  it('does nothing with no time, and never changes the state it was given', () => {
    expect(advance(start, 0, content)).toBe(start);
    expect(advance(start, -5, content)).toBe(start);
    const before = structuredClone(start);
    advance(start, HOUR, content);
    expect(start).toEqual(before);
  });

  it('rolls no dice until an attempt is made, and rolls them on it', () => {
    const waiting = advance(start, 2999, content);
    expect(waiting.rng).toBe(start.rng);
    expect(waiting.action).toEqual({ id: 'snooze', progressMs: 2999 });
    const tried = advance(start, 3000, content);
    expect(tried.rng).not.toBe(start.rng);
    expect(picked(tried) + caught(tried)).toBe(1);
  });

  it('pays coins, XP, mastery and sometimes loot for a success, and learns what it gives up', () => {
    const hour = advance(start, HOUR, content);
    const { picked: wins, caught: losses, seen } = hour.marks.snooze!;
    expect(wins).toBeGreaterThan(400);
    expect(losses).toBeGreaterThan(50);
    expect(hour.skills.thieving).toBe(20 * wins);
    expect(hour.mastery.snooze).toBe(36 * wins);
    expect(hour.coins).toBeGreaterThanOrEqual(wins);
    expect(hour.coins).toBeLessThanOrEqual(5 * wins);
    // One in five successes finds a gem or two.
    expect(hour.bank.gem! / wins).toBeGreaterThan(0.2);
    expect(hour.bank.gem! / wins).toBeLessThan(0.4);
    expect(seen).toEqual(['gem']);
  });

  it('stuns a thief who is caught, rolls nothing while stunned, and costs nothing else', () => {
    const at = firstMoment(start, (state) => caught(state) > 0);
    const before = advance(start, at - 1, content);
    const nabbed = advance(start, at, content);
    expect(nabbed.action).toEqual({ id: 'snooze', progressMs: 0, stunMs: 4000 });
    // No fine, nothing taken, no hurt: only the time.
    expect(nabbed.coins).toBe(before.coins);
    expect(nabbed.bank).toEqual(before.bank);
    expect(nabbed.skills).toEqual(before.skills);
    expect(nabbed.health).toBeNull();
    const still = advance(nabbed, 3999, content);
    expect(still.action).toEqual({ id: 'snooze', progressMs: 0, stunMs: 1 });
    expect(still.rng).toBe(nabbed.rng);
    const free = advance(nabbed, 4000, content);
    expect(free.action).toEqual({ id: 'snooze', progressMs: 0 });
    // The next attempt is a whole attempt's time after the stun.
    expect(advance(nabbed, 4000 + 2999, content).rng).toBe(nabbed.rng);
    expect(advance(nabbed, 4000 + 3000, content).rng).not.toBe(nabbed.rng);
  });

  it('is exactly repeatable from a save', () => {
    const half = advance(start, HOUR / 2, content);
    const reloaded = JSON.parse(JSON.stringify(half)) as GameState;
    expect(advance(reloaded, HOUR / 2, content)).toEqual(advance(half, HOUR / 2, content));
    expect(advance(half, HOUR / 2, content)).toEqual(advance(start, HOUR, content));
  });

  it('goes differently with different dice', () => {
    const other = { ...start, rng: start.rng + 1 };
    expect(advance(other, HOUR, content).marks).not.toEqual(advance(start, HOUR, content).marks);
  });

  it('is not helped by a potion, which keeps its charges for what it does help', () => {
    const dosed = { ...start, potion: { item: 'tonic', charges: 50 } };
    const hour = advance(dosed, HOUR, content);
    expect(hour.potion).toEqual({ item: 'tonic', charges: 50 });
    expect(hour.marks).toEqual(advance(start, HOUR, content).marks);
  });

  it('stops a fight to rob, and robbing to fight', () => {
    const fighting = ok(startFight(start, 'rat', content));
    expect(fighting.action).toBeNull();
    const back = ok(startAction(advance(fighting, 5000, content), 'snooze', content));
    expect(back.fight).toBeNull();
    expect(back.action).toEqual({ id: 'snooze', progressMs: 0 });
  });
});

// The promise the whole game rests on: time away gives exactly what the same
// time of live play would have, dice and all.
describe('however the time is cut up', () => {
  it('lands in the same place across random frames, through stuns and level-ups', () => {
    const start = thief();
    const total = 30 * 60 * 1000;
    const whole = advance(start, total, content);
    expect(caught(whole)).toBeGreaterThan(20);
    expect(skillLevel(whole, 'thieving')).toBeGreaterThan(5);
    expect(inFrames(start, total)).toEqual(whole);
    expect(inFrames(start, total, 77)).toEqual(whole);
  });

  it('lands in the same place cut inside a stun, and on either side of it', () => {
    const start = thief();
    const at = firstMoment(start, (state) => caught(state) > 2);
    expectCutsAgree(start, 10 * 60 * 1000, [
      ...around(at),
      at + 1234,
      ...around(at + 4000),
      ...around(at + 4000 + 3000),
    ]);
  });

  it('lands in the same place cut on the level-up that changes the chance', () => {
    const start = thief();
    const at = firstMoment(start, (state) => skillLevel(state, 'thieving') >= 3);
    const before = advance(start, at - 1, content);
    const after = advance(start, at, content);
    expect(markChance(after, content.actions.snooze!)).toBeGreaterThan(
      markChance(before, content.actions.snooze!),
    );
    expectCutsAgree(start, 20 * 60 * 1000, [...around(at), ...around(at + 3000)]);
  });

  it('lands in the same place cut on a mastery level that changes the chance', () => {
    const start = thief();
    // Half the mastery level, rounded down: 4 adds one to the rating that 3 did not.
    const at = firstMoment(start, (state) => masteryLevel(state, 'snooze') >= 4);
    const before = advance(start, at - 1, content);
    const after = advance(start, at, content);
    expect(markChance(after, content.actions.snooze!)).toBeGreaterThan(
      markChance({ ...after, mastery: before.mastery }, content.actions.snooze!),
    );
    expectCutsAgree(start, 20 * 60 * 1000, [...around(at), at + 1500]);
  });

  it('gives a night away exactly what a night of 16 ms frames gives', () => {
    const start = thief('vault', { level: 10 });
    const night = 8 * HOUR + 1234;
    let live = start;
    for (let spent = 0; spent < night; spent += 16) {
      live = advance(live, Math.min(16, night - spent), content);
    }
    const away = catchUp(start, night, content);
    expect(away.state).toEqual(live);
    expect(away.state.marks.vault!.picked).toBeGreaterThan(1000);
  });
});

describe('the away report for a theft', () => {
  it('counts attempts, successes, times caught, coins and loot', () => {
    const start = thief('snooze', {
      extra: { coins: 7, marks: { snooze: { picked: 3, caught: 1, seen: [] } } },
    });
    const { state, report } = catchUp(start, 2 * HOUR, content);
    const record = state.marks.snooze!;
    expect(report).toMatchObject({
      actionId: 'snooze',
      fight: null,
      theft: {
        mark: 'snooze',
        picked: record.picked - 3,
        caught: record.caught - 1,
        attempts: record.picked + record.caught - 4,
      },
      coins: state.coins - 7,
      stopped: null,
    });
    expect(report!.items.gem).toBe(state.bank.gem);
    expect(report!.xp.thieving).toBe(state.skills.thieving);
    expect(report!.levels.thieving!.to).toBeGreaterThan(1);
    expect(report!.mastery.snooze!.to).toBeGreaterThan(1);
  });
});
