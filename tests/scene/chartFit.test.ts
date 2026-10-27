/*
 * The chart's panel on a phone (wave 18): what a player decides by comes
 * first and stays in view (the seal and name, the day, the medals and the
 * level, Row out / Send him in), the rest in a box of its own that scrolls;
 * a medal tapped says its words; one done since the chart last showed it
 * glints once; the map is cropped round the landing picked, never shrunk.
 * (The sizes themselves are measured in the browser at 390 x 844 and
 * 360 x 740: `docs/status/lane-c.md`.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { chartPanel, chartShiftY, forgetMedalsSeen, levelWords } from '../../src/scene/chartPanel';
import { CHALLENGE_MEDAL_FRAME_MS, CHALLENGE_MEDAL_FRAMES } from '../../src/scene/fromLaneB';
import { combatLevel } from '../../src/core/bounty';

const CAVE = CONTENT.dungeons!.tidepool_cave!.challenges!;
const me = (done: string[] = []): GameState => ({
  ...newGame('Cody', 0),
  dungeons: { tidepool_cave: { clears: 1, challenges: done } },
});

beforeEach(() => {
  vi.stubGlobal('devicePixelRatio', 3);
  forgetMedalsSeen();
});
afterEach(() => vi.unstubAllGlobals());

const open = (state: () => GameState) => {
  const panel = chartPanel({
    content: CONTENT,
    state,
    rowOut: () => {},
    close: () => {},
    today: (id) => (id === 'tidepool_cave' ? 'slack_tide' : null),
    sendIn: () => {},
  });
  panel.pick('tidepool_cave');
  return panel;
};

describe('the chart’s panel on a phone', () => {
  it('puts the decision first and the rest in a scrolling box, the buttons last', () => {
    const panel = open(() => me());
    const detail = panel.el.querySelector('.chart-detail')!;
    const order = [...detail.children].map((c) => c.className);
    expect(order[0]).toBe('chart-name');
    expect(order.indexOf('chart-day')).toBeLessThan(order.indexOf('chart-goal-row'));
    expect(order.indexOf('chart-goal-row')).toBeLessThan(order.indexOf('chart-more-box'));
    expect(order.at(-1)).toBe('chart-go');
    // The line, the record and what to bring are in the box that scrolls, not above it.
    const more = detail.querySelector('.chart-more')!;
    expect(more.querySelector('.chart-bring')).not.toBeNull();
    expect(more.querySelector('.chart-record')).not.toBeNull();
    // The level beside the medals, short; said in full to a screen reader.
    const level = detail.querySelector('.chart-goal-row .chart-level')!;
    expect(level.textContent).toBe(levelWords(1, combatLevel(me())));
    expect(level.getAttribute('aria-label')).toMatch(/^Meant for combat level 1\./);
    // Row out and Send him in side by side, when the dungeon can be run unattended.
    const go = detail.querySelector('.chart-go')!;
    expect([...go.querySelectorAll('button')].map((b) => b.textContent)).toContain('Row out');
  });

  it('shows the challenges as medals, a thumb’s width each, and says one’s words when tapped', () => {
    const panel = open(() => me([CAVE[0]!.id]));
    const medals = [...panel.el.querySelectorAll<HTMLButtonElement>('.chart-medal')];
    expect(medals).toHaveLength(CAVE.length);
    const said = panel.el.querySelector<HTMLElement>('.chart-said')!;
    expect(said.hidden).toBe(true);
    medals[0]!.click();
    expect(said.hidden).toBe(false);
    expect(said.textContent).toBe(`${CAVE[0]!.name}: ${CAVE[0]!.text} Done.`);
    expect(medals[0]!.getAttribute('aria-expanded')).toBe('true');
    medals[1]!.click();
    expect(said.textContent).toBe(`${CAVE[1]!.name}: ${CAVE[1]!.text}`);
    expect(medals[0]!.getAttribute('aria-expanded')).toBe('false');
    // Tapped again, it goes.
    medals[1]!.click();
    expect(said.hidden).toBe(true);
    // Each says its words to a screen reader without a tap.
    expect(medals[2]!.getAttribute('aria-label')).toContain(CAVE[2]!.text);
  });

  it('glints a medal done since the chart last showed it, once, and plainly after', () => {
    let state = me();
    open(() => state).el.remove();
    state = me([CAVE[1]!.id]);
    const panel = open(() => state);
    const news = (p: ReturnType<typeof open>) =>
      [...p.el.querySelectorAll('.chart-goals li')].map((l) => l.getAttribute('data-new'));
    expect(news(panel)).toEqual(['false', 'true', 'false', 'false']);
    // Its frames by the app's clock, through to the plain gold.
    panel.update(state, 1000);
    panel.update(state, 1000 + CHALLENGE_MEDAL_FRAMES * CHALLENGE_MEDAL_FRAME_MS);
    // Seen now: the next chart shows it plainly.
    expect(news(open(() => state))).toEqual(['false', 'false', 'false', 'false']);
    // A medal done before the page first showed the chart is not new.
    forgetMedalsSeen();
    const fresh = open(() => me([CAVE[2]!.id]));
    expect(fresh.el.querySelector('.chart-goals li[data-new="true"]')).toBeNull();
  });

  it('crops the map round the landing picked, never past its edges', () => {
    expect(chartShiftY(300, 300, 120)).toBe(0);
    expect(chartShiftY(300, 400, 120)).toBe(0);
    // The landing in the middle of a shorter box.
    expect(chartShiftY(300, 200, 150)).toBe(50);
    // Near the top or the bottom, the map's edge holds.
    expect(chartShiftY(300, 200, 40)).toBe(0);
    expect(chartShiftY(300, 200, 290)).toBe(100);
    // Not laid out yet (jsdom): uncropped.
    expect(chartShiftY(300, 0, 150)).toBe(0);
  });

  it('runs a landing’s name inward near the map’s edge, never off it', () => {
    // Lane B's Burrow landing is near the map's left edge (B20): its name starts at it.
    const panel = open(() => me());
    const side = (id: string) =>
      panel.el.querySelector<HTMLElement>(`.chart-landing[data-id="${id}"]`)?.dataset.side;
    expect(side('thistlewood_burrow')).toBe('start');
    expect(side('tidepool_cave')).not.toBe('start');
  });

  it('keeps the ferryman’s word over the map, and offers no medals for a landing not open', () => {
    const panel = chartPanel({
      content: CONTENT,
      state: () => newGame('Cody', 0),
      say: { who: 'Pascoe', line: 'A line.' },
      rowOut: () => {},
      close: () => {},
    });
    expect(panel.el.querySelector('.chart-map .chart-say')!.textContent).toBe('Pascoe: A line.');
    panel.pick('thistlewood_burrow');
    expect(panel.el.querySelector('.chart-medal')).toBeNull();
    expect(panel.el.querySelector('.chart-more .chart-unlock')).not.toBeNull();
  });
});
