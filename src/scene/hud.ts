/*
 * Where a dungeon's controls sit on a phone on its side, and where its room
 * sits among them, as pure rules: the health panels and Leave along the top,
 * the buttons under the left thumb and the lesson (or the challenges) at the
 * bottom right, each kept inside the safe area (notches, the home bar), and
 * the room placed so that nothing anyone walks on, no door and nobody waiting
 * to be fought is ever under one of them or under a notch.
 *
 * A dungeon whose rooms are seen whole (the tide-pool cave's) is drawn at the
 * largest whole scale at which such a place exists, nudged off the middle by
 * whole art pixels where it must be (`roomFit`). One whose rooms the camera
 * travels (the grotto's) keeps the hero clear of the controls by the camera's
 * insets, which are the bands the controls take (`hudBands`).
 *
 * Everything here is in CSS pixels from the top-left of the run's screen,
 * except a room's cells and the camera, which are art pixels. The view lays
 * its panels out from these boxes, so what the tests check is what shows.
 */
import { pixelFit, roomScale } from './scale';
import type { Size } from './camera';
import { cameraFor } from './camera';
import type { Room } from './dungeon';
import { DUNGEON } from './dungeonMetrics';
import { isSolid, type Point } from './tileMap';

/** Room kept at the screen's edges, in CSS pixels (a stage's insets, a phone's safe area). */
export interface Edges {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** A box in CSS pixels. */
export interface HudBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const NO_EDGES: Edges = { top: 0, right: 0, bottom: 0, left: 0 };

/** The controls' sizes, CSS pixels: `scene.css` gives each its height from here. */
export const HUD_SIZES = {
  /** From the screen's (safe) edge to a control. */
  margin: 8,
  hero: { w: 200, h: 42 },
  /** The target's panel, and a boss's in its place: a face 48 across, framed. */
  target: { w: 200, h: 62 },
  leave: { w: 96, h: 48 },
  tide: { w: 112, h: 46 },
  button: { w: 76, h: 64, gap: 10 },
  /** Ability, ability, food: the bar is laid out for all three whether or not food shows. */
  buttons: 3,
  /** A lesson: up to three lines of words beside its Skip button. */
  lesson: { w: 460, h: 80, gap: 12 },
  /**
   * The challenges still to be had, quietly, in the lesson's place (S16), or folded to a chip:
   * three lines at the most, in a 16-pixel hand (wave 18; it was four in 13).
   */
  tracker: { w: 264, h: 64 },
} as const;

/** Every control's box, CSS pixels: null for one this dungeon never shows. */
export interface HudLayout {
  readonly hero: HudBox;
  readonly target: HudBox;
  readonly leave: HudBox;
  readonly tide: HudBox | null;
  readonly bar: HudBox;
  readonly lesson: HudBox | null;
  readonly tracker: HudBox | null;
}

export interface HudNeeds {
  /** Any room of it has a tide (the gauge shows). */
  readonly tide: boolean;
  /** It has lessons (a new player's card shows). */
  readonly lessons: boolean;
  /** The challenges' tracker may show. */
  readonly tracker: boolean;
}

/** The controls laid out on a screen `view` CSS pixels, inside its safe area `safe`. */
export function hudLayout(view: Size, safe: Edges, needs: HudNeeds): HudLayout {
  const S = HUD_SIZES;
  const m = S.margin;
  const top = safe.top + m;
  const left = safe.left + m;
  const right = view.width - safe.right - m;
  const bottom = view.height - safe.bottom - m;
  const leave = { x: right - S.leave.w, y: top, w: S.leave.w, h: S.leave.h };
  // The tide's gauge beside Leave; under it where the top is too narrow for all four in a row.
  const row = S.hero.w + S.target.w + S.tide.w + S.leave.w + 3 * m;
  const tide = !needs.tide
    ? null
    : right - left >= row
      ? { x: leave.x - m - S.tide.w, y: top, w: S.tide.w, h: S.tide.h }
      : { x: right - S.tide.w, y: leave.y + leave.h + m, w: S.tide.w, h: S.tide.h };
  const beside = tide && tide.y === top ? tide : leave;
  // In the middle of the top, between the hero's health and Leave, as far as the middle allows.
  const middle = Math.round(view.width / 2 - S.target.w / 2);
  const target = {
    x: Math.max(left + S.hero.w + m, Math.min(middle, beside.x - m - S.target.w)),
    y: top,
    w: S.target.w,
    h: S.target.h,
  };
  const barW = S.buttons * S.button.w + (S.buttons - 1) * S.button.gap;
  const bar = { x: left, y: bottom - S.button.h, w: barW, h: S.button.h };
  const from = bar.x + bar.w + S.lesson.gap;
  const lessonW = Math.max(0, Math.min(S.lesson.w, right - from));
  const lesson = needs.lessons
    ? { x: right - lessonW, y: bottom - S.lesson.h, w: lessonW, h: S.lesson.h }
    : null;
  const trackerW = Math.max(0, Math.min(S.tracker.w, right - from));
  const tracker = needs.tracker
    ? { x: right - trackerW, y: bottom - S.tracker.h, w: trackerW, h: S.tracker.h }
    : null;
  return {
    hero: { x: left, y: top, ...S.hero },
    target,
    leave,
    tide,
    bar,
    lesson,
    tracker,
  };
}

/** Every control a layout shows, as boxes. */
export function hudBoxes(layout: HudLayout): HudBox[] {
  return [
    layout.hero,
    layout.target,
    layout.leave,
    layout.tide,
    layout.bar,
    layout.lesson,
    layout.tracker,
  ].filter((b): b is HudBox => b !== null);
}

/** The notches and the home bar: the screen outside its safe area, as boxes. */
export function notchBoxes(view: Size, safe: Edges): HudBox[] {
  const out: HudBox[] = [];
  if (safe.top > 0) out.push({ x: 0, y: 0, w: view.width, h: safe.top });
  if (safe.bottom > 0)
    out.push({ x: 0, y: view.height - safe.bottom, w: view.width, h: safe.bottom });
  if (safe.left > 0) out.push({ x: 0, y: 0, w: safe.left, h: view.height });
  if (safe.right > 0) out.push({ x: view.width - safe.right, y: 0, w: safe.right, h: view.height });
  return out;
}

/**
 * The bands the controls take along each edge, CSS pixels: a travelling
 * camera keeps the hero inside what is left (the stage's insets), so he is
 * never under a control or a notch, and a room's edge comes no further out.
 */
export function hudBands(view: Size, layout: HudLayout, safe: Edges): Edges {
  const boxes = hudBoxes(layout);
  const tops = boxes.filter((b) => b.y + b.h / 2 < view.height / 2);
  const bottoms = boxes.filter((b) => b.y + b.h / 2 >= view.height / 2);
  const m = HUD_SIZES.margin;
  return {
    top: Math.max(safe.top, ...tops.map((b) => b.y + b.h)) + 2,
    bottom: view.height - Math.min(view.height - safe.bottom, ...bottoms.map((b) => b.y)) + m,
    left: Math.max(safe.left + 48, 56),
    right: Math.max(safe.right + 48, 56),
  };
}

const crosses = (a: HudBox, b: HudBox): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * What in a room must never be under a control or a notch, in art pixels:
 * every cell anyone can stand on at low water (where the most is dry), every
 * door, everyone waiting to be fought where they wait (a bird on its perch,
 * help coming ashore), and the end.
 */
export function mustSee(room: Room): HudBox[] {
  const T = DUNGEON.tile;
  const out: HudBox[] = [];
  const map = room.map;
  for (let row = 0; row < map.rows; row++)
    for (let col = 0; col < map.cols; col++)
      if (!isSolid(map, { col, row })) out.push({ x: col * T, y: row * T, w: T, h: T });
  for (const d of room.doors) out.push({ x: d.cell.col * T, y: d.cell.row * T, w: T, h: T });
  for (const f of room.foes) out.push({ x: f.at.col * T, y: f.at.row * T, w: T, h: T });
  for (const p of [...room.perches, ...room.spawns])
    out.push({ x: p.x - T / 2, y: p.y - T / 2, w: T, h: T });
  return out;
}

/** A dungeon's rooms seen whole: the scale and the nudge off the middle (art pixels). */
export interface RoomFit {
  readonly scale: number;
  readonly offset: Point;
  /** False when no scale clears everything: the best there is (the room centred, the old scale). */
  readonly clear: boolean;
}

/**
 * The largest whole scale at which every room of a dungeon seen whole fits
 * the screen with nothing it must show (`mustSee`) under a control or a notch,
 * and the smallest nudge off the middle that does it (the same for every
 * room, so a door does not move the room about). `device` is the canvas's
 * box in device pixels; `dpr` turns it to CSS pixels; `blocked` is every
 * control and notch (`hudBoxes`, `notchBoxes`), CSS pixels from the
 * canvas's top-left. Never under the dungeons' least scale.
 */
export function roomFit(
  device: Size,
  dpr: number,
  rooms: readonly Room[],
  blocked: readonly HudBox[],
): RoomFit {
  const T = DUNGEON.tile;
  const biggest = rooms.reduce(
    (most, r) => ({
      width: Math.max(most.width, r.map.cols * T),
      height: Math.max(most.height, r.map.rows * T),
    }),
    { width: 0, height: 0 },
  );
  const css = { width: device.width / dpr, height: device.height / dpr };
  const cells = rooms.map((r) => ({
    world: { width: r.map.cols * T, height: r.map.rows * T },
    see: mustSee(r),
  }));
  const top = roomScale(device, biggest, DUNGEON.scene.width);
  const least = Math.min(top, sceneFloor(device));
  for (let scale = top; scale >= least; scale--) {
    const fit = pixelFit(css, dpr, () => scale);
    const view = fit.art;
    const per = fit.css.width / Math.max(1, view.width);
    const spare = {
      x: Math.floor((view.width - biggest.width) / 2),
      y: Math.floor((view.height - biggest.height) / 2) + 2 * T,
    };
    // Seen whole or not at all: the stage holds the camera only for a room that fits.
    if (view.width < biggest.width || view.height < biggest.height) continue;
    const clearAt = (offset: Point): boolean =>
      cells.every(({ world, see }) => {
        const cam = cameraFor({ x: 0, y: 0 }, view, world);
        return see.every((c) => {
          const box = {
            x: (c.x - cam.x - offset.x) * per,
            y: (c.y - cam.y - offset.y) * per,
            w: c.w * per,
            h: c.h * per,
          };
          if (
            box.x < 0 ||
            box.y < 0 ||
            box.x + box.w > fit.css.width ||
            box.y + box.h > fit.css.height
          )
            return false;
          return !blocked.some((b) => crosses(box, b));
        });
      });
    const tries: Point[] = [];
    for (let dy = 0; dy <= spare.y; dy++)
      for (let dx = 0; dx <= Math.max(0, spare.x); dx++)
        for (const sy of dy === 0 ? [1] : [1, -1])
          for (const sx of dx === 0 ? [1] : [1, -1]) tries.push({ x: sx * dx, y: sy * dy });
    tries.sort((a, b) => Math.abs(a.x) + Math.abs(a.y) - (Math.abs(b.x) + Math.abs(b.y)));
    for (const offset of tries) if (clearAt(offset)) return { scale, offset, clear: true };
  }
  return { scale: top, offset: { x: 0, y: 0 }, clear: false };
}

/** The dungeons' scale for the screen's short side: a room seen whole is never drawn smaller. */
function sceneFloor(device: Size): number {
  return Math.max(1, Math.floor(Math.min(device.width, device.height) / DUNGEON.scene.width));
}
