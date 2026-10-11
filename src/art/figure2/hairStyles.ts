/**
 * The hairstyles added in B13 (Cody: "Need more hairstyles"), each drawn
 * three ways for the C-scale head: from the front (on the H2 head, rows from
 * `HEAD_AT`), in profile (rows from `PROFILE_AT`, facing right) and from
 * behind (rows from `HEAD_AT`, the figure's right on the viewer's right). Each
 * has its own silhouette, so it is itself at true size in every facing: the
 * ponytail's tail swinging out behind, the topknot's bun on the crown, the
 * curls' round cloud, the mohawk's fin, the bob's blunt curtain to the jaw,
 * twin braids over the shoulders.
 *
 * Drawn in the `hair` ramp, a pixel proud of the skull; split as every style
 * is into what head gear covers and what hangs by a rim (hair.ts): under a
 * helm or cap only what lies below the rim shows, under a hood what falls
 * out of it. Hair never covers an eye or a brow. The curls are the one style
 * whose texture is worked out: each curl is placed by hand as a centre and a
 * size, and shaded as a little dome lit from the upper left (`curls`).
 */
import { DEPTH } from '../depth';
import type { Pins } from './engine';
import type { Part2 } from './engine';
import { HEAD_AT } from './body';

const { HAIR, HAIR_BACK, HAIR_OVER } = DEPTH;
const [HX, HY] = HEAD_AT;
const PX = HX - 1;
const PY = HY;

/** The tie round a ponytail, a bun or a braid's end: a leather thong. */
const TIE: Pins = { r: ['leather', 2], R: ['leather', 4] };

const part = (x: number, y: number, rows: readonly string[], depth: number = HAIR): Part2 => ({
  at: [x, y],
  depth,
  mat: 'hair',
  rows,
  cast: depth !== HAIR_BACK,
  pins: TIE,
});

/**
 * Curls: discs placed by hand ([x, y, radius] in canvas pixels), each shaded
 * as a small dome (its upper left a step lit, its lower right a step dark,
 * where two meet a step darker), the whole lit across from the left. The
 * pixels in `keep` (the face) are left clear.
 */
export function curls(
  centres: readonly (readonly [number, number, number])[],
  keep: (x: number, y: number) => boolean = () => false,
  depth: number = HAIR,
  lift = 0,
  crease = 0.18,
): Part2 {
  const xs = centres.flatMap(([x, , r]) => [x - r, x + r]);
  const ys = centres.flatMap(([, y, r]) => [y - r, y + r]);
  const x0 = Math.floor(Math.min(...xs));
  const x1 = Math.ceil(Math.max(...xs));
  const y0 = Math.floor(Math.min(...ys));
  const y1 = Math.ceil(Math.max(...ys));
  const rows: string[] = [];
  for (let y = y0; y <= y1; y++) {
    let row = '';
    for (let x = x0; x <= x1; x++) {
      if (keep(x, y)) {
        row += '.';
        continue;
      }
      // The nearest curl, by how deep inside it the pixel is.
      let best = -1;
      let depthIn = -1;
      let second = -1;
      centres.forEach(([cx, cy, r], i) => {
        const d = 1 - Math.hypot(x - cx, y - cy) / (r + 0.35);
        if (d > depthIn) {
          second = depthIn;
          depthIn = d;
          best = i;
        } else if (d > second) second = d;
      });
      if (depthIn < 0) {
        row += '.';
        continue;
      }
      const [cx, cy, r] = centres[best]!;
      const across = (x - x0) / Math.max(1, x1 - x0);
      let s = (across < 0.3 ? 1.6 : across < 0.7 ? 2.3 : 3.1) - lift;
      const lean = (x - cx + (y - cy)) / Math.max(1, r);
      if (lean < -0.7) s -= 1;
      else if (lean > 0.6) s += 1;
      // Where two curls meet, the crease between them.
      if (second > -0.05 && depthIn - second < crease) s += 1;
      row += String(Math.max(0, Math.min(5, Math.round(s))));
    }
    rows.push(row);
  }
  return {
    at: [x0, y0],
    depth,
    mat: 'hair',
    rows: rows.map((r) => r.replace(/\.+$/, '') || '.'),
    cast: true,
  };
}

/** A plait three wide hanging `n` crossings, a thong and a tuft at its end; `dark` a step deeper (the shadow side). */
function plait(n: number, dark = 0): string[] {
  const d = (s: string) => s.replace(/[0-5]/g, (c) => String(Math.min(5, Number(c) + dark)));
  const out = ['.12.', '123.'];
  for (let i = 0; i < n; i++) out.push('.23.', '123.', '232.');
  out.push('.rR.', '1234', '1..3');
  return out.map(d);
}

// =================================================================== FRONT

// The H2 head from the front: skull rows 7 to 19, the brows on row 11, the
// eyes 13 and 14, the mouth 17, the jaw 19; ears on columns 21 and 35.

/** Hair pulled back from a high, clean hairline (the ponytail's, the topknot's). */
const PULLED_CROWN = part(HX, HY, [
  '....0112333....',
  '..01112223334..',
  '.0111222233344.',
  '.012.......334.',
  '012.........345',
  '12...........45',
  '1.............5',
]);

export interface HairDrawing {
  /** From the front, the whole style. */
  readonly front: readonly Part2[];
  /** In profile, the whole style. */
  readonly side: readonly Part2[];
  /** From behind, the whole style. */
  readonly back: readonly Part2[];
  /** What falls out of a hood, over it (front, profile, behind). */
  readonly hood?: { front?: Part2[]; side?: Part2[]; back?: Part2[] };
  /** Tucked away whole under a hood. */
  readonly tucked?: boolean;
}

const PONYTAIL: HairDrawing = {
  front: [
    PULLED_CROWN,
    // The tail swings out past the far side of the head, behind it.
    part(
      HX + 15,
      HY + 4,
      [
        '.33.',
        '2rR4',
        '2344',
        '1234',
        '1234',
        '.234',
        '.2344',
        '..234',
        '..234',
        '..234',
        '..34.',
        '..34',
        '...4',
      ],
      HAIR_BACK,
    ),
  ],
  side: [
    part(PX, PY - 1, [
      '.....00112......',
      '...0011111223...',
      '..011111112233..',
      '.01111111122334.',
      '0111111112223...',
      '01111222223.....',
      '0112222.........',
      '1122............',
      '.12.............',
    ]),
    // Tied at the back of the head, the tail sweeping back and down behind the neck.
    part(PX - 6, PY + 4, [
      '....rRr',
      '..11233',
      '.11234.',
      '.1234..',
      '11234..',
      '1234...',
      '1234...',
      '1234...',
      '1234...',
      '.234...',
      '.234...',
      '.234...',
      '..34...',
      '..4....',
    ]),
  ],
  back: [
    part(HX, HY - 1, [
      '.....001112....',
      '...0011121223..',
      '..011112122233.',
      '.01111212122334',
      '.11112121222334',
      '.11121212223334',
      '..112121222334.',
      '...1122222233..',
    ]),
    part(HX + 5, HY + 6, [
      '.rRr.',
      '12234',
      '12234',
      '12234',
      '.1233',
      '.1234',
      '.1234',
      '.1233',
      '.123.',
      '.123.',
      '.123.',
      '..23.',
      '..3..',
    ]),
  ],
};

const TOPKNOT: HairDrawing = {
  front: [
    part(HX, HY, [
      '....0122333....',
      '..01121223334..',
      '.0112122233344.',
      '.012.......334.',
      '01...........45',
      '1.............5',
    ]),
    part(HX + 4, HY - 5, ['..011...', '.011223.', '.112233.', '.112234.', '..rRRr..']),
  ],
  side: [
    part(PX, PY - 1, [
      '.....00112......',
      '...0011121223...',
      '..011121212233..',
      '.01112121222334.',
      '0111121212223...',
      '0111222223......',
      '0112233.........',
      '.123............',
    ]),
    part(PX + 3, PY - 5, ['..011.', '.01122', '.11223', '.12234', '..rRR.']),
  ],
  back: [
    part(HX, HY - 1, [
      '.....012123....',
      '...0112121233..',
      '..011212122233.',
      '.01112121222334',
      '.11121212122334',
      '..112121222334.',
      '...1222222233..',
      '....12223334...',
    ]),
    part(HX + 4, HY - 5, ['..0112..', '.011223.', '.112234.', '.122344.', '..rRRr..']),
  ],
};

// The face's clear space (brows, eyes, cheeks) from the front and in profile.
const faceFront = (x: number, y: number) => y >= 10 && x >= 23 && x <= 34;
const faceSide = (x: number, y: number) => (y >= 9 && x >= 31) || (y >= 13 && x >= 29);

const CURLY: HairDrawing = {
  tucked: true,
  front: [
    curls(
      [
        [22, 5, 2],
        [25, 4, 2],
        [28, 3.5, 2],
        [31, 4, 2],
        [34, 5, 2],
        [20, 8, 2],
        [36, 8, 2],
        [19, 11, 2],
        [37, 11, 2],
        [19, 14, 1.8],
        [37, 14, 1.8],
        [20, 17, 1.4],
        [36, 17, 1.4],
        [24, 8, 1.5],
        [27, 7, 1.6],
        [30, 7, 1.6],
        [33, 8, 1.5],
        [23, 10, 1.1],
        [34, 10, 1.1],
      ],
      faceFront,
    ),
  ],
  side: [
    curls(
      [
        [32, 6, 2],
        [29, 3.5, 2],
        [26, 3.5, 2],
        [23, 4.5, 2],
        [20, 7, 2],
        [19, 10, 2],
        [19, 13, 2],
        [20, 16, 1.6],
        [23, 15, 1.6],
        [33, 8.5, 1.4],
        [26, 7, 2],
        [23, 9, 2],
        [24, 12, 1.6],
        [29, 7, 1.6],
      ],
      faceSide,
    ),
  ],
  back: [
    curls(
      [
        [22, 5, 2],
        [25, 4, 2],
        [28, 3.5, 2],
        [31, 4, 2],
        [34, 5, 2],
        [20, 8, 2],
        [36, 8, 2],
        [19, 11, 2],
        [37, 11, 2],
        [20, 14, 2],
        [36, 14, 2],
        [22, 17, 1.6],
        [34, 17, 1.6],
        [25, 8, 2],
        [28, 7.5, 2],
        [31, 8, 2],
        [24, 12, 2],
        [28, 11.5, 2],
        [32, 12, 2],
        [25, 16, 1.8],
        [28, 16, 1.8],
        [31, 16, 1.8],
      ],
      () => false,
      HAIR,
      0.5,
      0.1,
    ),
  ],
};

const MOHAWK: HairDrawing = {
  front: [
    part(HX + 5, HY - 5, [
      '..01.',
      '.012.',
      '.0123',
      '01123',
      '01223',
      '01234',
      '.1234',
      '.123.',
      '..3..',
    ]),
    // The shaved sides: a shadow of stubble over each temple.
    part(HX + 1, HY + 2, ['55.........55', '5...........5']),
  ],
  side: [
    part(PX - 1, PY - 7, [
      '....0...........',
      '....01...0......',
      '.....11..01...0.',
      '....0111.0112.01',
      '...0111111122233',
      '..01111111222334',
      '..0111111222334.',
      '.0112.......234.',
      '.012.........23.',
      '.012............',
      '0112............',
      '012.............',
      '012.............',
      '.12.............',
      '.23.............',
      '..3.............',
    ]),
  ],
  back: [
    part(HX + 5, HY - 5, [
      '..01.',
      '.012.',
      '.0123',
      '01123',
      '01223',
      '01234',
      '11234',
      '11234',
      '.1234',
      '.1233',
      '.1234',
      '.123.',
      '.123.',
      '.123.',
      '..23.',
      '..3..',
    ]),
    part(HX + 1, HY + 3, ['5...........5', '5...........5', '.5.........5.']),
  ],
};

const BOB: HairDrawing = {
  front: [
    part(HX - 1, HY, [
      '.....01122233....',
      '...001111222334..',
      '..00111122223344.',
      '.0011111222233345',
      '.0122222222233345',
      '0123.........3345',
      '012...........345',
      '112...........344',
      '112...........344',
      '1122.........3344',
      '11222.......33445',
      '.12233.....33445.',
      '..1234.....3445..',
    ]),
  ],
  side: [
    part(PX - 1, PY - 1, [
      '......00112......',
      '....0011111223...',
      '...011111111233..',
      '..01111111122334.',
      '.0111111111223344',
      '.0112222222223344',
      '.0112222222......',
      '.011222223.......',
      '.011222223.......',
      '.112222233.......',
      '.112222233.......',
      '.122222333.......',
      '.122223334.......',
      '..1223344........',
      '...2344..........',
    ]),
  ],
  back: [
    part(HX - 1, HY - 1, [
      '......001112.....',
      '....0011111123...',
      '...011111111223..',
      '..01111111112233.',
      '.0111111111122334',
      '.0101010111222334',
      '.1010101011222334',
      '.1111111112223334',
      '.1121112122223334',
      '.1121212122233344',
      '.1121212122233344',
      '.1122222222233344',
      '.1122222222333344',
      '..12222222333344.',
      '..44444444444455.',
    ]),
  ],
};

const TWIN_BRAIDS: HairDrawing = {
  front: [
    part(HX, HY, [
      '....0114233....',
      '..00111423334..',
      '.0011114223344.',
      '0111.......3344',
      '012.........345',
      '12...........45',
      '12...........45',
      '12...........45',
      '.2...........4.',
    ]),
    // Over the shoulders and down the chest, over whatever is worn.
    part(HX - 3, HY + 9, plait(5), HAIR_OVER),
    part(HX + 14, HY + 9, plait(5, 1), HAIR_OVER),
  ],
  side: [
    part(PX, PY - 1, [
      '.....00112......',
      '...0011111223...',
      '..011111112233..',
      '.01111111122334.',
      '0111111112223334',
      '0111222222233...',
      '0112233.........',
      '01223...........',
      '1223............',
      '.23.............',
    ]),
    // The near braid from behind the ear, forward over the shoulder and down the chest.
    part(
      PX + 4,
      PY + 10,
      [
        '12......',
        '123.....',
        '.23.....',
        '123.....',
        '.232....',
        '..23....',
        '..123...',
        '...232..',
        '....23..',
        '....123.',
        '....232.',
        '.....23.',
        '....123.',
        '....232.',
        '.....23.',
        '....123.',
        '....232.',
        '....rR..',
        '...1234.',
        '...1..3.',
      ],
      HAIR_OVER,
    ),
  ],
  back: [
    part(HX, HY - 1, [
      '.....0014112...',
      '...00111411223.',
      '..011111412233.',
      '.01111114122334',
      '.11111114122334',
      '.11121214222334',
      '.1112121422334.',
      '..11212142334..',
      '...122224334...',
    ]),
    // Each braid from the nape forward over its shoulder (the rest is in front of the body).
    part(HX, HY + 8, [
      '..12.',
      '.123.',
      '..23.',
      '.123.',
      '.232.',
      '123..',
      '232..',
      '23...',
      '3....',
    ]),
    part(HX + 10, HY + 8, [
      '.23..',
      '.234.',
      '.34..',
      '.234.',
      '.343.',
      '..234',
      '..343',
      '...34',
      '....4',
    ]),
  ],
};

/** The long hair's locks out of a hood's opening, over its cape (front and profile). */
export const LONG_HOOD: NonNullable<HairDrawing['hood']> = {
  front: [
    part(
      HX + 2,
      HY + 11,
      ['12.', '122', '122', '122', '1223', '1223', '1223', '.123', '.122', '..12', '...2'],
      HAIR_OVER,
    ),
    part(
      HX + 11,
      HY + 11,
      ['.34', '344', '344', '344', '3344', '3344', '2344', '234.', '344.', '34..', '4...'],
      HAIR_OVER,
    ),
  ],
  side: [
    part(
      PX + 10,
      PY + 12,
      ['12.', '122', '1223', '1223', '1223', '.123', '.1223', '..123', '..12.', '...2.'],
      HAIR_OVER,
    ),
  ],
};

/** The B13 styles by look id, in the order they are offered. */
export const NEW_HAIR: Readonly<Record<string, HairDrawing>> = {
  ponytail: PONYTAIL,
  topknot: TOPKNOT,
  curly: CURLY,
  mohawk: MOHAWK,
  bob: BOB,
  twin_braids: TWIN_BRAIDS,
};

/**
 * What of a part lies on or below row `y` (what shows under head gear's rim);
 * hair laid over the gear (`HAIR_OVER`: a braid over a cape) is kept whole.
 */
export function clipFrom(p: Part2, y: number): Part2 {
  if (p.depth === HAIR_OVER) return p;
  const from = Math.max(0, y - p.at[1]);
  const rows = p.rows.slice(from);
  return { ...p, at: [p.at[0], p.at[1] + from], rows: rows.length ? rows : ['.'] };
}

/** The row head gear's rim covers down to: from it down, hair shows under a helm, a cap or a hat. */
export const RIM_FRONT = HY + 5;
export const RIM_SIDE = HY + 4;
