/**
 * Art study (not shipped), round two: townsfolk at option C's size, every
 * pixel placed by hand. Each is a person before they are a costume: a head
 * from the H2 family (heads.ts) on a neck, sloped shoulders, hands that show,
 * and clothes in two or three dyes so the parts separate (no linen on linen).
 *
 * Cloth is flat where it hangs flat. Shading is the light from the upper left
 * (a lit column down the left of each piece, a shadow down the right) and
 * folds only where cloth is pulled or gathered: under a waistband, from a
 * knot, at the elbow, down a skirt from the hips, each widening as it falls.
 */
import { recolour, selOut, type TGrid } from './engine';
import { FACE_PINS } from './heads';
import { compose, placed, type HLayer, type Line, type Pins } from './hand';

/** Every cloth's characters, shared by all the townsfolk; faces use FACE_PINS. */
export const TOWN_PINS: Pins = {
  ...FACE_PINS,
  R: ['madder', 1],
  r: ['madder', 2],
  q: ['madder', 3],
  p: ['madder', 4],
  P: ['madder', 5],
  A: ['cream', 1],
  a: ['cream', 2],
  b: ['cream', 3],
  c: ['cream', 4],
  C: ['cream', 5],
  L: ['linen', 1],
  l: ['linen', 2],
  k: ['linen', 3],
  j: ['linen', 4],
  J: ['linen', 5],
  O: ['leather', 1],
  d: ['leather', 2],
  e: ['leather', 3],
  f: ['leather', 4],
  F: ['leather', 5],
  M: ['moss', 1],
  m: ['moss', 2],
  n: ['moss', 3],
  N: ['moss', 4],
  U: ['umber', 1],
  g: ['umber', 2],
  h: ['umber', 3],
  H: ['umber', 4],
  E: ['umber', 5],
  D: ['indigo', 1],
  i: ['indigo', 2],
  y: ['indigo', 3],
  Y: ['indigo', 4],
  Z: ['indigo', 5],
  Q: ['ochre', 1],
  z: ['ochre', 2],
  x: ['ochre', 3],
  X: ['ochre', 4],
  V: ['ochre', 5],
  '%': ['wood', 1],
  '&': ['wood', 2],
  '*': ['wood', 3],
  '+': ['wood', 4],
  '!': ['gold', 2],
  '?': ['iron', 2],
  '~': ['iron', 1],
  '^': ['cloth', 1],
  '=': ['cloth', 2],
  '-': ['cloth', 3],
  _: ['cloth', 4],
};

export interface Townsfolk {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly w: number;
  readonly h: number;
  readonly skin: string;
  readonly hair: string;
  readonly layers: readonly HLayer[];
}

export function drawTownsfolk(t: Townsfolk): TGrid {
  const g = compose(t.w, t.h, t.layers, TOWN_PINS);
  return recolour(selOut(g), { skin: t.skin, hair: t.hair } as never);
}

const head = (x: number, y: number, rows: readonly string[]): HLayer => ({
  at: [x, y],
  depth: 10,
  rows,
  cast: false,
});

/** Mirrors runs about a centre line, for drawing the far arm from the near one's shape. */
export const mirror = (axis2: number, x: number, s: string): readonly [number, string] => [
  axis2 - (x + s.length - 1),
  [...s].reverse().join(''),
];

// ----------------------------------------------------------------- the alewife

/**
 * A stout woman, hands on her hips: a madder dress with its sleeves rolled to
 * the elbow, a cream apron with a bib, her hair up in a bun.
 */
const ALEWIFE: Townsfolk = {
  id: 'alewife',
  name: 'The alewife',
  note: 'stout · apron and bib · hands on hips',
  w: 40,
  h: 64,
  skin: 'skin',
  hair: 'auburn',
  layers: [
    head(13, 0, [
      '......012......',
      '.....01223.....',
      '.....12334.....',
      '..0111qqp2334..',
      '.1011112223344.',
      '.1111122233344.',
      '.12ssssssttt34.',
      '.2st33sst33tu4.',
      '.2sssssstttuu4.',
      '.tsKKKsstKKKuv.',
      '.ussWIsstIWtuv.',
      '.tsssssstttuuv.',
      '..ssssstuttuu..',
      '..tsssvvvttuv..',
      '...tssssttuv...',
      '....utttuvv....',
      '.....vwwww.....',
      '.....uvvww.....',
    ]),
    // Boots, just showing under the hem.
    placed(0, [
      [60, [14, 'Odde'], [22, 'ddef']],
      [61, [13, 'OOddee'], [22, 'dddeef']],
      [62, [13, 'eeeeef'], [22, 'eeefff']],
    ]),
    // The skirt: flat at the sides where the apron hides it, falling in folds below.
    placed(1, [
      [32, [13, 'RRrrrrrrrrrrqqp']],
      [33, [13, 'RRrrrrrrrrrrqqp']],
      ...[34, 35, 36, 37].map((y): Line => [y, [12, 'RRrrrrrrrrrrrqqqp']]),
      ...[38, 39, 40, 41, 42, 43, 44, 45].map((y): Line => [y, [11, 'RRrrrrrrrrrrrrrqqqp']]),
      ...[46, 47, 48, 49, 50, 51, 52, 53].map((y): Line => [y, [10, 'RRRrrrrrrrrrrrrrqqqpp']]),
      ...[54, 55, 56, 57, 58].map((y): Line => [y, [9, 'RRrqRrrqRrrqRrrqrqqpqqp']]),
      [59, [9, 'qqq'], [13, 'qqq'], [17, 'qqq'], [21, 'qqp'], [25, 'ppqpppp']],
    ]),
    // The bodice, a square neck showing the chemise.
    placed(2, [
      [17, [14, 'RRRLLLLLLLqqq']],
      [18, [13, 'RRRRLLLLLllqqqp']],
      ...[19, 20, 21, 22, 23, 24, 25, 26, 27].map((y): Line => [y, [13, 'RRrrrrrrrrrrqqp']]),
      ...[28, 29, 30, 31].map((y): Line => [y, [14, 'RRrrrrrrrrqqp']]),
    ]),
    // The apron: straps, bib, waistband, gathered under the band, two long folds.
    placed(3, [
      [17, [15, 'A'], [25, 'b']],
      [18, [15, 'A'], [25, 'b']],
      [19, [16, 'A'], [24, 'b']],
      [20, [16, 'AAAaaaabc']],
      ...[21, 22, 23, 24, 25].map((y): Line => [y, [16, 'AAaaaaabc']]),
      [26, [16, 'Aabbbbbbc']],
      ...[27, 28, 29, 30].map((y): Line => [y, [16, 'AAaaaaabc']]),
      [31, [13, 'abbbbbbbbbbbbcc']],
      [32, [14, 'AbAbAbabacacc']],
      [33, [14, 'AAbAAbaababcc']],
      ...[34, 35, 36, 37, 38, 39].map((y): Line => [y, [14, 'AAAbaaaaabbbc']]),
      ...[40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54].map((y): Line => [
        y,
        [13, 'AAAabaaaaabbbcc'],
      ]),
      [55, [13, 'bbbbbbbbbbbcccc']],
    ]),
    // Arms akimbo: sleeves rolled above the elbow, bare forearms, hands on the hips.
    placed(4, [
      [18, [11, 'RRRr'], [26, 'rrqp']],
      [19, [10, 'RRrq'], [27, 'rqqp']],
      [20, [9, 'RRrrq'], [27, 'rrqqp']],
      [21, [9, 'RRrq'], [28, 'rqqp']],
      [22, [8, 'RRrrq'], [28, 'rrqqp']],
      [23, [8, 'Rrrq'], [29, 'rqqp']],
      [24, [7, 'RRRRr'], [29, 'RRrrq']],
      [25, [7, 'qqqp'], [30, 'qqpp']],
      [26, [6, 'ssttu'], [30, 'ttuuv']],
      [27, [6, 'tsstu'], [30, 'ttuuv']],
      [28, [7, 'tsstu'], [29, 'ttuuv']],
      [29, [8, 'tsstu'], [28, 'ttuuv']],
      [30, [9, 'tsstu'], [27, 'ttuuv']],
      [31, [10, 'ssstu'], [26, 'tttuv']],
      [32, [11, 'tsuv'], [26, 'ttuv']],
      [33, [12, 'tuv'], [26, 'tuv']],
    ]),
  ],
};

const range = (a: number, b: number): number[] =>
  Array.from({ length: b - a + 1 }, (_, i) => a + i);
const rows = (a: number, b: number, ...runs: (readonly [number, string])[]): Line[] =>
  range(a, b).map((y): Line => [y, ...runs]);

// ------------------------------------------------------------ the market woman

/**
 * Slim and younger: an ochre shawl over a cream blouse, knotted at the chest
 * and held there; an indigo dress; a braid over the shoulder; a basket of
 * apples and a loaf hanging from the other hand, its handle through the fist.
 */
const MARKET: Townsfolk = {
  id: 'market',
  name: 'The market woman',
  note: 'slim · shawl and braid · a basket',
  w: 40,
  h: 64,
  skin: 'skingolden',
  hair: 'hairblack',
  layers: [
    head(13, 1, [
      '....0112333....',
      '..00111223334..',
      '.1010112233344.',
      '.1101121223344.',
      '.12ssssssttt34.',
      '.2st33sst33tu4.',
      '.2sssssstttuu4.',
      '.tsKKKsstKKKuv.',
      '.ussWIsstIWtuv.',
      '.tsssssstttuuv.',
      '..ssssstuttuu..',
      '..tsssuvuttuv..',
      '...tssssttuv...',
      '....utttuvv....',
      '.....vwwww.....',
      '.....uvvww.....',
    ]),
    {
      at: [25, 14],
      depth: 11,
      cast: false,
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
        '.q.',
        '.24',
        '.1.',
      ],
    },
    placed(0, [
      [60, [15, 'Odde'], [21, 'ddef']],
      [61, [14, 'OOdde'], [21, 'dddef']],
      [62, [14, 'eeeef'], [21, 'eeeff']],
    ]),
    // The dress: a bodice below the shawl, a belt, a skirt gathered under it.
    placed(1, [
      ...rows(25, 28, [15, 'DDiiiiiiiyY']),
      [29, [15, 'Odddddddddf']],
      [30, [15, 'iYiYiiYiyYZ']],
      [31, [14, 'DiDiDiiiyiyyY']],
      [32, [14, 'DDiDiiiyiiyyY']],
      ...rows(33, 38, [13, 'DDiiDiiiiyiiyyY']),
      ...rows(39, 46, [12, 'DDiiiDiiiiyiiiyyY']),
      ...rows(47, 53, [11, 'DDiiiiDiiiiyiiiiyyY']),
      ...rows(54, 58, [10, 'DDiiyDiiyDiiyDiiyyyYY']),
      [59, [10, 'yyyy'], [15, 'yyy'], [19, 'yyy'], [23, 'yyy'], [27, 'YYYY']],
    ]),
    // The blouse, showing at the neck.
    placed(2, [[16, [16, 'AAaaaaaab']], ...rows(17, 24, [15, 'AAaaaaaaabc'])]),
    // The far arm's sleeve, hanging.
    placed(3, [...rows(25, 30, [26, 'abbc']), [31, [26, 'bccC']]]),
    // The shawl: over both shoulders, crossed and knotted at the chest, two ends hanging.
    placed(4, [
      [16, [14, 'QQzz'], [23, 'zxxX']],
      [17, [12, 'QQQzzz'], [23, 'zzxxxX']],
      [18, [11, 'QQQQzzzx'], [22, 'zzzxxxxX']],
      [19, [11, 'QQQzzzzx'], [22, 'xzzzxxxX']],
      [20, [11, 'QQzzzzzzx'], [21, 'xzzzzxxxX']],
      [21, [11, 'QQzzzzzxzzzzzzzzxxX']],
      [22, [11, 'QzzzzzzXQQzXzzzzxxX']],
      [23, [11, 'QzzzzzxXQzxXzzzzxxX']],
      [24, [11, 'xxxxX'], [17, 'QzX'], [21, 'zxX'], [25, 'xxxxX']],
      [25, [17, 'Qz'], [21, 'xX']],
      [26, [17, 'zx'], [22, 'X']],
      [27, [18, 'x'], [22, 'X']],
    ]),
    // The near arm: elbow out below the shawl, the hand back up at the knot.
    placed(5, [
      [22, [17, 'sst']],
      [23, [17, 'sstu']],
      [24, [15, 'Aab'], [18, 'tuv']],
      [25, [11, 'AAaaab']],
      [26, [11, 'Aaabb']],
      [27, [12, 'abb']],
    ]),
    // The far hand, closed round the basket's handle.
    placed(6, [
      [32, [26, 'ttuv']],
      [33, [26, 'tuuv']],
      [34, [27, 'uv']],
    ]),
    // The basket: handle down from the fist, a woven body, apples and a loaf.
    placed(5, [
      [34, [25, '*'], [30, '*']],
      [35, [24, '*'], [25, 'Rp'], [28, 'zx'], [31, '*']],
      [36, [23, '%&&&&&&&&*']],
      [37, [23, '%&*&&*&&*+']],
      [38, [23, '&*&&*&&*++']],
      [39, [23, '%&*&&*&&*+']],
      [40, [23, '&*&&*&&*++']],
      [41, [24, '&*&&*&&+']],
      [42, [25, '******']],
    ]),
  ],
};

// ------------------------------------------------------------------ the docker

/**
 * Broad and bearded: a flat cap proud of his skull, a moss waistcoat over a
 * linen shirt with the sleeves rolled, arms crossed, umber trousers, boots.
 */
const DOCKER: Townsfolk = {
  id: 'docker',
  name: 'The docker',
  note: 'broad · cap and waistcoat · arms crossed',
  w: 40,
  h: 64,
  skin: 'skinbrown',
  hair: 'hairblack',
  layers: [
    head(13, 1, [
      '....Diiiiyy....',
      '..DDiiiiiiyyY..',
      '.DDiiiiiiiiyyY.',
      'DDiiiiiiiiyyyYY',
      'YYYYYYYYYYYYYZ.',
      '.2s344sst443u4.',
      '.2sssssstttuu4.',
      '.tssKKsstKKtuv.',
      '.ussWIsstIWtuv.',
      '.tsssssstttuuv.',
      '..ssssstuttuu..',
      '..tss33344tuv..',
      '...33svvvt44...',
      '....3334444....',
      '....vwwwwww....',
      '....uvvvwww....',
      '...ttuuuvvww...',
    ]),
    // Trousers, then boots over their hems.
    placed(1, [
      ...rows(37, 41, [12, 'UUgggggggggghhhhH']),
      ...rows(42, 46, [12, 'UUgggggh'], [21, 'gghhhhhH']),
      [47, [12, 'Uggghggh'], [21, 'ghhhHhhH']],
      ...rows(48, 53, [12, 'UUgggggh'], [21, 'gghhhhhH']),
      ...rows(54, 55, [12, 'Ughgghgh'], [21, 'ghhHhhHH']),
    ]),
    placed(2, [
      [56, [11, 'Oddddddd'], [21, 'ddddddde']],
      ...rows(57, 60, [11, 'Odddddde'], [21, 'dddddeef']),
      [61, [10, 'Oddddddde'], [21, 'dddddeeff']],
      [62, [10, 'eeeeeeeef'], [21, 'eeeeeefff']],
    ]),
    // Waistcoat over the shirt: a V at the neck, a dark opening, brass buttons, a belt.
    placed(2, [
      [17, [13, 'LLL'], [25, 'kkj']],
      [18, [11, 'MMMMMMLLllkkknnnnnN']],
      [19, [11, 'MMMMMMMLllkknnnnnnN']],
      [20, [12, 'MMMMMMMLlknnnnnnN']],
      [21, [12, 'MMMMMMMMlnnnnnnnN']],
      ...rows(22, 34, [12, 'MMMmmmmmNmmmnnnnN']),
      [27, [12, 'MMMmmmm!Nmmmnnnn']],
      [30, [12, 'MMMmmmm!Nmmmnnnn']],
      [33, [12, 'MMMmmmm!Nmmmnnnn']],
      ...rows(35, 36, [12, 'ddddddd?~?dddddde']),
    ]),
    // Upper arms in rolled sleeves; the far one in front, so the tucked hand goes under it.
    placed(3, [
      [18, [9, 'LLLl']],
      [19, [8, 'LLLlk']],
      ...rows(20, 21, [8, 'LLllk']),
      [22, [8, 'LLLLl']],
      [23, [8, 'jjjjj']],
      ...rows(24, 25, [8, 'sstu']),
      [26, [8, 'tstu']],
      [27, [9, 'ttu']],
    ]),
    placed(6, [
      [18, [28, 'lkkj']],
      ...rows(19, 21, [28, 'lkkjj']),
      [22, [28, 'LLLlk']],
      [23, [28, 'jjjjJ']],
      ...rows(24, 25, [28, 'tuuv']),
      [26, [28, 'uuvw']],
      [27, [29, 'uvw']],
    ]),
    // The far forearm, across to the near arm, its hand over the near sleeve...
    placed(4, [
      [20, [9, 'oss']],
      [21, [9, 'sstu'], [13, 'sssssssstttttt']],
      [22, [9, 'tuuv'], [13, 'ssssssstttttttu']],
      [23, [12, 'vvvvvvvvvvvvvvvv']],
    ]),
    // ...and the near forearm below it, its hand tucked under the far arm.
    placed(5, [
      [24, [11, 'tsssssssssttttttt']],
      [25, [11, 'ssssssssstttttttu']],
      [26, [11, 'tttttuuuuuuuuuuv']],
    ]),
  ],
};

// ------------------------------------------------------------------- the elder

/**
 * Stooped and shorter, a head lower than the others: bald, a grey beard, a
 * long umber coat open over a cream shirt, a stick in his near hand (the grip
 * through the fist, a knob above it, the shaft to the ground).
 */
const ELDER: Townsfolk = {
  id: 'elder',
  name: 'The old man',
  note: 'stooped · long coat and beard · a stick',
  w: 40,
  h: 64,
  skin: 'skindeep',
  hair: 'hairgrey',
  layers: [
    head(13, 5, [
      '....ssosttu....',
      '..ssoosstttuu..',
      '.ssoossstttuuv.',
      '.sssssssttttuv.',
      '.3s455sst554u4.',
      '.3sssssstttuu4.',
      '.tssKKsstKKtuv.',
      '.ussWIsstIWtuv.',
      '.tsusssstutuuv.',
      '.3ssssstuttuu4.',
      '.32ss11223tu34.',
      '.32222vvv33344.',
      '..11222233334..',
      '...112223334...',
      '....1223334....',
      '.....23344.....',
      '......334......',
    ]),
    placed(0, [
      [60, [13, 'Odddde'], [21, 'ddddef']],
      [61, [12, 'Oddddde'], [21, 'dddddef']],
      [62, [12, 'eeeeeef'], [21, 'eeeeeff']],
    ]),
    placed(1, [...rows(37, 59, [14, '^^===-'], [21, '==---_'])]),
    // The coat: open down the front over the shirt, lapels dark, to the knee.
    placed(2, [
      [19, [14, 'UUUggAAahghhH']],
      ...rows(20, 24, [13, 'UUUgghAAahgghhH']),
      ...rows(25, 30, [13, 'UUUgghAabhgghhH']),
      ...rows(31, 36, [13, 'UUUgghAabhgghhH']),
      [27, [18, 'h!']],
      [32, [18, 'h!']],
      ...rows(37, 44, [12, 'UUUgggh'], [22, 'hggghhH']),
      ...rows(45, 50, [11, 'UUUggggh'], [22, 'hgggghhH']),
      [51, [11, 'gggghhhh'], [22, 'hhhhHHHE']],
    ]),
    // The far arm, its hand in the coat's pocket.
    placed(3, [
      [20, [27, 'ghH']],
      ...rows(21, 30, [27, 'gghH']),
      [31, [26, 'gghH']],
      [32, [26, 'ghhH']],
      [33, [25, 'hhhHE']],
      [34, [24, 'EEEEE']],
    ]),
    // The near arm, a little forward, down to the stick.
    placed(3, [
      [20, [11, 'UUg']],
      ...rows(21, 31, [10, 'UUgh']),
      [32, [9, 'UUggh']],
      [33, [9, 'hhhhH']],
    ]),
    // The stick in front of the arm, the fist over its grip.
    placed(5, [[33, [9, '%&']], ...rows(39, 61, [9, '&*']), [62, [9, '++']]]),
    placed(6, [
      [34, [9, 'sst']],
      [35, [8, 'osstv']],
      [36, [8, 'tuuuw']],
      [37, [8, 'sstuv']],
      [38, [9, 'uvw']],
    ]),
  ],
};

// ------------------------------------------------------------- the linen rung

/**
 * The gear ladder's first rung, the hero at the start: undyed linen hood and
 * cape, tunic and trousers, kept apart by value (the hood lightest, the
 * trousers darkest) and by the cape's shadow, a leather belt with the only
 * metal, boots. Nothing held: the near hand rests at the belt, the far one on
 * the hip.
 */
const LINEN: Townsfolk = {
  id: 'linen',
  name: 'Linen rung',
  note: 'the starting hero · hand at rest',
  w: 40,
  h: 64,
  skin: 'skin',
  hair: 'hair',
  layers: [
    head(12, 1, [
      '.....LLLLlll.....',
      '...LLLLLLlllkk...',
      '..LLLLLlllllkkj..',
      '.LLLkkkkkkkkkkkj.',
      'LL12s1ss23t3t34kj',
      'LL2s344sst443u4kj',
      'LL2sssssstttuu4kj',
      'LLkssKKsstKKtujkj',
      'LLkssWIsstIWtujkj',
      'LLksssssstttuujkj',
      'LLkssssstuttuujkj',
      'LLktsssuvuttuvjkj',
      'LLkktssssttuvjjkj',
      'LLkkkutttuvvjjjkj',
      'LLLLkkvwwwwjjkkjj',
    ]),
    placed(1, [...rows(41, 55, [14, 'kjjjjJ'], [21, 'jjjjJJ'])]),
    placed(2, [
      ...rows(55, 60, [13, 'Oddddde'], [21, 'dddddef']),
      [61, [12, 'Odddddde'], [21, 'ddddddef']],
      [62, [12, 'eeeeeeef'], [21, 'eeeeeeff']],
    ]),
    placed(2, [
      ...rows(23, 31, [14, 'Lllllllkkkkkj']),
      ...rows(32, 33, [14, 'ddddd!e!dddde']),
      ...rows(34, 37, [14, 'Lllllllkkkkkj']),
      ...rows(38, 39, [13, 'LLlllllllkkkkkj']),
      [40, [13, 'kkkkkkkkkjjjjjJ']],
    ]),
    placed(3, [
      [16, [12, 'LLLLLlllllllkkkkj']],
      [17, [11, 'LLLLLLllllllllkkkkj']],
      ...rows(18, 20, [10, 'LLLLLLlllllllllkkkkkj']),
      [21, [10, 'LLLLLlllllllllllkkkkj']],
      [22, [10, 'kkkkkkkkkkkkkkkjjjjjJ']],
    ]),
    // The near arm at ease: forearm across to the belt, the hand resting on it.
    placed(4, [
      ...rows(23, 28, [11, 'Lllk']),
      [29, [11, 'Lllkk']],
      [30, [11, 'Lllllk'], [17, 'sst']],
      [31, [12, 'kkkkj'], [17, 'ssst']],
      [32, [17, 'tuuv']],
      [33, [18, 'uv']],
    ]),
    // The far arm, hand on the hip.
    placed(4, [
      ...rows(23, 24, [27, 'lkkj']),
      ...rows(25, 26, [28, 'lkkj']),
      [27, [29, 'kkkj']],
      [28, [29, 'kkjj']],
      [29, [28, 'kkjj']],
      [30, [27, 'kkjj']],
      [31, [26, 'kkjj']],
      [32, [25, 'tuuv']],
      [33, [25, 'tuv']],
    ]),
  ],
};

export const TOWNSFOLK: readonly Townsfolk[] = [ALEWIFE, MARKET, DOCKER, ELDER, LINEN];
