import { expect, it } from 'vitest';
import { TOWN2_TILE } from '../../src/art/town2/town';
import { startPlay } from '../../src/scene/play';
import { centreOf } from '../../src/scene/tileMap';
import { folkOn, startFolk, strolling, type FolkClocks } from '../../src/scene/town2Folk';

it('dbg', () => {
  const parked = startPlay(centreOf({ col: 4, row: 51 }, TOWN2_TILE));
  let clocks: FolkClocks = startFolk();
  let last = strolling(clocks, parked)[0]!.at;
  const out: string[] = [];
  for (let t = 0; t < 60_000; t += 16) {
    clocks = folkOn(clocks, 16, parked);
    const s = strolling(clocks, parked)[0]!;
    const route = strolling(clocks)[0]!;
    const d = Math.hypot(s.at.x - last.x, s.at.y - last.y);
    if (d > 2)
      out.push(
        `${t} clock ${clocks[0]} at ${s.at.x.toFixed(1)},${s.at.y.toFixed(1)} last ${last.x.toFixed(1)},${last.y.toFixed(1)} route ${route.at.x.toFixed(1)},${route.at.y.toFixed(1)} walking ${s.walking}`,
      );
    last = s.at;
  }
  expect(out.slice(0, 8)).toEqual([]);
});
