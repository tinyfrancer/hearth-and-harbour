import { describe, expect, it, vi } from 'vitest';
import {
  burrowNight,
  foeFrames2,
  foePicture2,
  foeSpecial2,
  foeSprite2,
  FOE2_IDS,
  FOE2_SIZES,
  FOE2_SPECIALS,
  NIGHT_EXEMPT,
  PHASED2_IDS,
} from '../../src/art/dungeonArt2';
import { portraitPicture2, PORTRAIT2_SAFE } from '../../src/art/portraits2';
import { measureSafe2 } from '../../src/art/dungeon2/safe';
import { matOf } from '../../src/art/dungeon2/cave';
import { chartEmblem2, CHART_EMBLEM2_IDS, harbourChart2 } from '../../src/art/chart';
import { matOf as townMatOf } from '../../src/art/town2/cells';
import { challengeKind, modifierKind } from '../../src/art/dungeonIcons';
import { artGallery } from '../../src/art/gallery';
import type { TGrid } from '../../src/art/town2/cells';

vi.setConfig({ testTimeout: 60_000 });

const top = (g: TGrid) => {
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.d[y * g.w + x]) return y;
  return g.h;
};
const key = (g: TGrid) => Array.from(g.d).join();

describe('The badger king (B20)', () => {
  it('is drawn in every pose and three phases, both ways', () => {
    expect(FOE2_IDS).toContain('badger_king');
    expect(PHASED2_IDS).toEqual(['brinebeard', 'badger_king']);
    expect(foeFrames2('badger_king')).toEqual({
      idle: 2,
      walk: 4,
      windup: 1,
      strike: 1,
      hurt: 1,
      flash: 1,
      fall: 2,
    });
    // Each phase its own look; a phase out of range is the nearest.
    const idle = [1, 2, 3].map((p) =>
      key(foePicture2('badger_king', 'idle', 'right', 0, p)!.picture.grid),
    );
    expect(new Set(idle).size).toBe(3);
    expect(key(foePicture2('badger_king', 'idle', 'right', 0, 9)!.picture.grid)).toBe(idle[2]);
    expect(foeSprite2('badger_king', 'idle', 'left', 0, 3)).not.toBeNull();
  });

  it('is big and stands tight to his feet: a head and more over the hero, clear of him at the stand', () => {
    const s = FOE2_SIZES.badger_king!;
    expect(s.tall).toBeGreaterThan(64 + 12);
    expect(s.box.w).toBeGreaterThan(56);
    const MELEE_STAND = 36;
    const HERO_BACK = 13;
    expect(s.front + HERO_BACK - MELEE_STAND).toBeLessThanOrEqual(4);
    // His slam reaches onto a hero at the stand.
    expect(s.strike).toBeGreaterThanOrEqual(MELEE_STAND + 4);
  });

  it('telegraphs the slam plainly: both fists raised high over his crown', () => {
    const idle = foePicture2('badger_king', 'idle')!.picture.grid;
    const wind = foePicture2('badger_king', 'windup')!.picture.grid;
    expect(top(wind)).toBeLessThan(top(idle) - 8);
  });

  it('wears his crown and his robe, and in his rage bares his teeth with red eyes', () => {
    const mats = (p: number) =>
      new Set(
        Array.from(foePicture2('badger_king', 'idle', 'right', 0, p)!.picture.grid.d).map(matOf),
      );
    for (const p of [1, 2, 3]) {
      expect(mats(p)).toContain('gold');
      expect(mats(p)).toContain('violet');
      expect(mats(p)).toContain('crimson');
    }
    // Earth on him once he has been under.
    expect(mats(1)).not.toContain('soil');
    expect(mats(2)).toContain('soil');
  });

  it('goes under, comes up and stands dazzled at a lantern (his moves), in any phase', () => {
    expect(FOE2_SPECIALS.badger_king).toEqual({ burrow: 3, erupt: 3, stunned: 2 });
    const under = [0, 1, 2].map((f) => foeSpecial2('badger_king', 'burrow', 'right', f, 2)!);
    // Sinking: each frame less of him above the floor.
    const drawn = under.map((u) => Array.from(u.picture.grid.d).filter(Boolean).length);
    expect(drawn[1]!).toBeLessThan(drawn[0]!);
    expect(drawn[2]!).toBeLessThan(drawn[1]!);
    const up = [0, 1, 2].map((f) => foeSpecial2('badger_king', 'erupt', 'right', f, 2)!);
    const upDrawn = up.map((u) => Array.from(u.picture.grid.d).filter(Boolean).length);
    expect(upDrawn[2]!).toBeGreaterThan(upDrawn[0]!);
    for (const f of [0, 1]) {
      const r = foeSpecial2('badger_king', 'stunned', 'right', f, 3)!;
      const l = foeSpecial2('badger_king', 'stunned', 'left', f, 3)!;
      expect(l.feet.x).toBe(r.picture.grid.w - 1 - r.feet.x);
      expect(r.feet).toEqual(foePicture2('badger_king', 'idle')!.feet);
    }
  });

  it('shows his eyes in the dark (they shine back the light) and his white face reads', () => {
    for (const p of [1, 2, 3]) {
      const g = foePicture2('badger_king', 'idle', 'right', 0, p)!.picture.grid;
      const lights = Array.from(g.d).filter((c) => {
        const m = matOf(c);
        return !!m && NIGHT_EXEMPT.includes(m);
      }).length;
      expect(lights, `phase ${p}`).toBeGreaterThan(0);
      // His face is the lightest thing on him in the dark: the badger's white.
      const dark = burrowNight(2).rgb;
      const lum = (c: number) =>
        0.299 * dark[c * 3]! + 0.587 * dark[c * 3 + 1]! + 0.114 * dark[c * 3 + 2]!;
      const face = Array.from(g.d).filter((c) => matOf(c) === 'hairgrey');
      const coat = Array.from(g.d).filter((c) => matOf(c) === 'badger');
      const mean = (a: number[]) => a.reduce((n, c) => n + lum(c), 0) / a.length;
      expect(mean(face)).toBeGreaterThan(mean(coat) + 15);
    }
  });

  it('has a hand-drawn face with its safe box', () => {
    const p = portraitPicture2('badger_king')!;
    expect([p.grid.w, p.grid.h]).toEqual([72, 72]);
    expect(PORTRAIT2_SAFE.badger_king).toEqual(measureSafe2('badger_king'));
  });
});

describe('The Burrow on the chart (B20)', () => {
  it('lands ashore under the old forest, in the river’s mouth, with the spare landings kept', () => {
    const c = harbourChart2();
    const L = c.landings.thistlewood_burrow!;
    for (const k of ['unknown_1', 'unknown_2', 'unknown_3']) expect(c.landings[k], k).toBeDefined();
    // The old forest over it: close-set pines just inland.
    let pines = 0;
    const g = c.picture.grid;
    for (let y = Math.max(0, L.y - 70); y < L.y - 12; y++)
      for (let x = Math.max(0, L.x - 40); x < L.x + 40; x++)
        if (townMatOf(g.d[y * g.w + x]!) === 'pine') pines++;
    expect(pines).toBeGreaterThan(150);
    // The river runs down out of the forest to the shore above the landing.
    let river = 0;
    for (let y = L.y - 40; y < L.y - 18; y++)
      for (let x = L.x - 12; x < L.x + 12; x++)
        if (townMatOf(g.d[y * g.w + x]!) === 'chartsea') river++;
    expect(river).toBeGreaterThan(20);
  });

  it('has its emblem, the crowned badger, and its ink silhouette', () => {
    expect(CHART_EMBLEM2_IDS).toContain('thistlewood_burrow');
    const e = chartEmblem2('thistlewood_burrow')!;
    const mats = new Set(Array.from(e.picture.grid.d).filter(Boolean).map(townMatOf));
    expect(mats).toContain('gold');
    expect(mats).toContain('hairblack');
    expect(mats).toContain('plaster');
    const s = chartEmblem2('thistlewood_burrow', true)!;
    expect(new Set(Array.from(s.picture.grid.d).filter(Boolean).map(townMatOf))).toEqual(
      new Set(['ink']),
    );
  });

  it('gives the Burrow’s days and challenges fitting icons, none generic', () => {
    expect(modifierKind('thick_caps')).toBe('tough');
    expect(modifierKind('fierce_brambles')).toBe('fierce');
    expect(modifierKind('swift_hounds')).toBe('swift');
    expect(modifierKind('short_rations')).toBe('hungry');
    expect(modifierKind('deep_gloom')).toBe('dark');
    expect(challengeKind('thistlewood_burrow.swift')).toBe('time');
    expect(challengeKind('thistlewood_burrow.nearly_unhurt')).toBe('untouched');
    expect(challengeKind('thistlewood_burrow.no_food')).toBe('hungry');
    expect(challengeKind('thistlewood_burrow.badger_dodge')).toBe('dodge');
  });
});

describe('Fixed from the review sheets (B21)', () => {
  it('shows the king dazzled, not idle: a paw over his eyes and sparks wheeling round his crown', () => {
    const idle = foePicture2('badger_king', 'idle')!.picture.grid;
    const frames = [0, 1].map((f) => foeSpecial2('badger_king', 'stunned', 'right', f, 1)!);
    for (const s of frames) {
      const g = s.picture.grid;
      // Sparks over the crown: something drawn above his idle top, and gold among it.
      expect(top(g)).toBeLessThan(top(idle) - 2);
      let gold = 0;
      for (let y = 0; y < top(idle); y++)
        for (let x = 0; x < g.w; x++) if (matOf(g.d[y * g.w + x]!) === 'gold') gold++;
      expect(gold).toBeGreaterThan(4);
      // His eye is covered: no eyeshine (ember) left on his face.
      expect(Array.from(g.d).some((c) => matOf(c) === 'ember')).toBe(false);
    }
    // The sparks move between the two frames.
    expect(key(frames[0]!.picture.grid)).not.toBe(key(frames[1]!.picture.grid));
  });

  it('gives the briar hag her face’s skin on her figure', () => {
    const skins = (d: ArrayLike<number>) =>
      new Set(
        Array.from(d)
          .map(matOf)
          .filter((m) => m === 'turtleskin' || m === 'skinpale'),
      );
    expect(skins(portraitPicture2('briar_hag')!.grid.d)).toEqual(new Set(['turtleskin']));
    for (const pose of ['idle', 'strike', 'fall'] as const)
      expect(skins(foePicture2('briar_hag', pose)!.picture.grid.d), pose).toEqual(
        new Set(['turtleskin']),
      );
  });

  it('draws lane C’s Burrow-only rations day (`lean_rations`) as the hungry plate', () => {
    expect(modifierKind('lean_rations')).toBe('hungry');
  });
});

describe('The Burrow in the gallery (B20)', () => {
  it('draws its section on a tap, every picture at whole device pixels', () => {
    const page = artGallery();
    const button = [...page.querySelectorAll('button')].find(
      (b) => b.textContent === 'Draw Thistlewood Burrow',
    )!;
    expect(button).toBeDefined();
    const section = page.querySelector('#burrow')!;
    expect(section.querySelectorAll('canvas').length).toBe(0);
    (button as HTMLButtonElement).click();
    const canvases = [...section.querySelectorAll('canvas')];
    expect(canvases.length).toBeGreaterThan(20);
    const dpr = window.devicePixelRatio || 1;
    for (const canvas of canvases)
      expect((parseFloat(canvas.style.width) * dpr) / canvas.width).toBeCloseTo(1, 6);
  }, 120_000);
});
