import { describe, expect, it } from 'vitest';
import { advance, startAction } from '../../src/core/actions';
import { OFFLINE_CAP_MS, catchUp } from '../../src/core/away';
import type { Content } from '../../src/core/content';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';

const HOUR = 60 * 60 * 1000;

const start = (state: GameState, id: string, content: Content = CONTENT): GameState => {
  const result = startAction(state, id, content);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};
const chopping = start(newGame('Cody', 0), 'chop_pine');

describe('catchUp', () => {
  it('has nothing to report for an idle character, or for no time', () => {
    const idle = newGame('Cody', 0);
    expect(catchUp(idle, 8 * HOUR, CONTENT)).toEqual({ state: idle, report: null });
    expect(catchUp(chopping, 0, CONTENT)).toEqual({ state: chopping, report: null });
  });

  it('pays nothing when the clock has gone backwards', () => {
    expect(catchUp(chopping, -5 * HOUR, CONTENT)).toEqual({ state: chopping, report: null });
    expect(catchUp(chopping, Number.NaN, CONTENT)).toEqual({ state: chopping, report: null });
  });

  it('gives a night away exactly what a night of live frames gives', () => {
    const night = 8 * HOUR + 1234;
    let live = chopping;
    for (let spent = 0; spent < night; spent += 16) {
      live = advance(live, Math.min(16, night - spent), CONTENT);
    }
    expect(catchUp(chopping, night, CONTENT).state).toEqual(live);
  });

  it('reports what was gained', () => {
    const { state, report } = catchUp(chopping, 2 * HOUR, CONTENT);
    expect(report).toEqual({
      awayMs: 2 * HOUR,
      countedMs: 2 * HOUR,
      actionId: 'chop_pine',
      items: { pine_logs: 2400 },
      xp: { woodcutting: 24_000 },
      levels: { woodcutting: { from: 1, to: 13 } },
      stopped: null,
    });
    expect(state.bank).toEqual({ pine_logs: 2400 });
    expect(state.action?.id).toBe('chop_pine');
  });

  it('pays for a day and no more', () => {
    const day = catchUp(chopping, OFFLINE_CAP_MS, CONTENT);
    const week = catchUp(chopping, 7 * OFFLINE_CAP_MS, CONTENT);
    expect(week.state).toEqual(day.state);
    expect(week.report).toMatchObject({ awayMs: 7 * OFFLINE_CAP_MS, countedMs: OFFLINE_CAP_MS });
  });

  it('stops when materials run out, and says which', () => {
    const content: Content = {
      skills: { cooking: { id: 'cooking', name: 'Cooking', verb: 'Cooking' } },
      items: {
        raw: { id: 'raw', name: 'Raw fish', description: '' },
        cooked: { id: 'cooked', name: 'Cooked fish', description: '' },
      },
      actions: {
        cook: {
          id: 'cook',
          skill: 'cooking',
          name: 'Fish',
          level: 1,
          durationMs: 2000,
          xp: 5,
          uses: [{ item: 'raw', qty: 1 }],
          gives: [{ item: 'cooked', qty: 1 }],
        },
      },
    };
    const cooking = start({ ...newGame('Cody', 0), bank: { raw: 30 } }, 'cook', content);
    const { state, report } = catchUp(cooking, 8 * HOUR, content);
    expect(state.bank).toEqual({ cooked: 30 });
    expect(state.action).toBeNull();
    expect(report).toMatchObject({
      items: { raw: -30, cooked: 30 },
      xp: { cooking: 150 },
      stopped: { reason: 'ran_out', item: 'raw' },
    });
  });

  it('says so when the action no longer exists', () => {
    const orphan = { ...newGame('Cody', 0), action: { id: 'gone', progressMs: 0 } };
    expect(catchUp(orphan, HOUR, CONTENT).report).toMatchObject({
      items: {},
      stopped: { reason: 'gone' },
    });
  });
});
