import { describe, expect, it } from 'vitest';
import { advance, startAction, stopAction } from '../../src/core/actions';
import type { Content } from '../../src/core/content';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';

// Tables of the test's own: the rules are checked apart from the game's numbers.
const content: Content = {
  skills: { digging: { id: 'digging', name: 'Digging', verb: 'Digging' } },
  items: {
    brick: { id: 'brick', name: 'Brick', description: '' },
    mud: { id: 'mud', name: 'Mud', description: '' },
    worm: { id: 'worm', name: 'Worm', description: '' },
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
    expect(whole.bank).toEqual({ mud: 172_800, worm: 86_400 });

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
