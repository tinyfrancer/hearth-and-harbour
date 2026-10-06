/**
 * The grotto at the C scale in the art gallery (Menu, Art gallery,
 * "Brinebeard's Grotto"): a sample room the size of a phone held sideways,
 * every tile, every prop, the whole cast frame by frame beside the hero, the
 * captain's three phases, the idle game's monsters, every portrait in the
 * three frames the game shows them in, and the tab bar. Drawn only when
 * asked (a tap), a picture at a time, as the town's section is.
 */
import { deviceSize } from '../canvas';
import { characterPicture2 } from '../character2';
import { tabIcon } from '../icons';
import { stamp, tgrid, type Picture2 } from '../town2/cells';
import { plate } from '../town2/gallery2';
import { pixelCanvas2, repaint2 } from '../town2/raster';
import { DAY2, DUSK2, type TimeOfDay } from '../town2/ramps';
import { town2Scale } from '../town2/scale';
import { foe2Frame, foe2Frames, FOE2_IDS, FOE2_POSES, MONSTER2_IDS } from './cast2';
import { PORTRAIT2_IDS } from './portraits2';
import { prop2, PROP2_IDS } from './props';
import { roomPicture2 } from './room';
import { sampleRoom2 } from './sample';
import { tile2Grid, TILE2, TILE2_KINDS, TILE2_WEARS } from './tiles';
import { heroPortrait2, portrait2 } from '../dungeonArt2';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const HERO = ['iron_sword', 'iron_helmet', 'iron_breastplate', 'iron_shield'];

/** Each tile kind as a patch of two by two, each tile alone (no neighbours told), at a place of its own. */
function tilesPlate(): Picture2 {
  const kinds = TILE2_KINDS;
  const g = tgrid(kinds.length * (TILE2 * 2 + 8) + 8, TILE2 * 2 + 16);
  kinds.forEach((kind, i) => {
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 2; c++) {
        const t = tile2Grid(kind, (i * 7 + r * 3 + c) % TILE2_WEARS[kind], undefined, {
          col: 50 + i * 2 + c,
          row: 50 + r,
        });
        stamp(g, t, 8 + i * (TILE2 * 2 + 8) + c * TILE2, 8 + r * TILE2);
      }
  });
  return { grid: g, glows: [] };
}

/** A small cave showing every join: sand to wet sand to shallows to deep, rock floor, a deck, a ledge, two doors. */
const JOINS: readonly string[] = [
  '############',
  '############',
  '###O####D###',
  '#rrrr...ppp#',
  '#rr..,,,ppp#',
  '#r.,,~~~,,.#',
  '#.,~~===~~,#',
  '#,~~=====~~#',
  '############',
];

/** The cast, every pose and frame in a row each, the hero first for scale. */
function castPlate(id: string, phase = 1): Picture2 {
  const counts = foe2Frames(id)!;
  const frames: Picture2[] = [characterPicture2({}, HERO)];
  for (const pose of FOE2_POSES)
    for (let f = 0; f < counts[pose]; f++) frames.push(foe2Frame(id, pose, f, phase)!.picture);
  return plate(frames, 6);
}

interface Job {
  readonly cell: HTMLElement;
  readonly label: string;
  readonly make: () => Picture2;
  /** Device pixels per art pixel: the game's, or twice it for a close look. */
  readonly zoom: 1 | 2;
  readonly time?: TimeOfDay;
  canvas?: HTMLCanvasElement;
}

/** The section, with a button that draws it and one that turns it to day and back (the dungeon is dusk). */
export function dungeon2Gallery(): { section: HTMLElement; draw: () => void } {
  const section = el('div', 'gallery-town2');
  section.id = 'dungeon2';
  section.append(
    el('h3', 'gallery-subhead', 'The grotto at the finer scale (B10), not yet approved'),
    el(
      'p',
      'gallery-caption muted',
      'The dungeon redrawn to scale with a 64-pixel person: a sample cave the size of a phone held sideways (it scrolls across), every tile, every prop, the whole cast pose by pose beside the hero, the captain’s three phases, the idle game’s monsters, every face in the three frames the game shows faces in, and the tab bar. The dungeon is played at dusk; one button shows it by day.',
    ),
  );
  const button = el('button', 'btn primary', 'Draw the new grotto') as HTMLButtonElement;
  button.type = 'button';
  const toggle = el('button', 'btn', 'Show it by day') as HTMLButtonElement;
  toggle.type = 'button';
  toggle.disabled = true;
  const status = el('p', 'gallery-caption muted', '');
  section.append(button, toggle, status);
  const body = el('div', 'gallery-town2-body');
  section.append(body);
  const jobs: Job[] = [];
  let time: TimeOfDay = 'dusk';

  const sub = (text: string) => body.append(el('h3', 'gallery-subhead', text));
  const shot = (label: string, make: () => Picture2, zoom: 1 | 2 = 1, fixed?: TimeOfDay) => {
    const cell = el('figure', 'gallery-shot');
    cell.append(el('figcaption', 'muted', label));
    const box = el('div', 'gallery-scroll');
    box.append(cell);
    body.append(box);
    jobs.push({ cell, label, make, zoom, ...(fixed ? { time: fixed } : {}) });
  };

  let built = false;
  const build = () => {
    if (built) return;
    built = true;
    sub('A sample cave, as the phone shows it held sideways');
    shot('Every ground, prop and foe in one cave, lanterns lit (816 × 384)', () =>
      sampleRoom2({ hero: HERO }),
    );
    sub('Tiles');
    shot(TILE2_KINDS.join(' · ').replace(/_/g, ' '), tilesPlate, 2);
    shot(
      'How they join: a curving shore, sand over rock, shade under the walls, a deck, a ledge, two doors',
      () => roomPicture2(JOINS, []),
      2,
    );
    sub('Props');
    shot(PROP2_IDS.join(' · ').replace(/_/g, ' '), () =>
      plate(
        [
          characterPicture2({}, HERO),
          ...PROP2_IDS.map((id) => ({ grid: prop2(id)!.grid, glows: prop2(id)!.glows })),
        ],
        6,
      ),
    );
    sub('The cast, every pose: idle (2), walk, wind up, strike, hurt, fall (2)');
    for (const id of FOE2_IDS.filter((i) => i !== 'brinebeard'))
      shot(id.replace(/_/g, ' '), () => castPlate(id), 2);
    sub('Captain Brinebeard, phase by phase, beside the hero');
    for (const phase of [1, 2, 3]) shot(`Phase ${phase}`, () => castPlate('brinebeard', phase), 2);
    sub('The idle game’s monsters');
    shot(
      MONSTER2_IDS.join(' · ').replace(/_/g, ' '),
      () =>
        plate(
          [
            characterPicture2({}, HERO),
            ...MONSTER2_IDS.map((id) => foe2Frame(id, 'idle', 0)!.picture),
          ],
          6,
        ),
      1,
      'day',
    );
  };

  const portraits = () => {
    sub(
      'Portraits, in the fight screen’s frame (148), its lists’ (100) and the dungeon’s panel (48)',
    );
    const grid = el('div', 'portrait-grid');
    // A fresh element for every frame: a canvas's pixels do not survive cloning.
    const faces: [string, () => Element | null][] = [
      ...PORTRAIT2_IDS.map((id): [string, () => Element | null] => [id, () => portrait2(id)]),
      ['the hero, in iron', () => heroPortrait2({}, HERO)],
      [
        'the hero, in the tricorn',
        () =>
          heroPortrait2({ hair: 'long', hairColour: 'auburn', skin: 'brown' }, [
            'tricorn',
            'captains_coat',
          ]),
      ],
    ];
    for (const [id, face] of faces) {
      const cell = el('figure', 'portrait-cell');
      for (const size of [
        'gallery-portrait',
        'gallery-portrait2-small',
        'gallery-portrait2-mini',
      ]) {
        const frame = el('div', size);
        const f = face();
        if (f) frame.append(f);
        cell.append(frame);
      }
      cell.append(el('figcaption', 'muted', id.replace(/_/g, ' ')));
      grid.append(cell);
    }
    body.append(grid);
    sub('The tab bar, each tab chosen in turn');
    for (const chosen of ['skills', 'bank', 'character', 'town', 'menu']) {
      const bar = el('nav', 'tabbar gallery-tabbar');
      for (const [id, label] of [
        ['skills', 'Skills'],
        ['bank', 'Bank'],
        ['character', 'Character'],
        ['town', 'Town'],
        ['menu', 'Menu'],
      ] as const) {
        const tab = el('span', 'tab');
        if (id === chosen) tab.setAttribute('aria-current', 'page');
        const icon = tabIcon(id);
        if (icon) tab.append(icon);
        tab.append(el('span', '', label));
        bar.append(tab);
      }
      body.append(bar);
    }
  };

  const dpr = () => window.devicePixelRatio || 1;
  const game = () => town2Scale(Math.min(window.innerWidth || 390, 480), dpr());

  const paintAll = (done: () => void) => {
    let i = 0;
    const next = () => {
      const job = jobs[i++];
      if (!job) return done();
      status.textContent = `Drawing ${i} of ${jobs.length}…`;
      const scale = game() * job.zoom;
      const pic = job.make();
      const palette = (job.time ?? time) === 'day' ? DAY2 : DUSK2;
      if (job.canvas) repaint2(job.canvas, pic, palette, scale);
      else {
        job.canvas = pixelCanvas2(pic, palette, scale, dpr(), job.label);
        job.cell.prepend(job.canvas);
      }
      setTimeout(next, 0);
    };
    next();
  };
  const finished = () => {
    status.textContent = `${time === 'day' ? 'By day' : 'At dusk, as it is played'}. Game scale on this screen: ${game()} device pixels per art pixel.`;
    toggle.disabled = false;
  };
  const draw = () => {
    if (built) return;
    build();
    portraits();
    button.disabled = true;
    paintAll(finished);
  };
  toggle.addEventListener('click', () => {
    time = time === 'day' ? 'dusk' : 'day';
    toggle.textContent = time === 'day' ? 'Show it at dusk' : 'Show it by day';
    toggle.disabled = true;
    paintAll(finished);
  });
  button.addEventListener('click', draw);
  return { section, draw };
}

void deviceSize;
