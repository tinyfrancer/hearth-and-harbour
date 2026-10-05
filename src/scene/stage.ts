import type { Picture } from '../art/raster';
import { h } from '../ui/dom';
import type { View } from '../ui/view';
import { cameraFor, type Size } from './camera';
import { paletteFor, type TimeOfDay } from './daylight';
import { canvasOf, drawFrame, mirrorOf, type Placed } from './draw';
import { usePanel } from './panel';
import { advancePlay, bob, closePanel, tapAt, type Play } from './play';
import { canvasFit, cssToArt, sceneScale, tapToWorld, viewSize } from './scale';
import { drawOrder, type Opens, type Scene } from './things';
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
  /** The walker, facing right. */
  readonly hero: Picture;
  /** Where the walker's feet are in that picture. */
  readonly heroFeet: Point;
  /** The walker's shadow on the ground at `feet`, and the point of it that goes under the feet. */
  shadowAt(feet: Point): { readonly picture: Picture; readonly middle: Point } | null;
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
  let dirty = true;
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
    panel = usePanel(use, time, {
      press: options.press,
      close: () => change(closePanel(play)),
    });
    el.append(panel);
  };

  const change = (next: Play): void => {
    if (next !== play) {
      play = next;
      options.keep(play);
      dirty = true;
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
    dirty = true;
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
    dirty = true;
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

  const draw = (): void => {
    if (device.width === 0 || device.height === 0) return;
    if (canvas.width !== device.width || canvas.height !== device.height) {
      canvas.width = device.width;
      canvas.height = device.height;
    }
    const palette = paletteFor(time);
    const ground = canvasOf(art.ground, palette);
    const hero = canvasOf(art.hero, palette);
    // Art that cannot be painted (jsdom) means no context is asked for either.
    if (!ground || !hero) return;
    ctx ??= canvas.getContext('2d');
    if (!ctx) return;
    const scale = sceneScale(device);
    const feet = round(play.walker.at);
    const left = play.facing === 'left';
    const walker: Placed = {
      image: left ? mirrorOf(hero) : hero,
      // Mirrored, the column under the feet moves to the other side of the picture.
      x: feet.x - (left ? art.hero.grid.w - 1 - art.heroFeet.x : art.heroFeet.x),
      y: feet.y - art.heroFeet.y - bob(play),
    };
    const shadow = art.shadowAt(feet);
    const shadowImage = shadow && canvasOf(shadow.picture, palette);
    const standing: Placed[] = [];
    for (const d of drawOrder(
      scene.things.filter((t) => t.sprite),
      feet.y,
    )) {
      if (d === 'walker') {
        standing.push(walker);
        continue;
      }
      const image = canvasOf(d.sprite!.picture, palette);
      if (image) standing.push({ image, x: d.sprite!.at.x, y: d.sprite!.at.y });
    }
    drawFrame(ctx, {
      backdrop: palette.colours.navy2,
      scale,
      camera: camera(scale),
      ground,
      underfoot:
        shadow && shadowImage
          ? [{ image: shadowImage, x: feet.x - shadow.middle.x, y: feet.y - shadow.middle.y }]
          : [],
      target: play.heading === null ? (play.walker.path.at(-1) ?? null) : null,
      marker: { light: palette.colours.gold1, ink: palette.colours.ink1 },
      standing,
    });
    dirty = false;
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
        dirty = true;
      }
      if (dirty) draw();
    },
  };
}
