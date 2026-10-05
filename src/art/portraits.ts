/**
 * Faces, 48 x 48: a monster in the fight screen, a person in a panel, the
 * hero on the sheet. Another of the art lane's doors: the game asks by plain
 * id and shows a portrait if art has drawn one. An id with no portrait is
 * null, so the game never waits for a picture.
 *
 * The fight screen frames a portrait at 3x (144 CSS pixels inside its
 * border) and its lists at 2x (96), and places what it is given without
 * resizing it. The door is told only the id, so the element carries both
 * sizes, each a whole number of device pixels per art pixel, and `art.css`
 * shows whichever fits the frame it lands in.
 */
import { pixelCanvas } from './canvas';
import { FACES } from './faces';
import { blit, ellipse, get, grid, outline, parseSprite, set } from './grid';
import { DAY } from './palette';
import { picture, type Picture } from './raster';

/** A portrait's size in art pixels. */
export const PORTRAIT_SIZE = 48;

/** Every id art has drawn a face for. */
export const PORTRAIT_IDS: readonly string[] = Object.keys(FACES);

const pictures = new Map<string, Picture>();

/** The disc's centre and radius, in art pixels. */
const DISC = { x: 24, y: 25, r: 21.5 } as const;

/**
 * A face as a picture: the dark tinted disc, its upper-left rim catching the
 * light, and the outlined bust in front, cut by the bottom of the square.
 * Null for an id art has not drawn.
 */
export function portraitPicture(id: string): Picture | null {
  if (!Object.hasOwn(FACES, id)) return null;
  let pic = pictures.get(id);
  if (!pic) {
    const def = FACES[id]!;
    const g = grid(PORTRAIT_SIZE, PORTRAIT_SIZE);
    ellipse(g, DISC.x, DISC.y, DISC.r, DISC.r, def.disc[0]);
    const rim: [number, number][] = [];
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        if (!get(g, x, y)) continue;
        const edge = !get(g, x - 1, y) || !get(g, x, y - 1) || !get(g, x - 1, y - 1);
        if (edge && x + y < PORTRAIT_SIZE) rim.push([x, y]);
      }
    for (const [x, y] of rim) set(g, x, y, def.disc[1]);
    // The outline adds a pixel on every side; the bust is drawn on the whole square.
    blit(g, outline(parseSprite(def.rows, def.legend)), -1, -1);
    pic = picture(g);
    pictures.set(id, pic);
  }
  return pic;
}

/**
 * Device pixels per art pixel for the two frames on this screen: 3 and 2 CSS
 * pixels per art pixel, rounded down to whole device pixels so a face never
 * outgrows its frame (9 and 6 on a 3x phone, 7 and 5 at 2.625).
 */
export function portraitScales(dpr: number): { large: number; small: number } {
  return {
    large: Math.max(1, Math.floor(3 * dpr + 1e-9)),
    small: Math.max(1, Math.floor(2 * dpr + 1e-9)),
  };
}

export function portrait(id: string): Element | null {
  const pic = portraitPicture(id);
  if (!pic) return null;
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const scales = portraitScales(dpr);
  const el = document.createElement('div');
  el.className = 'portrait-art';
  for (const size of ['large', 'small'] as const) {
    const canvas = pixelCanvas(pic, { palette: DAY, scale: scales[size], dpr });
    canvas.classList.add(`portrait-${size}`);
    el.append(canvas);
  }
  return el;
}
