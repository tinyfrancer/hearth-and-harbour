/*
 * The browser's side of keeping the town (`town2Cache.ts` has the rules):
 * a database of its own in IndexedDB, apart from the game's save, and the
 * town's pictures packed as PNGs (pixel art packs small: the whole ground
 * is about a tenth of its raw size) with the ground's cells squeezed where
 * the browser can. Only for a worker that can draw (`OffscreenCanvas`):
 * anywhere else nothing is kept and the town is worked out each time.
 */
import type { TimeOfDay } from './daylight';
import type { Kept, Packer, Shelf } from './town2Cache';
import type { Raw, TownPaint } from './town2Facts';

const DB = 'hearth-and-harbour-town';
const STORE = 'towns';

/** Whether this place can keep a town: a database, and pictures to pack. */
export function canKeep(): boolean {
  return (
    typeof indexedDB !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap === 'function'
  );
}

/** A request's answer as a promise. */
const done = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('The town’s database is held open elsewhere.'));
  });
}

/** The town's own database: one entry a time of day, each new version over the last. */
export function idbShelf(): Shelf {
  let db: Promise<IDBDatabase> | null = null;
  const store = async (mode: IDBTransactionMode): Promise<IDBObjectStore> => {
    db ??= openDb();
    return (await db).transaction(STORE, mode).objectStore(STORE);
  };
  return {
    async get(time: TimeOfDay) {
      return done((await store('readonly')).get(time));
    },
    async put(time: TimeOfDay, kept: Kept<unknown>) {
      const s = await store('readwrite');
      await done(s.put(kept, time));
      await new Promise<void>((resolve, reject) => {
        s.transaction.oncomplete = () => resolve();
        s.transaction.onerror = () => reject(s.transaction.error);
        s.transaction.onabort = () => reject(s.transaction.error);
      });
    },
  };
}

/** A painted town as kept: every picture a PNG, the cells squeezed (or as they are). */
export type Packed = TownPaint<Blob> & { readonly squeezed: boolean; readonly kept: Blob };

async function png(r: Raw): Promise<Blob> {
  const canvas = new OffscreenCanvas(r.w, r.h);
  canvas
    .getContext('2d')!
    .putImageData(new ImageData(r.data as Uint8ClampedArray<ArrayBuffer>, r.w, r.h), 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

const canSqueeze = (): boolean =>
  typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

async function through(blob: Blob, stream: CompressionStream | DecompressionStream) {
  return new Response(blob.stream().pipeThrough(stream)).blob();
}

/** Pictures as PNGs and back to bitmaps, the still composed again on the way back. */
export const pngPacker: Packer<Packed, ImageBitmap> = {
  async pack(paint) {
    const maybe = (r: Raw | null) => (r ? png(r) : Promise.resolve(null));
    const facings = async (f: { right: Raw | null; left: Raw | null }) => ({
      right: await maybe(f.right),
      left: await maybe(f.left),
    });
    const cells = new Blob([paint.cells.slice().buffer as ArrayBuffer]);
    const squeezed = canSqueeze();
    return {
      ...paint,
      composed: false,
      still: await png(paint.still),
      pieces: await Promise.all(paint.pieces.map(png)),
      foam: { ...paint.foam, image: await png(paint.foam.image) },
      smoke: await Promise.all(paint.smoke.map((frames) => Promise.all(frames.map(png)))),
      gull: await facings(paint.gull),
      folk: await Promise.all(
        paint.folk.map(async (f) => ({
          ...(await facings(f)),
          ...(f.inhale ? { inhale: await facings(f.inhale) } : {}),
        })),
      ),
      // The cells go in `kept`; a TownPaint's own field is left empty.
      cells: new Int16Array(0),
      squeezed,
      kept: squeezed ? await through(cells, new CompressionStream('gzip')) : cells,
    };
  },

  async unpack(packed) {
    const bitmap = (b: Blob) => createImageBitmap(b);
    const maybe = (b: Blob | null) => (b ? bitmap(b) : Promise.resolve(null));
    const facings = async (f: { right: Blob | null; left: Blob | null }) => ({
      right: await maybe(f.right),
      left: await maybe(f.left),
    });
    const [ground, pieces] = await Promise.all([
      bitmap(packed.still),
      Promise.all(packed.pieces.map(bitmap)),
    ]);
    // The still, composed as the worker composes a fresh one: the ground, then every piece.
    const canvas = new OffscreenCanvas(ground.width, ground.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(ground, 0, 0);
    ground.close();
    for (const s of packed.standing) ctx.drawImage(pieces[s.piece]!, s.x, s.y);
    const raw = packed.squeezed
      ? await through(packed.kept, new DecompressionStream('gzip'))
      : packed.kept;
    return {
      time: packed.time,
      composed: true,
      still: canvas.transferToImageBitmap(),
      pieces,
      standing: packed.standing,
      foam: { ...packed.foam, image: await bitmap(packed.foam.image) },
      smoke: await Promise.all(packed.smoke.map((frames) => Promise.all(frames.map(bitmap)))),
      gull: await facings(packed.gull),
      folk: await Promise.all(
        packed.folk.map(async (f) => ({
          ...(await facings(f)),
          ...(f.inhale ? { inhale: await facings(f.inhale) } : {}),
        })),
      ),
      cells: new Int16Array(await raw.arrayBuffer()),
    };
  },
};
