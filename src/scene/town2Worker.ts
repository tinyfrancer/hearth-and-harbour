/*
 * Works out the town off the main thread. Asked for a time of day (and the
 * facts, the first time), it answers with the facts, then a step at a time
 * how far it has got, then the town painted (`town2Facts.ts`).
 *
 * Where the browser lets a worker draw (`OffscreenCanvas`), the pixels go
 * onto bitmaps here and the still is composed here too, so the page has
 * nothing to do but show them: no 12 MB copy onto a canvas, no pieces drawn,
 * on the page's thread. Elsewhere the pixels are handed over as they are
 * (without copying) and the page composes them.
 *
 * The page starts one worker per request and lets it go after the answer,
 * which also lets go of the art lane's cell grids it composed.
 */
import {
  buffersOf,
  paintTown,
  town2Facts,
  type Raw,
  type TownAnswer,
  type TownPaint,
  type TownRequest,
} from './town2Facts';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<TownRequest>) => void) | null;
  postMessage(message: TownAnswer, transfer?: Transferable[]): void;
};

/** A picture on a bitmap of its own. */
function bitmapOf(r: Raw): ImageBitmap {
  const canvas = new OffscreenCanvas(r.w, r.h);
  canvas
    .getContext('2d')!
    .putImageData(new ImageData(r.data as Uint8ClampedArray<ArrayBuffer>, r.w, r.h), 0, 0);
  return canvas.transferToImageBitmap();
}

/** The town on bitmaps, its still composed: null where this browser's workers cannot draw. */
function onBitmaps(paint: TownPaint<Raw>): TownPaint<ImageBitmap> | null {
  if (typeof OffscreenCanvas === 'undefined') return null;
  try {
    const still = new OffscreenCanvas(paint.still.w, paint.still.h);
    const ctx = still.getContext('2d');
    if (!ctx) return null;
    const pieces = paint.pieces.map(bitmapOf);
    ctx.putImageData(
      new ImageData(
        paint.still.data as Uint8ClampedArray<ArrayBuffer>,
        paint.still.w,
        paint.still.h,
      ),
      0,
      0,
    );
    for (const s of paint.standing) ctx.drawImage(pieces[s.piece]!, s.x, s.y);
    const maybe = (r: Raw | null): ImageBitmap | null => r && bitmapOf(r);
    return {
      ...paint,
      composed: true,
      still: still.transferToImageBitmap(),
      pieces,
      foam: { ...paint.foam, image: bitmapOf(paint.foam.image) },
      smoke: paint.smoke.map((frames) => frames.map(bitmapOf)),
      gull: { right: maybe(paint.gull.right), left: maybe(paint.gull.left) },
      folk: paint.folk.map((f) => ({ right: maybe(f.right), left: maybe(f.left) })),
    };
  } catch {
    return null;
  }
}

/** Every bitmap in a painted town, to hand over without copying. */
function bitmapsOf(paint: TownPaint<ImageBitmap>): Transferable[] {
  const all = [
    paint.still,
    ...paint.pieces,
    paint.foam.image,
    ...paint.smoke.flat(),
    paint.gull.right,
    paint.gull.left,
    ...paint.folk.flatMap((f) => [f.right, f.left]),
  ];
  return [...all.filter((b): b is ImageBitmap => b !== null), paint.cells.buffer as ArrayBuffer];
}

scope.onmessage = (event) => {
  const { time, facts } = event.data;
  if (facts) scope.postMessage({ kind: 'facts', facts: town2Facts() });
  scope.postMessage({ kind: 'step', step: 1 });
  const paint = paintTown(time, (step) => scope.postMessage({ kind: 'step', step }));
  const bitmaps = onBitmaps(paint);
  if (bitmaps) scope.postMessage({ kind: 'town', paint: bitmaps }, bitmapsOf(bitmaps));
  else scope.postMessage({ kind: 'town', paint }, buffersOf(paint));
};
