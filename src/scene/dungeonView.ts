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
  tendLamp,
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
  runLocked,
  runTime,
  sideways,
  type Dungeon,
  type Room,
  type Run,
} from './dungeon';
import {
  FIGHT_COLOURS,
  HERO_TALL,
  doorsOpen,
  fightArtFor,
  fightExtra,
  heroStrikePose,
  liftOf,
  tapLift,
  tideStateOf,
  type FightArt,
} from './fightArt';
import { dungeonScene } from './dungeons';
import { foeArtId } from './fromLaneB';
import { anchorOf, FIGURE2_SOLE_Y, heroPose, POSES2, STRIKE_POSES2 } from './figures2';
import {
  lessonBlocks,
  lessonStage,
  lessonText,
  shownLesson,
  skipLessons,
  stepLessons,
  type Lesson,
  type LessonRing,
} from './lessons';
import { wholeFace } from './face';
import { abilityPicture, bodyMid, foeKind } from './foes';
import { foeSize2 } from '../art/dungeonArt2';
import {
  CaveShadow,
  HeroLight,
  doorPieces,
  heroPoolIn,
  isDark,
  lampMask,
  litRoom,
  litRooms,
  lightsOf,
  shadeAt,
  doorUnder,
  groundOnTheSpot,
  roomLook,
  type GroundPainter,
  type RoomLook,
} from './grottoArt';
import type { Play } from './play';
import type { Size } from './camera';
import { centreOf, type Point } from './tileMap';
import type { Box } from './things';
import { roomScale } from './scale';
import { resultsCard, trackerView } from './runCard';
import { foodShare } from './modifiers';
import { KEYS, remember, remembered } from './remember';
import { newGame } from '../core/state';
import {
  framedFocus,
  hudBands,
  hudBoxes,
  hudLayout,
  notchBoxes,
  NO_EDGES,
  roomFit,
  type Edges,
  type HudBox,
  type HudNeeds,
  type RoomFit,
} from './hud';
import { DUNGEON } from './dungeonMetrics';
import {
  stage,
  type Insets,
  type Life,
  type StageExtra,
  type StageLook,
  type StillPicture,
} from './stage';
import { HIGH_WATER, gaugeLevel, rising, type TideNow } from './tide';
import { FIGURE2_FEET, type Hero2 } from './town2Art';
import type { Light2 } from '../art/dungeonArt2';
import { lampUnder } from './light';

/**
 * Room kept at the screen's edges, in CSS pixels, on a phone with no notch:
 * the health panels and Leave at the top (the target's, 62 tall, the
 * deepest), the sides, and the ability bar at the bottom: the bands the
 * controls take (`hudBands`), which a travelling camera keeps the hero
 * inside. A notch's safe area widens them (`hudBands` with it).
 */
export const DUNGEON_INSETS: Insets = { top: 72, right: 56, bottom: 80, left: 56 };

/** What controls a dungeon shows: the tide's gauge if any room has a tide, a lesson's card if it teaches. */
export function hudNeedsOf(dungeon: Dungeon): HudNeeds {
  return {
    tide: Object.values(dungeon.rooms).some((r) => r.ground.tidal || r.ground.ownTide),
    lessons: (dungeonScene(dungeon.id)?.lessons?.length ?? 0) > 0,
    tracker: true,
  };
}

/** Reads a box's padding as edges: the safe area, from a probe padded by `env(safe-area-inset-*)`. */
function paddingOf(el: HTMLElement): Edges {
  if (typeof getComputedStyle !== 'function') return NO_EDGES;
  const style = getComputedStyle(el);
  const px = (v: string): number => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return {
    top: px(style.paddingTop),
    right: px(style.paddingRight),
    bottom: px(style.paddingBottom),
    left: px(style.paddingLeft),
  };
}

/** Puts an element at a box, CSS pixels from the run's top-left; touches the page only on a change. */
function placeAt(el: HTMLElement, box: HudBox, width = false): void {
  const set = (k: 'left' | 'top' | 'width', v: string): void => {
    if (el.style[k] !== v) el.style[k] = v;
  };
  set('left', `${box.x}px`);
  set('top', `${box.y}px`);
  if (width) set('width', `${box.w}px`);
}

/** How far above the hero's feet the camera looks: the middle of a 64-pixel figure, as in town. */
export const FOCUS_RISE_DUNGEON = 30;

/**
 * A room no wider than this (art pixels: two of the dungeons' screens of
 * world across) is meant to be seen whole, like the tide-pool cave's; the
 * grotto's (816) are wider and the camera travels them.
 */
export const ONE_SCREEN = 2 * DUNGEON.scene.width;

/** Half the width of the hero's contact shadow, as the art lane's figures are shaded (22 across). */
export const HERO_SHADOW = 11;

/** Every pose the hero takes in a fight, painted ahead a frame at a time: his walk, breath and blow. */
const FIGHT_POSES = [...POSES2, ...STRIKE_POSES2];

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
  /**
   * A run taken up again after a reload: it waits, paused, behind a Resume
   * button, so nothing hits the hero while the player finds where they were.
   */
  readonly resume?: boolean;
  /**
   * The character as of the last frame, before the run is settled: what the
   * results card and the challenges' tracker read as done before (S16).
   */
  readonly state?: () => GameState;
  /** Row out again to the same dungeon, from the results card; none offers no such button. */
  readonly again?: () => void;
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
    if (foe.room !== run.room || !alive(foe) || foe.under) continue;
    const size = foeSize2(foeArtId(foe.monster));
    const box = foeKind(foe.monster).box;
    const lift = room ? liftOf(room, foe) : 0;
    boxes.push(
      toCss(
        { x: foe.at.x + bodyMid(foe.monster, foe.facing), y: foe.at.y - lift },
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
  readonly name: HTMLElement;
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
  return { el, shade, count, name: el.querySelector<HTMLElement>('.fight-name')! };
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

/** Where the room's camera was for the last frame drawn, and CSS pixels an art pixel. For scripts. */
let lastLook: { camera: Point; cssPerArt: number } | null = null;
export function dungeonCamera(): { camera: Point; cssPerArt: number } | null {
  return lastLook;
}

/** How fast the camera turns to keep the foe being fought in view, art pixels a millisecond. */
export const FRAME_SPEED = 0.25;

/**
 * The foe a run's hero is fighting, as a box in art pixels (its body and
 * what is drawn over it, a bird up on its perch where it sits), or null: for
 * keeping it in view (`framedFocus`).
 */
export function targetBox(dungeon: Dungeon, run: Run): Box | null {
  const b = run.battle;
  if (!b || run.doorway) return null;
  const foe = b.foes.find((f) => f.key === b.target && f.room === run.room && alive(f));
  if (!foe || held(b, placeOf(dungeon, run), foe)) return null;
  const room = dungeon.rooms[run.room];
  const size = foeSize2(foeArtId(foe.monster));
  const kind = foeKind(foe.monster).box;
  const w = Math.max(kind.w, size?.box.w ?? 0);
  const h = Math.max(kind.h, size?.tall ?? 0) + OVERHEAD;
  const lift = room ? liftOf(room, foe) : 0;
  const mid = foe.at.x + bodyMid(foe.monster, foe.facing);
  return { x: mid - w / 2, y: foe.at.y - lift - h, w, h: h + 4 };
}

/** How long a lesson's ring takes to pulse out and fade, on the page's clock. */
export const LESSON_PULSE_MS = 1100;

/**
 * A lesson's ring on a place in the room, laid over the fight's own overlay:
 * a gold ring round it and one pulsing out from it, at the screen's
 * resolution. Its box joins the overlay's, so the overlay canvas covers it.
 */
export function withRing(extra: StageExtra, ring: LessonRing, now: number): StageExtra {
  if (!ring || ring.kind !== 'at') return extra;
  const { at, r } = ring;
  const grow = 14;
  const half = r + grow + 4;
  const box = { x: at.x - half, y: at.y - half, w: 2 * half, h: 2 * half };
  const was = extra.overlayBox ?? null;
  const overlayBox = was
    ? {
        x: Math.min(was.x, box.x),
        y: Math.min(was.y, box.y),
        w: Math.max(was.x + was.w, box.x + box.w) - Math.min(was.x, box.x),
        h: Math.max(was.y + was.h, box.y + box.h) - Math.min(was.y, box.y),
      }
    : box;
  return {
    ...extra,
    overlayBox,
    ...(extra.overlayBoxes ? { overlayBoxes: [...extra.overlayBoxes, box] } : {}),
    overlay(ctx, k) {
      extra.overlay?.(ctx, k);
      const p = (((now % LESSON_PULSE_MS) + LESSON_PULSE_MS) % LESSON_PULSE_MS) / LESSON_PULSE_MS;
      ctx.save();
      ctx.lineWidth = 4 * k;
      ctx.strokeStyle = LESSON_INK;
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, r, r * 0.8, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.lineWidth = 2 * k;
      ctx.strokeStyle = LESSON_GOLD;
      ctx.stroke();
      ctx.globalAlpha = 1 - p;
      ctx.beginPath();
      ctx.ellipse(at.x, at.y, r + p * grow, (r + p * grow) * 0.8, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    },
  };
}

/** The lesson ring's colours: the fight's own gold, edged in its ink. */
const LESSON_GOLD = FIGHT_COLOURS.gold;
const LESSON_INK = FIGHT_COLOURS.ink;

/** A character with nothing done: what a run reads as done before when no state is given (tests). */
const EMPTY_STATE: GameState = newGame('', 0);

/** The challenges' tracker unfolded again this page, after it was folded for good. */
let trackerOpen = false;

/** Whether the tracker starts folded: once folded, on later runs too (remembered), unless reopened. */
function trackerFolded(): boolean {
  return remembered(KEYS.trackerOff) && !trackerOpen;
}

/** The tracker folded, or unfolded: folding is remembered for good; unfolding for the page. */
function foldTracker(folded: boolean): void {
  if (folded) {
    trackerOpen = false;
    remember(KEYS.trackerOff);
  } else trackerOpen = true;
}

export function dungeonView(options: DungeonViewOptions): View {
  const { dungeon, hero, content } = options;
  const own = dungeonScene(dungeon.id);
  const words = own?.words ?? null;
  const lessons: readonly Lesson[] = own?.lessons ?? [];
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
    { class: 'fight-target fight-boss', attrs: { 'aria-label': 'The boss' } },
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

  /* ----- A lesson for a new player: a line of words, a ring, and a way to put them all away ----- */

  const lessonWords = h('p', { class: 'lesson-words' });
  const lessonCard = h(
    'section',
    { class: 'lesson', attrs: { 'aria-live': 'polite', 'aria-label': 'Tip' } },
    [
      lessonWords,
      h('button', {
        class: 'lesson-skip',
        text: 'Skip tips',
        attrs: { type: 'button' },
        on: {
          click: () => {
            const run = options.run();
            if (run.lessons)
              options.keep({ ...run, lessons: skipLessons(run.lessons, run.dungeon) });
            showLesson();
          },
        },
      }),
    ],
  );
  lessonCard.hidden = true;
  /** The button a lesson rings, if any: it pulses. */
  let ringedButton: HTMLElement | null = null;

  /* ----- The buttons under the left thumb ----- */

  const battleOf = (): Battle | null => options.run().battle;
  const style = battleOf()?.fighter.style ?? 'melee';
  const abilities = ABILITIES[style];

  const press = (slot: 0 | 1): void => {
    const run = options.run();
    if (waiting || !run.battle || run.finished || run.doorway) return;
    const used = useAbility(run.battle, placeOf(dungeon, run), run.play, slot);
    if (used.battle === run.battle) return;
    options.keep({ ...run, battle: used.battle, play: used.play });
  };
  const eatOne = (): void => {
    const run = options.run();
    if (waiting || !run.battle || run.finished || run.doorway) return;
    const fed = eat(run.battle, run.play.walker.at);
    if (fed !== run.battle) options.keep({ ...run, battle: fed });
  };

  const abilityButtons = abilities.map((a, i) =>
    fightButton(a.name, buttonPicture(a.id), '', () => press(i as 0 | 1)),
  );
  // The food button, for food carried or food to be found (a crate's fish): shown empty until there is some.
  const firstBattle = battleOf();
  const larder = firstBattle?.larder ?? {};
  const foodItem =
    firstBattle?.fighter.food?.item ??
    (dungeon.finds ?? [])
      .flatMap((f) => Object.keys(f.loot))
      .find((item) => (larder[item] ?? 0) > 0) ??
    null;
  const foodButton = foodItem ? fightButton('Eat', itemIcon(foodItem), 'fight-food', eatOne) : null;
  // A day when food heals less (or more): the button says by how much, in its corner, all run.
  const share = foodShare(options.run().modifier?.effects);
  const shareWords =
    share === null ? null : `${share < 1 ? '−' : '+'}${Math.round(Math.abs(1 - share) * 100)}%`;
  if (foodButton && shareWords) {
    foodButton.el.classList.add('fight-food-share');
    foodButton.el.append(
      h('span', { class: 'fight-share', text: shareWords, attrs: { 'aria-hidden': 'true' } }),
    );
  }
  const bar = h('div', { class: 'fight-bar' }, [
    ...abilityButtons.map((b) => b.el),
    foodButton?.el ?? null,
  ]);
  /* ----- The challenges still to be had, quietly in the corner (S16) ----- */

  const tracker = battleOf()
    ? trackerView(content, dungeon.id, options.state?.() ?? EMPTY_STATE, {
        folded: trackerFolded(),
        fold: (folded) => foldTracker(folded),
        modifier: options.run().modifier?.id ?? null,
      })
    : null;

  const hud = h('div', { class: 'fight-hud' }, [
    heroPanel,
    targetPanel,
    bossPanel,
    tidePanel,
    title,
    bar,
    lessonCard,
    tracker?.el ?? null,
  ]);
  if (!battleOf()) hud.hidden = true;

  /* ----- Taken up after a reload: paused until the player is ready ----- */

  let waiting = !!options.resume && !options.run().finished;
  const resumeButton = h('button', {
    class: 'btn primary dungeon-resume-go',
    text: 'Resume',
    attrs: { type: 'button' },
    on: {
      click: () => {
        waiting = false;
        resume.remove();
      },
    },
  });
  const resume = h('section', { class: 'dungeon-resume', attrs: { 'aria-label': 'Run paused' } }, [
    h('div', { class: 'dungeon-card' }, [
      h('h2', { text: 'Back where you were' }),
      h('p', { class: 'muted', text: 'The run is paused. Nothing moves until you are ready.' }),
      resumeButton,
    ]),
  ]);

  // Drawn with stand-ins until the art lane's own are in: said in a corner, so nobody takes them
  // for the real thing (`DungeonScene.standIn`). Laid under the hero's health, in the top band.
  const standIn = own?.standIn
    ? h('p', { class: 'dungeon-standin', text: own.standIn, attrs: { 'aria-hidden': 'true' } })
    : null;
  const root = h('div', { class: 'dungeon' }, [
    room,
    hud,
    standIn,
    fade,
    waiting ? resume : null,
    prompt,
    way,
  ]);

  /** The view's size in CSS pixels: whether the phone is on its side. */
  let size = { width: 0, height: 0 };
  /** The phone's safe area (its notches, its home bar), read from a probe padded by it. */
  const safeProbe = h('div', { class: 'dungeon-safe', attrs: { 'aria-hidden': 'true' } });
  root.append(safeProbe);
  let safe: Edges = NO_EDGES;
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(([entry]) => {
      if (!root.isConnected) {
        observer.disconnect();
        return;
      }
      if (entry) size = { width: entry.contentRect.width, height: entry.contentRect.height };
      safe = paddingOf(safeProbe);
    });
    observer.observe(root);
  }

  /* ----- The controls laid out round the room (`hud.ts`) ----- */

  const needs = hudNeedsOf(dungeon);
  let laid: { key: string; layout: ReturnType<typeof hudLayout> } | null = null;
  /** The controls' boxes for the screen as it is now (CSS pixels), or null before it has a size. */
  const layoutNow = (): ReturnType<typeof hudLayout> | null => {
    if (!(size.width > 0 && size.height > 0)) return null;
    const key = `${size.width} ${size.height} ${safe.top} ${safe.right} ${safe.bottom} ${safe.left}`;
    if (laid?.key !== key) laid = { key, layout: hudLayout(size, safe, needs) };
    return laid.layout;
  };
  /** The bands the controls take: what a travelling camera keeps the hero inside. */
  const bandsNow = (): Insets => {
    const layout = layoutNow();
    return layout ? hudBands(size, layout, safe) : DUNGEON_INSETS;
  };
  /** Puts each control where the layout says: only what moved is touched. */
  const placeHud = (): void => {
    const layout = layoutNow();
    if (!layout) return;
    placeAt(heroPanel, layout.hero);
    if (standIn) placeAt(standIn, { ...layout.hero, y: layout.hero.y + layout.hero.h + 2 });
    placeAt(targetPanel, layout.target);
    placeAt(bossPanel, layout.target);
    if (layout.tide) placeAt(tidePanel, layout.tide);
    placeAt(bar, layout.bar);
    if (layout.lesson) placeAt(lessonCard, layout.lesson, true);
    if (layout.tracker && tracker) placeAt(tracker.el, layout.tracker, true);
    const right = `${size.width - layout.leave.x - layout.leave.w}px`;
    if (way.style.right !== right) way.style.right = right;
    if (way.style.top !== `${layout.leave.y}px`) way.style.top = `${layout.leave.y}px`;
  };
  const fits = new Map<string, RoomFit>();
  /**
   * The scale and nudge for a dungeon whose rooms are seen whole, for a
   * canvas of `device` pixels: nothing walked on, no door and nobody waiting
   * under a control or a notch (`roomFit`).
   */
  const fitFor = (device: Size): RoomFit => {
    const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
    const css = size.width > 0 ? size : { width: device.width / dpr, height: device.height / dpr };
    const layout = hudLayout(css, safe, needs);
    const key = `${device.width} ${device.height} ${dpr} ${css.width} ${css.height} ${safe.top} ${safe.right} ${safe.bottom} ${safe.left}`;
    let fit = fits.get(key);
    if (!fit) {
      const blocked = [...hudBoxes(layout), ...notchBoxes(css, safe)];
      fit = roomFit(device, dpr, Object.values(dungeon.rooms), blocked);
      fits.set(key, fit);
    }
    return fit;
  };

  let roomShown = '';
  /** The walker as last handed to the stage: a different one back means a tap moved him. */
  let given: Play = options.run().play;
  let roomView: View | null = null;
  const painter = options.painter ?? groundOnTheSpot;
  /**
   * The run's room as it is to be drawn: in a room whose light is a rule,
   * the look of it with the lanterns burning that burn now (`litRoom`).
   */
  const shownRoomOf = (run: Run): Room => {
    const room = dungeon.rooms[run.room]!;
    const lit = run.battle?.lamps?.[run.room];
    return lit ? litRoom(room, lampMask(lit)) : room;
  };
  const lookOf = (room: Room): RoomLook => {
    const l = roomLook(room, painter);
    l.paintWith(painter);
    return l;
  };
  let look = lookOf(shownRoomOf(options.run()));
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
  const playing = (): boolean =>
    !waiting &&
    sideways(size) &&
    !options.run().finished &&
    roomIn(options.run()) &&
    // A lesson that waits for the player holds the run still: nothing moves until it is done.
    !lessonBlocks(options.run().lessons, lessons);

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
  /** His own pool of light on a darker day, and in a room of lanterns (`HeroLight`). */
  const heroLight = new HeroLight();
  /**
   * On a darker day, the hero's pool of light, laid on the ground under
   * everyone (and under his shadow): drawing only.
   */
  const heroLife: Life = {
    layer: 'ground',
    at: () => {
      const run = options.run();
      const s = tideStateOf(dungeon, run);
      const open = doorsAreOpen(run);
      const cells = look.cellsAt(s.level, s.warn, open);
      if (!cells) return null;
      return heroLight.at(
        cells,
        poolsOf(run),
        open ? look.openGlows : look.glows,
        run.play.walker.at,
        look.theme.palette,
        heroPoolIn(look.room),
      );
    },
  };
  /** The pools of light in the run's room as the day leaves them: the lanterns', and its doors' once open. */
  let pools: { key: string; lights: readonly Light2[] } | null = null;
  const poolsOf = (run: Run): readonly Light2[] => {
    const open = doorsAreOpen(run);
    const key = `${run.room} ${open} ${look.room.lit ?? ''}`;
    if (pools?.key !== key) {
      const room = look.room;
      const lights = lightsOf(room);
      pools = {
        key,
        lights: open
          ? [...lights, ...doorPieces(room).flatMap((d) => (d.light ? [d.light] : []))]
          : lights,
      };
    }
    return pools.lights;
  };

  /** A barred door last tapped, and when on the fight's clock: it says it is barred for a moment. */
  let barredTap: { letter: string; at: number } | null = null;

  /** Whether the room's doors have begun to open: the ground about them is lit from beyond. */
  const doorsAreOpen = (run: Run): boolean => !!run.battle && doorsOpen(run.battle, run.room) > 0;

  /** What the camera shows this frame, in art pixels, less the edges kept for the HUD. */
  const viewBox = (look: StageLook): Box | null => {
    const per = look.cssPerArt;
    if (!(per > 0)) return null;
    const bands = bandsNow();
    return {
      x: look.camera.x + bands.left / per,
      y: look.camera.y + bands.top / per,
      w: look.view.width - (bands.left + bands.right) / per,
      h: look.view.height - (bands.top + bands.bottom) / per,
    };
  };

  /** The rooms in the order a run meets them: the one after this is painted ahead. */
  const order = Object.keys(dungeon.rooms);
  /** The largest room of the dungeon, art pixels: the one scale for all its rooms (`roomScale`). */
  const biggestRoom: Size = order.reduce(
    (most, id) => {
      const map = dungeon.rooms[id]!.map;
      return {
        width: Math.max(most.width, map.cols * DUNGEON.tile),
        height: Math.max(most.height, map.rows * DUNGEON.tile),
      };
    },
    { width: 0, height: 0 },
  );
  /** Whether its rooms are seen whole, the camera still (the cave's), or travelled (the grotto's). */
  const seenWhole = biggestRoom.width <= ONE_SCREEN;

  /**
   * The looks of the room by its lanterns kept beside the one shown: the one
   * shown before (on screen until the next is in) and those a lantern lit or
   * put out would turn to, painted ahead where a worker paints them.
   */
  const warmLamps = (run: Run): void => {
    const room = dungeon.rooms[run.room]!;
    const lit = run.battle?.lamps?.[run.room];
    if (!lit || !painter.offThread) return;
    const mask = lampMask(lit);
    for (let i = 0; i < lit.length; i++) lookOf(litRoom(room, mask ^ (1 << i))).warm();
  };
  /** Lets go of every look of a room by its lanterns but those wanted. */
  const forgetLamps = (room: Room, keep: readonly Room[]): void => {
    for (const r of litRooms(room)) if (!keep.includes(r)) roomLook(r).forget();
  };
  /**
   * A lantern lit or put out: the look of the room with it so is shown as
   * soon as its ground is in (asked for at once); until then the one before.
   */
  const followLamps = (run: Run): void => {
    if (run.room !== roomShown) return;
    const want = shownRoomOf(run);
    if (want === look.room) return;
    const next = lookOf(want);
    const s = tideStateOf(dungeon, run);
    next.stillAt(s.level, s.warn);
    if (!next.ready(s.level, s.warn)) return;
    const was = look.room;
    look = next;
    art = fightArtFor(look);
    lastStill = null;
    hero.lightBy(look.glows);
    // Kept: the look shown, the one before, and those one lantern away.
    const base = dungeon.rooms[run.room]!;
    const lit = run.battle?.lamps?.[run.room] ?? [];
    const mask = lampMask(lit);
    forgetLamps(base, [want, was, ...lit.map((_, i) => litRoom(base, mask ^ (1 << i)))]);
    warmLamps(run);
  };

  const showRoom = (): void => {
    const run = options.run();
    const here = dungeon.rooms[run.room]!;
    // Rooms behind are let go; this one and the next are kept and painted ahead, and the first
    // always (wave 18): Row out again from the results goes straight back to it, never to a room
    // painted again behind the card.
    const at = order.indexOf(run.room);
    const next = order[at + 1];
    for (const id of order)
      if (id !== run.room && id !== next && id !== dungeon.first) {
        roomLook(dungeon.rooms[id]!).forget();
        forgetLamps(dungeon.rooms[id]!, []);
      }
    look = lookOf(shownRoomOf(run));
    // Painted ahead only where a worker paints them: on the spot, each is worked out when shown.
    if (painter.offThread) {
      look.warm();
      if (next) lookOf(shownRoomOf({ ...run, room: next })).warm();
      warmLamps(run);
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
      // The ground to walk on as the look shown has it: a lantern lit changes the look, not the room.
      scene: {
        get map() {
          return look.lock.map;
        },
        things: [],
        speed: look.scene.speed,
      },
      art: {
        still: () => stillFor(options.run()),
        heroFeet: FIGURE2_FEET,
        walkerAt: () => nobody(),
        walkerPlaced: (play, feet, _palette, now) => {
          const run = options.run();
          // Striking, timed from the fight's state; otherwise walking or breathing as anywhere.
          const pose = heroStrikePose(dungeon, run) ?? heroPose(play, now);
          // By the room's light: the grotto's dusk, the tide-pool cave's day.
          const time = look.theme.figureTime;
          const image = hero.at(feet, pose, time);
          hero.warm(time, FIGHT_POSES);
          return (
            image && {
              image,
              x: feet.x - anchorOf(pose),
              y: feet.y - FIGURE2_SOLE_Y,
              base: feet.y,
            }
          );
        },
        shadowAt: (feet) => {
          const run = options.run();
          const s = tideStateOf(dungeon, run);
          const open = doorsAreOpen(run);
          const cells = look.cellsAt(s.level, s.warn, open);
          if (!cells) return null;
          // On a darker day his shadow is as dark as the ground it falls on (in his own light).
          const lights = isDark(look.room) ? poolsOf(run) : null;
          const placed = heroShadow.at(
            cells,
            look.kindsAt(s.level, s.warn),
            open ? look.openGlows : look.glows,
            feet,
            HERO_SHADOW,
            look.theme.palette,
            lights ? (x, y) => shadeAt(lights, x, y, feet, heroPoolIn(look.room)) : undefined,
          );
          return (
            placed && {
              picture: placed.image as HTMLCanvasElement,
              middle: { x: feet.x - placed.x, y: feet.y - placed.y },
            }
          );
        },
        // On a darker day, and in a room of lanterns, his own pool of light goes with him; the
        // lanterns' flicker is the look's shown now (one that is out does not flicker).
        get life() {
          return isDark(look.room) ? [...look.flicker, heroLife] : look.flicker;
        },
      },
      // A sea cave at dusk, lit by its lanterns; or the tide-pool cave by day.
      time: look.theme.figureTime,
      play: run.play,
      keep: () => {},
      press: () => {},
      // As large as a whole room still fits clear of the controls: the cave's fill a wide phone.
      scaleOf: (device) =>
        seenWhole ? fitFor(device).scale : roomScale(device, biggestRoom, DUNGEON.scene.width),
      // A dungeon of one-screen rooms is seen whole, the camera still; the grotto's rooms travel.
      holdWhenFits: seenWhole,
      holdOffset: (device, scale) => {
        const fit = fitFor(device);
        return fit.scale === scale ? fit.offset : { x: 0, y: 0 };
      },
      focusRise: FOCUS_RISE_DUNGEON,
      // The foe being fought kept in view, clear of the controls (a room the camera travels).
      lookAt: () => {
        if (framed.x === 0 && framed.y === 0) return null;
        const feet = options.run().play.walker.at;
        return { x: feet.x + framed.x, y: feet.y - FOCUS_RISE_DUNGEON + framed.y };
      },
      pixelated: true,
      overlay: true,
      insets: bandsNow,
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
        // Being carried by the sea, or paused to be resumed, a tap does nothing.
        if (run.battle.wash || waiting) return from;
        const foe = foeAt(run.battle, run.room, point, min, tapLift(dungeon.rooms[run.room]!));
        // A lantern not burning, tapped: he goes to light it (a foe in front of it comes first).
        const lamp =
          !foe && run.battle.lamps?.[run.room]
            ? lampUnder(dungeon.rooms[run.room]!.ground, point, min)
            : null;
        if (lamp !== null && !run.battle.lamps![run.room]![lamp]) {
          const tended = tendLamp(run.battle, placeOf(dungeon, run), from, lamp);
          options.keep({ ...run, battle: tended.battle, play: tended.play });
          given = tended.play;
          return tended.play;
        }
        if (!foe || held(run.battle, placeOf(dungeon, run), foe)) {
          // A barred door says so; the walk (to the door, wherever on it the tap was) is the stage's.
          const door = doorUnder(dungeon.rooms[run.room]!, point, min);
          if (door && runLocked(run)) barredTap = { letter: door.letter, at: run.battle.clock };
          options.keep({ ...run, battle: stopChasing(run.battle), play: from });
          return null;
        }
        const aimed = targetFoe(run.battle, placeOf(dungeon, run), from, foe.key);
        options.keep({ ...run, battle: aimed.battle, play: aimed.play });
        given = aimed.play;
        return aimed.play;
      },
      // Anywhere on a door's piece is the door: through it when open, up to it when barred.
      aim: (point, min) => {
        const run = options.run();
        const here = dungeon.rooms[run.room]!;
        const piece = doorUnder(here, point, min);
        const door = piece && here.doors.find((d) => d.letter === piece.letter);
        if (!door) return point;
        return centreOf(runLocked(run) ? door.inside : door.cell, DUNGEON.tile);
      },
      extra: (now, _palette, seenNow) => {
        const run = options.run();
        const extra = fightExtra(dungeon, run, look, art, { view: viewBox(seenNow), barredTap });
        const lesson = run.doorway ? null : shownLesson(run.lessons, lessons);
        return lesson ? withRing(extra, lesson.ring(dungeon, run), now) : extra;
      },
      seen: (camera, cssPerArt) => {
        lookedAt = { camera, cssPerArt };
        lastLook = lookedAt;
      },
      label: words?.label ?? 'A sea cave. Tap the ground to walk there, or something to fight it.',
      fallback: 'The dungeon needs a browser that can draw on a canvas.',
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

  /**
   * How far the camera is moved off the hero (art pixels) to keep the foe he
   * fights in view clear of the controls, in a room the camera travels:
   * eased there at `FRAME_SPEED`, and back as the foe falls. Drawing only:
   * the fight never reads the camera.
   */
  let framed: Point = { x: 0, y: 0 };
  const frameWanted = (run: Run): Point => {
    const box = seenWhole || !lookedAt ? null : targetBox(dungeon, run);
    const per = lookedAt?.cssPerArt ?? 0;
    if (!box || !(per > 0) || !(size.width > 0)) return { x: 0, y: 0 };
    const bands = bandsNow();
    const inner = {
      width: (size.width - bands.left - bands.right) / per,
      height: (size.height - bands.top - bands.bottom) / per,
    };
    const feet = run.play.walker.at;
    const focus = { x: feet.x, y: feet.y - FOCUS_RISE_DUNGEON };
    const hero = {
      x: feet.x - HERO_BOX.w / 2,
      y: feet.y - HERO_BOX.h,
      w: HERO_BOX.w,
      h: HERO_BOX.h,
    };
    const want = framedFocus(focus, hero, box, inner);
    return { x: want.x - focus.x, y: want.y - focus.y };
  };
  const stepFrame = (run: Run, ms: number): void => {
    const want = frameWanted(run);
    const most = FRAME_SPEED * ms;
    const toward = (now: number, to: number): number =>
      now + Math.max(-most, Math.min(most, to - now));
    framed = { x: toward(framed.x, want.x), y: toward(framed.y, want.y) };
  };

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
  /** The S16 results card while it shows, and when on the page's clock it came up. */
  let card: { step(ms: number): void; from: number | null } | null = null;
  const showResults = (): void => {
    if (results) return;
    leaveButton.hidden = true;
    confirm.replaceChildren();
    hud.hidden = true;
    const run = options.run();
    if (run.battle) {
      const fell = run.ending === 'fell';
      const said = fell ? words?.fell : words?.cleared;
      const made = resultsCard({
        content,
        run,
        state: options.state?.() ?? EMPTY_STATE,
        title: said?.title ?? (fell ? 'Back in town' : 'Cleared'),
        line: said?.line ?? 'Everything you picked up came with you.',
        again: options.again ?? null,
        home: () => options.leave(),
      });
      card = { step: made.step, from: null };
      results = h('section', { class: 'dungeon-results', attrs: { 'aria-label': 'Results' } }, [
        made.el,
      ]);
      root.append(results);
      return;
    }
    // A walk through a dungeon with nothing to fight: the plain card.
    const tally = null as Tally | null;
    const fell = run.ending === 'fell';
    const said = fell ? words?.fell : words?.cleared;
    const title = !run.battle
      ? 'You reached the end'
      : (said?.title ?? (fell ? 'Back in town' : 'Cleared'));
    const line = !run.battle
      ? 'Nothing down here yet but a damp floor and a good echo. Someone will be along to fill it.'
      : (said?.line ?? 'Everything you picked up came with you.');
    const facts: HTMLElement[] = [
      h('p', { class: 'dungeon-time', text: `Time taken: ${runTime(run.ms)}` }),
    ];
    const earned: HTMLElement[] = [];
    if (tally) {
      facts.push(h('p', { text: `Kills: ${tally.kills}` }));
      const ate = tally.eaten + Object.values(tally.ateFound ?? {}).reduce((a, b) => a + b, 0);
      if (ate > 0) facts.push(h('p', { text: `Eaten: ${ate}` }));
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
        bossPanel.setAttribute('aria-label', def.name);
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
      // A day of no food (the modifier): the button says so, and does nothing.
      const banned = problem === 'banned';
      foodButton.el.dataset.state = banned
        ? 'banned'
        : problem === 'none'
          ? 'empty'
          : left > 0
            ? 'cooling'
            : problem
              ? 'idle'
              : 'ready';
      setText(foodButton.name, banned ? 'No food' : 'Eat');
      const label = banned
        ? 'Eat: nothing may be eaten today'
        : share !== null
          ? `Eat: food heals ${Math.round(Math.abs(1 - share) * 100)}% ${share < 1 ? 'less' : 'more'} today`
          : 'Eat';
      if (foodButton.el.getAttribute('aria-label') !== label)
        foodButton.el.setAttribute('aria-label', label);
      fill(foodButton.shade, 'Y', fraction(left, FOOD_MS));
      setText(foodButton.count, String(foodLeft(battle)));
    }
  };

  /**
   * The lessons brought up to date for this frame (`stepLessons`), and the
   * one showing put on screen: its words, and the button it rings pulsing.
   * Not behind the turn-your-phone prompt or a Resume, nor through a door.
   */
  function showLesson(ms = 0): void {
    let run = options.run();
    if (run.lessons && !run.lessons.off && sideways(size) && !waiting && roomIn(run)) {
      const next = stepLessons(run.lessons, lessons, dungeon, run, ms);
      if (next !== run.lessons) {
        run = { ...run, lessons: next };
        options.keep(run);
      }
    }
    const lesson = run.finished || run.doorway ? null : shownLesson(run.lessons, lessons);
    lessonCard.hidden = !lesson;
    if (lesson) setText(lessonWords, lessonText(run.lessons, lesson, dungeon, run));
    // Said plainly once it has waited a while: the card says so too.
    const stage = lesson ? String(lessonStage(run.lessons)) : '';
    if (lessonCard.dataset.stage !== stage) lessonCard.dataset.stage = stage;
    const ring = lesson?.ring(dungeon, run) ?? null;
    const which = ring?.kind === 'button' ? ring.which : null;
    const button =
      which === 'food'
        ? (foodButton?.el ?? null)
        : which === 'first'
          ? (abilityButtons[0]?.el ?? null)
          : which === 'second'
            ? (abilityButtons[1]?.el ?? null)
            : null;
    if (button !== ringedButton) {
      ringedButton?.classList.remove('lesson-ringed');
      button?.classList.add('lesson-ringed');
      ringedButton = button;
    }
  }

  showRoom();
  if (options.run().finished) showResults();
  /** The app's clock at the last frame. */
  let lastNow: number | undefined;

  return {
    el: root,
    update: (state: GameState, now?: number) => {
      // The page's time since the last frame, for how long a lesson has waited (not the run's clock).
      const ms =
        now === undefined || lastNow === undefined ? 0 : Math.min(250, Math.max(0, now - lastNow));
      lastNow = now;
      const before = options.run();
      if (safe === NO_EDGES && size.width > 0) safe = paddingOf(safeProbe);
      placeHud();
      // The camera eased toward keeping the foe being fought in view, before this frame is drawn.
      if (sideways(size)) stepFrame(before, ms);
      const ready = sideways(size);
      prompt.hidden = ready || before.finished;
      promptLine.textContent =
        before.ms > 0
          ? (words?.turn.during ?? 'The dungeon will wait.')
          : (words?.turn.before ?? 'The dungeon is wide and low.');
      look.lock.map = groundNow(dungeon, before);
      hero.wear(state);
      // An open door's light from beyond lights him too as he goes by it.
      hero.lightBy(doorsAreOpen(before) ? look.openGlows : look.glows);
      roomView?.update?.(state);
      const after = options.run();
      if (after.room !== roomShown) showRoom();
      else {
        // A lantern lit or put out: the room drawn as its lanterns now stand, once that is in.
        followLamps(after);
        // And again after the frame, so a tap before the next one walks on the ground as it is now.
        look.lock.map = groundNow(dungeon, after);
      }
      if (after.finished && !before.finished) {
        showResults();
        options.finished();
      }
      showLesson(ms);
      showFight(options.run());
      // The tracker, while the run is played and no lesson has its corner.
      const live = options.run();
      tracker?.update(
        live,
        !live.finished && sideways(size) && !waiting && lessonCard.hidden === true,
      );
      // A new medal's glint on the results card, by the page's clock.
      if (card && now !== undefined) {
        card.from ??= now;
        card.step(now - card.from);
      }
      showTitle(after, playing() && !after.doorway);
      placeTitle(after);
      // Dark through a door, and until the room's ground is in.
      fade.style.opacity = String(roomIn(after) ? doorwayDark(after.doorway) : 1);
    },
  };
}
