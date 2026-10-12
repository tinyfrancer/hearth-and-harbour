/*
 * The tracker in a run's corner (wave 18): three lines at the most in a
 * hand to read mid-fight, what can still be had first, the lost last.
 */
import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { HUD_SIZES } from '../../src/scene/hud';
import {
  TRACKER_LINES,
  trackerShown,
  trackerView,
  type TrackerLine,
} from '../../src/scene/runCard';
import { beginCave, novice } from './caveBot';

describe('the tracker', () => {
  it('shows three lines at the most: what can still be had first, the one against the clock first of those', () => {
    const line = (id: string, state: TrackerLine['state'], clock?: string): TrackerLine => ({
      id,
      name: id,
      state,
      ...(clock ? { clock } : {}),
    });
    const shown = trackerShown([
      line('a', 'lost'),
      line('b', 'met'),
      line('c', 'open'),
      line('d', 'open', '0:10 / 2:00'),
      line('e', 'waiting'),
    ]);
    expect(TRACKER_LINES).toBe(3);
    expect(shown.map((l) => l.id)).toEqual(['d', 'c', 'e']);
    expect(trackerShown([line('a', 'lost'), line('b', 'met')]).map((l) => l.id)).toEqual([
      'b',
      'a',
    ]);
  });

  it('hides the rest in the run, and keeps its box for three 16-pixel lines', () => {
    const t = trackerView(CONTENT, 'tidepool_cave', newGame('Cody', 0), {
      folded: false,
      fold: () => {},
    });
    t.update(beginCave(novice(), 3, false), true);
    const lis = [...t.el.querySelectorAll('li')];
    expect(lis).toHaveLength(4);
    expect(lis.filter((li) => !li.hidden)).toHaveLength(TRACKER_LINES);
    // Three lines of 18 and its padding fit the box the layout gives it.
    expect(TRACKER_LINES * 18 + 8).toBeLessThanOrEqual(HUD_SIZES.tracker.h);
  });
});
