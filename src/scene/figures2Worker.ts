/*
 * Draws the hero's poses off the main thread: every walk frame each way and
 * the breath, for one look and outfit (`posesFor` in `figures2.ts`, lane B's
 * door behind it). Drawing a pose takes a few milliseconds and makes a lot
 * of garbage, which on the page would hold up the first steps of every walk
 * on a slow phone. Asked once, it answers with the pictures' cells (handed
 * over without copying) and closes.
 */
import type { Look } from '../art/character';
import { posesFor } from './figures2';

/** What the page asks for: a look and what is worn. */
export interface PoseRequest {
  readonly look: Look;
  readonly worn: readonly string[];
}

/** One pose's picture, by its key: its cells, row by row. */
export interface PoseCells {
  readonly key: string;
  readonly w: number;
  readonly h: number;
  readonly d: Int16Array;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<PoseRequest>) => void) | null;
  postMessage(message: PoseCells[], transfer?: Transferable[]): void;
  close(): void;
};

scope.onmessage = (event) => {
  const { look, worn } = event.data;
  const out: PoseCells[] = [];
  for (const [key, pic] of posesFor(look, worn)) {
    // Lane B keeps its pictures; what goes to the page is a copy of the cells.
    const d = pic.grid.d.slice();
    out.push({ key, w: pic.grid.w, h: pic.grid.h, d });
  }
  scope.postMessage(
    out,
    out.map((p) => p.d.buffer as ArrayBuffer),
  );
  scope.close();
};
