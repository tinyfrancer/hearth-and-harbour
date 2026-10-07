/*
 * A dungeon fight on screen at the C scale: the cast in the art lane's poses
 * (`foeSprite2`/`foePicture2`, lit by the lanterns near them), their contact
 * shadows, the marked ground of every heavy attack, the sea about to come in,
 * loot on the floor, barred doors and cells, and over everyone their health,
 * the target's mark, numbers that float up and things in flight. Everything
 * here is read from the run (`battle.ts` decides it all); this only puts
 * pixels where it says.
 *
 * Two layers. The room's canvas holds one pixel per art pixel and is
 * enlarged by the browser: figures, shadows, marks on the ground, kegs in the
 * air, all in whole art pixels. Words and the thin lines read over the fight
 * (health bars, the blow coming, numbers, what the captain shouts, a foe's
 * warning and the target's chevron) go on an overlay canvas at the screen's
 * own resolution (`overlay`), so text is sharp. The marks on the ground stay
 * on the room's canvas, under the figures standing in them: an outline laid
 * over the top would cross the feet it is there to judge.
 *
 * The three kinds of big hit read apart at a glance, by shape and colour:
 * circles in red (a slam, a keg), lines in hatched fire (cannon), and a pale
 * steel arc (the anchor). The sea's warning is blue: wet sand and ripples on
 * the ground it is about to cover.
 */
import {
  CAVE_DUSK,
  FOE2_SIZES,
  FUSE_LIGHT2,
  dungeonPropSprite2,
  dungeonProp2,
  flicker2,
  dungeonTile2,
  foeFrames2,
  foePicture2,
  foeSprite2,
  foeSize2,
  aroundOf,
  type Foe2Pose,
  type Foe2Size,
} from '../art/dungeonArt2';
import { WALK2_STRIDE } from '../art/character2';
import { addGlow, type Glow } from '../art/raster';
import { cell, outlined, tgrid, type Picture2 } from '../art/town2/cells';
import type { Mat } from '../art/town2/ramps';
import {
  EFFECT_MS,
  SAY_MS,
  alive,
  held,
  roomLocked,
  tideOf,
  type Battle,
  type Effect,
  type Foe,
  type Telegraph,
} from './battle';
import { shownApart, type Figure } from './apart';
import type { Placed, Standing } from './draw';
import { placeOf, type Dungeon, type Room, type Run } from './dungeon';
import { DUNGEON, far } from './dungeonMetrics';
import { breathFrame } from './figures2';
import { foeKind, type FoeKind } from './foes';
import { tileAt } from './ground';
import {
  CaveShadow,
  cellVariant,
  doorTile,
  glowsIn,
  paintCells,
  perchLift,
  type RoomLook,
} from './grottoArt';
import { CAPTAIN_SAYS } from './grottoWords';
import type { Facing } from './play';
import type { StageExtra } from './stage';
import type { Box } from './things';
import { rising, type TideNow } from './tide';
import type { Cell, Point } from './tileMap';

/** A tile's side, in art pixels. */
const T = DUNGEON.tile;

/** How long someone struck shows the flash of the blow. */
export const FLASH_MS = 120;
/** How long after that they show the recoil. */
export const HURT_MS = 320;
/** How long a foe's blow shows, its weapon out along the line of it. */
export const STRIKE_MS = 250;
/** How long a fallen foe stays: buckling, then down, then gone. */
export const FALL_MS = 900;
/** How long barred doors take to lift once a room is clear. */
export const DOOR_LIFT_MS = 500;
/** How long a heavy blow's landing shows. */
const LANDED_MS = 300;
/** How long an arrow is in the air, to the eye (it has already landed by the rules). */
const ARROW_MS = 160;
/** A thrown keg is in the air for this part of its warning, then lies burning where it fell. */
const KEG_FLIGHT = 0.4;
/** How high a flying thing is drawn above where it is. */
const FLY_RISE = far(10);
/**
 * How far the ground passes under a creature a frame of its walk, in art
 * pixels: the art lane's four frames of moved parts (people walk on the
 * hero's rig, by `WALK2_STRIDE`).
 */
export const CREATURE_STRIDE = 6;
/** How far the hero leans into a blow, in art pixels, and for how long. */
export const LUNGE = 3;
export const LUNGE_MS = 140;

const FONT = "'HH Digits', 'Pixelify Sans', ui-monospace, monospace";
const WORDS = "'Pixelify Sans', ui-monospace, monospace";

/** A colour of the cave's dusk, by the town's materials. */
const tone = (m: Mat, step: number): string => CAVE_DUSK.colours[m][step]!;
export const FIGHT_COLOURS = {
  ink: tone('shade', 2),
  shade: tone('shade', 0),
  red: tone('crimson', 2),
  redDark: tone('crimson', 4),
  fire1: tone('fire', 1),
  fire2: tone('fire', 3),
  fire3: tone('fire', 4),
  metal1: tone('iron', 1),
  metal2: tone('iron', 2),
  metal3: tone('iron', 4),
  white: tone('sail', 0),
  foam: tone('sea', 0),
  smoke: tone('smoke', 2),
  gold: tone('gold', 1),
  green: tone('grass', 1),
  greenDark: tone('pine', 2),
  wood: tone('wood', 2),
  sand: tone('sand', 1),
  stone: tone('rock', 1),
  hurt: tone('crimson', 1),
  heal: tone('grass', 0),
} as const;
const C = FIGHT_COLOURS;

/* ----- Who stands how ----- */

/** How a foe is drawn this moment: the art lane's pose, its frame, which way, and the captain's phase. */
export interface FoeShown {
  readonly pose: Foe2Pose;
  readonly frame: number;
  readonly facing: Facing;
  readonly phase: number;
}

/** Whether a foe walks on legs like the hero's (people), or is a creature with its own few frames. */
const isPerson = (monster: string): boolean => {
  const s = FOE2_SIZES[monster];
  return !!s && s.w === 56 && s.h === 72;
};

/**
 * A foe's pose from its state, as the art lane's B10a asks: falling once
 * down (buckling, then down); the flash of a blow just taken, then the
 * recoil; the wind-up while a heavy blow is marked; the blow itself just
 * after it lands (an ordinary one, or a heavy one); walking (a frame for each
 * stride of ground, people by the hero's stride); otherwise standing and
 * breathing. Facing as it faces; the captain in his phase.
 */
export function foePose(foe: Foe, clock: number, speedMs: number, kind: FoeKind): FoeShown {
  const facing = foe.facing;
  const phase = Math.max(1, foe.phase);
  const frames = foeFrames2(foe.monster);
  const count = (pose: Foe2Pose): number => Math.max(1, frames?.[pose] ?? 1);
  const shown = (pose: Foe2Pose, frame = 0): FoeShown => ({ pose, frame, facing, phase });
  if (foe.diedAt !== null) return shown('fall', clock - foe.diedAt < FALL_MS / 3 ? 0 : 1);
  const since = clock - foe.struckAt;
  if (since < FLASH_MS) return shown('flash');
  if (since < HURT_MS) return shown('hurt');
  if (foe.heavy) return shown('windup');
  const heavy = kind.heavy;
  const landed = heavy && foe.aware && heavy.everyMs - foe.heavyMs < STRIKE_MS;
  const blow = foe.engaged && speedMs - foe.blowMs < STRIKE_MS;
  if (landed || blow) return shown('strike');
  const flying = !!foe.flight && (foe.flight.mode === 'in' || foe.flight.mode === 'out');
  if ((foe.path.length > 0 && !foe.wash) || flying) {
    const stride = isPerson(foe.monster) ? WALK2_STRIDE : CREATURE_STRIDE;
    return shown('walk', Math.floor(foe.walked / stride) % count('walk'));
  }
  // Each one breathes a little out of step with the others.
  const offset = (Number(foe.key.split(' ').at(-1)) || 0) * 330;
  return shown('idle', breathFrame(clock, offset) % count('idle'));
}

/** How a foe's sizes are known: the art lane's table, or a guess for one it has not drawn. */
function sizeOf(monster: string): Foe2Size {
  return (
    foeSize2(monster) ?? {
      w: 40,
      h: 40,
      anchor: { x: 20, y: 39 },
      tall: 36,
      front: 18,
      back: 18,
      strike: 20,
      box: foeKind(monster).box,
      shadow: 12,
      hover: 0,
    }
  );
}

/**
 * How far above where it is a foe is drawn: a bird on its perch sits on the
 * post's seat, and flies a little above the ground, settling onto it as it
 * comes down; anything else stands where it is.
 */
export function liftOf(room: Room, foe: Foe): number {
  if (!foe.flight) return 0;
  if (foe.flight.mode === 'down') return 0;
  const perch = room.perches[foe.flight.perch];
  const seat = perch ? perchLift(room, perch) : FLY_RISE;
  if (foe.flight.mode === 'perch') return seat;
  // In the air: from the seat's height near the perch to a little over the ground away from it.
  const d = perch ? Math.hypot(foe.at.x - perch.x, foe.at.y - perch.y) : Infinity;
  const k = Math.max(0, 1 - d / (2 * T));
  return Math.round(FLY_RISE + (seat - FLY_RISE) * k);
}

/** How far the hero leans toward his target as he strikes: his blows are the fight's 'hit' and 'miss' on foes. */
export function heroLunge(battle: Battle, facing: Facing): number {
  const last = battle.effects.reduce(
    (t, e) => ((e.kind === 'hit' || e.kind === 'miss') && e.on === 'foe' ? Math.max(t, e.from) : t),
    -Infinity,
  );
  const age = battle.clock - last;
  if (!(age >= 0 && age < LUNGE_MS)) return 0;
  // Out for the first half, back for the second.
  const k = age < LUNGE_MS / 2 ? 1 : 0.5;
  return Math.round(LUNGE * k) * (facing === 'left' ? -1 : 1);
}

/** Whether the hero's blow is in its flash: the moment a weapon's glint is drawn. */
export function heroSwinging(battle: Battle): number | null {
  const last = battle.effects.reduce(
    (t, e) => ((e.kind === 'hit' || e.kind === 'miss') && e.on === 'foe' ? Math.max(t, e.from) : t),
    -Infinity,
  );
  const age = battle.clock - last;
  return age >= 0 && age < LUNGE_MS ? age / LUNGE_MS : null;
}

/** A picture's pixels in one colour: how the hero looks for a moment when struck. Made once per picture. */
const flashes = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();

export function flashOf(image: HTMLCanvasElement, colour: string): HTMLCanvasElement {
  let byColour = flashes.get(image);
  if (!byColour) {
    byColour = new Map();
    flashes.set(image, byColour);
  }
  const made = byColour.get(colour);
  if (made) return made;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  byColour.set(colour, canvas);
  return canvas;
}

/** Whether someone struck at `at` is still showing it at `clock`. */
export const flashing = (at: number, clock: number): boolean => clock - at < FLASH_MS;

/* ----- Foes' pictures, lit by the lanterns near them ----- */

/** How finely a foe's light follows it, in art pixels: one lit picture per step of this. */
const LIGHT_STEP = 6;
/** Lit pictures kept per foe; the least lately shown goes first. */
const LIT_KEPT = 32;

/**
 * Each foe's pictures, lit: the art lane's kept sprite where no lantern
 * reaches, otherwise its frame painted with the glows that reach it, one per
 * pose and place (to `LIGHT_STEP`), the last few kept.
 */
export class FoePictures {
  private readonly lit = new Map<string, Map<string, HTMLCanvasElement | null>>();
  private readonly glows: readonly Glow[];
  constructor(glows: readonly Glow[]) {
    this.glows = glows;
  }

  /** The foe drawn as `shown` with its feet at `feet`: its canvas and where its feet are on it. */
  at(
    monster: string,
    key: string,
    shown: FoeShown,
    feet: Point,
  ): { image: HTMLCanvasElement; feet: Point; glows: readonly Glow[] } | null {
    const pic = foePicture2(monster, shown.pose, shown.facing, shown.frame, shown.phase);
    if (!pic) return null;
    const plain = foeSprite2(
      monster,
      shown.pose,
      shown.facing,
      shown.frame,
      shown.phase,
      CAVE_DUSK,
    );
    if (!plain) return null;
    const qx = Math.round(feet.x / LIGHT_STEP) * LIGHT_STEP;
    const qy = Math.round(feet.y / LIGHT_STEP) * LIGHT_STEP;
    const { w, h } = pic.picture.grid;
    const box = { x: qx - pic.feet.x, y: qy - pic.feet.y, w, h };
    const local = glowsIn(this.glows, box);
    if (local.length === 0) return { image: plain, feet: pic.feet, glows: pic.picture.glows };
    let mine = this.lit.get(key);
    if (!mine) {
      mine = new Map();
      this.lit.set(key, mine);
    }
    const k = `${shown.pose} ${shown.facing} ${shown.frame} ${shown.phase} ${qx} ${qy}`;
    let image = mine.get(k);
    if (image === undefined) {
      if (mine.size >= LIT_KEPT) mine.delete(mine.keys().next().value!);
      image = paintCells({
        grid: pic.picture.grid,
        glows: [...pic.picture.glows, ...local],
      });
      mine.set(k, image);
    } else {
      // Shown again: last to go.
      mine.delete(k);
      mine.set(k, image);
    }
    return { image: image ?? plain, feet: pic.feet, glows: pic.picture.glows };
  }
}

/* ----- Drawing in whole art pixels ----- */

/** A filled circle in whole pixels, row by row. */
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  if (r < 0.5) return;
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const R = Math.floor(r);
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(x0 - half, y0 + dy, 2 * half + 1, 1);
  }
}

/** A circle's edge, `thick` pixels wide, in whole pixels. */
function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, thick = 1): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const R = Math.floor(r);
  const inner = r - thick;
  for (let dy = -R; dy <= R; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    const inHalf = Math.abs(dy) < inner ? Math.floor(Math.sqrt(inner * inner - dy * dy)) : -1;
    if (inHalf < 0) {
      ctx.fillRect(x0 - half, y0 + dy, 2 * half + 1, 1);
    } else {
      ctx.fillRect(x0 - half, y0 + dy, half - inHalf, 1);
      ctx.fillRect(x0 + inHalf + 1, y0 + dy, half - inHalf, 1);
    }
  }
}

/** Each oval's edge as runs along its rows, worked out once per size. */
const ovals = new Map<string, readonly [number, number, number][]>();

/** A flat ellipse's edge, for the marks at someone's feet: a few runs of pixels a row. */
function oval(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  const key = `${rx} ${ry}`;
  let runs = ovals.get(key);
  if (!runs) {
    const rows = new Map<number, Set<number>>();
    for (let a = 0; a < 96; a++) {
      const t = (a / 96) * Math.PI * 2;
      const y = Math.round(Math.sin(t) * ry);
      const row = rows.get(y) ?? new Set<number>();
      row.add(Math.round(Math.cos(t) * rx));
      rows.set(y, row);
    }
    const made: [number, number, number][] = [];
    for (const [dy, xs] of rows) {
      const sorted = [...xs].sort((a, b) => a - b);
      let from = sorted[0]!;
      let to = from;
      for (const x of sorted.slice(1)) {
        if (x === to + 1) to = x;
        else {
          made.push([dy, from, to - from + 1]);
          from = to = x;
        }
      }
      made.push([dy, from, to - from + 1]);
    }
    runs = made;
    ovals.set(key, runs);
  }
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (const [dy, from, length] of runs) ctx.fillRect(x0 + from, y0 + dy, length, 1);
}

/** Whether a pixel is inside an arc's wedge (an angle within half its spread of its facing). */
function inWedge(dx: number, dy: number, facing: number, half: number): boolean {
  const turn = Math.atan2(dy, dx) - facing;
  return Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn))) <= half;
}

/** A wedge's rows: for each, where a run of its pixels starts and how long it is. */
type Spans = readonly (readonly [dy: number, from: number, length: number])[];

/** Wedges worked out already, by their shape: a swing draws the same few every frame. */
const spansMade = new Map<string, Spans>();
const SPANS_KEPT = 96;

function wedgeSpans(r: number, facing: number, half: number, inner: number): Spans {
  const key = `${r} ${facing.toFixed(4)} ${half.toFixed(4)} ${inner}`;
  let spans = spansMade.get(key);
  if (spans) return spans;
  const out: [number, number, number][] = [];
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) {
    // Where the current stretch of the row began; null between stretches.
    let run: number | null = null;
    for (let dx = -R; dx <= R + 1; dx++) {
      const d = Math.hypot(dx, dy);
      const inside = dx <= R && d <= r && d >= inner && inWedge(dx, dy, facing, half);
      if (inside && run === null) run = dx;
      if (!inside && run !== null) {
        out.push([dy, run, dx - run]);
        run = null;
      }
    }
  }
  spans = out;
  if (spansMade.size >= SPANS_KEPT) spansMade.delete(spansMade.keys().next().value!);
  spansMade.set(key, spans);
  return spans;
}

/** A filled wedge of a disc, row by row: the pixels within `r` and the angle. */
function wedge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  facing: number,
  half: number,
  inner = 0,
): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (const [dy, from, length] of wedgeSpans(r, facing, half, inner))
    ctx.fillRect(x0 + from, y0 + dy, length, 1);
}

/** How far through its warning a heavy attack is, 0 to 1. */
export function telegraphProgress(t: Telegraph, clock: number): number {
  return Math.min(1, Math.max(0, (clock - t.from) / (t.lands - t.from)));
}

/**
 * A circle's mark (a slam, a keg): the whole circle faintly, its edge solid
 * from the start so where it will land is never in doubt, and a fill growing
 * from the middle that reaches the edge as it lands. The edge flickers at the end.
 */
function drawCircle(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number): void {
  const k = telegraphProgress(t, clock);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = C.redDark;
  disc(ctx, t.at.x, t.at.y, t.radius);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = C.red;
  disc(ctx, t.at.x, t.at.y, t.radius * k);
  ctx.globalAlpha = 1;
  const late = t.lands - clock <= 300;
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? C.fire1 : C.fire2;
  ring(ctx, t.at.x, t.at.y, t.radius, 2);
  ctx.fillStyle = C.ink;
  ring(ctx, t.at.x, t.at.y, t.radius + 1, 1);
}

/**
 * A cannon volley's line: a strip straight down the room, hatched in fire
 * with solid edges, the hatching marching down it, and the shots' shadows
 * growing along it as they come.
 */
function drawLine(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number): void {
  const k = telegraphProgress(t, clock);
  const x = Math.round(t.at.x - t.radius);
  const w = Math.round(2 * t.radius);
  const top = Math.round(t.at.y);
  const bottom = Math.round(t.bottom ?? t.at.y);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = C.fire3;
  ctx.fillRect(x, top, w, bottom - top);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = C.fire2;
  const shift = Math.floor(clock / 60) % 12;
  for (let y = top - 12 + shift; y < bottom; y += 12) {
    for (let i = 0; i < w; i++) {
      const yy = y + i;
      if (yy >= top && yy < bottom) ctx.fillRect(x + i, yy, 1, 4);
    }
  }
  ctx.globalAlpha = 1;
  const late = t.lands - clock <= 300;
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? C.fire1 : C.fire2;
  ctx.fillRect(x - 1, top, 2, bottom - top);
  ctx.fillRect(x + w - 1, top, 2, bottom - top);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x - 2, top, 1, bottom - top);
  ctx.fillRect(x + w + 1, top, 1, bottom - top);
  // The shots' shadows, growing along the line as they come down.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = C.ink;
  for (let y = top + 36; y < bottom - 12; y += 72) disc(ctx, t.at.x, y, 1 + k * (t.radius - 4));
  ctx.globalAlpha = 1;
}

/**
 * The anchor's sweep: a wedge of the ground before him in pale steel, its
 * rim bright, filling round from one side to the other as he swings, so it
 * reads apart from a red circle and from a fiery line.
 */
function drawArc(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number): void {
  // The swing's progress in sixteenths, so its wedges are the same few each swing.
  const k = Math.round(telegraphProgress(t, clock) * 16) / 16;
  const facing = t.facing ?? 0;
  const half = (t.spread ?? Math.PI) / 2;
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = C.metal1;
  wedge(ctx, t.at.x, t.at.y, t.radius, facing, half);
  // The swing coming round, from one edge of the wedge towards the other.
  const from = facing - half;
  const sweep = 2 * half * k;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = C.white;
  wedge(ctx, t.at.x, t.at.y, t.radius, from + sweep / 2, sweep / 2);
  ctx.globalAlpha = 1;
  const late = t.lands - clock <= 300;
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? C.white : C.metal2;
  wedge(ctx, t.at.x, t.at.y, t.radius, facing, half, t.radius - 2);
  ctx.fillStyle = C.ink;
  wedge(ctx, t.at.x, t.at.y, t.radius + 1, facing, half, t.radius);
  // The wedge's two straight edges.
  ctx.fillStyle = C.metal2;
  for (const a of [facing - half, facing + half]) {
    for (let r = 6; r < t.radius; r += 1)
      ctx.fillRect(
        Math.round(t.at.x + Math.cos(a) * r),
        Math.round(t.at.y + Math.sin(a) * r),
        1,
        1,
      );
  }
}

function drawMark(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number): void {
  if (t.shape === 'line') drawLine(ctx, t, clock);
  else if (t.shape === 'arc') drawArc(ctx, t, clock);
  else drawCircle(ctx, t, clock);
}

/** A blow landing: the shape flashing, a keg's blast or its hiss, a volley's splashes down its line. */
function drawLanded(
  ctx: CanvasRenderingContext2D,
  e: Extract<Effect, { kind: 'landed' }>,
  clock: number,
): void {
  const age = clock - e.from;
  if (e.doused) {
    // A keg in the water: a puff of steam, and nothing more.
    const k = age / EFFECT_MS;
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.fillStyle = C.smoke;
    for (const [dx, dy, r] of [
      [0, -6, 4],
      [-6, -10, 3],
      [6, -13, 3],
    ] as const)
      disc(ctx, e.at.x + dx, e.at.y + dy - k * 15, r + k * 3);
    ctx.globalAlpha = 1;
    return;
  }
  if (age >= LANDED_MS) return;
  const fade = 1 - age / LANDED_MS;
  const t = e.mark;
  ctx.globalAlpha = 0.7 * fade;
  if (t.shape === 'line') {
    ctx.fillStyle = C.fire1;
    const top = Math.round(t.at.y);
    const bottom = Math.round(t.bottom ?? t.at.y);
    ctx.fillRect(Math.round(t.at.x - t.radius), top, Math.round(2 * t.radius), bottom - top);
    ctx.fillStyle = C.foam;
    for (let y = top + 36; y < bottom - 12; y += 72) disc(ctx, t.at.x, y, t.radius + 3);
  } else if (t.shape === 'arc') {
    ctx.fillStyle = C.white;
    wedge(ctx, t.at.x, t.at.y, t.radius, t.facing ?? 0, (t.spread ?? Math.PI) / 2);
  } else {
    ctx.fillStyle = C.fire1;
    disc(ctx, e.at.x, e.at.y, e.radius);
  }
  ctx.globalAlpha = 1;
}

/* ----- Drawing at the screen's resolution: words and thin lines ----- */

/**
 * Words with a dark edge, centred on `x`, so they read over any ground.
 * `size` and the edge are in CSS pixels; `k` is art pixels per CSS pixel.
 */
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  colour: string,
  k: number,
  font = FONT,
): void {
  ctx.font = `${size * k}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * k;
  ctx.strokeStyle = C.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

/** Words over a speaker's head, in a box with a tail, kept inside the room. */
function speech(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  k: number,
): void {
  ctx.font = `${13 * k}px ${WORDS}`;
  const pad = 6 * k;
  const w = Math.ceil(ctx.measureText(text).width) + 2 * pad;
  const h = 18 * k;
  const left = Math.min(Math.max(4, x - w / 2), width - w - 4);
  const top = y - h - 6 * k;
  ctx.fillStyle = C.ink;
  ctx.fillRect(left - k, top - k, w + 2 * k, h + 2 * k);
  ctx.fillRect(x - 4 * k, top + h, 9 * k, 5 * k);
  ctx.fillStyle = C.white;
  ctx.fillRect(left, top, w, h);
  ctx.fillRect(x - 3 * k, top + h, 7 * k, 3 * k);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, left + pad, top + 13 * k);
}

/** How tall a foe stands above its feet, as drawn: its drawing or its tap box, whichever is taller. */
function standsOf(monster: string): number {
  const size = sizeOf(monster);
  return Math.max(size.tall, foeKind(monster).box.h);
}

/** A foe's health over its head, its blow coming, a parrot's rally on it, and the target's mark. */
function drawFoeOver(
  ctx: CanvasRenderingContext2D,
  battle: Battle,
  foe: Foe,
  shownX: number,
  lift: number,
  targeted: boolean,
  k: number,
): void {
  const def = battle.monsters[foe.monster]!;
  const kind = foeKind(foe.monster);
  const w = Math.max(24, Math.min(54, kind.box.w));
  const x = shownX - w / 2;
  const y = Math.round(foe.at.y - lift - standsOf(foe.monster) - 8);
  const bar = 4 * k;
  if (!kind.boss) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(x - k, y - k, w + 2 * k, bar + 2 * k);
    ctx.fillStyle = C.shade;
    ctx.fillRect(x, y, w, bar);
    ctx.fillStyle = C.hurt;
    ctx.fillRect(x, y, (w * foe.hp) / def.hp, bar);
  }
  if (foe.engaged && !foe.heavy) {
    // The next ordinary blow, filling; it turns hot just before it falls.
    const f = Math.min(1, Math.max(0, 1 - foe.blowMs / def.speedMs));
    ctx.fillStyle = C.ink;
    ctx.fillRect(x - k, y + bar + k, w + 2 * k, 3 * k);
    ctx.fillStyle = foe.blowMs <= 500 ? C.fire1 : C.metal2;
    ctx.fillRect(x, y + bar + 2 * k, w * f, k);
  }
  if (foe.rallied) {
    // Egged on by the parrot: a pair of bold green chevrons over his head, flickering.
    const on = Math.floor(battle.clock / 200) % 2 === 0;
    const cx = shownX + w / 2 + 4 * k;
    const cy = y - 12 * k;
    const s = 2 * k;
    ctx.fillStyle = C.ink;
    ctx.fillRect(cx - k, cy - k, 15 * k, 12 * k);
    ctx.fillStyle = on ? C.green : C.greenDark;
    for (const dx of [0, 6]) {
      for (let i = 0; i < 5; i++) {
        const off = i < 3 ? i : 4 - i;
        ctx.fillRect(cx + (dx + off) * k, cy + i * s, s, s);
      }
    }
  }
  if (foe.heavy) {
    // Winding up something big.
    const blink = Math.floor(battle.clock / 120) % 2 === 0;
    label(ctx, '!', shownX, y - 3 * k, 18, blink ? C.fire1 : C.fire2, k);
  } else if (targeted) {
    const tx = shownX;
    const ty = y - 5 * k;
    ctx.fillStyle = C.ink;
    ctx.fillRect(tx - 6 * k, ty - 6 * k, 13 * k, 3 * k);
    ctx.fillRect(tx - 5 * k, ty - 3 * k, 11 * k, 3 * k);
    ctx.fillRect(tx - 3 * k, ty, 7 * k, 3 * k);
    ctx.fillStyle = C.gold;
    ctx.fillRect(tx - 5 * k, ty - 5 * k, 11 * k, k);
    ctx.fillRect(tx - 4 * k, ty - 2 * k, 9 * k, k);
    ctx.fillRect(tx - 2 * k, ty + k, 5 * k, k);
  }
}

/** A number, a word or a glint over someone, drawn at the screen's resolution. */
function drawEffectOver(
  ctx: CanvasRenderingContext2D,
  e: Effect,
  clock: number,
  hero: Point,
  heroTall: number,
  k: number,
  nudge = 0,
): void {
  const age = clock - e.from;
  const t = age / EFFECT_MS;
  const rise = Math.round(t * 18);
  ctx.globalAlpha = t > 0.66 ? Math.max(0, (1 - t) * 3) : 1;
  const overHero = hero.y - heroTall - 6;
  switch (e.kind) {
    case 'hit': {
      const top = e.on === 'hero' ? overHero : e.at.y - 12;
      const x = (e.on === 'hero' ? hero.x - 14 : e.at.x) + nudge;
      label(ctx, String(e.amount), x, top - rise, 18, e.on === 'hero' ? C.hurt : C.white, k);
      break;
    }
    case 'miss': {
      const top = e.on === 'hero' ? overHero : e.at.y - 12;
      const x = (e.on === 'hero' ? hero.x - 14 : e.at.x) + nudge;
      label(ctx, 'miss', x, top - rise, 13, C.metal2, k, WORDS);
      break;
    }
    case 'heal':
      label(ctx, `+${e.amount}`, hero.x + 18, overHero - rise, 17, C.heal, k);
      break;
    case 'empty':
      label(ctx, 'Out of arrows', hero.x, overHero - 4 - rise, 13, C.sand, k, WORDS);
      break;
    case 'splash':
      label(ctx, 'splash', e.at.x, e.at.y - heroTall - 12 - rise, 13, C.white, k, WORDS);
      break;
    case 'landed':
      if (e.doused) label(ctx, 'fizz', e.at.x, e.at.y - 26 - rise, 13, C.smoke, k, WORDS);
      break;
    default:
      break;
  }
  ctx.globalAlpha = 1;
}

/** Things in the air or on the floor drawn in art pixels: loot glints, arrows, foam, dust, a swing. */
function drawEffectArt(ctx: CanvasRenderingContext2D, e: Effect, clock: number): void {
  const age = clock - e.from;
  const t = age / EFFECT_MS;
  const rise = Math.round(t * 18);
  ctx.globalAlpha = t > 0.66 ? Math.max(0, (1 - t) * 3) : 1;
  switch (e.kind) {
    case 'loot':
      ctx.fillStyle = C.gold;
      for (const [dx, dy] of [
        [0, 0],
        [-6, 4],
        [6, 3],
      ] as const)
        ctx.fillRect(Math.round(e.at.x) + dx, Math.round(e.at.y) - 12 - rise * 2 + dy, 1, 3);
      break;
    case 'shot': {
      if (age > ARROW_MS) break;
      ctx.globalAlpha = 1;
      const k = age / ARROW_MS;
      const from = { x: e.at.x, y: e.at.y - 34 };
      const to = { x: e.to.x, y: e.to.y - 14 };
      const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      const ux = (to.x - from.x) / len;
      const uy = (to.y - from.y) / len;
      const x = from.x + (to.x - from.x) * k;
      const y = from.y + (to.y - from.y) * k;
      ctx.fillStyle = C.wood;
      for (let i = 1; i < 10; i++)
        ctx.fillRect(Math.round(x - ux * i), Math.round(y - uy * i), 1, 1);
      ctx.fillStyle = C.metal1;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      break;
    }
    case 'splash': {
      // Washed off: rings of foam spreading where he stood.
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = C.foam;
      ring(ctx, e.at.x, e.at.y, 6 + t * 21, 1);
      ring(ctx, e.at.x, e.at.y, 3 + t * 12, 1);
      break;
    }
    case 'released': {
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = C.stone;
      for (const [dx, dy] of [
        [-9, -3],
        [8, -6],
        [0, 4],
        [-4, 8],
      ] as const)
        ctx.fillRect(Math.round(e.at.x + dx * (1 + t)), Math.round(e.at.y + dy * (1 + t)), 2, 2);
      break;
    }
    default:
      break;
  }
  ctx.globalAlpha = 1;
}

/* ----- The room's pieces a fight adds ----- */

const around = (at: Point, r: number): Box => ({
  x: Math.floor(at.x - r - 2),
  y: Math.floor(at.y - r - 2),
  w: Math.ceil(2 * r + 5),
  h: Math.ceil(2 * r + 5),
});

function markBox(t: Telegraph): Box {
  if (t.shape === 'line') {
    const top = Math.floor(t.at.y) - 2;
    return {
      x: Math.floor(t.at.x - t.radius) - 4,
      y: top,
      w: Math.ceil(2 * t.radius) + 9,
      h: Math.ceil((t.bottom ?? t.at.y) - top) + 4,
    };
  }
  return around(t.at, t.radius + 2);
}

/** The ground the sea is about to cover in a room: each tile that changes at the next rise. */
const coming = new WeakMap<Room, Map<number, Cell[]>>();

function aboutToFlood(room: Room, level: number): Cell[] {
  let byLevel = coming.get(room);
  if (!byLevel) {
    byLevel = new Map();
    coming.set(room, byLevel);
  }
  let cells = byLevel.get(level);
  if (!cells) {
    cells = [];
    const g = room.ground;
    const all = { level, shut: false, released: g.bars.length };
    for (let row = 0; row < g.rows; row++) {
      for (let col = 0; col < g.cols; col++) {
        if (g.heights[row]![col]! < 0) continue;
        if (tileAt(g, col, row, all) !== tileAt(g, col, row, { ...all, level: level + 1 }))
          cells.push({ col, row });
      }
    }
    byLevel.set(level, cells);
  }
  return cells;
}

/** The sea creeping in over ground it is about to cover: foam ripples drifting across it. */
function drawRipples(ctx: CanvasRenderingContext2D, cells: readonly Cell[], clock: number): void {
  const phase = Math.floor(clock / 160);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = C.foam;
  for (const c of cells) {
    const x = c.col * T;
    const y = c.row * T;
    for (let i = 0; i < 2; i++) {
      const row = (((c.col * 5 + c.row * 3 + i * 7 + phase) % 6) + 6) % 6;
      const at = ((c.col * 11 + i * 5 + phase * 2) % 16) + 2;
      ctx.fillRect(x + at, y + 3 + row * 3 + i * 4, 6, 1);
    }
  }
  ctx.globalAlpha = 1;
}

/** A sack of loot on the floor, with a glint of coin: this scene's own, while the art lane has none. */
const LOOT: Picture2 = (() => {
  const g = tgrid(14, 13);
  const W = 14;
  for (let y = 3; y < 12; y++)
    for (let x = 1; x < W - 1; x++) {
      const dx = (x - 6.5) / 5.5;
      const dy = (y - 7.5) / 4.5;
      if (dx * dx + dy * dy > 1) continue;
      // Lit from the upper left, as everything is.
      const lit = dx + dy;
      g.d[y * W + x] = cell('linen', lit < -0.6 ? 1 : lit < 0.2 ? 2 : lit < 0.8 ? 3 : 4);
    }
  for (const [x, y] of [
    [5, 1],
    [6, 1],
    [7, 1],
    [6, 2],
  ] as const)
    g.d[y * W + x] = cell('linen', 3);
  for (const [x, y] of [
    [5, 3],
    [6, 3],
    [7, 3],
  ] as const)
    g.d[y * W + x] = cell('leather', 3);
  for (const [x, y, t] of [
    [10, 10, 1],
    [11, 10, 2],
    [10, 11, 3],
    [11, 11, 3],
  ] as const)
    g.d[y * W + x] = cell('gold', t);
  return { grid: outlined(g), glows: [] };
})();
const LOOT_FEET = { x: 7, y: 13 };

/** Loot on the floor as drawn: its picture, and where on it the floor is. */
export interface LootArt {
  readonly image: HTMLCanvasElement;
  readonly feet: Point;
}

/**
 * The one place loot's look is chosen: the art lane's `loot_pile` prop
 * (`dungeonProp2`, stood on its foot) once it has one, else this scene's own
 * sack. Null where nothing can be painted.
 */
export function lootArt(): LootArt | null {
  const pile = dungeonProp2('loot_pile');
  const image = pile && dungeonPropSprite2('loot_pile', CAVE_DUSK);
  if (pile && image) return { image, feet: { x: pile.foot, y: pile.base } };
  const own = paintCells(LOOT);
  return own && { image: own, feet: LOOT_FEET };
}

/** The half-width of a lit fuse's glow on its canvas. */
const FUSE_R = Math.ceil(FUSE_LIGHT2.radius);
/** How many strengths of a fuse's flicker are painted. */
const FUSE_STEPS = 4;
const fuseGlows: (HTMLCanvasElement | null)[] = [];

/**
 * A lit fuse's light on what is about it, at a strength (its glow wavering
 * by `flicker2`): light alone, laid over the ground under everyone, in a few
 * painted steps of strength.
 */
function fuseGlow(strength: number): HTMLCanvasElement | null {
  if (typeof ImageData === 'undefined' || typeof document === 'undefined') return null;
  const i = Math.max(
    0,
    Math.min(FUSE_STEPS - 1, Math.round((strength / FUSE_LIGHT2.strength) * (FUSE_STEPS - 1))),
  );
  if (fuseGlows[i] !== undefined) return fuseGlows[i]!;
  const size = 2 * FUSE_R + 1;
  const px = new Float64Array(size * size * 4);
  // Half the fuse's strength on the ground: the flame is in his hands, above it.
  addGlow(px, size, size, {
    x: FUSE_R + 0.5,
    y: FUSE_R + 0.5,
    radius: FUSE_LIGHT2.radius,
    strength: (0.5 * FUSE_LIGHT2.strength * (i + 1)) / FUSE_STEPS,
  });
  const data = new Uint8ClampedArray(px.length);
  for (let j = 0; j < px.length; j++) data[j] = px[j]!;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.getContext('2d')?.putImageData(new ImageData(data, size, size), 0, 0);
  fuseGlows[i] = canvas;
  return canvas;
}

/** The pictures a run's fight is drawn with that do not change with the foe: kept per room look. */
export interface FightArt {
  readonly foes: FoePictures;
  readonly shadows: Map<string, CaveShadow>;
  readonly loot: LootArt | null;
  /** Each door's barred tile, on a canvas, by the door's letter. */
  readonly bars: Map<string, HTMLCanvasElement | null>;
}

/** What a fight in a room draws with, made once for the room's look. */
export function fightArtFor(look: RoomLook): FightArt {
  return {
    foes: new FoePictures(look.glows),
    shadows: new Map(),
    loot: lootArt(),
    bars: new Map(),
  };
}

/** A door's barred tile, as the art lane draws it set in the wall beside it. */
function barredDoor(art: FightArt, look: RoomLook, room: Room, cell: Cell, letter: string) {
  if (!art.bars.has(letter)) {
    const kinds = look.kindsAt(0, false);
    const tile = dungeonTile2(
      doorTile(room, cell.col, true),
      cellVariant(room.ground.cols, cell.col, cell.row),
      aroundOf(kinds, cell.col, cell.row),
      cell,
    );
    art.bars.set(letter, tile ? paintCells(tile) : null);
  }
  return art.bars.get(letter) ?? null;
}

/** The ground's state of the tide in a run, as the room's look keys it. */
export function tideStateOf(dungeon: Dungeon, run: Run): { level: number; warn: boolean } {
  if (!run.battle) return { level: 0, warn: false };
  const tide = tideOf(run.battle, placeOf(dungeon, run));
  return { level: tide.level, warn: rising(tide, run.battle.clock) };
}

/** How tall the hero stands above his feet, for what floats over him. */
export const HERO_TALL = 66;

/** Half the hero's body across, in art pixels, as `apart.ts` reckons him: his box, less its edge. */
export const HERO_HALF = 13;

/**
 * Everyone fighting in a run's room as `shownApart` reckons them: the hero,
 * and each foe standing on the ground (or falling, counting less as it
 * goes), its body either side of its feet from the art lane's sizes. A bird
 * in the air, someone behind bars, and a crew that has fled are left out.
 */
export function fightFigures(dungeon: Dungeon, run: Run): Figure[] {
  const battle = run.battle;
  const hero: Figure = {
    key: 'hero',
    at: run.play.walker.at,
    left: HERO_HALF,
    right: HERO_HALF,
    rank: 0,
    weight: 1,
  };
  if (!battle) return [hero];
  const place = placeOf(dungeon, run);
  const out: Figure[] = [hero];
  for (const foe of battle.foes) {
    if (foe.room !== run.room || foe.fled || held(battle, place, foe)) continue;
    if (foe.flight && foe.flight.mode !== 'down') continue;
    const weight = alive(foe) ? 1 : Math.max(0, 1 - (battle.clock - foe.diedAt!) / FALL_MS);
    if (weight <= 0) continue;
    const size = sizeOf(foe.monster);
    const half = size.box.w / 2;
    // The body ahead of the feet and behind them, less a weapon held clear of it.
    const front = Math.min(size.front, half + 8);
    const back = Math.min(size.back, half + 8);
    const right = foe.facing === 'right';
    out.push({
      key: foe.key,
      at: foe.at,
      left: right ? back : front,
      right: right ? front : back,
      rank: foeKind(foe.monster).boss || size.box.w >= 48 ? 2 : 1,
      weight,
    });
  }
  return out;
}

/** How far to the side each figure in a run's room is drawn from its feet, by key (`'hero'` for him). */
export function fightApart(dungeon: Dungeon, run: Run): Map<string, number> {
  return shownApart(fightFigures(dungeon, run));
}

/**
 * Everything a run's fight adds to the stage this frame: the cast standing,
 * their shadows, what lies on the ground, what is over them in art pixels,
 * and the words and lines at the screen's resolution.
 */
export function fightExtra(dungeon: Dungeon, run: Run, look: RoomLook, art: FightArt): StageExtra {
  const battle = run.battle;
  if (!battle) return { actors: [], boxes: [] };
  const clock = battle.clock;
  const hero = run.play.walker.at;
  const room = dungeon.rooms[run.room]!;
  const place = placeOf(dungeon, run);
  const state = tideStateOf(dungeon, run);
  const cells = look.cellsAt(state.level, state.warn);
  const kinds = look.kindsAt(state.level, state.warn);
  const here = battle.foes.filter(
    (f) => f.room === run.room && !f.fled && (alive(f) || clock - f.diedAt! < FALL_MS),
  );
  // Drawn a little apart where two would be painted over each other; nobody's place in the fight moves.
  const apart = fightApart(dungeon, run);
  const shownX = (foe: Foe): number => foe.at.x + (apart.get(foe.key) ?? 0);
  const actors: Standing[] = [];
  const shadows: Placed[] = [];
  const fuses: Point[] = [];
  const boxes: Box[] = [];
  for (const foe of here) {
    // A fallen foe blinks out at the last.
    if (!alive(foe) && clock - foe.diedAt! > FALL_MS - 240 && Math.floor(clock / 80) % 2 === 1)
      continue;
    const def = battle.monsters[foe.monster];
    const kind = foeKind(foe.monster);
    const shown = foePose(foe, clock, def?.speedMs ?? 2000, kind);
    const lift = liftOf(room, foe);
    const feet = { x: Math.round(shownX(foe)), y: Math.round(foe.at.y) - lift };
    const drawn = art.foes.at(foe.monster, foe.key, shown, feet);
    const size = sizeOf(foe.monster);
    if (drawn) {
      // A bird on its perch sorts in front of the post it sits on.
      const base = lift > 0 && foe.flight?.mode === 'perch' ? Math.round(foe.at.y) + 11 : feet.y;
      actors.push({
        image: drawn.image,
        x: feet.x - drawn.feet.x,
        y: feet.y - drawn.feet.y,
        base,
      });
      boxes.push({
        x: feet.x - drawn.feet.x - 1,
        y: feet.y - drawn.feet.y - 1,
        w: drawn.image.width + 2,
        h: drawn.image.height + 2,
      });
      // What glows in its hands (the powder monkey's lit fuse) lights the ground about him.
      for (const g of drawn.glows) {
        const at = { x: feet.x - drawn.feet.x + g.x, y: feet.y - drawn.feet.y + g.y };
        fuses.push(at);
        boxes.push(around(at, FUSE_LIGHT2.radius + 1));
      }
    }
    // A contact shadow under anything standing on the ground.
    if (lift === 0 && cells && size.shadow > 0) {
      let shadow = art.shadows.get(foe.key);
      if (!shadow) {
        shadow = new CaveShadow();
        art.shadows.set(foe.key, shadow);
      }
      const placed = shadow.at(cells, kinds, look.glows, feet, size.shadow);
      if (placed) {
        shadows.push(placed);
        boxes.push({
          x: placed.x,
          y: placed.y,
          w: placed.image.width,
          h: placed.image.height,
        });
      }
    }
    // The rings at its feet.
    const rx = Math.round(kind.box.w / 2) + 6;
    boxes.push(around({ x: shownX(foe), y: feet.y }, rx + 2));
    const t = foe.heavy;
    if (t) {
      boxes.push(markBox(t));
      if (t.origin) {
        const x = Math.floor(Math.min(t.origin.x, t.at.x)) - 16;
        const y = Math.floor(Math.min(t.origin.y, t.at.y)) - 100;
        boxes.push({
          x,
          y,
          w: Math.ceil(Math.abs(t.origin.x - t.at.x)) + 33,
          h: Math.ceil(Math.abs(t.origin.y - t.at.y)) + 120,
        });
      }
    }
    if (kind.rally) boxes.push(around({ x: shownX(foe), y: feet.y - 12 }, 54));
  }
  for (const t of battle.volleys) boxes.push(markBox(t));
  for (const e of battle.effects) {
    if (e.kind === 'landed')
      boxes.push(
        e.doused
          ? { x: Math.floor(e.at.x) - 18, y: Math.floor(e.at.y) - 40, w: 37, h: 46 }
          : markBox(e.mark),
      );
    else if (e.kind === 'swing') boxes.push(around(e.at, e.radius + 3));
    else if (e.kind === 'splash') boxes.push(around(e.at, 30));
    else if (e.kind === 'released') boxes.push(around(e.at, 30));
    else if (e.kind === 'shot') {
      const x = Math.floor(Math.min(e.at.x, e.to.x)) - 14;
      const y = Math.floor(Math.min(e.at.y - 34, e.to.y - 14)) - 14;
      boxes.push({
        x,
        y,
        w: Math.ceil(Math.abs(e.at.x - e.to.x)) + 29,
        h: Math.ceil(Math.abs(e.at.y - 34 - e.to.y + 14)) + 29,
      });
    } else if (e.kind === 'loot')
      boxes.push({ x: Math.floor(e.at.x) - 9, y: Math.floor(e.at.y) - 52, w: 19, h: 54 });
  }
  // The hero's blow glinting, and a brace over his head.
  const swing = heroSwinging(battle);
  if (swing !== null || battle.braceUntil > clock)
    boxes.push({ x: Math.floor(hero.x) - 40, y: Math.floor(hero.y) - 90, w: 81, h: 96 });
  for (const p of battle.piles)
    if (p.room === run.room) {
      // Its picture where it lies, and the pixel it bobs.
      const w = art.loot?.image.width ?? 18;
      const h = art.loot?.image.height ?? 18;
      const fx = art.loot?.feet.x ?? 9;
      const fy = art.loot?.feet.y ?? 16;
      boxes.push({
        x: Math.floor(p.at.x) - fx - 1,
        y: Math.floor(p.at.y) - fy - 2,
        w: w + 2,
        h: h + 3,
      });
    }

  // A cell's bars stand in the room until the cell opens, in front of whoever waits behind them.
  const barsArt = dungeonProp2('brig_bars');
  const barsImage = dungeonPropSprite2('brig_bars', CAVE_DUSK);
  const released = battle.released[run.room] ?? 0;
  room.ground.bars.forEach((list, wave) => {
    if (wave < released || !barsImage || !barsArt) return;
    for (const c of list) {
      const x = c.col * T + T / 2 - barsArt.foot;
      const foot = c.row * T + T - 1;
      actors.push({ image: barsImage, x, y: foot - barsArt.base, base: foot });
      if (released > 0 || clock < 200)
        boxes.push({ x, y: foot - barsArt.base, w: barsImage.width, h: barsImage.height });
    }
  });
  // Barred doors, lifting once the room is clear.
  const locked = roomLocked(battle, run.room);
  const openedAt = battle.opened[run.room];
  const lifted = locked ? 0 : openedAt === undefined ? 1 : (clock - openedAt) / DOOR_LIFT_MS;
  if (lifted < 1)
    for (const d of room.doors) boxes.push({ x: d.cell.col * T, y: d.cell.row * T, w: T, h: T });
  const tide: TideNow = tideOf(battle, place);
  const ripples = rising(tide, clock) ? aboutToFlood(room, tide.level) : [];
  for (const c of ripples) boxes.push({ x: c.col * T, y: c.row * T, w: T, h: T });
  const viewWidth = room.map.cols * T;

  // Where the overlay draws: every health bar and what is over it, every number and word, the
  // captain's words. Generous; the overlay canvas covers this and nothing more.
  const over: Box[] = [];
  for (const foe of here) {
    if (!alive(foe) || held(battle, place, foe)) continue;
    const top = foe.at.y - liftOf(room, foe) - standsOf(foe.monster);
    over.push({ x: foe.at.x - 44, y: top - 44, w: 92, h: 52 });
  }
  for (const e of battle.effects) {
    if (e.kind === 'hit' || e.kind === 'miss' || e.kind === 'heal' || e.kind === 'empty') {
      const onHero = !('on' in e) || e.on === 'hero';
      const x = onHero ? hero.x : e.at.x;
      const y = onHero ? hero.y - HERO_TALL - 6 : e.at.y - 12;
      over.push({ x: x - 70, y: y - 48, w: 140, h: 58 });
    } else if (e.kind === 'splash') {
      over.push({ x: e.at.x - 50, y: e.at.y - HERO_TALL - 60, w: 100, h: 56 });
    } else if (e.kind === 'landed' && e.doused) {
      over.push({ x: e.at.x - 40, y: e.at.y - 70, w: 80, h: 56 });
    } else if (e.kind === 'say' && clock - e.from < SAY_MS) {
      const who = battle.foes.find((f) => f.key === e.who);
      if (who && who.room === run.room) {
        const top = who.at.y - standsOf(who.monster) - 14;
        over.push({ x: 0, y: top - 50, w: viewWidth, h: 54 });
      }
    }
  }
  let overlayBox: Box | null = null;
  for (const b of over) {
    if (!overlayBox) overlayBox = b;
    else {
      const x = Math.min(overlayBox.x, b.x);
      const y = Math.min(overlayBox.y, b.y);
      overlayBox = {
        x,
        y,
        w: Math.max(overlayBox.x + overlayBox.w, b.x + b.w) - x,
        h: Math.max(overlayBox.y + overlayBox.h, b.y + b.h) - y,
      };
    }
  }

  return {
    actors,
    boxes,
    overlayBox,
    walkerOffset: apart.get('hero') ?? 0,
    walker: (image) => {
      if (flashing(battle.struckAt, clock)) return flashOf(image, C.white);
      // Down: he blinks red until the tide takes him.
      if (battle.over?.why === 'fell' && Math.floor(clock / 150) % 2 === 1)
        return flashOf(image, C.red);
      return image;
    },
    ground(ctx) {
      for (const s of shadows) ctx.drawImage(s.image, s.x, s.y);
      fuses.forEach((at, i) => {
        const glow = fuseGlow(flicker2({ ...FUSE_LIGHT2, x: 0, y: 0 }, clock, i).strength);
        if (glow) ctx.drawImage(glow, Math.round(at.x) - FUSE_R, Math.round(at.y) - FUSE_R);
      });
      if (ripples.length > 0) drawRipples(ctx, ripples, clock);
      if (lifted < 1) {
        for (const d of room.doors) {
          const barred = barredDoor(art, look, room, d.cell, d.letter);
          if (!barred) continue;
          const h = Math.round(T * (1 - Math.max(0, lifted)));
          if (h > 0) ctx.drawImage(barred, 0, T - h, T, h, d.cell.col * T, d.cell.row * T, T, h);
        }
      }
      for (const p of battle.piles) {
        if (p.room !== run.room || !art.loot) continue;
        const bobbed = Math.floor(clock / 400) % 2;
        ctx.drawImage(
          art.loot.image,
          Math.round(p.at.x) - art.loot.feet.x,
          Math.round(p.at.y) - art.loot.feet.y - bobbed,
        );
      }
      for (const foe of here) {
        if (!alive(foe) || held(battle, place, foe)) continue;
        const kind = foeKind(foe.monster);
        const rx = Math.round(kind.box.w / 2) + 2;
        const feet = foe.at.y - liftOf(room, foe);
        if (foe.rallied) {
          // The parrot's work, at his feet too: a green ring, pulsing.
          ctx.fillStyle = Math.floor(clock / 200) % 2 === 0 ? C.green : C.greenDark;
          oval(ctx, shownX(foe), feet, rx + 4, 6);
        }
        if (foe.key === battle.target) {
          ctx.fillStyle = C.gold;
          oval(ctx, shownX(foe), feet, rx + 2, 5);
        }
      }
      for (const foe of here)
        if (foe.heavy && foe.heavy.shape !== 'circle') drawMark(ctx, foe.heavy, clock);
      for (const t of battle.volleys) drawMark(ctx, t, clock);
      for (const foe of here) if (foe.heavy?.shape === 'circle') drawMark(ctx, foe.heavy, clock);
      for (const e of battle.effects) {
        if (e.kind === 'landed') drawLanded(ctx, e, clock);
        const age = clock - e.from;
        if (e.kind === 'swing' && age < 300) {
          // The blade's sweep, out to its full reach, fading.
          ctx.globalAlpha = 1 - age / 300;
          ctx.fillStyle = C.ink;
          ring(ctx, e.at.x, e.at.y, e.radius + 1, 5);
          ctx.fillStyle = C.white;
          ring(ctx, e.at.x, e.at.y, e.radius, 3);
          ctx.globalAlpha = 1;
        }
      }
      // The parrot, egging the crew on: a squawk spreading from it.
      for (const foe of here) {
        if (!alive(foe) || !foe.aware || !foeKind(foe.monster).rally) continue;
        if (!here.some((f) => alive(f) && f.rallied)) continue;
        const k = (clock % 500) / 500;
        ctx.globalAlpha = 0.9 * (1 - k);
        ctx.fillStyle = C.green;
        ring(ctx, shownX(foe), foe.at.y - liftOf(room, foe) - 12, 9 + k * 36, 2);
        ctx.globalAlpha = 1;
      }
    },
    over(ctx) {
      // Things thrown, in their arc from the thrower to the mark; a keg lies burning once it lands.
      const keg = dungeonPropSprite2('powder_keg', CAVE_DUSK);
      const kegArt = dungeonProp2('powder_keg');
      for (const foe of here) {
        const t = foe.heavy;
        if (!t?.origin) continue;
        const p = telegraphProgress(t, clock);
        const isKeg = !!t.douse;
        const f = isKeg ? Math.min(1, p / KEG_FLIGHT) : p;
        const x = Math.round(t.origin.x + (t.at.x - t.origin.x) * f);
        const y = Math.round(
          t.origin.y - 30 + (t.at.y - t.origin.y + 30) * f - Math.sin(Math.PI * f) * 54,
        );
        if (isKeg && keg && kegArt) {
          ctx.drawImage(keg, x - kegArt.foot, y - kegArt.base);
          // The fuse, burning down: a spark that flickers faster as it goes.
          const spark = Math.floor(clock / (p > 0.75 ? 50 : 110)) % 2 === 0;
          ctx.fillStyle = spark ? C.fire1 : C.fire2;
          ctx.fillRect(x + 1, y - kegArt.base - 3, 2, 2);
        } else {
          ctx.fillStyle = C.ink;
          ctx.fillRect(x - 3, y - 4, 7, 10);
          ctx.fillStyle = C.greenDark;
          ctx.fillRect(x - 2, y - 2, 5, 6);
          ctx.fillStyle = C.sand;
          ctx.fillRect(x, y - 3, 1, 1);
        }
      }
      for (const e of battle.effects) drawEffectArt(ctx, e, clock);
      if (swing !== null) {
        // The blade's glint as he strikes: a bright arc out in front of him, there and gone.
        const dir = run.play.facing === 'left' ? -1 : 1;
        const cx = Math.round(hero.x) + dir * 14;
        const cy = Math.round(hero.y) - 30;
        ctx.globalAlpha = 1 - swing;
        ctx.fillStyle = C.white;
        for (let a = -60; a <= 60; a += 8) {
          const r = (a * Math.PI) / 180;
          ctx.fillRect(
            cx + Math.round(Math.cos(r) * 14) * dir,
            cy + Math.round(Math.sin(r) * 16),
            2,
            2,
          );
        }
        ctx.globalAlpha = 1;
      }
      if (battle.braceUntil > clock) {
        // Braced: a small shield over his head.
        const x = Math.round(hero.x);
        const y = Math.round(hero.y) - HERO_TALL - 18;
        ctx.fillStyle = C.ink;
        ctx.fillRect(x - 6, y - 1, 13, 12);
        ctx.fillStyle = C.metal2;
        ctx.fillRect(x - 5, y, 11, 7);
        ctx.fillRect(x - 3, y + 7, 7, 2);
        ctx.fillStyle = C.gold;
        ctx.fillRect(x, y, 1, 9);
      }
    },
    overlay(ctx, k) {
      for (const foe of here)
        if (alive(foe) && !held(battle, place, foe))
          drawFoeOver(
            ctx,
            battle,
            foe,
            shownX(foe),
            liftOf(room, foe),
            foe.key === battle.target,
            k,
          );
      // Numbers landing together on one spot (a double shot) stand side by side.
      const together = new Map<string, number>();
      for (const e of battle.effects) {
        let nudge = 0;
        if (e.kind === 'hit' || e.kind === 'miss') {
          const key = `${e.from} ${e.on} ${Math.round(e.at.x)}`;
          nudge = together.get(key) ?? 0;
          together.set(key, nudge + 1);
        }
        drawEffectOver(ctx, e, clock, hero, HERO_TALL, k, nudge * 14);
      }
      // What the captain shouts, over his head.
      for (const e of battle.effects) {
        if (e.kind !== 'say' || clock - e.from >= SAY_MS) continue;
        const who = battle.foes.find((f) => f.key === e.who);
        if (!who || who.room !== run.room) continue;
        speech(
          ctx,
          CAPTAIN_SAYS[e.line],
          who.at.x,
          who.at.y - standsOf(who.monster) - 14,
          viewWidth,
          k,
        );
      }
    },
  };
}

/** Where a fight's foes are drawn above their feet, for a tap on one: a bird on its perch is up on the post. */
export function tapLift(room: Room): (foe: Foe) => number {
  return (foe) => liftOf(room, foe);
}
