import type { Palette } from '../art/palette';
import type { Picture } from '../art/raster';
import { h } from '../ui/dom';
import type { View } from '../ui/view';
import type { Ambient } from './ambient';
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
  type Placed,
  type Standing,
} from './draw';
import { usePanel } from './panel';
import { advancePlay, bob, closePanel, tapAt, visitsTo, type Facing, type Play } from './play';
import { canvasFit, cssToArt, sceneScale, tapToWorld, viewSize } from './scale';
import type { Box, Opens, Scene } from './things';
import { mapSize, type Point } from './tileMap';

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

/** How a scene looks, beside the rules of walking in it. */
export interface StageArt {
  /** The whole map, one pixel per art pixel, with its lights. */
  readonly ground: Picture;
  /** Where the walker's feet are in their picture, facing right. */
  readonly heroFeet: Point;
  /** The walker standing at `feet`, facing either way, in this palette's light. */
  walkerAt(feet: Point, facing: Facing, palette: Palette): Picture;
  /** The walker's shadow on the ground at `feet`, and the point of it that goes under the feet. */
  shadowAt(feet: Point): { readonly picture: Picture; readonly middle: Point } | null;
  /** Things that move by themselves: smoke, birds, water. */
  readonly ambient?: readonly Ambient[];
}

/** The map with everything standing on it, composed once per scene and palette for the page. */
const stills = new WeakMap<
  Scene,
  Map<Palette['name'], { still: HTMLCanvasElement; standing: Standing[] } | null>
>();

function stillOf(
  scene: Scene,
  ground: Picture,
  palette: Palette,
): { still: HTMLCanvasElement; standing: Standing[] } | null {
  let byPalette = stills.get(scene);
  if (!byPalette) {
    byPalette = new Map();
    stills.set(scene, byPalette);
  }
  if (byPalette.has(palette.name)) return byPalette.get(palette.name)!;
  let made: { still: HTMLCanvasElement; standing: Standing[] } | null = null;
  const groundImage = canvasOf(ground, palette);
  if (groundImage) {
    const standing: Standing[] = [];
    for (const t of scene.things) {
      if (!t.sprite) continue;
      const image = canvasOf(t.sprite.picture, palette);
      if (image) standing.push({ image, x: t.sprite.at.x, y: t.sprite.at.y, base: t.base });
    }
    // A stable sort, as `drawOrder` has it: things level with each other keep their order.
    standing.sort((a, b) => a.base - b.base);
    const still = compose(groundImage, standing);
    if (still) made = { still, standing };
  }
  byPalette.set(palette.name, made);
  return made;
}

/** What moved since the last frame drew, by what it was: compared to find the patches to redraw. */
interface Drawn {
  readonly image: HTMLCanvasElement;
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

/** Boxes that overlap or touch merged into one, so a patch is never drawn twice. */
export function mergeBoxes(boxes: readonly Box[]): Box[] {
  const out: Box[] = [];
  for (const box of boxes) {
    let merged = box;
    for (let i = out.length - 1; i >= 0; i--) {
      const grown = { x: merged.x - 1, y: merged.y - 1, w: merged.w + 2, h: merged.h + 2 };
      if (overlaps(out[i]!, grown)) {
        merged = union(merged, out[i]!);
        out.splice(i, 1);
        i = out.length;
      }
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

export interface StageOptions {
  readonly scene: Scene;
  readonly art: StageArt;
  /** Where the walker is and what they are doing, from the last time this scene was shown. */
  readonly play: Play;
  /** Told after every change, so a rebuilt stage can carry on from there. */
  readonly keep: (play: Play) => void;
  readonly light: Light;
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
  const { scene, art, light } = options;
  const world = mapSize(scene.map);
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
  const el = h('div', { class: 'scene' }, [canvas, lightButton]);

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

  const camera = (scale: number): Point => {
    const view = viewSize(device, scale);
    const focus = { x: play.walker.at.x, y: play.walker.at.y - FOCUS_RISE };
    return cameraFor(focus, { width: view.width, height: Math.max(1, view.height - lift) }, world);
  };

  /** Sizes the canvas to the scene's box: whole CSS pixels, whole device pixels, never stretched. */
  const fit = (box: Size): void => {
    const next = canvasFit(box, window.devicePixelRatio || 1);
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

  canvas.addEventListener('pointerdown', (event) => {
    if (event.isPrimary === false || device.width === 0) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scale = sceneScale(device);
    const cssSize = css.width ? css : { width: rect.width, height: rect.height };
    const tap = tapToWorld(
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      cssSize,
      device,
      scale,
      camera(scale),
    );
    change(tapAt(scene, play, tap, cssToArt(MIN_TAP_CSS, cssSize, device, scale)));
  });

  /** How far the view must slide up for the walker to stay clear of the open panel, in art pixels. */
  const panelLift = (): number => {
    if (!panel || device.height === 0 || css.height === 0) return 0;
    const scale = sceneScale(device);
    return cssToArt(panel.offsetHeight + PANEL_MARGIN, css, device, scale);
  };

  /** What the last frame drew that can move, by name, to find what changed. */
  let drawnLast = new Map<string, Drawn>();
  /** Where the camera was and what palette the last frame used; a change means drawing it all. */
  let shownLast = '';

  const draw = (now: number): void => {
    if (device.width === 0 || device.height === 0) return;
    const palette = paletteFor(time);
    const made = stillOf(scene, art.ground, palette);
    // Art that cannot be painted (jsdom) means no context is asked for either.
    if (!made) return;
    if (canvas.width !== device.width || canvas.height !== device.height) {
      canvas.width = device.width;
      canvas.height = device.height;
      shownLast = '';
    }
    ctx ??= canvas.getContext('2d');
    if (!ctx) return;
    const scale = sceneScale(device);
    const cam = camera(scale);
    const feet = round(play.walker.at);
    const left = play.facing === 'left';
    const walkerPicture = art.walkerAt(feet, play.facing, palette);
    const walkerImage = canvasOf(walkerPicture, palette);
    const walker: Standing | null = walkerImage && {
      image: walkerImage,
      // Mirrored, the column under the feet moves to the other side of the picture.
      x: feet.x - (left ? walkerPicture.grid.w - 1 - art.heroFeet.x : art.heroFeet.x),
      y: feet.y - art.heroFeet.y - bob(play),
      base: feet.y,
    };
    const shadow = art.shadowAt(feet);
    const shadowImage = shadow && canvasOf(shadow.picture, palette);
    const underfoot: Placed[] = [];
    const above: Placed[] = [];
    const moving = new Map<string, Drawn>();
    (art.ambient ?? []).forEach((a, i) => {
      const sprite = a.at(now);
      const image = sprite && canvasOf(sprite.picture, palette);
      if (!sprite || !image) return;
      const placed = { image, x: sprite.at.x, y: sprite.at.y };
      (a.layer === 'ground' ? underfoot : above).push(placed);
      moving.set(`ambient ${i}`, { image, box: boxOf(placed) });
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
    const target = play.heading === null ? (play.walker.path.at(-1) ?? null) : null;
    if (target) moving.set('target', { image: made.still, box: markerBox(target) });

    const frame: Frame = {
      backdrop: palette.colours.navy2,
      scale,
      camera: cam,
      still: made.still,
      standing: made.standing,
      underfoot,
      target,
      marker: { light: palette.colours.gold1, ink: palette.colours.ink1 },
      walker,
      above,
    };
    const view = viewSize(device, scale);
    const whole: Box = {
      x: cam.x,
      y: cam.y,
      w: Math.ceil(view.width),
      h: Math.ceil(view.height),
    };
    const shown = `${cam.x} ${cam.y} ${scale} ${palette.name} ${device.width} ${device.height}`;
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
      for (const patch of mergeBoxes(changed.filter((b) => overlaps(b, whole))))
        drawFrame(ctx, frame, patch);
    }
    shownLast = shown;
    drawnLast = moving;
  };

  showTime();
  syncPanel();

  return {
    el,
    update: () => {
      const now = performance.now();
      const ms = last === null ? 0 : Math.min(Math.max(now - last, 0), MAX_FRAME_MS);
      last = now;
      change(advancePlay(scene, play, ms));
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
