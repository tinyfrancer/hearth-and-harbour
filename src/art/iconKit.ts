/**
 * How an icon is made: a drawing of one object as rows of characters with a
 * legend of its own, set in the middle of a 22 x 22 square and given the
 * automatic outline, so every icon is 24 x 24. Icons are their own drawings,
 * never shrunken gear or scenery: an object alone, turned to show its best
 * side, lit from the upper left like everything else.
 */
import { blit, grid, outline, parseSprite, type Grid, type Legend } from './grid';

/** The drawing area inside the outline. */
export const ICON_INNER = 22;
/** An icon's size with its outline. */
export const ICON_SIZE = ICON_INNER + 2;

export interface IconDef {
  readonly rows: readonly string[];
  readonly legend: Legend;
}

/** A family's drawing in one of its materials: each key character swapped for another. */
export function recolour(rows: readonly string[], swap: Readonly<Record<string, string>>) {
  return rows.map((row) => [...row].map((ch) => swap[ch] ?? ch).join(''));
}

/**
 * The drawing centred in the 22 x 22 square (a spare pixel goes right or
 * down) and outlined. A drawing larger than the square is a mistake.
 */
export function iconGrid(def: IconDef): Grid {
  const drawn = parseSprite(def.rows, def.legend);
  let x0 = drawn.w;
  let y0 = drawn.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < drawn.h; y++)
    for (let x = 0; x < drawn.w; x++)
      if (drawn.d[y * drawn.w + x]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  if (w > ICON_INNER || h > ICON_INNER || w <= 0) {
    throw new Error(`An icon must fit in ${ICON_INNER} x ${ICON_INNER}; this one is ${w} x ${h}.`);
  }
  const square = grid(ICON_INNER, ICON_INNER);
  blit(square, drawn, Math.ceil((ICON_INNER - w) / 2) - x0, Math.ceil((ICON_INNER - h) / 2) - y0);
  return outline(square);
}
