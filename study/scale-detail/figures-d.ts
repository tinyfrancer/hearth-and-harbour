/**
 * Art study (not shipped), option D: the hero and the villager at about 32
 * art pixels tall, so more of the town fits on the screen. The same six-step
 * shading as B and C, as far as it fits: eyes are one pixel, the face has a
 * lit side and a nose shadow, plate keeps its ridge and one lame line, and the
 * shield keeps its cross. Drawn fresh at this size.
 */
import type { FigureDef, Layer } from './engine';
import { filled } from './figures-b';
import { VILLAGER_EXTRA, legendOf } from './legend';

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

function cloakD(): Layer {
  return filled(
    9,
    30,
    (y) => {
      const t = Math.sqrt((y - 9) / 21);
      return [lerp(9, 4, t), lerp(18, 23, t)];
    },
    (x, y, l) => {
      if (y === 30 && (x - l) % 3 === 2) return '.';
      if (y < 14) return 'C';
      const f = x % 3;
      return f === 0 ? 'c' : f === 2 ? 'D' : 'C';
    },
    0,
  );
}

const BLADE_D: Layer = (() => {
  const rows: string[] = [];
  for (let y = 0; y <= 15; y++) {
    const cx = 8 - Math.floor((15 - y) / 4);
    rows.push(y === 0 ? '.'.repeat(cx) + 'M' : '.'.repeat(cx - 1) + (y === 4 ? 'WM' : 'MM'));
  }
  return { at: [0, 0], depth: 8, rows, R: { blade: 1 } };
})();

const FACE_D = ['Hzbsssbzhh', 'zsseyzeszZ', '.sssyZszz.', '.ssmmmmzz.', '..ssszzz..'];

export const HERO_D: FigureDef = {
  w: 28,
  h: 34,
  fall: 0.8,
  legend: legendOf(),
  layers: [
    cloakD(),
    {
      at: [9, 19],
      depth: 1,
      rows: [
        '.RRr..RRr.',
        '.RRr..RRr.',
        '.RRr..RRr.',
        '.RRr..RRr.',
        '.KKK..KKK.',
        '.^^^..^^^.',
        '.RRr..RRr.',
        '.RRr..RRr.',
        '.ooo..ooo.',
        '.OOO..OOO.',
        '.OOO..OOO.',
        '.OOO..OOO.',
        'OOOO..OOOO',
        'SSSS..SSSS',
      ],
      R: { knee: 1, boot: 1.5, legs: 1.5 },
    },
    {
      at: [10, 17],
      depth: 2,
      rows: ['UUUUUUUU', 'UUuUUuUU', 'UUuUUuUu', 'UuU..UuU'],
      R: { skirt: 1.5 },
    },
    {
      at: [10, 9],
      depth: 3,
      rows: [
        '..kkkk..',
        '.PPpQQQ.',
        'PPPpQQQQ',
        'PWPpQQQQ',
        'PPPpQQQQ',
        'PPPpQQQQ',
        'qqqqqqqq',
        '.PPpQQQ.',
      ],
      R: { breast: 1.5 },
    },
    { at: [10, 17], depth: 4, rows: ['LLLgLLLL'], R: { belt: 1 } },
    { at: [7, 12], depth: 5, rows: ['.TTT', '.TTt', '.TTt', '~~~~', '~~~', '~~~'] },
    {
      at: [9, 1],
      depth: 6,
      rows: ['..HHHHHH..', '.HjjHHHHh.', 'HHyyssssHh', ...FACE_D],
      R: { face: 2, hair: 1.5 },
    },
    {
      at: [7, 9],
      depth: 7,
      rows: ['..aAA....AAA..', '.aAAA....AAAA.', 'BBBB......BBBB', 'AAA........AAA'],
      R: { paul: 1.5 },
    },
    BLADE_D,
    { at: [5, 15], depth: 8, rows: ['G.....G', 'GGGGGGG'], R: { guard: 1 } },
    { at: [8, 19], depth: 8, rows: ['G'] },
    { at: [7, 17], depth: 9, rows: ['fff', 'fFF'], R: { hand: 1 } },
    {
      at: [17, 12],
      depth: 10,
      rows: [
        'NNNNNNNN',
        'NvVXXVVN',
        'NVVXXVVN',
        'NXXXXXXN',
        'NxxXXxxN',
        'NVVXXVVN',
        'NVVXXVVN',
        'NVVXXVVN',
        'NVVXXVVN',
        '.NVXXVN',
        '.NVXXVN',
        '..NXXN',
        '..NXXN',
        '...NN',
      ],
      R: { shield: 4 },
    },
  ],
};

const hoodedD = (row: string, i: number): string => {
  const core = row.slice(1, 9).replace(/\./g, 'I');
  return i === 0 ? core.replace(/s/g, 'z') : core;
};

export const VILLAGER_D: FigureDef = {
  w: 28,
  h: 34,
  fall: 0.8,
  legend: legendOf(VILLAGER_EXTRA),
  layers: [
    {
      at: [9, 20],
      depth: 1,
      rows: [
        '.RRr..RRr.',
        '.RRr..RRr.',
        '.RRr..RRr.',
        '.RRr..RRr.',
        '.RRr..RRr.',
        '.rrr..rrr.',
        '.RRr..RRr.',
        '.rrr..rrr.',
        '.RRr..RRr.',
        '.OOO..OOO.',
        '.OOO..OOO.',
        'OOOO..OOOO',
        'SSSS..SSSS',
      ],
      R: { legs: 1.5, boot: 1.5 },
    },
    {
      at: [10, 10],
      depth: 2,
      rows: [
        'TTT%TTtt',
        'TTT%TTtt',
        'TTTTTTtt',
        'TTTTTTtt',
        'TTTTTTtt',
        'TTTTTTtt',
        'LLLLLLLL',
        'UUUuUUuU',
        'UUuUUUuu',
        'UuUUUUuu',
        'UuU..UuU',
      ],
      R: { tunic: 2, skirt: 2 },
    },
    {
      at: [7, 11],
      depth: 4,
      rows: [
        'AAA........AAA',
        'AAA........AAa',
        'AAa........AAa',
        '.AAa......aAa.',
        '..AAa....aAa',
      ],
      R: { arm: 1.5 },
    },
    { at: [11, 16], depth: 5, rows: ['ffffff', '.fFFF.'], R: { hand: 1 } },
    {
      at: [7, 9],
      depth: 6,
      rows: ['..KKKKKKKKKK..', '.KKKKKKKKKKKY.', 'KKKKYKKKKYKKYY', 'KK.KKK..KKK.YY'],
      R: { cape: 1.5 },
    },
    {
      at: [8, 1],
      depth: 7,
      rows: [
        '...llllll...',
        '.llllllllii.',
        'llIIIIIIIIii',
        ...FACE_D.map((r, i) => 'lI' + hoodedD(r, i) + 'Ii'),
        'llllIzzIiiii',
      ],
      R: { hood: 2, face: 2 },
    },
  ],
};
