/*
 * Thistlewood Burrow (wave 19): its rooms as written, and the light that is
 * its mechanic (`light.ts`), held rule by rule: lanterns lit by hand and put
 * out by moths, spore clouds that burn off in a pool, creepers that hold
 * still in it, the dark's cost, cap guards flanked or braced, a charge's
 * lane, the badger king under the ground; that every mark is fair and drawn
 * at full brightness in the dark; and that a run kept through a reload goes
 * on exactly as the unbroken run, lanterns and clouds and all.
 */
import { describe, expect, it } from 'vitest';
import {
  advanceBattle,
  alive,
  blocks,
  foeAt,
  inLight,
  inMark,
  litAt,
  stopChasing,
  targetFoe,
  tendLamp,
  TICK_MS,
  useAbility,
  type Battle,
  type Foe,
  type Telegraph,
} from '../../src/scene/battle';
import { BURROW, BURROW_ID } from '../../src/scene/burrow';
import { advanceRun, groundNow, placeOf, type Run } from '../../src/scene/dungeon';
import { dungeonById, dungeonScene, DUNGEON_IDS } from '../../src/scene/dungeons';
import { far } from '../../src/scene/dungeonMetrics';
import { FIGHT_COLOURS, fightArtFor, fightExtra, foePose, liftOf } from '../../src/scene/fightArt';
import { DAZZLE_HINT_MS, forgetLessons, lessonBlocks, stepLessons } from '../../src/scene/lessons';
import { foeKind } from '../../src/scene/foes';
import { foeArtId } from '../../src/scene/fromLaneB';
import { standable } from '../../src/scene/ground';
import { groundPixels, lampMask, litRoom, roomLook } from '../../src/scene/grottoArt';
import {
  CLOUD_BURN_MS,
  CLOUD_EVERY_MS,
  DARKER_LIGHTING,
  DAZZLE_MS,
  LAMP_SQUASH,
  LIGHT_MS,
  LIT_EDGE,
  LIT_WARN_MS,
  lampFoot,
  lampStand,
  lampUnder,
  poolMiddle,
  LAMP_POOL,
} from '../../src/scene/light';
import { DUNGEON2_LIGHT, foeSize2 } from '../../src/art/dungeonArt2';
import { POOL_EDGE } from '../../src/scene/grottoArt';
import { WALK_SPEED } from '../../src/scene/walker';
import { restoreRun, snapshotRun } from '../../src/scene/runSave';
import { findPath } from '../../src/scene/path';
import { cellAt, centreOf, isSolid, type Cell, type Point } from '../../src/scene/tileMap';
import {
  BURROW_DUNGEON,
  BURROW_ORDER,
  beginBurrow,
  burrowMonsters,
  burrowPolicy,
  decideBurrow,
  playBurrow,
  tier2,
} from './burrowBot';

const T = 24;
const D = BURROW_DUNGEON;

/** A run in `room` with the hero at `at`, the room's foes as given (each put where it is said, aware). */
function inRoom(
  room: string,
  at: Point,
  foes: Partial<Record<string, Partial<Foe>>> = {},
  seed = 3,
): Run {
  const run = beginBurrow(tier2(), seed);
  const b = run.battle!;
  const placed = b.foes.map((f) => {
    if (f.room !== room) return f;
    const change = foes[f.key];
    return change === undefined ? { ...f, diedAt: 0 } : { ...f, aware: true, ...change };
  });
  return {
    ...run,
    room,
    play: { ...run.play, walker: { at, path: [] } },
    battle: { ...b, foes: placed },
  };
}

/** The run `ms` on, the hero walking as his play has him. */
const on = (run: Run, ms: number): Run => {
  let r = run;
  for (let t = 0; t < ms; t += TICK_MS) r = advanceRun(D, r, r.play, TICK_MS);
  return r;
};

const keyOf = (run: Run, monster: string, nth = 0): string =>
  run.battle!.foes.filter((f) => f.room === run.room && f.monster === monster)[nth]!.key;

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

describe('the Burrow as written', () => {
  it('is five rooms in order, joined by their doors, its light a rule and no tide in it', () => {
    expect(DUNGEON_IDS).toContain(BURROW_ID);
    expect(dungeonById(BURROW_ID)!.id).toBe(BURROW_ID);
    expect(Object.keys(D.rooms)).toEqual(BURROW_ORDER);
    expect(BURROW.mechanic).toBe('light');
    BURROW_ORDER.forEach((id, i) => {
      const room = D.rooms[id]!;
      expect(room.ground.cols).toBe(34);
      expect(room.ground.tidal || room.ground.ownTide).toBe(false);
      // Lanterns, at least one to light by hand in every room.
      expect(room.ground.lamps.length).toBeGreaterThanOrEqual(3);
      expect(room.ground.lamps.some((l) => !l.lit)).toBe(true);
      const next = BURROW_ORDER[i + 1];
      if (next) expect(room.doors.some((d) => d.to === next)).toBe(true);
    });
    expect(D.rooms.sett!.end).not.toBeNull();
    expect(dungeonScene(BURROW_ID)!.lessons!.map((l) => l.id)).toEqual([
      'lantern',
      'moth',
      'guard',
      'dazzle',
    ]);
  });

  it('is one floor in every room: its doors, every foe, every landing and every lantern reached', () => {
    for (const room of Object.values(D.rooms)) {
      const map = room.map;
      const from = room.start ?? room.doors[0]!.inside;
      const reach = (c: Cell): boolean => findPath(map, from, c) !== null;
      for (const d of room.doors) expect(reach(d.inside), `${room.id} door ${d.letter}`).toBe(true);
      for (const f of room.foes) {
        expect(standable(map.tiles[f.at.row]![f.at.col]), `${room.id} ${f.monster}`).toBe(true);
        expect(reach(f.at), `${room.id} ${f.monster}`).toBe(true);
      }
      for (const s of room.spawns) expect(reach(cellAt(s, T)), `${room.id} spawn`).toBe(true);
      room.ground.lamps.forEach((l, i) => {
        const stand = lampStand(map, l.cell);
        expect(stand, `${room.id} lamp ${i}`).not.toBeNull();
        expect(reach(cellAt(stand!, T)), `${room.id} lamp ${i}`).toBe(true);
      });
      if (room.end) expect(reach(room.end)).toBe(true);
    }
  });

  it('starts the hero in the light of the lantern by the way in', () => {
    const run = beginBurrow(tier2(), 1);
    const place = placeOf(D, run);
    expect(inLight(run.battle!, place, run.play.walker.at)).toBe(true);
    expect(run.battle!.lamps!.hollow).toEqual(D.rooms.hollow!.ground.lamps.map((l) => l.lit));
  });

  it('draws its creatures with stand-ins of about their size until lane B draws them', () => {
    expect(dungeonScene(BURROW_ID)!.standIn).toBeTruthy();
    // Each has a picture to be drawn by, its own or a stand-in's, and sizes as data.
    for (const id of ['spore_puff', 'cap_guard', 'bramble_hound', 'lantern_moth', 'badger_king'])
      expect(foeSize2(foeArtId(id)), id).not.toBeNull();
  });
});

describe('the light', () => {
  const room = D.rooms.hollow!;
  const lamp = room.ground.lamps[0]!;

  it('lights a lantern’s pool out to its edge, as wide as lane B’s pools are drawn', () => {
    expect(LAMP_SQUASH).toBe(DUNGEON2_LIGHT.squash);
    expect(LIT_EDGE).toBe(POOL_EDGE);
    const run = beginBurrow(tier2(), 1);
    const b = run.battle!;
    const place = placeOf(D, run);
    const m = poolMiddle(lamp.cell);
    expect(litAt(b, place, m)).toBe(true);
    expect(litAt(b, place, { x: m.x + LAMP_POOL * LIT_EDGE - 1, y: m.y })).toBe(true);
    expect(litAt(b, place, { x: m.x + LAMP_POOL * LIT_EDGE + 1, y: m.y })).toBe(false);
    expect(litAt(b, place, { x: m.x, y: m.y + LAMP_POOL * LIT_EDGE * LAMP_SQUASH + 1 })).toBe(
      false,
    );
    // The pools drawn are the rules' own.
    const look = litRoom(room, lampMask(b.lamps!.hollow!));
    const { cells, data } = groundPixels(look, 0, false);
    const luma = (x: number, y: number): number => {
      const i = (Math.round(y) * cells.w + Math.round(x)) * 4;
      return data[i]! + data[i + 1]! + data[i + 2]!;
    };
    expect(luma(m.x + 20, m.y)).toBeGreaterThan(luma(m.x + LAMP_POOL * 2.5, m.y));
  });

  it('is lit by hand: he walks beside it, and it catches after a moment standing there', () => {
    const i = room.ground.lamps.findIndex((l) => !l.lit);
    const target = room.ground.lamps[i]!;
    const run = inRoom('hollow', centreOf({ col: 3, row: 8 }, T));
    const place = placeOf(D, run);
    // Tapped: a tap on its post (a thumb's box) is that lantern.
    expect(
      lampUnder(room.ground, { x: lampFoot(target.cell).x, y: lampFoot(target.cell).y - 20 }, 48),
    ).toBe(i);
    const tended = tendLamp(run.battle!, place, run.play, i);
    let r: Run = { ...run, battle: tended.battle, play: tended.play };
    expect(r.play.walker.path.length).toBeGreaterThan(0);
    expect(r.battle!.tend).toEqual({ lamp: i, until: null });
    // Walking there, then standing lighting it.
    for (let t = 0; t < 20_000 && r.battle!.tend?.until == null && r.battle!.tend; t += TICK_MS)
      r = on(r, TICK_MS);
    const until = r.battle!.tend!.until!;
    expect(until - r.battle!.clock).toBe(LIGHT_MS);
    expect(distance(r.play.walker.at, lampFoot(target.cell))).toBeLessThanOrEqual(far(30));
    r = on(r, LIGHT_MS - TICK_MS);
    expect(r.battle!.lamps!.hollow![i]).toBe(false);
    r = on(r, TICK_MS);
    expect(r.battle!.lamps!.hollow![i]).toBe(true);
    expect(r.battle!.tend).toBeUndefined();
    expect(r.battle!.effects.some((e) => e.kind === 'lit')).toBe(true);
    // A lantern burning: tapping it changes nothing.
    const again = tendLamp(r.battle!, place, r.play, i);
    expect(again.battle).toBe(r.battle);
  });

  it('is put out of his hands by a blow, or by any other order he gives', () => {
    const i = room.ground.lamps.findIndex((l) => !l.lit);
    const stand = lampStand(room.map, room.ground.lamps[i]!.cell)!;
    const run = inRoom('hollow', stand);
    const place = placeOf(D, run);
    let r: Run = { ...run, ...tendLamp(run.battle!, place, run.play, i) };
    r = on(r, TICK_MS);
    expect(r.battle!.tend!.until).not.toBeNull();
    // A tap on the ground: given up.
    expect(stopChasing(r.battle!).tend).toBeUndefined();
    // A puff beside him, swinging: the match goes out at its first blow that lands.
    const puff = keyOf(r, 'spore_puff');
    const foes = r.battle!.foes.map((f) =>
      f.key === puff
        ? {
            ...f,
            diedAt: null,
            aware: true,
            at: { x: stand.x + 20, y: stand.y },
            engaged: true,
            blowMs: 0,
            heavyMs: 99_999,
          }
        : f,
    );
    r = { ...r, battle: { ...r.battle!, foes } };
    let hit = false;
    for (let t = 0; t < 30_000 && !hit; t += TICK_MS) {
      r = on(r, TICK_MS);
      hit = r.battle!.effects.some((e) => e.kind === 'interrupted');
      // Lit before a blow landed (they miss): out again, and he starts over.
      if (r.battle!.lamps!.hollow![i]) {
        const lamps = {
          ...r.battle!.lamps!,
          hollow: r.battle!.lamps!.hollow!.map((l, j) => l && j !== i),
        };
        r = { ...r, battle: { ...r.battle!, lamps } };
      }
      if (!r.battle!.tend) r = { ...r, ...tendLamp(r.battle!, place, r.play, i) };
    }
    expect(hit).toBe(true);
  });

  it('holds a creeper still in a lantern’s pool, and lets it creep in the dark', () => {
    const place = placeOf(D, beginBurrow(tier2(), 1));
    const lit = poolMiddle(lamp.cell);
    const hero = { x: lit.x + 30, y: lit.y + 10 };
    const run = inRoom('hollow', hero);
    const puff = keyOf(run, 'spore_puff');
    const atLight = { x: lit.x + 60, y: lit.y };
    expect(litAt(run.battle!, place, atLight)).toBe(true);
    const still = on(
      {
        ...run,
        battle: {
          ...run.battle!,
          foes: run.battle!.foes.map((f) =>
            f.key === puff ? { ...f, diedAt: null, aware: true, at: atLight, heavyMs: 99_999 } : f,
          ),
        },
      },
      1500,
    );
    expect(still.battle!.foes.find((f) => f.key === puff)!.at).toEqual(atLight);
    // In the dark, it comes on.
    const dark = { x: 26 * T, y: 9 * T };
    expect(litAt(run.battle!, place, dark)).toBe(false);
    const moved = on(
      {
        ...run,
        battle: {
          ...run.battle!,
          foes: run.battle!.foes.map((f) =>
            f.key === puff ? { ...f, diedAt: null, aware: true, at: dark, heavyMs: 99_999 } : f,
          ),
        },
      },
      1500,
    );
    expect(distance(moved.battle!.foes.find((f) => f.key === puff)!.at, dark)).toBeGreaterThan(10);
  });

  it('draws a moth to a burning lantern, which it puts out unless a blow lands on it first', () => {
    const gallery = D.rooms.gallery!;
    const burning = gallery.ground.lamps.findIndex((l) => l.lit);
    const run = inRoom('gallery', centreOf({ col: 2, row: 6 }, T), {});
    const moth = keyOf(run, 'lantern_moth');
    let r: Run = {
      ...run,
      battle: {
        ...run.battle!,
        foes: run.battle!.foes.map((f) =>
          f.key === moth ? { ...f, diedAt: null, aware: false } : f,
        ),
      },
    };
    // It wakes to the light, flies to it and starts on it.
    for (let t = 0; t < 20_000 && !r.battle!.foes.find((f) => f.key === moth)!.snuff; t += TICK_MS)
      r = on(r, TICK_MS);
    const snuff = r.battle!.foes.find((f) => f.key === moth)!.snuff!;
    expect(snuff.lamp).toBe(burning);
    expect(
      liftOf(
        gallery,
        r.battle!.foes.find((f) => f.key === moth)!,
      ),
    ).toBeGreaterThan(0);
    const snuffMs = foeKind('lantern_moth').seeksLight!.snuffMs;
    expect(snuff.until - r.battle!.clock).toBe(snuffMs);
    const before = on(r, snuffMs - TICK_MS);
    expect(before.battle!.lamps!.gallery![burning]).toBe(true);
    const after = on(before, TICK_MS);
    expect(after.battle!.lamps!.gallery![burning]).toBe(false);
    expect(after.battle!.effects.some((e) => e.kind === 'snuffed')).toBe(true);
  });

  it('leaves a cloud where a puff bursts: it stings each second, and burns off in the light', () => {
    const lit = poolMiddle(lamp.cell);
    const dark = { x: 26 * T, y: 9 * T };
    for (const [where, burns] of [
      [dark, false],
      [{ x: lit.x + 30, y: lit.y }, true],
    ] as const) {
      const run = inRoom('hollow', where);
      const puff = keyOf(run, 'spore_puff');
      // Struck down where he stands: it bursts round him.
      let r: Run = {
        ...run,
        battle: {
          ...run.battle!,
          foes: run.battle!.foes.map((f) =>
            f.key === puff
              ? { ...f, diedAt: null, hp: 1, at: { x: where.x + 20, y: where.y }, heavyMs: 99_999 }
              : f,
          ),
        },
      };
      for (let t = 0; t < 30_000 && !r.battle!.clouds; t += TICK_MS) r = on(r, TICK_MS);
      const cloud = r.battle!.clouds![0]!;
      expect(cloud.room).toBe('hollow');
      const hp = r.battle!.hp;
      r = on(r, CLOUD_EVERY_MS + TICK_MS);
      if (!burns) {
        expect(r.battle!.hp).toBeLessThan(hp);
        expect(r.battle!.clouds![0]!.until).toBe(cloud.until);
      } else {
        expect(r.battle!.clouds?.[0]?.burning ?? true).toBe(true);
        r = on(r, CLOUD_BURN_MS);
        expect(r.battle!.clouds).toBeUndefined();
      }
    }
  });

  it('makes lighting slower on a darker day, and pools no smaller', () => {
    const run = beginBurrow(tier2(), 1, { id: 'deep_gloom', effects: { darker: true } });
    expect(run.battle!.mods?.lighting).toBe(DARKER_LIGHTING);
    expect(DARKER_LIGHTING).toBeGreaterThan(1);
    expect((LIGHT_MS * DARKER_LIGHTING) % TICK_MS).toBe(0);
    expect(run.battle!.lamps!.hollow).toEqual(D.rooms.hollow!.ground.lamps.map((l) => l.lit));
    // Elsewhere a darker day is the drawing's alone, as it was.
    expect(LIT_WARN_MS % TICK_MS).toBe(0);
  });
});

describe('the cast', () => {
  it('blocks a guard’s front, and not its back, nor its staggered front', () => {
    const run = inRoom('watch', centreOf({ col: 10, row: 5 }, T));
    const g = run.battle!.foes.find((f) => f.monster === 'cap_guard' && f.room === 'watch')!;
    const guard: Foe = { ...g, facing: 'left', at: { x: 300, y: 150 } };
    const b = run.battle!;
    expect(blocks(b, guard, { x: 260, y: 150 })).toBe(true);
    expect(blocks(b, guard, { x: 340, y: 150 })).toBe(false);
    expect(blocks(b, { ...guard, staggered: b.clock + 1000 }, { x: 260, y: 150 })).toBe(false);
    expect(blocks(b, { ...guard, staggered: b.clock }, { x: 260, y: 150 })).toBe(true);
  });

  it('braced, staggers a guard’s cap aside: its next blows land', () => {
    const hero = centreOf({ col: 10, row: 6 }, T);
    let run = inRoom('watch', hero);
    const key = keyOf(run, 'cap_guard');
    run = {
      ...run,
      battle: {
        ...run.battle!,
        foes: run.battle!.foes.map((f) =>
          f.key === key
            ? {
                ...f,
                diedAt: null,
                aware: true,
                facing: 'left',
                at: { x: hero.x + 36, y: hero.y },
                heavyMs: 0,
              }
            : f,
        ),
      },
    };
    const place = placeOf(D, run);
    let r = run;
    for (let t = 0; t < 10_000 && !r.battle!.foes.find((f) => f.key === key)!.heavy; t += TICK_MS)
      r = on(r, TICK_MS);
    expect(r.battle!.foes.find((f) => f.key === key)!.heavy).not.toBeNull();
    const braced = useAbility(r.battle!, place, r.play, 1);
    r = { ...r, battle: braced.battle, play: braced.play };
    for (let t = 0; t < 4000 && r.battle!.foes.find((f) => f.key === key)!.heavy; t += TICK_MS)
      r = on(r, TICK_MS);
    const g = r.battle!.foes.find((f) => f.key === key)!;
    expect(g.staggered).toBeGreaterThan(r.battle!.clock);
    expect(blocks(r.battle!, g, r.play.walker.at)).toBe(false);
  });

  it('charges a hound down a lane to the wall, where it sticks; a charge ending at a lantern puts it out', () => {
    const hero = centreOf({ col: 12, row: 6 }, T);
    let run = inRoom('run', hero);
    const key = keyOf(run, 'bramble_hound');
    run = {
      ...run,
      battle: {
        ...run.battle!,
        foes: run.battle!.foes.map((f) =>
          f.key === key
            ? { ...f, diedAt: null, aware: true, at: { x: hero.x + 120, y: hero.y }, heavyMs: 0 }
            : f,
        ),
      },
    };
    let r = run;
    for (let t = 0; t < 10_000 && !r.battle!.foes.find((f) => f.key === key)!.heavy; t += TICK_MS)
      r = on(r, TICK_MS);
    const lane = r.battle!.foes.find((f) => f.key === key)!.heavy!;
    expect(lane.shape).toBe('lane');
    expect(inMark(lane, r.play.walker.at)).toBe(true);
    // It runs on past him to the far wall.
    expect(lane.to!.x).toBeLessThan(hero.x - far(20));
    const map = groundNow(D, r);
    expect(isSolid(map, cellAt({ x: lane.to!.x - T, y: lane.to!.y }, T))).toBe(true);
    // He stays in it: it lands on him, and the hound is stuck where it ended.
    const hp = r.battle!.hp;
    for (let t = 0; t < 5000 && r.battle!.foes.find((f) => f.key === key)!.heavy; t += TICK_MS)
      r = {
        ...on({ ...r, play: { ...r.play, walker: { at: r.play.walker.at, path: [] } } }, TICK_MS),
      };
    const h = r.battle!.foes.find((f) => f.key === key)!;
    expect(r.battle!.hp).toBeLessThan(hp);
    expect(h.at).toEqual(lane.to);
    expect(h.stuck! - r.battle!.clock).toBe(foeKind('bramble_hound').heavy!.stuckMs!);
  });

  it('takes the king under the ground in his second phase, out of reach and out of sight', () => {
    const hero = centreOf({ col: 16, row: 7 }, T);
    let run = inRoom('sett', hero);
    const key = keyOf(run, 'badger_king');
    const def = run.battle!.monsters.badger_king!;
    run = {
      ...run,
      battle: {
        ...run.battle!,
        foes: run.battle!.foes.map((f) =>
          f.key === key
            ? {
                ...f,
                diedAt: null,
                aware: true,
                hp: Math.floor(def.hp * 0.6),
                at: { x: hero.x + 40, y: hero.y },
              }
            : f,
        ),
      },
    };
    let r = on(run, TICK_MS * 2);
    const king = r.battle!.foes.find((f) => f.key === key)!;
    expect(king.phase).toBe(2);
    expect(king.under).toBe(true);
    expect(foeAt(r.battle!, 'sett', king.at, 48)).toBeNull();
    expect(targetFoe(r.battle!, placeOf(D, r), r.play, key).battle).toBe(r.battle);
    // His court comes.
    expect(r.battle!.foes.filter((f) => f.room === 'sett' && alive(f)).length).toBeGreaterThan(1);
    // Marked under him (he stands in the dark here)...
    for (let t = 0; t < 10_000 && !r.battle!.foes.find((f) => f.key === key)!.heavy; t += TICK_MS)
      r = on(r, TICK_MS);
    const mark: Telegraph = r.battle!.foes.find((f) => f.key === key)!.heavy!;
    expect(mark.erupt).toBe(true);
    expect(inLight(r.battle!, placeOf(D, r), r.play.walker.at)).toBe(false);
    expect(distance(mark.at, r.play.walker.at)).toBeLessThan(1);
    expect(mark.dazzles).toBeUndefined();
  });

  it('brings the king up at the lantern lighting the hero, which he puts out, and dazzles him there', () => {
    const sett = D.rooms.sett!;
    const lit = sett.ground.lamps.findIndex((l) => l.lit);
    const m = poolMiddle(sett.ground.lamps[lit]!.cell);
    const hero = { x: m.x + 60, y: m.y + 10 };
    let run = inRoom('sett', hero);
    expect(inLight(run.battle!, placeOf(D, run), hero)).toBe(true);
    const key = keyOf(run, 'badger_king');
    run = {
      ...run,
      battle: {
        ...run.battle!,
        foes: run.battle!.foes.map((f) =>
          f.key === key
            ? {
                ...f,
                diedAt: null,
                aware: true,
                phase: 2,
                under: true,
                volleyMs: 0,
                at: { x: 400, y: 200 },
              }
            : f,
        ),
      },
    };
    let r = on(run, TICK_MS);
    const mark = r.battle!.foes.find((f) => f.key === key)!.heavy!;
    expect(mark.dazzles).toBe(true);
    expect(inMark(mark, lampFoot(sett.ground.lamps[lit]!.cell))).toBe(true);
    for (let t = 0; t < 5000 && r.battle!.foes.find((f) => f.key === key)!.heavy; t += TICK_MS)
      r = on(r, TICK_MS);
    const king = r.battle!.foes.find((f) => f.key === key)!;
    expect(king.under).toBeUndefined();
    expect(r.battle!.lamps!.sett![lit]).toBe(false);
    expect(king.stuck! - r.battle!.clock).toBeGreaterThan(DAZZLE_MS - 2 * TICK_MS);

    // Taught on screen: he reels where he stands (hurt and not, by turns), the lantern he came up
    // under flares as it goes out, and the first time, a hint says why he came up there.
    const kind = foeKind('badger_king');
    const poses = new Set(
      [0, 220, 440, 660].map((dt) => foePose(king, r.battle!.clock + dt, 2800, kind).pose),
    );
    expect(poses).toEqual(new Set(['hurt', 'idle']));
    const look = roomLook(litRoom(sett, lampMask(r.battle!.lamps!.sett!)));
    const extra = fightExtra(D, r, look, fightArtFor(look));
    const flame = lampFoot(sett.ground.lamps[lit]!.cell);
    expect(
      extra.boxes.some(
        (b) =>
          b.x <= flame.x &&
          flame.x <= b.x + b.w &&
          b.y <= flame.y - 30 &&
          flame.y - 30 <= b.y + b.h,
      ),
    ).toBe(true);
    forgetLessons();
    const lessons = dungeonScene(BURROW_ID)!.lessons!;
    const shown = stepLessons(
      { shown: null, done: ['lantern', 'moth', 'guard'], off: false },
      lessons,
      D,
      r,
    );
    expect(shown.shown).toBe('dazzle');
    expect(lessonBlocks(shown, lessons)).toBe(false);
    // Up long enough to be read, though the dazzle passes.
    const after = on(r, DAZZLE_MS + TICK_MS);
    expect(stepLessons(shown, lessons, D, after, 1000).shown).toBe('dazzle');
    const read = stepLessons(shown, lessons, D, after, DAZZLE_HINT_MS);
    expect(stepLessons(read, lessons, D, after, 16).shown).toBeNull();
  });

  it('counts a lantern lit before the hint was due as learned: the hint never comes', () => {
    forgetLessons();
    const lessons = dungeonScene(BURROW_ID)!.lessons!;
    const room = D.rooms.hollow!;
    // He walks straight from the light he came in by to a lantern and lights it.
    const i = room.ground.lamps.findIndex((l) => !l.lit);
    let run = beginBurrow(tier2(), 2);
    const start = { shown: null, done: [], off: false };
    expect(stepLessons(start, lessons, D, run).shown).toBeNull();
    const tended = tendLamp(run.battle!, placeOf(D, run), run.play, i);
    run = { ...run, battle: tended.battle, play: tended.play };
    const state = stepLessons(start, lessons, D, run);
    expect(state.done).toContain('lantern');
    // Out in the dark later, with something awake: still nothing shown for it.
    expect(state.shown).not.toBe('lantern');
  });
});

describe('fair in the dark', () => {
  it('draws every mark in its own full colours over a dark room, the foe making it dimmed or not', () => {
    const hero = { x: 26 * T, y: 8 * T };
    let run = inRoom('hollow', hero);
    const key = keyOf(run, 'spore_puff');
    run = {
      ...run,
      battle: {
        ...run.battle!,
        foes: run.battle!.foes.map((f) =>
          f.key === key
            ? {
                ...f,
                diedAt: null,
                at: { x: hero.x + 20, y: hero.y },
                heavy: {
                  at: { x: hero.x + 20, y: hero.y },
                  radius: 45,
                  shape: 'circle',
                  from: 0,
                  lands: 1400,
                  origin: null,
                  damage: 9,
                  spores: 6000,
                },
              }
            : f,
        ),
      },
    };
    expect(inLight(run.battle!, placeOf(D, run), hero)).toBe(false);
    const look = roomLook(litRoom(D.rooms.hollow!, lampMask(run.battle!.lamps!.hollow!)));
    const extra = fightExtra(D, run, look, fightArtFor(look));
    const filled = new Set<string>();
    const ctx = new Proxy(
      {},
      {
        get: (_t, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}),
        set: (_t, k, v) => {
          if (k === 'fillStyle') filled.add(String(v));
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    extra.ground!(ctx, {} as never);
    // The spores' mark in the fight's own greens, edged in its ink: never taken toward the night.
    expect(filled.has(FIGHT_COLOURS.spore2)).toBe(true);
    expect(filled.has(FIGHT_COLOURS.ink)).toBe(true);
  });

  it('warns of every heavy blow of the Burrow long enough to walk out of its worst spot', () => {
    const walk = far(WALK_SPEED);
    // A charge's lane: its worst spot is its middle line, its half-width from either edge.
    const hound = foeKind('bramble_hound').heavy!;
    expect(hound.warnMs).toBeGreaterThanOrEqual((1000 * hound.radius) / walk + 500);
    // The king coming up: a circle.
    const burrow = foeKind('badger_king').boss!.burrow!;
    expect(burrow.warnMs).toBeGreaterThanOrEqual((1000 * burrow.radius) / walk + 500);
    for (const ms of [burrow.warnMs, burrow.everyMs, burrow.firstMs, burrow.upMs, DAZZLE_MS])
      expect(ms % TICK_MS).toBe(0);
    for (const id of ['spore_puff', 'cap_guard', 'bramble_hound', 'badger_king']) {
      const h = foeKind(id).heavy!;
      expect((h.warnMs + LIT_WARN_MS) % TICK_MS, id).toBe(0);
    }
  });
});

describe('a Burrow run kept through a reload', () => {
  const step = (run: Run): Run => {
    const decided = decideBurrow(run);
    return advanceRun(D, decided, decided.play, TICK_MS);
  };
  const throughJson = (run: Run): Run => restoreRun(JSON.parse(JSON.stringify(snapshotRun(run))))!;

  it('goes on exactly as the unbroken run would, its lanterns and clouds and all', () => {
    burrowPolicy(400, true);
    let checked = 0;
    for (const seed of [11, 23]) {
      let run = beginBurrow(tier2(), seed);
      // On until a lantern has been lit by hand and a cloud hangs in the air.
      for (let i = 0; i < 12_000 && !run.finished; i++) {
        run = step(run);
        const b = run.battle!;
        const lit = Object.entries(b.lamps!).some(([room, l]) =>
          l.some((on, j) => on && !D.rooms[room]!.ground.lamps[j]!.lit),
        );
        if (lit && b.clouds && b.clouds.length > 0) break;
      }
      expect(run.battle!.clouds?.length ?? 0).toBeGreaterThan(0);
      let restored = throughJson(run);
      expect(restored).toEqual(run);
      for (let i = 0; i < 900 && !run.finished; i++) {
        run = step(run);
        restored = step(restored);
      }
      expect(restored).toEqual(run);
      expect(restored.battle!.lamps).toEqual(run.battle!.lamps);
      checked++;
    }
    expect(checked).toBe(2);
  });

  it('comes to the same thing however its time is cut', () => {
    burrowPolicy(0, true);
    let run = beginBurrow(tier2(), 5);
    for (let i = 0; i < 1500; i++) run = step(run);
    const place = placeOf(D, run);
    const b: Battle = run.battle!;
    const whole = advanceBattle(b, place, run.play, 2400);
    let cut = { battle: b, play: run.play };
    for (const ms of [16, 33, 51, 300, 1000, 1000])
      cut = advanceBattle(cut.battle, place, cut.play, ms);
    expect(cut.battle).toEqual(whole.battle);
    expect(cut.play).toEqual(whole.play);
  });
});

describe('what a fight in the Burrow pays', () => {
  it('pays experience at tier 2’s rate (`foeXp`): each blow its foe’s `xpPercent`', () => {
    // The same fight twice, once by the tables' rows (270 a hundred) and once with the rate left
    // out: the fight is the same, blow for blow; only what each blow pays differs.
    const rows = burrowMonsters();
    const cast = ['spore_puff', 'lantern_moth', 'cap_guard', 'bramble_hound', 'badger_king'];
    for (const id of cast) expect(rows[id]!.xpPercent).toBe(270);
    const plainRows = Object.fromEntries(
      Object.entries(rows).map(([id, m]) => [id, { ...m, xpPercent: undefined }]),
    );
    const tier = playBurrow(tier2(), 7919, { reactMs: 400, light: true, monsters: rows });
    const plain = playBurrow(tier2(), 7919, { reactMs: 400, light: true, monsters: plainRows });
    expect(tier.ms).toBe(plain.ms);
    expect(tier.kills).toBe(plain.kills);
    const xp = (o: typeof tier) => o.run.battle!.tally.xp;
    for (const skill of ['melee', 'defence', 'vitality']) {
      const paid = xp(tier)[skill]!;
      const base = xp(plain)[skill]!;
      expect(base).toBeGreaterThan(1000);
      // Rounded once a blow: within a blow's rounding of 2.7 times as much.
      expect(paid / base).toBeGreaterThan(2.68);
      expect(paid / base).toBeLessThan(2.72);
    }
  }, 120_000);
});
