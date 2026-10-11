import { h } from './dom';
import { formatDuration } from './format';

/**
 * The title screen (Cody chose "the harbour at dusk"; lane B draws it behind
 * `titleScene` in src/art/title.ts): the first thing on every cold start,
 * and a menu entry away. With no game, "Tap to begin" leads to making a
 * character; with one, "Continue" says whose game and how long it has been
 * left, and leads back into it, where the time away is paid as on any start.
 *
 * The picture's code is loaded only when the title is shown, so a returning
 * player's game is never held up by it; until it arrives the screen is the
 * dusk colour with the name and the button already there to tap, never blank.
 */
export interface TitleScreen {
  readonly el: HTMLElement;
  /** Called every frame with the app's clock: redraws the picture as often as it asks. */
  tick(ms: number): void;
  /** Stops drawing and lets the picture's memory go. */
  dispose(): void;
}

export interface TitleOptions {
  /** The character's name, or null with no game to continue. */
  name: string | null;
  /** How long the game has been left, if there is one. */
  awayMs: number | null;
  /** The app's clock at the moment the title is shown. */
  now: number;
  /** Begin (no game) or continue (a game). */
  go(): void;
}

/** A gap shorter than this is not worth saying "away" about. */
const SAY_AWAY_MS = 60_000;

const ratio = (): number =>
  typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;

const lessMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The art's door, as much of it as the title needs (it loads later). */
interface Scene {
  canvas: HTMLCanvasElement;
  draw(ms: number): void;
  safe: { x: number; y: number; w: number; h: number };
  dispose(): void;
}

export function titleScreen({ name, awayMs, now, go }: TitleOptions): TitleScreen {
  const fresh = name === null;
  const button = h(
    'button',
    {
      class: 'btn primary title-go',
      attrs: { type: 'button', 'data-title-go': fresh ? 'begin' : 'continue' },
      on: { click: () => go() },
    },
    [fresh ? 'Tap to begin' : 'Continue'],
  );
  const who =
    name !== null &&
    h('p', {
      class: 'title-who',
      text:
        awayMs !== null && awayMs >= SAY_AWAY_MS
          ? `${name} · away ${formatDuration(awayMs)}`
          : name,
    });
  const menu = h('div', { class: 'title-menu' }, [
    button,
    who,
    h('p', { class: 'title-version', text: `v${__APP_VERSION__}` }),
  ]);
  // The name in words until the picture (which carries the logotype) arrives.
  const words = h('h1', { class: 'title-words', text: 'Hearth & Harbour' });
  const el = h(
    'main',
    {
      class: 'title-screen',
      attrs: { 'data-title': fresh ? 'new' : 'continue' },
      // With no game yet, a tap anywhere begins.
      on: { click: (event) => fresh && event.target !== button && go() },
    },
    [words, menu],
  );

  let scene: Scene | null = null;
  let gone = false;
  let lastDraw = -Infinity;
  let shownAt = now;
  let make: ((w: number, hgt: number, dpr: number) => Scene) | null = null;
  let frameMs = 125;

  /** Builds the picture for the screen as it is now, and puts the menu inside its safe box. */
  const build = (): void => {
    if (!make || gone) return;
    scene?.dispose();
    scene?.canvas.remove();
    const box = el.getBoundingClientRect();
    const width = box.width || Math.min(typeof innerWidth === 'number' ? innerWidth : 390, 480);
    const height = box.height || (typeof innerHeight === 'number' ? innerHeight : 844);
    scene = make(width, height, ratio());
    scene.canvas.classList.add('title-picture');
    el.prepend(scene.canvas);
    el.classList.add('drawn');
    const { x, y, w, h: tall } = scene.safe;
    Object.assign(menu.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${tall}px`,
      bottom: 'auto',
      right: 'auto',
    });
    scene.draw(0);
    lastDraw = -Infinity;
  };
  const resized = (): void => build();

  void import('../art/title').then((art) => {
    if (gone) return;
    make = art.titleScene;
    frameMs = art.TITLE_FRAME_MS;
    build();
    if (typeof addEventListener === 'function') addEventListener('resize', resized);
  });

  return {
    el,
    tick(ms) {
      if (!scene) return;
      if (lastDraw === -Infinity) {
        // The first frame after the picture arrives sets its clock going from here.
        shownAt = ms;
        lastDraw = ms;
        return;
      }
      // With less motion, frame 0 (drawn on arrival) is the whole of it.
      if (lessMotion() || ms - lastDraw < frameMs) return;
      lastDraw = ms;
      scene.draw(ms - shownAt);
    },
    dispose() {
      gone = true;
      if (typeof removeEventListener === 'function') removeEventListener('resize', resized);
      scene?.dispose();
      scene = null;
    },
  };
}
