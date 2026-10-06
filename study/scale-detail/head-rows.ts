/**
 * Art study (not shipped), round two: the four heads' pixels, by hand, in
 * FACE_PINS (heads.ts). Each is an odd number of columns wide so the nose
 * sits on the body's centre line and the eyes mirror about it. Rows run from
 * the crown to the neck; `jaw` is the row of the jaw's underside.
 *
 * o-w are skin steps 0-5 (s the lit side, t-u the shadow side, v the mouth
 * and the shadow under the jaw), 0-5 hair steps, K W G I eye ink, white,
 * glint and iris.
 */

/** Small and realistic: dot eyes, thin brows a row above them, cropped hair, a long neck. */
export const H1_ROWS = {
  jaw: 12,
  rows: [
    '....11223....',
    '..011122334..',
    '.10111223344.',
    '.12sss2stt34.',
    '.2s33sss33u4.',
    '.2ssssstttu4.',
    '.tssKsstKtuv.',
    '.ussKsstKtuv.',
    '.tsssssttuuv.',
    '..sssstuttu..',
    '..tssuvutuv..',
    '..utssstuvw..',
    '...vuttuvw...',
    '....vwwww....',
    '....uvvww....',
    '....tuuvw....',
    '....tuuvw....',
  ],
};

/** Rounder and a touch larger: a lid line over white and iris, soft brows, a broken fringe. */
export const H2_ROWS = {
  jaw: 13,
  rows: [
    '.....112.33....',
    '...011122333...',
    '..10111222334..',
    '.1101212233344.',
    '.12s1ss23t3t34.',
    '.2s344sst443u4.',
    '.2sssssstttuu4.',
    '.tssKKsstKKtuv.',
    '.ussWIsstIWtuv.',
    '.tsssssstttuuv.',
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

/** Big and round: shaggy hair, glinting eyes (the glint on the lit side of both), a small chin. */
export const H3_ROWS = {
  jaw: 15,
  rows: [
    '....012..233.....',
    '...0011223334....',
    '..100112223334...',
    '.101121222333444.',
    '.112122223233445.',
    '.122s212s233s345.',
    '.22sss2sss3stt45.',
    '.2sss33sss33ttu4.',
    '.2sssssssttttuu4.',
    '.tsssGKsstGKtuuv.',
    '.usssKKsstKKtuuv.',
    '.tssssssstttuuuv.',
    '..sssssstuttuuu..',
    '...ssssuvuttuu...',
    '....tssssttuv....',
    '.....utttuvv.....',
    '......vwwww......',
    '......uvvww......',
    '......tuuvw......',
    '.....ttuuvvw.....',
  ],
};

/** Long-faced and square-jawed: hair swept back off a high forehead, brows set on the eyes. */
export const H4_ROWS = {
  jaw: 13,
  rows: [
    '....11122......',
    '..0112222333...',
    '.101123233334..',
    '.1212323333445.',
    '.23ssss3sttt45.',
    '.2ssssssstttu4.',
    '.23444sst44434.',
    '.tssKKsstKKtuv.',
    '.ussWIsstIWtuv.',
    '.tsssssstttuuv.',
    '..ssssstuttuu..',
    '..tsssvvvtuuv..',
    '..utssssttuvw..',
    '...vuttutuvw...',
    '....vwwwwww....',
    '....uvvvwww....',
    '....tuuvvvw....',
    '...ttuuuvvww...',
  ],
};

// ------------------------------------------------------- looks on H2's face

const F = H2_ROWS.rows;

/** Long, centre-parted: a curtain either side of the face, over the ears, onto the shoulders. */
export const LONG_ROWS = {
  jaw: 13,
  rows: [
    '....0112333....',
    '..00111233334..',
    '.1010112233344.',
    '110112122333445',
    '112ssssssttt345',
    '12s344sst443u34',
    '12sssssstttuu34',
    '12ssKKsstKKtu34',
    '12ssWIsstIWtu34',
    '12sssssstttuu34',
    '12ssssstuttuu34',
    '12tsssuvuttuv34',
    '122tssssttuv334',
    '1222utttuvv3334',
    '12222vwwww33344',
    '12224uvvww43334',
    '122..tuuvw..344',
    '12..ttuuvvw..4.',
  ],
};

/** Short at the front with a braid from behind the left ear, falling over the shoulder. */
export const BRAID_ROWS = {
  jaw: 13,
  rows: F,
  extra: {
    at: [0, 9] as const,
    rows: [
      '.12',
      '123',
      '232',
      '.23',
      '123',
      '232',
      '.23',
      '123',
      '232',
      '.23',
      '.5.',
      '.24',
      '.1.',
    ],
  },
};

/** Shaggy: tufts on the crown, a jagged fringe, locks over the ears to the cheek. */
export const SHAGGY_ROWS = {
  jaw: 13,
  rows: [
    '...1..12.33....',
    '..01112223334..',
    '.1011122223334.',
    '110121222333445',
    '122s1s2s3t3t345',
    '12s344sst443u44',
    '22sssssstttuu44',
    '12ssKKsstKKtu45',
    '12ssWIsstIWtu45',
    '.2sssssstttuu4.',
    '.2ssssstuttuu4.',
    ...F.slice(11),
  ],
};

/** Bald: the skull lit like the face, a grey fringe round the back, grey brows. */
export const BALD_ROWS = {
  jaw: 13,
  rows: [
    '...............',
    '....ssosttu....',
    '..ssoosstttuu..',
    '.ssoossstttuuv.',
    '.sssssssttttuv.',
    '.3s455sst554u4.',
    '.3sssssstttuu4.',
    ...F.slice(7),
  ],
};
