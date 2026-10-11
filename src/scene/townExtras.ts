/*
 * What the town draws beside its painted picture to say what can be tapped
 * (`townMarks.ts` decides; this draws): the markers bobbing over things, the
 * ring under the one a tap would use, and the pieces this scene places until
 * the art lane's layout has them (the ferry sign, the bow lantern). All in
 * art pixels on the town's own canvas, so they are as crisp as the town, and
 * each says where it draws so only those patches are drawn again.
 */
import type { Palette } from '../art/palette';
import type { Standing } from './draw';
import { markerBob, townMarker } from './fromLaneB';
import type { TimeOfDay } from './daylight';
import type { Play } from './play';
import type { StageExtra } from './stage';
import type { Box, Scene } from './things';
import { pieceBox, STAND_IN_PIECES } from './town2';
import {
  BEACON,
  BEACON_MS,
  MARK_BOX,
  markFrame,
  marksNow,
  ringOf,
  type MarkOptions,
} from './townMarks';

export interface TownExtraInput {
  readonly scene: Scene;
  readonly play: Play;
  /** The time of day the town's picture is in now. */
  readonly time: TimeOfDay;
  /** The page's clock, ms: what bobs the markers and pulses the ring. */
  readonly now: number;
  readonly marks: MarkOptions;
  /** The thing a tap beside the hero would use (`ringed`), or none. */
  readonly ring: string | null;
}

/** An ellipse's outline in whole art pixels, `w` thick. */
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  const steps = Math.max(24, Math.round((rx + ry) * 2));
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    ctx.fillRect(Math.round(x + Math.cos(t) * rx), Math.round(y + Math.sin(t) * ry), 1, 1);
  }
}

/** The town's extra drawing for a frame. */
export function townExtra(input: TownExtraInput, palette: Palette): StageExtra {
  // The walk's own target colours: gold, edged dark so it reads on sand and cobbles alike.
  const gold = palette.colours.gold1;
  const ink = palette.colours.ink1;
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
  const marks = marksNow(input.scene, input.play, input.marks);
  const frame = markFrame(input.now);
  const drawn = marks.map((m) => {
    const image = townMarker(m.kind, input.time);
    const lift = 2 * markerBob(frame + (m.id.length % 2));
    const w = image?.width ?? MARK_BOX.w;
    const h = image?.height ?? MARK_BOX.h;
    const x = Math.round(m.at.x - w / 2);
    const y = Math.round(m.at.y - h - lift);
    // Where it can be this frame or the last: a little over its bob.
    boxes.push({ x: x - 1, y: m.at.y - h - 6, w: w + 2, h: h + 8 });
    return { image, x, y };
  });
  const thing = input.ring ? input.scene.things.find((t) => t.id === input.ring) : undefined;
  const ring = thing ? ringOf(thing) : null;
  if (ring)
    boxes.push({
      x: Math.floor(ring.x - ring.rx - 3),
      y: Math.floor(ring.y - ring.ry - 3),
      w: Math.ceil(2 * ring.rx + 6),
      h: Math.ceil(2 * ring.ry + 6),
    });
  const pulse = Math.floor(input.now / 400) % 2;
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
      ring || beacon
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
            if (ring) {
              ctx.fillStyle = ink;
              ellipse(ctx, ring.x, ring.y + 1, ring.rx + 1, ring.ry + 1);
              ctx.fillStyle = gold;
              ellipse(ctx, ring.x, ring.y, ring.rx + pulse, ring.ry + pulse * 0.5);
            }
          }
        : undefined,
    over: drawn.length
      ? (ctx) => {
          for (const d of drawn) if (d.image) ctx.drawImage(d.image, d.x, d.y);
        }
      : undefined,
  };
}
