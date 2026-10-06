import { afterEach, describe, expect, it, vi } from 'vitest';
import { FOE2_SIZES } from '../../src/art/dungeonArt2';
import { PORTRAIT2_SAFE, PORTRAIT2_SIZE, portraitScales2 } from '../../src/art/portraits2';
import { MELEE_REACH, RANGED_REACH, STEP_BACK, SWEEP_REACH } from '../../src/scene/battle';
import { GROTTO_CAST } from '../../src/scene/cast';
import { C_SCALE, DUNGEON, FIRST_SCALE, far } from '../../src/scene/dungeonMetrics';
import {
  FACE_FRAME,
  STRIP_HEIGHT,
  TITLE_SLOTS,
  framedFace,
  titleBox,
  titleSlot,
  type CssBox,
} from '../../src/scene/dungeonView';
import { FIRST_KINDS, FOE_KINDS, foeKind, kindAtScale } from '../../src/scene/foes';
import { dungeonScale, overlayFit, pixelFit } from '../../src/scene/scale';

// The fight's screen at the C scale: faces whole in their frames, the room's
// name always read and never over anyone, the scale as data, and the
// overlay that keeps words sharp.

afterEach(() => vi.unstubAllGlobals());

const GROTTO_IDS = Object.keys(GROTTO_CAST);

describe('the target’s face', () => {
  // Phones' ratios. (At 1x, a desktop, the art lane's smallest face is 72 CSS pixels, more than
  // the frame: noted for the art lane in docs/status/lane-c.md.)
  for (const dpr of [2, 2.625, 3, 3.5])
    it(`shows the whole portrait inside its frame at ${dpr}x, safe box and all`, () => {
      vi.stubGlobal('devicePixelRatio', dpr);
      for (const id of GROTTO_IDS) {
        const face = framedFace(id)!;
        expect(face, id).not.toBeNull();
        // The canvas the 48-pixel frame shows (`portraits2.css`): the whole 72-pixel face, never cut.
        const mini = face.querySelector<HTMLCanvasElement>('.portrait2-mini')!;
        expect(parseFloat(mini.style.width), id).toBeLessThanOrEqual(FACE_FRAME + 1e-9);
        expect(parseFloat(mini.style.height), id).toBeLessThanOrEqual(FACE_FRAME + 1e-9);
        const per = portraitScales2(dpr).mini;
        expect(mini.width, id).toBeGreaterThanOrEqual(PORTRAIT2_SIZE * per);
        // Everything that names the face lies inside the picture, so inside the frame.
        const safe = PORTRAIT2_SAFE[id]!;
        expect(safe.x + safe.w, id).toBeLessThanOrEqual(PORTRAIT2_SIZE);
        expect(safe.y + safe.h, id).toBeLessThanOrEqual(PORTRAIT2_SIZE);
      }
      expect(framedFace('nobody')).toBeNull();
    });
});

describe('the room’s name', () => {
  const view = { width: 844, height: 390 };
  const banner = { width: 240, height: 36 };
  const crosses = (a: CssBox, b: CssBox) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  it('sits under the health bars, above the ability bar, or in the HUD’s strip', () => {
    expect(titleBox('top', view, banner)).toEqual({ x: 302, y: TITLE_SLOTS.top, w: 240, h: 36 });
    expect(titleBox('bottom', view, banner).y).toBe(390 - TITLE_SLOTS.bottom - 36);
    const strip = titleBox('strip', view, banner);
    // Inside the strip the HUD's top panels already take.
    expect(strip.y).toBeGreaterThanOrEqual(0);
    expect(strip.y + strip.h).toBeLessThanOrEqual(TITLE_SLOTS.strip + STRIP_HEIGHT);
  });

  it('is always shown, and over the room never covers anyone in the fight, wherever they stand', () => {
    // Every arrangement of a boss and two others over a grid of places on screen.
    const places: CssBox[] = [];
    for (let y = -20; y < view.height; y += 23)
      for (let x = -20; x < view.width; x += 37) places.push({ x, y, w: 54, h: 92 });
    const used = { top: 0, bottom: 0, strip: 0 };
    for (let i = 0; i < places.length; i += 3)
      for (let j = 0; j < places.length; j += 11) {
        const fight = [places[i]!, places[j]!, places[(i + j) % places.length]!];
        for (const from of ['top', 'bottom'] as const) {
          const slot = titleSlot(fight, view, banner, from);
          // Never nowhere: a player who fights at every door still reads every room's name.
          expect(slot).not.toBeNull();
          used[slot]++;
          if (slot === 'strip') {
            // Only when both places over the room are taken.
            for (const s of ['top', 'bottom'] as const)
              expect(fight.some((c) => crosses(c, titleBox(s, view, banner)))).toBe(true);
            continue;
          }
          for (const c of fight) expect(crosses(c, titleBox(slot, view, banner))).toBe(false);
        }
      }
    expect(used.top).toBeGreaterThan(0);
    expect(used.bottom).toBeGreaterThan(0);
    expect(used.strip).toBeGreaterThan(0);
  });

  it('stays where it is while that is clear, and once in the strip stays there for its moment', () => {
    expect(titleSlot([{ x: 0, y: 0, w: 10, h: 10 }], view, banner, 'bottom')).toBe('bottom');
    expect(titleSlot([], view, banner)).toBe('top');
    expect(titleSlot([], view, banner, 'strip')).toBe('strip');
  });
});

describe('the dungeons’ scale, as data', () => {
  it('is the C scale: 360 across, 24-pixel tiles, every distance half as long again', () => {
    expect(DUNGEON).toBe(C_SCALE);
    expect(DUNGEON.scene.width).toBe(360);
    expect(DUNGEON.tile).toBe(24);
    expect(FIRST_SCALE.tile).toBe(16);
    expect(far(30)).toBe(45);
    expect([MELEE_REACH, RANGED_REACH, SWEEP_REACH, STEP_BACK]).toEqual([45, 180, 60, 60]);
    // On a phone on its side at 3x: three device pixels an art pixel, as in town.
    expect(dungeonScale({ width: 2532, height: 1170 }, DUNGEON.scene.width)).toBe(3);
  });

  it('scales every foe’s distances and paces by 1.5, and leaves every time as it was', () => {
    for (const [id, first] of Object.entries(FIRST_KINDS)) {
      const now = FOE_KINDS[id]!;
      expect(now.speed, id).toBe(first.speed * 1.5);
      expect(now.notice, id).toBe(first.notice * 1.5);
      expect(now.reach, id).toBe(first.reach * 1.5);
      expect(now.keep, id).toBe(first.keep * 1.5);
      if (first.shy !== undefined) expect(now.shy, id).toBe(first.shy * 1.5);
      if (first.heavy) {
        expect(now.heavy!.radius, id).toBe(first.heavy.radius * 1.5);
        expect(now.heavy!.range, id).toBe(first.heavy.range * 1.5);
        expect(now.heavy!.warnMs, id).toBe(first.heavy.warnMs);
        expect(now.heavy!.everyMs, id).toBe(first.heavy.everyMs);
        expect(now.heavy!.firstMs, id).toBe(first.heavy.firstMs);
      }
      if (first.flies) {
        expect(now.flies!.speed, id).toBe(first.flies.speed * 1.5);
        expect(now.flies!.perchMs, id).toBe(first.flies.perchMs);
        expect(now.flies!.downMs, id).toBe(first.flies.downMs);
      }
      if (first.rally) expect(now.rally!.radius, id).toBe(first.rally.radius * 1.5);
      if (first.boss) {
        expect(now.boss!.volleys.half, id).toBe(first.boss.volleys.half * 1.5);
        expect(now.boss!.volleys.gap, id).toBe(first.boss.volleys.gap * 1.5);
        expect(now.boss!.volleys.phases, id).toEqual(first.boss.volleys.phases);
        expect(now.boss!.volleys.firstMs, id).toBe(first.boss.volleys.firstMs);
      }
    }
    expect(foeKind('giant_crab').speed).toBe(33);
    expect(foeKind('brinebeard').heavy!.radius).toBe(87);
    // At the first scale a row is itself.
    expect(kindAtScale(FIRST_KINDS.deckhand!, 1)).toBe(FIRST_KINDS.deckhand);
  });

  it('takes each foe’s tap box from the art lane’s size table, never from a sprite', () => {
    for (const id of GROTTO_IDS) expect(foeKind(id).box, id).toEqual(FOE2_SIZES[id]!.box);
    for (const id of ['dock_rat', 'sand_crab', 'smuggler'])
      expect(foeKind(id).box, id).toEqual(FOE2_SIZES[id]!.box);
  });
});

describe('the overlay that keeps words sharp', () => {
  it('is a device pixel a pixel over the room’s canvas of one pixel an art pixel', () => {
    for (const [width, height, dpr] of [
      [844, 390, 3],
      [915, 412, 2.625],
      [667, 375, 2],
    ] as const) {
      const fit = pixelFit({ width, height }, dpr, (d) => dungeonScale(d, DUNGEON.scene.width));
      const top = overlayFit(fit.css, dpr, fit.device, fit.scale);
      // The room's canvas holds one pixel an art pixel; the overlay every device pixel it covers.
      expect(top.width).toBe(fit.device.width);
      expect(top.height).toBe(fit.device.height);
      expect(fit.art.width).toBe(fit.device.width / fit.scale);
      // An art pixel on the overlay is exactly an art pixel of the room: no drift across the screen.
      expect(top.perArt).toBe(fit.scale);
      // A CSS pixel in art pixels, for sizes given in CSS pixels.
      expect(top.k * top.perArt).toBeCloseTo(dpr, 9);
    }
  });
});
