/*
 * A dungeon run on screen: the room on the stage with whatever fights in it,
 * the hero's health and his target's at the top, the ability and food
 * buttons under the left thumb, the prompt to turn the phone on its side, the
 * way out, the dark of going through a door, and the results at the end. The
 * rules are in `dungeon.ts` and `battle.ts`; this only shows them and passes
 * on time, taps and presses. Where the run is lives with the Town tab
 * (`townView.ts`), so a rebuilt tab finds it as it was.
 */
import { DAY } from '../art/palette';
import { pixelCanvas } from '../art/canvas';
import { itemIcon, skillIcon } from '../art/icons';
import { PLAYER_ATTACK_MS } from '../core/combat';
import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import { button, h } from '../ui/dom';
import type { View } from '../ui/view';
import {
  ABILITIES,
  FOOD_MS,
  abilityProblem,
  alive,
  arrowsLeft,
  bossOf,
  cooldownLeft,
  eat,
  foeAt,
  foodLeft,
  foodProblem,
  held,
  stopChasing,
  targetFoe,
  tideOf,
  useAbility,
  type Battle,
  type Tally,
} from './battle';
import {
  advanceRun,
  doorwayDark,
  groundNow,
  placeOf,
  runTime,
  sideways,
  type Dungeon,
  type Run,
} from './dungeon';
import {
  HERO_TALL,
  fightArtFor,
  fightExtra,
  heroLunge,
  liftOf,
  tapLift,
  tideStateOf,
  type FightArt,
} from './fightArt';
import { anchorOf, FIGURE2_SOLE_Y, heroPose } from './figures2';
import { wholeFace } from './face';
import { abilityPicture, foeKind } from './foes';
import { foeSize2 } from '../art/dungeonArt2';
import {
  CaveShadow,
  groundOnTheSpot,
  roomLook,
  type GroundPainter,
  type RoomLook,
} from './grottoArt';
import type { Play } from './play';
import type { Size } from './camera';
import type { Point } from './tileMap';
import { dungeonScale } from './scale';
import { DUNGEON } from './dungeonMetrics';
import { stage, type Insets, type StillPicture } from './stage';
import { HIGH_WATER, gaugeLevel, rising, type TideNow } from './tide';
import { FIGURE2_FEET, type Hero2 } from './town2Art';

/**
 * Room kept at the screen's edges, in CSS pixels: the health bars and the
 * Leave button at the top, the notches at the sides of a phone on its side,
 * and the ability bar at the bottom. The camera keeps the hero clear of all
 * of it.
 */
export const DUNGEON_INSETS: Insets = { top: 64, right: 56, bottom: 80, left: 56 };

/** How far above the hero's feet the camera looks: the middle of a 64-pixel figure, as in town. */
export const FOCUS_RISE_DUNGEON = 30;

/** Half the width of the hero's contact shadow, as the art lane's figures are shaded (22 across). */
export const HERO_SHADOW = 11;

/** An empty figure: the stage's plain walker, never shown (the hero comes placed). */
let empty: HTMLCanvasElement | null = null;
function nobody(): HTMLCanvasElement {
  empty ??= document.createElement('canvas');
  return empty;
}

export interface DungeonViewOptions {
  readonly dungeon: Dungeon;
  readonly content: Content;
  /** The run as it stands, and a way to keep it when it changes. */
  readonly run: () => Run;
  readonly keep: (run: Run) => void;
  /** The hero at the C scale, dressed as the character is; lit here by each room's lanterns. */
  readonly hero: Hero2;
  /** Paints the rooms' grounds: the run's worker, or on the spot. */
  readonly painter?: GroundPainter;
  /** The player chose to go back to town: from Leave (once confirmed) or the results. */
  readonly leave: () => void;
  /** The run has just ended by itself: the last room cleared, or the hero down. */
  readonly finished: () => void;
}

/** Whole seconds left on a cooldown, as the button shows it. */
export function secondsLeft(ms: number): string {
  return ms > 0 ? String(Math.ceil(ms / 1000)) : '';
}

/** How full a bar is, in hundredths: a bar moves only when this does. */
const fraction = (part: number, whole: number): number =>
  Math.round((100 * Math.max(0, Math.min(part, whole))) / Math.max(1, whole)) / 100;

/** Sets text only when it changes, so a frame does not touch the page for nothing. */
function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/**
 * Fills a bar (across) or a shade (upwards) by a transform rather than its
 * size, so a bar moving every frame costs no layout, only the compositor.
 */
function fill(el: HTMLElement, axis: 'X' | 'Y', k: number): void {
  const value = `scale${axis}(${k})`;
  if (el.style.transform !== value) el.style.transform = value;
}

/** A box in CSS pixels from the room's top-left. */
export interface CssBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Where a room's name may show, in CSS pixels from the top or bottom of the
 * room: under the health bars at the top (`.dungeon-title` in `scene.css`),
 * above the ability bar at the bottom, or in the HUD's own strip at the top
 * in the target panel's place (`strip`), which the panel gives up while the
 * name shows.
 */
export const TITLE_SLOTS = { top: 72, bottom: 88, strip: 8 } as const;
export type TitleSlot = keyof typeof TITLE_SLOTS;

/** How long a room's name shows, on the run's clock: in, held, and out. */
export const TITLE_MS = 2800;

/**
 * How seen a room's name is `ms` into its moment, 0 to 1 (in over the first
 * eighth, held to seven tenths, out by the end); null once it is over.
 */
export function titleOpacity(ms: number): number | null {
  if (ms >= TITLE_MS || ms < 0) return null;
  const t = ms / TITLE_MS;
  if (t < 0.12) return t / 0.12;
  if (t <= 0.7) return 1;
  return (1 - t) / 0.3;
}

/** The HUD's strip at the top, the target panel's place: as tall as that panel, in CSS pixels. */
export const STRIP_HEIGHT = 60;

const crosses = (a: CssBox, b: CssBox): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The box a room's name covers in a slot, centred across a room `view` wide and tall. */
export function titleBox(slot: TitleSlot, view: Size, banner: Size): CssBox {
  const x = (view.width - banner.width) / 2;
  if (slot === 'strip')
    return { x, y: TITLE_SLOTS.strip, w: banner.width, h: Math.min(banner.height, STRIP_HEIGHT) };
  const y = slot === 'top' ? TITLE_SLOTS.top : view.height - TITLE_SLOTS.bottom - banner.height;
  return { x, y, w: banner.width, h: banner.height };
}

/**
 * Where a room's name goes so it covers nobody in the fight (`combatants`,
 * each figure's box with its health bar): the slot it is in if that is
 * clear, else the other over the room, else the HUD's strip at the top. The
 * strip is the target panel's own place, laid over the room whatever is
 * under it; the name takes it only for its moment, and the panel waits, so
 * the name is always read and covers no more of the fight than the panel
 * does.
 */
export function titleSlot(
  combatants: readonly CssBox[],
  view: Size,
  banner: Size,
  now: TitleSlot = 'top',
): TitleSlot {
  const clear = (slot: TitleSlot) =>
    !combatants.some((c) => crosses(c, titleBox(slot, view, banner)));
  if (now === 'strip') return 'strip';
  if (clear(now)) return now;
  const other: TitleSlot = now === 'top' ? 'bottom' : 'top';
  return clear(other) ? other : 'strip';
}

/** How far above a figure's drawing its health bar and the marks over it reach, in art pixels. */
const OVERHEAD = 22;

/** The hero's figure as boxes are drawn round him: as wide as his body and gear, as tall as he stands. */
export const HERO_BOX = { w: 28, h: HERO_TALL } as const;

/**
 * Everyone fighting in the room as boxes on screen, in CSS pixels: the hero
 * and every foe still standing, each figure's box (the art lane's declared
 * sizes, a bird up on its perch where it sits) and what is drawn over it.
 */
export function combatantBoxes(
  dungeon: Dungeon,
  run: Run,
  camera: Point,
  cssPerArt: number,
): CssBox[] {
  const toCss = (feet: Point, w: number, h: number): CssBox => ({
    x: (feet.x - w / 2 - camera.x) * cssPerArt,
    y: (feet.y - h - OVERHEAD - camera.y) * cssPerArt,
    w: w * cssPerArt,
    h: (h + OVERHEAD + 4) * cssPerArt,
  });
  const boxes = [toCss(run.play.walker.at, HERO_BOX.w, HERO_BOX.h)];
  const room = dungeon.rooms[run.room];
  for (const foe of run.battle?.foes ?? []) {
    if (foe.room !== run.room || !alive(foe)) continue;
    const size = foeSize2(foe.monster);
    const box = foeKind(foe.monster).box;
    const lift = room ? liftOf(room, foe) : 0;
    boxes.push(
      toCss(
        { x: foe.at.x, y: foe.at.y - lift },
        Math.max(box.w, size?.box.w ?? 0) + 8,
        Math.max(box.h, size?.tall ?? 0),
      ),
    );
  }
  return boxes;
}

/**
 * A foe's whole face for the target panel, or null if the art lane has
 * none: its portrait at whole device pixels, as large as fits the top strip,
 * in a frame its own size (`face.ts`), so everything in its safe box
 * (`PORTRAIT2_SAFE`) shows, hat to chin, at any screen.
 */
export function framedFace(id: string): Element | null {
  return wholeFace(id);
}

/** A picture for a button, two CSS pixels to the art pixel. */
function buttonPicture(id: string): HTMLCanvasElement | null {
  const pic = abilityPicture(id);
  if (!pic) return null;
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const canvas = pixelCanvas(pic, { palette: DAY, scale: Math.round(2 * dpr), dpr });
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

/** One of the buttons under the thumb: a picture, a name, and a shade that drains as it cools. */
interface FightButton {
  readonly el: HTMLButtonElement;
  readonly shade: HTMLElement;
  readonly count: HTMLElement;
}

function fightButton(
  name: string,
  picture: Element | null,
  extraClass: string,
  act: () => void,
): FightButton {
  const shade = h('span', { class: 'fight-shade', attrs: { 'aria-hidden': 'true' } });
  const count = h('span', { class: 'fight-count' });
  const el = h(
    'button',
    { class: `fight-button ${extraClass}`.trim(), attrs: { type: 'button', 'aria-label': name } },
    [picture, h('span', { class: 'fight-name', text: name }), shade, count],
  );
  // Pressed means used: on the press, not the lift, as a fight needs.
  el.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    act();
  });
  el.addEventListener('click', (event) => {
    // A keyboard's press (no pointer) arrives only as a click.
    if (event.detail === 0) act();
  });
  return { el, shade, count };
}

/** What the tide gauge says the water is doing. */
export function tideWords(tide: TideNow, clock: number): string {
  if (rising(tide, clock)) return 'Rising';
  if (tide.next && tide.next.level < tide.level && tide.next.at - clock <= 3000) return 'Falling';
  if (tide.level === 0) return 'Low tide';
  if (tide.level === HIGH_WATER) return 'High tide';
  return tide.next && tide.next.level > tide.level ? 'Flowing' : 'Ebbing';
}

/** One line of results: an icon if there is one, a name, and an amount. */
function resultLine(icon: Element | null, name: string, amount: string): HTMLElement {
  return h('li', {}, [
    h('span', { class: 'run-icon' }, [icon]),
    h('span', { class: 'run-what', text: name }),
    h('span', { class: 'run-amount', text: amount }),
  ]);
}

export function dungeonView(options: DungeonViewOptions): View {
  const { dungeon, hero, content } = options;
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
          h('p', { text: 'Row back to town? You keep what you’ve picked up.' }),
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

  /* ----- Health at the top: the hero's on the left, his target's in the middle ----- */

  const heroFill = h('span', { class: 'fight-fill' });
  const heroNumbers = h('span', { class: 'fight-numbers' });
  const heroSwing = h('span', { class: 'fight-swing-fill' });
  const heroPanel = h('div', { class: 'fight-hero', attrs: { 'aria-label': 'Your health' } }, [
    h('span', { class: 'fight-heart', attrs: { 'aria-hidden': 'true' } }),
    h('span', { class: 'fight-track' }, [heroFill, heroNumbers]),
    h('span', { class: 'fight-swing', attrs: { 'aria-hidden': 'true' } }, [heroSwing]),
  ]);

  const targetFace = h('span', { class: 'fight-face' });
  const targetName = h('span', { class: 'fight-target-name' });
  const targetFill = h('span', { class: 'fight-fill' });
  const targetNumbers = h('span', { class: 'fight-numbers' });
  const targetPanel = h('div', { class: 'fight-target', attrs: { 'aria-label': 'Your target' } }, [
    targetFace,
    h('span', { class: 'fight-target-body' }, [
      targetName,
      h('span', { class: 'fight-track' }, [targetFill, targetNumbers]),
    ]),
  ]);
  targetPanel.hidden = true;
  let targetShown: string | null = null;

  /* ----- A boss's health, in the target's place while he stands; the tide beside Leave ----- */

  const bossName = h('span', { class: 'fight-target-name' });
  const bossFill = h('span', { class: 'fight-fill' });
  const bossNumbers = h('span', { class: 'fight-numbers' });
  // His phases as notches across the bar where each begins, so the bar itself says how near the next is.
  const bossPhases = h('span', { class: 'fight-phases', attrs: { 'aria-hidden': 'true' } }, [
    h('i'),
    h('i'),
    h('i'),
  ]);
  const bossFace = h('span', { class: 'fight-face' });
  const bossPanel = h(
    'div',
    { class: 'fight-target fight-boss', attrs: { 'aria-label': 'The captain' } },
    [
      bossFace,
      h('span', { class: 'fight-target-body' }, [
        h('span', { class: 'fight-boss-head' }, [bossName]),
        h('span', { class: 'fight-track' }, [bossFill, bossPhases, bossNumbers]),
      ]),
    ],
  );
  bossPanel.hidden = true;
  let bossShown: string | null = null;

  const tideWater = h('span', { class: 'tide-water' });
  const tideWord = h('span', { class: 'tide-word' });
  const tideArrow = h('span', { class: 'tide-arrow', attrs: { 'aria-hidden': 'true' } });
  const tidePanel = h('div', { class: 'tide-gauge', attrs: { role: 'img' } }, [
    h('span', { class: 'tide-scale', attrs: { 'aria-hidden': 'true' } }, [
      tideWater,
      h('i'),
      h('i'),
      h('i'),
    ]),
    h('span', { class: 'tide-body' }, [h('span', { class: 'tide-label', text: 'Tide' }), tideWord]),
    tideArrow,
  ]);
  tidePanel.hidden = true;

  /** The room's name, shown for a moment as the hero comes in. */
  const title = h('div', { class: 'dungeon-title', attrs: { 'aria-live': 'polite' } });

  /* ----- The buttons under the left thumb ----- */

  const battleOf = (): Battle | null => options.run().battle;
  const style = battleOf()?.fighter.style ?? 'melee';
  const abilities = ABILITIES[style];

  const press = (slot: 0 | 1): void => {
    const run = options.run();
    if (!run.battle || run.finished || run.doorway) return;
    const used = useAbility(run.battle, placeOf(dungeon, run), run.play, slot);
    if (used.battle === run.battle) return;
    options.keep({ ...run, battle: used.battle, play: used.play });
  };
  const eatOne = (): void => {
    const run = options.run();
    if (!run.battle || run.finished || run.doorway) return;
    const fed = eat(run.battle, run.play.walker.at);
    if (fed !== run.battle) options.keep({ ...run, battle: fed });
  };

  const abilityButtons = abilities.map((a, i) =>
    fightButton(a.name, buttonPicture(a.id), '', () => press(i as 0 | 1)),
  );
  const food = battleOf()?.fighter.food ?? null;
  const foodButton = food ? fightButton('Eat', itemIcon(food.item), 'fight-food', eatOne) : null;
  const bar = h('div', { class: 'fight-bar' }, [
    ...abilityButtons.map((b) => b.el),
    foodButton?.el ?? null,
  ]);
  const hud = h('div', { class: 'fight-hud' }, [
    heroPanel,
    targetPanel,
    bossPanel,
    tidePanel,
    title,
    bar,
  ]);
  if (!battleOf()) hud.hidden = true;

  const root = h('div', { class: 'dungeon' }, [room, hud, fade, prompt, way]);

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
  /** The walker as last handed to the stage: a different one back means a tap moved him. */
  let given: Play = options.run().play;
  let roomView: View | null = null;
  const painter = options.painter ?? groundOnTheSpot;
  const lookOf = (id: string): RoomLook => {
    const l = roomLook(dungeon.rooms[id]!, painter);
    l.paintWith(painter);
    return l;
  };
  let look = lookOf(options.run().room);
  let art: FightArt = fightArtFor(look);
  /** The room's ground as last shown: kept on screen while the tide's next one is still being painted. */
  let lastStill: StillPicture | null = null;
  /**
   * Whether the room's ground is in: any state of its tide will do for the
   * moment the exact one is still being painted (`stillFor`). A room is
   * shown with its ground or not at all: it is painted ahead while the room
   * before is up, and at the latest in the dark of the door (`showRoom`).
   */
  const roomIn = (run: Run): boolean => {
    const s = tideStateOf(dungeon, run);
    return lastStill !== null || look.nearestIn(s.level, s.warn) !== null;
  };
  const playing = (): boolean => sideways(size) && !options.run().finished && roomIn(options.run());

  /**
   * The room as the tide has it now, darkening where it is about to come in;
   * until that is painted, the ground as last shown, or the nearest state of
   * the tide that is in.
   */
  const stillFor = (run: Run): StillPicture | null => {
    const s = tideStateOf(dungeon, run);
    const still = look.stillAt(s.level, s.warn);
    if (still) lastStill = still;
    if (still ?? lastStill) return still ?? lastStill;
    const near = look.nearestIn(s.level, s.warn);
    return near && look.stillAt(near.level, near.warn);
  };

  /** The hero's contact shadow, cut from the room's ground under his feet. */
  const heroShadow = new CaveShadow();

  /** The rooms in the order a run meets them: the one after this is painted ahead. */
  const order = Object.keys(dungeon.rooms);

  const showRoom = (): void => {
    const run = options.run();
    const here = dungeon.rooms[run.room]!;
    // Rooms behind are let go; this one and the next are kept and painted ahead.
    const at = order.indexOf(run.room);
    const next = order[at + 1];
    for (const id of order)
      if (id !== run.room && id !== next) roomLook(dungeon.rooms[id]!).forget();
    look = lookOf(run.room);
    // Painted ahead only where a worker paints them: on the spot, each is worked out when shown.
    if (painter.offThread) {
      look.warm();
      if (next) lookOf(next).warm();
    }
    art = fightArtFor(look);
    lastStill = null;
    // Never a dark room: if none of its ground is in yet, it is worked out now, in the dark of the
    // door (or, rowing out, after the town has waited for the worker as long as it will).
    const tide = tideStateOf(dungeon, run);
    if (!look.nearestIn(tide.level, tide.warn)) look.paintNow(tide.level, tide.warn);
    look.lock.map = groundNow(dungeon, run);
    given = run.play;
    roomShown = run.room;
    hero.lightBy(look.glows);
    roomView = stage({
      scene: look.scene,
      art: {
        still: () => stillFor(options.run()),
        heroFeet: FIGURE2_FEET,
        walkerAt: () => nobody(),
        walkerPlaced: (play, feet, _palette, now) => {
          const run = options.run();
          const pose = heroPose(play, now);
          const image = hero.at(feet, pose, 'dusk');
          hero.warm('dusk');
          const lean = run.battle ? heroLunge(run.battle, play.facing) : 0;
          return (
            image && {
              image,
              x: feet.x + lean - anchorOf(pose),
              y: feet.y - FIGURE2_SOLE_Y,
              base: feet.y,
            }
          );
        },
        shadowAt: (feet) => {
          const s = tideStateOf(dungeon, options.run());
          const cells = look.cellsAt(s.level, s.warn);
          if (!cells) return null;
          const placed = heroShadow.at(
            cells,
            look.kindsAt(s.level, s.warn),
            look.glows,
            feet,
            HERO_SHADOW,
          );
          return (
            placed && {
              picture: placed.image as HTMLCanvasElement,
              middle: { x: feet.x - placed.x, y: feet.y - placed.y },
            }
          );
        },
        life: look.flicker,
      },
      // A sea cave at dusk, lit by its lanterns.
      time: 'dusk',
      play: run.play,
      keep: () => {},
      press: () => {},
      scaleOf: (device) => dungeonScale(device, DUNGEON.scene.width),
      focusRise: FOCUS_RISE_DUNGEON,
      pixelated: true,
      overlay: true,
      insets: DUNGEON_INSETS,
      frozen: () => !playing(),
      drive: (play, ms) => {
        const before = options.run();
        const after = advanceRun(dungeon, before, play === given ? before.play : play, ms);
        options.keep(after);
        given = after.play;
        return after.play;
      },
      tap: (point, min, play) => {
        const run = options.run();
        if (!run.battle || run.finished || run.doorway) return null;
        const from = play === given ? run.play : play;
        // Being carried by the sea, a tap does nothing until he is on his feet.
        if (run.battle.wash) return from;
        const foe = foeAt(run.battle, run.room, point, min, tapLift(dungeon.rooms[run.room]!));
        if (!foe || held(run.battle, placeOf(dungeon, run), foe)) {
          options.keep({ ...run, battle: stopChasing(run.battle), play: from });
          return null;
        }
        const aimed = targetFoe(run.battle, placeOf(dungeon, run), from, foe.key);
        options.keep({ ...run, battle: aimed.battle, play: aimed.play });
        given = aimed.play;
        return aimed.play;
      },
      extra: () => fightExtra(dungeon, options.run(), look, art),
      seen: (camera, cssPerArt) => {
        lookedAt = { camera, cssPerArt };
      },
      label: 'A sea cave. Tap the ground to walk there, or something to fight it.',
      fallback: 'The grotto needs a browser that can draw on a canvas.',
    });
    room.replaceChildren(roomView.el);
    lookedAt = null;
    // The room's name waits until the room is seen (`showTitle`).
    titleFrom = null;
    titleWaiting = here.title !== null;
    title.classList.remove('shown');
    title.style.opacity = '0';
    title.textContent = here.title ?? '';
    title.dataset.slot = 'top';
  };

  /** When, on the run's own clock, the room's name began to show; null while it is not showing. */
  let titleFrom: number | null = null;
  /** Whether the room's name is still to show: the room has not been seen yet. */
  let titleWaiting = false;

  /**
   * The room's name, shown for its moment once the room is seen (sideways,
   * out of the door's dark, its ground in) and timed on the run's clock,
   * which stops behind the prompt to turn the phone and while the page is
   * away: so it is never played to a dark room or a covered screen.
   */
  const showTitle = (run: Run, visible: boolean): void => {
    if (titleWaiting && visible) {
      titleWaiting = false;
      titleFrom = run.ms;
      title.classList.add('shown');
    }
    if (titleFrom === null) return;
    const opacity = titleOpacity(run.ms - titleFrom);
    if (opacity === null) {
      titleFrom = null;
      title.classList.remove('shown');
      title.style.opacity = '0';
      return;
    }
    const value = String(Math.round(opacity * 100) / 100);
    if (title.style.opacity !== value) title.style.opacity = value;
  };

  /** Where the camera was for the last frame drawn, and the size of an art pixel on screen. */
  let lookedAt: { camera: Point; cssPerArt: number } | null = null;

  /** Keeps the room's name, while it shows, in a slot where it covers nobody in the fight. */
  const placeTitle = (run: Run): void => {
    if (!title.classList.contains('shown')) {
      if (title.dataset.slot === 'strip') title.dataset.slot = 'top';
      return;
    }
    if (!lookedAt) {
      title.style.visibility = 'hidden';
      return;
    }
    const banner = { width: title.offsetWidth || 260, height: title.offsetHeight || 36 };
    const now = (title.dataset.slot as TitleSlot | undefined) ?? 'top';
    const slot = titleSlot(
      combatantBoxes(dungeon, run, lookedAt.camera, lookedAt.cssPerArt),
      size,
      banner,
      now,
    );
    if (title.style.visibility !== '') title.style.visibility = '';
    if (title.dataset.slot !== slot) title.dataset.slot = slot;
  };

  /** Whether the room's name holds the HUD's strip just now: the target panel waits. */
  const nameInStrip = (): boolean =>
    title.classList.contains('shown') && title.dataset.slot === 'strip';

  let results: HTMLElement | null = null;
  const showResults = (): void => {
    if (results) return;
    leaveButton.hidden = true;
    confirm.replaceChildren();
    hud.hidden = true;
    const run = options.run();
    const tally: Tally | null = run.battle?.tally ?? null;
    const fell = run.ending === 'fell';
    const title = !run.battle
      ? 'You reached the end'
      : fell
        ? 'Washed back to town'
        : 'The grotto is cleared';
    const line = !run.battle
      ? 'Nothing down here yet but a damp floor and a good echo. Someone will be along to fill it.'
      : fell
        ? 'The tide put you back on the quay, damp but whole. Everything you picked up came with you.'
        : 'The captain has been seen off, and his crew with him. Their belongings have come with you.';
    const facts: HTMLElement[] = [
      h('p', { class: 'dungeon-time', text: `Time taken: ${runTime(run.ms)}` }),
    ];
    const earned: HTMLElement[] = [];
    if (tally) {
      facts.push(h('p', { text: `Kills: ${tally.kills}` }));
      if (tally.eaten > 0) facts.push(h('p', { text: `Eaten: ${tally.eaten}` }));
      if (tally.shot > 0) facts.push(h('p', { text: `Arrows shot: ${tally.shot}` }));
      for (const [skill, xp] of Object.entries(tally.xp)) {
        earned.push(
          resultLine(skillIcon(skill), content.skills[skill]?.name ?? skill, `+${xp} XP`),
        );
      }
      if (tally.coins > 0) earned.push(resultLine(null, 'Coins', `+${tally.coins}`));
      for (const [item, qty] of Object.entries(tally.loot)) {
        earned.push(resultLine(itemIcon(item), content.items[item]?.name ?? item, `×${qty}`));
      }
      if (earned.length === 0)
        earned.push(h('li', { class: 'muted', text: 'Nothing, this time.' }));
    }
    results = h('section', { class: 'dungeon-results', attrs: { 'aria-label': 'Results' } }, [
      h('div', { class: `dungeon-card${tally ? ' run-card' : ''}` }, [
        h('div', { class: 'run-head' }, [
          h('h2', { text: title }),
          h('p', { class: 'muted', text: line }),
          ...facts,
          button('Back to town', () => options.leave(), 'primary'),
        ]),
        tally ? h('ul', { class: 'run-earned', attrs: { 'aria-label': 'Earned' } }, earned) : null,
      ]),
    ]);
    root.append(results);
  };

  /** The top and bottom of the fight, brought up to date: only what changed is touched. */
  const showFight = (run: Run): void => {
    const battle = run.battle;
    if (!battle) return;
    const me = battle.fighter;
    fill(heroFill, 'X', fraction(battle.hp, me.maxHp));
    setText(heroNumbers, `${battle.hp}/${me.maxHp}`);
    heroPanel.classList.toggle('low', battle.hp * 4 <= me.maxHp);
    fill(heroSwing, 'X', fraction(PLAYER_ATTACK_MS - battle.blowMs, PLAYER_ATTACK_MS));

    // A boss in the room: his health holds the middle while he stands, whoever is the target.
    const boss = bossOf(battle, run.room);
    const bossUp = !!boss && alive(boss) && boss.aware;
    const strip = nameInStrip();
    bossPanel.hidden = !bossUp || strip;
    if (boss && bossUp) {
      const def = battle.monsters[boss.monster]!;
      if (bossShown !== boss.monster) {
        bossShown = boss.monster;
        setText(bossName, def.name);
        const face = framedFace(boss.monster);
        bossFace.replaceChildren(...(face ? [face] : []));
        bossFace.hidden = !face;
      }
      fill(bossFill, 'X', fraction(boss.hp, def.hp));
      setText(bossNumbers, `${boss.hp}/${def.hp}`);
      const phases = foeKind(boss.monster).boss?.phases ?? [];
      [...bossPhases.children].forEach((notch, i) => {
        const at = phases[i];
        const el = notch as HTMLElement;
        el.hidden = at === undefined;
        if (at === undefined) return;
        el.style.left = `${(at * 100).toFixed(2)}%`;
        // Passed once he is into the phase it marks.
        el.classList.toggle('done', boss.phase > i + 1);
      });
    }

    const target = battle.foes.find((f) => f.key === battle.target && alive(f)) ?? null;
    targetPanel.hidden = !target || bossUp || strip;
    if (target && !bossUp) {
      const def = battle.monsters[target.monster]!;
      if (targetShown !== target.monster) {
        targetShown = target.monster;
        setText(targetName, `${def.name} · ${def.level}`);
        const face = framedFace(target.monster);
        targetFace.replaceChildren(...(face ? [face] : []));
        targetFace.hidden = !face;
      }
      fill(targetFill, 'X', fraction(target.hp, def.hp));
      setText(targetNumbers, `${target.hp}/${def.hp}`);
    }

    const place = placeOf(dungeon, run);
    const tidal = place.ground.tidal || place.ground.ownTide;
    tidePanel.hidden = !tidal;
    if (tidal) {
      const tide = tideOf(battle, place);
      // The water creeps up the gauge through each warning, so what is coming shows before it comes.
      fill(tideWater, 'Y', Math.round((100 * gaugeLevel(tide, battle.clock)) / HIGH_WATER) / 100);
      const words = tideWords(tide, battle.clock);
      setText(tideWord, words);
      const dir =
        tide.next && tide.next.at - battle.clock <= 3000
          ? tide.next.level > tide.level
            ? 'up'
            : 'down'
          : '';
      if (tideArrow.dataset.dir !== dir) tideArrow.dataset.dir = dir;
      tidePanel.classList.toggle('warn', dir === 'up');
      if (tidePanel.getAttribute('aria-label') !== `Tide: ${words}`)
        tidePanel.setAttribute('aria-label', `Tide: ${words}`);
    }
    abilityButtons.forEach((b, i) => {
      const slot = i as 0 | 1;
      const left = cooldownLeft(battle, slot === 0 ? 'first' : 'second');
      const ability = abilities[slot];
      const problem = abilityProblem(battle, place, run.play, slot);
      b.el.dataset.state = left > 0 ? 'cooling' : problem ? 'idle' : 'ready';
      fill(b.shade, 'Y', fraction(left, ability.cooldownMs));
      setText(b.count, secondsLeft(left));
    });
    if (style === 'ranged') {
      const quiver = abilityButtons[0]!;
      quiver.el.dataset.arrows = String(arrowsLeft(battle));
    }
    if (foodButton) {
      const left = cooldownLeft(battle, 'food');
      const problem = foodProblem(battle);
      foodButton.el.dataset.state =
        problem === 'none' ? 'empty' : left > 0 ? 'cooling' : problem ? 'idle' : 'ready';
      fill(foodButton.shade, 'Y', fraction(left, FOOD_MS));
      setText(foodButton.count, String(foodLeft(battle)));
    }
  };

  showRoom();
  if (options.run().finished) showResults();

  return {
    el: root,
    update: (state: GameState) => {
      const before = options.run();
      const ready = sideways(size);
      prompt.hidden = ready || before.finished;
      promptLine.textContent =
        before.ms > 0
          ? 'The grotto will wait. Nothing in it is going anywhere.'
          : 'The grotto is wide and low. So, to be fair, is the boat.';
      look.lock.map = groundNow(dungeon, before);
      hero.wear(state);
      roomView?.update?.(state);
      const after = options.run();
      if (after.room !== roomShown) showRoom();
      // And again after the frame, so a tap before the next one walks on the ground as it is now.
      else look.lock.map = groundNow(dungeon, after);
      if (after.finished && !before.finished) {
        showResults();
        options.finished();
      }
      showFight(after);
      showTitle(after, playing() && !after.doorway);
      placeTitle(after);
      // Dark through a door, and until the room's ground is in.
      fade.style.opacity = String(roomIn(after) ? doorwayDark(after.doorway) : 1);
    },
  };
}
