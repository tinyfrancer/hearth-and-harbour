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
 * plain cells; nothing new is drawn for it. The scene is 296 x 100 art pixels
 * at the town's own size on screen: one CSS pixel an art pixel at 3x, so the
 * boat (the town's own, at its own size) is under half the picture's width.
 */
import { cell, darker, tgrid, type Picture2, type TGrid } from '../art/town2/cells';
import { town2Piece } from '../art/town2/pieces';
import { rasterize2 } from '../art/town2/raster';
import { h } from '../ui/dom';
import type { TimeOfDay } from './daylight';
import { palette2 } from './town2Paint';

/** The scene's size in art pixels. */
export const CARD_W = 296;
export const CARD_H = 100;

/** Where the water meets the sky, and where the quay's face begins, in art pixels. */
const HORIZON = 38;
const QUAY_X = 254;

/** How long each beat of the swell and the boat's bob lasts. */
export const SWELL_MS = 420;

/** A steady small number for a place, 0 to 1: where a band's edge breaks. */
const jitter = (x: number, k: number): number => {
  let h = Math.imul(x * 374761393 + k * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((Math.imul(h, 1103515245) >>> 8) & 1023) / 1023;
};

/** Where on the water the boat's own shadow falls: under its hull, as wide as it, a few rows deep. */
export interface BoatShadow {
  /** The boat's picture's left edge and its lowest drawn row, in the scene. */
  readonly x: number;
  readonly bottom: number;
  /** For each column of the boat's picture, its lowest drawn row from its top (-1 for none). */
  readonly keel: readonly number[];
  readonly top: number;
}

/**
 * The sky, the far shore, the sea in its swell (`sway` moves it to and fro),
 * the quay, and under the boat (if given) its shadow on the water.
 *
 * The sky darkens upward in the glass ramp's steps, each band's edge broken
 * in clumps rather than ruled straight, with a cloud or two in sailcloth's
 * light steps; the shadow is the sea's own colour two steps down where the
 * hull sits on it, one step round that, longest under the middle of the hull.
 */
export function harbourGrid(sway: number, boat?: BoatShadow): TGrid {
  const g = tgrid(CARD_W, CARD_H);
  const put = (x: number, y: number, c: number) => {
    if (x >= 0 && y >= 0 && x < CARD_W && y < CARD_H) g.d[y * CARD_W + x] = c;
  };
  const get = (x: number, y: number) => g.d[y * CARD_W + x] ?? 0;
  // The sky in four bands, lightest at the horizon, each edge ragged in clumps of three or four columns.
  const edges = [9, 18, 28];
  for (let x = 0; x < CARD_W; x++) {
    const clump = Math.floor(x / 4);
    const breaks = edges.map((e, i) => e + Math.round((jitter(clump, i) - 0.5) * 3));
    for (let y = 0; y < HORIZON; y++) {
      const band = breaks.filter((b) => y >= b).length;
      put(x, y, cell('glass', 3 - band));
    }
  }
  // A cloud or two: lumps of sailcloth, light on top and a step down beneath.
  for (const [cx, cy, w] of [
    [52, 11, 26],
    [150, 7, 18],
    [214, 15, 22],
  ] as const) {
    for (let x = cx - w; x <= cx + w; x++) {
      const t = (x - cx) / w;
      const lift = Math.round((1 - t * t) * 5 + jitter(x >> 2, 7) * 2);
      for (let y = cy - lift; y <= cy + 1; y++) put(x, y, cell('sail', y >= cy ? 2 : 1));
    }
  }
  // The sea: lighter near the horizon, deeper toward us.
  for (let y = HORIZON; y < CARD_H; y++)
    for (let x = 0; x < CARD_W; x++) {
      const depth = y < HORIZON + 8 ? 1 : y < HORIZON + 28 ? 2 : 3;
      put(x, y, cell('sea', depth));
    }
  // The far shore: low pine-dark hills along the horizon.
  for (let x = 0; x < CARD_W; x++) {
    const rise = Math.round(5 + 3 * Math.sin(x / 23) + 2 * Math.sin(x / 9 + 1));
    for (let y = HORIZON - rise; y < HORIZON; y++)
      put(x, y, cell('pine', y === HORIZON - rise ? 3 : 4));
  }
  // The swell: long low crests in rows, rocking to and fro, the nearer rows further and longer.
  for (let row = 0; row < 7; row++) {
    const y = HORIZON + 4 + row * 9;
    const drift = sway * (row % 2 ? 1 : -1) * (1 + (row % 3));
    const every = 30 + row * 4;
    for (let k = -1; k < CARD_W / every + 1; k++) {
      const x0 = k * every + ((row * 17) % every) + drift;
      const len = 6 + row + ((row + k) % 3) * 3;
      for (let x = x0; x < x0 + len; x++) put(x, y, cell('sea', row < 2 ? 0 : 1));
      // A trough under each crest, a step down, a little shorter.
      for (let x = x0 + 2; x < x0 + len - 2; x++)
        if (y + 1 < CARD_H) put(x, y + 1, cell('sea', Math.min(4, (row < 2 ? 1 : 2) + 1)));
    }
  }
  if (boat) {
    // The boat's shadow on the water: under the hull, deepest at its middle.
    const cols = boat.keel.length;
    for (let i = 0; i < cols; i++) {
      const keel = boat.keel[i]!;
      if (keel < 0) continue;
      const x = boat.x + i;
      const along = Math.abs(i - cols / 2) / (cols / 2);
      const deep = Math.round(5 * (1 - along * along)) + 2;
      for (let j = 1; j <= deep; j++) {
        const y = boat.top + keel + j;
        if (y < HORIZON || y >= CARD_H || x < 0 || x >= CARD_W) continue;
        const c = get(x, y);
        put(x, y, darker(c, j <= deep - 2 ? 2 : 1));
      }
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
  // The quay's foot in the water: a dark line where the stone meets the sea.
  for (let y = HORIZON; y < CARD_H; y++) put(QUAY_X - 1, y, darker(get(QUAY_X - 1, y), 2));
  return g;
}

/** The lowest drawn row of each column of a picture (-1 where a column is empty): where a hull meets the water. */
export function keelOf(grid: TGrid): number[] {
  const out: number[] = [];
  for (let x = 0; x < grid.w; x++) {
    let low = -1;
    for (let y = grid.h - 1; y >= 0; y--)
      if (grid.d[y * grid.w + x]) {
        low = y;
        break;
      }
    out.push(low);
  }
  return out;
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
  const water = new Map<string, HTMLCanvasElement | null>();
  let keel: number[] | null = null;
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
    const boatPic = town2Piece('rowboat').picture.grid;
    keel ??= keelOf(boatPic);
    const bx = boatX(k, boatPic.w);
    const by = CARD_H - boatPic.h - 6;
    // To and fro in four beats: 0, 1, 2, 1, so the loop has no jump; the boat's shadow where it is.
    const seaKey = `${phase} ${bx}`;
    if (!water.has(seaKey))
      water.set(
        seaKey,
        canvasOf(
          {
            grid: harbourGrid([0, 1, 2, 1][phase]!, { x: bx, top: by, bottom: by, keel }),
            glows: [],
          },
          time,
        ),
      );
    const sea = water.get(seaKey);
    if (sea) ctx.drawImage(sea, 0, 0);
    if (gull) {
      const a = (beat % 30) / 30;
      const gx = Math.round(40 + 180 * a);
      const gy = Math.round(8 + 4 * Math.sin(a * Math.PI * 4));
      ctx.drawImage(gull, gx, gy);
    }
    if (boat) {
      const bob = beat % 2;
      ctx.drawImage(boat, bx, by + bob);
    }
  };
  update(0, 0);
  return { el, update };
}
