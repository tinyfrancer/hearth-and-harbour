/**
 * Everything drawn so far, on one page, reached from Menu. It is how art is
 * looked at and judged on a phone before the game has a place to use it.
 * Owned by the art lane.
 *
 * Every picture is drawn at a whole number of device pixels per art pixel:
 * "game scale" is the scale the town will use on this screen (a world 270 art
 * pixels wide across the app), "close up" is twice that. A picture too wide
 * for the screen at its scale steps down to the largest whole scale that fits,
 * and its caption says so.
 */
import { gameScale, pixelCanvas, repaint, wholeScale, type PixelCanvasOptions } from './canvas';
import { DEFAULT_LOOK, LOOK_CHOICES, characterPicture, type Look } from './character';
import {
  DRESSING,
  WARDROBE_BOWS,
  WARDROBE_ITEMS,
  WARDROBE_LADDER,
  WARDROBE_SETS,
  dressingPlate,
  figurePlate,
  ladderPlate,
  lineupPlate,
  outfitPicture,
  propsPlate,
  tavernPlate,
  townsfolkPlate,
} from './plates';
import { DAY, DUSK, GUIDE_RAMPS, RAMPS, type Palette, type RampName } from './palette';
import type { Picture } from './raster';
import { ICON_FAMILIES, itemIcon, skillIcon } from './icons';
import { PORTRAIT_IDS, portrait } from './portraits';
import { townPicture } from './town';
import { FOE_IDS } from './grottoCast';
import { PROP_IDS } from './grottoProps';
import { grottoCastPlate, grottoPropsPlate, grottoRoomPlate, grottoTilesPlate } from './grottoRoom';

/** Space between pictures in a row, in CSS pixels (kept whole so pixels stay on the grid). */
const GAP = 8;
/** The app never grows wider than this (src/ui/styles.css, #app). */
const APP_MAX = 480;
/** The menu screen's padding on each side (src/ui/styles.css, .screen). */
const SCREEN_PADDING = 16;

type Want = 'game' | 'close';

interface Shot {
  /** Where the canvas goes; it is made on the first draw, once the scale is known. */
  readonly cell: HTMLElement;
  canvas: HTMLCanvasElement | null;
  readonly label: string;
  readonly pic: Picture;
  readonly palette: Palette;
  readonly want: Want;
  /** How many pictures share the row, so each gets its share of the width. */
  readonly across: number;
  readonly note: HTMLElement | null;
  scale: number;
}

interface Screen {
  readonly dpr: number;
  readonly app: number;
  readonly content: number;
}

function measure(page: HTMLElement): Screen {
  const dpr = window.devicePixelRatio || 1;
  const app = Math.min(window.innerWidth || 390, APP_MAX);
  const content = page.clientWidth || app - 2 * SCREEN_PADDING;
  return { dpr, app, content };
}

/** The scale a picture is drawn at: what it wants, or less if that would not fit. */
export function shotScale(
  want: Want,
  artWidth: number,
  across: number,
  screen: { dpr: number; app: number; content: number },
): { scale: number; game: number; fits: boolean } {
  const game = gameScale(screen.app, screen.dpr);
  const wanted = want === 'close' ? game * 2 : game;
  const room = (screen.content - GAP * (across - 1)) / across;
  const fit = wholeScale(room, screen.dpr, artWidth);
  return { scale: Math.min(wanted, fit), game, fits: fit >= wanted };
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function caption(text: string): HTMLElement {
  return el('p', 'gallery-caption muted', text);
}

function scaleNote(shot: Shot, game: number, fits: boolean): string {
  const px = `${shot.scale} device pixel${shot.scale === 1 ? '' : 's'} per art pixel`;
  if (!fits) return `Shrunk to fit this screen: ${px}.`;
  return shot.want === 'game'
    ? `Game scale on this screen: ${px}.`
    : `Close up: ${px} (twice game scale ${game}).`;
}

export function artGallery(): HTMLElement {
  const page = el('section', 'gallery');
  const shots: Shot[] = [];

  /**
   * A row of pictures, each with a small label underneath, and one note on
   * scale. `across` is how many share a line; 1 stacks them.
   */
  const row = (
    items: { pic: Picture; palette: Palette; label: string }[],
    want: Want,
    across = items.length,
  ) => {
    const box = el('div', 'gallery-row');
    const note = caption('');
    for (const item of items) {
      const cell = el('figure', 'gallery-shot');
      cell.append(el('figcaption', 'muted', item.label));
      box.append(cell);
      shots.push({
        cell,
        canvas: null,
        label: item.label,
        pic: item.pic,
        palette: item.palette,
        want,
        across,
        note,
        scale: 0,
      });
    }
    return [box, note];
  };

  const part = (title: string, intro: string, ...body: HTMLElement[]) => {
    const section = el('section', 'gallery-part');
    section.append(el('h2', '', title), caption(intro), ...body);
    page.append(section);
  };

  page.append(
    el(
      'p',
      'gallery-intro',
      'The approved town mock-up, rebuilt as the game’s own drawing engine. Day and dusk are the same drawing in two palettes.',
    ),
  );

  // The grotto first: the newest art, judged where it will be seen, at dusk.
  const room = grottoRoomPlate();
  const tiles = grottoTilesPlate();
  const cast = grottoCastPlate(FOE_IDS);
  const grottoProps = grottoPropsPlate(PROP_IDS);
  part(
    'Brinebeard’s Grotto',
    'New art, not yet approved. The first dungeon’s room, assembled from its tiles at dusk with two lanterns lit and the whole cast standing in it, the hero among them in iron. Then each kind of tile, the cast beside the hero, and the props.',
    ...row([{ pic: room, palette: DUSK, label: 'A room of the grotto, dusk' }], 'game', 1),
    ...row([{ pic: room, palette: DAY, label: 'The same room by day' }], 'game', 1),
    el('h3', 'gallery-subhead', 'Tiles'),
    ...row(
      [
        {
          pic: tiles,
          palette: DUSK,
          label:
            'sand · wet sand · rock floor · shallows · deep water / wall top · wall face · planks · door barred · door open',
        },
      ],
      'close',
      1,
    ),
    el('h3', 'gallery-subhead', 'The cast'),
    ...row(
      [
        {
          pic: cast,
          palette: DUSK,
          label: ['the hero', ...FOE_IDS].join(' · ').replace(/_/g, ' '),
        },
      ],
      'close',
      1,
    ),
    ...row([{ pic: cast, palette: DUSK, label: 'Game scale' }], 'game', 1),
    el('h3', 'gallery-subhead', 'Props'),
    ...row(
      [{ pic: grottoProps, palette: DUSK, label: PROP_IDS.join(' · ').replace(/_/g, ' ') }],
      'close',
      1,
    ),
  );

  // Portraits next. Framed as the fight screen frames them.
  const faces = el('div', 'portrait-grid');
  for (const id of PORTRAIT_IDS) {
    const cell = el('figure', 'portrait-cell');
    const frame = el('div', 'gallery-portrait');
    const face = portrait(id);
    if (face) frame.append(face);
    cell.append(frame, el('figcaption', 'muted', id.replace(/_/g, ' ')));
    faces.append(cell);
  }
  part(
    'Portraits',
    'New art, not yet approved. Each monster’s face, then the townsfolk’s, as the fight screen frames them (three times art size). One expression each, on a dark disc.',
    faces,
  );

  // Icons next: they are the most seen.
  const families = ICON_FAMILIES.flatMap((family) => {
    const grid = el('div', 'icon-grid');
    for (const id of family.ids) {
      const cell = el('figure', 'icon-cell');
      const icon = family.kind === 'item' ? itemIcon(id) : skillIcon(id);
      if (icon) cell.append(icon);
      cell.append(el('figcaption', 'muted', id.replace(/_/g, ' ')));
      grid.append(cell);
    }
    return [el('h3', 'gallery-subhead', family.name), grid];
  });
  part(
    'Icons',
    'New art, not yet approved. Every item and skill, at the size the menus show them, in their families: bark and wood tell the logs apart, raw fish are silver and cooked ones brown, bronze is plain and leathery and iron solid and grey.',
    ...families,
  );

  const lookRow = (which: keyof Look, base: Look) => {
    const choices = LOOK_CHOICES[which];
    const pic = lineupPlate(
      choices.map((choice) => characterPicture({ ...base, [which]: choice.id }, [])),
    );
    return row([{ pic, palette: DAY, label: choices.map((c) => c.name).join(' · ') }], 'game');
  };
  const ladder = ladderPlate();
  const ladderLabel = [...WARDROBE_LADDER.map((o) => o.name), 'Tier 2 (the hero)'].join(' · ');
  const sets = lineupPlate(WARDROBE_SETS.map(outfitPicture));
  const bows = lineupPlate(WARDROBE_BOWS.map(outfitPicture));
  const itemRows: HTMLElement[] = [];
  for (let i = 0; i < WARDROBE_ITEMS.length; i += 5) {
    const ids = WARDROBE_ITEMS.slice(i, i + 5);
    const pic = lineupPlate(ids.map((id) => characterPicture(DEFAULT_LOOK, [id])));
    const label = ids.map((id) => id.replace(/_/g, ' ')).join(' · ');
    itemRows.push(
      ...row(
        [
          { pic, palette: DAY, label },
          { pic, palette: DUSK, label: 'Dusk' },
        ],
        'game',
        1,
      ),
    );
  }
  part(
    'Wardrobe',
    'New art, not yet approved. Gear climbs a ladder: tier 1 runs from a villager in linen to a hunter in leather to a militia volunteer in bronze to a town guard in iron. The approved hero stands where tier 2’s knight will be; no item is drawn with his gear yet. With nothing in hand, the character rests that hand at the belt.',
    el('h3', 'gallery-subhead', 'The gear ladder'),
    ...row(
      [
        { pic: ladder, palette: DAY, label: ladderLabel },
        { pic: ladder, palette: DUSK, label: 'Dusk' },
      ],
      'close',
      1,
    ),
    ...row(
      [
        { pic: ladder, palette: DAY, label: 'Day' },
        { pic: ladder, palette: DUSK, label: 'Dusk' },
      ],
      'game',
      1,
    ),
    el('h3', 'gallery-subhead', 'Each item alone'),
    ...itemRows,
    el('h3', 'gallery-subhead', 'Each rung in another look'),
    ...row(
      [{ pic: sets, palette: DAY, label: WARDROBE_SETS.map((o) => o.name).join(' · ') }],
      'game',
    ),
    el('h3', 'gallery-subhead', 'Bows'),
    ...row(
      [{ pic: bows, palette: DAY, label: WARDROBE_BOWS.map((o) => o.name).join(' · ') }],
      'game',
    ),
    el('h3', 'gallery-subhead', 'Skin'),
    ...lookRow('skin', DEFAULT_LOOK),
    el('h3', 'gallery-subhead', 'Hairstyle'),
    ...lookRow('hair', DEFAULT_LOOK),
    el('h3', 'gallery-subhead', 'Hair colour'),
    ...lookRow('hairColour', { ...DEFAULT_LOOK, hair: 'long' }),
  );

  const town = townPicture();
  part(
    'The town',
    'The whole of the approved mock-up, assembled from the game’s own pieces: tavern, smithy, stall, square, quay, pier, ship and sea. Hold it against the mock-up; they should be the same picture.',
    ...row(
      [
        { pic: town, palette: DAY, label: 'Day' },
        { pic: town, palette: DUSK, label: 'Dusk' },
      ],
      'game',
      1,
    ),
  );

  const folk = townsfolkPlate();
  part(
    'Townsfolk',
    'The hero, the pirate captain, the smith and the trader. Each is a posed body; what they hold is a layer of its own.',
    ...row(
      [
        { pic: folk, palette: DAY, label: 'Day' },
        { pic: folk, palette: DUSK, label: 'Dusk' },
      ],
      'close',
      1,
    ),
    ...row([{ pic: folk, palette: DAY, label: 'Day' }], 'game'),
  );

  const hero = figurePlate();
  part(
    'The hero',
    'Posed body, iron plate, red cloak, sword raised, kite shield. Standing on the square’s cobbles.',
    ...row(
      [
        { pic: hero, palette: DAY, label: 'Day' },
        { pic: hero, palette: DUSK, label: 'Dusk' },
      ],
      'close',
    ),
    ...row(
      [
        { pic: hero, palette: DAY, label: 'Day' },
        { pic: hero, palette: DUSK, label: 'Dusk' },
      ],
      'game',
    ),
  );

  const tavern = tavernPlate();
  part(
    'The tavern',
    'Timber, plaster and a patched roof. At dusk the windows and lamps light up.',
    ...row(
      [
        { pic: tavern, palette: DAY, label: 'Day' },
        { pic: tavern, palette: DUSK, label: 'Dusk' },
      ],
      'game',
      1,
    ),
  );

  const props = propsPlate();
  part(
    'Props',
    'Pine, well, notice board, street lamp, barrel and crates, each with its ground shadow.',
    ...row(
      [
        { pic: props, palette: DAY, label: 'Day' },
        { pic: props, palette: DUSK, label: 'Dusk' },
      ],
      'game',
      1,
    ),
  );

  const dressing = dressingPlate();
  part(
    'Body plus layers',
    'One posed body; each step adds gear chosen by id. The last is the hero above.',
    ...row([{ pic: dressing, palette: DAY, label: dressingLabel() }], 'game'),
  );

  part(
    'Palette',
    'Every colour is a step on a named ramp, lightest first. Day and dusk are worked out from the same base ramps; fire never changes, and at dusk windows and lamps are lit.',
    paletteTable('From the style guide', GUIDE_RAMPS),
    paletteTable(
      'From the mock-up',
      (Object.keys(RAMPS) as RampName[]).filter((r) => !GUIDE_RAMPS.includes(r)),
    ),
  );

  part('Still to come', 'The hero’s own portrait.');

  const draw = () => {
    const screen = measure(page);
    for (const shot of shots) {
      const { scale, game, fits } = shotScale(shot.want, shot.pic.grid.w, shot.across, screen);
      if (scale === shot.scale) continue;
      shot.scale = scale;
      const options: PixelCanvasOptions = { palette: shot.palette, scale, dpr: screen.dpr };
      if (shot.canvas) {
        repaint(shot.canvas, shot.pic, options);
      } else {
        shot.canvas = pixelCanvas(shot.pic, { ...options, label: shot.label });
        shot.cell.prepend(shot.canvas);
      }
      if (shot.note) shot.note.textContent = scaleNote(shot, game, fits);
    }
  };
  draw();

  // Redraw when the page first gets its real width, and on rotation or resize.
  if (typeof ResizeObserver !== 'undefined') {
    let width = 0;
    new ResizeObserver(() => {
      if (page.clientWidth === width) return;
      width = page.clientWidth;
      draw();
    }).observe(page);
  }
  return page;
}

/** "Body · + grey trousers, leather boots · ..." from the gear each step adds. */
function dressingLabel(): string {
  const added = DRESSING.map((gear, i) =>
    i === 0
      ? 'Body'
      : '+ ' +
        gear
          .filter((id) => !(DRESSING[i - 1] ?? []).includes(id))
          .map((id) => id.replace(/_/g, ' '))
          .join(', '),
  );
  return added.join(' · ');
}

function paletteTable(title: string, ramps: readonly RampName[]): HTMLElement {
  const table = el('div', 'palette');
  table.append(el('h3', 'palette-title', title), el('span', 'palette-head muted', 'Day'));
  table.append(el('span', 'palette-head muted', 'Dusk'));
  for (const ramp of ramps) {
    table.append(el('span', 'palette-name', ramp));
    for (const palette of [DAY, DUSK]) {
      const steps = el('span', 'palette-steps');
      RAMPS[ramp].forEach((_, i) => {
        const swatch = el('span', 'swatch');
        const shade = `${ramp}${i + 1}` as keyof Palette['colours'];
        const colour = palette.colours[shade];
        swatch.style.backgroundColor = colour;
        swatch.title = `${shade} ${colour}`;
        steps.append(swatch);
      });
      table.append(steps);
    }
  }
  return table;
}
