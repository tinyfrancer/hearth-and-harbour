import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOK,
  ITEM_LAYERS,
  LOOK_CHOICES,
  characterBody,
  characterGear,
  characterPicture,
  type Look,
} from '../../src/art/character';
import { HERO_OUTFIT, dress, figure } from '../../src/art/figure';
import { get, type Grid } from '../../src/art/grid';
import { DAY, DUSK, RAMPS, rgbOf, type Shade } from '../../src/art/palette';

// The gear ladder (docs/style-guide.md): each rung covers more of the body in
// metal and stands larger than the one below, and the knight's gear (the
// approved hero's) waits for tier 2.

const RUNGS = {
  linen: ['linen_hood', 'linen_tunic', 'linen_trousers'],
  bronze: ['bronze_helmet', 'bronze_breastplate', 'bronze_shield'],
  iron: ['iron_helmet', 'iron_breastplate', 'iron_shield'],
} as const;

const filled = (g: Grid) => g.d.filter(Boolean).length;
const metal = (g: Grid) => g.d.filter((c) => c && /^(bronze|metal)\d$/.test(c)).length;
const picture = (items: readonly string[], look: Look = DEFAULT_LOOK) =>
  characterPicture(look, items).grid;

/** How many cells an item changes on the character: what of it shows. */
const shows = (item: string, base: readonly string[] = []) => {
  const a = picture(base);
  const b = picture([...base, item]);
  return a.d.filter((c, i) => c !== b.d[i]).length;
};

/** The highest row an item draws in, on a character holding nothing else. */
const top = (g: Grid, without: Grid) => {
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) if (get(g, x, y) !== get(without, x, y)) return y;
  return g.h;
};

describe('the gear ladder', () => {
  it('covers more of the body in metal on each rung', () => {
    const linen = metal(picture(RUNGS.linen));
    const bronze = metal(picture(RUNGS.bronze));
    const iron = metal(picture(RUNGS.iron));
    expect(linen).toBe(0);
    expect(bronze).toBeGreaterThan(linen);
    expect(iron).toBeGreaterThan(bronze * 2);
    // One rung up, the knight adds colour and trim: a cloak, a painted shield, gilding.
    const trim = (g: Grid) => g.d.filter((c) => c && /^(gold|crimson|blue)\d$/.test(c)).length;
    expect(trim(figure('standard', HERO_OUTFIT))).toBeGreaterThan(
      trim(picture([...RUNGS.iron, 'iron_sword'])) * 10,
    );
  });

  it('stands larger on each rung: a bigger shield, a longer reach', () => {
    expect(shows('iron_shield')).toBeGreaterThan(shows('bronze_shield'));
    const kite = figure('standard', HERO_OUTFIT);
    const noKite = figure(
      'standard',
      HERO_OUTFIT.filter((id) => id !== 'kite_shield'),
    );
    const kiteShows = kite.d.filter((c, i) => c !== noKite.d[i]).length;
    expect(kiteShows).toBeGreaterThan(shows('iron_shield'));

    const empty = picture([]);
    const reach = (item: string) => top(picture([item]), empty);
    expect(reach('iron_sword')).toBeLessThan(reach('bronze_sword'));
    expect(reach('iron_axe')).toBeLessThan(reach('bronze_axe'));
    // The knight's sword rises to the top of the canvas.
    expect(get(kite, 4, 0)).not.toBeNull();
    expect(reach('iron_sword')).toBeGreaterThan(1);
  });

  it('keeps the knight’s gear for tier 2: no tier 1 item is drawn with it', () => {
    const knightOnly = ['iron_sword', 'iron_plate', 'kite_shield', 'red_cloak'];
    for (const layer of Object.values(ITEM_LAYERS)) expect(knightOnly).not.toContain(layer);
  });

  it('gives iron no gold trim and no pauldrons: wider than bronze, not the knight', () => {
    const iron = picture([...RUNGS.iron, 'iron_sword']);
    const gold = (g: Grid) => g.d.filter((c) => c?.startsWith('gold')).length;
    // Only the everyday belt's buckle.
    expect(gold(iron)).toBe(gold(picture([])));
    // The knight's pauldrons stand out past the shoulders at row 16 (outlined); mail does not.
    const knight = figure('standard', HERO_OUTFIT);
    const width = (g: Grid, y: number) =>
      Array.from({ length: g.w }, (_, x) => get(g, x, y)).filter(Boolean).length;
    expect(width(iron, 16)).toBeLessThan(width(knight, 16));
  });
});

/** CIE76 distance between two colours, in Lab. */
function distance(a: string, b: string): number {
  const lab = (hex: string) => {
    const [r, g, bl] = rgbOf(hex).map((v) => {
      const c = v / 255;
      return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92;
    }) as [number, number, number];
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047);
    const y = f(r * 0.2126 + g * 0.7152 + bl * 0.0722);
    const z = f((r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)] as const;
  };
  const p = lab(a);
  const q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

describe('bronze', () => {
  const steps = (ramp: keyof typeof RAMPS) => RAMPS[ramp].map((_, i) => `${ramp}${i + 1}` as Shade);
  const skins: Shade[] = [
    'skin1',
    'skin2',
    ...(['skinpale', 'skingolden', 'skinbrown', 'skindeep'] as const).flatMap((r) =>
      steps(r).slice(0, 2),
    ),
  ];

  it('cannot be mistaken for skin of any tone, by day or at dusk', () => {
    for (const palette of [DAY, DUSK])
      for (const b of steps('bronze'))
        for (const s of skins) {
          const d = distance(palette.colours[b], palette.colours[s]);
          expect(d, `${palette.name} ${b} ${s}`).toBeGreaterThan(12);
        }
  });

  it('is framed in leather, never laid bare against skin', () => {
    // Every bronze cell of the jerkin and cap touches no skin cell.
    for (const skin of LOOK_CHOICES.skin) {
      const g = picture(['bronze_breastplate', 'bronze_helmet'], {
        ...DEFAULT_LOOK,
        skin: skin.id,
      });
      for (let y = 0; y < g.h; y++)
        for (let x = 0; x < g.w; x++) {
          if (!get(g, x, y)?.startsWith('bronze')) continue;
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const n = get(g, x + dx, y + dy);
            expect(n?.startsWith('skin') ?? false, `${skin.id} ${x},${y}`).toBe(false);
          }
        }
    }
  });
});

describe('headgear', () => {
  const looks: Look[] = LOOK_CHOICES.hair.flatMap((hair) =>
    LOOK_CHOICES.hairColour.map((c) => ({ ...DEFAULT_LOOK, hair: hair.id, hairColour: c.id })),
  );

  it('changes the head’s outline in every look, so it reads as something worn', () => {
    for (const head of ['bronze_helmet', 'iron_helmet', 'linen_hood']) {
      const bald = picture([], { ...DEFAULT_LOOK, hair: 'bald' });
      for (const look of looks) {
        const g = picture([head], look);
        let beyond = 0;
        for (let y = 0; y <= 6; y++)
          for (let x = 0; x < g.w; x++) if (get(g, x, y) && !get(bald, x, y)) beyond++;
        expect(beyond, `${head} ${JSON.stringify(look)}`).toBeGreaterThan(0);
      }
    }
  });

  it('sits the bronze cap close: no brim, a hide liner between it and the brows', () => {
    const bald = picture([], { ...DEFAULT_LOOK, hair: 'bald' });
    const cap = picture(['bronze_helmet'], { ...DEFAULT_LOOK, hair: 'bald' });
    const width = (g: Grid, y: number) =>
      Array.from({ length: g.w }, (_, x) => get(g, x, y)).filter(Boolean).length;
    const head = Math.max(...Array.from({ length: 14 }, (_, y) => width(bald, y)));
    // A pixel proud of the head at most on each side: a cap, not a sun hat.
    expect(Math.max(...[0, 1, 2, 3, 4, 5, 6].map((y) => width(cap, y)))).toBeLessThanOrEqual(head);
    // The liner (row 6 of the outlined figure) is dark hide over the forehead.
    expect(get(cap, 18, 6)).toMatch(/^hide/);
  });
});

describe('an empty hand', () => {
  it('rests at the belt when nothing is held, and closes on whatever is', () => {
    expect(characterBody(characterGear(DEFAULT_LOOK, []))).toBe('standard_at_ease');
    expect(characterBody(characterGear(DEFAULT_LOOK, ['bronze_shield']))).toBe('standard_at_ease');
    for (const held of ['bronze_sword', 'iron_axe', 'oak_shortbow'])
      expect(characterBody(characterGear(DEFAULT_LOOK, [held])), held).toBe('standard');
  });

  it('changes only the weapon arm from the elbow down', () => {
    const standard = dress('standard', []);
    const atEase = dress('standard_at_ease', []);
    for (let y = 0; y < standard.h; y++)
      for (let x = 0; x < standard.w; x++) {
        const inArm = x >= 10 && x <= 16 && y >= 22 && y <= 27;
        if (!inArm) expect(get(atEase, x, y), `${x},${y}`).toBe(get(standard, x, y));
      }
    // No fist hangs below the sleeve at the hip.
    for (let x = 11; x <= 14; x++) expect(get(atEase, x, 27)).toBeNull();
    expect(get(standard, 12, 27)).toBe('skin1');
  });

  it('keeps sleeves and the bracelet on the arm at rest', () => {
    for (const items of [[], ['linen_tunic'], ['shell_bracelet'], ['bronze_breastplate']]) {
      const g = picture(items);
      // No skin where the hanging fist used to be (rows 27 and 28 once outlined).
      for (const y of [27, 28])
        for (let x = 12; x <= 15; x++)
          expect(get(g, x, y)?.startsWith('skin') ?? false, `${items.join()} ${x},${y}`).toBe(
            false,
          );
    }
  });
});

describe('the ladder in the picture', () => {
  it('draws more of the figure on each rung, fully armed', () => {
    const linen = filled(picture(RUNGS.linen));
    const bronze = filled(picture([...RUNGS.bronze, 'bronze_sword']));
    const iron = filled(picture([...RUNGS.iron, 'iron_sword']));
    expect(bronze).toBeGreaterThan(linen);
    expect(iron).toBeGreaterThan(bronze);
    expect(filled(figure('standard', HERO_OUTFIT))).toBeGreaterThan(iron);
  });
});
