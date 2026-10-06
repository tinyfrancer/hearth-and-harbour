/*
 * Paints the C-scale town off the main thread: asked for a time of day, it
 * answers with the pixels of the ground, the moved foam and every standing
 * piece (`groundPixels`), handing the buffers over rather than copying them.
 * The page starts one worker per time of day it needs and lets it go after
 * the answer, which also lets go of the art lane's cell grids it composed.
 */
import type { TimeOfDay } from './daylight';
import { buffersOf, groundPixels } from './town2Paint';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<TimeOfDay>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

scope.onmessage = (event) => {
  const made = groundPixels(event.data);
  scope.postMessage(made, buffersOf(made));
};
