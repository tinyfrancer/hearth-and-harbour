import { afterEach, describe, expect, it, vi } from 'vitest';
import { PORTRAIT_IDS, PORTRAIT_SIZE } from '../../src/art/portraits';
import { MELEE_REACH, RANGED_REACH } from '../../src/scene/battle';
import { C_SCALE, DUNGEON, FIRST_SCALE, far } from '../../src/scene/dungeonMetrics';
import {
  FACE_FRAME,
  TITLE_SLOTS,
  framedFace,
  titleBox,
  titleSlot,
  type CssBox,
} from '../../src/scene/dungeonView';
import { FOE_KINDS, foeKind, kindAtScale } from '../../src/scene/foes';
import { dungeonScale } from '../../src/scene/scale';
import { TILE } from '../../src/scene/tileMap';

// Two faults in the fight's screen, and the dungeons made ready for the C
// scale without moving them to it.

afterEach(() => vi.unstubAllGlobals());

describe('the target’s face', () => {
  for (const dpr of [1, 2, 2.625, 3, 3.5])
    it(`shows the whole portrait inside its frame at ${dpr}x, at whole device pixels`, () => {
      vi.stubGlobal('devicePixelRatio', dpr);
      for (const id of ['deckhand', 'powder_monkey', 'giant_crab', 'ships_parrot', 'brinebeard']) {
        expect(PORTRAIT_IDS).toContain(id);
        const face = framedFace(id)!;
        const w = parseFloat(face.style.width);
        const h = parseFloat(face.style.height);
        // Every one of its 48 x 48 art pixels is on the canvas, none cut by the frame.
        expect(w, id).toBeLessThanOrEqual(FACE_FRAME + 1e-9);
        expect(h, id).toBeLessThanOrEqual(FACE_FRAME + 1e-9);
        const devicePerArt = Math.max(1, Math.floor((FACE_FRAME * dpr) / PORTRAIT_SIZE + 1e-9));
        expect(Number.isInteger(devicePerArt)).toBe(true);
        expect(face.width, id).toBeGreaterThanOrEqual(PORTRAIT_SIZE * devicePerArt);
        // As big as fits: one more device pixel an art pixel would not.
        expect((PORTRAIT_SIZE * (devicePerArt + 1)) / dpr).toBeGreaterThan(FACE_FRAME);
      }
      expect(framedFace('nobody')).toBeNull();
    });
});

describe('the room’s name', () => {
  const view = { width: 844, height: 390 };
  const banner = { width: 240, height: 36 };
  const crosses = (a: CssBox, b: CssBox) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  it('sits under the health bars, or above the ability bar', () => {
    expect(titleBox('top', view, banner)).toEqual({ x: 302, y: TITLE_SLOTS.top, w: 240, h: 36 });
    expect(titleBox('bottom', view, banner).y).toBe(390 - TITLE_SLOTS.bottom - 36);
  });

  it('never covers anyone in the fight, wherever they stand: it moves, or waits unseen', () => {
    // Every arrangement of a boss and two others over a grid of places on screen.
    const places: CssBox[] = [];
    for (let y = -20; y < view.height; y += 23)
      for (let x = -20; x < view.width; x += 37) places.push({ x, y, w: 54, h: 84 });
    let moved = 0;
    let hidden = 0;
    for (let i = 0; i < places.length; i += 3)
      for (let j = 0; j < places.length; j += 11) {
        const fight = [places[i]!, places[j]!, places[(i + j) % places.length]!];
        for (const from of ['top', 'bottom'] as const) {
          const slot = titleSlot(fight, view, banner, from);
          if (slot === null) {
            hidden++;
            continue;
          }
          if (slot !== from) moved++;
          for (const c of fight) expect(crosses(c, titleBox(slot, view, banner))).toBe(false);
        }
      }
    expect(moved).toBeGreaterThan(0);
    expect(hidden).toBeGreaterThan(0);
  });

  it('stays where it is while that is clear', () => {
    expect(titleSlot([{ x: 0, y: 0, w: 10, h: 10 }], view, banner, 'bottom')).toBe('bottom');
    expect(titleSlot([], view, banner)).toBe('top');
  });
});

describe('the dungeons’ scale, as data', () => {
  it('is still the first scale: 270 across, 16-pixel tiles, every distance as it was', () => {
    expect(DUNGEON).toBe(FIRST_SCALE);
    expect(DUNGEON.scene.width).toBe(270);
    expect(DUNGEON.tile).toBe(TILE);
    expect(far(30)).toBe(30);
    expect([MELEE_REACH, RANGED_REACH]).toEqual([30, 120]);
    expect(foeKind('deckhand').speed).toBe(44);
    expect(foeKind('brinebeard').heavy!.radius).toBe(58);
    // On a phone on its side at 3x: as before.
    expect(dungeonScale({ width: 2532, height: 1170 }, DUNGEON.scene.width)).toBe(4);
  });

  it('has the C scale ready: 360 across, 24-pixel tiles, distances half as long again', () => {
    expect(C_SCALE).toMatchObject({ tile: 24, distance: 1.5 });
    expect(C_SCALE.scene.width).toBe(360);
    expect(dungeonScale({ width: 2532, height: 1170 }, C_SCALE.scene.width)).toBe(3);
    const crab = kindAtScale(FOE_KINDS.giant_crab!, C_SCALE.distance);
    expect(crab.speed).toBe(33);
    expect(crab.heavy!.radius).toBe(69);
    const boss = kindAtScale(FOE_KINDS.brinebeard!, C_SCALE.distance);
    expect(boss.boss!.volleys.half).toBe(15);
    expect(boss.boss!.volleys.gap).toBe(72);
    expect(boss.heavy!.warnMs).toBe(FOE_KINDS.brinebeard!.heavy!.warnMs);
    const parrot = kindAtScale(FOE_KINDS.ships_parrot!, C_SCALE.distance);
    expect(parrot.rally!.radius).toBe(180);
    expect(parrot.flies!.perchMs).toBe(FOE_KINDS.ships_parrot!.flies!.perchMs);
    // At the first scale a row is itself.
    expect(kindAtScale(FOE_KINDS.deckhand!, 1)).toBe(FOE_KINDS.deckhand);
  });
});
