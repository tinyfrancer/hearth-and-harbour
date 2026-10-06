/**
 * A look at the C scale: the creator's choices (the same `LOOK_CHOICES` as
 * the current character, so the creator needs no change) as ramp swaps. The
 * figure is drawn in `skin`, `hair` and `brow`; a look swaps skin and hair for
 * its tone and colour, and brows for its hair colour at the steps that show
 * on its skin: a dark brow on fair skin, a deeper one where hair and skin are
 * close, a pale one when the hair is lighter than the skin (blonde or grey on
 * brown or deep skin), so brows read on every combination.
 */
import { DEFAULT_LOOK, type Look } from '../character';
import { cell, matOf, stepOf, type Cell } from '../town2/cells';
import { DAY2, type Mat } from '../town2/ramps';

export const SKIN2: Readonly<Record<string, Mat>> = {
  fair: 'skin',
  pale: 'skinpale',
  golden: 'skingolden',
  brown: 'skinbrown',
  deep: 'skindeep',
};

export const HAIR_COLOUR2: Readonly<Record<string, Mat>> = {
  brown: 'hair',
  black: 'hairblack',
  chestnut: 'chestnut',
  auburn: 'auburn',
  blonde: 'hairblonde',
  grey: 'hairgrey',
};

/** Relative luminance of a step by day. */
export function luminance(mat: Mat, step: number): number {
  const hex = DAY2.colours[mat][step]!;
  const lin = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** How far apart two steps are in contrast (1 is none). */
export function contrast(a: Mat, sa: number, b: Mat, sb: number): number {
  const [hi, lo] = [luminance(a, sa), luminance(b, sb)].sort((m, n) => n - m) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * How far a brow drawn at steps 3 and 4 moves for this hair on this skin:
 * the least move, darker if the hair is darker than the skin and lighter if
 * not, that keeps both steps clear of the skin's lit step.
 */
export function browShift(skin: Mat, hair: Mat): number {
  const darker = luminance(hair, 3) < luminance(skin, 1);
  const tries = darker ? [0, 1, 2] : [-1, -2, -3];
  const clear = (shift: number) =>
    [3, 4].every(
      (s) => contrast(hair, Math.max(1, Math.min(5, s + shift)), skin, 1) >= BROW_CONTRAST,
    );
  return tries.find(clear) ?? tries[tries.length - 1]!;
}

/** How far a brow stands from the skin it is drawn on, at least. */
export const BROW_CONTRAST = 1.6;

/** The whole look as one cell swap. Unknown choices fall back to the default. */
export function lookSwap(look: Partial<Look>): (c: Cell) => Cell {
  const skin = SKIN2[look.skin ?? ''] ?? SKIN2[DEFAULT_LOOK.skin]!;
  const hair = HAIR_COLOUR2[look.hairColour ?? ''] ?? HAIR_COLOUR2[DEFAULT_LOOK.hairColour]!;
  const shift = browShift(skin, hair);
  return (c) => {
    const m = matOf(c);
    if (m === 'skin') return cell(skin, stepOf(c));
    if (m === 'hair') return cell(hair, stepOf(c));
    if (m === 'brow') return cell(hair, Math.max(1, Math.min(5, stepOf(c) + shift)));
    return c;
  };
}
