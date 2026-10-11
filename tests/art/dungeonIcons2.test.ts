import { describe, expect, it } from 'vitest';
import * as dungeonData from '../../src/data/dungeons';
import {
  CHART_EMBLEM2_IDS,
  CHART_PENNANT2_FRAMES,
  chartMarker2,
  chartPennant2,
} from '../../src/art/chart';
import {
  CHALLENGE_MEDAL_FRAMES,
  CHALLENGE_MEDAL_STATES,
  DUNGEON_ICON_KINDS,
  DUNGEON_ICON_SIZE,
  DUNGEON_SEAL_TIERS,
  challengeIcon,
  challengeIconPicture,
  challengeKind,
  challengeMedal,
  challengeMedalPicture,
  dungeonIconPicture,
  dungeonSeal,
  modifierIcon,
  modifierIconFor,
  modifierIconPicture,
  modifierKind,
  modifierKindFor,
} from '../../src/art/dungeonIcons';
import { isMat, stepOf, type TGrid } from '../../src/art/town2/cells';

// Dungeon replay (B17, for S16): icons for the daily modifiers and the
// challenges, chosen by the words in an id or by a modifier's effects; the
// challenge medals; a seal per dungeon; the chart's daily pennant.

const drawn = (g: TGrid) => [...g.d].filter(Boolean).length;
const key = (g: TGrid) => `${g.w}x${g.h}:${[...g.d].join(',')}`;
/** Every drawn pixel has its keyline: no drawn pixel touches an empty one or the edge unless it is a line step. */
function keylined(g: TGrid): boolean {
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = g.d[y * g.w + x]!;
      if (!c || stepOf(c) === 6) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= g.w || yy >= g.h || !g.d[yy * g.w + xx]) return false;
      }
    }
  return true;
}

describe('modifier and challenge icons (B17)', () => {
  it('draws every kind as its own 24 x 24 icon, outlined, filling its square', () => {
    const seen = new Set<string>();
    for (const kind of DUNGEON_ICON_KINDS) {
      const g = dungeonIconPicture(kind).grid;
      expect([g.w, g.h], kind).toEqual([DUNGEON_ICON_SIZE, DUNGEON_ICON_SIZE]);
      expect(DUNGEON_ICON_SIZE).toBe(24);
      expect(keylined(g), kind).toBe(true);
      // Big enough to read beside the item icons (which fill most of their square).
      expect(drawn(g), kind).toBeGreaterThan(150);
      seen.add(key(g));
    }
    expect(seen.size).toBe(DUNGEON_ICON_KINDS.length);
  });

  it('reads a modifier’s kind from the words in its id', () => {
    const cases: Record<string, string> = {
      tough_foes: 'tough',
      hardy: 'tough',
      fierce: 'fierce',
      foes_hit_harder: 'fierce',
      swift_foes: 'swift',
      frenzy: 'swift',
      heroic: 'might',
      keen_edge: 'might',
      bountiful: 'loot',
      rich_pickings: 'coins',
      learned: 'xp',
      spring_tide: 'tide',
      hungry: 'hungry',
      no_food: 'hungry',
      dark: 'dark',
      gloom: 'dark',
      fragile: 'frail',
      'something-new': 'modifier',
    };
    for (const [id, kind] of Object.entries(cases)) expect(modifierKind(id), id).toBe(kind);
  });

  it('reads a challenge’s kind from its slug alone', () => {
    const cases: Record<string, string> = {
      'tidepool_cave.untouched': 'untouched',
      'brinebeards_grotto.no_damage': 'untouched',
      'tidepool_cave.under_3_minutes': 'time',
      'tidepool_cave.swift': 'time',
      'brinebeards_grotto.no_food': 'hungry',
      'brinebeards_grotto.no_brace': 'nobrace',
      'brinebeards_grotto.no_potions': 'nopotion',
      'tidepool_cave.bare_hands': 'unarmed',
      'tidepool_cave.every_foe': 'slayer',
      'brinebeards_grotto.beat_the_tide': 'tide',
      'tidepool_cave.something': 'challenge',
    };
    for (const [id, kind] of Object.entries(cases)) expect(challengeKind(id), id).toBe(kind);
  });

  it('follows a modifier’s effects for an id it never saw, the biggest change winning', () => {
    const cases: [unknown, string][] = [
      [{ foeHealth: 1.5 }, 'tough'],
      [{ foeDamage: 1.3 }, 'fierce'],
      [{ foeSpeed: 1.25 }, 'swift'],
      [{ foeAttackMs: 0.8 }, 'swift'],
      [{ heroDamage: 1.25 }, 'might'],
      [{ heroHealth: 0.75 }, 'frail'],
      [{ loot: 2 }, 'loot'],
      [{ coins: 1.5 }, 'coins'],
      [{ xp: 1.5 }, 'xp'],
      [{ tideSpeed: 1.5 }, 'tide'],
      [{ food: false }, 'hungry'],
      [{ noFood: true }, 'hungry'],
      [{ dark: true }, 'dark'],
      [{ foeHealth: 1.1, loot: 2 }, 'loot'],
      [[{ kind: 'foeDamage', by: 1.5 }], 'fierce'],
      [['dark'], 'dark'],
      [{}, 'modifier'],
      [null, 'modifier'],
    ];
    for (const [effects, kind] of cases)
      expect(modifierKindFor(effects), JSON.stringify(effects)).toBe(kind);
  });

  it('gives elements at the item icons’ scale, never null', () => {
    for (const el of [
      modifierIcon('tough_foes'),
      modifierIcon('zzz'),
      challengeIcon('x.untouched'),
      challengeIcon('x.zzz'),
      modifierIconFor({ loot: 2 }),
      challengeMedal('new', 2),
    ]) {
      expect(el.tagName).toBe('CANVAS');
      expect(el.classList.contains('icon')).toBe(true);
      expect(el.getAttribute('aria-hidden')).toBe('true');
      expect(el.width).toBeGreaterThan(0);
    }
    expect(modifierIconPicture('swift_foes')).toBe(dungeonIconPicture('swift'));
    expect(challengeIconPicture('a.b.c')).toBe(dungeonIconPicture('challenge'));
  });
});

/** Every id lane A's dungeon table gives a modifier or a challenge, however it is laid out. */
function dataIds(): { modifiers: string[]; challenges: string[] } {
  const data = dungeonData as Record<string, unknown>;
  const ids = (v: unknown): string[] => {
    if (Array.isArray(v))
      return v.flatMap((x) =>
        typeof x === 'string' ? [x] : x && typeof x === 'object' && 'id' in x ? [String(x.id)] : [],
      );
    if (v && typeof v === 'object')
      return Object.entries(v).map(([k, x]) =>
        x && typeof x === 'object' && 'id' in x ? String((x as { id: unknown }).id) : k,
      );
    return [];
  };
  const modifiers = ids(data.DUNGEON_MODIFIERS);
  const challenges: string[] = [];
  for (const [name, v] of Object.entries(data)) {
    if (/CHALLENGE/.test(name)) challenges.push(...ids(v));
    if (name === 'DUNGEONS' && v && typeof v === 'object')
      for (const d of Object.values(v))
        if (d && typeof d === 'object' && 'challenges' in d) challenges.push(...ids(d.challenges));
  }
  return { modifiers: [...new Set(modifiers)], challenges: [...new Set(challenges)] };
}

describe('every modifier and challenge in the game’s data has a fitting icon (B17)', () => {
  const { modifiers, challenges } = dataIds();
  it.skipIf(modifiers.length === 0)('modifiers', () => {
    for (const id of modifiers) expect(modifierKind(id), id).not.toBe('modifier');
  });
  it.skipIf(challenges.length === 0)('challenges', () => {
    for (const id of challenges) expect(challengeKind(id), id).not.toBe('challenge');
  });
});

describe('challenge medals (B17)', () => {
  it('draws todo, done and new on the icon’s square, todo dull and done gold', () => {
    const gold = (g: TGrid) => [...g.d].filter((c) => c && isMat(c, 'gold')).length;
    for (const s of CHALLENGE_MEDAL_STATES) {
      const g = challengeMedalPicture(s).grid;
      expect([g.w, g.h]).toEqual([24, 24]);
      expect(keylined(g), s).toBe(true);
    }
    expect(gold(challengeMedalPicture('todo').grid)).toBe(0);
    expect(gold(challengeMedalPicture('done').grid)).toBeGreaterThan(80);
  });

  it('sparkles once when new, then is the done medal for good', () => {
    const frames = Array.from({ length: CHALLENGE_MEDAL_FRAMES }, (_, f) =>
      key(challengeMedalPicture('new', f).grid),
    );
    for (let f = 0; f < CHALLENGE_MEDAL_FRAMES - 1; f++) expect(frames[f]).not.toBe(frames[f + 1]);
    expect(challengeMedalPicture('new', CHALLENGE_MEDAL_FRAMES - 1)).toBe(
      challengeMedalPicture('done'),
    );
    expect(challengeMedalPicture('new', 99)).toBe(challengeMedalPicture('done'));
  });
});

describe('dungeon seals and the daily pennant (B17)', () => {
  it('seals every dungeon with an emblem in both tiers, and any other id with a compass star', () => {
    for (const id of [...CHART_EMBLEM2_IDS, 'unknown_1'])
      for (const tier of DUNGEON_SEAL_TIERS) {
        const s = dungeonSeal(id, tier);
        const g = s.picture.grid;
        expect(keylined(g), `${id} ${tier}`).toBe(true);
        // The anchor is the disc's middle: on paper (the frame's inside), not on the rim.
        const c = g.d[s.anchor.y * g.w + s.anchor.x]!;
        expect(c, `${id} ${tier}`).not.toBe(0);
        expect(g.w).toBeLessThanOrEqual(34);
      }
    const gold = (g: TGrid) => [...g.d].filter((c) => c && isMat(c, 'gold')).length;
    expect(gold(dungeonSeal('tidepool_cave', 'all-challenges').picture.grid)).toBeGreaterThan(
      gold(dungeonSeal('tidepool_cave', 'cleared').picture.grid) + 30,
    );
    expect(key(dungeonSeal('tidepool_cave').picture.grid)).not.toBe(
      key(dungeonSeal('brinebeards_grotto').picture.grid),
    );
    expect(dungeonSeal('tidepool_cave')).toBe(dungeonSeal('tidepool_cave', 'cleared'));
  });

  it('flutters the pennant on one canvas and anchor, taller than a landing marker', () => {
    const frames = Array.from({ length: CHART_PENNANT2_FRAMES }, (_, f) => chartPennant2(f));
    const g0 = frames[0]!.picture.grid;
    for (const p of frames) {
      expect([p.picture.grid.w, p.picture.grid.h]).toEqual([g0.w, g0.h]);
      expect(p.anchor).toEqual(frames[0]!.anchor);
      expect(keylined(p.picture.grid)).toBe(true);
    }
    expect(new Set(frames.map((p) => key(p.picture.grid))).size).toBeGreaterThan(2);
    expect(chartPennant2(CHART_PENNANT2_FRAMES + 1)).toBe(frames[1]);
    // The pole's foot is the anchor, the lowest drawn row but the keyline under it.
    expect(frames[0]!.anchor.y).toBe(g0.h - 2);
    expect(g0.h).toBeGreaterThan(chartMarker2('open').picture.grid.h);
    // Midnight blue, never the marker's red.
    const mats = [...g0.d].filter((c) => c && isMat(c, 'crimson')).length;
    expect(mats).toBe(0);
  });
});
