/*
 * Works out a dungeon room's ground off the main thread: asked for a room
 * of a dungeon (by both ids) at a state of the tide, it answers with the ground's lit
 * cells (for contact shadows) and its pixels in the cave's dusk, both handed
 * over without copying. Painting a room's ground (every tile told its
 * neighbours, the lanterns' pools, a third of a megapixel of colour) takes a
 * tenth of a second or more; done here, a fight never stops for the tide.
 */
import { buildDungeon, type Dungeon } from './dungeon';
import { groundPixels } from './grottoArt';
import { planOf } from './plans';

/** What the page asks: a room of a dungeon, at a state of the tide. */
export interface GroundRequest {
  readonly id: number;
  /** The dungeon's id (`plans.ts`); the grotto's when absent. */
  readonly dungeon?: string;
  readonly room: string;
  readonly level: number;
  readonly warn: boolean;
  /** A darker day's light (`Room.dim`); all of it when absent. */
  readonly dim?: number;
  /** Which of its lanterns on posts burn (`Room.lit`); as written when absent. */
  readonly lit?: number;
}

/** What comes back: the cells and pixels of that ground, `w` x `h`. */
export interface GroundAnswer {
  readonly id: number;
  readonly w: number;
  readonly h: number;
  readonly cells: Int16Array;
  readonly data: Uint8ClampedArray;
  /** Each door's cells barred and open over its box (`DoorPaint`), flattened for the hand-over. */
  readonly doors: readonly {
    readonly letter: string;
    readonly box: { x: number; y: number; w: number; h: number };
    readonly barred: Int16Array;
    readonly open: Int16Array;
  }[];
  /** A dark room's layers (`DarkLayers`): each pixel's shade, and the ground lit and in a heart. */
  readonly dark: {
    readonly shade: Uint8Array;
    readonly lit: Uint8ClampedArray;
  } | null;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<GroundRequest>) => void) | null;
  postMessage(message: GroundAnswer, transfer?: Transferable[]): void;
};

/** Each dungeon asked for, read once. */
const dungeons = new Map<string, Dungeon>();

scope.onmessage = (event) => {
  const { id, room, level, warn } = event.data;
  const which = event.data.dungeon ?? 'brinebeards_grotto';
  let dungeon = dungeons.get(which);
  if (!dungeon) {
    const plan = planOf(which);
    if (!plan) return;
    dungeon = buildDungeon(plan);
    dungeons.set(which, dungeon);
  }
  const plain = dungeon.rooms[room];
  if (!plain) return;
  const dim = event.data.dim;
  const dimmed = dim !== undefined && dim !== 1 ? { ...plain, dim } : plain;
  const lit = event.data.lit;
  const r = lit !== undefined ? { ...dimmed, lit } : dimmed;
  const { cells, data, doors, dark } = groundPixels(r, level, warn);
  const flat = doors.map((d) => ({
    letter: d.letter,
    box: d.box,
    barred: d.barred.d,
    open: d.open.d,
  }));
  const layers = dark && { shade: dark.shade, lit: dark.lit };
  scope.postMessage(
    { id, w: cells.w, h: cells.h, cells: cells.d, data, doors: flat, dark: layers },
    [
      cells.d.buffer as ArrayBuffer,
      data.buffer as ArrayBuffer,
      ...flat.flatMap((d) => [d.barred.buffer as ArrayBuffer, d.open.buffer as ArrayBuffer]),
      ...(layers ? [layers.shade.buffer as ArrayBuffer, layers.lit.buffer as ArrayBuffer] : []),
    ],
  );
};
