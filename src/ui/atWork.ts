import {
  ACTIVITY2_IDS,
  FIGURE2_H,
  FIGURE2_W,
  IDLE2_FRAMES,
  activityFrameMs2,
  activityFrames2,
  activityHitFrame2,
  activityProp2,
  characterActivity2,
  characterActivityPicture2,
  characterIdle2,
  characterIdlePicture2,
} from '../art/character2';
import { DAY2 } from '../art/town2/ramps';
import { spriteCanvas } from '../art/town2/raster';
import { actionDuration } from '../core/actions';
import { PLAYER_ATTACK_MS, monsterDef, playerCombat } from '../core/combat';
import type { Content } from '../core/content';
import { wornItemIds } from '../core/equipment';
import type { GameState } from '../core/state';
import { breathAt, deviceScale } from './figure';
import { fullLook } from './look';

/**
 * The hero at work in the menus (Cody: "idle animation: maybe something in
 * the afk menu showing our character mining/fletching/fighting/etc"): lane
 * B's loops of the hero at work (`characterActivity2`) beside what the work
 * is done on (`activityProp2`), on one canvas, in the player's own look and
 * gear. The loop is tied to the action itself: each completion starts the
 * loop again on its blow, so the axe bites as the log lands in the bank.
 */

/** What the hero is doing now, as far as the drawing needs to know. */
export interface Doing {
  /** The art's loop, or null to stand and breathe. */
  activity: string | null;
  /** How far through the current completion (or the wait for the next blow), 0 to 1, if known. */
  fraction: number | null;
  /** How long one completion takes, if known. */
  durationMs: number | null;
}

const RESTING: Doing = { activity: null, fraction: null, durationMs: null };

/**
 * What is being done, read off the state and the tables: an action's skill
 * names its loop (`SkillDef.activity`); a fight uses the loop of the skill
 * its style trains, timed by the wait for the next blow. Caught mid-theft,
 * between foes, or with nothing running, the hero stands and breathes.
 */
export function doingNow(state: GameState, content: Content): Doing {
  if (state.fight) {
    if (!monsterDef(content, state.fight.monster) || state.fight.foeHp === 0) return RESTING;
    const skill = content.skills[playerCombat(state, content).skill];
    return {
      activity: skill?.activity ?? null,
      fraction: 1 - state.fight.playerMs / PLAYER_ATTACK_MS,
      durationMs: PLAYER_ATTACK_MS,
    };
  }
  const action = state.action && content.actions[state.action.id];
  if (!action || !state.action) return RESTING;
  if (action.steal && state.action.stunMs) return RESTING;
  const durationMs = actionDuration(state, action, content);
  return {
    activity: content.skills[action.skill]?.activity ?? null,
    fraction: durationMs > 0 ? state.action.progressMs / durationMs : null,
    durationMs,
  };
}

/**
 * A completion this much shorter than one turn of the loop is too quick to
 * tie the loop to: it would flicker. Then the loop runs at the art's own pace.
 */
const TIE_FROM = 0.6;

/**
 * Which frame of a loop is due. Tied to the action where its length allows:
 * a whole number of turns of the loop to each completion (as near the art's
 * own pace as can be), each turn starting on the frame where the work lands,
 * so the moment a completion lands is the moment it shows. Otherwise, or with
 * no progress to go by, by the clock at the art's pace. With less motion
 * asked for, the landing frame alone, still.
 */
export function workFrame(doing: Doing, ms: number, still = false): number {
  const { activity, fraction, durationMs } = doing;
  if (!activity) return still ? 0 : breathAt(ms);
  const n = activityFrames2(activity);
  if (n <= 0) return 0;
  // Lane B's frame where the work lands (the axe in the log, the blow); a loop
  // with none (the breath) lands on its first.
  const lands = (activityHitFrame2(activity) ?? 0) % n;
  if (still) return lands;
  const frameMs = activityFrameMs2(activity);
  const turn = n * frameMs;
  if (fraction !== null && durationMs !== null && durationMs >= turn * TIE_FROM) {
    const turns = Math.max(1, Math.round(durationMs / turn));
    const at = Math.floor(Math.min(Math.max(fraction, 0), 0.999999) * turns * n) % n;
    return (at + lands) % n;
  }
  return Math.floor(Math.max(ms, 0) / frameMs) % n;
}

/** The stage's size in art pixels and where the hero's anchor stands on it. */
interface Stage {
  w: number;
  h: number;
  /** The hero canvas's top-left on the stage. */
  heroX: number;
  heroY: number;
}

/** The hero's anchor on its 56 x 72 canvas: the middle of the soles. */
const ANCHOR = { x: 28, y: 70 };

let stageSize: Stage | null = null;

/**
 * One stage for every loop, so the canvas never changes size when the work
 * does: the hero's canvas and every prop where the art stands it, together.
 */
function stage(): Stage {
  if (stageSize) return stageSize;
  let x0 = 0;
  let x1 = FIGURE2_W;
  let y0 = 0;
  let y1 = FIGURE2_H;
  for (const id of ACTIVITY2_IDS) {
    const prop = activityProp2(id);
    if (!prop) continue;
    const left = ANCHOR.x + prop.at.x - prop.foot.x;
    const top = ANCHOR.y + prop.at.y - prop.foot.y;
    x0 = Math.min(x0, left);
    x1 = Math.max(x1, left + prop.picture.grid.w);
    y0 = Math.min(y0, top);
    y1 = Math.max(y1, top + prop.picture.grid.h);
  }
  stageSize = { w: x1 - x0, h: y1 - y0, heroX: -x0, heroY: -y0 };
  return stageSize;
}

const ratio = (): number =>
  typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;

const lessMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The hero at work on one canvas, made once and redrawn in place. */
export interface WorkStage {
  readonly el: HTMLCanvasElement;
  /** Shows what `state` is doing at `ms` on the app's clock; draws only when the picture changes. */
  show(state: GameState, ms: number): void;
}

/** Art pixels trimmed off a stage's left and top: the air the figure's canvas keeps round him. */
export interface Trim {
  left?: number;
  top?: number;
}

/** Air kept either side of what is drawn, in art pixels, when a stage is fitted to the work. */
const FIT_AIR = 1;

/** Columns of a picture with anything drawn in them, first and last; null when it is empty. */
function drawnColumns(grid: {
  w: number;
  h: number;
  d: ArrayLike<number>;
}): [number, number] | null {
  let first = grid.w;
  let last = -1;
  for (let y = 0; y < grid.h; y += 1) {
    const row = y * grid.w;
    for (let x = 0; x < first; x += 1) if (grid.d[row + x]) first = x;
    for (let x = grid.w - 1; x > last; x -= 1) if (grid.d[row + x]) last = x;
  }
  return last < 0 ? null : [first, last];
}

const fitted = new Map<string, { x0: number; x1: number }>();

/**
 * The columns a loop uses, from the hero's canvas's left: every frame of it
 * in this look and gear, and what the work is done on, with a pixel of air
 * either side. Read off the pictures themselves (the art's data, not a
 * canvas), once for each loop, look and outfit.
 */
export function workColumns(
  activity: string | null,
  look: Parameters<typeof characterIdlePicture2>[0],
  worn: readonly string[],
  withProp: boolean,
): { x0: number; x1: number } {
  const key = JSON.stringify([activity, look, worn, withProp]);
  const kept = fitted.get(key);
  if (kept) return kept;
  let x0 = FIGURE2_W;
  let x1 = 0;
  const take = (cols: [number, number] | null, at = 0): void => {
    if (!cols) return;
    x0 = Math.min(x0, at + cols[0]);
    x1 = Math.max(x1, at + cols[1] + 1);
  };
  const frames = activity ? activityFrames2(activity) : IDLE2_FRAMES;
  for (let f = 0; f < Math.max(1, frames); f += 1) {
    const pic = activity
      ? characterActivityPicture2(look, worn, activity, f)
      : characterIdlePicture2(look, worn, f);
    take(drawnColumns(pic.grid));
  }
  const prop = withProp && activity ? activityProp2(activity) : null;
  if (prop) take(drawnColumns(prop.picture.grid), ANCHOR.x + prop.at.x - prop.foot.x);
  const box = x1 > x0 ? { x0: x0 - FIT_AIR, x1: x1 + FIT_AIR } : { x0: 0, x1: FIGURE2_W };
  fitted.set(key, box);
  return box;
}

/**
 * The hero at work, `cssScale` CSS pixels to an art pixel (rounded to whole
 * device pixels, so every art pixel is a crisp square), with what the work is
 * done on (`withProp`) or alone (the fight, where the foe is the other side),
 * less any `trim` of empty air for a tight place such as the strip.
 */
export function workStage(
  content: Content,
  cssScale: number,
  withProp = true,
  trim: Trim = {},
  fit = false,
): WorkStage {
  const dpr = ratio();
  const scale = deviceScale(cssScale, dpr);
  const whole = withProp ? stage() : { w: FIGURE2_W, h: FIGURE2_H, heroX: 0, heroY: 0 };
  const left = trim.left ?? 0;
  const top = trim.top ?? 0;
  const box = {
    w: whole.w - left,
    h: whole.h - top,
    heroX: whole.heroX - left,
    heroY: whole.heroY - top,
  };
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-art work-stage';
  canvas.setAttribute('role', 'img');
  const size = (): void => {
    canvas.width = box.w * scale;
    canvas.height = box.h * scale;
    canvas.style.width = `${canvas.width / dpr}px`;
    canvas.style.height = `${canvas.height / dpr}px`;
  };
  size();
  /**
   * Fitted to the work (the strip): as wide as this loop and its prop need,
   * so no other loop's prop leaves air beside him; as tall as every loop, so
   * he stands on the same line whatever he does.
   */
  const fitTo = (doing: Doing, state: GameState): void => {
    const cols = workColumns(doing.activity, fullLook(state.look), wornItemIds(state), withProp);
    box.w = cols.x1 - cols.x0;
    box.heroX = -cols.x0;
    if (canvas.width !== box.w * scale) size();
  };
  // jsdom has no pixels; what is shown is written on the canvas for the tests.
  const ctx = typeof ImageData === 'undefined' ? null : canvas.getContext('2d');
  let shownKey = '';
  let draws = 0;

  const draw = (state: GameState, doing: Doing, frame: number): void => {
    draws += 1;
    canvas.dataset.activity = doing.activity ?? 'resting';
    canvas.dataset.frame = String(frame);
    canvas.dataset.draws = String(draws);
    canvas.setAttribute('aria-label', doing.activity ? 'Your character at work' : 'Your character');
    if (!ctx) return;
    const look = fullLook(state.look);
    const worn = wornItemIds(state);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const prop = withProp && doing.activity ? activityProp2(doing.activity) : null;
    const propAt = (): void => {
      if (!prop) return;
      const x = box.heroX + ANCHOR.x + prop.at.x - prop.foot.x;
      const y = box.heroY + ANCHOR.y + prop.at.y - prop.foot.y;
      const art = spriteCanvas(`work prop ${doing.activity}`, prop.picture, DAY2);
      ctx.drawImage(art, x * scale, y * scale, art.width * scale, art.height * scale);
    };
    if (prop && !prop.front) propAt();
    const hero = doing.activity
      ? characterActivity2(look, worn, 'day', doing.activity, frame)
      : characterIdle2(look, worn, 'day', frame % IDLE2_FRAMES);
    ctx.drawImage(
      hero,
      box.heroX * scale,
      box.heroY * scale,
      hero.width * scale,
      hero.height * scale,
    );
    if (prop?.front) propAt();
  };

  return {
    el: canvas,
    show(state, ms) {
      // A hidden page gets no frames anyway; this keeps a stray one from drawing.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const doing = doingNow(state, content);
      const frame = workFrame(doing, ms, lessMotion());
      const key = JSON.stringify([doing.activity, frame, state.look, wornItemIds(state)]);
      if (key === shownKey) return;
      shownKey = key;
      if (fit) fitTo(doing, state);
      draw(state, doing, frame);
    },
  };
}
