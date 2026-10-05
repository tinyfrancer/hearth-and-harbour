import { h } from '../ui/dom';
import type { View } from '../ui/view';
import { cameraFor, type Size } from './camera';
import { drawFrame, paintGround, type Looks } from './draw';
import { deviceSize, sceneScale, tapToWorld, viewSize } from './scale';
import { mapSize, type TileMap } from './tileMap';
import { step, walkTo, type Walker } from './walker';

/**
 * The longest frame the walk takes in one go. A page coming back from the
 * background gets one huge frame; the walker should carry on from where it was
 * rather than appear at the end of its walk.
 */
const MAX_FRAME_MS = 250;

/**
 * How many frames a stage waits to be put on the page before it gives up. The
 * shell attaches a view as soon as it is built, so this only stops a loop for
 * one that was built and thrown away.
 */
const ATTACH_FRAMES = 60;

export interface StageOptions<K extends string> {
  readonly map: TileMap<K>;
  readonly looks: Looks<K>;
  readonly walker: Walker;
  /** Told where the walker is after every move, so a rebuilt stage can carry on from there. */
  readonly onMove?: (walker: Walker) => void;
  /** What a screen reader hears for the canvas. */
  readonly label: string;
  /** Shown instead of the scene by a browser that cannot draw one. */
  readonly fallback: string;
}

/**
 * A scene on a canvas that fills its container: the ground, a walker who goes
 * where the player taps, and a camera that follows them.
 *
 * It runs its own animation loop, because the shell only ticks views while an
 * idle action is running and a walk must go on either way. The loop stops by
 * itself on the first frame the stage is no longer on the page.
 */
export function stage<K extends string>(options: StageOptions<K>): View {
  const { map, looks, onMove } = options;
  const world = mapSize(map);
  const canvas = h(
    'canvas',
    { class: 'scene-canvas', attrs: { role: 'img', 'aria-label': options.label } },
    [options.fallback],
  );
  const el = h('div', { class: 'scene' }, [canvas]);

  let walker = options.walker;
  /** The canvas in device pixels and in CSS pixels; zero until it has been laid out. */
  let device: Size = { width: 0, height: 0 };
  let css: Size = { width: 0, height: 0 };
  let ctx: CanvasRenderingContext2D | null = null;
  let ground: HTMLCanvasElement | null = null;
  let dirty = true;
  let last: number | null = null;
  let attached = false;
  let waited = 0;

  const camera = (scale: number) => cameraFor(walker.at, viewSize(device, scale), world);

  const resize = (next: Size, nextCss: Size): void => {
    css = nextCss;
    if (next.width === device.width && next.height === device.height) return;
    device = next;
    dirty = true;
  };

  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const cssSize = { width: entry.contentRect.width, height: entry.contentRect.height };
      const exact = entry.devicePixelContentBoxSize?.[0];
      resize(
        deviceSize(
          cssSize,
          window.devicePixelRatio || 1,
          exact && { width: exact.inlineSize, height: exact.blockSize },
        ),
        cssSize,
      );
    });
    try {
      observer.observe(canvas, { box: 'device-pixel-content-box' });
    } catch {
      // Safari does not know that box and refuses it; the content box is the fallback.
      observer.observe(canvas);
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || device.width === 0) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scale = sceneScale(device);
    const tap = tapToWorld(
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      css.width ? css : { width: rect.width, height: rect.height },
      device,
      scale,
      camera(scale),
    );
    walker = walkTo(map, walker, tap);
    onMove?.(walker);
    dirty = true;
  });

  const draw = (): void => {
    if (device.width === 0 || device.height === 0) return;
    if (canvas.width !== device.width || canvas.height !== device.height) {
      canvas.width = device.width;
      canvas.height = device.height;
    }
    ctx ??= canvas.getContext('2d');
    if (!ground) {
      ground = document.createElement('canvas');
      if (!paintGround(map, looks, ground)) ground = null;
    }
    if (!ctx || !ground) return;
    const scale = sceneScale(device);
    drawFrame(ctx, {
      ground,
      scale,
      camera: camera(scale),
      walker: walker.at,
      target: walker.path.at(-1) ?? null,
    });
    dirty = false;
  };

  const frame = (time: number): void => {
    if (!el.isConnected) {
      if (attached || ++waited > ATTACH_FRAMES) {
        observer?.disconnect();
        return;
      }
      requestAnimationFrame(frame);
      return;
    }
    attached = true;
    const ms = last === null ? 0 : Math.min(time - last, MAX_FRAME_MS);
    last = time;
    const moved = step(walker, ms);
    if (moved !== walker) {
      walker = moved;
      onMove?.(walker);
      dirty = true;
    }
    if (dirty) draw();
    requestAnimationFrame(frame);
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);

  return { el };
}
