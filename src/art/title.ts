/**
 * The title screen's picture: the harbour at dusk, the town across the water
 * as the lamps come on, and the name in gilt over the sky. Owned by the art
 * lane; the menu puts its button and version line inside `safe`.
 *
 * One canvas pixel per art pixel, enlarged by CSS with pixelated rendering
 * (as the town is), at a whole number of device pixels per art pixel. The
 * still layers are built on the first `draw` and kept; each frame copies
 * them and redraws only what moves (water, smoke, lights, stars, clouds,
 * gulls, the flag, the buoy). `draw(ms)` depends only on `ms`: any frame can
 * be painted on its own, in any order.
 *
 * Reduced motion: call `draw(0)` once and never again; frame 0 is a composed
 * still.
 */
import { TitleScene } from './title/scene';

/** How often to redraw while the title is showing, in ms; nothing on it needs more. */
export const TITLE_FRAME_MS = 125;

interface TitleSceneHandle {
  /** The picture. Its CSS size covers the screen asked for (by under one art pixel more). */
  readonly canvas: HTMLCanvasElement;
  /** Paints the picture at time `ms` (any number; the same `ms` always paints the same frame). */
  draw(ms: number): void;
  /** Where the menu may place its button and version line, in CSS pixels from the canvas's top-left. */
  readonly safe: { x: number; y: number; w: number; h: number };
  /** Lets go of the pixels and the canvas's memory; the handle draws nothing after. */
  dispose(): void;
}

/** The title scene for a screen `widthCss` by `heightCss` CSS pixels at `dpr`. */
export function titleScene(widthCss: number, heightCss: number, dpr: number): TitleSceneHandle {
  let scene: TitleScene | null = new TitleScene(widthCss, heightCss, dpr);
  const L = scene.layout;
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-art title-scene';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Hearth & Harbour: the harbour at dusk');
  canvas.width = L.w;
  canvas.height = L.h;
  canvas.style.width = `${L.w * L.cssPerArt}px`;
  canvas.style.height = `${L.h * L.cssPerArt}px`;
  let ctx: CanvasRenderingContext2D | null = null;
  let image: ImageData | null = null;
  const k = L.cssPerArt;
  return {
    canvas,
    safe: { x: L.safe.x * k, y: L.safe.y * k, w: L.safe.w * k, h: L.safe.h * k },
    draw(ms: number) {
      if (!scene) return;
      const px = scene.frame(ms);
      // Without pixel support (jsdom) the frame is still worked out; there is nothing to show it on.
      if (typeof ImageData === 'undefined') return;
      ctx ??= canvas.getContext('2d');
      if (!ctx) return;
      image ??= new ImageData(new Uint8ClampedArray(px.buffer as ArrayBuffer), L.w, L.h);
      ctx.putImageData(image, 0, 0);
    },
    dispose() {
      scene = null;
      image = null;
      ctx = null;
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
