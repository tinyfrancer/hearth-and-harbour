/**
 * Art study (not shipped), option C: the hero and the villager at about 64
 * art pixels tall, shown at 3 device pixels each so they stand about as tall
 * on the phone as today's 47-pixel figures at 4. The extra pixels go into the
 * face (three-pixel eyes with an iris, lids, a nose with a lit side, two
 * lips), the plate (three lames on each pauldron, a couter at the elbow, two
 * fauld lames, a knee cop with a lower lame), the fist's fingers and the gilt
 * guard's quillons. Same knight as the approved hero; drawn fresh.
 */
import type { FigureDef, Layer } from './engine';
import { filled } from './figures-b';
import { VILLAGER_EXTRA, legendOf } from './legend';

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

function cloakC(): Layer {
  return filled(
    18,
    62,
    (y) => {
      const t = Math.sqrt((y - 18) / 44);
      return [lerp(18, 6, t), lerp(34, 46, t)];
    },
    (x, y, l) => {
      if (y === 62 && (x - l) % 5 < 2) return '.';
      if (y < 27) return 'C';
      const f = (x + (y > 48 ? 2 : 0)) % 5;
      return f === 0 ? 'c' : f === 3 ? 'D' : 'C';
    },
    0,
  );
}

const BLADE_C: Layer = (() => {
  const rows: string[] = [];
  for (let y = 0; y <= 34; y++) {
    const cx = 14 - Math.floor((34 - y) / 5);
    if (y === 0) rows.push('.'.repeat(cx) + 'M');
    else if (y === 1) rows.push('.'.repeat(cx - 1) + 'M|');
    else {
      const glint = y === 7 || y === 8 || y === 9 ? 'W' : '|';
      rows.push('.'.repeat(cx - 1) + 'M' + glint + 'M');
    }
  }
  return { at: [0, 0], depth: 8, rows, R: { blade: 1.5 } };
})();

/** The head below the hair, shared by the hero and (inside the hood) the villager: columns 18-34. */
const FACE_C = [
  '.HHsyyyysssssZhh.',
  '.Hsbbbbsssbbbbzh.',
  '.zsswEesyseEwzzZ.',
  '.zssyssyszssszzZ.',
  '..ssssssyZsszzz..',
  '..ssssmmmmmszzz..',
  '...ssssnnnszzz...',
  '....zssyszzzz....',
  '.....zzzzzzz.....',
];

export const HERO_C: FigureDef = {
  w: 54,
  h: 68,
  fall: 0.9,
  legend: legendOf(),
  layers: [
    cloakC(),
    {
      at: [19, 41],
      depth: 1,
      rows: [
        '.RRRRRr.RRRRRr.',
        '.RRRRRr.RRRRRr.',
        '.RRRRRr.RRRRRr.',
        '.RRRRrr.RRRRrr.',
        '.RRRRrr.RRRRrr.',
        '.RRRRrr.RRRRrr.',
        '..KKKK...KKKK..',
        '.KKKKKK.KKKKKK.',
        '.KKKKKK.KKKKKK.',
        '..^^^^...^^^^..',
        '.RRRRrr.RRRRrr.',
        '.RRRRrr.RRRRrr.',
        '.RRRRrr.RRRRrr.',
        '.oooooo.oooooo.',
        '.OOOOOO.OOOOOO.',
        '.OOOOOO.OOOOOO.',
        '.OOOOOO.OOOOOO.',
        '.OOOOOO.OOOOOO.',
        '.OOOOOO.OOOOOO.',
        '.OOOOOO.OOOOOO.',
        '.OOOOOO.OOOOOO.',
        'OOOOOOO.OOOOOOO',
        'OOOOOOO.OOOOOOO',
        'OOOOOOO.OOOOOOO',
        'SSSSSSS.SSSSSSS',
      ],
      R: { knee: 2, boot: 2.5, legs: 2.5 },
    },
    {
      at: [19, 36],
      depth: 2,
      rows: [
        '.UUUUUUUUUUUUU.',
        '.UUUUUUUUUUUUU.',
        '.UUuUUUUuUUUuU.',
        'UUUuUUUUuUUUuUU',
        'UUUuUUUUuUUUuUu',
        'UUuUUUUuUUUuUUu',
        'UUuUUUUuUUUuUUu',
        'UUuUU.....UuUUu',
      ],
      R: { skirt: 3 },
    },
    {
      at: [19, 16],
      depth: 3,
      rows: [
        '.....kkkkk.....',
        '.....kkkkk.....',
        '.....kkkkk.....',
        '....kkkkkkk....',
        '...PPPPpQQQQ...',
        '..PPPPPpQQQQQ..',
        '.P::PPPpQQQQQQ.',
        'PP:WPPPpQQQQQQQ',
        'PP::PPPpQQQQQQQ',
        'PPP:PPPpQQQQQQQ',
        'PPPPPPPpQQQQQQQ',
        'PPPPPPPpQQQQQQQ',
        'PPPPPPPpQQQQQQQ',
        'PPPPPPPpQQQQQQQ',
        'PPPPPPPpQQQQQQQ',
        '.qqqqqqqqqqqqqq',
        '.PPPPPPpQQQQQQ.',
        '.PPPPPPpQQQQQQ.',
        '.qqqqqqqqqqqqq.',
        '.PPPPPPpQQQQQQ.',
      ],
      R: { breast: 2.5 },
    },
    { at: [20, 36], depth: 4, rows: ['LLLLLgggLLLLL', 'LLLLLgLgLLLLL'], R: { belt: 1, buckle: 1 } },
    {
      // The sword arm: sleeve, a couter at the elbow, a leather bracer.
      at: [12, 24],
      depth: 5,
      rows: [
        '..TTTTT',
        '..TTTTT',
        '..TTTTt',
        '..TTTTt',
        '..TTTTt',
        '..TTTtt',
        '.KKKKK',
        '.KKKKKK',
        '..^^^^',
        '.~~~~~',
        '.~~~~~',
        '~~~~~',
      ],
      R: { knee: 1.5 },
    },
    {
      at: [18, 3],
      depth: 6,
      rows: [
        '....HHHHHHHHH....',
        '..HHjjjjHHHHHHH..',
        '.HjjjHHHHhHHHHhh.',
        '.HjHHHhHHHHhHHhh.',
        ...FACE_C,
      ],
      R: { face: 3.5, hair: 3 },
    },
    {
      at: [12, 19],
      depth: 7,
      rows: [
        '....aAAAAA.........AAAAAA....',
        '..aaAAAAAA.........AAAAAAAA..',
        '.aWAAAAAAA.........AAAAAAAAA.',
        'aAAAAAAAA...........AAAAAAAAA',
        'BBBBBBBB.............BBBBBBBB',
        'AAAAAAA...............AAAAAAA',
        'BBBBBBB...............BBBBBBB',
        '.AAAAA.................AAAAA.',
      ],
      R: { paul: 2.5 },
    },
    BLADE_C,
    {
      at: [8, 34],
      depth: 8,
      rows: ['G...........G', 'GGGGGGGGGGGGG'],
      R: { guard: 1 },
    },
    { at: [13, 40], depth: 8, rows: ['GGG', '.G.'], R: { guard: 1 } },
    { at: [12, 36], depth: 9, rows: ['fffff', 'fFfFF', 'ffFFF', '.fFF.'], R: { hand: 1.5 } },
    {
      at: [33, 25],
      depth: 10,
      rows: [
        'NNNNNNNNNNNNNNNN',
        'NvvvVVVXXVVVVVVN',
        'NvvVVVVXXVVVVVVN',
        'NvVVVVVXXVVVVVVN',
        'NVVVVVVXXVVVVVVN',
        'NVVVVVVXXVVVVVVN',
        'NVVVVVVXXVVVVVVN',
        'NVVVVVVXXVVVVVVN',
        'NXXXXXXXXXXXXXXN',
        'NXXXXXXXXXXXXXXN',
        'NxxxxxxXXxxxxxxN',
        'NVVVVVVXXVVVVVVN',
        'NVVVVVVXXVVVVVVN',
        'NVVVVVVXXVVVVVVN',
        'NVVVVVVXXVVVVVVN',
        'NVVVVVVXXVVVVVVN',
        'NVVVVVVXXVVVVVVN',
        '.NVVVVVXXVVVVVN',
        '.NVVVVVXXVVVVVN',
        '..NVVVVXXVVVVN',
        '..NVVVVXXVVVVN',
        '...NVVVXXVVVN',
        '...NVVVXXVVVN',
        '....NVVXXVVN',
        '....NVVXXVVN',
        '.....NVXXVN',
        '.....NVXXVN',
        '......NXXN',
        '.......NN',
      ],
      R: { shield: 7 },
    },
  ],
};

/** The face again, set in the hood (columns 20-32), the forehead in the hood's shadow. */
const hooded = (row: string, i: number): string =>
  i === 0 ? 'zzzzzzzzzzzzz' : row.slice(2, 15).replace(/\./g, 'I');

export const VILLAGER_C: FigureDef = {
  w: 54,
  h: 68,
  fall: 0.9,
  legend: legendOf(VILLAGER_EXTRA),
  layers: [
    {
      at: [19, 42],
      depth: 1,
      rows: [
        '.RRRRRr.RRRRRr.',
        '.RRRRRr.RRRRRr.',
        '.RRRRrr.RRRRrr.',
        '.RRRRrr.RRRRrr.',
        '.RRRRrr.RRRRrr.',
        '.RRRRrr.RRRRrr.',
        '.RRRRrr.RRRRrr.',
        '.RRRRrr.RRRRrr.',
        '.rrRRRr.rrRRRr.',
        '.RRrrRr.RRrrRr.',
        '.RRRRrr.RRRRrr.',
        '.rrRRRr.rrRRRr.',
        '.RRrrRr.RRrrRr.',
        '.RRRRrr.RRRRrr.',
        '.rrRRRr.rrRRRr.',
        '.RRrrRr.RRrrRr.',
        '.OOOOOO.OOOOOO.',
        '.OOOOOO.OOOOOO.',
        '.OOOOOO.OOOOOO.',
        'OOOOOOO.OOOOOOO',
        'OOOOOOO.OOOOOOO',
        'OOOOOOO.OOOOOOO',
        'OOOOOOO.OOOOOOO',
        'SSSSSSS.SSSSSSS',
      ],
      R: { legs: 2.5, boot: 2.5 },
    },
    {
      at: [18, 20],
      depth: 2,
      rows: [
        '...TTTTT%TTTTT...',
        '..TTTTTT%TTTTTT..',
        '..TTTTT%T%TTTTt..',
        '..TTTTTT%TTTTTt..',
        '..TTTTT%T%TTTtt..',
        '..TTTTTT%TTTTtt..',
        '..TTTTTTTTTTTtt..',
        '..TTTTTTTTTTTtt..',
        '..TTTTTTTTTTTtt..',
        '..TTTTtTTTTTTtt..',
        '..TTTTtTTTTTtt...',
        '...TTTtTTTTTtt...',
        '...TTTTTTTTTtt...',
        '...TTTTTTTTTtt...',
        '...TTTTTTTTTtt...',
        '...LLLLLLLLLLL...',
        '...LLLLLLLLLLL...',
        '...UUUUUUUUUuU...',
        '..UUUuUUUUUuUUu..',
        '..UUUuUUUUUuUUu..',
        '.UUUuUUUUUUuUUuu.',
        '.UUUuUUUUUUuUUuu.',
        '.UUuUUUUUUUUuUuu.',
        '.UUuUUU...UUuUUu.',
      ],
      R: { tunic: 3, skirt: 3 },
    },
    {
      // Linen sleeves rolled to the elbow.
      at: [15, 22],
      depth: 4,
      rows: [
        '..AAA.............AAA..',
        '.AAAA.............AAAa.',
        '.AAAa.............AAAa.',
        '.AAAa.............AAAa.',
        '.AAAa.............AAAa.',
        '.AAAa.............AAAa.',
        '.AAAa.............AAAa.',
        '.aaaa.............aaaa.',
        '.AAAA.............AAAA.',
      ],
      R: { arm: 2 },
    },
    {
      // Bare forearms coming in to the hands, clasped in front of the belt.
      at: [15, 31],
      depth: 5,
      rows: [
        '.fffF.............ffFF.',
        '..fffF...........ffFF..',
        '...fffF.........ffFF...',
        '.....fffF.....ffFF.....',
        '.......ffffffffF.......',
        '.......fffFFFFFF.......',
        '........fFFFFFF........',
      ],
      R: { hand: 1.5 },
    },
    {
      at: [15, 18],
      depth: 6,
      rows: [
        '....KKKKKKKKKKKKKK....',
        '..KKKKKKKKKKKKKKKKKY..',
        '.KKKKKKKKKKKKKKKKKKYY.',
        '.KKKKKYKKKKKKKKYKKKYY.',
        '.KKKKKYKKKKKKKKKYKKYY.',
        '.KKKKKKYKKKKKKKKYKKYY.',
        '..KKKKKYKKKKKKKKYKYY..',
        '...KKK.KKKK..KKKK.Y...',
      ],
      R: { cape: 3 },
    },
    {
      at: [17, 3],
      depth: 7,
      rows: [
        '.....lllllllll.....',
        '..lllllllllllllii..',
        '.lllllllilllllliii.',
        'lllIIIIIIIIIIIIIiii',
        ...FACE_C.map((r, i) => 'llI' + hooded(r, i) + 'Iii'),
        'lllllIzzzzzIlllliii',
      ],
      R: { hood: 3.5, face: 3 },
    },
  ],
};
