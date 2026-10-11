/**
 * B15's pictures for the art gallery: the harbour chart dressed with every
 * marker state, its pieces, the tide-pool cave's props, the ferry's pieces
 * on the quay and the town's markers, each a `Picture2` the dungeon
 * gallery paints (`gallery.ts`).
 */
import { characterPicture2, townsfolkPicture2 } from '../character2';
import {
  chartBoat2,
  chartDot2,
  chartEmblem2,
  chartMarker2,
  chartRoute2,
  CHART_EMBLEM2_IDS,
  CHART_MARKER2_STATES,
  harbourChart2,
} from '../chart';
import { stamp, tgrid, type Picture2 } from '../town2/cells';
import { plate } from '../town2/gallery2';
import { ROWBOAT_LANTERN_AT, town2Piece } from '../town2/pieces';
import {
  townHighlight2,
  townMarker2,
  townPointer2,
  TOWN_MARKER2_KINDS,
  TOWN_POINTER2_DIRECTIONS,
} from '../town2/markers';
import { foe2Frame } from './cast2';
import { prop2 } from './props';
import { TIDEPOOL2_PROP_IDS } from './tideProps';

const LINEN = ['linen_tunic', 'linen_trousers', 'bronze_sword'];

/** The chart with a marker in every state, an emblem by each dungeon, routes and the boat on one. */
export function chartDressed(): Picture2 {
  const c = harbourChart2();
  const g = tgrid(c.width, c.height);
  stamp(g, c.picture.grid, 0, 0);
  const lay = (p: { picture: Picture2; anchor: { x: number; y: number } }, x: number, y: number) =>
    stamp(g, p.picture.grid, Math.round(x - p.anchor.x), Math.round(y - p.anchor.y));
  const L = c.landings;
  const toCave = chartRoute2(c.home, L.tidepool_cave!);
  for (const d of chartRoute2(c.home, L.brinebeards_grotto!)) lay(chartDot2(), d.x, d.y);
  for (const d of toCave) lay(chartDot2(), d.x, d.y);
  lay(chartMarker2('selected'), L.tidepool_cave!.x, L.tidepool_cave!.y - 6);
  lay(chartEmblem2('tidepool_cave')!, L.tidepool_cave!.x + 16, L.tidepool_cave!.y - 4);
  lay(chartMarker2('open'), L.tidepool_cave!.x, L.tidepool_cave!.y);
  lay(
    chartEmblem2('brinebeards_grotto')!,
    L.brinebeards_grotto!.x - 18,
    L.brinebeards_grotto!.y - 4,
  );
  lay(chartMarker2('cleared'), L.brinebeards_grotto!.x, L.brinebeards_grotto!.y);
  lay(chartMarker2('locked'), L.unknown_1!.x, L.unknown_1!.y);
  lay(chartMarker2('unknown'), L.unknown_2!.x, L.unknown_2!.y);
  lay(chartMarker2('unknown'), L.unknown_3!.x, L.unknown_3!.y);
  const mid = toCave[Math.floor(toCave.length / 2)]!;
  lay(chartBoat2('right'), mid.x, mid.y);
  return { grid: g, glows: [] };
}

/** The chart's pieces: every marker state, the boat both ways, each emblem and its silhouette. */
export function chartPieces(): Picture2 {
  return plate(
    [
      ...CHART_MARKER2_STATES.map((s) => chartMarker2(s).picture),
      chartBoat2('right').picture,
      chartBoat2('left').picture,
      chartDot2().picture,
      ...CHART_EMBLEM2_IDS.flatMap((id) => [
        chartEmblem2(id)!.picture,
        chartEmblem2(id, true)!.picture,
      ]),
    ],
    6,
  );
}

/** The tide-pool cave's props beside a level-1 hero and Old Snapper. */
export function tidePropsPlate(): Picture2 {
  return plate(
    [
      characterPicture2({}, LINEN),
      foe2Frame('old_snapper', 'idle')!.picture,
      ...TIDEPOOL2_PROP_IDS.map((id) => ({ grid: prop2(id)!.grid, glows: prop2(id)!.glows })),
    ],
    6,
  );
}

/** The ferry's pieces: the ferryman, the sign, the boat with its lantern at its bow, the hero for scale. */
export function ferryPlate(): Picture2 {
  const boat = town2Piece('rowboat');
  const lan = town2Piece('boat_lantern');
  const top = lan.base - ROWBOAT_LANTERN_AT.y;
  const g = tgrid(boat.w, boat.h + top);
  stamp(g, boat.picture.grid, 0, top);
  stamp(g, lan.picture.grid, ROWBOAT_LANTERN_AT.x - lan.foot, 0);
  const glows = [
    ...boat.picture.glows.map((gl) => ({ ...gl, y: gl.y + top })),
    ...lan.picture.glows.map((gl) => ({ ...gl, x: gl.x + ROWBOAT_LANTERN_AT.x - lan.foot })),
  ];
  return plate(
    [
      characterPicture2({}, LINEN),
      townsfolkPicture2('ferryman')!,
      town2Piece('boat_sign').picture,
      { grid: g, glows },
    ],
    8,
  );
}

/**
 * The town's markers, every kind small, medium (B17) and large (B16), at one
 * frame of their loop, the edge pointers, and the ring round the nearest thing.
 */
export function markersPlate(frame: number): Picture2 {
  return plate(
    [
      ...TOWN_MARKER2_KINDS.map((k) => townMarker2(k, frame).picture),
      ...TOWN_MARKER2_KINDS.map((k) => townMarker2(k, frame, 'medium').picture),
      ...TOWN_MARKER2_KINDS.map((k) => townMarker2(k, frame, 'large').picture),
      ...TOWN_POINTER2_DIRECTIONS.map((d) => townPointer2(d, frame).picture),
      townHighlight2(48, frame).picture,
    ],
    6,
  );
}
