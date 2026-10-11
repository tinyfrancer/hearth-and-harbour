import { describe, expect, it } from 'vitest';
import { advance, startAction } from '../../src/core/actions';
import { catchUp } from '../../src/core/away';
import { bountyReady } from '../../src/core/bounty';
import { busy, hitPoints, startFight } from '../../src/core/combat';
import type { Content } from '../../src/core/content';
import { alignIdleClock, idleRunEnded, startIdleRun, stopIdleRun } from '../../src/core/idleRun';
import { DAY_MS, dailyModifier, localDay, modifierOn } from '../../src/core/progress';
import { seedFrom } from '../../src/core/rng';
import type { GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { characterAt } from '../data/fighting';
import { withDay } from '../data/idleRuns';

const CAVE = 'tidepool_cave';
const GROTTO = 'brinebeards_grotto';
const HOUR = 60 * 60 * 1000;
/** Noon UTC on a day of October 2026. */
const NOON = Date.UTC(2026, 9, 11, 12);

function ok(result: { ok: true; state: GameState } | { ok: false; reason: string }): GameState {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

/** A character of a level who has cleared a dungeon by hand, with fish, dice of `seed`. */
function cleared(level: number, dungeon: string, { seed = 1, food = 0 } = {}): GameState {
  const state = characterAt(level, { seed, food });
  return { ...state, rng: seedFrom(seed), dungeons: { [dungeon]: { clears: 1 } } };
}

/** Sent through a dungeon idle at `now`. */
function sent(
  state: GameState,
  dungeon: string,
  content: Content = CONTENT,
  now = NOON,
  utcOffset = 0,
): GameState {
  return ok(startIdleRun(state, dungeon, content, now, utcOffset));
}

/** The same time, given as frames of 1 to 40 ms as a live session gives them. */
function inFrames(start: GameState, total: number, content: Content = CONTENT, seed = 5) {
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
function firstMoment(
  start: GameState,
  test: (state: GameState) => boolean,
  content: Content = CONTENT,
  within = 4 * HOUR,
): number {
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

function expectCutsAgree(
  start: GameState,
  total: number,
  cuts: number[],
  content: Content = CONTENT,
): GameState {
  const whole = advance(start, total, content);
  for (const cut of cuts) {
    expect(advance(advance(start, cut, content), total - cut, content), `cut at ${cut}`).toEqual(
      whole,
    );
  }
  return whole;
}

const around = (t: number): number[] => [t - 1, t, t + 1];
const runs = (state: GameState, dungeon: string): number => state.dungeons[dungeon]?.idleRuns ?? 0;

describe('sending the hero through a dungeon idle', () => {
  it('is only for a dungeon cleared by hand, whose row says how', () => {
    const fresh = characterAt(1);
    expect(startIdleRun(fresh, CAVE, CONTENT, NOON)).toEqual({
      ok: false,
      reason: 'Clear Tidepool Cave by hand first.',
    });
    expect(startIdleRun(fresh, 'unknown_1', CONTENT, NOON).ok).toBe(false);
    expect(startIdleRun(fresh, 'nowhere', CONTENT, NOON).ok).toBe(false);
    expect(startIdleRun(cleared(1, CAVE), CAVE, CONTENT, NOON).ok).toBe(true);
  });

  it('replaces whatever was running, carrying the hit points in and out', () => {
    const chopping = ok(
      startAction({ ...cleared(5, CAVE), health: { hp: 21, regenMs: 0 } }, 'chop_pine', CONTENT),
    );
    const idling = sent(chopping, CAVE);
    expect([idling.action, idling.health, idling.idleRun!.hp]).toEqual([null, null, 21]);
    expect(busy(idling)).toBe(true);
    expect(hitPoints(idling)).toBe(21);
    // Asking again changes nothing; anything else ends it, with the hit points kept.
    expect(sent(idling, CAVE)).toBe(idling);
    expect(ok(startAction(idling, 'chop_pine', CONTENT))).toMatchObject({
      idleRun: null,
      health: { hp: 21 },
    });
    expect(ok(startFight(idling, 'dock_rat', CONTENT))).toMatchObject({
      idleRun: null,
      fight: { hp: 21 },
    });
    expect(stopIdleRun(idling)).toMatchObject({ idleRun: null, health: { hp: 21 } });
  });

  it('sets out under the day’s modifier, rowing out first', () => {
    const idling = sent(cleared(1, CAVE), CAVE, CONTENT, NOON, 60);
    expect(idling.idleRun).toMatchObject({
      dungeon: CAVE,
      clock: NOON,
      utcOffset: 60,
      modifier: dailyModifier(NOON, CAVE, CONTENT, 60),
      room: 0,
      foes: [],
    });
    const idle = CONTENT.dungeons![CAVE]!.idle!;
    expect(idling.idleRun!.walkMs).toBe(idle.tripMs + idle.rooms[0]!.walkMs);
  });

  it('needs arrows for a bow, as a fight does', () => {
    const archer = {
      ...cleared(10, CAVE),
      equipment: { main_hand: { item: 'oak_shortbow', qty: 1 } },
    };
    expect(startIdleRun(archer, CAVE, CONTENT, NOON)).toMatchObject({ ok: false });
  });
});

describe('a dungeon run idle, event by event', () => {
  it('runs the rooms over and over: kills in the bestiary, its drops in the bank, runs counted', () => {
    const start = sent(cleared(1, CAVE), CAVE);
    const after = advance(start, HOUR, CONTENT);
    expect(after.idleRun).not.toBeNull();
    const done = runs(after, CAVE);
    expect(done).toBeGreaterThan(15);
    expect(after.idleRun!.runs).toBe(done);
    // Seven foes a run: a rat, three rats, two crabs and the snapper.
    expect(after.bestiary.dock_rat!.kills).toBeGreaterThanOrEqual(4 * done);
    expect(after.bestiary.old_snapper!.kills).toBeGreaterThanOrEqual(done);
    const cast = CONTENT.dungeons![CAVE]!.cast!;
    const drops = new Set(cast.flatMap((foe) => [...foe.always, ...foe.rare].map((d) => d.item)));
    for (const item of Object.keys(after.bank)) expect(drops.has(item), item).toBe(true);
    expect(after.idleRun!.loot).toEqual(after.bank);
  });

  it('never counts as a clear, and never pays a first clear or a challenge', () => {
    const start = sent(cleared(10, CAVE, { food: 200 }), CAVE);
    const after = advance(start, 3 * HOUR, CONTENT);
    expect(after.dungeons[CAVE]).toEqual({ clears: 1, idleRuns: runs(after, CAVE) });
    expect(after.bank.bronze_sword).toBeUndefined();
    expect(after.bountyPoints).toBe(0);
  });

  it('keeps only a share of what falls, and never the rarest things', () => {
    // Ten hours of the grotto at level 30 meet the captain dozens of times.
    const start = sent(cleared(30, GROTTO, { food: 5000 }), GROTTO, withDay(GROTTO, null));
    const after = advance(start, 10 * HOUR, withDay(GROTTO, null));
    const done = runs(after, GROTTO);
    expect(done).toBeGreaterThan(30);
    expect(after.bank.brinebeards_anchor).toBeUndefined();
    expect(after.bank.ships_figurehead).toBeUndefined();
    // Every foe drops doubloons on every kill: 26 to 50 a run by hand; idle, half of them kept.
    const perRun = after.bank.doubloon! / done;
    expect(perRun).toBeGreaterThan(13 * 0.8);
    expect(perRun).toBeLessThan(25 * 1.1);
  });

  it('counts kills to a bounty held, and with auto bounty hands it in and goes on', () => {
    const hunting = {
      ...cleared(5, CAVE),
      bounty: { monster: 'dock_rat', count: 10, done: 0, points: 3 },
    };
    const counted = advance(sent(hunting, CAVE), HOUR, CONTENT);
    expect(counted.bounty!.done).toBe(10);
    expect(bountyReady(counted)).toBe(true);
    const auto = advance(sent({ ...hunting, autoBounty: true }, CAVE), HOUR, CONTENT);
    expect(auto.stats.bounties).toBeGreaterThanOrEqual(1);
    expect(auto.bountyPoints).toBeGreaterThanOrEqual(3);
    expect(auto.idleRun).not.toBeNull();
  });

  it('eats from the food slot by idle combat’s rule, and nothing on a day without food', () => {
    const fed = advance(
      sent(cleared(20, GROTTO, { food: 100 }), GROTTO),
      20 * 60_000,
      withDay(GROTTO, null),
    );
    expect(fed.food!.qty).toBeLessThan(100);
    const start = sent(cleared(20, GROTTO, { food: 100 }), GROTTO, withDay(GROTTO, 'no_rations'));
    const hungry = advance(start, 20 * 60_000, withDay(GROTTO, 'no_rations'));
    expect(hungry.food!.qty).toBe(100);
    // ...and goes down for it.
    expect(hungry.idleRun).toBeNull();
    expect(idleRunEnded(start, hungry, withDay(GROTTO, 'no_rations'))).toBe('died');
  });

  it('is over at a knock-out: the hero comes round as from any other', () => {
    const start = sent(cleared(10, GROTTO, { food: 10 }), GROTTO);
    const after = advance(start, HOUR, CONTENT);
    expect(after.idleRun).toBeNull();
    expect(idleRunEnded(start, after, CONTENT)).toBe('died');
    expect(after.health).toBeNull(); // healed in the rest of the hour
    expect(after.food).toBeNull();
  });

  it('shoots arrows with a bow, and is over on the last one', () => {
    const archer: GameState = {
      ...cleared(10, CAVE),
      equipment: {
        main_hand: { item: 'oak_shortbow', qty: 1 },
        ammo: { item: 'bronze_arrows', qty: 60 },
      },
    };
    const start = sent(archer, CAVE);
    const after = advance(start, HOUR, CONTENT);
    expect(after.equipment.ammo).toBeUndefined();
    expect(after.idleRun).toBeNull();
    expect(idleRunEnded(start, after, CONTENT)).toBe('no_arrows');
    expect((after.skills.ranged ?? 0) - (archer.skills.ranged ?? 0)).toBeGreaterThan(0);
  });
});

// The promise the whole game rests on, for idle runs too: time away gives
// exactly what the same time of live play would have, dice and all.
describe('however the time is cut up', () => {
  it('lands in the same place across random frames, through rooms, runs and level-ups', () => {
    const start = sent(cleared(1, CAVE), CAVE);
    const total = 30 * 60_000;
    const whole = advance(start, total, CONTENT);
    expect(runs(whole, CAVE)).toBeGreaterThan(8);
    expect(inFrames(start, total)).toEqual(whole);
    expect(inFrames(start, total, CONTENT, 77)).toEqual(whole);
  });

  it('lands in the same place cut as a room is met, as a room is cleared and as a run ends', () => {
    const start = sent(cleared(1, CAVE), CAVE);
    const idle = CONTENT.dungeons![CAVE]!.idle!;
    // The first room is met when the row out and the walk are done.
    const met = idle.tripMs + idle.rooms[0]!.walkMs;
    expect(advance(start, met - 1, CONTENT).idleRun!.foes).toEqual([]);
    expect(advance(start, met, CONTENT).idleRun!.foes).toHaveLength(1);
    // Its rat felled is the room cleared; the next is met a walk later.
    const firstKill = firstMoment(start, (state) => (state.idleRun?.kills ?? 0) >= 1);
    const secondRoom = firstKill + idle.rooms[1]!.walkMs;
    expect(advance(start, secondRoom, CONTENT).idleRun!.foes).toHaveLength(3);
    const ran = firstMoment(start, (state) => runs(state, CAVE) >= 1);
    expectCutsAgree(start, 20 * 60_000, [
      ...around(met),
      ...around(firstKill),
      ...around(secondRoom),
      ...around(ran),
      ran + 7,
    ]);
  });

  it('lands in the same place cut on the blow that knocks the hero out', () => {
    const start = sent(cleared(10, GROTTO, { food: 6 }), GROTTO);
    const out = firstMoment(start, (state) => state.idleRun === null);
    const whole = expectCutsAgree(start, out + 30_000, [...around(out), out - 1700]);
    expect(idleRunEnded(start, whole, CONTENT)).toBe('died');
    expect(inFrames(start, out + 30_000)).toEqual(whole);
  });

  it('sets each run out under its own day: a run after local midnight takes the new day’s modifier', () => {
    // An hour before midnight in a place an hour ahead of UTC.
    const midnight = Date.UTC(2026, 9, 12) - HOUR;
    const start = sent(cleared(1, CAVE), CAVE, CONTENT, midnight - HOUR, 60);
    const today = modifierOn(localDay(midnight - 1, 60), CAVE, CONTENT);
    const tomorrow = modifierOn(localDay(midnight, 60), CAVE, CONTENT);
    expect(today).not.toBe(tomorrow);
    expect(start.idleRun!.modifier).toBe(today);
    const later = advance(start, 2 * HOUR, CONTENT);
    expect(later.idleRun!.modifier).toBe(tomorrow);
    expect(later.idleRun!.clock).toBe(midnight + HOUR);
    expectCutsAgree(start, 2 * HOUR, [HOUR - 1, HOUR, HOUR + 1, 61 * 60_000]);
    expect(inFrames(start, 2 * HOUR)).toEqual(later);
  });

  it('gives a night away exactly what a night of 16 ms frames gives', () => {
    const start = sent(cleared(5, CAVE, { food: 50 }), CAVE);
    const night = 8 * HOUR + 1234;
    let live = start;
    for (let spent = 0; spent < night; spent += 16) {
      live = advance(live, Math.min(16, night - spent), CONTENT);
    }
    const away = catchUp(start, night, CONTENT);
    expect(away.state).toEqual(live);
    expect(runs(away.state, CAVE)).toBeGreaterThan(150);
  }, 60_000);
});

describe('the runs’ calendar', () => {
  it('is set to the app’s clock without paying anything, the run under way keeping its day', () => {
    const start = advance(sent(cleared(1, CAVE), CAVE), 90_000, CONTENT);
    const later = alignIdleClock(start, NOON + 3 * DAY_MS, 120);
    expect(later.idleRun).toEqual({ ...start.idleRun, clock: NOON + 3 * DAY_MS, utcOffset: 120 });
    expect(alignIdleClock(later, NOON + 3 * DAY_MS, 120)).toBe(later);
    const resting = characterAt(1);
    expect(alignIdleClock(resting, NOON, 0)).toBe(resting);
  });
});

describe('the away report for idle runs', () => {
  it('counts runs, kills, food and loot, and says how they ended', () => {
    const start = sent(cleared(10, GROTTO, { food: 12 }), GROTTO);
    const { state, report } = catchUp(start, 2 * HOUR, CONTENT);
    expect(state.idleRun).toBeNull();
    expect(report!.dungeon).toEqual({
      dungeon: GROTTO,
      runs: runs(state, GROTTO),
      kills: Object.values(state.bestiary).reduce((sum, r) => sum + r.kills, 0),
      eaten: 12,
      food: 'cooked_herring',
      arrows: 0,
    });
    expect(report!.stopped).toEqual({ reason: 'died' });
    expect(report!.fight).toBeNull();
    expect(report!.items.doubloon).toBeGreaterThan(0);
  });
});
