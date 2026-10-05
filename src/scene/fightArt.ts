/*
 * A dungeon fight on the canvas: the monsters (the art lane's sprites or this
 * scene's placeholders), the marked ground of every heavy attack, the sea
 * about to come in, loot on the floor, barred doors and cells, and over
 * everyone their health, the target's mark, numbers that float up and things
 * in flight. Everything here is read from the run (`battle.ts` decides it
 * all); this only puts pixels where it says, in whole art pixels and in the
 * palette's colours.
 *
 * The three kinds of big hit read apart at a glance, by shape and colour:
 * circles in red (a slam, a keg), lines in hatched fire (cannon), and a pale
 * steel arc (the anchor). The sea's warning is blue: wet sand and ripples on
 * the ground it is about to cover.
 */
import type { Palette } from '../art/palette';
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
import { canvasOf, type Standing } from './draw';
import { placeOf, type Dungeon, type Run } from './dungeon';
import { LOOT_PILE, foeKind, foeSprite } from './foes';
import { tileAt } from './ground';
import { propArt, tileGrid } from './grottoArt';
import { CAPTAIN_SAYS } from './grottoWords';
import { picture, type Picture } from '../art/raster';
import type { StageExtra } from './stage';
import type { Box } from './things';
import { rising, type TideNow } from './tide';
import { TILE, type Cell, type Point } from './tileMap';
import type { Room } from './dungeon';

/** How long someone struck shows white. */
export const FLASH_MS = 120;
/** How long a fallen foe stays, blinking, before it is gone. */
export const FALL_MS = 450;
/** How long barred doors take to lift once a room is clear. */
export const DOOR_LIFT_MS = 500;
/** How long a heavy blow's landing shows. */
const LANDED_MS = 300;
/** How long an arrow is in the air, to the eye (it has already landed by the rules). */
const ARROW_MS = 160;
/** A thrown keg is in the air for this part of its warning, then lies burning where it fell. */
const KEG_FLIGHT = 0.4;
/** How high a perched or flying thing is drawn above where it is. */
const PERCH_RISE = 14;
const FLY_RISE = 10;

const FONT = "'HH Digits', 'Pixelify Sans', ui-monospace, monospace";
const WORDS = "'Pixelify Sans', ui-monospace, monospace";

/** A picture's pixels in white: how someone looks for a moment when struck. Made once per picture. */
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

/** A flat ellipse's edge, for the target's mark at its feet. */
function oval(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    ctx.fillRect(Math.round(x0 + Math.cos(t) * rx), Math.round(y0 + Math.sin(t) * ry), 1, 1);
  }
}

/** Whether a pixel is inside an arc's wedge (an angle within half its spread of its facing). */
function inWedge(dx: number, dy: number, facing: number, half: number): boolean {
  const turn = Math.atan2(dy, dx) - facing;
  return Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn))) <= half;
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
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) {
    let run = -1;
    for (let dx = -R; dx <= R + 1; dx++) {
      const d = Math.hypot(dx, dy);
      const inside = dx <= R && d <= r && d >= inner && inWedge(dx, dy, facing, half);
      if (inside && run < 0) run = dx;
      if (!inside && run >= 0) {
        ctx.fillRect(x0 + run, y0 + dy, dx - run, 1);
        run = -1;
      }
    }
  }
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
function drawCircle(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number, p: Palette): void {
  const k = telegraphProgress(t, clock);
  const c = p.colours;
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = c.red3;
  disc(ctx, t.at.x, t.at.y, t.radius);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = c.red1;
  disc(ctx, t.at.x, t.at.y, t.radius * k);
  ctx.globalAlpha = 1;
  const late = t.lands - clock <= 300;
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? c.fire1 : c.fire2;
  ring(ctx, t.at.x, t.at.y, t.radius, 2);
  ctx.fillStyle = c.ink1;
  ring(ctx, t.at.x, t.at.y, t.radius + 1, 1);
}

/**
 * A cannon volley's line: a strip straight down the room, hatched in fire
 * with solid edges, the hatching marching down it, and the shot's shadow
 * growing in the middle as it comes.
 */
function drawLine(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number, p: Palette): void {
  const c = p.colours;
  const k = telegraphProgress(t, clock);
  const x = Math.round(t.at.x - t.radius);
  const w = Math.round(2 * t.radius);
  const top = Math.round(t.at.y);
  const bottom = Math.round(t.bottom ?? t.at.y);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = c.fire3;
  ctx.fillRect(x, top, w, bottom - top);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = c.fire2;
  const shift = Math.floor(clock / 60) % 8;
  for (let y = top - 8 + shift; y < bottom; y += 8) {
    for (let i = 0; i < w; i++) {
      const yy = y + i;
      if (yy >= top && yy < bottom) ctx.fillRect(x + i, yy, 1, 3);
    }
  }
  ctx.globalAlpha = 1;
  const late = t.lands - clock <= 300;
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? c.fire1 : c.fire2;
  ctx.fillRect(x - 1, top, 2, bottom - top);
  ctx.fillRect(x + w - 1, top, 2, bottom - top);
  ctx.fillStyle = c.ink1;
  ctx.fillRect(x - 2, top, 1, bottom - top);
  ctx.fillRect(x + w + 1, top, 1, bottom - top);
  // The shots' shadows, growing along the line as they come down.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = c.ink1;
  for (let y = top + 24; y < bottom - 8; y += 48) disc(ctx, t.at.x, y, 1 + k * (t.radius - 3));
  ctx.globalAlpha = 1;
}

/**
 * The anchor's sweep: a wedge of the ground before him in pale steel, its
 * rim bright, filling round from one side to the other as he swings, so
 * it reads apart from a red circle and from a fiery line.
 */
function drawArc(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number, p: Palette): void {
  const c = p.colours;
  const k = telegraphProgress(t, clock);
  const facing = t.facing ?? 0;
  const half = (t.spread ?? Math.PI) / 2;
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = c.metal1;
  wedge(ctx, t.at.x, t.at.y, t.radius, facing, half);
  // The swing coming round, from one edge of the wedge towards the other.
  const from = facing - half;
  const sweep = 2 * half * k;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = c.white1;
  wedge(ctx, t.at.x, t.at.y, t.radius, from + sweep / 2, sweep / 2);
  ctx.globalAlpha = 1;
  const late = t.lands - clock <= 300;
  ctx.fillStyle = late && Math.floor(clock / 75) % 2 === 0 ? c.white1 : c.metal2;
  wedge(ctx, t.at.x, t.at.y, t.radius, facing, half, t.radius - 2);
  ctx.fillStyle = c.ink1;
  wedge(ctx, t.at.x, t.at.y, t.radius + 1, facing, half, t.radius);
  // The wedge's two straight edges.
  ctx.fillStyle = c.metal2;
  for (const a of [facing - half, facing + half]) {
    for (let r = 4; r < t.radius; r += 1)
      ctx.fillRect(
        Math.round(t.at.x + Math.cos(a) * r),
        Math.round(t.at.y + Math.sin(a) * r),
        1,
        1,
      );
  }
}

function drawMark(ctx: CanvasRenderingContext2D, t: Telegraph, clock: number, p: Palette): void {
  if (t.shape === 'line') drawLine(ctx, t, clock, p);
  else if (t.shape === 'arc') drawArc(ctx, t, clock, p);
  else drawCircle(ctx, t, clock, p);
}

/** The bars of a barred door, lowered by `lifted` of the way. */
function drawDoorBars(
  ctx: CanvasRenderingContext2D,
  at: Point,
  lifted: number,
  barred: HTMLCanvasElement | null,
): void {
  const h = Math.round(TILE * (1 - lifted));
  if (h <= 0 || !barred) return;
  ctx.drawImage(barred, 0, TILE - h, TILE, h, at.x, at.y, TILE, h);
}

/** A number with a dark edge, centred on `x`, so it reads over any ground. */
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  colour: string,
  ink: string,
  font = FONT,
): void {
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = ink;
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
  p: Palette,
): void {
  const c = p.colours;
  ctx.font = `8px ${WORDS}`;
  const w = Math.ceil(ctx.measureText(text).width) + 8;
  const left = Math.round(Math.min(Math.max(4, x - w / 2), width - w - 4));
  const top = Math.round(y - 14);
  ctx.fillStyle = c.ink1;
  ctx.fillRect(left - 1, top - 1, w + 2, 13);
  ctx.fillRect(Math.round(x) - 2, top + 11, 5, 3);
  ctx.fillStyle = c.white1;
  ctx.fillRect(left, top, w, 11);
  ctx.fillRect(Math.round(x) - 1, top + 11, 3, 2);
  ctx.fillStyle = c.ink1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, left + 4, top + 8);
}

function drawEffect(
  ctx: CanvasRenderingContext2D,
  e: Effect,
  clock: number,
  hero: Point,
  p: Palette,
  nudge = 0,
): void {
  const c = p.colours;
  const age = clock - e.from;
  const t = age / EFFECT_MS;
  const rise = Math.round(t * 12);
  ctx.globalAlpha = t > 0.66 ? Math.max(0, (1 - t) * 3) : 1;
  switch (e.kind) {
    case 'hit': {
      const top = e.on === 'hero' ? hero.y - 50 : e.at.y - 10;
      const x = (e.on === 'hero' ? hero.x - 10 : e.at.x) + nudge;
      label(ctx, String(e.amount), x, top - rise, 12, e.on === 'hero' ? c.red1 : c.white1, c.ink1);
      break;
    }
    case 'miss': {
      const top = e.on === 'hero' ? hero.y - 50 : e.at.y - 10;
      const x = (e.on === 'hero' ? hero.x - 10 : e.at.x) + nudge;
      label(ctx, 'miss', x, top - rise, 8, c.metal2, c.ink1);
      break;
    }
    case 'heal':
      label(ctx, `+${e.amount}`, hero.x + 14, hero.y - 50 - rise, 11, c.grass1, c.ink1);
      break;
    case 'empty':
      label(ctx, 'Out of arrows', hero.x, hero.y - 52 - rise, 8, c.sand1, c.ink1);
      break;
    case 'loot':
      ctx.fillStyle = c.gold1;
      for (const [dx, dy] of [
        [0, 0],
        [-4, 3],
        [4, 2],
      ] as const)
        ctx.fillRect(e.at.x + dx, e.at.y - 8 - rise * 2 + dy, 1, 2);
      break;
    case 'shot': {
      if (age > ARROW_MS) break;
      ctx.globalAlpha = 1;
      const k = age / ARROW_MS;
      const from = { x: e.at.x, y: e.at.y - 22 };
      const to = { x: e.to.x, y: e.to.y - 8 };
      const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
      const ux = (to.x - from.x) / len;
      const uy = (to.y - from.y) / len;
      const x = from.x + (to.x - from.x) * k;
      const y = from.y + (to.y - from.y) * k;
      ctx.fillStyle = c.wood1;
      for (let i = 1; i < 7; i++)
        ctx.fillRect(Math.round(x - ux * i), Math.round(y - uy * i), 1, 1);
      ctx.fillStyle = c.metal1;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      break;
    }
    case 'splash': {
      // Washed off: rings of foam spreading where he stood.
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = c.foam1;
      ring(ctx, e.at.x, e.at.y, 4 + t * 14, 1);
      ring(ctx, e.at.x, e.at.y, 2 + t * 8, 1);
      label(ctx, 'splash', e.at.x, e.at.y - 54 - rise, 8, c.foam1, c.ink1, WORDS);
      break;
    }
    case 'released': {
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = c.stone1;
      for (const [dx, dy] of [
        [-6, -2],
        [5, -4],
        [0, 3],
        [-3, 5],
      ] as const)
        ctx.fillRect(Math.round(e.at.x + dx * (1 + t)), Math.round(e.at.y + dy * (1 + t)), 2, 2);
      break;
    }
    default:
      break;
  }
  ctx.globalAlpha = 1;
}

/** A blow landing: the shape flashing, a keg's blast or its hiss, a volley's splashes down its line. */
function drawLanded(
  ctx: CanvasRenderingContext2D,
  e: Extract<Effect, { kind: 'landed' }>,
  clock: number,
  p: Palette,
): void {
  const c = p.colours;
  const age = clock - e.from;
  if (e.doused) {
    // A keg in the water: a puff of steam, and nothing more.
    const k = age / EFFECT_MS;
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.fillStyle = c.smoke1;
    for (const [dx, dy, r] of [
      [0, -4, 3],
      [-4, -7, 2],
      [4, -9, 2],
    ] as const)
      disc(ctx, e.at.x + dx, e.at.y + dy - k * 10, r + k * 2);
    label(ctx, 'fizz', e.at.x, e.at.y - 18 - k * 8, 8, c.smoke1, c.ink1, WORDS);
    ctx.globalAlpha = 1;
    return;
  }
  if (age >= LANDED_MS) return;
  const fade = 1 - age / LANDED_MS;
  const t = e.mark;
  ctx.globalAlpha = 0.7 * fade;
  if (t.shape === 'line') {
    ctx.fillStyle = c.fire1;
    const top = Math.round(t.at.y);
    const bottom = Math.round(t.bottom ?? t.at.y);
    ctx.fillRect(Math.round(t.at.x - t.radius), top, Math.round(2 * t.radius), bottom - top);
    ctx.fillStyle = c.foam1;
    for (let y = top + 24; y < bottom - 8; y += 48) disc(ctx, t.at.x, y, t.radius + 2);
  } else if (t.shape === 'arc') {
    ctx.fillStyle = c.white1;
    wedge(ctx, t.at.x, t.at.y, t.radius, t.facing ?? 0, (t.spread ?? Math.PI) / 2);
  } else {
    ctx.fillStyle = c.fire1;
    disc(ctx, e.at.x, e.at.y, e.radius);
  }
  ctx.globalAlpha = 1;
}

/** Where on the screen a foe is drawn: raised while it perches or flies. */
function riseOf(foe: Foe): number {
  if (!foe.flight) return 0;
  if (foe.flight.mode === 'perch') return PERCH_RISE;
  return foe.flight.mode === 'down' ? 0 : FLY_RISE;
}

/** How tall a foe stands above its feet, as drawn: its tap box or its picture, whichever is taller. */
function standsOf(foe: Foe): number {
  const sprite = foeSprite(foe.monster, 'right');
  return Math.max(foeKind(foe.monster).box.h, sprite.feet.y) + riseOf(foe);
}

/** A foe's health over its head, its blow coming, a parrot's rally on it, and the target's mark. */
function drawFoeOver(
  ctx: CanvasRenderingContext2D,
  battle: Battle,
  foe: Foe,
  targeted: boolean,
  p: Palette,
): void {
  const c = p.colours;
  const def = battle.monsters[foe.monster]!;
  const kind = foeKind(foe.monster);
  const w = Math.max(14, Math.min(36, kind.box.w - 4));
  const x = Math.round(foe.at.x - w / 2);
  const y = Math.round(foe.at.y - standsOf(foe) - 6);
  if (!kind.boss) {
    ctx.fillStyle = c.ink1;
    ctx.fillRect(x - 1, y - 1, w + 2, 5);
    ctx.fillStyle = c.shade1;
    ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = c.red1;
    ctx.fillRect(x, y, Math.ceil((w * foe.hp) / def.hp), 3);
  }
  if (foe.engaged && !foe.heavy) {
    // The next ordinary blow, filling; it turns hot just before it falls.
    const k = Math.min(1, Math.max(0, 1 - foe.blowMs / def.speedMs));
    ctx.fillStyle = c.ink1;
    ctx.fillRect(x - 1, y + 4, w + 2, 3);
    ctx.fillStyle = foe.blowMs <= 500 ? c.fire1 : c.metal2;
    ctx.fillRect(x, y + 5, Math.round(w * k), 1);
  }
  if (foe.rallied) {
    // Egged on by the parrot: two green chevrons, flickering, beside the bar.
    const on = Math.floor(battle.clock / 200) % 2 === 0;
    ctx.fillStyle = c.ink1;
    ctx.fillRect(x + w + 2, y - 3, 7, 8);
    ctx.fillStyle = on ? c.grass1 : c.pine1;
    for (const dx of [0, 3]) {
      ctx.fillRect(x + w + 3 + dx, y - 2, 1, 1);
      ctx.fillRect(x + w + 4 + dx, y - 1, 1, 1);
      ctx.fillRect(x + w + 5 + dx, y, 1, 1);
      ctx.fillRect(x + w + 4 + dx, y + 1, 1, 1);
      ctx.fillRect(x + w + 3 + dx, y + 2, 1, 1);
    }
  }
  if (foe.heavy) {
    // Winding up something big.
    const blink = Math.floor(battle.clock / 120) % 2 === 0;
    label(ctx, '!', foe.at.x, y - 2, 12, blink ? c.fire1 : c.fire2, c.ink1);
  } else if (targeted) {
    const tx = Math.round(foe.at.x);
    const ty = y - 4;
    ctx.fillStyle = c.ink1;
    ctx.fillRect(tx - 4, ty - 4, 9, 2);
    ctx.fillRect(tx - 3, ty - 2, 7, 2);
    ctx.fillRect(tx - 2, ty, 5, 2);
    ctx.fillStyle = c.gold1;
    ctx.fillRect(tx - 3, ty - 3, 7, 1);
    ctx.fillRect(tx - 2, ty - 1, 5, 1);
    ctx.fillRect(tx - 1, ty + 1, 3, 1);
  }
}

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
function drawRipples(
  ctx: CanvasRenderingContext2D,
  cells: readonly Cell[],
  clock: number,
  p: Palette,
): void {
  const c = p.colours;
  const phase = Math.floor(clock / 160);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = c.foam1;
  for (const cell of cells) {
    const x = cell.col * TILE;
    const y = cell.row * TILE;
    for (let i = 0; i < 2; i++) {
      const row = (((cell.col * 5 + cell.row * 3 + i * 7 + phase) % 6) + 6) % 6;
      const at = ((cell.col * 11 + i * 5 + phase * 2) % 12) + 1;
      ctx.fillRect(x + at, y + 2 + row * 2 + i * 3, 4, 1);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Where the fight draws this frame, generously: each foe with its health,
 * marks and numbers above it, the hero's head and what floats over it, every
 * mark and what is in flight to it, the sea's ripples, loot, and doors and
 * cells while they open. The stage draws these again each frame instead of
 * the whole view.
 */
function fightBoxes(
  battle: Battle,
  run: Run,
  hero: Point,
  here: readonly Foe[],
  doors: readonly Point[],
  ripples: readonly Cell[],
  bars: readonly Box[],
): Box[] {
  const boxes: Box[] = [];
  for (const foe of here) {
    const tall = standsOf(foe);
    const wide = Math.max(
      53,
      foeKind(foe.monster).box.w + 12,
      foeSprite(foe.monster, 'right').picture.grid.w + 8,
    );
    boxes.push({
      x: Math.floor(foe.at.x - wide / 2),
      y: Math.floor(foe.at.y) - tall - 44,
      w: wide + 12,
      h: tall + 50,
    });
    const t = foe.heavy;
    if (t) {
      boxes.push(markBox(t));
      if (t.origin) {
        const x = Math.floor(Math.min(t.origin.x, t.at.x)) - 6;
        const y = Math.floor(Math.min(t.origin.y, t.at.y)) - 64;
        boxes.push({
          x,
          y,
          w: Math.ceil(Math.abs(t.origin.x - t.at.x)) + 13,
          h: Math.ceil(Math.abs(t.origin.y - t.at.y)) + 74,
        });
      }
    }
    if (foeKind(foe.monster).rally) boxes.push(around({ x: foe.at.x, y: foe.at.y - 8 }, 30));
  }
  for (const t of battle.volleys) boxes.push(markBox(t));
  // The hero's numbers, heals and brace, over his head.
  boxes.push({ x: Math.floor(hero.x) - 34, y: Math.floor(hero.y) - 78, w: 69, h: 30 });
  for (const e of battle.effects) {
    if (e.kind === 'landed')
      boxes.push(
        e.doused
          ? { x: Math.floor(e.at.x) - 24, y: Math.floor(e.at.y) - 36, w: 49, h: 44 }
          : markBox(e.mark),
      );
    else if (e.kind === 'swing') boxes.push(around(e.at, e.radius + 2));
    else if (e.kind === 'splash')
      boxes.push({ x: Math.floor(e.at.x) - 24, y: Math.floor(e.at.y) - 72, w: 49, h: 96 });
    else if (e.kind === 'released') boxes.push(around(e.at, 22));
    else if (e.kind === 'shot') {
      const x = Math.floor(Math.min(e.at.x, e.to.x)) - 12;
      const y = Math.floor(Math.min(e.at.y - 22, e.to.y - 8)) - 12;
      boxes.push({
        x,
        y,
        w: Math.ceil(Math.abs(e.at.x - e.to.x)) + 25,
        h: Math.ceil(Math.abs(e.at.y - 22 - e.to.y + 8)) + 25,
      });
    } else if (e.kind === 'loot')
      boxes.push({ x: Math.floor(e.at.x) - 6, y: Math.floor(e.at.y) - 34, w: 13, h: 36 });
    else if (e.kind === 'hit' || e.kind === 'miss') {
      if (e.on === 'foe')
        boxes.push({ x: Math.floor(e.at.x) - 26, y: Math.floor(e.at.y) - 40, w: 53, h: 42 });
    } else if (e.kind === 'say') {
      const who = battle.foes.find((f) => f.key === e.who);
      if (who)
        boxes.push({
          x: Math.floor(who.at.x) - 110,
          y: Math.floor(who.at.y) - standsOf(who) - 40,
          w: 220,
          h: 34,
        });
    }
  }
  for (const p of battle.piles) {
    if (p.room === run.room)
      boxes.push({ x: Math.floor(p.at.x) - 7, y: Math.floor(p.at.y) - 11, w: 14, h: 12 });
  }
  for (const door of doors) boxes.push({ x: door.x, y: door.y, w: TILE, h: TILE });
  for (const cell of ripples)
    boxes.push({ x: cell.col * TILE, y: cell.row * TILE, w: TILE, h: TILE });
  boxes.push(...bars);
  return boxes;
}

/** A barred door's tile, from the art lane or this scene, as a canvas in the palette. */
function barredDoor(p: Palette): HTMLCanvasElement | null {
  return canvasOf(barredPicture, p);
}
const barredPicture: Picture = picture(tileGrid('door_barred'));

/**
 * Everything a run's fight adds to the stage this frame. `hero` is where the
 * walker's feet are.
 */
export function fightExtra(dungeon: Dungeon, run: Run, palette: Palette): StageExtra {
  const battle = run.battle;
  if (!battle) return { actors: [], boxes: [] };
  const c = palette.colours;
  const clock = battle.clock;
  const hero = run.play.walker.at;
  const room = dungeon.rooms[run.room]!;
  const place = placeOf(dungeon, run);
  const here = battle.foes.filter(
    (f) => f.room === run.room && !f.fled && (alive(f) || clock - f.diedAt! < FALL_MS),
  );
  const actors: Standing[] = [];
  for (const foe of here) {
    // A fallen foe blinks out.
    if (!alive(foe) && Math.floor((clock - foe.diedAt!) / 75) % 2 === 1) continue;
    const fig = foeSprite(foe.monster, foe.facing);
    let image = canvasOf(fig.picture, palette);
    if (!image) continue;
    if (flashing(foe.struckAt, clock)) image = flashOf(image, c.white1);
    else if (foe.heavy && Math.floor(clock / 120) % 2 === 0) image = flashOf(image, c.fire1);
    const fx = Math.round(foe.at.x);
    const fy = Math.round(foe.at.y);
    const rise = riseOf(foe);
    // A perched or flying thing sorts by the ground below it, but is drawn up in the air.
    actors.push({
      image,
      x: fx - fig.feet.x,
      y: fy - fig.feet.y - rise,
      base: fy + (rise > 0 ? 2 : 0),
    });
  }
  // A cell's bars stand in the room until the cell opens, in front of whoever waits behind them.
  const barsArt = propArt('brig_bars');
  const barsImage = barsArt && canvasOf(barsArt.picture, palette);
  const released = battle.released[run.room] ?? 0;
  const barBoxes: Box[] = [];
  room.ground.bars.forEach((cells, wave) => {
    if (wave < released || !barsImage || !barsArt) return;
    for (const cell of cells) {
      const x = cell.col * TILE + TILE / 2 - Math.floor(barsArt.picture.grid.w / 2);
      const foot = cell.row * TILE + TILE - 1;
      actors.push({ image: barsImage, x, y: foot - barsArt.base, base: foot });
      barBoxes.push({ x, y: foot - barsArt.base, w: barsImage.width, h: barsImage.height });
    }
  });
  const pile = canvasOf(LOOT_PILE.picture, palette);
  const locked = roomLocked(battle, run.room);
  const openedAt = battle.opened[run.room];
  const lifted = locked ? 0 : openedAt === undefined ? 1 : (clock - openedAt) / DOOR_LIFT_MS;
  const lifting = lifted < 1 && !locked;
  const doorsAt = room.doors.map((d) => ({ x: d.cell.col * TILE, y: d.cell.row * TILE }));
  const tide: TideNow = tideOf(battle, place);
  const ripples = rising(tide, clock) ? aboutToFlood(room, tide.level) : [];
  const boxes = fightBoxes(battle, run, hero, here, lifting ? doorsAt : [], ripples, barBoxes);
  const viewWidth = room.map.cols * TILE;

  return {
    actors,
    boxes,
    walker: (image) => {
      if (flashing(battle.struckAt, clock)) return flashOf(image, c.white1);
      // Down: he blinks red until the tide takes him.
      if (battle.over?.why === 'fell' && Math.floor(clock / 150) % 2 === 1)
        return flashOf(image, c.red2);
      return image;
    },
    ground(ctx) {
      if (ripples.length > 0) drawRipples(ctx, ripples, clock, palette);
      // Barred doors, lifting when the room is clear.
      if (lifted < 1) {
        const barred = barredDoor(palette);
        for (const at of doorsAt) drawDoorBars(ctx, at, lifted, barred);
      }
      for (const p of battle.piles) {
        if (p.room !== run.room || !pile) continue;
        const bobbed = Math.floor(clock / 400) % 2;
        ctx.drawImage(
          pile,
          Math.round(p.at.x) - LOOT_PILE.feet.x,
          Math.round(p.at.y) - LOOT_PILE.feet.y - bobbed,
        );
      }
      for (const foe of here) {
        if (!alive(foe) || held(battle, place, foe)) continue;
        const kind = foeKind(foe.monster);
        const rx = Math.round(kind.box.w / 2);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = c.ink1;
        ctx.fillRect(Math.round(foe.at.x) - rx + 2, Math.round(foe.at.y) - 1, 2 * rx - 3, 3);
        ctx.globalAlpha = 1;
        if (foe.key === battle.target) {
          ctx.fillStyle = c.gold1;
          oval(ctx, foe.at.x, foe.at.y, rx + 2, 4);
        }
      }
      for (const foe of here)
        if (foe.heavy && foe.heavy.shape !== 'circle') drawMark(ctx, foe.heavy, clock, palette);
      for (const t of battle.volleys) drawMark(ctx, t, clock, palette);
      for (const foe of here)
        if (foe.heavy?.shape === 'circle') drawMark(ctx, foe.heavy, clock, palette);
      for (const e of battle.effects) {
        if (e.kind === 'landed') drawLanded(ctx, e, clock, palette);
        const age = clock - e.from;
        if (e.kind === 'swing' && age < 300) {
          // The blade's sweep, out to its full reach, fading.
          ctx.globalAlpha = 1 - age / 300;
          ctx.fillStyle = c.ink1;
          ring(ctx, e.at.x, e.at.y, e.radius + 1, 4);
          ctx.fillStyle = c.white1;
          ring(ctx, e.at.x, e.at.y, e.radius, 2);
          ctx.globalAlpha = 1;
        }
      }
      // The parrot, egging the crew on: a squawk spreading from it.
      for (const foe of here) {
        if (!alive(foe) || !foe.aware || !foeKind(foe.monster).rally) continue;
        if (!here.some((f) => alive(f) && f.rallied)) continue;
        const k = (clock % 700) / 700;
        ctx.globalAlpha = 0.8 * (1 - k);
        ctx.fillStyle = c.grass1;
        ring(ctx, foe.at.x, foe.at.y - riseOf(foe) - 8, 6 + k * 22, 1);
        ctx.globalAlpha = 1;
      }
    },
    over(ctx) {
      for (const foe of here)
        if (alive(foe) && !held(battle, place, foe))
          drawFoeOver(ctx, battle, foe, foe.key === battle.target, palette);
      // Things thrown, in their arc from the thrower to the mark; a keg lies burning once it lands.
      for (const foe of here) {
        const t = foe.heavy;
        if (!t?.origin) continue;
        const k = telegraphProgress(t, clock);
        const keg = !!t.douse;
        const f = keg ? Math.min(1, k / KEG_FLIGHT) : k;
        const x = Math.round(t.origin.x + (t.at.x - t.origin.x) * f);
        const y = Math.round(
          t.origin.y - 20 + (t.at.y - t.origin.y + 20) * f - Math.sin(Math.PI * f) * 36,
        );
        if (keg) {
          ctx.fillStyle = c.ink1;
          ctx.fillRect(x - 4, y - 7, 9, 9);
          ctx.fillStyle = c.wood2;
          ctx.fillRect(x - 3, y - 6, 7, 7);
          ctx.fillStyle = c.metal3;
          ctx.fillRect(x - 3, y - 4, 7, 1);
          ctx.fillRect(x - 3, y - 1, 7, 1);
          // The fuse, burning down: a spark that flickers faster as it goes.
          const spark = Math.floor(clock / (k > 0.75 ? 50 : 110)) % 2 === 0;
          ctx.fillStyle = spark ? c.fire1 : c.fire2;
          ctx.fillRect(x + 1, y - 9, 2, 2);
        } else {
          ctx.fillStyle = c.ink1;
          ctx.fillRect(x - 2, y - 3, 5, 7);
          ctx.fillStyle = c.pine2;
          ctx.fillRect(x - 1, y - 1, 3, 4);
          ctx.fillStyle = c.sand1;
          ctx.fillRect(x, y - 2, 1, 1);
        }
      }
      if (battle.braceUntil > clock) {
        // Braced: a small shield over his head.
        const x = Math.round(hero.x);
        const y = Math.round(hero.y) - 56;
        ctx.fillStyle = c.ink1;
        ctx.fillRect(x - 4, y - 1, 9, 8);
        ctx.fillStyle = c.metal2;
        ctx.fillRect(x - 3, y, 7, 5);
        ctx.fillRect(x - 2, y + 5, 5, 1);
        ctx.fillStyle = c.gold1;
        ctx.fillRect(x, y, 1, 6);
      }
      // Numbers landing together on one spot (a double shot) stand side by side.
      const together = new Map<string, number>();
      for (const e of battle.effects) {
        let nudge = 0;
        if (e.kind === 'hit' || e.kind === 'miss') {
          const key = `${e.from} ${e.on} ${Math.round(e.at.x)}`;
          nudge = together.get(key) ?? 0;
          together.set(key, nudge + 1);
        }
        drawEffect(ctx, e, clock, hero, palette, nudge * 9);
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
          who.at.y - standsOf(who) - 10,
          viewWidth,
          palette,
        );
      }
    },
  };
}
