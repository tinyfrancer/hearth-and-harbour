import { describe, expect, it } from 'vitest';
import {
  advance,
  durationAt,
  masteryXpPer,
  startAction,
  stopAction,
  xpPerCompletion,
} from '../../src/core/actions';
import type { Content } from '../../src/core/content';
import { masteryLevel, newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';

// Tables of the test's own: the rules are checked apart from the game's numbers.
const content: Content = {
  skills: { digging: { id: 'digging', name: 'Digging', verb: 'Digging', group: 'Gathering' } },
  items: {
    brick: { id: 'brick', name: 'Brick', description: '', value: 1 },
    mud: { id: 'mud', name: 'Mud', description: '', value: 1 },
    worm: { id: 'worm', name: 'Worm', description: '', value: 1 },
    // Potions that help digging, each with a different effect, and one that helps something else.
    quick: {
      id: 'quick',
      name: 'Quick',
      description: '',
      value: 1,
      potion: { charges: 25, skills: ['digging'], effect: { kind: 'speed', percent: 10 } },
    },
    clever: {
      id: 'clever',
      name: 'Clever',
      description: '',
      value: 1,
      potion: { charges: 25, skills: ['digging'], effect: { kind: 'xp', percent: 15 } },
    },
    lucky: {
      id: 'lucky',
      name: 'Lucky',
      description: '',
      value: 1,
      potion: { charges: 25, skills: ['digging'], effect: { kind: 'extra', every: 3 } },
    },
    elsewhere: {
      id: 'elsewhere',
      name: 'Elsewhere',
      description: '',
      value: 1,
      potion: { charges: 25, skills: ['sailing'], effect: { kind: 'speed', percent: 50 } },
    },
  },
  actions: {
    dig: {
      id: 'dig',
      skill: 'digging',
      name: 'Dig',
      level: 1,
      durationMs: 1000,
      xp: 5,
      gives: [
        { item: 'mud', qty: 2 },
        { item: 'worm', qty: 1 },
      ],
    },
    bake: {
      id: 'bake',
      skill: 'digging',
      name: 'Bake bricks',
      level: 1,
      durationMs: 2000,
      xp: 7,
      uses: [
        { item: 'mud', qty: 3 },
        { item: 'worm', qty: 1 },
      ],
      gives: [{ item: 'brick', qty: 1 }],
    },
    dig_deep: {
      id: 'dig_deep',
      skill: 'digging',
      name: 'Dig deep',
      level: 5,
      durationMs: 3000,
      xp: 20,
      gives: [{ item: 'mud', qty: 5 }],
    },
  },
};

const fresh = newGame('Cody', 0);
const start = (state: GameState, id: string): GameState => {
  const result = startAction(state, id, content);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};
const digging = start(fresh, 'dig');
const DIG = content.actions.dig!;
const potionOf = (item: string) => content.items[item]!.potion!;
/** Baking with ten mud and five worms: three bricks' worth. */
const stockedBaking = (): GameState => start({ ...fresh, bank: { mud: 10, worm: 5 } }, 'bake');

describe('startAction and stopAction', () => {
  it('starts from zero', () => {
    expect(digging.action).toEqual({ id: 'dig', progressMs: 0 });
  });

  it('refuses an action above the skill level, and says what it needs', () => {
    expect(startAction(fresh, 'dig_deep', content)).toEqual({
      ok: false,
      reason: 'Needs Digging level 5.',
    });
    const skilled = { ...fresh, skills: { digging: xpForLevel(5) } };
    expect(startAction(skilled, 'dig_deep', content).ok).toBe(true);
  });

  it('refuses an action that does not exist', () => {
    expect(startAction(fresh, 'fly', content).ok).toBe(false);
  });

  it('keeps progress when the running action is started again, and drops it on a switch', () => {
    const part = advance(digging, 400, content);
    expect(start(part, 'dig')).toBe(part);
    const skilled = { ...part, skills: { digging: xpForLevel(5) } };
    expect(start(skilled, 'dig_deep').action).toEqual({ id: 'dig_deep', progressMs: 0 });
  });

  it('stops', () => {
    expect(stopAction(digging).action).toBeNull();
    expect(stopAction(fresh)).toBe(fresh);
  });
});

describe('advance', () => {
  it('does nothing to an idle character, or with no time', () => {
    expect(advance(fresh, 60_000, content)).toBe(fresh);
    expect(advance(digging, 0, content)).toBe(digging);
    expect(advance(digging, -5, content)).toBe(digging);
    expect(advance(digging, Number.NaN, content)).toBe(digging);
  });

  it('carries part of a completion and pays nothing for it', () => {
    const state = advance(digging, 999, content);
    expect(state.action).toEqual({ id: 'dig', progressMs: 999 });
    expect(state.bank).toEqual({});
    expect(state.skills).toEqual({});
  });

  it('pays items and XP on completion and keeps the remainder', () => {
    const state = advance(digging, 2500, content);
    expect(state.bank).toEqual({ mud: 4, worm: 2 });
    expect(state.skills).toEqual({ digging: 10 });
    expect(state.action).toEqual({ id: 'dig', progressMs: 500 });
  });

  it('never changes the state it was given', () => {
    const before = structuredClone(digging);
    advance(digging, 5000, content);
    expect(digging).toEqual(before);
  });

  it('lands in the same place however the time is cut up', () => {
    const whole = advance(digging, 24 * 60 * 60 * 1000, content);
    // More than one a second: mastery has made the digging quicker.
    expect(whole.bank.worm).toBeGreaterThan(86_400);
    expect(whole.bank.mud).toBe(whole.bank.worm! * 2);

    // Frame-sized steps with whole-millisecond lengths, as a live session gives.
    let seed = 7;
    const random = (): number => (seed = (seed * 48271) % 2147483647) / 2147483647;
    let stepped = digging;
    let spent = 0;
    const total = 10 * 60 * 1000;
    while (spent < total) {
      const step = Math.min(1 + Math.floor(random() * 40), total - spent);
      stepped = advance(stepped, step, content);
      spent += step;
    }
    expect(stepped).toEqual(advance(digging, total, content));
  });

  it('stops an action the tables no longer hold', () => {
    const orphan = { ...fresh, action: { id: 'gone', progressMs: 10 } };
    expect(advance(orphan, 1000, content).action).toBeNull();
  });
});

describe('mastery', () => {
  const dig = content.actions.dig!;

  it('is earned by the second of base time, so longer actions teach more', () => {
    expect(masteryXpPer(dig)).toBe(12);
    expect(masteryXpPer(content.actions.dig_deep!)).toBe(36);
    expect(advance(digging, 3000, content).mastery).toEqual({ dig: 36 });
  });

  it('makes its action a fifth of a percent quicker a level, in whole milliseconds', () => {
    expect(durationAt(dig, 1)).toBe(1000);
    expect(durationAt(dig, 2)).toBe(998);
    expect(durationAt(dig, 99)).toBe(804);
    expect(durationAt({ ...dig, durationMs: 3500 }, 2)).toBe(3493);
  });

  it('speeds up from the very completion that earns the level', () => {
    // Four digs reach mastery 2 (48 XP against 40), so the fifth takes 998 ms.
    const four = advance(digging, 4000, content);
    expect(masteryLevel(four, 'dig')).toBe(2);
    expect(advance(digging, 4997, content).bank.worm).toBe(4);
    const five = advance(digging, 4998, content);
    expect(five.bank.worm).toBe(5);
    expect(five.action).toEqual({ id: 'dig', progressMs: 0 });
  });

  it('is kept per action', () => {
    const skilled = { ...advance(digging, 60_000, content), skills: { digging: 1e6 } };
    const deep = advance(start(skilled, 'dig_deep'), 3000, content);
    expect(masteryLevel(deep, 'dig')).toBeGreaterThan(2);
    expect(deep.mastery.dig_deep).toBe(36);
  });

  it('tops out at 99 and carries on paying', () => {
    const master = start({ ...fresh, mastery: { dig: 1e9 } }, 'dig');
    expect(advance(master, 804 * 10, content).bank.worm).toBe(10);
  });
});

describe('an action that uses things', () => {
  const stocked = { ...fresh, bank: { mud: 10, worm: 5 } };
  const baking = start(stocked, 'bake');

  it('will not start without enough for one, and says what is short', () => {
    expect(startAction({ ...fresh, bank: { mud: 2, worm: 5 } }, 'bake', content)).toEqual({
      ok: false,
      reason: 'Needs 3 Mud.',
    });
    expect(startAction({ ...fresh, bank: { mud: 9 } }, 'bake', content)).toEqual({
      ok: false,
      reason: 'Needs 1 Worm.',
    });
  });

  it('takes its materials on each completion', () => {
    const state = advance(baking, 4500, content);
    expect(state.bank).toEqual({ mud: 4, worm: 3, brick: 2 });
    expect(state.action).toEqual({ id: 'bake', progressMs: 500 });
  });

  it('stops on the completion that uses the last of them, however long is left', () => {
    // Ten mud is three bricks; the worms would have stretched to five.
    const state = advance(baking, 60 * 60 * 1000, content);
    expect(state.bank).toEqual({ mud: 1, worm: 2, brick: 3 });
    expect(state.skills).toEqual({ digging: 21 });
    expect(state.mastery).toEqual({ bake: 72 });
    expect(state.action).toBeNull();
    expect(advance(baking, 6000, content)).toEqual(state);
  });

  it('removes a stack it empties rather than leaving a zero', () => {
    const state = advance(start({ ...fresh, bank: { mud: 3, worm: 1 } }, 'bake'), 2000, content);
    expect(state.bank).toEqual({ brick: 1 });
  });

  it('runs out in the same place however the time is cut up', () => {
    let stepped = baking;
    for (let spent = 0; spent < 20_000; spent += 7) {
      stepped = advance(stepped, 7, content);
    }
    expect(stepped).toEqual(advance(baking, 20_000, content));
  });
});

describe('a potion inside advance', () => {
  /** Digging from scratch with a potion of `charges` already drunk. */
  const dosed = (item: string, charges: number): GameState => ({
    ...digging,
    potion: { item, charges },
  });

  it('makes completions quicker in whole milliseconds, using a charge for each', () => {
    expect(durationAt(DIG, 1, potionOf('quick'))).toBe(900);
    // Mastery and potion are rounded together, once: 998 x 0.9 is 898.2.
    expect(durationAt(DIG, 2, potionOf('quick'))).toBe(898);
    const state = advance(dosed('quick', 25), 2700, content);
    expect(state.bank.worm).toBe(3);
    expect(state.potion).toEqual({ item: 'quick', charges: 22 });
    expect(state.action).toEqual({ id: 'dig', progressMs: 0 });
  });

  it('pays more XP, rounded once a completion and never carried as a fraction', () => {
    expect(xpPerCompletion(DIG, potionOf('clever'))).toBe(6); // 5 x 1.15 = 5.75
    expect(xpPerCompletion(DIG, null)).toBe(5);
    // Ten completions are 60, not 57.5 rounded, and not 57 and a bit carried.
    expect(advance(dosed('clever', 25), 10_000, content).skills.digging).toBe(60);
  });

  it('gives a completion over again on every third charge, counted from the charges', () => {
    // Charges 25 down to 16 are used; 24, 21 and 18 are multiples of three.
    const state = advance(dosed('lucky', 25), 10_000, content);
    expect(state.bank).toEqual({ worm: 13, mud: 26 });
    expect(state.potion).toEqual({ item: 'lucky', charges: 15 });
  });

  it('ends on the completion that uses the last charge, and the action carries on without it', () => {
    // Four at 900 ms reach mastery 2, the fifth takes 898 and the last charge; then 998 unaided.
    const five = advance(dosed('quick', 5), 4498, content);
    expect(five.potion).toBeNull();
    expect(five.bank.worm).toBe(5);
    expect(five.action).toEqual({ id: 'dig', progressMs: 0 });
    expect(advance(five, 997, content).bank.worm).toBe(5);
    expect(advance(five, 998, content).bank.worm).toBe(6);
  });

  it('carries time left at the boundary into the slower bar as milliseconds', () => {
    // The five aided digs use 4,498 ms, and the other 102 go into the unaided sixth.
    const state = advance(dosed('quick', 5), 4600, content);
    expect(state.potion).toBeNull();
    expect(state.action).toEqual({ id: 'dig', progressMs: 102 });
  });

  it('runs out on the same completion as a mastery level, and both take effect from the next', () => {
    // The fourth dig reaches mastery 2 and uses the fourth and last charge.
    const state = advance(dosed('quick', 4), 3600, content);
    expect(masteryLevel(state, 'dig')).toBe(2);
    expect(state.potion).toBeNull();
    expect(advance(state, 997, content).bank.worm).toBe(4);
    expect(advance(state, 998, content).bank.worm).toBe(5);
  });

  it('crosses a mastery level partway through its charges', () => {
    // Four at 900 ms reach mastery 2; six more at 898 ms spend the charges; then 998 ms each.
    const state = advance(dosed('quick', 10), 3600 + 6 * 898, content);
    expect(state.bank.worm).toBe(10);
    expect(state.potion).toBeNull();
    expect(advance(state, 998, content).bank.worm).toBe(11);
  });

  it('spends no charges on an action of a skill it does not help', () => {
    const state = advance(dosed('elsewhere', 25), 10_000, content);
    expect(state.bank.worm).toBe(10);
    expect(state.potion).toEqual({ item: 'elsewhere', charges: 25 });
  });

  it('keeps its charges while nothing is running', () => {
    const idle = { ...fresh, potion: { item: 'quick', charges: 25 } };
    expect(advance(idle, 60_000, content)).toBe(idle);
  });

  it('stops with the materials even if charges are left', () => {
    const state = advance(
      { ...stockedBaking(), potion: { item: 'clever', charges: 25 } },
      60 * 60 * 1000,
      content,
    );
    expect(state.action).toBeNull();
    expect(state.bank.brick).toBe(3);
    expect(state.potion).toEqual({ item: 'clever', charges: 22 });
    expect(state.skills.digging).toBe(3 * 8); // 7 x 1.15 = 8.05
  });

  it('runs out on the same completion as the materials', () => {
    const state = advance(
      { ...stockedBaking(), potion: { item: 'clever', charges: 3 } },
      60 * 60 * 1000,
      content,
    );
    expect(state.action).toBeNull();
    expect(state.potion).toBeNull();
    expect(state.bank.brick).toBe(3);
  });

  it.each(['quick', 'clever', 'lucky'])(
    'lands in the same place however the time is cut up, with %s running out mid-span',
    (item) => {
      // Twenty-five charges cross mastery 2 (at four digs) and 3 (at nineteen)
      // before running out, then digging goes on unaided past mastery 4.
      const start = dosed(item, 25);
      const total = 90_000;
      const whole = advance(start, total, content);
      expect(whole.potion).toBeNull();
      expect(masteryLevel(whole, 'dig')).toBeGreaterThan(3);

      let seed = 11;
      const random = (): number => (seed = (seed * 48271) % 2147483647) / 2147483647;
      let stepped = start;
      let spent = 0;
      while (spent < total) {
        const step = Math.min(1 + Math.floor(random() * 40), total - spent);
        stepped = advance(stepped, step, content);
        spent += step;
      }
      expect(stepped).toEqual(whole);

      // And in two pieces cut at every awkward place near the boundaries.
      for (const cut of [1, 899, 900, 3599, 3600, 3601, 17_000, 22_449, 22_450, 22_451]) {
        expect(advance(advance(start, cut, content), total - cut, content)).toEqual(whole);
      }
    },
  );

  it('lands in the same place however the time is cut up when it runs out with a mastery level', () => {
    const start = dosed('quick', 4);
    const whole = advance(start, 20_000, content);
    for (let cut = 3590; cut <= 3610; cut += 1) {
      expect(advance(advance(start, cut, content), 20_000 - cut, content)).toEqual(whole);
    }
    let stepped = start;
    for (let spent = 0; spent < 20_000; spent += 16) {
      stepped = advance(stepped, Math.min(16, 20_000 - spent), content);
    }
    expect(stepped).toEqual(whole);
  });
});
