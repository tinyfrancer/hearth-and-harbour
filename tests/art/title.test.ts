import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { TITLE_FRAME_MS, titleScene } from '../../src/art/title';
import { TitleScene, RIPPLE_SHIFT, mirrorColour } from '../../src/art/title/scene';
import {
  TITLE_MIN_H,
  TITLE_MIN_W,
  TOWN_HALF,
  TOWN_RISE,
  REFLECTION_DEPTH,
} from '../../src/art/title/layout';
import { bake, logotype, unbake } from '../../src/art/title/logo';
import { drawLogotype } from '../../src/art/title/logoDraw';
import { LOGO_DATA } from '../../src/art/title/logoData';
import { rampId } from '../../src/art/title/ramps';
import { SHOULDER } from '../../src/art/title/land';
import { titleGallery } from '../../src/art/title/gallery';

const SLOW = { timeout: 120000 };

/** The phones the title is composed for (CSS pixels, portrait, 3x), then a 2.625x Android, a phone on its side and a tablet. */
const PHONES: readonly [number, number, number][] = [
  [360, 640, 3],
  [390, 844, 3],
  [430, 932, 3],
];
const OTHERS: readonly [number, number, number][] = [
  [412, 915, 2.625],
  [375, 667, 2],
  [844, 390, 3],
  [768, 1024, 2],
];

const scenes = new Map<string, TitleScene>();
function sceneFor(w: number, h: number, dpr: number): TitleScene {
  const key = `${w}x${h}@${dpr}`;
  let s = scenes.get(key);
  if (!s) scenes.set(key, (s = new TitleScene(w, h, dpr)));
  return s;
}

describe('the title logotype', () => {
  it('is the baked output of its drawing (UPDATE_LOGO=1 rewrites the bake)', SLOW, () => {
    const drawn = drawLogotype();
    if (process.env.UPDATE_LOGO) {
      const b = bake(drawn);
      writeFileSync(
        'src/art/title/logoData.ts',
        `// The logotype's cells, baked from drawLogotype() (logoDraw.ts) by\n// UPDATE_LOGO=1 npx vitest run tests/art/title.test.ts. Do not edit by hand.\nimport type { Baked } from './logo';\n\nexport const LOGO_DATA: Baked = ${JSON.stringify(b, null, 2)};\n`,
      );
      return;
    }
    const baked = unbake(LOGO_DATA);
    expect([baked.w, baked.h]).toEqual([drawn.w, drawn.h]);
    expect(Array.from(baked.d)).toEqual(Array.from(drawn.d));
  });

  it('has stems of one width: every letter is drawn on whole pixels', () => {
    // Across the middle of HEARTH's first H, its two stems are each 7 pixels of gilt.
    const g = logotype();
    const gilt = rampId('gilt');
    const row = 14; // a third of the way down the first line, above the bars
    const runs: number[] = [];
    let n = 0;
    for (let x = 0; x < g.w; x++) {
      const c = g.d[row * g.w + x] as number;
      const isGilt = c !== 0 && c >> 3 === gilt && (c & 7) < 6;
      if (isGilt) n++;
      else if (n) {
        runs.push(n);
        n = 0;
      }
    }
    // The stems crossed (H, E, R, T, H) are 7 wide; no stem is 6 or 8, as the study's were by position.
    expect(runs.filter((r) => r === 7).length).toBeGreaterThanOrEqual(6);
    expect(runs.filter((r) => r === 6 || r === 8)).toEqual([]);
  });
});

describe('the title scene', () => {
  it('suggests a redraw interval that does not need 60 frames a second', () => {
    expect(TITLE_FRAME_MS).toBeGreaterThanOrEqual(100);
    expect(TITLE_FRAME_MS).toBeLessThanOrEqual(125);
  });

  it.each([...PHONES, ...OTHERS])(
    'composes at %i x %i CSS pixels (dpr %f): whole device pixels, the logotype inside and above the menu',
    (w, h, dpr) => {
      const s = sceneFor(w, h, dpr);
      const L = s.layout;
      // One art pixel is a whole number of device pixels, and the canvas covers the screen.
      expect(Number.isInteger(L.scale)).toBe(true);
      expect(L.w * L.scale).toBeGreaterThanOrEqual(w * dpr - 1e-6);
      expect(L.h * L.scale).toBeGreaterThanOrEqual(h * dpr - 1e-6);
      expect((L.w - 1) * L.scale).toBeLessThan(w * dpr + L.scale * 7);
      expect(L.w).toBeGreaterThanOrEqual(TITLE_MIN_W);
      expect(L.h).toBeGreaterThanOrEqual(TITLE_MIN_H);
      // The phones are drawn at one art pixel per CSS pixel (3 device pixels).
      if (dpr === 3 && h > w) expect(L.scale).toBe(3);
      const logo = s.logo;
      expect(logo.x).toBeGreaterThanOrEqual(4);
      expect(logo.y).toBeGreaterThanOrEqual(24);
      expect(logo.x + logo.w).toBeLessThanOrEqual(L.w - 4);
      // Above the town's chimneys, and above where the menu may go.
      expect(logo.y + logo.h).toBeLessThanOrEqual(L.wl - TOWN_RISE);
      expect(logo.y + logo.h).toBeLessThan(L.safe.y);
      // The safe box is inside the picture, below the town's reflection, and wide enough for a button.
      expect(L.safe.x).toBeGreaterThanOrEqual(0);
      expect(L.safe.x + L.safe.w).toBeLessThanOrEqual(L.w);
      expect(L.safe.y + L.safe.h).toBe(L.h);
      // Below the town's reflection, or (on a screen much wider than tall) beside the town.
      const below = L.safe.y > L.wl + REFLECTION_DEPTH / 2;
      const beside = L.safe.x >= L.cx + TOWN_HALF && L.safe.y > L.wl;
      expect(below || beside).toBe(true);
      if (h > w) expect(below).toBe(true);
      // The water is calm under the menu.
      expect(L.calm).toBeLessThanOrEqual(below ? L.safe.y : L.h);
      expect(L.safe.w * L.cssPerArt).toBeGreaterThanOrEqual(260);
      expect(L.safe.h * L.cssPerArt).toBeGreaterThanOrEqual(96);
    },
  );

  it.each(PHONES)(
    'keeps the logotype on the dark of the sky at %i x %i, so it reads',
    (w, h, dpr) => {
      const s = sceneFor(w, h, dpr);
      const { x, y, w: lw, h: lh } = s.logo;
      // Round the logotype's box, a few pixels out, there is only the zenith's dark sky (and stars).
      const hi = rampId('skyHi');
      let sky = 0;
      let all = 0;
      for (let i = x - 6; i < x + lw + 6; i++)
        for (const j of [y - 4, y + lh + 3]) {
          all++;
          if (s.cellAt(i, j) >> 3 === hi) sky++;
        }
      expect(sky / all).toBeGreaterThan(0.95);
    },
  );

  it.each(PHONES)(
    'mirrors the town in the water at %i x %i, column by column, within the ripples',
    SLOW,
    (w, h, dpr) => {
      const s = sceneFor(w, h, dpr);
      const { wl, w: W, h: H } = s.layout;
      const px = s.frame(0);
      const wh = H - wl;
      let match = 0;
      let all = 0;
      for (let d = 3; d < Math.min(wh, REFLECTION_DEPTH + 60); d++) {
        let rowMatch = 0;
        let rowAll = 0;
        for (let x = RIPPLE_SHIFT; x < W - RIPPLE_SHIFT; x++) {
          if (s.isNear(x, wl + d)) continue;
          const src = s.cellAt(x, wl - 1 - d);
          // Lights are drawn out into streaks and halos pool on the water: judged elsewhere.
          if ([rampId('glass'), rampId('lamp'), rampId('fire')].includes(src >> 3)) continue;
          rowAll++;
          const got = px[(wl + d) * W + x];
          for (let sh = -RIPPLE_SHIFT; sh <= RIPPLE_SHIFT; sh++)
            if (got === mirrorColour(s.cellAt(x - sh, wl - 1 - d), d, wh)) {
              rowMatch++;
              break;
            }
        }
        // A ripple band breaks some of a row; never most of it.
        if (rowAll > 40) expect(rowMatch / rowAll).toBeGreaterThan(0.55);
        match += rowMatch;
        all += rowAll;
      }
      expect(match / all).toBeGreaterThan(0.75);
    },
  );

  it('mirrors lit windows below themselves as light', SLOW, () => {
    const s = sceneFor(390, 844, 3);
    const { wl, w: W } = s.layout;
    const px = s.frame(0);
    const glass = rampId('glass');
    let lit = 0;
    let found = 0;
    for (let y = wl - REFLECTION_DEPTH; y < wl; y++)
      for (let x = 4; x < W - 4; x++) {
        if (s.cellAt(x, y) >> 3 !== glass || s.isNear(x, 2 * wl - 1 - y)) continue;
        lit++;
        // Somewhere within the ripple's reach, at the mirrored row or just below, is something bright.
        let best = 0;
        for (let dy = 0; dy <= 2; dy++)
          for (let sh = -RIPPLE_SHIFT; sh <= RIPPLE_SHIFT; sh++) {
            const p = px[(2 * wl - 1 - y + dy) * W + x + sh] as number;
            best = Math.max(best, (p & 255) + ((p >>> 8) & 255));
          }
        if (best > 330) found++;
      }
    expect(lit).toBeGreaterThan(100);
    expect(found / lit).toBeGreaterThan(0.8);
  });

  it(
    'paints a frame from the time alone: drawing one frame then another equals drawing the other fresh',
    SLOW,
    () => {
      const a = new TitleScene(390, 844, 3);
      a.frame(1234);
      a.frame(98_765);
      const before = Array.from(a.frame(41_250));
      const b = new TitleScene(390, 844, 3);
      expect(Array.from(b.frame(41_250))).toEqual(before);
      // And it moves: a later frame differs, a little.
      const later = b.frame(41_250 + TITLE_FRAME_MS * 4);
      let diff = 0;
      for (let i = 0; i < later.length; i++) if (later[i] !== before[i]) diff++;
      expect(diff).toBeGreaterThan(200);
      expect(diff / later.length).toBeLessThan(0.25);
    },
  );

  it.each([...PHONES, ...OTHERS])(
    'stands every building on land at %i x %i (the house on a hill wider than it)',
    (w, h, dpr) => {
      const s = sceneFor(w, h, dpr);
      const placed = s.placed;
      expect(placed.map((p) => p.id).sort()).toEqual(['house', 'smithy', 'tavern']);
      for (const p of placed) {
        expect(p.x1 - p.x0).toBeGreaterThan(40);
        for (let x = p.x0; x < p.x1; x++)
          expect(s.isGround(x, p.ground), `${p.id} at ${x}`).toBe(true);
      }
      // The house's ground runs well past its walls on both sides: Cody's fault with the study.
      const house = placed.find((p) => p.id === 'house')!;
      const margin = Math.round((house.x1 - house.x0) * 0.4);
      for (const x of [house.x0 - margin, house.x1 - 1 + margin])
        expect(s.isGround(x, house.ground), `the shoulder at ${x}`).toBe(true);
      expect(SHOULDER.r - SHOULDER.l).toBeGreaterThan((house.x1 - house.x0) * 2.5);
    },
  );
});

describe('titleScene, the door', () => {
  it('gives a canvas one pixel per art pixel, sized in CSS to cover the screen, and the safe box in CSS pixels', () => {
    const t = titleScene(390, 844, 3);
    expect(t.canvas.width).toBe(390);
    expect(t.canvas.height).toBe(844);
    expect(t.canvas.style.width).toBe('390px');
    expect(t.canvas.style.height).toBe('844px');
    expect(t.canvas.classList.contains('pixel-art')).toBe(true);
    expect(t.safe.y + t.safe.h).toBe(844);
    expect(t.safe.w).toBeGreaterThanOrEqual(300);
    // Without pixel support (jsdom) drawing still works out the frame and does not throw.
    expect(() => t.draw(0)).not.toThrow();
    expect(() => t.draw(5000)).not.toThrow();
    t.dispose();
    expect(t.canvas.width).toBe(0);
    expect(() => t.draw(6000)).not.toThrow();
  });

  it('scales the safe box with the art at another ratio', () => {
    const t = titleScene(768, 1024, 2);
    // A tablet at 2x: 3 device pixels an art pixel, 1.5 CSS pixels.
    expect(t.canvas.width * 1.5).toBeCloseTo(parseFloat(t.canvas.style.width), 6);
    expect(t.safe.y + t.safe.h).toBeCloseTo(parseFloat(t.canvas.style.height), 6);
    t.dispose();
  });
});

describe('the title in the gallery', () => {
  it('draws the scene at the three phone sizes on a tap, each with its safe box', SLOW, () => {
    const { button, section } = titleGallery();
    document.body.append(section);
    expect(section.querySelectorAll('canvas').length).toBe(0);
    button.click();
    const screens = [...section.querySelectorAll<HTMLElement>('.gallery-title-screen')];
    expect(screens.map((s) => s.style.width)).toEqual(['360px', '390px', '430px']);
    for (const s of screens) {
      expect(s.querySelector('canvas')).not.toBeNull();
      expect(s.querySelector('.gallery-title-safe')).not.toBeNull();
    }
    section.remove();
  });
});
