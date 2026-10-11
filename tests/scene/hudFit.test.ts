/*
 * Nothing anyone walks on, no door and nobody waiting to be fought is ever
 * under a dungeon's controls or under a notch, on the phones a dungeon is
 * played on, held sideways, with and without a notch's safe area: in every
 * room of every dungeon. A room seen whole (the cave's) is checked as it
 * stands; a room the camera travels (the grotto's) with the hero standing on
 * each cell of it in turn, as the camera then has it.
 */
import { describe, expect, it } from 'vitest';
import type { Size } from '../../src/scene/camera';
import { DUNGEON_IDS, dungeonById } from '../../src/scene/dungeons';
import { DUNGEON } from '../../src/scene/dungeonMetrics';
import { FOCUS_RISE_DUNGEON, HERO_BOX, ONE_SCREEN, hudNeedsOf } from '../../src/scene/dungeonView';
import {
  hudBands,
  hudBoxes,
  hudLayout,
  mustSee,
  notchBoxes,
  roomFit,
  type Edges,
  type HudBox,
} from '../../src/scene/hud';
import { pixelFit, roomScale } from '../../src/scene/scale';
import { stageCamera } from '../../src/scene/stage';
import { isSolid } from '../../src/scene/tileMap';

const T = DUNGEON.tile;
const DPR = 3;

/** The phones, sideways, in CSS pixels, each with the safe areas it can have. */
const NONE: Edges = { top: 0, right: 0, bottom: 0, left: 0 };
const SCREENS: readonly { readonly screen: Size; readonly safe: readonly Edges[] }[] = [
  // An iPhone 12 to 14, with its notch and home bar held sideways (both sides, as iOS reports them).
  {
    screen: { width: 844, height: 390 },
    safe: [NONE, { top: 0, right: 47, bottom: 21, left: 47 }],
  },
  // A Pro Max, with its island.
  {
    screen: { width: 932, height: 430 },
    safe: [NONE, { top: 0, right: 59, bottom: 21, left: 59 }],
  },
  {
    screen: { width: 852, height: 393 },
    safe: [NONE, { top: 0, right: 59, bottom: 21, left: 59 }],
  },
  // An SE: no notch.
  { screen: { width: 667, height: 375 }, safe: [NONE] },
];

const crosses = (a: HudBox, b: HudBox): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("a dungeon's controls keep clear of the room", () => {
  for (const id of DUNGEON_IDS) {
    const dungeon = dungeonById(id)!;
    const rooms = Object.values(dungeon.rooms);
    const widest = Math.max(...rooms.map((r) => r.map.cols * T));
    const held = widest <= ONE_SCREEN;
    const needs = hudNeedsOf(dungeon);
    for (const { screen, safe: safes } of SCREENS)
      for (const safe of safes)
        it(`${id} at ${screen.width} x ${screen.height}, safe area ${safe.left}/${safe.bottom}`, () => {
          const device = { width: screen.width * DPR, height: screen.height * DPR };
          const layout = hudLayout(screen, safe, needs);
          const blocked = [...hudBoxes(layout), ...notchBoxes(screen, safe)];
          // No control under another, or off the screen.
          const boxes = hudBoxes(layout);
          for (const [i, a] of boxes.entries()) {
            expect(a.x).toBeGreaterThanOrEqual(safe.left);
            expect(a.x + a.w).toBeLessThanOrEqual(screen.width - safe.right);
            expect(a.y + a.h).toBeLessThanOrEqual(screen.height - safe.bottom);
            for (const b of boxes.slice(i + 1)) {
              // A lesson and the challenges share their place: only one shows at a time.
              if (
                (a === layout.lesson && b === layout.tracker) ||
                (b === layout.lesson && a === layout.tracker)
              )
                continue;
              expect(crosses(a, b), `${JSON.stringify(a)} ${JSON.stringify(b)}`).toBe(false);
            }
          }
          if (held) {
            const fit = roomFit(device, DPR, rooms, blocked);
            expect(fit.clear).toBe(true);
            // Never smaller than the dungeons' own scale for the screen.
            expect(fit.scale).toBeGreaterThanOrEqual(
              Math.floor(Math.min(device.width, device.height) / DUNGEON.scene.width),
            );
            const pf = pixelFit(screen, DPR, () => fit.scale);
            const per = pf.css.width / pf.art.width;
            for (const room of rooms) {
              const world = { width: room.map.cols * T, height: room.map.rows * T };
              const cam = stageCamera(
                pf.art,
                world,
                { x: 0, y: 0 },
                { top: 0, right: 0, bottom: 0, left: 0 },
                {
                  hold: true,
                  offset: fit.offset,
                },
              );
              for (const c of mustSee(room)) {
                const box = {
                  x: (c.x - cam.x) * per,
                  y: (c.y - cam.y) * per,
                  w: c.w * per,
                  h: c.h * per,
                };
                for (const b of blocked)
                  expect(
                    crosses(box, b),
                    `${room.id} ${c.x / T},${c.y / T} under ${JSON.stringify(b)}`,
                  ).toBe(false);
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.y + box.h).toBeLessThanOrEqual(pf.css.height);
              }
            }
          } else {
            // The camera travels: wherever he stands, he and the ground under him are clear.
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
            for (const room of rooms) {
              const world = { width: room.map.cols * T, height: room.map.rows * T };
              for (let row = 0; row < room.map.rows; row++)
                for (let col = 0; col < room.map.cols; col++) {
                  if (isSolid(room.map, { col, row })) continue;
                  const feet = { x: col * T + T / 2, y: row * T + T / 2 };
                  const cam = stageCamera(
                    pf.art,
                    world,
                    { x: feet.x, y: feet.y - FOCUS_RISE_DUNGEON },
                    inset,
                  );
                  const cell = {
                    x: (col * T - cam.x) * per,
                    y: (row * T - cam.y) * per,
                    w: T * per,
                    h: T * per,
                  };
                  const hero = {
                    x: (feet.x - HERO_BOX.w / 2 - cam.x) * per,
                    y: (feet.y - HERO_BOX.h - cam.y) * per,
                    w: HERO_BOX.w * per,
                    h: HERO_BOX.h * per,
                  };
                  for (const b of blocked) {
                    expect(crosses(cell, b), `${room.id} ${col},${row}`).toBe(false);
                    // His feet and body; his head may pass under the top panels' lower edge.
                    expect(crosses({ ...hero, y: hero.y + hero.h / 2, h: hero.h / 2 }, b)).toBe(
                      false,
                    );
                  }
                }
            }
          }
        });
  }
});
