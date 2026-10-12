/**
 * Tier presentation (B19): a small badge for each tier and a padlock, for
 * lane A to put on headings and on locked rows.
 *
 * The badge is a little heater shield in the tier's own rung of the gear
 * ladder, its numeral cut in: tier 1 bronze on hide (the militia), tier 2
 * salt-iron round the knight's blue with a gold numeral, tier 3 gilt on a
 * forest green (the warden), tier 4 gold on enamel with a numeral that
 * glows like the forge (the champion). Told apart by numeral first, then by
 * colour. 12 x 14 inside its outline (14 x 16), in the icons' palette and
 * shown at the icons' whole-pixel scale, so it sits beside an icon or a line
 * of text. The padlock is an ordinary 24 x 24 icon.
 */
import { pixelCanvas } from './canvas';
import { outline, parseSprite, type Grid, type Legend } from './grid';
import { iconGrid } from './iconKit';
import { DAY } from './palette';
import { picture, type Picture } from './raster';

export type Tier = 1 | 2 | 3 | 4;
export const TIERS: readonly Tier[] = [1, 2, 3, 4];

const SHIELD: readonly string[] = [
  'rrrrrrrrrrrR',
  'rffffffffFFR',
  'rffffffffFFR',
  'rffffffffFFR',
  'rffffffffFFR',
  'rffffffffFFR',
  'rffffffffFFR',
  '.rfffffffFR.',
  '.rffffffFFR.',
  '..rfffffFR..',
  '..rffffFFR..',
  '...rfffFR...',
  '....rFFR....',
  '.....RR.....',
];

/** Each numeral's strokes, as [row, column] cells over the shield's field. */
const NUMERAL: Readonly<Record<Tier, readonly (readonly [number, number])[]>> = {
  1: [2, 3, 4, 5, 6, 7, 8].flatMap((y) => [[y, 5] as const, [y, 6] as const]),
  2: [2, 3, 4, 5, 6, 7].flatMap((y) => [
    [y, 3] as const,
    [y, 4] as const,
    [y, 7] as const,
    [y, 8] as const,
  ]),
  3: [2, 3, 4, 5, 6, 7].flatMap((y) => [[y, 2] as const, [y, 5] as const, [y, 8] as const]),
  4: [
    ...[2, 3, 4, 5, 6, 7].map((y) => [y, 2] as const),
    [2, 4],
    [3, 4],
    [2, 8],
    [3, 8],
    [4, 5],
    [5, 5],
    [4, 7],
    [5, 7],
    [6, 6],
    [7, 6],
  ],
};

const LOOKS: Readonly<Record<Tier, Legend>> = {
  1: { r: 'bronze2', R: 'bronze4', f: 'hide1', F: 'hide2', n: 'bronze1' },
  2: { r: 'saltiron1', R: 'saltiron4', f: 'blue1', F: 'blue2', n: 'gold1' },
  3: { r: 'gold1', R: 'gold2', f: 'pine1', F: 'pine2', n: 'gold1' },
  4: { r: 'gold1', R: 'gold2', f: 'midnight2', F: 'midnight3', n: 'fire1' },
};

function badgeGrid(n: Tier): Grid {
  const rows = SHIELD.map((r) => [...r]);
  for (const [y, x] of NUMERAL[n]) rows[y]![x] = 'n';
  return outline(
    parseSprite(
      rows.map((r) => r.join('')),
      LOOKS[n],
    ),
  );
}

const pictures = new Map<string, Picture>();
const kept = (key: string, make: () => Grid): Picture => {
  let pic = pictures.get(key);
  if (!pic) {
    pic = picture(make());
    pictures.set(key, pic);
  }
  return pic;
};

/** A tier's badge as a picture (14 x 16 with its outline). */
export function tierBadgePicture(n: Tier): Picture {
  return kept(`tier ${n}`, () => badgeGrid(n));
}

/** A padlock, closed: an iron shackle over a brass body with its keyhole. */
const LOCK: readonly string[] = [
  '.....mmmmmm.....',
  '....mMnnnnMm....',
  '...mM......nm...',
  '...Mn......nn...',
  '...Mn......nn...',
  '...Mn......nn...',
  '...Mn......nn...',
  '.yyyyyyyyyyyyyy.',
  'yYYYYYYYYYYYYYYd',
  'yYYYYYYxxYYYYYYd',
  'yYYYYYxxxxYYYYYd',
  'yYYYYYxxxxYYYYYd',
  'yYYYYYYxxYYYYYYd',
  'yYYYYYYxxYYYYYYd',
  'yYYYYYYxxYYYYYYd',
  'yYYYYYYYYYYYYYYd',
  '.dddddddddddddd.',
];

/** The padlock as a picture (24 x 24, outlined, like an item icon). */
export function lockIconPicture(): Picture {
  return kept('lock', () =>
    iconGrid({
      rows: LOCK,
      legend: {
        m: 'metal2',
        M: 'metal1',
        n: 'metal3',
        y: 'gold1',
        Y: 'gold2',
        d: 'bronze4',
        x: 'shade1',
      },
    }),
  );
}

function element(pic: Picture, label: string): HTMLCanvasElement {
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  // The icons' whole-pixel scale (icons.ts `iconScale`): about 32 CSS pixels to 24 art pixels.
  const scale = Math.max(1, Math.round((dpr * 32) / 24));
  const canvas = pixelCanvas(pic, { palette: DAY, scale, dpr });
  canvas.classList.add('icon', 'tier-badge');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  return canvas;
}

/**
 * A tier's badge, for a heading or a locked row: a small shield with the
 * tier's numeral, at the icons' whole-pixel scale. Labelled "Tier n".
 */
export function tierBadge(n: Tier): Element {
  return element(tierBadgePicture(n), `Tier ${n}`);
}

/** A padlock icon for a locked row, labelled "Locked". */
export function lockIcon(): Element {
  const el = element(lockIconPicture(), 'Locked');
  el.classList.remove('tier-badge');
  return el;
}
