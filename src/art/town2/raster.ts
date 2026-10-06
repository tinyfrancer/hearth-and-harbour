/**
 * Turns a C-scale picture into pixels, and keeps the result on canvases so
 * it is drawn once and reused. Cells become colours through a palette, the
 * evening glows are added with the same light as the current art
 * (`addGlow` in ../raster.ts), and each art pixel becomes `scale` x `scale`
 * device pixels.
 */
import { deviceSize } from '../canvas';
import { addGlow, shines, type RgbaImage } from '../raster';
import type { Picture2 } from './cells';
import type { Palette2 } from './ramps';

/** One RGBA value per art pixel, glows included. Transparent where nothing is drawn. */
export function colourCells(pic: Picture2, palette: Palette2): Float64Array {
  const { w, h, d } = pic.grid;
  const out = new Float64Array(w * h * 4);
  const rgb = palette.rgb;
  for (let i = 0; i < d.length; i++) {
    const c = d[i] as number;
    if (!c) continue;
    const o = i * 4;
    out[o] = rgb[c * 3] as number;
    out[o + 1] = rgb[c * 3 + 1] as number;
    out[o + 2] = rgb[c * 3 + 2] as number;
    out[o + 3] = 255;
  }
  for (const glow of pic.glows) if (shines(glow, palette)) addGlow(out, w, h, glow);
  return out;
}

/** The picture at `scale` device pixels per art pixel. `scale` must be a whole number. */
export function rasterize2(pic: Picture2, palette: Palette2, scale = 1): RgbaImage {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error(`Art is drawn at a whole number of device pixels, not ${scale}.`);
  }
  const { w, h } = pic.grid;
  const art = colourCells(pic, palette);
  const width = w * scale;
  const data = new Uint8ClampedArray(width * h * scale * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const from = (y * w + x) * 4;
      if (art[from + 3] === 0) continue;
      const rgba = art.subarray(from, from + 4);
      for (let j = 0; j < scale; j++) {
        let to = ((y * scale + j) * width + x * scale) * 4;
        for (let i = 0; i < scale; i++, to += 4) data.set(rgba, to);
      }
    }
  return { width, height: h * scale, data };
}

/** Copies an image onto a canvas of its size. Without pixel support (jsdom) it only sizes it. */
function put(canvas: HTMLCanvasElement, image: RgbaImage, width: number, height: number): void {
  canvas.width = width;
  canvas.height = height;
  if (typeof ImageData === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.putImageData(new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width), 0, 0);
}

/**
 * A canvas element showing `pic` at `scale` device pixels per art pixel,
 * sized so its pixels land exactly on device pixels (as `pixelCanvas` does
 * for the current art).
 */
export function pixelCanvas2(
  pic: Picture2,
  palette: Palette2,
  scale: number,
  dpr: number,
  label?: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-art';
  if (label) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
  }
  const width = deviceSize(pic.grid.w, scale, dpr);
  const height = deviceSize(pic.grid.h, scale, dpr);
  canvas.style.width = `${width / dpr}px`;
  canvas.style.height = `${height / dpr}px`;
  put(canvas, rasterize2(pic, palette, scale), width, height);
  return canvas;
}

/** Redraws a canvas made by `pixelCanvas2` with a picture of the same size (another palette or time of day). */
export function repaint2(
  canvas: HTMLCanvasElement,
  pic: Picture2,
  palette: Palette2,
  scale: number,
): void {
  put(canvas, rasterize2(pic, palette, scale), canvas.width, canvas.height);
}

const sprites = new Map<string, HTMLCanvasElement>();

/**
 * The picture on an offscreen canvas at one pixel per art pixel, made once
 * per key and palette and kept. A scene draws it with `drawImage` at its
 * scale (image smoothing off), so a frame never re-rasterizes anything.
 * Memory is width x height x 4 bytes per canvas kept.
 */
export function spriteCanvas(key: string, pic: Picture2, palette: Palette2): HTMLCanvasElement {
  const id = `${key} ${palette.name}`;
  let canvas = sprites.get(id);
  if (!canvas) {
    canvas = document.createElement('canvas');
    put(canvas, rasterize2(pic, palette, 1), pic.grid.w, pic.grid.h);
    sprites.set(id, canvas);
  }
  return canvas;
}

/** Lets go of every kept canvas (a scene leaving the town can free the memory). */
export function forgetSprites(): void {
  sprites.clear();
}
