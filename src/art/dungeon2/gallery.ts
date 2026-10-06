/**
 * The dungeon at the C scale in the art gallery (B10a), reached like the
 * other C-scale sections: a button near the top of the page that draws it
 * and goes to it. Two of the grotto's rooms re-cut on 24-pixel tiles with
 * the hero and the cast standing in them at true size, at dusk as it is
 * played; every tile, alone and joined; every prop; every foe in every pose,
 * facing both ways, beside the hero; the captain's three phases; every face
 * in the three square frames the game shows faces in, and the hero's.
 * Nothing is drawn until the button is pressed.
 */
import { characterPicture2 } from '../character2';
import { stamp, tgrid, type Picture2 } from '../town2/cells';
import { plate } from '../town2/gallery2';
import { pixelCanvas2, repaint2 } from '../town2/raster';
import { town2Scale } from '../town2/scale';
import { foePicture2, foeFrames2, FOE2_IDS, FOE2_POSES, type Foe2Facing } from '../dungeonArt2';
import { heroPortrait2, portrait2, PORTRAIT2_IDS } from '../portraits2';
import { CAVE_DAY, CAVE_DUSK } from './cave';
import { prop2, PROP2_IDS } from './props';
import { roomPicture2 } from './room';
import { poolsRoom2, storeRoom2 } from './sample';
import { tile2Grid, TILE2, TILE2_KINDS, TILE2_WEARS } from './tiles';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const HERO = ['iron_sword', 'iron_helmet', 'iron_breastplate', 'iron_shield'];

/** Every wear of every kind, each alone (no neighbours told), at a place of its own. */
function tilesPlate(): Picture2 {
  const rows = TILE2_KINDS.length;
  const most = Math.max(...TILE2_KINDS.map((k) => TILE2_WEARS[k]));
  const g = tgrid(most * (TILE2 + 4) + 4, rows * (TILE2 + 4) + 4);
  TILE2_KINDS.forEach((kind, r) => {
    for (let w = 0; w < TILE2_WEARS[kind]; w++)
      stamp(
        g,
        tile2Grid(kind, w, undefined, { col: 40 + w * 3, row: 40 + r * 3 }),
        4 + w * (TILE2 + 4),
        4 + r * (TILE2 + 4),
      );
  });
  return { grid: g, glows: [] };
}

/** A small cave in the sample rooms' key showing every join. */
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

/** A foe in every pose and frame, facing one way, the hero first for scale. */
function foePlate(id: string, facing: Foe2Facing, phase = 1): Picture2 {
  const counts = foeFrames2(id)!;
  const frames: Picture2[] = [characterPicture2({}, HERO)];
  for (const pose of FOE2_POSES)
    for (let f = 0; f < counts[pose]; f++)
      frames.push(foePicture2(id, pose, facing, f, phase)!.picture);
  return plate(frames, 6);
}

interface Job {
  readonly cell: HTMLElement;
  readonly label: string;
  readonly make: () => Picture2;
  /** Device pixels per art pixel: the game's, or twice it for a close look. */
  readonly zoom: 1 | 2;
  readonly day?: boolean;
  canvas?: HTMLCanvasElement;
}

/**
 * The jump button and the section it draws, for the gallery page: the button
 * goes with the other C-scale buttons, the section with their sections.
 */
export function dungeon2Gallery(): { button: HTMLElement; section: HTMLElement } {
  const section = el('div', 'gallery-town2');
  section.id = 'dungeon2';
  section.append(
    el('h3', 'gallery-subhead', 'The dungeon at the finer scale (B10a), not yet approved'),
    el(
      'p',
      'gallery-caption muted',
      'Brinebeard’s Grotto redrawn to scale with a 64-pixel person: two of its rooms re-cut on 24-pixel tiles, lit by their lanterns, the hero and the cast standing in them; every tile, every prop, every foe in every pose beside the hero, the captain’s three phases, and every face in the three frames the game shows faces in. The dungeon is played at dusk; one button shows it by day.',
    ),
  );
  const toggle = el('button', 'btn', 'Show it by day') as HTMLButtonElement;
  toggle.type = 'button';
  toggle.disabled = true;
  const status = el('p', 'gallery-caption muted', 'Not drawn yet: press the button above.');
  section.append(toggle, status);
  const body = el('div', 'gallery-town2-body');
  section.append(body);
  const jobs: Job[] = [];
  let day = false;

  const sub = (text: string) => body.append(el('h3', 'gallery-subhead', text));
  const shot = (label: string, make: () => Picture2, zoom: 1 | 2 = 1, fixedDay?: boolean) => {
    const cell = el('figure', 'gallery-shot');
    cell.append(el('figcaption', 'muted', label));
    const box = el('div', 'gallery-scroll');
    box.append(cell);
    body.append(box);
    jobs.push({ cell, label, make, zoom, ...(fixedDay !== undefined ? { day: fixedDay } : {}) });
  };

  const build = () => {
    sub('Two rooms of the grotto, re-cut on 24-pixel tiles, as a phone held sideways shows them');
    shot('The smugglers’ store at the first rise of the tide (768 × 288)', () => storeRoom2());
    shot('The tide pools at the first rise, the whole grotto cast in them', () => poolsRoom2());
    shot('The pools with the tide about to rise: the sand it will cover gone wet', () =>
      poolsRoom2({ level: 1, warn: true }),
    );
    sub('Tiles: every wear of every kind');
    shot(TILE2_KINDS.join(' · ').replace(/_/g, ' '), tilesPlate, 2);
    shot(
      'How they join: a curving shore, sand over rock, shade under the walls, a deck, a ledge, two doors',
      () => roomPicture2(JOINS, [], { lit: false }),
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
    sub(`Every foe, every pose: ${FOE2_POSES.join(', ')}; facing right, then left`);
    for (const id of FOE2_IDS.filter((i) => i !== 'brinebeard')) {
      shot(`${id.replace(/_/g, ' ')}, facing right`, () => foePlate(id, 'right'), 2);
      shot(`${id.replace(/_/g, ' ')}, facing left`, () => foePlate(id, 'left'));
    }
    sub('Captain Brinebeard, phase by phase, beside the hero');
    for (const phase of [1, 2, 3])
      shot(`Phase ${phase}`, () => foePlate('brinebeard', 'right', phase), 2);
  };

  const portraits = () => {
    sub('Faces, in the fight screen’s frame (148), its lists’ (100) and the dungeon’s panel (48)');
    const grid = el('div', 'portrait-grid');
    // A fresh element for every frame: a canvas's pixels do not survive cloning.
    const faces: [string, () => Element | null][] = [
      ...PORTRAIT2_IDS.map((id): [string, () => Element | null] => [id, () => portrait2(id)]),
      ['the hero, in iron', () => heroPortrait2({}, HERO)],
      [
        'the hero, long auburn hair, the tricorn',
        () =>
          heroPortrait2({ hair: 'long', hairColour: 'auburn', skin: 'brown' }, [
            'tricorn',
            'captains_coat',
          ]),
      ],
      [
        'the hero, blonde, deep skin, bare-headed',
        () => heroPortrait2({ hair: 'braid', hairColour: 'blonde', skin: 'deep' }, ['linen_tunic']),
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
      const palette = (job.day ?? day) ? CAVE_DAY : CAVE_DUSK;
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
    status.textContent = `${day ? 'By day' : 'At dusk, as it is played'}. Game scale on this screen: ${game()} device pixels per art pixel.`;
    toggle.disabled = false;
  };

  const button = el(
    'button',
    'btn primary',
    'See the new dungeon at the finer scale',
  ) as HTMLButtonElement;
  button.type = 'button';
  let built = false;
  button.addEventListener('click', () => {
    if (!built) {
      built = true;
      build();
      portraits();
      paintAll(finished);
    }
    section.scrollIntoView?.({ block: 'start' });
  });
  toggle.addEventListener('click', () => {
    day = !day;
    toggle.textContent = day ? 'Show it at dusk' : 'Show it by day';
    toggle.disabled = true;
    paintAll(finished);
  });
  return { button, section };
}
