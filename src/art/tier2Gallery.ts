/**
 * The gallery's tier 2 section (B19): what clearing the first dungeon brings,
 * drawn on a tap. The tier badges and the padlock; the gear ladder with its
 * new rung, four facings, by day and at dusk; each of tier 2's wearables on
 * the hero in four facings; every tier 2 monster beside the hero; their
 * faces and the new marks'. Its icons are in the icon sheet's families.
 */
import { characterPicture2, characterWalkPicture2 } from './character2';
import { CAVE_DAY, CAVE_DUSK } from './dungeon2/cave';
import { TIER2_MONSTER2_IDS, foe2Frame } from './dungeon2/cast2';
import { portraitPicture2 } from './dungeon2/faces2';
import { TIERS, lockIcon, tierBadge } from './tierBadge';
import { stamp, tgrid, type Picture2, type TGrid } from './town2/cells';
import { pixelCanvas2 } from './town2/raster';
import type { Palette2 } from './town2/ramps';

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Pictures side by side on one canvas, standing on one ground line, `gap` apart. */
function row(pics: readonly { grid: TGrid; feetY?: number }[], gap = 4): Picture2 {
  const base = Math.max(...pics.map((p) => p.feetY ?? p.grid.h));
  const top = Math.max(...pics.map((p) => base - (p.feetY ?? p.grid.h) + p.grid.h));
  const w = pics.reduce((n, p) => n + p.grid.w + gap, gap);
  const g = tgrid(w, top + 2);
  let x = gap;
  for (const p of pics) {
    stamp(g, p.grid, x, base - (p.feetY ?? p.grid.h) + 1);
    x += p.grid.w + gap;
  }
  return { grid: g, glows: [] };
}

const RUNGS: readonly (readonly string[])[] = [
  ['linen_hood', 'linen_tunic', 'linen_trousers'],
  ['leather_cap', 'leather_jerkin', 'leather_bracers', 'pine_shortbow'],
  ['bronze_helmet', 'bronze_breastplate', 'bronze_shield', 'bronze_sword', 'bronze_greaves'],
  ['iron_helmet', 'iron_breastplate', 'iron_shield', 'iron_sword', 'iron_greaves'],
  [
    'salt_iron_helm',
    'salt_iron_plate',
    'salt_iron_shield',
    'salt_iron_sword',
    'salt_iron_greaves',
    'red_cloak',
  ],
];

/** Tier 2's wearables as the gallery shows them, a few to a body. */
const OUTFITS: readonly (readonly string[])[] = [
  [
    'salt_iron_helm',
    'salt_iron_plate',
    'salt_iron_greaves',
    'salt_iron_shield',
    'red_cloak',
    'salt_iron_axe',
  ],
  ['ranger_hood', 'ranger_coat', 'ranger_bracers', 'yew_longbow', 'salt_iron_arrows'],
  ['ranger_hood', 'ranger_coat', 'elm_longbow', 'broadhead_arrows'],
  ['linen_tunic', 'driftwood_shortbow', 'silver_bangle', 'gold_amulet'],
  ['capguard_helm', 'thornwood_bow', 'briar_charm'],
  ['iron_breastplate', 'mossback_shield', 'ogre_maul'],
];

const FACES: readonly string[] = [
  ...TIER2_MONSTER2_IDS,
  'steal_spice_merchant',
  'steal_customs_house',
  'steal_noble',
  'steal_guild_coffer',
  'steal_counting_house',
];

export function tier2Gallery(): { button: HTMLElement; section: HTMLElement } {
  const section = el('div', 'gallery-town2');
  section.id = 'tier2';
  section.append(
    el('h3', 'gallery-subhead', 'Tier 2 (B19), not yet approved'),
    el(
      'p',
      'gallery-caption muted',
      'What the first dungeon opens: the tier badges and the padlock, the gear ladder with the salt-iron knight as its new rung, the ranger and the other new wearables in four facings, Thistlewood’s monsters beside the hero, their faces and the new marks.',
    ),
  );
  const body = el('div', 'gallery-town2-body');
  section.append(body);
  let drawn = false;

  const ratio = (): number => window.devicePixelRatio || 1;
  const shot = (label: string, pic: Picture2, palette: Palette2 = CAVE_DAY, zoom = 2) => {
    const cell = el('figure', 'gallery-shot');
    cell.append(el('figcaption', 'muted', label));
    const scale = Math.max(1, Math.round(ratio() * zoom));
    cell.append(pixelCanvas2(pic, palette, scale, ratio()));
    const box = el('div', 'gallery-scroll');
    box.append(cell);
    body.append(box);
  };

  const draw = () => {
    if (drawn) return;
    drawn = true;
    const badges = el('div', 'icon-grid');
    for (const n of TIERS) {
      const cell = el('figure', 'icon-cell');
      cell.append(tierBadge(n), el('figcaption', 'muted', `tier ${n}`));
      badges.append(cell);
    }
    const lock = el('figure', 'icon-cell');
    lock.append(lockIcon(), el('figcaption', 'muted', 'locked'));
    badges.append(lock);
    body.append(badges);
    const facings = (worn: readonly string[]) => [
      { grid: characterPicture2({}, worn).grid },
      { grid: characterWalkPicture2({}, worn, 'right', 0).grid },
      { grid: characterWalkPicture2({}, worn, 'left', 0).grid },
      { grid: characterWalkPicture2({}, worn, 'up', 0).grid },
    ];
    const ladder = row(RUNGS.flatMap(facings), 2);
    shot('The ladder: linen, leather, bronze, iron and the salt-iron knight, by day', ladder);
    shot('The same at dusk', ladder, CAVE_DUSK);
    for (const worn of OUTFITS) shot(worn.join(', '), row(facings(worn), 2));
    const hero = { grid: characterPicture2({}, RUNGS[4]!).grid, feetY: 70 };
    shot(
      'Thistlewood’s Edge and the Deepthorn beside the knight',
      row(
        [
          hero,
          ...TIER2_MONSTER2_IDS.map((id) => {
            const f = foe2Frame(id, 'idle', 0)!;
            return { grid: f.picture.grid, feetY: f.feet.y };
          }),
        ],
        6,
      ),
      CAVE_DAY,
      1,
    );
    shot(
      'Their faces and the new marks’',
      row(
        FACES.map((id) => ({ grid: portraitPicture2(id)!.grid })),
        4,
      ),
      CAVE_DAY,
      1,
    );
  };

  const button = el('button', 'btn primary', 'Draw tier 2') as HTMLButtonElement;
  (button as HTMLButtonElement).type = 'button';
  button.addEventListener('click', () => {
    draw();
    section.scrollIntoView?.({ block: 'start' });
  });
  return { button, section };
}
