/**
 * Turns a picture into pixels: palette steps become colours, evening glows
 * are added, and every art pixel becomes a square of `scale` x `scale`
 * device pixels. Pure, so it can be tested without a canvas; `canvas.ts`
 * only copies the result onto one.
 */
import type { Grid } from './grid';
import { GLOW_RGB, rgbOf, type Palette } from './palette';

/**
 * A warm light: (x, y) and radius in art pixels, strength the opacity at its
 * centre. Most only shine when the palette has its lights on (dusk); a fire
 * that is always burning shines by day too.
 */
export interface Glow {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly strength: number;
  readonly always?: boolean;
  /**
   * Shines only by daylight, when the lights are off: a forge's daytime
   * glow, which its larger evening glow replaces at dusk.
   */
  readonly byDay?: boolean;
}

/** A drawing and the lights in it. */
export interface Picture {
  readonly grid: Grid;
  readonly glows: readonly Glow[];
}

export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  /** Row by row, four bytes per pixel, as ImageData wants it. */
  readonly data: Uint8ClampedArray;
}

export function picture(g: Grid, glows: readonly Glow[] = []): Picture {
  return { grid: g, glows };
}

/** One RGBA value per art pixel, glows included. Transparent where nothing is drawn. */
export function colourPixels(pic: Picture, palette: Palette): Float64Array {
  const { w, h, d } = pic.grid;
  const out = new Float64Array(w * h * 4);
  const cache = new Map<string, [number, number, number]>();
  for (let i = 0; i < d.length; i++) {
    const shade = d[i];
    if (!shade) continue;
    let rgb = cache.get(shade);
    if (!rgb) {
      rgb = rgbOf(palette.colours[shade]);
      cache.set(shade, rgb);
    }
    out.set([rgb[0], rgb[1], rgb[2], 255], i * 4);
  }
  for (const glow of pic.glows) {
    if (shines(glow, palette)) addGlow(out, w, h, glow);
  }
  return out;
}

/** Whether a glow is lit in this palette. */
export function shines(glow: Glow, palette: Pick<Palette, 'lightsOn'>): boolean {
  return glow.byDay ? !palette.lightsOn : glow.always === true || palette.lightsOn;
}

/**
 * Adds light the way a canvas does with 'lighter' and a radial gradient: the
 * light fades from `strength` at the centre to nothing at the radius,
 * sampled at each pixel's centre, and adds to what is there. `px` is one
 * RGBA value per art pixel, as `colourPixels` makes (the C-scale town's
 * raster shares it).
 */
export function addGlow(px: Float64Array, w: number, h: number, glow: Glow): void {
  const x0 = Math.max(0, Math.floor(glow.x - glow.radius));
  const x1 = Math.min(w - 1, Math.ceil(glow.x + glow.radius));
  const y0 = Math.max(0, Math.floor(glow.y - glow.radius));
  const y1 = Math.min(h - 1, Math.ceil(glow.y + glow.radius));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dist = Math.hypot(x + 0.5 - glow.x, y + 0.5 - glow.y);
      if (dist >= glow.radius) continue;
      const alpha = glow.strength * (1 - dist / glow.radius);
      const i = (y * w + x) * 4;
      const a = (px[i + 3] as number) / 255;
      // Premultiply, add, and divide back out, so light on an empty pixel is a halo.
      const outA = Math.min(1, a + alpha);
      for (let c = 0; c < 3; c++) {
        const sum = Math.min(255, (px[i + c] as number) * a + (GLOW_RGB[c] as number) * alpha);
        px[i + c] = outA > 0 ? sum / outA : 0;
      }
      px[i + 3] = outA * 255;
    }
}

/** The picture at `scale` device pixels per art pixel. `scale` must be a whole number. */
export function rasterize(pic: Picture, palette: Palette, scale = 1): RgbaImage {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error(`Art is drawn at a whole number of device pixels, not ${scale}.`);
  }
  const { w, h } = pic.grid;
  const art = colourPixels(pic, palette);
  const width = w * scale;
  const height = h * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const from = (y * w + x) * 4;
      if (art[from + 3] === 0) continue;
      const rgba = art.subarray(from, from + 4);
      for (let j = 0; j < scale; j++) {
        let to = ((y * scale + j) * width + x * scale) * 4;
        for (let i = 0; i < scale; i++, to += 4) data.set(rgba, to);
      }
    }
  }
  return { width, height, data };
}
