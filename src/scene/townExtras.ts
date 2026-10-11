/*
 * What the town draws beside its painted picture to say what can be tapped
 * (`townMarks.ts` decides; this draws): lane B's markers over things, their
 * ring under the one a tap would use, a beacon spreading on the water round
 * the boat while somewhere new is open, and the pieces this scene places
 * itself (the boat's sign, its bow lantern). All in art pixels on the town's
 * own canvas, as crisp as the town, and each says where it draws so only
 * those patches are drawn again.
 */
import type { Palette } from '../art/palette';
import type { Standing } from './draw';
import { townMarker, townPointer, townRing, type PointerDirection } from './fromLaneB';
import type { TimeOfDay } from './daylight';
import type { Play } from './play';
import type { StageExtra } from './stage';
import type { Box, Scene } from './things';
import { pieceBox, STAND_IN_PIECES } from './town2';
import {
  BEACON,
  BEACON_MS,
  markFrame,
  marksNow,
  ringOf,
  type BoatPointer,
  type MarkOptions,
} from './townMarks';
import type { Point } from './tileMap';

export interface TownExtraInput {
  readonly scene: Scene;
  readonly play: Play;
  /** The time of day the town's picture is in now. */
  readonly time: TimeOfDay;
  /** The page's clock, ms: what steps the markers and spreads the beacon. */
  readonly now: number;
  readonly marks: MarkOptions;
  /** The thing a tap beside the hero would use (`ringed`), or none. */
  readonly ring: string | null;
  /** The chevron at the screen's edge toward the boat (`boatPointer`), or none. */
  readonly pointer?: BoatPointer | null;
}

/**
 * A plain chevron for the screen's edge, drawn here until lane B's
 * `townPointer2` is in: gold, keyed in ink, its tip at `at` (art pixels),
 * nudged toward where it points as the markers bob. 10 by 13 before the key.
 */
function plainPointer(
  ctx: CanvasRenderingContext2D,
  at: Point,
  dir: PointerDirection,
  frame: number,
  gold: string,
  ink: string,
): void {
  const nudge = [0, 1, 2, 1][frame % 4]!;
  // Rows of the chevron pointing right, tip at (0, 0): each row's x from the tip.
  const cells: [number, number][] = [];
  for (let r = -6; r <= 6; r++) for (let d = 0; d < 4; d++) cells.push([-(Math.abs(r) + d) - 1, r]);
  const turn = ([x, y]: [number, number]): [number, number] =>
    dir === 'right' ? [x, y] : dir === 'left' ? [-x, y] : dir === 'down' ? [y, x] : [y, -x];
  const shift =
    dir === 'right'
      ? [nudge - 2, 0]
      : dir === 'left'
        ? [2 - nudge, 0]
        : dir === 'down'
          ? [0, nudge - 2]
          : [0, 2 - nudge];
  const draw = (colour: string, grow: number) => {
    ctx.fillStyle = colour;
    for (const c of cells) {
      const [x, y] = turn(c);
      ctx.fillRect(
        at.x + x + shift[0]! - grow,
        at.y + y + shift[1]! - grow,
        1 + 2 * grow,
        1 + 2 * grow,
      );
    }
  };
  draw(ink, 1);
  draw(gold, 0);
}

/** An ellipse's outline in whole art pixels. */
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  const steps = Math.max(24, Math.round((rx + ry) * 2));
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    ctx.fillRect(Math.round(x + Math.cos(t) * rx), Math.round(y + Math.sin(t) * ry), 1, 1);
  }
}

/** The town's extra drawing for a frame. */
export function townExtra(input: TownExtraInput, palette: Palette): StageExtra {
  const gold = palette.colours.gold1;
  const actors: Standing[] = [];
  const boxes: Box[] = [];
  const own = new Set(input.scene.things.map((t) => t.id));
  for (const { piece } of STAND_IN_PIECES) {
    if (!own.has(piece.id)) continue;
    const image = piece.picture(input.time);
    if (!image) continue;
    const box = pieceBox(piece);
    actors.push({ image, x: box.x, y: box.y, base: piece.base });
    boxes.push(box);
  }
  const frame = markFrame(input.now);
  const drawn = marksNow(input.scene, input.play, input.marks).flatMap((m) => {
    const mark = townMarker(m.kind, frame, input.time, m.size);
    if (!mark) return [];
    const x = Math.round(m.at.x - mark.anchor.x);
    const y = Math.round(m.at.y - mark.anchor.y);
    boxes.push({ x: x - 1, y: y - 1, w: mark.canvas.width + 2, h: mark.canvas.height + 2 });
    return [{ image: mark.canvas, x, y }];
  });
  const thing = input.ring ? input.scene.things.find((t) => t.id === input.ring) : undefined;
  const ring = thing ? ringOf(thing) : null;
  const ringMark = ring ? townRing(2 * ring.rx, frame, input.time) : null;
  const ringAt =
    ring && ringMark
      ? { x: Math.round(ring.x - ringMark.anchor.x), y: Math.round(ring.y - ringMark.anchor.y) }
      : null;
  if (ringMark && ringAt)
    boxes.push({
      x: ringAt.x - 1,
      y: ringAt.y - 1,
      w: ringMark.canvas.width + 2,
      h: ringMark.canvas.height + 2,
    });
  // While somewhere new is open: the beacon spreading on the water round the boat.
  const beacon = input.marks.somewhereNew && !input.marks.panelOpen;
  if (beacon)
    boxes.push({
      x: BEACON.x - BEACON.rx - 22,
      y: BEACON.y - BEACON.ry - 8,
      w: 2 * BEACON.rx + 44,
      h: 2 * BEACON.ry + 16,
    });
  const spread = (((input.now % BEACON_MS) + BEACON_MS) % BEACON_MS) / BEACON_MS;
  // The way to the boat from off the screen: lane B's chevron, or a plain one until it is in.
  const pointer = input.pointer ?? null;
  const pointed = pointer ? townPointer(pointer.dir, frame, input.time) : null;
  const pointerAt =
    pointer && pointed
      ? {
          x: Math.round(pointer.at.x - pointed.anchor.x),
          y: Math.round(pointer.at.y - pointed.anchor.y),
        }
      : null;
  if (pointer)
    boxes.push(
      pointed && pointerAt
        ? {
            x: pointerAt.x - 1,
            y: pointerAt.y - 1,
            w: pointed.canvas.width + 2,
            h: pointed.canvas.height + 2,
          }
        : { x: pointer.at.x - 16, y: pointer.at.y - 16, w: 32, h: 32 },
    );
  return {
    actors,
    boxes,
    ground:
      ringAt || beacon
        ? (ctx) => {
            if (beacon) {
              // Two rings, a step behind each other, fading as they spread.
              for (const phase of [0, 0.5]) {
                const t = (spread + phase) % 1;
                ctx.globalAlpha = 1 - t;
                ctx.fillStyle = gold;
                ellipse(ctx, BEACON.x, BEACON.y, BEACON.rx + t * 20, BEACON.ry + t * 6);
                ellipse(ctx, BEACON.x, BEACON.y + 1, BEACON.rx + t * 20 + 1, BEACON.ry + t * 6);
              }
              ctx.globalAlpha = 1;
            }
            if (ringMark && ringAt) ctx.drawImage(ringMark.canvas, ringAt.x, ringAt.y);
          }
        : undefined,
    over:
      drawn.length || pointer
        ? (ctx) => {
            for (const d of drawn) ctx.drawImage(d.image, d.x, d.y);
            if (pointer && pointed && pointerAt)
              ctx.drawImage(pointed.canvas, pointerAt.x, pointerAt.y);
            else if (pointer)
              plainPointer(ctx, pointer.at, pointer.dir, frame, gold, palette.colours.ink1);
          }
        : undefined,
  };
}
