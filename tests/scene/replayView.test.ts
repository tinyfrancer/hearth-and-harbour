/*
 * S16 on screen, in jsdom: the tracker's lines judged only by lane A's
 * `challengeMet`; the results card's statistics, challenges (new ones said
 * so) and the day's bonus as settling will pay it; the chart's day,
 * challenges and Send him in; a darker day's smaller light.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Content, RunStats } from '../../src/core/content';
import { spoilsUnder } from '../../src/core/run';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { chartPanel } from '../../src/scene/chartPanel';
import { dimDungeon } from '../../src/scene/dungeons';
import { glowsOf, lightsOf } from '../../src/scene/grottoArt';
import { DARKER_LIGHT, runSpoils, runStats } from '../../src/scene/modifiers';
import { resultsCard, trackerLines, trackerView } from '../../src/scene/runCard';
import { beginCave, CAVE } from './caveBot';
import { begin, decide, GROTTO_DUNGEON, prepared } from './grottoBot';
import { advanceRun, type Run } from '../../src/scene/dungeon';
import { DAY } from '../../src/art/palette';
import { startPlay } from '../../src/scene/play';
import { town2Scene } from '../../src/scene/town2';
import { MOORING, townExtra } from '../../src/scene/townExtras';
import { marksNow } from '../../src/scene/townMarks';

const CAVE_CHALLENGES = CONTENT.dungeons!.tidepool_cave!.challenges!;
const stats = (o: Partial<RunStats> = {}): RunStats => ({
  timeMs: 0,
  damageTaken: 0,
  foodEaten: 0,
  braces: 0,
  stepOuts: 0,
  knockedOut: false,
  kills: 0,
  ...o,
});
const state = (id: string, s: (typeof CAVE_CHALLENGES)[number]['id'][]): GameState => ({
  ...newGame('Cody', 0),
  dungeons: { [id]: { clears: 1, challenges: s } },
});

describe('the tracker', () => {
  it('says what is still to be had, lost or met, by challengeMet alone', () => {
    const start = trackerLines(CAVE_CHALLENGES, stats(), null);
    expect(Object.fromEntries(start.map((l) => [l.id, l.state]))).toEqual({
      'tidepool_cave.quick': 'open',
      'tidepool_cave.unhurt': 'open',
      'tidepool_cave.no_food': 'open',
      'tidepool_cave.snapper_dodge': 'waiting',
    });
    expect(start[0]!.clock).toBe('0:00 / 2:00');
    const later = trackerLines(
      CAVE_CHALLENGES,
      stats({ timeMs: 130_000, damageTaken: 11, stepOuts: 3 }),
      null,
    );
    expect(Object.fromEntries(later.map((l) => [l.id, l.state]))).toEqual({
      'tidepool_cave.quick': 'lost',
      'tidepool_cave.unhurt': 'lost',
      'tidepool_cave.no_food': 'open',
      'tidepool_cave.snapper_dodge': 'met',
    });
    // Those done before are not tracked again.
    const done = trackerLines(CAVE_CHALLENGES, stats(), null, (id) => id.endsWith('.quick'));
    expect(done.map((l) => l.id)).not.toContain('tidepool_cave.quick');
  });

  it('folds to one button and remembers it', () => {
    let folded = false;
    const t = trackerView(CONTENT, 'tidepool_cave', newGame('Cody', 0), {
      folded: false,
      fold: (f) => (folded = f),
    });
    const run = beginCave(newGame('Cody', 0), 3, false);
    t.update(run, true);
    expect(t.el.hidden).toBe(false);
    expect(t.el.querySelectorAll('li')).toHaveLength(4);
    expect(t.el.querySelector('[data-id="tidepool_cave.unhurt"]')!.getAttribute('data-state')).toBe(
      'open',
    );
    t.el.querySelector<HTMLButtonElement>('.run-tracker-toggle')!.click();
    expect(folded).toBe(true);
    expect(t.el.dataset.folded).toBe('true');
    // Nothing to track once everything is done: it does not show.
    const all = state(
      'tidepool_cave',
      CAVE_CHALLENGES.map((c) => c.id),
    );
    const none = trackerView(CONTENT, 'tidepool_cave', all, { folded: false, fold: () => {} });
    none.update(run, true);
    expect(none.el.hidden).toBe(true);
  });
});

/** The grotto played through by its scripted player, under a modifier or none. */
function cleared(modifier?: string): Run {
  let run = begin(prepared(20), 7919, undefined, modifier);
  for (let t = 0; t < 15 * 60_000 && !run.finished; t += 100) {
    run = decide(run);
    run = advanceRun(GROTTO_DUNGEON, run, run.play, 100);
  }
  return run;
}

describe('the results card', () => {
  it('shows the time and how it went, the challenges met (new ones said so), and the day’s bonus', () => {
    const run = cleared('angry_crew');
    expect(run.ending).toBe('cleared');
    const before = state('brinebeards_grotto', ['brinebeards_grotto.nearly_unhurt']);
    let again = 0;
    const card = resultsCard({
      content: CONTENT,
      run,
      state: before,
      title: 'Cleared',
      line: 'A line.',
      again: () => again++,
      home: () => {},
    });
    const text = card.el.textContent!;
    const s = runStats(run);
    expect(text).toContain(`Damage taken: ${s.damageTaken}`);
    expect(text).toContain(`Kills: ${s.kills}`);
    expect(text).toContain(CONTENT.modifiers!.angry_crew!.name);
    // The bank's share as settling pays it, under the day's modifier.
    const paid = spoilsUnder(runSpoils(run, true), CONTENT);
    if (paid.coins > 0) expect(text).toContain(`+${paid.coins}`);
    const plain = spoilsUnder({ ...runSpoils(run, true), modifier: null }, CONTENT);
    const more =
      Object.values(paid.loot).reduce((a, b) => a + b, 0) -
      Object.values(plain.loot).reduce((a, b) => a + b, 0);
    if (more > 0) expect(text).toContain(`+${more} of the usual drops`);
    // Row out again is there and works.
    [...card.el.querySelectorAll('button')].find((b) => b.textContent === 'Row out again')!.click();
    expect(again).toBe(1);
    // The medal of a new challenge glints through its frames as the page's time goes.
    card.step(1000);
  }, 120_000);

  it('marks a challenge met for the first time as new, and one met before plainly', () => {
    const run = cleared();
    const met = CONTENT.dungeons!.brinebeards_grotto!.challenges!.filter((c) =>
      // Which this run met, by the one rule.
      [
        ...resultsCard({
          content: CONTENT,
          run,
          state: newGame('Cody', 0),
          title: '',
          line: '',
          again: null,
          home: () => {},
        }).el.querySelectorAll('.run-challenges li'),
      ].some((li) => li.textContent!.includes(c.name)),
    );
    if (met.length === 0) return;
    const fresh = resultsCard({
      content: CONTENT,
      run,
      state: newGame('Cody', 0),
      title: '',
      line: '',
      again: null,
      home: () => {},
    }).el;
    expect(fresh.querySelector('.run-challenges li')!.getAttribute('data-new')).toBe('true');
    const seen = resultsCard({
      content: CONTENT,
      run,
      state: state(
        'brinebeards_grotto',
        met.map((c) => c.id),
      ),
      title: '',
      line: '',
      again: null,
      home: () => {},
    }).el;
    expect(seen.querySelector('.run-challenges li')!.getAttribute('data-new')).toBe('false');
    expect(seen.textContent).not.toContain('Row out again');
  }, 120_000);
});

describe('the chart, for S16', () => {
  it('shows the day’s modifier and the challenges, done or not', () => {
    vi.stubGlobal('devicePixelRatio', 3);
    const me = state('tidepool_cave', ['tidepool_cave.no_food']);
    const panel = chartPanel({
      content: CONTENT,
      state: () => me,
      rowOut: () => {},
      close: () => {},
      today: (id) => (id === 'tidepool_cave' ? 'slack_tide' : null),
    });
    panel.pick('tidepool_cave');
    const day = panel.el.querySelector('.chart-day')!;
    expect(day.getAttribute('data-modifier')).toBe('slack_tide');
    expect(day.textContent).toMatch(/Today: /);
    expect(day.textContent).toMatch(/strike 20% less often/);
    const goals = [...panel.el.querySelectorAll('.chart-goals li')];
    expect(goals).toHaveLength(CAVE_CHALLENGES.length);
    expect(goals.filter((g) => g.getAttribute('data-done') === 'true')).toHaveLength(1);
    // No idle run without the shell to send him, nor for a dungeon with no idle rooms.
    expect(panel.el.textContent).not.toContain('Send him in');
    vi.unstubAllGlobals();
  });

  it('offers Send him in for a cleared dungeon that can be run unattended, and says when he is away', () => {
    vi.stubGlobal('devicePixelRatio', 3);
    const content: Content = {
      ...CONTENT,
      dungeons: {
        ...CONTENT.dungeons!,
        tidepool_cave: {
          ...CONTENT.dungeons!.tidepool_cave!,
          idle: { rooms: [{ foes: ['dock_rat'], walkMs: 1000 }], tripMs: 1000, lootPercent: 50 },
        },
      },
    };
    const sent: string[] = [];
    let me: GameState = state('tidepool_cave', []);
    const panel = chartPanel({
      content,
      state: () => me,
      rowOut: () => {},
      close: () => {},
      sendIn: (id) => sent.push(id),
    });
    panel.pick('tidepool_cave');
    [...panel.el.querySelectorAll('button')].find((b) => b.textContent === 'Send him in')!.click();
    expect(sent).toEqual(['tidepool_cave']);
    me = { ...me, idleRun: { dungeon: 'tidepool_cave' } as GameState['idleRun'] };
    panel.pick('tidepool_cave');
    expect(panel.el.querySelector('.chart-away')).not.toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('a darker day', () => {
  it('lays every pool of light smaller, on the same ground', () => {
    for (const room of Object.values(GROTTO_DUNGEON.rooms)) {
      const dim = dimDungeon(GROTTO_DUNGEON, DARKER_LIGHT).rooms[room.id]!;
      expect(dim.ground).toBe(room.ground);
      const a = lightsOf(room);
      const b = lightsOf(dim);
      expect(b).toHaveLength(a.length);
      b.forEach((l, i) => {
        expect(l.pool).toBeCloseTo(a[i]!.pool * DARKER_LIGHT);
        expect(l.radius).toBeCloseTo(a[i]!.radius * DARKER_LIGHT);
      });
      glowsOf(dim).forEach((g, i) =>
        expect(g.radius).toBeCloseTo(glowsOf(room)[i]!.radius * DARKER_LIGHT),
      );
    }
    expect(dimDungeon(CAVE, 1)).toBe(CAVE);
  });
});

describe('the town while he is away in the boat', () => {
  it('marks, rings and lights nothing at the empty mooring, and lays water over it', () => {
    const scene = town2Scene();
    const feet = { x: 18 * 24 + 12, y: 59 * 24 + 12 };
    const play = startPlay(feet);
    const options = {
      people: new Set<string>(),
      somewhereNew: true,
      panelOpen: false,
      hero: { x: feet.x - 14, y: feet.y - 66, w: 28, h: 68 },
    };
    expect(marksNow(scene, play, options).some((m) => m.id === 'rowboat')).toBe(true);
    expect(marksNow(scene, play, { ...options, away: true }).some((m) => m.id === 'rowboat')).toBe(
      false,
    );
    const water = document.createElement('canvas');
    const input = {
      scene,
      play,
      time: 'day' as const,
      now: 0,
      marks: { ...options, away: true },
      ring: null,
    };
    expect(townExtra(input, DAY).boxes).not.toContainEqual(MOORING);
    const gone = townExtra({ ...input, away: { water } }, DAY);
    expect(gone.boxes).toContainEqual(MOORING);
    expect(gone.ground).toBeDefined();
  });
});
