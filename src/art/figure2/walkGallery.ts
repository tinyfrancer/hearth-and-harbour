/**
 * Walking figures for the art gallery (B9): a figure walking toward the
 * camera, to the right, to the left, and standing breathing, side by side on
 * one canvas, animated. Each frame is the door's kept sprite (one pixel per
 * art pixel) drawn up to game scale with `drawImage`; nothing is rasterized
 * while it plays. A preview stops itself once it is taken off the page.
 */
import { deviceSize } from '../canvas';
import {
  FIGURE2_H,
  FIGURE2_W,
  IDLE2_FRAMES,
  IDLE2_FRAME_MS,
  WALK2_FRAMES,
  WALK2_FRAME_MS,
  type Facing2,
} from '../character2';
import type { TimeOfDay } from '../town2/ramps';

/** What a preview shows: a walk frame, or a breathing frame. */
export interface Walker2 {
  readonly walk: (time: TimeOfDay, facing: Facing2, frame: number) => HTMLCanvasElement | null;
  readonly idle: (time: TimeOfDay, frame: number) => HTMLCanvasElement | null;
  /** How long each walk frame shows (townsfolk stroll slower). */
  readonly frameMs?: number;
}

const FACINGS: readonly Facing2[] = ['down', 'right', 'left'];
const GAP = 8;

/**
 * A canvas showing `who` walking down, right and left, and breathing, at
 * `scale` device pixels per art pixel. `time` is read every frame, so the
 * gallery's dusk button turns it at once.
 */
export function walkPreview(
  who: Walker2,
  scale: number,
  dpr: number,
  time: () => TimeOfDay,
  label: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-art';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  const cell = FIGURE2_W + GAP;
  const artW = cell * 4 - GAP;
  canvas.width = deviceSize(artW, scale, dpr);
  canvas.height = deviceSize(FIGURE2_H, scale, dpr);
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const frameMs = who.frameMs ?? WALK2_FRAME_MS;
  const start = performance.now();
  let last = '';
  const paint = (now: number) => {
    const t = now - start;
    const walkFrame = Math.floor(t / frameMs) % WALK2_FRAMES;
    const idleFrame = Math.floor(t / IDLE2_FRAME_MS) % IDLE2_FRAMES;
    // Only when a frame changes: the sprites are kept, so this is a few drawImages.
    const key = `${time()} ${walkFrame} ${idleFrame}`;
    if (key === last) return;
    last = key;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sprites = [
      ...FACINGS.map((f) => who.walk(time(), f, walkFrame)),
      who.idle(time(), idleFrame),
    ];
    sprites.forEach((s, i) => {
      if (s) ctx.drawImage(s, i * cell * scale, 0, FIGURE2_W * scale, FIGURE2_H * scale);
    });
  };
  paint(start);
  let raf = 0;
  const tick = (now: number) => {
    // Taken off the page: stop.
    if (!canvas.isConnected && now - start > 1000) return;
    paint(now);
    raf = requestAnimationFrame(tick);
  };
  if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(tick);
  void raf;
  return canvas;
}
