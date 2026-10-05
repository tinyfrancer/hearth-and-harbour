/*
 * A dungeon run on screen: the room on the stage, the prompt to turn the
 * phone on its side, the way out, the dark of going through a door, and the
 * results at the end. The rules are in `dungeon.ts`; this only shows them and
 * passes on time and taps. Where the run is lives with the Town tab
 * (`townView.ts`), so a rebuilt tab finds it as it was.
 */
import type { GameState } from '../core/state';
import { button, h } from '../ui/dom';
import type { View } from '../ui/view';
import {
  advanceRun,
  doorwayDark,
  roomScene,
  runTime,
  sideways,
  type Dungeon,
  type Run,
} from './dungeon';
import type { Hero } from './hero';
import type { Play } from './play';
import { dungeonScale } from './scale';
import { stage, type Insets } from './stage';
import { HERO_FEET } from './townArt';

/**
 * Room kept at the screen's edges, in CSS pixels: the Leave button at the
 * top, the notches at the sides of a phone on its side, and where the health
 * bars (top) and the ability bar (bottom) will go. The camera keeps the hero
 * clear of all of it.
 */
export const DUNGEON_INSETS: Insets = { top: 56, right: 56, bottom: 72, left: 56 };

/** The longest stretch of time one frame may add to a run; a page back from the background adds no more. */
const MAX_FRAME_MS = 250;

export interface DungeonViewOptions {
  readonly dungeon: Dungeon;
  /** The run as it stands, and a way to keep it when it changes. */
  readonly run: () => Run;
  readonly keep: (run: Run) => void;
  readonly hero: Hero;
  /** The player chose to go back to town: from Leave (once confirmed) or the results. */
  readonly leave: () => void;
  /** The run has just reached its end. */
  readonly finished: () => void;
}

export function dungeonView(options: DungeonViewOptions): View {
  const { dungeon, hero } = options;
  const room = h('div', { class: 'dungeon-room' });
  const fade = h('div', { class: 'dungeon-fade', attrs: { 'aria-hidden': 'true' } });

  const promptLine = h('p');
  const prompt = h(
    'section',
    { class: 'dungeon-prompt', attrs: { 'aria-label': 'Turn your phone on its side' } },
    [
      h('div', { class: 'dungeon-phone', attrs: { 'aria-hidden': 'true' } }),
      h('h2', { text: 'Turn your phone on its side' }),
      promptLine,
    ],
  );

  const confirm = h('div', { class: 'dungeon-confirm', attrs: { role: 'group' } });
  const leaveButton = h('button', {
    class: 'btn dungeon-leave',
    text: 'Leave',
    attrs: { type: 'button' },
    on: {
      click: () => {
        // Asks once more: a stray thumb should not end a run.
        if (confirm.childElementCount > 0) return;
        leaveButton.hidden = true;
        confirm.replaceChildren(
          h('p', { text: 'Row back to town?' }),
          h('div', { class: 'row' }, [
            button('Row back', () => options.leave(), 'primary'),
            button('Stay', () => {
              confirm.replaceChildren();
              leaveButton.hidden = false;
            }),
          ]),
        );
      },
    },
  });
  const way = h('div', { class: 'dungeon-way' }, [leaveButton, confirm]);

  const root = h('div', { class: 'dungeon' }, [room, fade, prompt, way]);

  /** The view's size in CSS pixels: whether the phone is on its side. */
  let size = { width: 0, height: 0 };
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(([entry]) => {
      if (!root.isConnected) {
        observer.disconnect();
        return;
      }
      if (entry) size = { width: entry.contentRect.width, height: entry.contentRect.height };
    });
    observer.observe(root);
  }

  let roomShown = '';
  let play: Play = options.run().play;
  let roomView: View | null = null;
  const playing = (): boolean => {
    const run = options.run();
    return sideways(size) && !run.doorway && !run.finished;
  };

  const showRoom = (): void => {
    const run = options.run();
    const { scene, art } = roomScene(dungeon.rooms[run.room]!);
    play = run.play;
    roomShown = run.room;
    roomView = stage({
      scene,
      art: {
        ground: art.ground,
        heroFeet: HERO_FEET,
        walkerAt: (feet, facing, palette) => hero.at(feet, facing, palette.lightsOn),
        shadowAt: art.shadowAt,
      },
      play,
      keep: (next) => {
        play = next;
      },
      press: () => {},
      scaleOf: dungeonScale,
      insets: DUNGEON_INSETS,
      frozen: () => !playing(),
      label: 'A cave. Tap the ground to walk there.',
      fallback: 'The grotto needs a browser that can draw on a canvas.',
    });
    room.replaceChildren(roomView.el);
  };

  let results: HTMLElement | null = null;
  const showResults = (): void => {
    if (results) return;
    leaveButton.hidden = true;
    confirm.replaceChildren();
    results = h('section', { class: 'dungeon-results', attrs: { 'aria-label': 'Results' } }, [
      h('div', { class: 'dungeon-card' }, [
        h('h2', { text: 'You reached the end' }),
        h('p', { class: 'dungeon-time', text: `Time taken: ${runTime(options.run().ms)}` }),
        h('p', {
          class: 'muted',
          text: 'Nothing down here yet but a damp floor and a good echo. Someone will be along to fill it.',
        }),
        button('Back to town', () => options.leave(), 'primary'),
      ]),
    ]);
    root.append(results);
  };

  showRoom();
  if (options.run().finished) showResults();

  let last: number | null = null;
  return {
    el: root,
    update: (state: GameState) => {
      const now = performance.now();
      const ms = last === null ? 0 : Math.min(Math.max(now - last, 0), MAX_FRAME_MS);
      last = now;
      const before = options.run();
      const ready = sideways(size);
      prompt.hidden = ready || before.finished;
      promptLine.textContent =
        before.ms > 0
          ? 'The grotto will wait. Nothing in it is going anywhere.'
          : 'The grotto is wide and low. So, to be fair, is the boat.';
      roomView?.update?.(state);
      if (ready && !before.finished) {
        const after = advanceRun(dungeon, before, play, ms);
        options.keep(after);
        if (after.room !== roomShown) showRoom();
        if (after.finished) {
          showResults();
          options.finished();
        }
      }
      fade.style.opacity = String(doorwayDark(options.run().doorway));
    },
  };
}
