/*
 * How the town looks on the stage. Nothing here draws a building or a
 * person, and nothing heavy happens here: the town is worked out and painted
 * off the main thread (`town2Facts.ts`, `town2Worker.ts`) and arrives as
 * pictures ready to show; this holds them, moves the town's life about
 * (chimney smoke, gulls, shore foam), paints the hero and cuts his shadow
 * from the ground as he walks.
 *
 * Memory, the reason the stage's own still-maker is not used: the town is
 * 1440 x 2136 art pixels, 12.3 MB a picture. One still is kept, for one time
 * of day, with the standing pieces' own pictures (4 to 5 MB) for drawing
 * them again in front of the hero, and the ground's cells (6.2 MB) for his
 * shadow. Changing the time of day paints the other, then lets the first go.
 * The townsfolk are not in the still, so their turning to look at the hero
 * never recomposes it.
 *
 * Until the first still arrives nothing is held (the Town tab shows that it
 * is coming); on a change of time of day the old still stays up until the
 * new one is ready, and everything drawn with it (the hero, his shadow, the
 * townsfolk, the smoke) follows the still's time, not the button's, so they
 * always match.
 *
 * A frame allocates nothing here but the hero's shadow, a few hundred bytes
 * when his feet move to another pixel.
 */
import type { Look } from '../art/character';
import type { Palette } from '../art/palette';
import { shines, type Glow } from '../art/raster';
import { TOWN2_H, TOWN2_W } from '../art/town2/town';
import type { GameState } from '../core/state';
import type { TimeOfDay } from './daylight';
import type { Image, Placed, Standing } from './draw';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_H,
  FIGURE2_SOLE_Y,
  FIGURE2_W,
  heroFigure2,
  type Figure2,
  type PoseBook,
} from './figures2';
import type { PoseCells, PoseRequest } from './figures2Worker';
import { dressKey, dressOf } from './hero';
import { breathAt, type Pose2 } from './gait';
import { turnedTo, type Facing } from './play';
import { shadowBox, shadowCells, type Cells } from './shadow2';
import type { Life, StillPicture } from './stage';
import type { Point } from './tileMap';
import { feetOf, NOTICE2, TOWNSFOLK2_AT } from './town2';
import {
  folkBox,
  paintTown,
  town2Facts,
  type Facings,
  type Raw,
  type TownAnswer,
  type TownFacts,
  type TownPaint,
  type TownStep,
} from './town2Facts';
import { glowsIn, palette2, pixels1, reaches } from './town2Paint';

/** Where a figure's feet are in its canvas, facing right: the stage's `heroFeet`. */
export const FIGURE2_FEET: Point = { x: FIGURE2_ANCHOR_X, y: FIGURE2_SOLE_Y };

/** How far apart the townsfolk's breaths fall, so they do not all breathe at once. */
const FOLK_BREATH_OFFSET_MS = 370;

/** How long each frame of smoke and of the foam shows. */
export const SMOKE_FRAME_MS = 450;
export const FOAM_FRAME_MS = 1100;

/** Whether pixels can be made here at all: not in tests, where there is no canvas. */
export const canPaint = (): boolean =>
  typeof ImageData !== 'undefined' && typeof document !== 'undefined';

/** Pixels on a new canvas of their size; null where the browser will not draw. */
function canvasOf(r: Raw): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = r.w;
  canvas.height = r.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(new ImageData(r.data as Uint8ClampedArray<ArrayBuffer>, r.w, r.h), 0, 0);
  return canvas;
}

/** Lets a picture's pixels go now rather than whenever it is collected (Safari holds them otherwise). */
function release(image: Image): void {
  if ('close' in image) image.close();
  else {
    image.width = 0;
    image.height = 0;
  }
}

/* ----- Asking for the town ----- */

/** What a painter reports as it goes: the facts if asked, steps, then the town. */
export interface PainterCalls {
  facts?(facts: TownFacts): void;
  step?(step: TownStep): void;
  done(paint: TownPaint<ImageBitmap | Raw>): void;
}

/** Works the town out for a time of day: in a worker where there is one. */
export type Painter = (time: TimeOfDay, wantFacts: boolean, calls: PainterCalls) => void;

/**
 * On the spot: a browser with no workers, and tests. Everything at once,
 * before returning; with no canvas to show it on (tests) the facts but no
 * paint, which would take seconds for nothing.
 */
export const onTheSpot: Painter = (time, wantFacts, calls) => {
  if (wantFacts) calls.facts?.(town2Facts());
  if (canPaint()) calls.done(paintTown(time, (step) => calls.step?.(step)));
};

/**
 * How long a worker may go on after answering, keeping the town for next
 * time, before the page lets it go regardless. It closes itself long before.
 */
const KEEPING_MS = 30_000;

/**
 * A worker per request, on the spot if one cannot be had or it fails. Once
 * it has answered it keeps the town for next time and closes itself.
 */
export const inAWorker: Painter = (time, wantFacts, calls) => {
  let worker: Worker;
  try {
    worker = new Worker(new URL('./town2Worker.ts', import.meta.url), { type: 'module' });
  } catch {
    onTheSpot(time, wantFacts, calls);
    return;
  }
  let factsIn = !wantFacts;
  let answered = false;
  const fail = (): void => {
    worker.terminate();
    if (!answered) onTheSpot(time, !factsIn, calls);
    answered = true;
  };
  worker.onmessage = (event: MessageEvent<TownAnswer>) => {
    const answer = event.data;
    if (answer.kind === 'facts') {
      factsIn = true;
      calls.facts?.(answer.facts);
    } else if (answer.kind === 'step') calls.step?.(answer.step);
    else if (answer.kind === 'failed') fail();
    else {
      answered = true;
      setTimeout(() => worker.terminate(), KEEPING_MS);
      calls.done(answer.paint);
    }
  };
  worker.onerror = fail;
  worker.postMessage({ time, facts: wantFacts });
};

/** The painter this browser should use. */
export const painter = (): Painter => (typeof Worker === 'function' ? inAWorker : onTheSpot);

/* ----- The hero ----- */

/**
 * Draws a figure's poses somewhere other than the page's thread, answering
 * with them by key; or null where it cannot (tests), and the figure draws
 * each pose itself the first time it shows.
 */
export type Poser = (look: Look, worn: readonly string[]) => Promise<PoseBook>;

/** A worker per outfit, let go once it answers. */
export const poseInAWorker: Poser = (look, worn) =>
  new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./figures2Worker.ts', import.meta.url), { type: 'module' });
    } catch (e) {
      reject(e);
      return;
    }
    worker.onmessage = (event: MessageEvent<PoseCells[]>) => {
      worker.terminate();
      resolve(
        new Map(event.data.map((p) => [p.key, { grid: { w: p.w, h: p.h, d: p.d }, glows: [] }])),
      );
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(e);
    };
    worker.postMessage({ look, worn: [...worn] } satisfies PoseRequest);
  });

/** The poser this browser should use: a worker where there is one. */
export const poser = (): Poser | null => (typeof Worker === 'function' ? poseInAWorker : null);

/** How finely the hero's light follows him, in art pixels: one lit picture per step of this. */
const LIGHT_STEP = 6;
/**
 * Lit pictures of the hero kept at once, the least lately shown going first:
 * every frame of a stride for every place along a lamp-lit street, 16 KB
 * each, so walking back past a lamp finds them all made.
 */
export const LIT_KEPT = 192;

/**
 * The hero at the C scale: his figure in the player's look and gear from
 * the adapter, kept until he changes, and lit at dusk by the lights near
 * him. Every picture is made once, for its pose (frame and facing), time of
 * day and, lit, its place, and kept: walking past a lamp paints each frame
 * once per place at most, never again on later animation frames.
 */
export class Hero2 {
  private readonly poser: Poser | null;
  /** The poses drawn elsewhere for what he wears now, once they are in. */
  private book: PoseBook | null = null;
  private look: GameState['look'] | null = null;
  private equipment: GameState['equipment'] | null = null;
  private key = '';
  private figure: Figure2 | null = null;
  private readonly plain = new Map<string, HTMLCanvasElement | null>();
  private readonly lit = new Map<string, HTMLCanvasElement | null>();
  /** Every light in town; none until the town's facts are in. */
  private lights: readonly Glow[] = [];
  /** How many times he has been drawn afresh, for tests. */
  drawn = 0;
  /** How many pictures of him have been painted, for tests: each pose, time and light once. */
  painted = 0;

  /** `poser` draws his poses off the page's thread; without one he draws each as it first shows. */
  constructor(poser: Poser | null = null) {
    this.poser = poser;
  }

  /** Takes the state's look and gear; true if he now looks different. */
  wear(state: GameState): boolean {
    if (state.look === this.look && state.equipment === this.equipment) return false;
    this.look = state.look;
    this.equipment = state.equipment;
    const dress = dressOf(state);
    const key = dressKey(dress);
    if (key === this.key) return false;
    this.key = key;
    this.book = null;
    const poser = this.poser;
    this.figure = poser
      ? heroFigure2(dress.look, dress.worn, () => this.book)
      : heroFigure2(dress.look, dress.worn);
    this.drawn += 1;
    this.forget();
    poser?.(dress.look, dress.worn).then(
      (book) => {
        // Only if he still wears it: a newer outfit asked for its own.
        if (this.key !== key) return;
        this.book = book;
        // Pictures made while the poses were coming stood as drawn: they go.
        this.forget();
      },
      () => {
        // No worker after all: he draws each pose as it first shows.
        if (this.key === key) this.figure = heroFigure2(dress.look, dress.worn);
      },
    );
    return true;
  }

  /** The town's lights, to light him by at dusk. */
  lightBy(lights: readonly Glow[]): void {
    if (lights === this.lights) return;
    this.lights = lights;
    this.forget();
  }

  /** The figure he is drawn from now. */
  get dressedAs(): Figure2 | null {
    return this.figure;
  }

  /** The key of what he wears now. */
  get dressKey(): string {
    return this.key;
  }

  /** The column under his feet in a pose's picture. */
  anchorX(pose: Pose2): number {
    return pose.heading === 'left' ? FIGURE2_W - 1 - FIGURE2_ANCHOR_X : FIGURE2_ANCHOR_X;
  }

  /** Lets every picture of him go. */
  forget(): void {
    for (const c of [...this.plain.values(), ...this.lit.values()]) if (c) release(c);
    this.plain.clear();
    this.lit.clear();
    this.last.x = NaN;
  }

  /** The last answer, to give again while nothing about him has changed: most frames. */
  private readonly last = {
    x: NaN,
    y: NaN,
    pose: null as Pose2 | null,
    time: 'day' as TimeOfDay,
    image: null as HTMLCanvasElement | null,
  };

  /** He as he stands or walks with his feet at `feet`, in a pose, at this time of day. */
  at(feet: Point, pose: Pose2, time: TimeOfDay): HTMLCanvasElement | null {
    const qx = Math.round(feet.x / LIGHT_STEP);
    const qy = Math.round(feet.y / LIGHT_STEP);
    const last = this.last;
    if (last.x === qx && last.y === qy && last.pose === pose && last.time === time)
      return last.image;
    const image = this.find(qx * LIGHT_STEP, qy * LIGHT_STEP, pose, time);
    last.x = qx;
    last.y = qy;
    last.pose = pose;
    last.time = time;
    last.image = image;
    return image;
  }

  private find(x: number, y: number, pose: Pose2, time: TimeOfDay): HTMLCanvasElement | null {
    if (!this.figure) return null;
    const plainKey = `${pose.key} ${time}`;
    let plain = this.plain.get(plainKey);
    if (plain === undefined) {
      plain = this.figure.paint(pose, time, []);
      this.painted += 1;
      this.plain.set(plainKey, plain);
    }
    if (time === 'day') return plain;
    // Lights are looked for at a place, whatever the pose: most places at dusk have none.
    const ax = this.anchorX(pose);
    const box = { x: x - ax, y: y - FIGURE2_SOLE_Y, w: FIGURE2_W, h: FIGURE2_H };
    if (!this.lights.some((g) => reaches(g, box))) return plain;
    const key = `${plainKey} ${x} ${y}`;
    const kept = this.lit.get(key);
    if (kept !== undefined) {
      // Shown again: the last to go.
      this.lit.delete(key);
      this.lit.set(key, kept);
      return kept ?? plain;
    }
    const local = glowsIn(this.lights, box, palette2(time));
    let made: HTMLCanvasElement | null = null;
    if (local.length) {
      made = this.figure.paint(pose, time, local);
      this.painted += 1;
    }
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

/* ----- The hero's shadow ----- */

/**
 * The hero's contact shadow, cut from the ground's own cells under his feet
 * and darkened (`shadow2.ts`), painted in the time of day's colours with the
 * lamps that reach it, onto one small canvas reused as he walks.
 */
class Shadow {
  private readonly box: { x: number; y: number; w: number; h: number };
  private readonly cells: Cells;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  /** The shadow's pixels, painted into again at each step. */
  private readonly image: ImageData;
  private readonly lights: readonly Glow[];
  private readonly glows: Glow[] = [];
  private fx = NaN;
  private fy = NaN;
  readonly middle: Point;

  private readonly ground: Cells;
  private readonly time: TimeOfDay;

  constructor(ground: Cells, time: TimeOfDay, lights: readonly Glow[]) {
    this.ground = ground;
    this.time = time;
    this.box = shadowBox(time);
    this.middle = { x: -this.box.x, y: -this.box.y };
    this.cells = { w: this.box.w, h: this.box.h, d: new Int16Array(this.box.w * this.box.h) };
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.box.w;
    this.canvas.height = this.box.h;
    this.ctx = this.canvas.getContext('2d');
    this.image = new ImageData(this.box.w, this.box.h);
    const palette = palette2(time);
    this.lights = lights.filter((g) => shines(g, palette));
  }

  /** The shadow for feet at `feet`, painted again only when they move to another pixel. */
  at(feet: Point): HTMLCanvasElement | null {
    if (!this.ctx) return null;
    const fx = Math.round(feet.x);
    const fy = Math.round(feet.y);
    if (fx === this.fx && fy === this.fy) return this.canvas;
    this.fx = fx;
    this.fy = fy;
    shadowCells(this.ground, { x: fx, y: fy }, this.time, this.cells);
    const x0 = fx + this.box.x;
    const y0 = fy + this.box.y;
    const here = { x: x0, y: y0, w: this.box.w, h: this.box.h };
    this.glows.length = 0;
    for (const g of this.lights)
      if (reaches(g, here)) this.glows.push({ ...g, x: g.x - x0, y: g.y - y0 });
    // Into one image kept for it: a step allocates only the colours on the way.
    pixels1({ grid: this.cells, glows: this.glows }, palette2(this.time), this.image.data);
    this.ctx.putImageData(this.image, 0, 0);
    return this.canvas;
  }
}

/* ----- Putting it together ----- */

/** One time of day's town, on canvases or bitmaps, and everything to let go when it goes. */
interface Made {
  readonly time: TimeOfDay;
  readonly still: StillPicture;
  readonly foam: Placed | null;
  readonly smoke: readonly (readonly (Placed | null)[])[];
  readonly gull: { readonly right: Image | null; readonly left: Image | null };
  /** Each townsperson's pictures, breath by breath (as drawn, then breathing in), each way. */
  readonly folk: readonly (readonly {
    readonly right: Standing | null;
    readonly left: Standing | null;
  }[])[];
  readonly shadow: Shadow;
  readonly images: Image[];
}

/** A painted town made ready to show: bitmaps as they come, or raw pixels put on canvases. */
function madeOf(paint: TownPaint<ImageBitmap | Raw>, facts: TownFacts): Made | null {
  const images: Image[] = [];
  const show = (r: ImageBitmap | Raw | null): Image | null => {
    if (!r) return null;
    const image = 'data' in r ? canvasOf(r) : r;
    if (image) images.push(image);
    return image;
  };
  const pieces = paint.pieces.map(show);
  let still: Image | null;
  if (paint.composed) still = show(paint.still);
  else {
    // Composed here: the ground, then every standing piece in depth order.
    const canvas = show(paint.still) as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    if (ctx)
      for (const s of paint.standing)
        if (pieces[s.piece]) ctx.drawImage(pieces[s.piece]!, s.x, s.y);
    still = canvas;
  }
  if (!still) {
    for (const i of images) release(i);
    return null;
  }
  const standing: Standing[] = [];
  for (const s of paint.standing) {
    const image = pieces[s.piece];
    if (image) standing.push({ image, x: s.x, y: s.y, base: s.base });
  }
  const foamImage = show(paint.foam.image);
  const smoke = paint.smoke.map((frames, i) => {
    const at = facts.smoke[i]!;
    return frames.map((f) => {
      const image = show(f);
      return image && { image, x: at.x, y: at.y };
    });
  });
  const folk = paint.folk.map((f, i) => {
    const stand = (facing: Facing, from: Facings<ImageBitmap | Raw>): Standing | null => {
      const image = show(facing === 'right' ? from.right : from.left);
      if (!image) return null;
      const box = folkBox(i, facing);
      return { image, x: box.x, y: box.y, base: feetOf(TOWNSFOLK2_AT[i]!).y };
    };
    const out = { right: stand('right', f), left: stand('left', f) };
    // A town painted without the breath in stands still, as drawn.
    const inhale = f.inhale && { right: stand('right', f.inhale), left: stand('left', f.inhale) };
    return inhale ? [out, inhale] : [out];
  });
  return {
    time: paint.time,
    still: { still, standing },
    foam: foamImage && { image: foamImage, x: paint.foam.x, y: paint.foam.y },
    smoke,
    gull: { right: show(paint.gull.right), left: show(paint.gull.left) },
    folk,
    shadow: new Shadow({ w: TOWN2_W, h: TOWN2_H, d: paint.cells }, paint.time, facts.lights),
    images,
  };
}

/** Everything the stage needs to draw the town, beside the hero. */
export interface Town2Art {
  still(palette: Palette): StillPicture | null;
  standers(palette: Palette, walker: Point, now?: number): readonly Standing[];
  shadowAt(
    feet: Point,
    palette: Palette,
  ): { readonly picture: HTMLCanvasElement; readonly middle: Point } | null;
  readonly life: readonly Life[];
  /** The time of day whose still is held, if any: what everything drawn with it follows. */
  held(): TimeOfDay | null;
  /** Whether the first still is still on its way: what the Town tab shows a loading state for. */
  loading(): boolean;
  /** Takes a painted town asked for elsewhere (the first, with the facts). */
  take(paint: TownPaint<ImageBitmap | Raw>): void;
  /** Lets every picture go. */
  forget(): void;
}

export interface Town2ArtOptions {
  /** Works the town out. By default in a worker where the browser has one. */
  readonly paint?: Painter;
  /** A time of day already asked for (with the facts), arriving through `take`: not asked again. */
  readonly awaiting?: TimeOfDay | null;
}

export function town2Art(facts: TownFacts, options: Town2ArtOptions = {}): Town2Art {
  const paint = options.paint ?? painter();
  let made: Made | null = null;
  /** The time of day being painted, if any. */
  let pending: TimeOfDay | null = options.awaiting ?? null;
  const folkShown: Standing[] = [];
  const folkFeet = TOWNSFOLK2_AT.map(feetOf);

  const forget = (): void => {
    if (made) for (const i of made.images) release(i);
    made = null;
    pending = null;
    folkShown.length = 0;
  };

  /** A new town is in: the old one, and everything drawn to go with it, goes. */
  const arrived = (px: TownPaint<ImageBitmap | Raw>): void => {
    if (pending !== null && pending !== px.time) return;
    pending = null;
    if (!canPaint()) return;
    const next = madeOf(px, facts);
    if (!next) return;
    forget();
    made = next;
  };

  /** The held town, asking for the time of day wanted if it is not the one held. */
  const hold = (time: TimeOfDay): Made | null => {
    if (made?.time === time || !canPaint()) return made;
    if (pending !== time) {
      pending = time;
      paint(time, false, { done: arrived });
    }
    return made;
  };

  const smokeLives: Life[] = facts.smoke.map((_, i) => ({
    layer: 'above',
    at(ms, palette) {
      const frames = hold(palette.name)?.smoke[i];
      if (!frames?.length) return null;
      return frames[Math.floor((ms + i * 1300) / SMOKE_FRAME_MS) % frames.length] ?? null;
    },
  }));

  const gullLives: Life[] = facts.gulls.map((loop) => {
    const spot = { image: null as Image | null, x: 0, y: 0 };
    return {
      layer: 'above',
      at(ms, palette) {
        const m = hold(palette.name);
        if (!m) return null;
        const a = 2 * Math.PI * (loop.start + (loop.turn * ms) / loop.lapMs);
        // Facing the way the loop goes here: rightward where x is growing.
        const image = -Math.sin(a) * loop.turn > 0 ? m.gull.right : m.gull.left;
        if (!image) return null;
        spot.image = image;
        spot.x = Math.round(loop.x + loop.rx * Math.cos(a)) - Math.round(facts.gull.w / 2);
        spot.y = Math.round(loop.y + loop.ry * Math.sin(a)) - Math.round(facts.gull.h / 2);
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

    standers(palette, walker, now = 0) {
      const m = hold(palette.name);
      if (!m) return NO_STANDERS;
      folkShown.length = 0;
      for (let i = 0; i < m.folk.length; i++) {
        const turned = turnedTo(folkFeet[i]!, walker, NOTICE2) === 'left';
        // Each breathes in their own time, so the square does not breathe as one.
        const breaths = m.folk[i]!;
        const frames = breaths[breathAt(now + i * FOLK_BREATH_OFFSET_MS) % breaths.length]!;
        const s = turned ? frames.left : frames.right;
        if (s) folkShown.push(s);
      }
      return folkShown;
    },

    shadowAt(feet, palette) {
      const m = hold(palette.name);
      if (!m) return null;
      const picture = m.shadow.at(feet);
      return picture && { picture, middle: m.shadow.middle };
    },

    life: [foamLife, ...smokeLives, ...gullLives],
    held: () => made?.time ?? null,
    loading: () => canPaint() && !made,
    take: arrived,
    forget,
  };
}

const NO_STANDERS: readonly Standing[] = [];
