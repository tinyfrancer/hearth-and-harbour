import type { Palette } from '../art/palette';
import type { Picture } from '../art/raster';
import { h } from '../ui/dom';
import type { View } from '../ui/view';
import { cameraFor, type Size } from './camera';
import { paletteFor, type TimeOfDay } from './daylight';
import {
  boxOf,
  canvasOf,
  compose,
  drawFrame,
  markerBox,
  overlaps,
  type Frame,
  type Image,
  type Placed,
  type Standing,
} from './draw';
import { usePanel } from './panel';
import {
  advancePlay,
  bob,
  closePanel,
  steer,
  steering,
  tapAt,
  turnedTo,
  visitsTo,
  type Facing,
  type Play,
} from './play';
import { canvasFit, cssToArt, pixelFit, sceneScale, tapToWorld, viewSize } from './scale';
import { footprintCentreX, thingAt, usable, type Box, type Opens, type Scene } from './things';
import { cellAt, mapSize, tileOf, type Cell, type Point } from './tileMap';

/**
 * The longest frame the walk takes in one go. A page coming back from the
 * background gets one huge frame; the walker should carry on from where it was
 * rather than appear at the end of its walk.
 */
const MAX_FRAME_MS = 250;

/** The camera looks this far above the walker's feet, so the whole figure sits in the middle. */
export const FOCUS_RISE = 22;

/** The smallest a tap target may be, in CSS pixels. */
export const MIN_TAP_CSS = 44;

/** How fast the view slides up to make room for a panel, in art pixels a second. */
const LIFT_SPEED = 900;

/** A gap kept between the walker's view and the panel's top edge, in CSS pixels. */
const PANEL_MARGIN = 12;

/**
 * A picture to show: one of the art lane's `Picture`s, painted on first use
 * and kept (`canvasOf`), or a canvas a scene has already painted at one pixel
 * per art pixel (the C-scale town, whose art is not a `Picture`).
 */
export type Look = Picture | HTMLCanvasElement;

const isPicture = (look: Look): look is Picture => 'grid' in look;

/** A look as pixels in this palette. */
function imageOf(look: Look, palette: Palette): HTMLCanvasElement | null {
  return isPicture(look) ? canvasOf(look, palette) : look;
}

/** How wide a look is, in art pixels. */
const widthOf = (look: Look): number => (isPicture(look) ? look.grid.w : look.width);

/** The map with everything that stands still on it, composed once, and those things in depth order. */
export interface StillPicture {
  readonly still: Image;
  readonly standing: readonly Standing[];
}

/** Something that moves by itself, already painted: what shows at `ms` in this palette, if anything. */
export interface Life {
  /** `ground`: lies on the ground, under everything standing. `above`: over everything. */
  readonly layer: 'ground' | 'above';
  at(ms: number, palette: Palette): Placed | null;
}

/** How a scene looks, beside the rules of walking in it. */
export interface StageArt {
  /** The whole map, one pixel per art pixel, with its lights. Not needed by a scene with a `still`. */
  readonly ground?: Picture;
  /**
   * The map with everything standing on it, made by the scene itself in this
   * palette (null until it is ready, or where nothing can be painted). Used in
   * place of `ground` and the things' own sprites: a scene too big to keep a
   * composed picture per palette and per person turned, which keeps one.
   */
  still?(palette: Palette): StillPicture | null;
  /**
   * People standing about who are not part of the still picture, sorted with
   * the walker by their feet: drawn again only when one of them changes (turns
   * to look at the walker at `walker`).
   */
  standers?(palette: Palette, walker: Point, now: number): readonly Standing[];
  /**
   * The ground as it is this frame, for a scene whose ground changes (a
   * dungeon's tide). Each different picture is composed once and kept.
   */
  readonly groundNow?: () => Picture;
  /** Where the walker's feet are in their picture, facing right. */
  readonly heroFeet: Point;
  /** The walker standing at `feet`, facing either way, in this palette's light. */
  walkerAt(feet: Point, facing: Facing, palette: Palette): Look;
  /**
   * The walker this frame, for a scene whose walker steps in frames of its
   * own (a walk cycle, a breath): the picture and the column of it under the
   * feet. Used in place of `walkerAt`, and the stage's one-pixel bob is not
   * added: the frames carry their own.
   */
  walkerPose?(feet: Point, play: Play, palette: Palette, now: number): WalkerFrame;
  /** The walker's shadow on the ground at `feet`, and the point of it that goes under the feet. */
  shadowAt(
    feet: Point,
    palette: Palette,
  ): { readonly picture: Look; readonly middle: Point } | null;
  /** Things that move by themselves, already painted: smoke, birds, water. */
  readonly life?: readonly Life[];
}

/** A walker's picture this frame and the column under the middle of its soles. */
export interface WalkerFrame {
  readonly image: Look;
  readonly feetX: number;
}

type Still = { still: HTMLCanvasElement; standing: Standing[] } | null;

/**
 * How many ways of the map with its people turned are kept per scene. Only
 * someone near the walker turns, and the town's people stand well apart, so
 * the town as drawn and with each one turned, by day and dusk, fit.
 */
const STILLS_KEPT = 8;

/**
 * The map with everything standing on it, composed once per scene, ground,
 * palette and set of people turned, and kept for the page (the few most recent).
 */
const stills = new WeakMap<Scene, Map<string, Still>>();

/** A number for each ground picture, to tell them apart in a still's key. */
const groundIds = new WeakMap<Picture, number>();
let groundCount = 0;

function stillOf(
  scene: Scene,
  ground: Picture,
  palette: Palette,
  turned: ReadonlySet<string>,
): Still {
  let made = stills.get(scene);
  if (!made) {
    made = new Map();
    stills.set(scene, made);
  }
  let id = groundIds.get(ground);
  if (id === undefined) {
    id = groundCount++;
    groundIds.set(ground, id);
  }
  const key = `${id} ${palette.name} ${[...turned].join(' ')}`;
  if (made.has(key)) return made.get(key)!;
  let still: Still = null;
  const groundImage = canvasOf(ground, palette);
  if (groundImage) {
    const standing: Standing[] = [];
    for (const t of scene.things) {
      if (!t.sprite) continue;
      const pic = turned.has(t.id) && t.sprite.turned ? t.sprite.turned : t.sprite.picture;
      const image = canvasOf(pic, palette);
      if (image) standing.push({ image, x: t.sprite.at.x, y: t.sprite.at.y, base: t.base });
    }
    // A stable sort, as `drawOrder` has it: things level with each other keep their order.
    standing.sort((a, b) => a.base - b.base);
    const canvas = compose(groundImage, standing);
    if (canvas) still = { still: canvas, standing };
  }
  if (made.size >= STILLS_KEPT) made.delete(made.keys().next().value!);
  made.set(key, still);
  return still;
}

/** What moved since the last frame drew, by what it was: compared to find the patches to redraw. */
interface Drawn {
  readonly image: Image;
  readonly box: Box;
}

const same = (a: Drawn | undefined, b: Drawn | undefined): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    a.image === b.image &&
    a.box.x === b.box.x &&
    a.box.y === b.box.y &&
    a.box.w === b.box.w &&
    a.box.h === b.box.h);

/** The smallest box holding both. */
function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

const area = (b: Box): number => b.w * b.h;

/** How much of two boxes' shared area they both cover. */
function shared(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Boxes that overlap or touch merged into one, so a patch is seldom drawn
 * twice, unless the one box would be mostly empty: two figures at opposite
 * corners of a room are two small patches, not one the size of the room.
 * Patches that overlap are each drawn whole, so leaving some apart is only
 * a little work done twice, never a wrong picture.
 */
export function mergeBoxes(boxes: readonly Box[]): Box[] {
  const out: Box[] = [];
  for (const box of boxes) {
    let merged = box;
    for (let i = out.length - 1; i >= 0; i--) {
      const other = out[i]!;
      const grown = { x: merged.x - 1, y: merged.y - 1, w: merged.w + 2, h: merged.h + 2 };
      if (!overlaps(other, grown)) continue;
      const joined = union(merged, other);
      const waste = area(joined) - area(merged) - area(other) + shared(merged, other);
      if (waste > Math.max(64, (area(merged) + area(other)) / 2)) continue;
      merged = joined;
      out.splice(i, 1);
      i = out.length;
    }
    out.push(merged);
  }
  return out;
}

/** The time of day a scene shows, and a way to flip it. */
export interface Light {
  current(): TimeOfDay;
  flip(): void;
}

/**
 * More to draw than the stage knows of: a dungeon's fight. It says where it
 * draws, and those boxes (this frame's and the last's) are drawn again each
 * frame, as the walker's are, rather than the whole view.
 */
export interface StageExtra {
  /** Whoever else stands in the scene, sorted with the walker by their feet. */
  readonly actors: readonly Standing[];
  /** Everywhere this draws this frame, in art pixels: actors, marks, numbers. */
  readonly boxes: readonly Box[];
  /** On the ground, under everyone: marks, loot. Drawn in art pixels. */
  ground?(ctx: CanvasRenderingContext2D, palette: Palette): void;
  /** Over everyone: health, numbers, things in flight. Drawn in art pixels. */
  over?(ctx: CanvasRenderingContext2D, palette: Palette): void;
  /** The walker's picture as it should show this frame (a flash when struck). */
  walker?(image: HTMLCanvasElement): HTMLCanvasElement;
}

/** Room kept clear at each edge of the canvas, in CSS pixels, for buttons laid over the scene. */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Buttons laid over a scene, in CSS pixels from the scene's top-left: the
 * sun-and-moon button. Placed from here (not only in `scene.css`) so the
 * check that nothing tappable hides under a button reads the same numbers.
 */
export const SCENE_BUTTONS = {
  light: { left: 8, top: 8, width: 48, height: 48 },
} as const;

export interface StageOptions {
  readonly scene: Scene;
  readonly art: StageArt;
  /** Where the walker is and what they are doing, from the last time this scene was shown. */
  readonly play: Play;
  /** Told after every change, so a rebuilt stage can carry on from there. */
  readonly keep: (play: Play) => void;
  /** Day and dusk, with the sun-and-moon button to flip them. Without it, `time` and no button. */
  readonly light?: Light;
  /** The time of day of a scene without a `light`: day unless said (a dungeon is dusk). */
  readonly time?: TimeOfDay;
  /** How many device pixels an art pixel takes on a canvas this size. The town's rule by default. */
  readonly scaleOf?: (device: Size) => number;
  /** How far above the walker's feet the camera looks, in art pixels: `FOCUS_RISE` by default. */
  readonly focusRise?: number;
  /**
   * Draw at one canvas pixel per art pixel and let the browser enlarge the
   * canvas by the whole scale (`image-rendering: pixelated`), rather than
   * drawing every device pixel: a ninth of the work a frame at 3x. For a
   * scene of nothing but whole art pixels (the town); a scene that writes
   * words or thin lines at device resolution (a dungeon's fight) keeps the
   * default.
   */
  readonly pixelated?: boolean;
  /**
   * Room the camera keeps clear at the edges for buttons over the scene: the
   * walker is centred in what is left, and a map smaller than that is centred
   * in it. Nothing by default.
   */
  readonly insets?: Insets;
  /** While true, time does not move the walker: a run paused, a door being gone through. */
  readonly frozen?: () => boolean;
  /**
   * Moves the walker on by `ms` in place of the stage's own walking: a
   * dungeon, where the run decides how he moves. Whatever it returns is where
   * he is.
   */
  readonly drive?: (play: Play, ms: number) => Play;
  /**
   * Offered every tap first, at `point` in the scene with the smallest tap
   * target `min` (art pixels): a Play takes the tap (it was on a foe), null
   * leaves it to the stage to walk or open as ever.
   */
  readonly tap?: (point: Point, min: number, play: Play) => Play | null;
  /** More to draw this frame. */
  readonly extra?: (now: number, palette: Palette) => StageExtra;
  /** A panel's button was pressed. */
  readonly press: (opens: Opens) => void;
  /** What a screen reader hears for the canvas. */
  readonly label: string;
  /** Shown instead of the scene by a browser that cannot draw one. */
  readonly fallback: string;
}

const round = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) });

/**
 * A scene on a canvas that fills its container: the ground, things standing
 * on it in depth order, a walker who goes where the player taps, a camera
 * that follows them, and a panel for whatever they walk up to.
 *
 * The shell calls `update` once a frame while the scene is on screen and
 * stops when it is not; the stage keeps no loop of its own, and redraws only
 * when something moved, resized or changed.
 */
export function stage(options: StageOptions): View {
  const { scene, art } = options;
  const fixed = options.time ?? 'day';
  const light: Light = options.light ?? { current: () => fixed, flip: () => {} };
  const scaleOf = options.scaleOf ?? sceneScale;
  const insets = options.insets ?? NO_INSETS;
  const world = mapSize(scene.map);
  const tile = tileOf(scene.map);
  const rise = options.focusRise ?? FOCUS_RISE;
  /** A number for each still a scene made itself, to tell them apart in what was last shown. */
  const stillIds = new WeakMap<Image, number>();
  // People who turn to look at the walker.
  const turners = scene.things.filter((t) => t.sprite?.turned);
  const canvas = h(
    'canvas',
    { class: 'scene-canvas', attrs: { role: 'img', 'aria-label': options.label } },
    [options.fallback],
  );
  const lightButton = h('button', {
    class: 'scene-light',
    attrs: { type: 'button' },
    on: {
      click: () => {
        light.flip();
        changeTime(light.current());
      },
    },
  });
  const place = SCENE_BUTTONS.light;
  lightButton.style.left = `${place.left}px`;
  lightButton.style.top = `${place.top}px`;
  lightButton.style.width = `${place.width}px`;
  lightButton.style.height = `${place.height}px`;
  const el = h('div', { class: 'scene' }, [canvas, options.light ? lightButton : null]);

  let play = options.play;
  let time = light.current();
  let panel: HTMLElement | null = null;
  let panelFor: string | null = null;
  /** How far, in art pixels, the view has slid up to keep the walker clear of the panel. */
  let lift = 0;
  /** The canvas in device pixels and in CSS pixels; zero until it has been laid out. */
  let device: Size = { width: 0, height: 0 };
  let css: Size = { width: 0, height: 0 };
  let ctx: CanvasRenderingContext2D | null = null;
  let last: number | null = null;
  /**
   * A finger held on the ground: where it is on the canvas, in CSS pixels,
   * and the tile the walk was last aimed at. The walker keeps heading for it.
   */
  let held: {
    readonly id: number;
    /** Where the finger went down, and when, to tell a tap from a hold. */
    readonly from: Point;
    readonly since: number;
    readonly at: Point;
    readonly aimed: Cell | null;
    readonly steering: boolean;
  } | null = null;

  const showTime = (): void => {
    lightButton.dataset.time = time;
    lightButton.setAttribute(
      'aria-label',
      time === 'day' ? 'Daytime. Switch to dusk' : 'Dusk. Switch to day',
    );
  };

  const syncPanel = (): void => {
    if (play.open === panelFor) return;
    panel?.remove();
    panel = null;
    panelFor = play.open;
    const use = scene.things.find((t) => t.id === play.open)?.use;
    if (!use) return;
    panel = usePanel(
      use,
      time,
      {
        press: options.press,
        close: () => change(closePanel(play)),
      },
      visitsTo(play, play.open!),
    );
    el.append(panel);
  };

  const change = (next: Play): void => {
    if (next !== play) {
      play = next;
      options.keep(play);
    }
    syncPanel();
  };

  const changeTime = (next: TimeOfDay): void => {
    if (next === time) return;
    time = next;
    showTime();
    // What is open may say something else after dark.
    panelFor = null;
    syncPanel();
  };

  /** The insets in whole art pixels at this scale. */
  const inset = (scale: number): Insets => {
    const art = (cssPixels: number): number => Math.round(cssToArt(cssPixels, css, device, scale));
    return {
      top: art(insets.top),
      right: art(insets.right),
      bottom: art(insets.bottom),
      left: art(insets.left),
    };
  };

  const camera = (scale: number): Point => {
    const view = viewSize(device, scale);
    const room = inset(scale);
    const focus = { x: play.walker.at.x, y: play.walker.at.y - rise };
    const inner = {
      width: Math.max(1, view.width - room.left - room.right),
      height: Math.max(1, view.height - room.top - room.bottom - lift),
    };
    const cam = cameraFor(focus, inner, world);
    return { x: cam.x - room.left, y: cam.y - room.top };
  };

  /** The canvas's own size when it is drawn at one pixel per art pixel (`pixelated`). */
  let artSize: Size = { width: 0, height: 0 };

  /** Sizes the canvas to the scene's box: whole CSS pixels, whole device pixels, never stretched. */
  const fit = (box: Size): void => {
    const dpr = window.devicePixelRatio || 1;
    let next: { css: Size; device: Size };
    if (options.pixelated) {
      const fitted = pixelFit(box, dpr, scaleOf);
      artSize = fitted.art;
      next = fitted;
    } else next = canvasFit(box, dpr);
    if (next.css.width !== css.width || next.css.height !== css.height) {
      canvas.style.width = `${next.css.width}px`;
      canvas.style.height = `${next.css.height}px`;
    }
    css = next.css;
    if (next.device.width === device.width && next.device.height === device.height) return;
    device = next.device;
  };

  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(([entry]) => {
      // A scene taken off the page reports a last size of nothing: the stage is done.
      if (!el.isConnected) {
        observer?.disconnect();
        return;
      }
      if (entry) fit({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
  }

  /** Where a point on the canvas, in CSS pixels from its top-left, is in the scene. */
  const cssSize = (): Size => {
    if (css.width) return css;
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  };

  const toWorld = (offset: Point): Point => {
    const scale = scaleOf(device);
    return tapToWorld(offset, cssSize(), device, scale, camera(scale));
  };

  const offsetOf = (event: PointerEvent): Point => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (event.isPrimary === false || device.width === 0) return;
    event.preventDefault();
    held = null;
    const at = offsetOf(event);
    const tap = toWorld(at);
    const scale = scaleOf(device);
    const min = cssToArt(MIN_TAP_CSS, cssSize(), device, scale);
    const taken = options.tap?.(tap, min, play);
    if (taken) {
      change(taken);
      return;
    }
    const thing = thingAt(scene.things, tap, min);
    change(tapAt(scene, play, tap, min));
    // A press on the ground can be held and dragged to steer; one on a thing is only a tap.
    if (thing && usable(thing)) return;
    held = {
      id: event.pointerId,
      from: at,
      since: performance.now(),
      at,
      aimed: cellAt(tap, tile),
      steering: false,
    };
    // Keeps the finger's moves coming when it slides off the canvas onto a button.
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer the browser no longer knows: steering still works while it is over the canvas.
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (held && event.pointerId === held.id) held = { ...held, at: offsetOf(event) };
  });
  const letGo = (event: PointerEvent): void => {
    if (held && event.pointerId === held.id) held = null;
  };
  canvas.addEventListener('pointerup', letGo);
  canvas.addEventListener('pointercancel', letGo);
  canvas.addEventListener('lostpointercapture', letGo);

  /** How far the view must slide up for the walker to stay clear of the open panel, in art pixels. */
  const panelLift = (): number => {
    if (!panel || device.height === 0 || css.height === 0) return 0;
    const scale = scaleOf(device);
    return cssToArt(panel.offsetHeight + PANEL_MARGIN, css, device, scale);
  };

  /** What the last frame drew that can move, by name, to find what changed. */
  let drawnLast = new Map<string, Drawn>();
  /** Where the extra drawing was last frame: drawn again to clear it. */
  let extraLast: readonly Box[] = [];
  /** Where the camera was and what palette the last frame used; a change means drawing it all. */
  let shownLast = '';

  const draw = (now: number): void => {
    if (device.width === 0 || device.height === 0) return;
    const palette = paletteFor(time);
    // People near the walker turn to him: the map is composed with them turned, rarely and once.
    const turned = new Set(
      turners
        .filter(
          (t) =>
            turnedTo({ x: footprintCentreX(t, tile), y: t.base }, play.walker.at, scene.notice) ===
            'left',
        )
        .map((t) => t.id),
    );
    const ground = art.groundNow?.() ?? art.ground;
    const made = art.still ? art.still(palette) : ground && stillOf(scene, ground, palette, turned);
    // Art that cannot be painted (jsdom) means no context is asked for either.
    if (!made) return;
    // Pixelated, the canvas holds one pixel per art pixel and the browser enlarges it.
    const backing = options.pixelated ? artSize : device;
    if (canvas.width !== backing.width || canvas.height !== backing.height) {
      canvas.width = backing.width;
      canvas.height = backing.height;
      shownLast = '';
    }
    ctx ??= canvas.getContext('2d');
    if (!ctx) return;
    const scale = scaleOf(device);
    const cam = camera(scale);
    const feet = round(play.walker.at);
    const left = play.facing === 'left';
    const extra = options.extra?.(now, palette) ?? null;
    const posed = art.walkerPose?.(feet, play, palette, now) ?? null;
    const walkerPicture = posed ? posed.image : art.walkerAt(feet, play.facing, palette);
    const plainWalker = imageOf(walkerPicture, palette);
    const walkerImage = plainWalker && extra?.walker ? extra.walker(plainWalker) : plainWalker;
    const walker: Standing | null = walkerImage && {
      image: walkerImage,
      // Mirrored, the column under the feet moves to the other side of the picture.
      x:
        feet.x -
        (posed ? posed.feetX : left ? widthOf(walkerPicture) - 1 - art.heroFeet.x : art.heroFeet.x),
      // A walker in frames of its own steps up and down in them; the bob is for the rest.
      y: feet.y - art.heroFeet.y - (posed ? 0 : bob(play, scene.stride)),
      base: feet.y,
    };
    const shadow = art.shadowAt(feet, palette);
    const shadowImage = shadow && imageOf(shadow.picture, palette);
    const underfoot: Placed[] = [];
    const above: Placed[] = [];
    const moving = new Map<string, Drawn>();
    (art.life ?? []).forEach((a, i) => {
      const placed = a.at(now, palette);
      if (!placed) return;
      (a.layer === 'ground' ? underfoot : above).push(placed);
      moving.set(`life ${i}`, { image: placed.image, box: boxOf(placed) });
    });
    if (shadow && shadowImage) {
      const placed = {
        image: shadowImage,
        x: feet.x - shadow.middle.x,
        y: feet.y - shadow.middle.y,
      };
      underfoot.push(placed);
      moving.set('shadow', { image: shadowImage, box: boxOf(placed) });
    }
    if (walker) moving.set('walker', { image: walker.image, box: boxOf(walker) });
    const actors: Standing[] = walker ? [walker] : [];
    const standers = art.standers?.(palette, play.walker.at, now) ?? [];
    standers.forEach((s, i) => {
      actors.push(s);
      moving.set(`stander ${i}`, { image: s.image, box: boxOf(s) });
    });
    if (extra) for (const a of extra.actors) actors.push(a);
    // Stable: the walker stays in front of anyone level with his feet.
    if (actors.length > 1) actors.sort((a, b) => a.base - b.base);
    const target = play.heading === null ? (play.walker.path.at(-1) ?? null) : null;
    if (target) moving.set('target', { image: made.still, box: markerBox(target) });

    const frame: Frame = {
      backdrop: palette.colours.navy2,
      scale: options.pixelated ? 1 : scale,
      camera: cam,
      still: made.still,
      standing: made.standing,
      underfoot,
      target,
      marker: { light: palette.colours.gold1, ink: palette.colours.ink1 },
      actors,
      above,
      ground: extra?.ground && ((c) => extra.ground!(c, palette)),
      over: extra?.over && ((c) => extra.over!(c, palette)),
    };
    const view = viewSize(device, scale);
    const whole: Box = {
      x: cam.x,
      y: cam.y,
      w: Math.ceil(view.width),
      h: Math.ceil(view.height),
    };
    const stillKey = art.still ? stillId(made.still) : ground && groundIds.get(ground);
    const shown = `${stillKey} ${cam.x} ${cam.y} ${scale} ${palette.name} ${device.width} ${device.height} ${[...turned].join(' ')}`;
    if (shown !== shownLast) {
      drawFrame(ctx, frame, whole);
    } else {
      const changed: Box[] = [];
      for (const key of new Set([...drawnLast.keys(), ...moving.keys()])) {
        const was = drawnLast.get(key);
        const is = moving.get(key);
        if (same(was, is)) continue;
        if (was) changed.push(was.box);
        if (is) changed.push(is.box);
      }
      changed.push(...extraLast, ...(extra?.boxes ?? []));
      for (const patch of mergeBoxes(changed.filter((b) => overlaps(b, whole))))
        drawFrame(ctx, frame, patch);
    }
    shownLast = shown;
    drawnLast = moving;
    extraLast = extra?.boxes ?? [];
  };

  /** A number for a still the scene made itself: a new one means the whole view is drawn again. */
  let stillCount = 0;
  function stillId(still: Image): number {
    let id = stillIds.get(still);
    if (id === undefined) {
      id = stillCount++;
      stillIds.set(still, id);
    }
    return id;
  }

  showTime();
  syncPanel();

  return {
    el,
    update: () => {
      const now = performance.now();
      const still = options.frozen?.() ?? false;
      const ms = last === null || still ? 0 : Math.min(Math.max(now - last, 0), MAX_FRAME_MS);
      last = now;
      if (held && !held.steering) {
        const moved = Math.hypot(held.at.x - held.from.x, held.at.y - held.from.y);
        if (steering(now - held.since, moved)) held = { ...held, steering: true };
      }
      if (held?.steering && !still && device.width > 0) {
        const steered = steer(scene, play, toWorld(held.at), held.aimed);
        held = { ...held, aimed: steered.aimed };
        change(steered.play);
      }
      change(options.drive ? options.drive(play, ms) : advancePlay(scene, play, ms));
      changeTime(light.current());
      const target = panelLift();
      if (lift !== target) {
        const most = (LIFT_SPEED * ms) / 1000;
        lift = target > lift ? Math.min(target, lift + most) : Math.max(target, lift - most);
      }
      draw(now);
    },
  };
}
