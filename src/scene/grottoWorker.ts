/*
 * Works out a dungeon room's ground off the main thread: asked for a room
 * of the grotto at a state of the tide, it answers with the ground's lit
 * cells (for contact shadows) and its pixels in the cave's dusk, both handed
 * over without copying. Painting a room's ground (every tile told its
 * neighbours, the lanterns' pools, a third of a megapixel of colour) takes a
 * tenth of a second or more; done here, a fight never stops for the tide.
 */
import { buildDungeon, type Dungeon } from './dungeon';
import { GROTTO } from './grotto';
import { groundPixels } from './grottoArt';

/** What the page asks: a room of the grotto, at a state of the tide. */
export interface GroundRequest {
  readonly id: number;
  readonly room: string;
  readonly level: number;
  readonly warn: boolean;
}

/** What comes back: the cells and pixels of that ground, `w` x `h`. */
export interface GroundAnswer {
  readonly id: number;
  readonly w: number;
  readonly h: number;
  readonly cells: Int16Array;
  readonly data: Uint8ClampedArray;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<GroundRequest>) => void) | null;
  postMessage(message: GroundAnswer, transfer?: Transferable[]): void;
};

let dungeon: Dungeon | null = null;

scope.onmessage = (event) => {
  const { id, room, level, warn } = event.data;
  dungeon ??= buildDungeon(GROTTO);
  const r = dungeon.rooms[room];
  if (!r) return;
  const { cells, data } = groundPixels(r, level, warn);
  scope.postMessage({ id, w: cells.w, h: cells.h, cells: cells.d, data }, [
    cells.d.buffer as ArrayBuffer,
    data.buffer as ArrayBuffer,
  ]);
};
