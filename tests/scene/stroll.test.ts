import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '../../src/art/character';
import { ITEM_LAYERS2 } from '../../src/art/character2';
import { TOWN2_TILE } from '../../src/art/town2/town';
import {
  FIGURE2_ANCHOR_X,
  heroFigure2,
  townsfolkFigure2,
  type Figure2,
} from '../../src/scene/figures2';
import { clearLine } from '../../src/scene/path';
import { STAND_HALF, advancePlay, startPlay, tapAt, type Play } from '../../src/scene/play';
import {
  PASS_ROOM,
  PERSONAL,
  crowding,
  roundOf,
  strollAt,
  strollOn,
  strollPast,
  turnedAbout,
} from '../../src/scene/stroll';
import { grown, thingAt, type Box } from '../../src/scene/things';
import { cellAt, centreOf, isSolid, type Point } from '../../src/scene/tileMap';
import {
  HERO_FRONT,
  STANDING2,
  STROLLERS2,
  TOWN2_START_CELL,
  feetOf,
  personTap,
  strolledTiles,
  talkGap,
  town2Scene,
} from '../../src/scene/town2';
import {
  ROUNDS,
  faceStroller,
  folkOn,
  startFolk,
  strollerAt,
  strolling,
  strollersNow,
  talkToStroller,
  walkAmong,
  type FolkClocks,
} from '../../src/scene/town2Folk';

// Townsfolk who take a turn about the square, and where the hero stands to
// talk to anyone: pure rules, on the town's own map.

const scene = town2Scene();
const { map, things } = scene;
const start = centreOf(TOWN2_START_CELL, TOWN2_TILE);

/**
 * How far a figure reaches in front of its anchor toward someone it faces.
 * They always turn to face the hero, and facing left is the mirror of facing
 * right about the anchor, so it is the same on either side.
 */
const reach = (figure: Figure2): number => figure.drawn.right - FIGURE2_ANCHOR_X;

describe('where the hero stands to talk to someone', () => {
  it('reaches no further in front of him than HERO_FRONT, whatever he wears', () => {
    for (const id of Object.keys(ITEM_LAYERS2)) {
      const f = heroFigure2(DEFAULT_LOOK, [id]);
      expect(f.drawn.right - FIGURE2_ANCHOR_X, id).toBeLessThanOrEqual(HERO_FRONT);
    }
    const loaded = heroFigure2(DEFAULT_LOOK, ['brinebeards_anchor', 'iron_shield', 'tricorn']);
    expect(loaded.drawn.right - FIGURE2_ANCHOR_X).toBeLessThanOrEqual(HERO_FRONT);
  });

  it('is far enough off that the two never overlap, both facing each other, on ground he can stand on', () => {
    for (const p of STANDING2) {
      const thing = things.find((t) => t.id === p.id)!;
      const feet = feetOf(p);
      const figure = townsfolkFigure2(p.figure)!;
      expect(thing.stand, p.id).toHaveLength(thing.spots!.length);
      thing.stand!.forEach((at, i) => {
        const side = Math.sign(at.x - feet.x) as -1 | 1;
        // Level with them, on their side, on open ground reached straight from the tile beside them.
        expect(at.y, p.id).toBe(feet.y);
        expect(side, p.id).toBe(thing.spots![i]!.col - p.at.col);
        expect(isSolid(map, cellAt(at, TOWN2_TILE)), p.id).toBe(false);
        expect(clearLine(map, centreOf(thing.spots![i]!, TOWN2_TILE), at, STAND_HALF), p.id).toBe(
          true,
        );
        // They turn to him (`turnedTo`), he faces them: their fronts meet, with air between.
        const gap = Math.abs(at.x - feet.x);
        expect(gap, p.id).toBeGreaterThan(reach(figure) + HERO_FRONT);
        // And not so far that they stop turning to him (NOTICE2 is 54).
        expect(gap, p.id).toBeLessThan(54);
      });
    }
  });

  it('walks him there and turns him to face them, as they turn to him', () => {
    for (const p of STANDING2) {
      const thing = things.find((t) => t.id === p.id)!;
      let play: Play = tapAt(scene, startPlay(start), {
        x: thing.tap!.x + thing.tap!.w / 2,
        y: thing.tap!.y + thing.tap!.h / 2,
      });
      for (let i = 0; i < 1000 && !play.open; i++) play = advancePlay(scene, play, 50);
      expect(play.open, p.id).toBe(p.id);
      const feet = feetOf(p);
      expect(thing.stand, p.id).toContainEqual(play.walker.at);
      expect(play.facing, p.id).toBe(play.walker.at.x > feet.x ? 'left' : 'right');
    }
  });
});

describe('townsfolk who stroll', () => {
  it('walk a short route there and back, resting at each end, round and round', () => {
    for (const r of ROUNDS) {
      const home = centreOf(r.stroll.route[0]!, TOWN2_TILE);
      const far = centreOf(r.stroll.route.at(-1)!, TOWN2_TILE);
      const at = (ms: number) => strollAt(r, ms - r.stroll.startMs);
      expect(at(0)).toMatchObject({ at: home, walking: false });
      const out = (r.length * 1000) / r.stroll.speed;
      expect(at(r.stroll.restMs + out / 2).walking).toBe(true);
      expect(at(r.stroll.restMs + out + 1).at).toEqual(far);
      expect(at(r.stroll.restMs + out + 1).walking).toBe(false);
      expect(at(r.ms).at).toEqual(home);
      expect(at(r.ms * 3 + 1234)).toEqual(at(1234));
    }
  });

  it('start each walk on the first stride and face the way they go', () => {
    const r = ROUNDS[0]!;
    const set = r.stroll.restMs - r.stroll.startMs;
    expect(strollAt(r, set + 1).walked).toBeCloseTo((r.stroll.speed * 1) / 1000, 9);
    const across = r.out.find((l) => l.way === 'across')!;
    expect(across.side).toBe(across.to.x < across.from.x ? 'left' : 'right');
  });

  it('are where their clock says however the time is cut, and stand still while talked to', () => {
    const play = startPlay(start);
    let many = startFolk();
    for (let i = 0; i < 600; i++) many = folkOn(many, 1000 / 60, play);
    const one = folkOn(startFolk(), 10_000, play);
    strolling(many).forEach((s, i) => {
      const t = strolling(one)[i]!;
      expect(s.at.x).toBeCloseTo(t.at.x, 6);
      expect(s.at.y).toBeCloseTo(t.at.y, 6);
      expect(s.walked).toBeCloseTo(t.walked, 6);
    });
    const talking: Play = { ...play, open: STROLLERS2[0]!.id };
    expect(folkOn(one, 5000, talking)[0]).toBe(one[0]);
    expect(folkOn(one, 5000, talking)[1]).toBe(one[1]! + 5000);
    expect(strollOn(10, 20, true)).toBe(10);
  });

  it('keep clear of doors, of anything that can be tapped, and of anywhere someone is sent to stand', () => {
    const taps = things.filter((t) => t.tap).map((t) => [t.id, t.tap!] as [string, Box]);
    const overlaps = (a: Box, b: Box) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const spots = new Set(things.flatMap((t) => (t.spots ?? []).map((c) => `${c.col},${c.row}`)));
    for (const r of ROUNDS) {
      for (let ms = 0; ms < r.ms; ms += 100) {
        const s = strollAt(r, ms);
        const box = personTap(s.at);
        for (const [id, tap] of taps) expect(overlaps(box, tap), `${id} at ${ms}`).toBe(false);
        const cell = cellAt(s.at, TOWN2_TILE);
        expect(isSolid(map, cell)).toBe(false);
        expect(spots.has(`${cell.col},${cell.row}`), `${cell.col},${cell.row}`).toBe(false);
      }
    }
    expect(strolledTiles().size).toBeGreaterThan(8);
  });

  it('stop when tapped, and the hero walks up beside them, not over them, and they face each other', () => {
    for (let i = 0; i < STROLLERS2.length; i++) {
      // Somewhere mid-walk.
      const r = ROUNDS[i]!;
      let clocks: FolkClocks = startFolk().map(() => r.stroll.restMs + 1500 - r.stroll.startMs);
      const where = strolling(clocks)[i]!;
      expect(where.walking).toBe(true);
      const tap: Point = { x: where.at.x, y: where.at.y - 30 };
      expect(strollerAt(clocks, scene, tap, 44 / 3)).toBe(i);
      let play = talkToStroller(scene, startPlay(start), clocks, i);
      expect(play.heading).toBe(STROLLERS2[i]!.id);
      for (let k = 0; k < 1000 && !play.open; k++) {
        clocks = folkOn(clocks, 50, play);
        play = faceStroller(play, advancePlay(scene, play, 50), clocks);
      }
      expect(play.open).toBe(STROLLERS2[i]!.id);
      // They did not move while he came.
      const now = strolling(clocks)[i]!;
      expect(now.at).toEqual(where.at);
      const gap = Math.abs(play.walker.at.x - now.at.x);
      const figure = townsfolkFigure2(STROLLERS2[i]!.figure)!;
      expect(gap).toBeGreaterThan(reach(figure) + HERO_FRONT);
      expect(play.walker.at.y).toBeCloseTo(now.at.y, 6);
      // Face to face: he looks at them, they look at him, standing and breathing.
      expect(play.facing).toBe(play.walker.at.x > now.at.x ? 'left' : 'right');
      const shown = strollersNow(clocks, play, 0)[i]!;
      expect(shown.pose.walking).toBe(false);
      expect(shown.pose.facing).toBe(play.walker.at.x > now.at.x ? 'right' : 'left');
      // And walk on once the panel is closed.
      const after = folkOn(clocks, 1000, { ...play, open: null });
      expect(after[i]).toBe(clocks[i]! + 1000);
    }
  });

  it('give way to what is under a tap: a tap on a thing’s own box is the thing’s, not a passer-by’s', () => {
    const clocks = startFolk();
    const well = things.find((t) => t.id === 'well')!;
    const middle = { x: well.tap!.x + well.tap!.w / 2, y: well.tap!.y + well.tap!.h / 2 };
    expect(strollerAt(clocks, scene, middle, 44 / 3)).toBeNull();
    expect(thingAt(things, middle, 44 / 3)?.id).toBe('well');
    // Grown to a thumb, a stroller is still a target near their feet.
    const s = strolling(clocks)[0]!;
    const box = grown(personTap(s.at), 44 / 3);
    expect(strollerAt(clocks, scene, { x: box.x + 1, y: s.at.y - 30 }, 44 / 3)).toBe(0);
    expect(talkGap('market')).toBeGreaterThan(HERO_FRONT);
    expect(roundOf(STROLLERS2[0]!.stroll, TOWN2_TILE).ms).toBe(ROUNDS[0]!.ms);
  });
});

describe('passing each other', () => {
  /** The hero standing on the market woman's way west, between her turn and the far end. */
  const parked = startPlay(centreOf({ col: 4, row: 51 }, TOWN2_TILE));
  /** How far into anyone's room the hero is, where they are drawn round him: under 1 is inside. */
  const nearest = (clocks: FolkClocks, play: Play) =>
    Math.min(...strolling(clocks, play).map((s) => crowding(play.walker.at, s.at)));

  it('a stroller steps round a hero parked on her way, never into his room, and walks on', () => {
    let clocks: FolkClocks = startFolk();
    const seen: Point[] = [];
    let aside = 0;
    for (let t = 0; t < 120_000; t += 50) {
      clocks = folkOn(clocks, 50, parked);
      const s = strolling(clocks, parked)[0]!;
      const route = strolling(clocks)[0]!;
      // Never into his room, at any moment, where she is drawn.
      expect(crowding(s.at, parked.walker.at)).toBeGreaterThan(1 - 1e-6);
      // Stepped off her route only near him, and by no more than his room's depth and a bit.
      const off = Math.hypot(s.at.x - route.at.x, s.at.y - route.at.y);
      if (off > 0) {
        aside++;
        expect(Math.abs(route.at.x - parked.walker.at.x)).toBeLessThan(
          2 * PERSONAL.rx + PERSONAL.ry,
        );
        expect(off).toBeLessThanOrEqual(PASS_ROOM * PERSONAL.ry + 1e-9);
      }
      seen.push(s.at);
    }
    expect(aside).toBeGreaterThan(10);
    // She got past him to the far end of her way, and home again: no one stood stuck or turned back.
    const far = centreOf({ col: 2, row: 51 }, TOWN2_TILE);
    expect(seen.some((p) => p.x === far.x && p.y === far.y)).toBe(true);
    const home = centreOf(STROLLERS2[0]!.stroll.route[0]!, TOWN2_TILE);
    expect(seen.filter((p) => p.x === home.x && p.y === home.y).length).toBeGreaterThan(0);
  });

  it('steps round him too where her way goes up past him, onto open ground', () => {
    const across = startPlay(centreOf({ col: 6, row: 52 }, TOWN2_TILE));
    let clocks: FolkClocks = startFolk();
    let passed = 0;
    for (let t = 0; t < 60_000; t += 50) {
      clocks = folkOn(clocks, 50, across);
      const s = strolling(clocks, across)[0]!;
      expect(crowding(s.at, across.walker.at)).toBeGreaterThan(1 - 1e-6);
      expect(isSolid(map, cellAt(s.at, TOWN2_TILE))).toBe(false);
      if (s.walking && s.at.y < across.walker.at.y - PERSONAL.ry) passed++;
    }
    expect(passed).toBeGreaterThan(0);
  });

  it('steps round smoothly: a pixel or so a frame, as she walks', () => {
    let clocks: FolkClocks = startFolk();
    let last = strolling(clocks, parked)[0]!.at;
    for (let t = 0; t < 60_000; t += 16) {
      clocks = folkOn(clocks, 16, parked);
      const at = strolling(clocks, parked)[0]!.at;
      // 40 px/s is under a pixel a frame along her way; stepping aside adds little to it.
      expect(Math.hypot(at.x - last.x, at.y - last.y)).toBeLessThan(2);
      last = at;
    }
  });

  it('where the ground beside her way is blocked, stops at his room’s edge, waits, and turns back', () => {
    const r = ROUNDS[0]!;
    const hero = parked.walker.at;
    let clock = 0;
    let waited = 0;
    let turned = false;
    let last = strollAt(r, clock);
    for (let t = 0; t < 60_000; t += 50) {
      const went = strollPast(r, clock, 50, waited, hero, () => false);
      clock = went.clock;
      waited = went.waited;
      const s = strollAt(r, clock);
      expect(crowding(s.at, hero)).toBeGreaterThan(1 - 1e-6);
      if (s.walking && last.walking && s.side !== last.side && s.at.x > 2 * TOWN2_TILE + 12)
        turned = true;
      last = s;
    }
    expect(turned).toBe(true);
  });

  it('gives way the same however the time is cut', () => {
    for (const total of [3000, 9000, 20_000]) {
      let many: FolkClocks = startFolk();
      for (let t = 0; t < total; t += 16) many = folkOn(many, Math.min(16, total - t), parked);
      const one = folkOn(startFolk(), total, parked);
      strolling(many).forEach((s, i) => {
        const o = strolling(one)[i]!;
        expect(s.at.x).toBeCloseTo(o.at.x, 3);
        expect(s.at.y).toBeCloseTo(o.at.y, 3);
      });
    }
  });

  it('a hero walking through a stroller’s way goes round her, never into her, and gets there', () => {
    // Back and forth across the market woman's way while she strolls: nobody ends up inside anybody.
    const goals = [
      centreOf({ col: 4, row: 49 }, TOWN2_TILE),
      centreOf({ col: 4, row: 54 }, TOWN2_TILE),
    ];
    let play = parked;
    let clocks: FolkClocks = startFolk();
    let arrived = 0;
    for (let lap = 0; lap < 8; lap++) {
      play = tapAt(scene, play, goals[lap % 2]!);
      for (let t = 0; t < 20_000 && play.walker.path.length > 0; t += 50) {
        clocks = folkOn(clocks, 50, play);
        const others = strolling(clocks, play).map((s) => s.at);
        play = walkAmong((p, ms) => advancePlay(scene, p, ms), map, play, 50, others);
        expect(nearest(clocks, play)).toBeGreaterThan(1 - 1e-6);
      }
      if (play.walker.path.length === 0) arrived++;
      // A while standing still, as a player might; she gives way to him meanwhile.
      for (let s = 0; s < 3000; s += 50) {
        clocks = folkOn(clocks, 50, play);
        expect(nearest(clocks, play)).toBeGreaterThan(1 - 1e-6);
      }
    }
    expect(arrived).toBe(8);
  });

  it('turns a walker about where she is, going the other way', () => {
    const r = ROUNDS[0]!;
    const out = r.stroll.restMs - r.stroll.startMs + 1500;
    const here = strollAt(r, out);
    const back = strollAt(r, turnedAbout(r, out));
    expect(back.at.x).toBeCloseTo(here.at.x, 6);
    expect(back.at.y).toBeCloseTo(here.at.y, 6);
    expect(back.walking).toBe(true);
    expect(strollAt(r, turnedAbout(r, out) + 500).walked).toBeGreaterThan(back.walked);
    // Resting, nothing to turn.
    expect(turnedAbout(r, -r.stroll.startMs + 10)).toBe(-r.stroll.startMs + 10);
    expect(PERSONAL.rx).toBeLessThan(talkGap('market'));
  });
});
