/**
 * The hero's body at the C scale: the H2 head (study/scale-detail, "Let's go
 * h2") with its eyes reworked, on a body standing with its weight on one leg.
 * Drawn on the 56 x 72 figure canvas, centre column 28, soles on row 69 and
 * the outline under them on row 70.
 *
 * Two poses share everything but the weapon arm: `standard` closes that hand
 * on whatever it holds, out from the hip so a blade leans clear of the
 * forearm; `standard_at_ease` brings the empty hand to rest on the belt. The
 * other hand rests on the hip in both, where a shield is strapped.
 *
 * The weight is on the near leg (viewer's left): that hip is a row higher,
 * that shoulder a row lower, the other leg eased with its foot turned out.
 * The head stays square to the viewer so the eyes mirror about column 28.
 */
import { DEPTH } from '../depth';
import { runs, span, type Body2, type Part2 } from './engine';

/** The figure canvas, in art pixels, with a pixel of margin for the outline. */
export const FIG_W = 56;
export const FIG_H = 72;
/** The column the face, the eyes and the anchor are centred on. */
export const AXIS = 28;
/** The row the soles' outline is drawn on: where the figure meets the ground. */
export const SOLE = 70;

/** Where the head's 15-column rows start: their middle column is `AXIS`. */
export const HEAD_AT = [AXIS - 7, 6] as const;

/**
 * The head, bald, every pixel by hand: a round skull 13 wide, ears, soft
 * brows a skin row above the eyes, eyes three wide (a lash row over white,
 * iris, white, the iris centred so the gaze is straight out), a nose lit on
 * its left, a mouth, a jaw wider than the neck.
 */
export const HEAD: Part2 = {
  at: HEAD_AT,
  depth: 0,
  cast: false,
  rows: [
    '...............',
    '....sosttu.....',
    '..ssoossstttu..',
    '.ssoossssttuuv.',
    '.sssssssstttuv.',
    '.ssbbBsssBbbuv.',
    '.ssssssssttuuv.',
    'stsKIKsstKIKuvu',
    'tusWIWsstWIWuvv',
    'stssssssttttuvu',
    '..ssssstuttuu..',
    '..tsssuvuttuv..',
    '...tssssttuv...',
    '....utttuvv....',
    '.....vwwww.....',
    '.....uvvww.....',
    '.....tuuvw.....',
    '....ttuuvvw....',
  ],
};

/** The neck's opening down the chest, under any collar. */
const THROAT: Part2 = runs(1.5, [
  [24, [26, 'tttuv']],
  [25, [27, 'tuv']],
  [26, [28, 'v']],
]);

/** Smallclothes, so a body never shows bare where nothing is worn. */
const SMALLCLOTHES: Part2 = runs(
  1,
  [
    ...span(24, 35, [23, '12222222234']),
    ...span(36, 44, [23, '12222222234']),
    ...span(45, 50, [22, '122334'], [30, '22334']),
    ...span(51, 60, [22, '12234'], [31, '2234']),
  ],
  { mat: 'linen' },
);

/** The near (weapon) upper arm, shoulder to elbow: the same in both poses. */
const NEAR_UPPER: Part2 = runs(2, [
  [25, [21, 'ss']],
  [26, [20, 'sst']],
  [27, [19, 'sstt']],
  [28, [18, 'sstu']],
  ...span(29, 32, [17, 'ssttu']),
  [33, [16, 'ssttu']],
  [34, [16, 'sttuv']],
]);

/** The near forearm coming down and out to the fist at the hip. */
const NEAR_FOREARM_HOLD: Part2 = runs(2, [
  [35, [17, 'sttu']],
  [36, [17, 'sttu']],
  [37, [16, 'sttu']],
  [38, [16, 'stuu']],
]);

/**
 * The fist, closed on a grip: thumb over the top, knuckles lit from the upper
 * left, the fingers' rows below. Every held thing's grip runs down two of its
 * columns (`GRIP_X`), under it.
 */
export const FIST2: Part2 = {
  at: [14, 39],
  depth: DEPTH.FIST,
  cast: false,
  shaded: false,
  rows: ['.sst.', 'osstv', 'tuuuw', 'sstuv', '.uvw.'],
};
/** The columns a grip runs down, through the fist. */
export const GRIP_X = [15, 16] as const;

/** Over the belt: the resting forearm and hand lie on it. */
export const ON_BELT = DEPTH.BELT + 0.5;

/** The near forearm down to the belt, the hand resting on it. */
const NEAR_FOREARM_EASE: Part2 = runs(ON_BELT - 0.2, [
  [35, [17, 'sttu']],
  [36, [19, 'sstuu']],
  [37, [21, 'sstu']],
]);
const NEAR_HAND_EASE: Part2 = runs(ON_BELT, [
  [36, [23, 'sst']],
  [37, [22, 'osstu']],
  [38, [22, 'tuuuv']],
  [39, [23, 'uvw']],
]);

/** The far (shield) arm: the elbow out, the hand back on the hip. */
const FAR_ARM: Part2 = runs(2, [
  [24, [33, 'stu']],
  [25, [33, 'sttu']],
  [26, [34, 'sttu']],
  [27, [35, 'sttu']],
  [28, [35, 'sttuu']],
  ...span(29, 30, [36, 'sttuu']),
  ...span(31, 32, [37, 'sttuu']),
  ...span(33, 34, [38, 'sttuv']),
  [35, [37, 'stuuv']],
  [36, [36, 'stuuv']],
  [37, [35, 'stuv']],
]);
const FAR_HAND: Part2 = runs(DEPTH.HAND, [
  [37, [32, 'sst']],
  [38, [32, 'sstuv']],
  [39, [32, 'tuuvw']],
  [40, [33, 'uvw']],
]);

const COMMON: readonly Part2[] = [HEAD, THROAT, SMALLCLOTHES, NEAR_UPPER, FAR_ARM, FAR_HAND];

export const BODIES2: readonly Body2[] = [
  { id: 'standard', parts: [...COMMON, NEAR_FOREARM_HOLD, FIST2] },
  { id: 'standard_at_ease', parts: [...COMMON, NEAR_FOREARM_EASE, NEAR_HAND_EASE] },
];
