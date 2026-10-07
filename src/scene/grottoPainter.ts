/*
 * The page's side of painting a dungeon room's ground in a worker
 * (`grottoWorker.ts`): one worker for a run, asked one state of the tide at
 * a time, the urgent (what is on screen now) ahead of the rest. With no
 * worker, or one that fails, it is done on the spot.
 */
import type { Room } from './dungeon';
import { groundOnTheSpot, type GroundPainter, type TideState } from './grottoArt';
import type { GroundAnswer, GroundRequest } from './grottoWorker';
import type { TGrid } from '../art/town2/cells';

interface Job {
  readonly request: GroundRequest;
  readonly room: Room;
  readonly state: TideState;
  readonly done: (cells: TGrid, data: Uint8ClampedArray | null) => void;
}

/** A painter that asks a worker, and the means to let it go when the run ends. */
export interface WorkerPainter extends GroundPainter {
  /** Lets the worker go; anything still asked for is done on the spot if asked again. */
  close(): void;
}

/** A worker for a run's grounds; on the spot where none can be had. */
export function groundInAWorker(): WorkerPainter {
  let worker: Worker | null = null;
  try {
    worker = new Worker(new URL('./grottoWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    worker = null;
  }
  const waiting: Job[] = [];
  let busy: Job | null = null;
  let next = 1;
  const send = (): void => {
    if (busy || !worker) return;
    busy = waiting.shift() ?? null;
    if (busy) worker.postMessage(busy.request);
  };
  const failed = (): void => {
    worker?.terminate();
    worker = null;
    // Whatever was asked is worked out here instead.
    const all = [...(busy ? [busy] : []), ...waiting.splice(0)];
    busy = null;
    for (const job of all) groundOnTheSpot.paint(job.room, job.state, true, job.done);
  };
  if (worker) {
    worker.onmessage = (event: MessageEvent<GroundAnswer>) => {
      const a = event.data;
      const job = busy;
      busy = null;
      if (job && job.request.id === a.id) job.done({ w: a.w, h: a.h, d: a.cells }, a.data);
      send();
    };
    worker.onerror = failed;
  }
  return {
    get offThread() {
      return worker !== null;
    },
    paint(room, state, urgent, done) {
      if (!worker) {
        groundOnTheSpot.paint(room, state, urgent, done);
        return;
      }
      const job: Job = {
        request: { id: next++, room: room.id, level: state.level, warn: state.warn },
        room,
        state,
        done,
      };
      if (urgent) waiting.unshift(job);
      else waiting.push(job);
      send();
    },
    close() {
      worker?.terminate();
      worker = null;
      waiting.length = 0;
      busy = null;
    },
  };
}
