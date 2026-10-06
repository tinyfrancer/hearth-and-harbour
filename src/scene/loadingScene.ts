/*
 * What shows while the town is still coming in: a little scene in the
 * town's own art and colours rather than a plain panel. The harbour from the
 * water, the rowing boat pulling in toward the quay as the work goes on, a
 * gull circling over, the swell moving; the town's name, a line, and a bar.
 *
 * Progress is honest: the boat's place and the bar are the worker's real
 * steps (facts, ground, pixels, town), a quarter at a time, and nothing
 * moves ahead of them. Only the swell, the boat's bob and the gull move with
 * time, which the Town tab passes in.
 *
 * Built from the art lane's doors (its rowing boat and gull, its ramps) and
 * plain cells; nothing new is drawn for it. The scene is 240 x 96 art pixels
 * at the town's own size on screen: one CSS pixel an art pixel at 3x.
 */
import { cell, tgrid, type Picture2, type TGrid } from '../art/town2/cells';
import { town2Piece } from '../art/town2/pieces';
import { rasterize2 } from '../art/town2/raster';
import { h } from '../ui/dom';
import type { TimeOfDay } from './daylight';
import { palette2 } from './town2Paint';

/** The scene's size in art pixels. */
export const CARD_W = 240;
export const CARD_H = 96;

/** Where the water meets the sky, and where the quay's face begins, in art pixels. */
const HORIZON = 34;
const QUAY_X = 198;

/** How long each beat of the swell and the boat's bob lasts. */
export const SWELL_MS = 420;

/** The sky, the far shore, the sea in its swell (`sway` moves it to and fro), and the quay. */
export function harbourGrid(sway: number): TGrid {
  const g = tgrid(CARD_W, CARD_H);
  const put = (x: number, y: number, c: number) => {
    if (x >= 0 && y >= 0 && x < CARD_W && y < CARD_H) g.d[y * CARD_W + x] = c;
  };
  for (let y = 0; y < CARD_H; y++)
    for (let x = 0; x < CARD_W; x++) {
      if (y < HORIZON) {
        // The sky: glass light, a step deeper toward the top, in broad bands.
        put(x, y, cell('glass', y < 10 ? 2 : y < 22 ? 1 : 0));
      } else {
        // The sea: lighter near the horizon, deeper toward us.
        const depth = y < HORIZON + 8 ? 1 : y < HORIZON + 26 ? 2 : 3;
        put(x, y, cell('sea', depth));
      }
    }
  // The far shore: low pine-dark hills along the horizon.
  for (let x = 0; x < CARD_W; x++) {
    const rise = Math.round(5 + 3 * Math.sin(x / 23) + 2 * Math.sin(x / 9 + 1));
    for (let y = HORIZON - rise; y < HORIZON; y++)
      put(x, y, cell('pine', y === HORIZON - rise ? 3 : 4));
  }
  // The swell: short light ripples in rows, rocking to and fro, the nearer rows further.
  for (let row = 0; row < 7; row++) {
    const y = HORIZON + 4 + row * 9;
    const drift = sway * (row % 2 ? 1 : -1) * (1 + (row % 3));
    for (let k = -1; k < CARD_W / 40 + 1; k++) {
      const x0 = k * 40 + ((row * 17) % 40) + drift;
      const len = 5 + ((row + k) % 3) * 2;
      for (let x = x0; x < x0 + len; x++) put(x, y, cell('sea', row < 2 ? 0 : 1));
    }
  }
  // The quay: dressed stone with its coping, standing in the water on the right.
  for (let y = HORIZON - 10; y < CARD_H; y++)
    for (let x = QUAY_X; x < CARD_W; x++) {
      const course = Math.floor((y - HORIZON + 10) / 8);
      const joint = (y - HORIZON + 10) % 8 === 7 || (x + (course % 2) * 9) % 18 === 0;
      const edge = x === QUAY_X;
      const top = y < HORIZON - 7;
      put(x, y, cell('stone', edge ? 6 : top ? 1 : joint ? 4 : course % 2 ? 2 : 3));
    }
  return g;
}

/** Where the boat is with `progress` (0 to 1) of the work done, in art pixels: from off the left to the quay. */
export function boatX(progress: number, boatW: number): number {
  const from = -boatW + 20;
  const to = QUAY_X - boatW - 4;
  return Math.round(from + (to - from) * Math.max(0, Math.min(1, progress)));
}

/** A picture on a canvas of its own, one pixel per art pixel; null where nothing can be drawn. */
function canvasOf(pic: Picture2, time: TimeOfDay): HTMLCanvasElement | null {
  if (typeof ImageData === 'undefined' || typeof document === 'undefined') return null;
  const image = rasterize2(pic, palette2(time), 1);
  const canvas = document.createElement('canvas');
  canvas.width = pic.grid.w;
  canvas.height = pic.grid.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width), 0, 0);
  return canvas;
}

/** The loading card: the scene, the town's name and a line, and the bar of steps. */
export function loadingScene(time: TimeOfDay): {
  el: HTMLElement;
  /** Brings it up to `progress` (0 to 1) at the scene's time `now`. */
  update(progress: number, now: number): void;
} {
  const canvas = h('canvas', { class: 'scene-loading-picture', attrs: { 'aria-hidden': 'true' } });
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  // Whole device pixels an art pixel, at the town's size on screen (3 on a 3x phone).
  const scale = Math.max(1, Math.round(dpr));
  canvas.style.width = `${(CARD_W * scale) / dpr}px`;
  canvas.style.height = `${(CARD_H * scale) / dpr}px`;
  const fill = h('span', { class: 'scene-loading-fill' });
  const el = h('div', { class: 'scene-loading', attrs: { role: 'status' } }, [
    h('div', { class: 'scene-loading-card' }, [
      canvas,
      h('h2', { text: 'Gullwick' }),
      h('p', { text: 'The tide is bringing the town in.' }),
      h('span', { class: 'scene-loading-bar', attrs: { 'aria-hidden': 'true' } }, [fill]),
    ]),
  ]);

  let ctx: CanvasRenderingContext2D | null | undefined;
  let boat: HTMLCanvasElement | null | undefined;
  let gull: HTMLCanvasElement | null | undefined;
  const water = new Map<number, HTMLCanvasElement | null>();
  let shown = '';
  let step = -1;

  const update = (progress: number, now: number): void => {
    // In whole quarters, as steps of a pixel bar rather than a smooth slide.
    const k = Math.round(progress * 4) / 4;
    if (k !== step) {
      step = k;
      fill.style.transform = `scaleX(${k})`;
    }
    const beat = Math.floor(Math.max(0, now) / SWELL_MS);
    const key = `${k} ${beat}`;
    if (key === shown) return;
    shown = key;
    if (ctx === undefined) ctx = typeof ImageData === 'undefined' ? null : canvas.getContext('2d');
    if (!ctx) return;
    // The art lane's own boat and gull, drawn once.
    boat ??= canvasOf(town2Piece('rowboat').picture, time);
    gull ??= canvasOf(town2Piece('gull').picture, time);
    const phase = beat % 4;
    // To and fro in four beats: 0, 1, 2, 1, so the loop has no jump.
    if (!water.has(phase))
      water.set(phase, canvasOf({ grid: harbourGrid([0, 1, 2, 1][phase]!), glows: [] }, time));
    const sea = water.get(phase);
    if (sea) ctx.drawImage(sea, 0, 0);
    if (gull) {
      const a = (beat % 30) / 30;
      const gx = Math.round(40 + 140 * a);
      const gy = Math.round(8 + 4 * Math.sin(a * Math.PI * 4));
      ctx.drawImage(gull, gx, gy);
    }
    if (boat) {
      const bob = beat % 2;
      ctx.drawImage(boat, boatX(k, boat.width), CARD_H - boat.height - 6 + bob);
    }
  };
  update(0, 0);
  return { el, update };
}
