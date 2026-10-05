import { describe, expect, it } from 'vitest';
import { advance, startAction } from '../../src/core/actions';
import { OFFLINE_CAP_MS, catchUp } from '../../src/core/away';
import type { Content } from '../../src/core/content';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { characterAt, fight } from '../data/fighting';

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
      fight: null,
      coins: 0,
      // 2,400 at the base three seconds; the rest is mastery quickening the axe.
      items: { pine_logs: 2474 },
      xp: { woodcutting: 24_740 },
      levels: { woodcutting: { from: 1, to: 14 } },
      mastery: { chop_pine: { from: 1, to: 22 } },
      theft: null,
      bounty: null,
      stopped: null,
      potion: null,
    });
    expect(state.bank).toEqual({ pine_logs: 2474 });
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
      skills: { cooking: { id: 'cooking', name: 'Cooking', verb: 'Cooking', group: 'Artisan' } },
      items: {
        raw: { id: 'raw', name: 'Raw fish', description: '', value: 1 },
        cooked: { id: 'cooked', name: 'Cooked fish', description: '', value: 1 },
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

  describe('with a potion', () => {
    const tonic: GameState = { ...chopping, potion: { item: 'sage_tonic', charges: 150 } };

    it('gives a night away with a potion running out exactly what live frames give', () => {
      const night = 8 * HOUR + 1234;
      let live = tonic;
      for (let spent = 0; spent < night; spent += 16) {
        live = advance(live, Math.min(16, night - spent), CONTENT);
      }
      const away = catchUp(tonic, night, CONTENT);
      expect(away.state).toEqual(live);
      expect(away.state.potion).toBeNull();
      expect(away.report?.potion).toEqual({ item: 'sage_tonic', used: 150, ranOut: true });
      // The tonic was worth the logs its quicker chops left time for.
      expect(away.state.bank.pine_logs).toBeGreaterThan(
        catchUp(chopping, night, CONTENT).state.bank.pine_logs!,
      );
    });

    it('says how many charges were used when some are left', () => {
      // Two minutes of chops at 2.7s or a shade under, as mastery comes.
      const { state, report } = catchUp(tonic, 2 * 60 * 1000, CONTENT);
      expect(report?.potion).toEqual({ item: 'sage_tonic', used: 44, ranOut: false });
      expect(state.potion).toEqual({ item: 'sage_tonic', charges: 106 });
      expect(state.bank.pine_logs).toBe(44);
    });

    it('says nothing of a potion that helped with nothing', () => {
      const other = { ...chopping, potion: { item: 'steady_draught', charges: 150 } };
      const { state, report } = catchUp(other, HOUR, CONTENT);
      expect(report?.potion).toBeNull();
      expect(state.potion).toEqual(other.potion);
    });
  });

  it('says so when the action no longer exists', () => {
    const orphan = { ...newGame('Cody', 0), action: { id: 'gone', progressMs: 0 } };
    expect(catchUp(orphan, HOUR, CONTENT).report).toMatchObject({
      items: {},
      stopped: { reason: 'gone' },
    });
  });

  describe('with a fight, on the real tables', () => {
    // A level-5 character at the gulls with shrimp: it levels, eats and loots as it goes.
    const gulls = fight(characterAt(5, { food: 400 }), 'thieving_gull');

    it('gives two hours away exactly what two hours of live frames give', () => {
      const span = 2 * HOUR + 777;
      let live = gulls;
      for (let spent = 0; spent < span; spent += 16) {
        live = advance(live, Math.min(16, span - spent), CONTENT);
      }
      const away = catchUp(gulls, span, CONTENT);
      expect(away.state).toEqual(live);
      expect(away.report?.fight?.eaten).toBeGreaterThan(0);
      expect(away.report?.levels.melee).toBeDefined();
      expect(away.report?.items.feathers).toBeGreaterThan(0);
    });

    it('pays a whole day of fighting in well under a second', () => {
      // A day at the dock rats is the most events tier 1 has: a kill every
      // eight seconds or so. Measured at about 35 ms on a desktop and kept
      // under a quarter of a second here so a slow test machine does not fail it.
      const rats = fight(characterAt(1), 'dock_rat');
      const started = performance.now();
      const { state, report } = catchUp(rats, OFFLINE_CAP_MS, CONTENT);
      const took = performance.now() - started;
      expect(report?.fight?.kills).toBeGreaterThan(10_000);
      expect(state.fight).not.toBeNull();
      expect(took).toBeLessThan(250);
    });
  });

  describe('with a theft, on the real tables', () => {
    it('pays a whole day of thieving in well under a second', () => {
      // The fisherman is the quickest mark: an attempt every three seconds,
      // about twenty-five thousand in a day. Kept under a quarter of a second
      // as fighting is.
      const thief = start(newGame('Cody', 0), 'steal_fisherman');
      const started = performance.now();
      const { state, report } = catchUp(thief, OFFLINE_CAP_MS, CONTENT);
      const took = performance.now() - started;
      expect(report?.theft?.attempts).toBeGreaterThan(20_000);
      expect(state.action?.id).toBe('steal_fisherman');
      expect(took).toBeLessThan(250);
    });
  });
});
