/**
 * The hero's body at the C scale: the H2 head (study/scale-detail, "Let's go
 * h2") with its eyes reworked, on a body standing with its weight on one leg.
 * Drawn on the 56 x 72 figure canvas, centre column 28, soles on row 69 and
 * the outline under them on row 70.
 *
 * Two poses share everything but the weapon hand: the arm hangs a little out
 * from the hip, and `standard` closes its hand on whatever it holds so a
 * blade leans clear of the forearm; `standard_at_ease` leaves it open and
 * easy. The other hand rests on the hip in both, where a shield is strapped.
 *
 * The weight is on the near leg (viewer's left): that hip is a row higher,
 * that shoulder a row lower, the other leg eased with its foot turned out.
 * The head stays square to the viewer so the eyes mirror about column 28.
 */
import { DEPTH } from '../depth';
import { on, runs, span, type Body2, type Part2 } from './engine';

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
 *
 * Turned a little toward the way the figure faces (B9): the face's centre
 * line is a column right of the skull's (`FACE_AXIS`), so more cheek shows on
 * the near side, the far ear is hidden behind the far cheek, and nose, mouth
 * and chin sit a column over. The eyes still mirror each other about the
 * face's own centre line, so the gaze stays straight out.
 */
export const HEAD: Part2 = {
  at: HEAD_AT,
  depth: 0,
  cast: false,
  bone: 'head',
  rows: [
    '...............',
    '....sosttu.....',
    '..ssoossstttu..',
    '.ssoossssttuuv.',
    '.sssssssssttuv.',
    '.sssbbBsssBbbv.',
    '.sssssssssttuv.',
    'stssKIKsstKIKv.',
    'tussWIWsstWIWv.',
    'stsssssssttttv.',
    '..sssssstuttu..',
    '..tssssuvuttv..',
    '...tsssssttv...',
    '.....utttuv....',
    '.....vwwww.....',
    '.....uvvww.....',
    '.....tuuvw.....',
    '....ttuuvvw....',
  ],
};
/** The face's centre line: the eyes mirror about it, a column toward the way the figure faces. */
export const FACE_AXIS = AXIS + 1;

/** The neck's opening down the chest, under any collar. */
const THROAT: Part2 = {
  ...runs(1.5, [
    [24, [26, 'tttuv']],
    [25, [27, 'tuv']],
    [26, [28, 'v']],
  ]),
  bone: 'body',
};

/** Smallclothes, so a body never shows bare where nothing is worn. */
const SMALLCLOTHES: Part2 = on(
  'trunk',
  runs(
    1,
    [
      ...span(24, 35, [23, '12222222234']),
      ...span(36, 44, [23, '12222222234']),
      ...span(45, 50, [22, '122334'], [30, '22334']),
      ...span(51, 60, [22, '12234'], [31, '2234']),
    ],
    { mat: 'linen' },
  ),
);

/** The near (weapon) upper arm, shoulder to elbow: the same in both poses. */
const NEAR_UPPER: Part2 = on(
  'near',
  runs(2, [
    [25, [20, 'sss']],
    [26, [19, 'ssst']],
    [27, [18, 'ssstt']],
    [28, [17, 'ssstu']],
    ...span(29, 32, [16, 'sssttu']),
    [33, [16, 'ssttu']],
    [34, [16, 'sttuv']],
  ]),
);

/** The near forearm coming down and out to the fist at the hip. */
const NEAR_FOREARM_HOLD: Part2 = on(
  'near',
  runs(2, [
    [35, [17, 'sttu']],
    [36, [17, 'sttu']],
    [37, [16, 'sttu']],
    [38, [16, 'stuu']],
  ]),
);

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
  bone: 'nearHeld',
  rows: ['.sst.', 'osstv', 'tuuuw', 'sstuv', '.uvw.'],
};
/** The columns a grip runs down, through the fist. */
export const GRIP_X = [15, 16] as const;

/**
 * The empty hand, hanging easy where the fist would be: the back of the hand
 * lit, the thumb lying forward along the fingers, the fingers loosely curled
 * and longer than a fist, their tips turning in towards the thigh. B8 rested
 * it on the belt, which with the other hand on the hip read as both hands at
 * the waist; hanging, it reads at once as at rest.
 */
export const OPEN_HAND2: Part2 = {
  at: [14, 39],
  depth: DEPTH.FIST,
  cast: false,
  shaded: false,
  bone: 'nearHeld',
  rows: ['.sst.', 'osstu', 'ssttv', 'sttuv', '.tuv.', '..vw.'],
};

/** The far (shield) arm: the elbow out, the hand back on the hip. */
const FAR_ARM: Part2 = on(
  'far',
  runs(2, [
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
  ]),
);
const FAR_HAND: Part2 = on(
  'far',
  runs(DEPTH.HAND, [
    [37, [32, 'sst']],
    [38, [32, 'sstuv']],
    [39, [32, 'tuuvw']],
    [40, [33, 'uvw']],
  ]),
);

const COMMON: readonly Part2[] = [HEAD, THROAT, SMALLCLOTHES, NEAR_UPPER, FAR_ARM, FAR_HAND];

export const BODIES2: readonly Body2[] = [
  { id: 'standard', parts: [...COMMON, NEAR_FOREARM_HOLD, FIST2] },
  { id: 'standard_at_ease', parts: [...COMMON, NEAR_FOREARM_HOLD, OPEN_HAND2] },
];
