import { describe, expect, it, vi } from 'vitest';
import {
  BURROW2_PROP_IDS,
  burrowEruption2,
  BURROW_ERUPTION2_FRAMES,
  burrowMound2,
  BURROW_MOUND2_FRAMES,
  burrowNight,
  CAVE_BURROW,
  dungeonProp2,
  dungeonTheme2,
  FUNGUS2_RGB,
  HERO_LIGHT2,
  NIGHT_EXEMPT,
  postLanternFrame2,
  postLanternShines,
  POST_LANTERN2_FRAMES,
  POST_LANTERN2_STATES,
  PROP2_IDS,
  sporeCloud2,
  SPORE_CLOUD2_FRAMES,
} from '../../src/art/dungeonArt2';
import { matOf } from '../../src/art/dungeon2/cave';

vi.setConfig({ testTimeout: 60_000 });

/** Lane C's letters' ids (src/scene/ground.ts) and its lantern's two (fromLaneB.ts `LAMP_ART`). */
const LANE_C = [
  'toadstools',
  'root_tangle',
  'bramble_patch',
  'mossy_stone',
  'fallen_log',
  'root_throne',
  'post_lantern',
  'post_lantern_out',
];

const drawn = (d: ArrayLike<number>) => Array.from(d).filter((c) => c !== 0).length;

describe('Thistlewood Burrow’s props (B20)', () => {
  it('draws every id lane C names, and the pieces that make the warren lived in', () => {
    for (const id of LANE_C) expect(BURROW2_PROP_IDS, id).toContain(id);
    for (const id of ['badger_throne', 'mushroom_dwelling', 'larder', 'court_bench', 'sett_banner'])
      expect(BURROW2_PROP_IDS, id).toContain(id);
    for (const id of BURROW2_PROP_IDS) {
      expect(PROP2_IDS, id).toContain(id);
      const p = dungeonProp2(id)!;
      expect(p.base, id).toBeLessThanOrEqual(p.picture.grid.h);
      expect(p.base, id).toBeGreaterThan(p.picture.grid.h / 2);
      expect(p.foot, id).toBeGreaterThan(0);
      expect(p.foot, id).toBeLessThan(p.picture.grid.w);
      // It stands on its base: something drawn on the row just above it.
      const g = p.picture.grid;
      let low = -1;
      for (let i = 0; i < g.d.length; i++) if (g.d[i]) low = Math.floor(i / g.w);
      expect(low, id).toBeGreaterThanOrEqual(p.base - 1);
    }
    expect(dungeonTheme2('burrow').propIds).toEqual(BURROW2_PROP_IDS);
    for (const id of BURROW2_PROP_IDS) expect(dungeonTheme2('grotto').propIds).not.toContain(id);
  });

  it('keeps each of lane C’s floor props to about its own tile, and the throne’s segment to one', () => {
    for (const id of ['toadstools', 'root_tangle', 'bramble_patch', 'mossy_stone', 'fallen_log'])
      expect(dungeonProp2(id)!.picture.grid.w, id).toBeLessThanOrEqual(36);
    // A run of `J`s is one woven wall: the segment is exactly a tile wide inside its outline.
    expect(dungeonProp2('root_throne')!.picture.grid.w).toBe(26);
    // The whole throne is four tiles across, to be stood once at its middle.
    const t = dungeonProp2('badger_throne')!;
    expect(t.picture.grid.w).toBeGreaterThanOrEqual(96);
    expect(Math.abs(t.foot - t.picture.grid.w / 2)).toBeLessThanOrEqual(1);
  });

  it('gives its fungus’s glow in a cool light that shines in the dark', () => {
    for (const id of ['toadstools', 'badger_throne']) {
      const glows = dungeonProp2(id)!.picture.glows;
      expect(glows.length, id).toBeGreaterThan(0);
      for (const g of glows) {
        expect(g.rgb, id).toEqual(FUNGUS2_RGB);
        expect(g.always, id).toBe(true);
      }
    }
  });
});

describe('The lantern on a post (B20)', () => {
  it('lays exactly the rules’ pool: 66 across each way, its middle four below its foot', () => {
    const p = dungeonProp2('post_lantern')!;
    expect(p.light).toBeDefined();
    expect(p.light!.pool).toBe(66);
    expect(p.light!.y + p.light!.drop).toBe(p.base + 4);
    // Its flame is over its post, out to the right on its crook, but never past its tile's side.
    expect(Math.abs(p.light!.x - p.foot)).toBeLessThanOrEqual(12);
    expect(p.picture.glows.length).toBeGreaterThan(0);
    const out = dungeonProp2('post_lantern_out')!;
    expect(out.light).toBeUndefined();
    expect(out.picture.glows).toEqual([]);
  });

  it('goes through its states in place: every frame the same canvas, base and foot', () => {
    const lit = dungeonProp2('post_lantern')!;
    expect(POST_LANTERN2_STATES).toEqual(['out', 'lighting', 'lit', 'snuffed']);
    for (const s of POST_LANTERN2_STATES)
      for (let f = 0; f < POST_LANTERN2_FRAMES[s]; f++) {
        const p = postLanternFrame2(s, f);
        expect([p.picture.grid.w, p.picture.grid.h, p.base, p.foot], `${s} ${f}`).toEqual([
          lit.picture.grid.w,
          lit.picture.grid.h,
          lit.base,
          lit.foot,
        ]);
        expect(!!p.light, `${s} ${f}`).toBe(postLanternShines(s, f));
        expect(p.picture.glows.length > 0, `${s} ${f}`).toBe(postLanternShines(s, f));
      }
    expect(postLanternFrame2('lit', 0).picture.grid.d).toEqual(lit.picture.grid.d);
    expect(postLanternFrame2('out', 0).picture.grid.d).toEqual(
      dungeonProp2('post_lantern_out')!.picture.grid.d,
    );
    // It wraps, and an unknown state is out.
    expect(postLanternFrame2('lit', 5)).toBe(postLanternFrame2('lit', 1));
    expect(postLanternFrame2('nonsense' as 'out')).toBe(postLanternFrame2('out'));
  });

  it('burns with a flame that moves, catches when lit, and smokes when snuffed', () => {
    const count = (s: (typeof POST_LANTERN2_STATES)[number], f: number, m: string) =>
      Array.from(postLanternFrame2(s, f).picture.grid.d).filter((c) => matOf(c) === m).length;
    const lit = [0, 1, 2, 3].map((f) => postLanternFrame2('lit', f).picture.grid.d.join());
    expect(new Set(lit).size).toBe(4);
    // Out, its panes are dark: no lamp, no flame; lighting, the flame grows frame by frame.
    expect(count('out', 0, 'lamp') + count('out', 0, 'fire')).toBe(0);
    const flames = [0, 1, 2, 3].map((f) => count('lighting', f, 'fire'));
    for (let f = 1; f < 4; f++) expect(flames[f]!).toBeGreaterThanOrEqual(flames[f - 1]!);
    expect(flames[0]).toBeGreaterThan(0);
    for (let f = 0; f < 4; f++)
      expect(count('snuffed', f, 'smoke'), `snuffed ${f}`).toBeGreaterThan(3);
    expect(count('snuffed', 0, 'fire')).toBe(0);
  });

  it('keeps its flame’s colour in the dark, so a burning lantern reads from across a dark room', () => {
    const g = postLanternFrame2('lit', 0).picture.grid;
    const lit = CAVE_BURROW.rgb;
    const dark = burrowNight(2).rgb;
    let flames = 0;
    for (const c of g.d) {
      if (matOf(c) !== 'fire') continue;
      flames++;
      expect([dark[c * 3], dark[c * 3 + 1], dark[c * 3 + 2]]).toEqual([
        lit[c * 3],
        lit[c * 3 + 1],
        lit[c * 3 + 2],
      ]);
    }
    expect(flames).toBeGreaterThan(2);
  });
});

describe('The Burrow’s ground effects (B20)', () => {
  it('drifts a spore cloud that reads as one but is never filled: the floor shows through', () => {
    for (const r of [24, 36, 45]) {
      const frames = [...Array(SPORE_CLOUD2_FRAMES).keys()].map((f) => sporeCloud2(r, f));
      expect(new Set(frames.map((c) => c.picture.grid.d.join())).size).toBe(SPORE_CLOUD2_FRAMES);
      for (const c of frames) {
        const g = c.picture.grid;
        expect(g.w).toBeGreaterThanOrEqual(r * 2);
        // Over its footprint on the floor (an ellipse, as the floor is seen), under three in five drawn.
        let inside = 0;
        let on = 0;
        for (let y = 0; y < g.h; y++)
          for (let x = 0; x < g.w; x++) {
            const u = Math.hypot((x - c.anchor.x) / r, (y - c.anchor.y) / (r * 0.62));
            if (u > 0.95) continue;
            inside++;
            if (g.d[y * g.w + x]) on++;
          }
        expect(on / inside, `${r}`).toBeGreaterThan(0.15);
        expect(on / inside, `${r}`).toBeLessThan(0.6);
        // Its spores glow faintly: they keep their colour in the dark.
        for (const cc of g.d) if (cc) expect(matOf(cc)).toBe('spore');
      }
    }
    expect(NIGHT_EXEMPT).toContain('spore');
  });

  it('raises a mound as the king goes under, and bursts the floor where he comes up', () => {
    expect(BURROW_MOUND2_FRAMES).toBe(3);
    expect(BURROW_ERUPTION2_FRAMES).toBe(4);
    const mounds = [0, 1, 2].map((f) => burrowMound2(f));
    expect(new Set(mounds.map((m) => m.picture.grid.d.join())).size).toBe(3);
    for (const m of mounds) {
      expect(m.anchor.y).toBeLessThan(m.picture.grid.h);
      expect(drawn(m.picture.grid.d)).toBeGreaterThan(200);
    }
    const hole = (f: number) =>
      Array.from(burrowEruption2(f).picture.grid.d).filter((c) => matOf(c) === 'shade').length;
    expect(hole(0)).toBe(0);
    expect(hole(2)).toBeGreaterThan(hole(1));
    expect(hole(3)).toBeGreaterThan(40);
  });

  it('gives the hero his own small light: the rules’ 36 across, its middle four above his feet', () => {
    expect(HERO_LIGHT2.pool).toBe(36);
    expect(HERO_LIGHT2.y + HERO_LIGHT2.drop).toBe(-4);
    expect(HERO_LIGHT2.x).toBe(0);
  });
});
