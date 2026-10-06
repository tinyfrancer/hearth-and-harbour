/**
 * Art study (not shipped), option B: the hero and a villager at today's size
 * (about 47 art pixels tall), redrawn with six-step ramps, a lit side and a
 * shadow side, cast shadows between layers and a coloured outline.
 *
 * Same pose and gear as the approved knight (src/art/wardrobe.ts HERO_OUTFIT):
 * plate with pauldrons and knee cops, red cloak, teal tunic, long raised sword
 * with a gilt guard, blue kite shield with a gold cross. Drawn fresh, not
 * scaled from the 3-step sprite.
 */
import type { FigureDef, Layer } from './engine';
import { VILLAGER_EXTRA, legendOf } from './legend';

/** A layer filled between two edges per row, with a character chosen per pixel. */
export function filled(
  y0: number,
  y1: number,
  edges: (y: number) => [number, number] | null,
  ch: (x: number, y: number, l: number, r: number) => string,
  depth: number,
): Layer {
  const rows: string[] = [];
  for (let y = 0; y <= y1; y++) {
    if (y < y0) {
      rows.push('');
      continue;
    }
    const e = edges(y);
    if (!e) {
      rows.push('');
      continue;
    }
    let row = '.'.repeat(e[0]);
    for (let x = e[0]; x <= e[1]; x++) row += ch(x, y, e[0], e[1]);
    rows.push(row);
  }
  return { at: [0, 0], depth, rows };
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/** The red cloak: hangs from the shoulders, widening, with folds that start below the arms. */
function cloakB(): Layer {
  return filled(
    14,
    45,
    (y) => {
      const t = (y - 14) / 31;
      return [lerp(12, 5, Math.sqrt(t)), lerp(26, 33, Math.sqrt(t))];
    },
    (x, y, l) => {
      // A ragged hem: every other fold a row shorter.
      if (y === 45 && (x - l) % 4 < 2) return '.';
      if (y < 22) return 'C';
      const f = (x + (y > 36 ? 1 : 0)) % 4;
      return f === 0 ? 'c' : f === 2 ? 'D' : 'C';
    },
    0,
  );
}

const BLADE: Layer = (() => {
  const rows: string[] = [];
  rows.push('.....M');
  for (let y = 1; y <= 24; y++) {
    const cx = 10 - Math.floor((24 - y) / 4);
    const glint = y === 6 || y === 7 ? 'W' : '|';
    rows.push('.'.repeat(cx - 1) + 'M' + glint + 'M');
  }
  return { at: [0, 0], depth: 8, rows, R: { blade: 1.5 } };
})();

export const HERO_B: FigureDef = {
  w: 40,
  h: 49,
  fall: 0.9,
  legend: legendOf(),
  layers: [
    cloakB(),
    {
      // Legs: grey trousers, knee cops strapped over them, boots.
      at: [14, 29],
      depth: 1,
      rows: [
        '.RRRR.RRRR',
        '.RRRR.RRRR',
        '.RRRR.RRRR',
        '.RRRr.RRRr',
        '.RRRr.RRRr',
        '.RRRr.RRRr',
        '.aKKK.aKKK',
        '.KKKK.KKKK',
        '..^^...^^.',
        '.RRRr.RRRr',
        '.RRRr.RRRr',
        '.oooo.oooo',
        '.OOOO.OOOO',
        '.OOOO.OOOO',
        '.OOOO.OOOO',
        '.OOOO.OOOO',
        'OOOOO.OOOOO',
        'OOOOO.OOOOO',
        'SSSSS.SSSSS',
      ],
      R: { knee: 1.5, boot: 2 },
    },
    {
      // The tunic's skirt, below the breastplate, folded.
      at: [14, 26],
      depth: 2,
      rows: [
        '.UUUUUUUUU.',
        '.UUUUUUUUU.',
        '.UUuUUUuUU.',
        'UUUuUUUuUUu',
        'UUUuUUUuUUu',
        'UUuUUUUuUUu',
        'UUuU...UuUU',
      ],
    },
    {
      // Neck, then the breastplate with a ridge down its middle.
      at: [14, 13],
      depth: 3,
      rows: [
        '...kkkkk...',
        '...kkkkk...',
        '..PPPpQQQ..',
        '.PPPPpQQQQ.',
        'PP::PpQQQQQ',
        'PP:PPpQQQQQ',
        'PP:PPpQQQQQ',
        'PPPPPpQQQQQ',
        'PPPPPpQQQQQ',
        '.PPPPpQQQQQ',
        '.qqqqqqqqqq',
        '.PPPPpQQQQ.',
        '.PPPPpQQQQ.',
        '.qqqqqqqqq.',
      ],
    },
    { at: [15, 27], depth: 4, rows: ['LLLLgLLLL'], R: { belt: 1 } },
    {
      // The sword arm: teal sleeve, leather bracer, coming down to the fist.
      at: [9, 16],
      depth: 5,
      rows: [
        '..TTT',
        '.TTTT',
        '.TTTT',
        '.TTTt',
        '.TTTt',
        '.TTTt',
        '.~~~~',
        '.~~~~',
        '~~~~',
        '~~~~',
      ],
    },
    {
      // The head: short hair, ears, brows, eyes looking straight out.
      at: [13, 2],
      depth: 6,
      rows: [
        '....HHHHH....',
        '..HHjjHHHHH..',
        '.HjjjHHhHHHh.',
        'HjjHHhHHHhHhh',
        'HHbbbsssbbbhh',
        'Hssyysssssszh',
        'zsswesysewszZ',
        'zsssssyzssszZ',
        '.ssssssZssss.',
        '.ssssmmmsssz.',
        '..ssssysssz..',
        '....zszzz....',
      ],
      R: { face: 3, hair: 2.5 },
    },
    {
      // Pauldrons, two lames each, over the shoulders.
      at: [9, 14],
      depth: 7,
      rows: [
        '..aAAAA.........AAAA',
        '.aaAAAA........AAAAAA',
        'aAAAAAA........AAAAAAA',
        'BBBBBB..........BBBBBB',
        'AAAAA............AAAAA',
        '.AAA..............AAA',
      ],
      R: { paul: 2 },
    },
    BLADE,
    { at: [6, 24], depth: 8, rows: ['G......G', 'GGGGGGGG'], R: { guard: 1 } },
    { at: [10, 29], depth: 8, rows: ['GG'] },
    { at: [9, 26], depth: 9, rows: ['ffff', 'ffff', '.fFF'], R: { hand: 1.5 } },
    {
      // The kite shield on the right forearm, over everything.
      at: [24, 19],
      depth: 10,
      rows: [
        'NNNNNNNNNNNN',
        'NvvVVXXVVVVN',
        'NvVVVXXVVVVN',
        'NVVVVXXVVVVN',
        'NVVVVXXVVVVN',
        'NVVVVXXVVVVN',
        'NXXXXXXXXXXN',
        'NxxxxxxxxxxN',
        'NVVVVXXVVVVN',
        'NVVVVXXVVVVN',
        'NVVVVXXVVVVN',
        'NVVVVXXVVVVN',
        'NVVVVXXVVVVN',
        '.NVVVXXVVVN',
        '.NVVVXXVVVN',
        '..NVVXXVVN',
        '..NVVXXVVN',
        '...NVXXVN',
        '...NVXXVN',
        '....NXXN',
        '.....NN',
      ],
      R: { shield: 5 },
    },
  ],
};

/** A villager in undyed linen, hood up, hands at rest. */
export const VILLAGER_B: FigureDef = {
  w: 40,
  h: 49,
  fall: 0.9,
  legend: legendOf(VILLAGER_EXTRA),
  layers: [
    {
      // Linen trousers, shins wrapped, and soft shoes.
      at: [14, 30],
      depth: 1,
      rows: [
        '.RRRR.RRRR',
        '.RRRR.RRRR',
        '.RRRr.RRRr',
        '.RRRr.RRRr',
        '.RRRr.RRRr',
        '.RRRr.RRRr',
        '.rRRr.rRRr',
        '.RrRr.RrRr',
        '.RRrr.RRrr',
        '.rRRr.rRRr',
        '.RrRr.RrRr',
        '.RRrr.RRrr',
        '.OOOO.OOOO',
        '.OOOO.OOOO',
        'OOOOO.OOOOO',
        'OOOOO.OOOOO',
        'OOOOO.OOOOO',
        'SSSSS.SSSSS',
      ],
    },
    {
      // The tunic, long, with a laced neck and a rope belt.
      at: [13, 15],
      depth: 2,
      rows: [
        '..TTTT%TTT...',
        '.TTTTT%TTTT..',
        '.TTTT%T%TTTt.',
        '.TTTTT%TTTTt.',
        '.TTTT%T%TTtt.',
        '.TTTTTTTTTtt.',
        '.TTTTTTTTTtt.',
        '.TTTTTTTTTtt.',
        '..TTTTTTTTt..',
        '..TTTTTTTTt..',
        '..TTTTTTTTt..',
        '..LLLLLLLLL..',
        '..UUUUUUUuU..',
        '.UUuUUUUuUUu.',
        '.UUuUUUUuUUu.',
        'UUUuUUUUuUUuu',
        'UUuUUUUUUuUuu',
        'UUuUU...UuUUu',
      ],
    },
    {
      // Linen sleeves rolled to the elbow.
      at: [10, 16],
      depth: 4,
      rows: [
        '.AAA...........AAA.',
        'AAAA...........AAAa',
        'AAAa...........AAAa',
        'AAAa...........AAAa',
        'AAAa...........AAAa',
        'AAAa...........AAAa',
        'aaaa...........aaaa',
      ],
    },
    {
      // Bare forearms, the hands clasped in front of the belt.
      at: [10, 23],
      depth: 5,
      rows: [
        'fffF...........ffFF',
        '.fffF.........ffFF.',
        '...fffffFFFFFFF....',
        '.....ffFFFFFF......',
      ],
      R: { hand: 1.5 },
    },
    {
      // The hood's short cape over the shoulders.
      at: [11, 14],
      depth: 6,
      rows: [
        '...KKKKKKKKKKK...',
        '..KKKKKKKKKKKKY..',
        '.KKKKKKKKKKKKKYY.',
        '.KKKYKKKKKKYKKYY.',
        '.KKKYKKKKKKKYKYY.',
        '..KK.KKK.KKK.KY..',
      ],
      R: { cape: 2.5 },
    },
    {
      // The hood up, the face deep in it.
      at: [12, 2],
      depth: 7,
      rows: [
        '....lllllll....',
        '..lllllllllll..',
        '.llllllilllllI.',
        '.lllIIIIIIIilI.',
        'lllzzzzzzzzzlii',
        'llibbbsssbbbIli',
        'llIswesysewzIli',
        'llIssssyzsszIli',
        'llIsssssZsszIli',
        'llIsssmmmszzIli',
        'lllIsssyszzIlli',
        'lllliIzzzzIliii',
      ],
      R: { hood: 3, face: 2.5 },
    },
  ],
};
