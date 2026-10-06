/*
 * How the C-scale town looks on the stage: the art lane's ground and pieces
 * (`src/art/town2/`) made into one still picture of the whole town, the
 * townsfolk and the hero from the figure adapter (`figures2.ts`), and the
 * town's life (chimney smoke, gulls, shore foam). Nothing here draws a
 * building or a person; it puts the art lane's cells on canvases and moves
 * them about.
 *
 * Memory, the reason this does not use the stage's own still-maker: the
 * town is 1440 x 2136 art pixels, 12.3 MB a canvas. One still is kept, for
 * one time of day: the ground's pixels put straight onto it and every
 * standing piece drawn on top in depth order; the pieces' own canvases (4 to
 * 5 MB) are kept for drawing them again in front of the hero. Changing the
 * time of day makes the other still, then lets the first go. The townsfolk
 * are not in the still, so their turning to look at the hero never
 * recomposes it.
 *
 * Time: the ground's pixels are painted by a worker (`town2Worker.ts`) where
 * the browser has one, so the page never stops for the seconds composing
 * takes on a slow phone. Until the first still arrives the scene shows its
 * backdrop; on a change of time of day the old still stays up until the new
 * one is ready, and everything drawn with it (the hero, the townsfolk, the
 * smoke) follows the still's time, not the button's, so they always match.
 *
 * A frame allocates nothing here: every picture, every placed sprite and
 * every list handed to the stage is made once and reused.
 */
import type { Palette } from '../art/palette';
import { cell, tgrid, type Picture2 } from '../art/town2/cells';
import { town2Piece, type Town2Id } from '../art/town2/pieces';
import { groundAt, town2Layout, TOWN2_H, TOWN2_W, type Placement2 } from '../art/town2/town';
import type { Mat } from '../art/town2/ramps';
import type { GameState } from '../core/state';
import type { TimeOfDay } from './daylight';
import type { Placed, Standing } from './draw';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_H,
  FIGURE2_SOLE_Y,
  FIGURE2_W,
  heroFigure2,
  townsfolkFigure2,
  type Figure2,
} from './figures2';
import { dressKey, dressOf } from './hero';
import { turnedTo, type Facing } from './play';
import type { Life, StillPicture } from './stage';
import type { Point } from './tileMap';
import { feetOf, NOTICE2, TOWNSFOLK2_AT } from './town2';
import {
  cellPixels,
  glowsIn,
  groundPixels,
  palette2,
  SMOKE_FRAMES,
  smokeFrame,
  townLights,
  type Ground2Pixels,
} from './town2Paint';

/** Where a figure's feet are in its canvas, facing right: the stage's `heroFeet`. */
export const FIGURE2_FEET: Point = { x: FIGURE2_ANCHOR_X, y: FIGURE2_SOLE_Y };

/** How long each frame of smoke and of the foam shows. */
export const SMOKE_FRAME_MS = 450;
export const FOAM_FRAME_MS = 1100;

/** Whether pixels can be made here at all: not in tests, where there is no canvas. */
const canPaint = (): boolean => typeof ImageData !== 'undefined' && typeof document !== 'undefined';

/** Pixels on a new canvas of their size; null where the browser will not draw. */
function canvasOf(data: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
  return canvas;
}

/** A picture of cells on a canvas at one pixel per art pixel, lit by its glows. */
export function paintCells(pic: Picture2, time: TimeOfDay): HTMLCanvasElement | null {
  return canvasOf(cellPixels(pic, palette2(time)), pic.grid.w, pic.grid.h);
}

/** Lets a canvas's pixels go now rather than whenever it is collected (Safari holds them otherwise). */
function release(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

/** One time of day's still, the moved foam, and every canvas made for them. */
interface Made {
  readonly time: TimeOfDay;
  readonly still: StillPicture;
  readonly foam: Placed | null;
  readonly canvases: HTMLCanvasElement[];
}

/**
 * The town composed for one time of day from its pixels: the ground, then
 * every standing piece drawn on it in depth order. Only copying here; the
 * colouring and lighting was done where the pixels were painted.
 */
function compose(px: Ground2Pixels): Made | null {
  const still = canvasOf(px.ground, TOWN2_W, TOWN2_H);
  const ctx = still?.getContext('2d');
  if (!still || !ctx) return null;
  const canvases: HTMLCanvasElement[] = [still];
  const images = px.pieces.map((p) => {
    const image = canvasOf(p.data, p.w, p.h);
    if (image) canvases.push(image);
    return image;
  });
  const standing: Standing[] = [];
  for (const s of px.standing) {
    const image = images[s.piece];
    if (!image) continue;
    ctx.drawImage(image, s.x, s.y);
    standing.push({ image, x: s.x, y: s.y, base: s.base });
  }
  const { band, data } = px.foam;
  const foamImage = canvasOf(data, band.w, band.h);
  if (foamImage) canvases.push(foamImage);
  return {
    time: px.time,
    still: { still, standing },
    foam: foamImage && { image: foamImage, x: band.x, y: band.y },
    canvases,
  };
}

/* ----- The hero ----- */

/** How finely the hero's light follows him, in art pixels: one lit picture per step of this. */
const LIGHT_STEP = 6;
/** Lit pictures of the hero kept at once; the oldest goes first. */
const LIT_KEPT = 48;

/**
 * The hero at the C scale: his figure in the player's look and gear from
 * the adapter, kept until he changes, and lit at dusk by the lights near
 * him, each lit picture made once for a place and kept a while.
 */
export class Hero2 {
  private look: GameState['look'] | null = null;
  private equipment: GameState['equipment'] | null = null;
  private key = '';
  private figure: Figure2 | null = null;
  private readonly plain = new Map<string, HTMLCanvasElement | null>();
  private readonly lit = new Map<string, HTMLCanvasElement | null>();
  /** How many times he has been drawn afresh, for tests. */
  drawn = 0;

  /** Takes the state's look and gear; true if he now looks different. */
  wear(state: GameState): boolean {
    if (state.look === this.look && state.equipment === this.equipment) return false;
    this.look = state.look;
    this.equipment = state.equipment;
    const dress = dressOf(state);
    const key = dressKey(dress);
    if (key === this.key) return false;
    this.key = key;
    this.figure = heroFigure2(dress.look, dress.worn);
    this.drawn += 1;
    this.forget();
    return true;
  }

  /** The figure he is drawn from now. */
  get dressedAs(): Figure2 | null {
    return this.figure;
  }

  /** Lets every picture of him go. */
  forget(): void {
    for (const c of [...this.plain.values(), ...this.lit.values()]) if (c) release(c);
    this.plain.clear();
    this.lit.clear();
    this.last.x = NaN;
  }

  /** The last answer, to give again while he stands in the same light: most frames. */
  private readonly last = {
    x: NaN,
    y: NaN,
    facing: 'right' as Facing,
    time: 'day' as TimeOfDay,
    image: null as HTMLCanvasElement | null,
  };

  /** He as he stands with his feet at `feet`, facing either way, at this time of day. */
  at(feet: Point, facing: Facing, time: TimeOfDay): HTMLCanvasElement | null {
    const qx = Math.round(feet.x / LIGHT_STEP);
    const qy = Math.round(feet.y / LIGHT_STEP);
    const last = this.last;
    if (last.x === qx && last.y === qy && last.facing === facing && last.time === time)
      return last.image;
    const image = this.find(qx * LIGHT_STEP, qy * LIGHT_STEP, facing, time);
    last.x = qx;
    last.y = qy;
    last.facing = facing;
    last.time = time;
    last.image = image;
    return image;
  }

  private find(x: number, y: number, facing: Facing, time: TimeOfDay): HTMLCanvasElement | null {
    if (!this.figure) return null;
    const plainKey = `${facing} ${time}`;
    if (!this.plain.has(plainKey)) this.plain.set(plainKey, this.figure.paint(facing, time, []));
    const plain = this.plain.get(plainKey)!;
    if (time === 'day') return plain;
    const key = `${plainKey} ${x} ${y}`;
    const kept = this.lit.get(key);
    if (kept !== undefined) return kept ?? plain;
    const ax = facing === 'left' ? FIGURE2_W - 1 - FIGURE2_ANCHOR_X : FIGURE2_ANCHOR_X;
    const box = { x: x - ax, y: y - FIGURE2_SOLE_Y, w: FIGURE2_W, h: FIGURE2_H };
    const local = glowsIn(townLights(), box, palette2(time));
    const made = local.length ? this.figure.paint(facing, time, local) : null;
    if (this.lit.size >= LIT_KEPT) {
      const oldest = this.lit.keys().next().value!;
      const c = this.lit.get(oldest);
      if (c) release(c);
      this.lit.delete(oldest);
    }
    this.lit.set(key, made);
    return made ?? plain;
  }
}

/* ----- Putting it together ----- */

/** Everything the stage needs to draw the C-scale town, beside the hero. */
export interface Town2Art {
  still(palette: Palette): StillPicture | null;
  standers(palette: Palette, walker: Point): readonly Standing[];
  shadowAt(
    feet: Point,
    palette: Palette,
  ): { readonly picture: HTMLCanvasElement; readonly middle: Point } | null;
  readonly life: readonly Life[];
  /** The time of day whose still is held, if any: what everything drawn with it follows. */
  held(): TimeOfDay | null;
  /** Lets every picture go. */
  forget(): void;
}

/** The size of the hero's shadow, and the point of it under his feet. */
const SHADOW_RX = 13;
const SHADOW_RY = 3.6;
const SHADOW_MIDDLE: Point = { x: 14, y: 4 };

/** What the hero's shadow falls on, by the ground's kind, and in which step: a shade under the ground's own. */
const SHADOW_ON: Readonly<Partial<Record<ReturnType<typeof groundAt>, Mat>>> = {
  grass: 'grass',
  forest: 'grass',
  road: 'dirt',
  cobble: 'cobble',
  sand: 'sand',
  pier: 'wood',
  quay: 'stone',
};
const SHADOW_STEP = 4;

/** A gull's lazy loop: centre, half-width and half-height, a lap's length and where it starts. */
interface GullLoop {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly lapMs: number;
  readonly start: number;
  readonly turn: 1 | -1;
}

/** Each gull the art lane placed circles where it was placed. */
export function gullLoop(p: Placement2, i: number): GullLoop {
  const piece = town2Piece(p.id);
  return {
    x: p.x + Math.round(piece.w / 2),
    y: p.y + Math.round(piece.h / 2),
    rx: 70 - i * 8,
    ry: 20 - i * 2,
    lapMs: 26000 + i * 5000,
    start: [0.1, 0.6, 0.3][i % 3]!,
    turn: i % 2 ? -1 : 1,
  };
}

export interface Town2ArtOptions {
  /**
   * Paints the ground off the main thread. By default a worker where the
   * browser has them; without one, on the spot.
   */
  readonly paint?: (time: TimeOfDay, done: (px: Ground2Pixels) => void) => void;
}

/** A worker per time of day asked for, let go once it answers. Falls back to painting on the spot. */
function workerPaint(time: TimeOfDay, done: (px: Ground2Pixels) => void): void {
  let worker: Worker;
  try {
    worker = new Worker(new URL('./town2Worker.ts', import.meta.url), { type: 'module' });
  } catch {
    done(groundPixels(time));
    return;
  }
  worker.onmessage = (event: MessageEvent<Ground2Pixels>) => {
    worker.terminate();
    done(event.data);
  };
  worker.onerror = () => {
    worker.terminate();
    done(groundPixels(time));
  };
  worker.postMessage(time);
}

const onTheSpot = (time: TimeOfDay, done: (px: Ground2Pixels) => void): void =>
  done(groundPixels(time));

export function town2Art(options: Town2ArtOptions = {}): Town2Art {
  const paint = options.paint ?? (typeof Worker === 'function' ? workerPaint : onTheSpot);
  let made: Made | null = null;
  /** The time of day being painted, if any. */
  let pending: TimeOfDay | null = null;
  /** Small pictures for the held time of day: shadows, smoke, gulls, the townsfolk. */
  let small: HTMLCanvasElement[] = [];
  const shadows = new Map<string, { picture: HTMLCanvasElement; middle: Point } | null>();
  let smokeFrames = new Map<Town2Id, (HTMLCanvasElement | null)[]>();
  let gullImages: { right: HTMLCanvasElement | null; left: HTMLCanvasElement | null } | null = null;
  let folk: { right: Standing | null; left: Standing | null }[] | null = null;
  const folkShown: Standing[] = [];
  const folkFeet = TOWNSFOLK2_AT.map(feetOf);

  const dropSmall = (): void => {
    for (const c of small) release(c);
    small = [];
    shadows.clear();
    smokeFrames = new Map();
    gullImages = null;
    folk = null;
    folkShown.length = 0;
  };

  const forget = (): void => {
    if (made) for (const c of made.canvases) release(c);
    made = null;
    pending = null;
    dropSmall();
  };

  /** The new still is in: the old one, and everything drawn to go with it, goes. */
  const arrived = (px: Ground2Pixels): void => {
    if (pending !== px.time) return;
    pending = null;
    const next = compose(px);
    if (!next) return;
    if (made) for (const c of made.canvases) release(c);
    dropSmall();
    made = next;
  };

  /** The held still, asking for the time of day wanted if it is not the one held. */
  const hold = (time: TimeOfDay): Made | null => {
    if (made?.time === time || !canPaint()) return made;
    if (pending !== time) {
      pending = time;
      paint(time, arrived);
    }
    return made;
  };

  const keep = (c: HTMLCanvasElement | null): HTMLCanvasElement | null => {
    if (c) small.push(c);
    return c;
  };

  const smoke = town2Layout().filter((p) => p.layer === 'above' && p.id !== 'gull');
  const smokeLives: Life[] = smoke.map((p, i) => {
    /** One placed sprite per frame, made with the frames. */
    let placed: (Placed | null)[] = [];
    let of: (HTMLCanvasElement | null)[] | null = null;
    return {
      layer: 'above',
      at(ms, palette) {
        const m = hold(palette.name);
        if (!m) return null;
        let frames = smokeFrames.get(p.id);
        if (!frames) {
          const src = town2Piece(p.id).picture.grid;
          frames = Array.from({ length: SMOKE_FRAMES }, (_, f) =>
            keep(paintCells({ grid: smokeFrame(src, f), glows: [] }, m.time)),
          );
          smokeFrames.set(p.id, frames);
        }
        if (of !== frames) {
          of = frames;
          placed = frames.map((image) => image && { image, x: p.x, y: p.y });
        }
        return placed[Math.floor((ms + i * 1300) / SMOKE_FRAME_MS) % SMOKE_FRAMES] ?? null;
      },
    };
  });

  const gulls = town2Layout().filter((p) => p.id === 'gull');
  const gullLives: Life[] = gulls.map((p, i) => {
    const loop = gullLoop(p, i);
    const piece = town2Piece(p.id);
    const spot = { image: null as HTMLCanvasElement | null, x: 0, y: 0 };
    return {
      layer: 'above',
      at(ms, palette) {
        const m = hold(palette.name);
        if (!m) return null;
        if (!gullImages) {
          const g = piece.picture.grid;
          const flipped = tgrid(g.w, g.h);
          for (let y = 0; y < g.h; y++)
            for (let x = 0; x < g.w; x++) flipped.d[y * g.w + (g.w - 1 - x)] = g.d[y * g.w + x]!;
          gullImages = {
            right: keep(paintCells({ grid: g, glows: [] }, m.time)),
            left: keep(paintCells({ grid: flipped, glows: [] }, m.time)),
          };
        }
        const a = 2 * Math.PI * (loop.start + (loop.turn * ms) / loop.lapMs);
        // Facing the way the loop goes here: rightward where x is growing.
        const image = -Math.sin(a) * loop.turn > 0 ? gullImages.right : gullImages.left;
        if (!image) return null;
        spot.image = image;
        spot.x = Math.round(loop.x + loop.rx * Math.cos(a)) - Math.round(piece.w / 2);
        spot.y = Math.round(loop.y + loop.ry * Math.sin(a)) - Math.round(piece.h / 2);
        return spot as Placed;
      },
    };
  });

  const foamLife: Life = {
    layer: 'ground',
    at(ms, palette) {
      const m = hold(palette.name);
      // As painted (nothing over the still), then moved along, then back.
      return m && Math.floor(ms / FOAM_FRAME_MS) % 2 ? m.foam : null;
    },
  };

  return {
    still(palette) {
      return hold(palette.name)?.still ?? null;
    },

    standers(palette, walker) {
      const m = hold(palette.name);
      if (!m) return NO_STANDERS;
      if (!folk) {
        const glows = townLights();
        folk = TOWNSFOLK2_AT.map((p, i) => {
          const figure = townsfolkFigure2(p.figure);
          const feet = folkFeet[i]!;
          const stand = (facing: Facing): Standing | null => {
            const ax = facing === 'left' ? FIGURE2_W - 1 - FIGURE2_ANCHOR_X : FIGURE2_ANCHOR_X;
            const x = feet.x - ax;
            const y = feet.y - FIGURE2_SOLE_Y;
            const box = { x, y, w: FIGURE2_W, h: FIGURE2_H };
            const image = keep(
              figure?.paint(facing, m.time, glowsIn(glows, box, palette2(m.time))) ?? null,
            );
            return image && { image, x, y, base: feet.y };
          };
          return { right: stand('right'), left: stand('left') };
        });
      }
      folkShown.length = 0;
      for (let i = 0; i < folk.length; i++) {
        const turned = turnedTo(folkFeet[i]!, walker, NOTICE2) === 'left';
        const s = turned ? folk[i]!.left : folk[i]!.right;
        if (s) folkShown.push(s);
      }
      return folkShown;
    },

    shadowAt(feet, palette) {
      const m = hold(palette.name);
      if (!m) return null;
      // A shadow falls on whatever ground is under the feet; over the sea there is none.
      const mat = SHADOW_ON[groundAt(feet.x, feet.y)];
      if (!mat) return null;
      if (!shadows.has(mat)) {
        const grid = tgrid(SHADOW_MIDDLE.x * 2 + 1, SHADOW_MIDDLE.y * 2);
        const c = cell(mat, SHADOW_STEP);
        for (let y = 0; y < grid.h; y++)
          for (let x = 0; x < grid.w; x++) {
            const a = (x - SHADOW_MIDDLE.x) / SHADOW_RX;
            const b = (y + 0.5 - SHADOW_MIDDLE.y) / SHADOW_RY;
            if (a * a + b * b <= 1) grid.d[y * grid.w + x] = c;
          }
        const picture = keep(paintCells({ grid, glows: [] }, m.time));
        shadows.set(mat, picture && { picture, middle: SHADOW_MIDDLE });
      }
      return shadows.get(mat)!;
    },

    life: [foamLife, ...smokeLives, ...gullLives],
    held: () => made?.time ?? null,
    forget,
  };
}

const NO_STANDERS: readonly Standing[] = [];
