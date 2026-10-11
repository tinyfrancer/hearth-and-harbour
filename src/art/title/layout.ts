/**
 * Where everything on the title goes, for any screen. The picture is layers
 * with anchors rather than one bitmap: the sky stretches to fill whatever is
 * above the town, the town is anchored to the waterline at the middle of the
 * screen, the logotype sits in the upper part of the sky, and the water below
 * the town's reflection is a calm band kept for the menu's button and the
 * version line (`safe`).
 *
 * One art pixel is a whole number of device pixels: 3 on a 390-wide 3x phone
 * (one art pixel per CSS pixel), so the town reads at the size it does in the
 * game. The scale is the largest that keeps 360 art pixels across and 560
 * down, so a phone on its side or a tablet still gets the whole composition,
 * just with more sky, land and water round it.
 */
import { cssStep } from '../canvas';

/** The smallest picture the title is composed for, in art pixels. */
export const TITLE_MIN_W = 360;
export const TITLE_MIN_H = 560;

/** The logotype's box at its one size (see logo.ts), in art pixels. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface TitleLayout {
  /** The picture's size in art pixels (one canvas pixel each). */
  readonly w: number;
  readonly h: number;
  /** Device pixels per art pixel: a whole number. */
  readonly scale: number;
  /** CSS pixels per art pixel (scale / dpr). */
  readonly cssPerArt: number;
  /** The middle of the town, across. */
  readonly cx: number;
  /** The waterline at the quay's foot: the row where the town meets the water. */
  readonly wl: number;
  /** Where the logotype's top-left goes. */
  readonly logoX: number;
  readonly logoY: number;
  /** Where the menu may put its button and version line, in art pixels. */
  readonly safe: Box;
  /** The row from which the water is kept calm (the menu's band, when the menu is under the town). */
  readonly calm: number;
}

/** The town's height above the waterline, chimney tops included (smoke rises above it). */
export const TOWN_RISE = 178;
/** How far the town (and the ship and their reflections) reach either side of its middle. */
export const TOWN_HALF = 178;
/** How far below the waterline the town's own reflection reaches before it is sky. */
export const REFLECTION_DEPTH = 112;

/**
 * The layout for a screen `widthCss` by `heightCss` CSS pixels at `dpr`
 * device pixels per CSS pixel, with a logotype `logoW` by `logoH` art pixels.
 */
export function titleLayout(
  widthCss: number,
  heightCss: number,
  dpr: number,
  logoW: number,
  logoH: number,
): TitleLayout {
  const devW = Math.max(1, widthCss * dpr);
  const devH = Math.max(1, heightCss * dpr);
  const scale = Math.max(1, Math.floor(Math.min(devW / TITLE_MIN_W, devH / TITLE_MIN_H) + 1e-9));
  // Pad the canvas so its CSS size is whole device pixels in both directions
  // (at 2.625x only some sizes are): a fractional size is resampled and blurs.
  const step = Math.round(cssStep(dpr) * dpr);
  const fit = (dev: number) => {
    let n = Math.ceil(dev / scale - 1e-9);
    while ((n * scale) % step !== 0) n++;
    return n;
  };
  const w = fit(devW);
  const h = fit(devH);
  const cssPerArt = scale / dpr;
  const cx = Math.floor(w / 2);

  // The logotype: in the upper part of the sky, clear of a notch or island.
  const logoY = Math.round(Math.min(96, Math.max(30, h * 0.07 + 6)));
  const logoX = Math.round((w - logoW) / 2);
  const logoBottom = logoY + logoH;

  // The menu's band: about 150 CSS pixels of calm water at the foot.
  const band = Math.round(Math.max(118, 150 / cssPerArt));
  // The waterline: a little below the middle, but never so high that the
  // town's smoke runs into the logotype, nor so low that the town's
  // reflection runs into the menu's band.
  const lo = logoBottom + 26 + TOWN_RISE;
  const hi = h - band - Math.round(REFLECTION_DEPTH * 0.8);
  const wl = Math.round(Math.max(lo, Math.min(hi, h * 0.57)));

  const safeTop = Math.max(wl + Math.round(REFLECTION_DEPTH * 0.6), h - band);
  const safeW = Math.min(w - 24, Math.round(340 / cssPerArt));
  let safe: Box = {
    x: Math.round((w - safeW) / 2),
    y: safeTop,
    w: safeW,
    h: h - safeTop,
  };
  // A screen much wider than tall (a phone on its side) has little height to
  // spare under the town but water to spare beside it: the calm water to the
  // right of the town, below the hills' foot, when that gives more room.
  const side = cx + TOWN_HALF + 12;
  const sideW = Math.min(safeW, w - side - 12);
  let calm = safe.y;
  if (sideW >= Math.round(280 / cssPerArt) && h - (wl + 12) > safe.h * 1.25) {
    safe = { x: w - 12 - sideW, y: wl + 12, w: sideW, h: h - (wl + 12) };
    calm = wl + Math.round((h - wl) * 0.45);
  }
  return { w, h, scale, cssPerArt, cx, wl, logoX, logoY, safe, calm };
}
