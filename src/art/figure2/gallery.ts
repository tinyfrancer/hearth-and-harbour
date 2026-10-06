/**
 * The C-scale figures in the art gallery (Menu, Art gallery, "See the new
 * figures at the finer scale"): the hero in every look, the gear ladder at
 * true size and enlarged, every piece of gear worn, every townsperson, and a
 * row of them at the new tavern's door; and (B9) every rung and every
 * townsperson walking each way and breathing. Drawn only when asked, a picture at a
 * time; one button turns it all to dusk and back on the same canvases.
 */
import { DEFAULT_LOOK, LOOK_CHOICES, type Look } from '../character';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_SOLE_Y,
  ITEM_LAYERS2,
  KNIGHT_GEAR2,
  TOWNSFOLK2_FRAME_MS,
  TOWNSFOLK2_IDS,
  c2Scale,
  characterIdlePicture2,
  characterPicture2,
  characterWalk2,
  townsfolkIdle2,
  townsfolkName2,
  townsfolkPicture2,
  townsfolkWalk2,
} from '../character2';
import { deviceSize } from '../canvas';
import { dim, stamp, tgrid, type Picture2 } from '../town2/cells';
import { cut, plate } from '../town2/gallery2';
import { pixelCanvas2, repaint2, spriteCanvas } from '../town2/raster';
import { walkPreview, type Walker2 } from './walkGallery';
import { DAY2, DUSK2, type TimeOfDay } from '../town2/ramps';
import { town2Layout, town2Picture } from '../town2/town';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The ladder's rungs, by the game's item ids (the knight by his gear, waiting for tier 2's items). */
export const LADDER2: readonly {
  readonly name: string;
  readonly items: readonly string[];
  readonly extra?: readonly string[];
}[] = [
  { name: 'Linen', items: ['linen_hood', 'linen_tunic', 'linen_trousers'] },
  {
    name: 'Leather',
    items: ['leather_cap', 'leather_jerkin', 'leather_bracers', 'pine_shortbow', 'bronze_arrows'],
  },
  {
    name: 'Bronze',
    items: ['bronze_helmet', 'bronze_breastplate', 'bronze_shield', 'bronze_sword'],
  },
  { name: 'Iron', items: ['iron_helmet', 'iron_breastplate', 'iron_shield', 'iron_sword'] },
  { name: 'Tier 2 (the knight)', items: [], extra: KNIGHT_GEAR2 },
];

/** Every wearable, grouped as the gallery shows them, each worn alone over the everyday clothes. */
export const GEAR_GROUPS2: readonly { readonly name: string; readonly items: readonly string[] }[] =
  [
    {
      name: 'On the head',
      items: [
        'linen_hood',
        'leather_cap',
        'bronze_helmet',
        'iron_helmet',
        'feathered_hat',
        'tricorn',
        'velvet_cap',
      ],
    },
    {
      name: 'On the body',
      items: [
        'linen_tunic',
        'linen_trousers',
        'leather_jerkin',
        'bronze_breastplate',
        'iron_breastplate',
        'captains_coat',
      ],
    },
    {
      name: 'In the hand',
      items: [
        'bronze_sword',
        'iron_sword',
        'bronze_axe',
        'iron_axe',
        'cudgel',
        'smugglers_cutlass',
        'pirate_cutlass',
        'boarding_axe',
        'brinebeards_anchor',
      ],
    },
    {
      name: 'Bows',
      items: ['pine_shortbow', 'oak_shortbow', 'willow_shortbow', 'poachers_longbow'],
    },
    {
      name: 'In the other hand',
      items: ['bronze_shield', 'iron_shield', 'wyrmscale_shield', 'spyglass'],
    },
    {
      name: 'Small things',
      items: [
        'shell_necklace',
        'shell_bracelet',
        'trollstone',
        'hunters_charm',
        'leather_bracers',
        'bronze_arrows',
        'barbed_arrows',
      ],
    },
  ];

/** Every look of one hairstyle: a row per skin tone, a column per hair colour. */
export function looksPlate(hair: string): Picture2 {
  const rows = LOOK_CHOICES.skin.map((skin) =>
    plate(
      LOOK_CHOICES.hairColour.map((c) =>
        characterPicture2({ skin: skin.id, hair, hairColour: c.id }, []),
      ),
      2,
    ),
  );
  const w = Math.max(...rows.map((r) => r.grid.w));
  const g = tgrid(
    w,
    rows.reduce((s, r) => s + r.grid.h, 0),
  );
  let y = 0;
  for (const r of rows) {
    stamp(g, r.grid, 0, y);
    y += r.grid.h;
  }
  return { grid: g, glows: [] };
}

const itemName = (id: string) => id.replace(/_/g, ' ');

/** The hero, three townsfolk and the hero again in tier 2, standing at the new tavern's door. */
export function tavernDoorScene(time: TimeOfDay, across = 360, tall = 200): Picture2 {
  const tavern = town2Layout().find((p) => p.name === 'tavern');
  const door = tavern?.spots.door ?? { x: 300, y: 900 };
  const x0 = Math.round(door.x - across / 2);
  const y0 = door.y - tall + 40;
  const town = cut(town2Picture(time), x0, y0, across, tall);
  const g = town.grid;
  const look: Look = { ...DEFAULT_LOOK };
  const cast: [Picture2, number, number][] = [
    [townsfolkPicture2('alewife')!, -88, 6],
    [
      characterPicture2(look, ['iron_sword', 'iron_helmet', 'iron_breastplate', 'iron_shield']),
      -34,
      14,
    ],
    [townsfolkPicture2('smith')!, 0, -2],
    [characterPicture2({ skin: 'brown', hair: 'braid', hairColour: 'black' }, []), 40, 12],
    [townsfolkPicture2('trader')!, 92, 8],
  ];
  for (const [pic, dx, dy] of cast) {
    const fx = door.x - x0 + dx;
    const fy = door.y - y0 + dy;
    // A contact shadow on the ground, its own steps darkened, under the feet.
    for (let y = fy - 2; y <= fy + 1; y++)
      for (let x = fx - 11; x <= fx + 11; x++) {
        const a = (x - fx) / 11;
        const b = (y - fy + 0.5) / 2;
        if (a * a + b * b <= 1) dim(g, x, y, 2);
      }
    stamp(g, pic.grid, fx - FIGURE2_ANCHOR_X, fy - FIGURE2_SOLE_Y);
  }
  return { grid: g, glows: town.glows };
}

interface Job {
  readonly cell: HTMLElement;
  readonly label: string;
  readonly make: (time: TimeOfDay, across: number) => Picture2;
  /** 'game': the C scale on this screen; 'close': twice that. */
  readonly want: 'game' | 'close';
  canvas?: HTMLCanvasElement;
}

/** The section: a button that draws it, a button that turns it to dusk and back, then the pictures. */
export function figure2Gallery(): { section: HTMLElement; draw: () => void } {
  const section = el('div', 'gallery-figure2');
  section.id = 'figure2';
  section.append(
    el('h3', 'gallery-subhead', 'The figures at the finer scale, not yet approved'),
    el(
      'p',
      'gallery-caption muted',
      'The hero with the H2 head on a 56 × 72 canvas, at 3 device pixels per art pixel on a 390-wide phone: every look, the gear ladder at true size and twice that, every piece of gear worn, the townsfolk, and a row of them at the new tavern’s door. One button turns it all to dusk and back.',
    ),
  );
  const button = el('button', 'btn primary', 'Draw the new figures') as HTMLButtonElement;
  button.type = 'button';
  const toggle = el('button', 'btn', 'Show them at dusk') as HTMLButtonElement;
  toggle.type = 'button';
  toggle.disabled = true;
  const status = el('p', 'gallery-caption muted', '');
  section.append(button, toggle, status);
  const body = el('div', 'gallery-figure2-body');
  section.append(body);
  const jobs: Job[] = [];
  let time: TimeOfDay = 'day';

  const sub = (text: string) => body.append(el('h3', 'gallery-subhead', text));
  const shot = (label: string, make: Job['make'], want: Job['want'] = 'game') => {
    const cell = el('figure', 'gallery-shot');
    cell.append(el('figcaption', 'muted', label));
    const box = el('div', 'gallery-scroll');
    box.append(cell);
    body.append(box);
    jobs.push({ cell, label, make, want });
  };

  const walking = (label: string, who: Walker2) => {
    const cell = el('figure', 'gallery-shot');
    cell.append(walkPreview(who, game(), dpr(), () => time, label));
    cell.append(el('figcaption', 'muted', label));
    const box = el('div', 'gallery-scroll');
    box.append(cell);
    body.append(box);
  };

  let built = false;
  const build = () => {
    if (built) return;
    built = true;
    sub('Walking (B9): toward you, to the right, to the left, and standing, breathing');
    for (const rung of LADDER2)
      walking(rung.name, {
        walk: (when, facing, f) =>
          characterWalk2(DEFAULT_LOOK, rung.items, when, facing, f, rung.extra ?? []),
        idle: (when, f) =>
          spriteCanvas(
            `gallery idle ${rung.name} ${f}`,
            characterIdlePicture2(DEFAULT_LOOK, rung.items, f, rung.extra ?? []),
            when === 'day' ? DAY2 : DUSK2,
          ),
      });
    for (const id of TOWNSFOLK2_IDS)
      walking(townsfolkName2(id) ?? id, {
        walk: (when, facing, f) => townsfolkWalk2(id, when, facing, f),
        idle: (when, f) => townsfolkIdle2(id, when, f),
        frameMs: TOWNSFOLK2_FRAME_MS,
      });
    sub('At the tavern door');
    shot(
      'The alewife, the hero in iron, the smith, the hero in her everyday clothes, the trader',
      (when, across) => tavernDoorScene(when, Math.min(360, across)),
    );
    sub('The gear ladder');
    const ladder = () =>
      plate(
        LADDER2.map((r) => characterPicture2(DEFAULT_LOOK, r.items, r.extra ?? [])),
        4,
      );
    shot(LADDER2.map((r) => r.name).join(' · '), ladder);
    shot('The same, twice the size', ladder, 'close');
    sub('The townsfolk');
    shot(TOWNSFOLK2_IDS.map((id) => townsfolkName2(id)).join(' · '), () =>
      plate(
        TOWNSFOLK2_IDS.map((id) => townsfolkPicture2(id)!),
        4,
      ),
    );
    sub('The hero in every look');
    for (const hair of LOOK_CHOICES.hair)
      shot(
        `${hair.name}: a row per skin (${LOOK_CHOICES.skin.map((c) => c.name).join(', ')}), a column per hair colour (${LOOK_CHOICES.hairColour.map((c) => c.name).join(', ')})`,
        () => looksPlate(hair.id),
      );
    sub('Every piece of gear, worn');
    for (const group of GEAR_GROUPS2)
      shot(`${group.name}: ${group.items.map(itemName).join(' · ')}`, () =>
        plate(
          group.items.map((id) => characterPicture2(DEFAULT_LOOK, [id])),
          2,
        ),
      );
    shot('Tier 2, piece by piece: plate · knee cops · cloak · kite shield · long sword', () =>
      plate(
        KNIGHT_GEAR2.map((id) => characterPicture2(DEFAULT_LOOK, [], [id])),
        2,
      ),
    );
  };

  const dpr = () => window.devicePixelRatio || 1;
  const game = () => c2Scale(window.innerWidth || 390, dpr());

  const paintAll = (done: () => void) => {
    const content = section.clientWidth || Math.min(window.innerWidth || 390, 480) - 32;
    let i = 0;
    const next = () => {
      const job = jobs[i++];
      if (!job) return done();
      status.textContent = `Drawing ${i} of ${jobs.length}…`;
      const scale = game() * (job.want === 'close' ? 2 : 1);
      let across = Math.floor((content * dpr()) / scale);
      while (across > 1 && deviceSize(across, scale, dpr()) / dpr() > content) across--;
      const pic = job.make(time, across);
      const palette = time === 'day' ? DAY2 : DUSK2;
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
    status.textContent = `${time === 'day' ? 'By day' : 'At dusk'}. Game scale on this screen: ${game()} device pixels per art pixel.`;
    toggle.disabled = false;
  };
  const draw = () => {
    if (built) return;
    build();
    button.disabled = true;
    paintAll(finished);
  };
  toggle.addEventListener('click', () => {
    time = time === 'day' ? 'dusk' : 'day';
    toggle.textContent = time === 'day' ? 'Show them at dusk' : 'Show them by day';
    toggle.disabled = true;
    paintAll(finished);
  });
  button.addEventListener('click', draw);
  return { section, draw };
}

/** Every wearable the gallery shows, for the tests. */
export const GALLERY_ITEMS2 = (): string[] =>
  [...new Set(GEAR_GROUPS2.flatMap((g) => g.items))].filter((id) => id in ITEM_LAYERS2);
