/**
 * Beards for the C-scale head (B13; Cody: "Need more hairstyles/beard
 * options"), drawn in the `hair` ramp so a look's hair colour colours them.
 * Each is drawn by hand from the front (on the H2 head: the mouth on row 17,
 * the jaw on 19), in profile (the jaw running from under the ear to the chin)
 * and from behind (only what shows past the jaw and neck), and in the hero's
 * portrait (heroFace.ts).
 *
 * A beard is a solid shaded mass with a silhouette, never a stipple; stubble
 * is one darker tone over the jaw with a broken top edge. The mouth always
 * shows (a moustache sits on the upper lip, a beard parts under the lower
 * one), and nothing covers an eye. A beard is worn over head gear: it sits on
 * the chin below a helm's rim and flows over a hood's cape, as long hair does
 * over a collar.
 */
import { DEPTH } from '../depth';
import { HEAD_AT } from './body';
import type { Gear2, Part2, Pins } from './engine';

const [HX, HY] = HEAD_AT;
const PX = HX - 1;

/**
 * Where a beard falls below the jaw (row 20 down) it lies over head gear (a
 * hood's cape, a helm's aventail) and under a shield; above it, on the cheeks
 * and chin, it is under head gear like hair, so a hood's sides cover the
 * cheeks and only what is in its opening shows.
 */
export const BEARD_DEPTH = DEPTH.HELMET + 3;
const BELOW_JAW = HEAD_AT[1] + 14;

const BEAD: Pins = { r: ['leather', 2], R: ['leather', 4], g: ['gold', 1], G: ['gold', 3] };

const piece = (x: number, y: number, rows: readonly string[], depth: number): Part2 => ({
  at: [x, y],
  depth,
  mat: 'hair',
  rows,
  pins: BEAD,
  cast: true,
});

/** A beard's rows split at the jaw: above it under head gear, below it over. */
const part = (x: number, y: number, rows: readonly string[]): Part2[] => {
  const cut = Math.max(0, Math.min(rows.length, BELOW_JAW - y));
  const out: Part2[] = [];
  if (cut > 0) out.push(piece(x, y, rows.slice(0, cut), DEPTH.HAIR + 1));
  if (cut < rows.length) out.push(piece(x, y + cut, rows.slice(cut), BEARD_DEPTH));
  return out;
};

interface BeardDrawing {
  readonly front: readonly Part2[][];
  readonly side: readonly Part2[][];
  readonly back: readonly Part2[][];
}

// From the front the rows start at the eyes' row (13): the sideburns stand
// in front of the ears (columns 22 and 34), the mouth is columns 28 to 30.
const F = (rows: readonly string[]) => part(HX, HY + 7, rows);
// In profile from row 12, columns from the profile's left (20): the ear is
// columns 25 to 27, the jaw runs from under it (27, 16) to the chin (34, 19).
const S = (rows: readonly string[]) => part(PX, HY + 6, rows);
// From behind, from row 16: the jaw's back edge is columns 23 to 33.
const B = (rows: readonly string[]) => part(HX, HY + 10, rows);

const STUBBLE: BeardDrawing = {
  // One tone, on the jaw and chin only, its top edge broken; a step darker at the jaw's edge.
  front: [
    F([
      '...............',
      '...............',
      '.3...........3.',
      '..3.........3..',
      '..33.......33..',
      '...333.3.333...',
      '.....3434343...',
    ]),
  ],
  side: [
    S([
      '................',
      '................',
      '................',
      '........3.......',
      '........3.......',
      '........33....3.',
      '.........33.334.',
      '.........33334..',
      '......33343.....',
    ]),
  ],
  back: [],
};

const MOUSTACHE: BeardDrawing = {
  front: [
    F([
      '...............',
      '...............',
      '...............',
      '....01223344...',
      '....12.....34..',
      '....2.......4..',
    ]),
  ],
  side: [
    S([
      '................',
      '................',
      '................',
      '................',
      '...........01234',
      '.............234',
      '..............3.',
    ]),
  ],
  back: [],
};

const SHORT_BEARD: BeardDrawing = {
  front: [
    F([
      '.1...........4.',
      '.1...........4.',
      '.12..........34',
      '..12.0122334.4.',
      '..122.....334..',
      '..12222222334..',
      '...122223334...',
      '....1222334....',
      '......1233.....',
    ]),
  ],
  side: [
    S([
      '................',
      '........1.......',
      '........12......',
      '........122.....',
      '........1222.234',
      '........12222.3.',
      '.......122222334',
      '.......12222233.',
      '.....1222222334.',
      '......12223344..',
      '........2334....',
    ]),
  ],
  back: [B(['...............', '.1...........4.', '.2...........4.'])],
};

const FULL_BEARD: BeardDrawing = {
  front: [
    F([
      '.1...........4.',
      '.12..........34',
      '.12..........34',
      '.12..........34',
      '.12..........34',
      '.12..........34',
      '.0122222423344.',
      '.1122122233344.',
      '..12221223334..',
      '...122223334...',
      '....1222334....',
      '.....12334.....',
    ]),
  ],
  side: [
    S([
      '.......1.........',
      '.......12........',
      '.......122.......',
      '.......1222......',
      '.......12222.234.',
      '.......122223.34.',
      '......12222223344',
      '......12232223345',
      '.....122222233344',
      '.....12222223334.',
      '......1222233344.',
      '.......12223344..',
      '.........2334....',
    ]),
  ],
  back: [
    B([
      '1.............4',
      '12...........45',
      '12...........45',
      '.12.........45.',
      '..2.........4..',
    ]),
  ],
};

const BRAIDED_BEARD: BeardDrawing = {
  front: [
    F([
      '.1...........4.',
      '.12..........34',
      '.12..........34',
      '..12.0122334.4.',
      '..122.....334..',
      '..12222222334..',
      '...122222334...',
      '....1222334....',
      '......123......',
      '.....1232......',
      '......23.......',
      '.....123.......',
      '.....232.......',
      '......23.......',
      '......gG.......',
      '.....1234......',
      '.....1..3......',
    ]),
  ],
  side: [
    S([
      '................',
      '........1.......',
      '........12......',
      '........122.....',
      '........1222.234',
      '........12222.3.',
      '.......122222334',
      '.......12222233.',
      '.....1222222334.',
      '......122223344.',
      '...........234..',
      '...........1232.',
      '............23..',
      '...........123..',
      '...........232..',
      '............23..',
      '............gG..',
      '...........1234.',
      '...........1..3.',
    ]),
  ],
  back: [B(['...............', '1.............4', '12...........45', '.2...........4.'])],
};

const MUTTON_CHOPS: BeardDrawing = {
  front: [
    F([
      '.1...........4.',
      '.12..........34',
      '.12..........34',
      '..122012233434.',
      '..1223.....334.',
      '...12.......3..',
    ]),
  ],
  side: [
    S([
      '................',
      '........1.......',
      '........12......',
      '........1222....',
      '........12222234',
      '........122223..',
      '.........1223...',
      '..........23....',
    ]),
  ],
  back: [B(['1.............4', '1.............4'])],
};

const DRAWN: Readonly<Record<string, BeardDrawing>> = {
  stubble: STUBBLE,
  moustache: MOUSTACHE,
  short_beard: SHORT_BEARD,
  full_beard: FULL_BEARD,
  braided_beard: BRAIDED_BEARD,
  mutton_chops: MUTTON_CHOPS,
};

/** Every beard by its look id: the gear it is drawn with, or none. Missing or unknown is `none`. */
export const BEARD_STYLES2: Readonly<Record<string, string | null>> = {
  none: null,
  ...Object.fromEntries(Object.keys(DRAWN).map((id) => [id, `beard_${id}`])),
};

export const BEARDS2: readonly Gear2[] = Object.entries(DRAWN).map(([id, d]) => ({
  id: `beard_${id}`,
  slot: 'beard',
  parts: d.front.flat(),
}));

/** Each beard in profile and from behind, by gear id. */
export const BEARD_SIDE: Readonly<Record<string, readonly Part2[]>> = Object.fromEntries(
  Object.entries(DRAWN).map(([id, d]) => [`beard_${id}`, d.side.flat()]),
);
export const BEARD_BACK: Readonly<Record<string, readonly Part2[]>> = Object.fromEntries(
  Object.entries(DRAWN).map(([id, d]) => [`beard_${id}`, d.back.flat()]),
);

/** The gear id for a look's beard, or null. */
export const beardGear = (id: string | undefined): string | null => BEARD_STYLES2[id ?? ''] ?? null;
