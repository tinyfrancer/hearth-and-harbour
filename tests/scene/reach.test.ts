import { describe, expect, it } from 'vitest';
import { cameraFor } from '../../src/scene/camera';
import { pixelFit, scaleFor } from '../../src/scene/scale';
import { MIN_TAP_CSS, SCENE_BUTTONS } from '../../src/scene/stage';
import { grown, thingAt, usable, type Box, type Thing } from '../../src/scene/things';
import { centreOf, isSolid, mapSize, tileOf, type Point } from '../../src/scene/tileMap';
import { TOWN2_START_CELL, town2Scene } from '../../src/scene/town2';
import { FOCUS_RISE2, TOWN2_SCENE } from '../../src/scene/town2Place';

// Everything in town that can be tapped can be tapped: from somewhere the hero
// can walk to, the camera brings it on screen, somewhere on it a tap picks it
// (not something in front), and that somewhere is not under a button laid
// over the scene. Walked over the whole layout at the three common phone
// widths, each at 3x, with the Town tab's box as tall as those phones leave it.

const scene = town2Scene();
const world = mapSize(scene.map);
const tile = tileOf(scene.map);

/** Every tile the hero can stand on, walking from the start. */
function reachable(): Point[] {
  const seen = new Set<string>();
  const out: Point[] = [];
  const queue = [TOWN2_START_CELL];
  while (queue.length) {
    const cell = queue.pop()!;
    const key = `${cell.col},${cell.row}`;
    if (seen.has(key) || isSolid(scene.map, cell)) continue;
    seen.add(key);
    out.push(centreOf(cell, tile));
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const)
      queue.push({ col: cell.col + dc, row: cell.row + dr });
  }
  return out;
}

const standable = reachable();

const inside = (b: Box, p: Point): boolean =>
  p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;

/** The things that cannot be brought on screen and tapped on a phone this size. */
function untappable(width: number, height: number): string[] {
  const fit = pixelFit({ width, height }, 3, scaleFor(TOWN2_SCENE));
  const view = fit.art;
  const artPerCss = fit.device.width / fit.css.width / fit.scale;
  const min = MIN_TAP_CSS * artPerCss;
  const b = SCENE_BUTTONS.light;
  const button = {
    x: b.left * artPerCss,
    y: b.top * artPerCss,
    w: b.width * artPerCss,
    h: b.height * artPerCss,
  };
  const cameras = new Map<string, Point>();
  for (const at of standable) {
    const c = cameraFor({ x: at.x, y: at.y - FOCUS_RISE2 }, view, world);
    cameras.set(`${c.x},${c.y}`, c);
  }
  const shots = [...cameras.values()];
  const tappable = (thing: Thing): boolean => {
    const box = grown(thing.tap!, min);
    for (let y = Math.floor(box.y); y < box.y + box.h; y += 3)
      for (let x = Math.floor(box.x); x < box.x + box.w; x += 3) {
        const p = { x, y };
        if (thingAt(scene.things, p, min) !== thing) continue;
        for (const c of shots) {
          const onScreen = inside({ x: c.x, y: c.y, w: view.width, h: view.height }, p);
          const underButton = inside({ ...button, x: c.x + button.x, y: c.y + button.y }, p);
          if (onScreen && !underButton) return true;
        }
      }
    return false;
  };
  return scene.things.filter((t) => t.tap && usable(t) && !tappable(t)).map((t) => t.id);
}

describe('every tappable thing in town can be reached and tapped', () => {
  // [CSS width, the Town tab's height on that phone]
  for (const [width, height] of [
    [360, 663],
    [390, 727],
    [430, 815],
  ] as const)
    it(`on a phone ${width} CSS pixels wide`, () => {
      expect(untappable(width, height)).toEqual([]);
    });
});
