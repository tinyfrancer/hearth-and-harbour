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
import { townMarker, townRing } from './fromLaneB';
import type { TimeOfDay } from './daylight';
import type { Play } from './play';
import type { StageExtra } from './stage';
import type { Box, Scene } from './things';
import { pieceBox, STAND_IN_PIECES } from './town2';
import { BEACON, BEACON_MS, markFrame, marksNow, ringOf, type MarkOptions } from './townMarks';

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
    const mark = townMarker(m.kind, frame, input.time);
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
    over: drawn.length
      ? (ctx) => {
          for (const d of drawn) ctx.drawImage(d.image, d.x, d.y);
        }
      : undefined,
  };
}
