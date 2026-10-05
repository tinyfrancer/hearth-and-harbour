/*
 * A dungeon fight on the canvas: the monsters' placeholder figures, the
 * marked ground of a heavy attack, loot on the floor, barred doors, and over
 * everyone their health, the target's mark, numbers that float up and things
 * in flight. Everything here is read from the run (`battle.ts` decides it
 * all); this only puts pixels where it says, in whole art pixels and in the
 * palette's colours.
 */
import type { Palette } from '../art/palette';
import {
  EFFECT_MS,
  alive,
  roomLocked,
  type Battle,
  type Effect,
  type Foe,
  type Telegraph,
} from './battle';
import { canvasOf, type Standing } from './draw';
import type { Dungeon, Run } from './dungeon';
import { LOOT_PILE, foeFigure, foeKind } from './foes';
import type { StageExtra } from './stage';
import { TILE, type Point } from './tileMap';

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

const FONT = "'HH Digits', 'Pixelify Sans', ui-monospace, monospace";

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

/** How far through its warning a heavy attack is, 0 to 1. */
export function telegraphProgress(t: Telegraph, clock: number): number {
  return Math.min(1, Math.max(0, (clock - t.from) / (t.lands - t.from)));
}

/**
 * A heavy attack's mark: the whole circle faintly, its edge solid from the
 * start so where it will land is never in doubt, and a fill growing from the
 * middle that reaches the edge as it lands. The edge brightens at the end.
 */
function drawTelegraph(
  ctx: CanvasRenderingContext2D,
  t: Telegraph,
  clock: number,
  p: Palette,
): void {
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

function drawDoorBars(ctx: CanvasRenderingContext2D, at: Point, lifted: number, p: Palette): void {
  const h = Math.round(TILE * (1 - lifted));
  if (h <= 0) return;
  const c = p.colours;
  ctx.fillStyle = c.ink1;
  for (const x of [2, 7, 12]) ctx.fillRect(at.x + x - 1, at.y, 4, h);
  ctx.fillStyle = c.wood2;
  for (const x of [2, 7, 12]) ctx.fillRect(at.x + x, at.y, 2, h);
  if (h > 6) {
    ctx.fillStyle = c.wood3;
    ctx.fillRect(at.x + 1, at.y + Math.min(5, h - 2), TILE - 2, 2);
  }
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
): void {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

function drawEffect(
  ctx: CanvasRenderingContext2D,
  e: Effect,
  clock: number,
  hero: Point,
  p: Palette,
): void {
  const c = p.colours;
  const age = clock - e.from;
  const t = age / EFFECT_MS;
  const rise = Math.round(t * 12);
  ctx.globalAlpha = t > 0.66 ? Math.max(0, (1 - t) * 3) : 1;
  switch (e.kind) {
    case 'hit': {
      const top = e.on === 'hero' ? hero.y - 50 : e.at.y - 10;
      const x = e.on === 'hero' ? hero.x : e.at.x;
      label(ctx, String(e.amount), x, top - rise, 11, e.on === 'hero' ? c.red1 : c.white1, c.ink1);
      break;
    }
    case 'miss': {
      const top = e.on === 'hero' ? hero.y - 50 : e.at.y - 10;
      const x = e.on === 'hero' ? hero.x : e.at.x;
      label(ctx, 'miss', x, top - rise, 8, c.metal2, c.ink1);
      break;
    }
    case 'heal':
      label(ctx, `+${e.amount}`, hero.x, hero.y - 50 - rise, 11, c.grass1, c.ink1);
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
    default:
      break;
  }
  ctx.globalAlpha = 1;
}

/** A foe's health over its head, its blow coming, and the target's mark. */
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
  const w = Math.max(14, kind.box.w - 4);
  const x = Math.round(foe.at.x - w / 2);
  const y = Math.round(foe.at.y - kind.box.h - 6);
  ctx.fillStyle = c.ink1;
  ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = c.shade1;
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = c.red1;
  ctx.fillRect(x, y, Math.ceil((w * foe.hp) / def.hp), 3);
  if (foe.engaged && !foe.heavy) {
    // The next ordinary blow, filling; it turns hot just before it falls.
    const k = Math.min(1, Math.max(0, 1 - foe.blowMs / def.speedMs));
    ctx.fillStyle = c.ink1;
    ctx.fillRect(x - 1, y + 4, w + 2, 3);
    ctx.fillStyle = foe.blowMs <= 500 ? c.fire1 : c.metal2;
    ctx.fillRect(x, y + 5, Math.round(w * k), 1);
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

/**
 * Everything a run's fight adds to the stage this frame. `hero` is where the
 * walker's feet are.
 */
export function fightExtra(dungeon: Dungeon, run: Run, palette: Palette): StageExtra {
  const battle = run.battle;
  if (!battle) return { actors: [] };
  const c = palette.colours;
  const clock = battle.clock;
  const hero = run.play.walker.at;
  const room = dungeon.rooms[run.room]!;
  const here = battle.foes.filter(
    (f) => f.room === run.room && (alive(f) || clock - f.diedAt! < FALL_MS),
  );
  const actors: Standing[] = [];
  for (const foe of here) {
    // A fallen foe blinks out.
    if (!alive(foe) && Math.floor((clock - foe.diedAt!) / 75) % 2 === 1) continue;
    const kind = foeKind(foe.monster);
    const fig = foeFigure(kind.look, foe.facing);
    let image = canvasOf(fig.picture, palette);
    if (!image) continue;
    if (flashing(foe.struckAt, clock)) image = flashOf(image, c.white1);
    else if (foe.heavy && Math.floor(clock / 120) % 2 === 0) image = flashOf(image, c.fire1);
    const fx = Math.round(foe.at.x);
    const fy = Math.round(foe.at.y);
    actors.push({ image, x: fx - fig.feet.x, y: fy - fig.feet.y, base: fy });
  }
  const pile = canvasOf(LOOT_PILE.picture, palette);
  const locked = roomLocked(battle, run.room);
  const openedAt = battle.opened[run.room];

  return {
    actors,
    walker: (image) => (flashing(battle.struckAt, clock) ? flashOf(image, c.white1) : image),
    ground(ctx) {
      // Barred doors, lifting when the room is clear.
      const lifted = locked ? 0 : openedAt === undefined ? 1 : (clock - openedAt) / DOOR_LIFT_MS;
      if (lifted < 1) {
        for (const door of room.doors)
          drawDoorBars(ctx, { x: door.cell.col * TILE, y: door.cell.row * TILE }, lifted, palette);
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
        if (!alive(foe)) continue;
        const kind = foeKind(foe.monster);
        ctx.fillStyle = c.sand3;
        const rx = Math.round(kind.box.w / 2);
        ctx.fillRect(Math.round(foe.at.x) - rx + 2, Math.round(foe.at.y) - 1, 2 * rx - 3, 3);
        if (foe.key === battle.target) {
          ctx.fillStyle = c.gold1;
          oval(ctx, foe.at.x, foe.at.y, rx + 2, 4);
        }
      }
      for (const foe of here) if (foe.heavy) drawTelegraph(ctx, foe.heavy, clock, palette);
      for (const e of battle.effects) {
        const age = clock - e.from;
        if (e.kind === 'landed' && age < LANDED_MS) {
          ctx.globalAlpha = 0.7 * (1 - age / LANDED_MS);
          ctx.fillStyle = c.fire1;
          disc(ctx, e.at.x, e.at.y, e.radius);
          ctx.globalAlpha = 1;
        }
        if (e.kind === 'swing' && age < 250) {
          ctx.globalAlpha = 1 - age / 250;
          ctx.fillStyle = c.metal1;
          ring(ctx, e.at.x, e.at.y - 4, e.radius, 2);
          ctx.globalAlpha = 1;
        }
      }
    },
    over(ctx) {
      for (const foe of here)
        if (alive(foe)) drawFoeOver(ctx, battle, foe, foe.key === battle.target, palette);
      // Things thrown, in their arc from the thrower to the mark.
      for (const foe of here) {
        const t = foe.heavy;
        if (!t?.origin) continue;
        const k = telegraphProgress(t, clock);
        const x = Math.round(t.origin.x + (t.at.x - t.origin.x) * k);
        const y = Math.round(
          t.origin.y - 20 + (t.at.y - t.origin.y + 20) * k - Math.sin(Math.PI * k) * 36,
        );
        ctx.fillStyle = c.ink1;
        ctx.fillRect(x - 2, y - 3, 5, 7);
        ctx.fillStyle = c.pine2;
        ctx.fillRect(x - 1, y - 1, 3, 4);
        ctx.fillStyle = c.sand1;
        ctx.fillRect(x, y - 2, 1, 1);
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
      for (const e of battle.effects) drawEffect(ctx, e, clock, hero, palette);
    },
  };
}
