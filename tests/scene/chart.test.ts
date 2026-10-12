import { chartRoute } from '../../src/scene/fromLaneB';
import { ROUTE_SHORT, routeShort } from '../../src/scene/chartPanel';
import { describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel as lvl } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import {
  firstPick,
  landings,
  levelWarning,
  routeShown,
  routeTo,
  ROUTE_MS,
  whatToBring,
} from '../../src/scene/chart';
import { chartScale, chartShift, LANDING_CSS } from '../../src/scene/chartPanel';
import { harbourChart } from '../../src/scene/fromLaneB';

// The harbour chart's rules: every landing at its place on lane B's map, with
// where the character stands with it (lane A's `dungeonStatus`), what the boat
// will row to, which landing it opens on, and the route out.

const map = harbourChart();
const fresh = (): GameState => newGame('Cody', 0);
const byId = (state: GameState) =>
  Object.fromEntries(landings(state, CONTENT, map).map((l) => [l.id, l]));

describe('the harbour chart', () => {
  it('for a new save: the cave and the grotto open, the rest silhouettes, the cave picked first', () => {
    const list = landings(fresh(), CONTENT, map);
    expect(list.map((l) => l.id)).toEqual([
      'tidepool_cave',
      'brinebeards_grotto',
      'thistlewood_burrow',
      'unknown_2',
      'unknown_3',
    ]);
    const l = byId(fresh());
    expect(l.tidepool_cave).toMatchObject({ state: 'open', rowable: true, recommended: 1 });
    expect(l.brinebeards_grotto).toMatchObject({ state: 'open', rowable: true });
    for (const id of ['thistlewood_burrow', 'unknown_2', 'unknown_3']) {
      expect(l[id]).toMatchObject({ state: 'soon', name: null, description: null, rowable: false });
      expect(l[id]!.unlock.length).toBeGreaterThan(0);
    }
    expect(firstPick(list)).toBe('tidepool_cave');
    // Every landing sits on the map.
    for (const x of list) {
      expect(x.at.x).toBeGreaterThanOrEqual(0);
      expect(x.at.x).toBeLessThanOrEqual(map.width);
      expect(x.at.y).toBeGreaterThanOrEqual(0);
      expect(x.at.y).toBeLessThanOrEqual(map.height);
    }
  });

  it('mid-game: the cave cleared with its best time, the grotto the one to go to next', () => {
    const state = { ...fresh(), dungeons: { tidepool_cave: { clears: 2, bestMs: 84_000 } } };
    const l = byId(state);
    expect(l.tidepool_cave).toMatchObject({
      state: 'cleared',
      clears: 2,
      bestMs: 84_000,
      rowable: true,
    });
    expect(firstPick(landings(state, CONTENT, map))).toBe('brinebeards_grotto');
    // Far under the grotto's level, the chart says so plainly; never at the cave.
    expect(levelWarning(state, l.brinebeards_grotto!)).toMatch(/19 levels short/);
    expect(levelWarning(state, l.tidepool_cave!)).toBeNull();
    expect(whatToBring(state, l.brinebeards_grotto!)).toMatch(/no food/);
  });

  it('all cleared: both rowable and cleared, the next landing to come open to see but not to row to', () => {
    const state = {
      ...fresh(),
      skills: { melee: lvl(30), defence: lvl(30), vitality: lvl(30) },
      dungeons: {
        tidepool_cave: { clears: 3, bestMs: 70_000 },
        brinebeards_grotto: { clears: 1, bestMs: 500_000 },
      },
    };
    const l = byId(state);
    expect(l.tidepool_cave!.state).toBe('cleared');
    expect(l.brinebeards_grotto!.state).toBe('cleared');
    expect(levelWarning(state, l.brinebeards_grotto!)).toBeNull();
    // Landings to come stay silhouettes, whatever is done.
    expect(l.thistlewood_burrow).toMatchObject({ state: 'soon', rowable: false, name: null });
    // Nothing open and never cleared: the chart opens on the last it can row to.
    expect(firstPick(landings(state, CONTENT, map))).toBe('brinebeards_grotto');
  });

  it('draws a route out from home to a landing over ROUTE_MS, the same every time', () => {
    const to = map.landings.brinebeards_grotto!;
    const route = routeTo(map.home, to);
    expect(route[0]).toEqual(map.home);
    expect(route.at(-1)!.x).toBeCloseTo(to.x, 6);
    expect(route.at(-1)!.y).toBeCloseTo(to.y, 6);
    expect(routeTo(map.home, to)).toEqual(route);
    expect(routeShown(0)).toBe(0);
    expect(routeShown(ROUTE_MS / 2)).toBe(0.5);
    expect(routeShown(ROUTE_MS * 3)).toBe(1);
  });

  it('shows the map at whole device pixels, a thumb per landing, cropped at its sides if narrow', () => {
    expect(LANDING_CSS).toBeGreaterThanOrEqual(48);
    for (const width of [360, 390, 430]) {
      const room = width - 40;
      const k = chartScale(map.width, room, 3);
      expect(Number.isInteger(k * 3)).toBe(true);
      // Never smaller than one CSS pixel an art pixel on a 3x phone: a narrow one crops instead.
      expect(k).toBeGreaterThanOrEqual(1);
      const box = Math.min(map.width * k, room);
      const xs = [...Object.values(map.landings).map((p) => p.x), map.home.x].map((x) => x * k);
      const shift = chartShift(map.width * k, box, xs);
      // Every landing's button is inside what shows.
      for (const x of xs) {
        expect(x - shift - LANDING_CSS / 2, `${width}`).toBeGreaterThanOrEqual(-LANDING_CSS / 2);
        expect(x - shift + LANDING_CSS / 2, `${width}`).toBeLessThanOrEqual(box + LANDING_CSS / 2);
      }
    }
  });

  it('stops the route and its boat short of the landing, clear of its marker', () => {
    const home = { x: 40, y: 60 };
    const to = { x: 200, y: 90 };
    const dots = chartRoute(home, to);
    const short = routeShort(dots, to);
    expect(short.length).toBeGreaterThan(0);
    // A route laid right up to the landing loses its last dots.
    const straight = Array.from({ length: 11 }, (_, i) => ({
      x: home.x + (i * (to.x - home.x)) / 10,
      y: home.y,
    }));
    expect(routeShort(straight, { x: to.x, y: home.y })).toHaveLength(10);
    for (const p of short)
      expect(Math.hypot(p.x - to.x, p.y - to.y)).toBeGreaterThanOrEqual(ROUTE_SHORT);
    // From home all the same.
    expect(short[0]).toEqual(dots[0]);
  });
});
