/*
 * In a room the camera travels (the grotto's), a tap under a control is
 * never needed (wave 18): from anywhere the hero stands, some cell nearer to
 * any place in the room is in view and clear of every control, so walking
 * toward it brings it out; and the foe he is fighting is kept in view, the
 * camera turning to frame it (`framedFocus`), so he never fights something
 * hidden under a control.
 */
import { describe, expect, it } from 'vitest';
import type { Size } from '../../src/scene/camera';
import { dungeonById } from '../../src/scene/dungeons';
import { DUNGEON } from '../../src/scene/dungeonMetrics';
import { FOCUS_RISE_DUNGEON, HERO_BOX, hudNeedsOf } from '../../src/scene/dungeonView';
import {
  FRAME_MARGIN,
  framedFocus,
  hudBands,
  hudBoxes,
  hudLayout,
  type Edges,
  type HudBox,
} from '../../src/scene/hud';
import { pixelFit, roomScale } from '../../src/scene/scale';
import { stageCamera } from '../../src/scene/stage';
import { isSolid } from '../../src/scene/tileMap';

const T = DUNGEON.tile;
const DPR = 3;
const NONE: Edges = { top: 0, right: 0, bottom: 0, left: 0 };
const SCREENS: readonly { screen: Size; safe: Edges }[] = [
  { screen: { width: 844, height: 390 }, safe: NONE },
  { screen: { width: 844, height: 390 }, safe: { top: 0, right: 47, bottom: 21, left: 47 } },
  { screen: { width: 667, height: 375 }, safe: NONE },
];
const crosses = (a: HudBox, b: HudBox): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const grotto = dungeonById('brinebeards_grotto')!;
const rooms = Object.values(grotto.rooms);
const widest = Math.max(...rooms.map((r) => r.map.cols * T));

/** The camera, the controls and the art pixel's size for a phone: as the run's screen has them. */
function phone(screen: Size, safe: Edges) {
  const device = { width: screen.width * DPR, height: screen.height * DPR };
  const layout = hudLayout(screen, safe, hudNeedsOf(grotto));
  const blocked = hudBoxes(layout);
  const scale = roomScale(device, { width: widest, height: 0 }, DUNGEON.scene.width);
  const pf = pixelFit(screen, DPR, () => scale);
  const per = pf.css.width / pf.art.width;
  const bands = hudBands(screen, layout, safe);
  const inset = {
    top: Math.round(bands.top / per),
    right: Math.round(bands.right / per),
    bottom: Math.round(bands.bottom / per),
    left: Math.round(bands.left / per),
  };
  const inner = {
    width: pf.art.width - inset.left - inset.right,
    height: pf.art.height - inset.top - inset.bottom,
  };
  /** Whether an art box is on screen and clear of every control, by a camera. */
  const clear = (box: HudBox, cam: { x: number; y: number }): boolean => {
    const b = {
      x: (box.x - cam.x) * per,
      y: (box.y - cam.y) * per,
      w: box.w * per,
      h: box.h * per,
    };
    if (b.x < 0 || b.y < 0 || b.x + b.w > pf.css.width || b.y + b.h > pf.css.height) return false;
    return !blocked.some((c) => crosses(b, c));
  };
  return { pf, inset, inner, clear };
}

describe('framing the foe being fought', () => {
  it('moves the camera only as far as it must, and never loses the hero', () => {
    const inner = { width: 200, height: 100 };
    const hero = { x: 90, y: 30, w: 20, h: 40 };
    const focus = { x: 100, y: 50 };
    // In view already: no move.
    expect(framedFocus(focus, hero, { x: 120, y: 40, w: 20, h: 20 }, inner)).toEqual(focus);
    // Below the inner box: down just enough.
    const low = { x: 100, y: 90, w: 20, h: 20 };
    const f = framedFocus(focus, hero, low, inner);
    expect(f.x).toBe(focus.x);
    expect(f.y).toBe(low.y + low.h - (inner.height / 2 - FRAME_MARGIN));
    // Too far for both: the hero stays in, at the edge nearest the foe.
    const far = framedFocus(focus, hero, { x: 600, y: 40, w: 20, h: 20 }, inner);
    expect(far.x).toBe(hero.x + (inner.width / 2 - FRAME_MARGIN));
  });
});

describe('a room the camera travels', () => {
  for (const { screen, safe } of SCREENS)
    it(`never needs a tap under a control, at ${screen.width} x ${screen.height} (${safe.left})`, () => {
      const { pf, inset, inner, clear } = phone(screen, safe);
      for (const room of rooms) {
        const world = { width: room.map.cols * T, height: room.map.rows * T };
        const cells: { col: number; row: number }[] = [];
        for (let row = 0; row < room.map.rows; row++)
          for (let col = 0; col < room.map.cols; col++)
            if (!isSolid(room.map, { col, row })) cells.push({ col, row });
        const boxOf = (c: { col: number; row: number }): HudBox => ({
          x: c.col * T,
          y: c.row * T,
          w: T,
          h: T,
        });
        const d = (a: { col: number; row: number }, b: { col: number; row: number }) =>
          Math.hypot(a.col - b.col, a.row - b.row);
        for (const [i, h] of cells.entries()) {
          if (i % 3) continue;
          const feet = { x: h.col * T + T / 2, y: h.row * T + T / 2 };
          const cam = stageCamera(
            pf.art,
            world,
            { x: feet.x, y: feet.y - FOCUS_RISE_DUNGEON },
            inset,
          );
          const seen = cells.filter((c) => clear(boxOf(c), cam));
          // From here, every place in the room is in view, or some cell nearer to it is.
          for (const c of cells)
            expect(
              seen.some((v) => v === c || d(v, c) < d(h, c)),
              `${room.id}: from ${h.col},${h.row} toward ${c.col},${c.row}`,
            ).toBe(true);
          // A foe in reach of him anywhere about him is framed in view, clear of every control.
          // (Without the framing, a bow's foe off below or to the side can sit under one.)
          // In reach of a blade, and of a bow (`RANGED_REACH`, which can pick a foe well off).
          for (const [dx, dy] of [
            [0, 36],
            [0, -36],
            [36, 0],
            [-36, 0],
            [26, 26],
            [-26, 26],
            [0, 140],
            [0, -120],
            [170, 0],
            [-170, 0],
            [120, 100],
            [-120, 100],
          ] as const) {
            const at = { x: feet.x + dx, y: feet.y + dy };
            const col = Math.floor(at.x / T);
            const row = Math.floor(at.y / T);
            if (col < 0 || row < 0 || col >= room.map.cols || row >= room.map.rows) continue;
            if (isSolid(room.map, { col, row })) continue;
            const foe = { x: at.x - 12, y: at.y - 8, w: 24, h: 10 };
            const hero = {
              x: feet.x - HERO_BOX.w / 2,
              y: feet.y - HERO_BOX.h,
              w: HERO_BOX.w,
              h: HERO_BOX.h,
            };
            const focus = framedFocus(
              { x: feet.x, y: feet.y - FOCUS_RISE_DUNGEON },
              hero,
              foe,
              inner,
            );
            const framed = stageCamera(pf.art, world, focus, inset);
            expect(
              clear(foe, framed),
              `${room.id}: foe at ${col},${row} from ${h.col},${h.row}`,
            ).toBe(true);
          }
        }
      }
    }, 120_000);
});
