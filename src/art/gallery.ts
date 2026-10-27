/**
 * Everything drawn so far, on one page, reached from Menu. It is how art is
 * looked at and judged on a phone before the game has a place to use it.
 * Owned by the art lane.
 *
 * The town, the figures and the dungeon at the C scale draw on a tap (each is
 * heavy); the icons and the palette show at once. The first scale's plates
 * (the mock-up's town, the 40 x 50 figures, the first grotto and portraits)
 * were retired in B12 with the art they showed.
 */
import { pixelCanvas } from './canvas';
import { DAY, DUSK, GUIDE_RAMPS, RAMPS, type Palette, type RampName } from './palette';
import {
  ICON_FAMILIES,
  TAB_ICON_IDS,
  iconScale,
  itemIcon,
  skillIcon,
  tabIconPicture,
} from './icons';
import { TAB_MUTED } from './tabArt';
import { figure2Gallery } from './figure2/gallery';
import { town2Gallery } from './town2/gallery2';
import { dungeon2Gallery } from './dungeon2/gallery';
import { titleGallery } from './title/gallery';
import { tier2Gallery } from './tier2Gallery';
import { burrowGallery } from './burrowGallery';
import {
  CHALLENGE_MEDAL_FRAMES,
  CHALLENGE_MEDAL_FRAME_MS,
  CHALLENGE_MEDAL_STATES,
  DUNGEON_ICON_KINDS,
  DUNGEON_SEAL_TIERS,
  challengeMedal,
  challengeMedalPicture,
  dungeonIconPicture,
  dungeonSeal,
} from './dungeonIcons';
import {
  CHART_EMBLEM2_IDS,
  CHART_PENNANT2_FRAMES,
  CHART_PENNANT2_FRAME_MS,
  chartPennant2,
} from './chart';
import { DAY2 } from './town2/ramps';
import { pixelCanvas2, repaint2 } from './town2/raster';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function caption(text: string): HTMLElement {
  return el('p', 'gallery-caption muted', text);
}

export function artGallery(): HTMLElement {
  const page = el('section', 'gallery');

  const part = (title: string, intro: string, ...body: HTMLElement[]) => {
    const section = el('section', 'gallery-part');
    section.append(el('h2', '', title), caption(intro), ...body);
    page.append(section);
  };

  page.append(
    el(
      'p',
      'gallery-intro',
      'The game’s art at the finer scale Cody chose: the title screen, the town, the figures and the dungeon, each drawn when asked; then every icon and the palette.',
    ),
  );

  // The title screen first (B14): the first thing a player sees.
  const title = titleGallery();
  page.append(title.button);

  // Each C-scale section is heavy: a button goes straight to it and draws it.
  const town2 = town2Gallery();
  const jump = el(
    'button',
    'btn primary',
    'See the new town at the finer scale',
  ) as HTMLButtonElement;
  jump.type = 'button';
  jump.addEventListener('click', () => {
    town2.draw();
    town2.section.scrollIntoView({ block: 'start' });
  });
  page.append(jump);

  const figures2 = figure2Gallery();
  const jumpFigures = el(
    'button',
    'btn primary',
    'See the new figures at the finer scale',
  ) as HTMLButtonElement;
  jumpFigures.type = 'button';
  jumpFigures.addEventListener('click', () => {
    figures2.draw();
    figures2.section.scrollIntoView({ block: 'start' });
  });
  page.append(jumpFigures);
  const dungeon2 = dungeon2Gallery();
  page.append(dungeon2.button);
  // B19: tier 2.
  const tier2 = tier2Gallery();
  page.append(tier2.button);
  // B20: Thistlewood Burrow.
  const burrow = burrowGallery();
  page.append(burrow.button);

  // Icons: they are the most seen.
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
  // B10b: the tab bar's icons, each lit (its tab open) and muted (the others).
  const tabs = el('div', 'icon-grid');
  for (const id of TAB_ICON_IDS)
    for (const [palette, state] of [
      [DAY, 'open'],
      [TAB_MUTED, 'not open'],
    ] as const) {
      const cell = el('figure', 'tab-cell');
      const ratio = window.devicePixelRatio || 1;
      const canvas = pixelCanvas(tabIconPicture(id)!, {
        palette,
        scale: iconScale(ratio),
        dpr: ratio,
      });
      canvas.classList.add('icon');
      cell.append(canvas, el('figcaption', 'muted', `${id}, ${state}`));
      tabs.append(cell);
    }
  families.push(el('h3', 'gallery-subhead', 'Tab icons'), tabs);
  families.push(...dungeonReplay());
  part(
    'Icons',
    'Every item and skill, at the size the menus show them, in their families: bark and wood tell the logs apart, raw fish are silver and cooked ones brown, bronze is plain and leathery and iron solid and grey.',
    ...families,
  );

  part(
    'At the finer scale',
    'The title screen, the town, the figures (walking, from behind, the blow) and the dungeon (rooms, tiles, props, foes, faces), each drawn on a tap from the buttons above.',
    title.section,
    town2.section,
    figures2.section,
    dungeon2.section,
    tier2.section,
    burrow.section,
  );

  part(
    'Palette',
    'The icons’ and the menus’ ramps, lightest first. Day and dusk are worked out from the same base ramps; fire never changes. The C scale’s own ramps are shown with the town.',
    paletteTable('From the style guide', GUIDE_RAMPS),
    paletteTable(
      'From the mock-up',
      (Object.keys(RAMPS) as RampName[]).filter((r) => !GUIDE_RAMPS.includes(r)),
    ),
  );

  return page;
}

/**
 * B17, for S16: the dungeon-replay pictures. Each modifier and challenge kind
 * (an id is drawn as the kind its words name), the medals (the new one's
 * sparkle playing on a loop here; the game plays it once), each dungeon's
 * seal in both tiers and the chart's daily-modifier pennant fluttering.
 */
function dungeonReplay(): HTMLElement[] {
  const ratio = (): number => window.devicePixelRatio || 1;
  const kinds = el('div', 'icon-grid');
  for (const kind of DUNGEON_ICON_KINDS) {
    const cell = el('figure', 'icon-cell');
    const canvas = pixelCanvas2(dungeonIconPicture(kind), DAY2, iconScale(ratio()), ratio());
    canvas.classList.add('icon');
    cell.append(canvas, el('figcaption', 'muted', kind));
    kinds.append(cell);
  }
  const medals = el('div', 'icon-grid');
  for (const state of CHALLENGE_MEDAL_STATES) {
    const cell = el('figure', 'icon-cell');
    const canvas = challengeMedal(state, 0);
    cell.append(canvas, el('figcaption', 'muted', `medal ${state}`));
    medals.append(cell);
    if (state === 'new' && typeof requestAnimationFrame === 'function') {
      // Loop the sparkle here (with a rest), so it can be judged; the game plays it once.
      const start = performance.now();
      const scale = iconScale(ratio());
      const tick = (now: number) => {
        if (!canvas.isConnected && now - start > 1000) return;
        const f =
          Math.floor((now - start) / CHALLENGE_MEDAL_FRAME_MS) % (CHALLENGE_MEDAL_FRAMES + 8);
        repaint2(canvas, challengeMedalPictureAt(f), DAY2, scale);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }
  const seals = el('div', 'icon-grid');
  for (const id of [...CHART_EMBLEM2_IDS, 'unknown_1'])
    for (const tier of DUNGEON_SEAL_TIERS) {
      const cell = el('figure', 'seal-cell');
      cell.append(
        pixelCanvas2(
          dungeonSeal(id, tier).picture,
          DAY2,
          Math.max(1, Math.round(ratio())),
          ratio(),
        ),
        el('figcaption', 'muted', `${id.replace(/_/g, ' ')}, ${tier}`),
      );
      seals.append(cell);
    }
  const pennant = el('figure', 'seal-cell');
  const scale = Math.max(1, Math.round(ratio()));
  const flag = pixelCanvas2(chartPennant2(0).picture, DAY2, scale, ratio());
  pennant.append(flag, el('figcaption', 'muted', 'daily modifier pennant'));
  seals.append(pennant);
  if (typeof requestAnimationFrame === 'function') {
    const start = performance.now();
    const tick = (now: number) => {
      const f = Math.floor((now - start) / CHART_PENNANT2_FRAME_MS) % CHART_PENNANT2_FRAMES;
      repaint2(flag, chartPennant2(f).picture, DAY2, scale);
      if (flag.isConnected || now - start < 1000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  return [
    el('h3', 'gallery-subhead', 'Dungeon replay: modifiers and challenges, by kind (B17)'),
    kinds,
    el('h3', 'gallery-subhead', 'Challenge medals'),
    medals,
    el('h3', 'gallery-subhead', 'Seals and the daily pennant (chart paper)'),
    seals,
  ];
}

/** The new medal's frames, then the done medal for a rest. */
function challengeMedalPictureAt(f: number) {
  return challengeMedalPicture('new', Math.min(f, CHALLENGE_MEDAL_FRAMES - 1));
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
