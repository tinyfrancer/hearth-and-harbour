/*
 * Works out the town off the main thread. Asked for a time of day (and the
 * facts, the first time), it answers with the facts, then a step at a time
 * how far it has got, then the town painted (`town2Facts.ts`), then what
 * became of keeping it for next time (`town2Cache.ts`).
 *
 * A town kept from an earlier visit, under this worker's own version, is
 * answered from storage: its pictures decoded straight onto bitmaps, nothing
 * worked out. Otherwise it is worked out as ever, sent, and then kept.
 *
 * Where the browser lets a worker draw (`OffscreenCanvas`), the pixels go
 * onto bitmaps here and the still is composed here too, so the page has
 * nothing to do but show them: no 12 MB copy onto a canvas, no pieces drawn,
 * on the page's thread. Elsewhere the pixels are handed over as they are
 * (without copying) and the page composes them; nothing is kept then.
 *
 * The page starts one worker per request and lets it go after the last
 * word, which also lets go of the art lane's cell grids it composed.
 */
import { forgetTown2Grids } from '../art/town2/town';
import {
  cacheVersion,
  findKept,
  keep,
  keptOf,
  openStore,
  paintOf,
  workerCodec,
  type Store,
} from './town2Cache';
import {
  buffersOf,
  paintTown,
  town2Facts,
  type KeptReport,
  type Raw,
  type TownAnswer,
  type TownPaint,
  type TownRequest,
} from './town2Facts';

const scope = self as unknown as {
  location: { href: string };
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

/** The still with every standing piece drawn on it, on a canvas: shown, and kept. */
function composed(paint: TownPaint<Raw>, pieces: readonly ImageBitmap[]): OffscreenCanvas | null {
  const still = new OffscreenCanvas(paint.still.w, paint.still.h);
  const ctx = still.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(
    new ImageData(paint.still.data as Uint8ClampedArray<ArrayBuffer>, paint.still.w, paint.still.h),
    0,
    0,
  );
  for (const s of paint.standing) ctx.drawImage(pieces[s.piece]!, s.x, s.y);
  return still;
}

/** The town on bitmaps, its still composed: null where this browser's workers cannot draw. */
function onBitmaps(paint: TownPaint<Raw>): TownPaint<ImageBitmap> | null {
  if (typeof OffscreenCanvas === 'undefined') return null;
  try {
    const pieces = paint.pieces.map(bitmapOf);
    const still = composed(paint, pieces);
    if (!still) return null;
    const maybe = (r: Raw | null): ImageBitmap | null => r && bitmapOf(r);
    return {
      ...paint,
      composed: true,
      still: still.transferToImageBitmap(),
      pieces,
      foam: { ...paint.foam, image: bitmapOf(paint.foam.image) },
      smoke: paint.smoke.map((frames) => frames.map(bitmapOf)),
      gull: { right: maybe(paint.gull.right), left: maybe(paint.gull.left) },
      folk: paint.folk.map((breaths) =>
        breaths.map((f) => ({ right: maybe(f.right), left: maybe(f.left) })),
      ),
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
    ...paint.folk.flat().flatMap((f) => [f.right, f.left]),
  ];
  return [...all.filter((b): b is ImageBitmap => b !== null), paint.cells.buffer as ArrayBuffer];
}

/** The still as it is kept: the ground with every standing piece on it, as one picture's pixels. */
function stillToKeep(paint: TownPaint<Raw>): Raw {
  const pieces = paint.pieces.map(bitmapOf);
  const canvas = composed(paint, pieces)!;
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  for (const p of pieces) p.close();
  return { w: canvas.width, h: canvas.height, data };
}

const kept = (report: KeptReport): void => scope.postMessage({ kind: 'kept', report });

async function answer(request: TownRequest): Promise<void> {
  const { time, facts: wantFacts } = request;
  const version = cacheVersion(scope.location.href);
  const canKeep = !!version && typeof OffscreenCanvas !== 'undefined';
  const store: Store | null = canKeep ? await openStore().catch(() => null) : null;

  if (store && version) {
    const found = await findKept(store, version, time, wantFacts);
    if (found.town) {
      try {
        const paint = await paintOf(found.town, workerCodec);
        if (found.facts) scope.postMessage({ kind: 'facts', facts: found.facts });
        for (const step of [1, 2, 3] as const) scope.postMessage({ kind: 'step', step });
        scope.postMessage({ kind: 'town', paint }, bitmapsOf(paint));
        kept({ how: 'hit', version, bytes: found.town.bytes });
        return;
      } catch {
        // Kept but unreadable: work it out afresh, and keep that instead.
      }
    }
  }

  const facts = wantFacts ? town2Facts() : null;
  if (facts) scope.postMessage({ kind: 'facts', facts });
  scope.postMessage({ kind: 'step', step: 1 });
  const paint = paintTown(time, (step) => scope.postMessage({ kind: 'step', step }));
  // Every piece is on our pixels now: lane B's drawn pieces can go while the town is kept.
  forgetTown2Grids({ pieces: true });
  const bitmaps = onBitmaps(paint);
  if (!bitmaps) {
    scope.postMessage({ kind: 'town', paint }, buffersOf(paint));
    kept({ how: 'none', version, bytes: null, why: 'no canvas in a worker' });
    return;
  }
  // The cells go to the page; a copy stays to be kept.
  const cells = paint.cells.slice();
  scope.postMessage({ kind: 'town', paint: bitmaps }, bitmapsOf(bitmaps));
  if (!store || !version) {
    kept({ how: 'none', version, bytes: null, why: version ? 'no storage' : 'no version' });
    return;
  }
  try {
    const town = await keptOf({ ...paint, still: stillToKeep(paint), cells }, workerCodec);
    kept(await keep(store, version, wantFacts ? facts : await factsToKeep(store, version), town));
  } catch (error) {
    kept({ how: 'none', version, bytes: null, why: String(error) });
  }
}

/**
 * The facts, if this version has none kept yet (a flip of the time of day
 * before the first visit's town was kept): worked out here, so a town is
 * never kept without the facts to walk it by.
 */
async function factsToKeep(store: Store, version: string) {
  const had = await store.get(`${version} facts`).catch(() => null);
  return had ? null : town2Facts();
}

scope.onmessage = (event) => {
  void answer(event.data);
};
