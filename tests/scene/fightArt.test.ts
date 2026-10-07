import { describe, expect, it } from 'vitest';
import { STRIKE2_FRAMES, STRIKE2_HIT_FRAME, WALK2_STRIDE } from '../../src/art/character2';
import { DEFAULT_LOOK as DEFAULT_LOOK2 } from '../../src/art/character';
import { POSES2, STRIKE_POSES2, heroFigure2, poseKey } from '../../src/scene/figures2';
import { foeFrames2 } from '../../src/art/dungeonArt2';
import { TICK_MS, advanceBattle, type Foe, type Telegraph } from '../../src/scene/battle';
import { GROTTO_CAST } from '../../src/scene/cast';
import { advanceRun, placeOf, type Run } from '../../src/scene/dungeon';
import {
  CREATURE_STRIDE,
  FALL_MS,
  FIGHT_COLOURS,
  FLASH_MS,
  HURT_MS,
  fightArtFor,
  fightExtra,
  foePose,
  STRIKE2_FRAME_MS,
  heroStrikePose,
  liftOf,
} from '../../src/scene/fightArt';
import { foeKind } from '../../src/scene/foes';
import { perchLift, propsOf, roomLook } from '../../src/scene/grottoArt';
import { begin, decide, GROTTO_DUNGEON, prepared } from './grottoBot';

/** A canvas that only counts the pixels filled through it, by colour. */
function counting(): { ctx: CanvasRenderingContext2D; filled: Map<string, Set<string>> } {
  const filled = new Map<string, Set<string>>();
  let colour = '';
  const ctx = new Proxy(
    {},
    {
      get(_t, k) {
        if (k === 'fillRect')
          return (x: number, y: number, w: number, h: number) => {
            const set = filled.get(colour) ?? new Set<string>();
            for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) set.add(`${x + i} ${y + j}`);
            filled.set(colour, set);
          };
        if (k === 'measureText') return () => ({ width: 10 });
        return () => {};
      },
      set(_t, k, v) {
        if (k === 'fillStyle') colour = String(v);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, filled };
}

const cove = GROTTO_DUNGEON.rooms.cove!;

/** The ground the fight draws with one heavy attack marked, half way through its warning. */
function marked(heavy: Telegraph) {
  const run = begin(prepared(), 1);
  const b = run.battle!;
  const boss = b.foes.find((f) => f.monster === 'brinebeard')!;
  const r = {
    ...run,
    room: 'cove',
    battle: {
      ...b,
      clock: (heavy.from + heavy.lands) / 2,
      foes: b.foes.map((f) => (f === boss ? { ...f, aware: true, heavy, at: heavy.at } : f)),
    },
  };
  const look = roomLook(cove);
  const { ctx, filled } = counting();
  fightExtra(GROTTO_DUNGEON, r, look, fightArtFor(look)).ground!(ctx, {} as never);
  return filled;
}

describe('the marks on the ground', () => {
  it('draws the anchor’s sweep over the whole of its wedge, and not behind him', () => {
    const at = { x: 450, y: 150 };
    const spread = (210 * Math.PI) / 180;
    const radius = foeKind('brinebeard').heavy!.radius;
    const filled = marked({
      at,
      radius,
      shape: 'arc',
      facing: Math.PI,
      spread,
      from: 0,
      lands: 1600,
      origin: null,
      damage: 1,
    });
    // The wedge's faint fill is the steel step; every pixel of it is in the wedge, and it nearly fills it.
    const steel = filled.get(FIGHT_COLOURS.metal1)!;
    const wedge = (spread / (2 * Math.PI)) * Math.PI * radius * radius;
    expect(steel.size).toBeGreaterThan(wedge * 0.9);
    expect(steel.size).toBeLessThan(wedge * 1.1);
    // Straight behind him (he faces left): nothing.
    expect(steel.has(`${at.x + 60} ${at.y}`)).toBe(false);
    expect(steel.has(`${at.x - 60} ${at.y}`)).toBe(true);
  });
});

describe('who stands how', () => {
  const run = begin(prepared(), 3);
  const deckhand = run.battle!.foes.find((f) => f.monster === 'deckhand')!;
  const crab = run.battle!.foes.find((f) => f.monster === 'giant_crab')!;
  const speed = GROTTO_CAST.deckhand!.speedMs;
  const pose = (f: Foe, clock: number) =>
    foePose(f, clock, GROTTO_CAST[f.monster]!.speedMs, foeKind(f.monster));

  it('takes each pose from the foe’s state, in the order the art lane gives them', () => {
    const at = 10_000;
    expect(pose(deckhand, at).pose).toBe('idle');
    // Struck: the flash of the blow, then the recoil, then itself again.
    const struck = { ...deckhand, struckAt: at };
    expect(pose(struck, at).pose).toBe('flash');
    expect(pose(struck, at + FLASH_MS).pose).toBe('hurt');
    expect(pose(struck, at + HURT_MS).pose).toBe('idle');
    // Winding up while a heavy blow is marked; the blow as it lands.
    const mark = {
      at: crab.at,
      radius: 1,
      shape: 'circle',
      from: at,
      lands: at + 1700,
      origin: null,
      damage: 1,
    } as const;
    expect(pose({ ...crab, heavy: mark }, at).pose).toBe('windup');
    const slammed = { ...crab, aware: true, heavyMs: foeKind('giant_crab').heavy!.everyMs };
    expect(pose(slammed, at).pose).toBe('strike');
    // An ordinary blow just dealt: its timer just set going again.
    expect(pose({ ...deckhand, engaged: true, blowMs: speed }, at).pose).toBe('strike');
    expect(pose({ ...deckhand, engaged: true, blowMs: speed - 600 }, at).pose).toBe('idle');
    // Down: buckling, then down.
    const down = { ...deckhand, hp: 0, diedAt: at };
    expect(pose(down, at)).toMatchObject({ pose: 'fall', frame: 0 });
    expect(pose(down, at + FALL_MS / 2)).toMatchObject({ pose: 'fall', frame: 1 });
    // Facing as it faces, and the captain in his phase.
    expect(pose({ ...deckhand, facing: 'right' }, at).facing).toBe('right');
    const boss = run.battle!.foes.find((f) => f.monster === 'brinebeard')!;
    expect(pose({ ...boss, phase: 3 }, at).phase).toBe(3);
  });

  it('walks a frame for each stride of ground: the hero’s stride for people, its own for creatures', () => {
    const walking = (f: Foe, walked: number) => pose({ ...f, path: [{ x: 0, y: 0 }], walked }, 0);
    const people = foeFrames2('deckhand')!.walk;
    for (let i = 0; i < 2 * people; i++)
      expect(walking(deckhand, i * WALK2_STRIDE + 0.5)).toMatchObject({
        pose: 'walk',
        frame: i % people,
      });
    const creatures = foeFrames2('giant_crab')!.walk;
    expect(walking(crab, 3 * CREATURE_STRIDE + 1).frame).toBe(3 % creatures);
  });

  it('counts the ground walked the same in one step as in many', () => {
    // A room's fight, the scripted hero going in: a decision a tenth of a second, the time
    // between in one step against frames of 16 ms.
    let a: Run = begin(prepared(), 9);
    let b: Run = a;
    for (let t = 0; t < 12_000; t += 100) {
      a = decide(a);
      b = decide(b);
      a = advanceRun(GROTTO_DUNGEON, a, a.play, 100);
      for (let s = 0; s < 100; s += 16)
        b = advanceRun(GROTTO_DUNGEON, b, b.play, Math.min(16, 100 - s));
    }
    const walked = (r: Run) => r.battle!.foes.map((f) => f.walked);
    expect(walked(a).some((w) => w > 0)).toBe(true);
    walked(a).forEach((w, i) => expect(w).toBeCloseTo(walked(b)[i]!, 6));
    expect(a.battle!.seed).toBe(b.battle!.seed);
  });

  it('puts the parrot on its post’s seat, and down on the ground beside the hero', () => {
    const bridge = GROTTO_DUNGEON.rooms.bridge!;
    const parrot = run.battle!.foes.find((f) => f.monster === 'ships_parrot')!;
    const perch = bridge.perches[0]!;
    const post = propsOf(bridge).find((p) => p.id === 'perch')!;
    const seat = post.topLeft.y + post.art.seat!.y;
    expect(liftOf(bridge, parrot)).toBe(perchLift(bridge, perch));
    expect(perch.y - liftOf(bridge, parrot)).toBe(seat);
    expect(liftOf(bridge, { ...parrot, flight: { mode: 'down', perch: 0, until: 0 } })).toBe(0);
  });

  it('strikes with lane B’s blow: its blow frame as the blow falls, then the recovery, then none', () => {
    const b = run.battle!;
    const hit: Run = {
      ...run,
      battle: {
        ...b,
        clock: 5000,
        target: null,
        effects: [{ kind: 'hit', at: { x: 0, y: 0 }, amount: 3, on: 'foe', from: 5000 }],
      },
    };
    const at = (clock: number) =>
      heroStrikePose(GROTTO_DUNGEON, { ...hit, battle: { ...hit.battle!, clock } });
    expect(at(5000)).toEqual({
      walking: false,
      striking: true,
      facing: run.play.facing,
      frame: STRIKE2_HIT_FRAME,
    });
    expect(at(5000 + STRIKE2_FRAME_MS)!.frame).toBe(STRIKE2_HIT_FRAME + 1);
    expect(at(5000 + (STRIKE2_FRAMES - STRIKE2_HIT_FRAME) * STRIKE2_FRAME_MS)).toBeNull();
    // No blow, no target: he walks or breathes.
    expect(heroStrikePose(GROTTO_DUNGEON, run)).toBeNull();
  });

  it('draws each frame of the blow from lane B’s pictures, in every facing', () => {
    const fig = heroFigure2(DEFAULT_LOOK2, ['iron_sword']);
    const standing = fig.pixels({ walking: false, facing: 'right', frame: 0 }, 'day', []).data;
    for (const pose of STRIKE_POSES2) {
      const px = fig.pixels(pose, 'day', []);
      expect([px.w, px.h]).toEqual([fig.w, fig.h]);
      if (pose.frame === STRIKE2_HIT_FRAME && pose.facing === 'right')
        expect(px.data).not.toEqual(standing);
    }
    expect(new Set(STRIKE_POSES2.map(poseKey)).size).toBe(STRIKE_POSES2.length);
    expect(STRIKE_POSES2.map(poseKey).some((k) => POSES2.map(poseKey).includes(k))).toBe(false);
  });
});

describe('drawing and the dice', () => {
  it('draws without touching the fight: a run drawn every frame rolls exactly as one never drawn', () => {
    const play = (draw: boolean): Run => {
      let r = begin(prepared(), 1234);
      const look = roomLook(GROTTO_DUNGEON.rooms[r.room]!);
      const art = fightArtFor(look);
      for (let t = 0; t < 60_000 && !r.finished; t += TICK_MS) {
        r = decide(r);
        r = advanceRun(GROTTO_DUNGEON, r, r.play, TICK_MS);
        if (draw && r.room === 'pools') {
          const { ctx } = counting();
          const extra = fightExtra(GROTTO_DUNGEON, r, look, art);
          extra.ground?.(ctx, {} as never);
          extra.over?.(ctx, {} as never);
          extra.overlay?.(ctx, 1);
        }
      }
      return r;
    };
    const drawn = play(true);
    const plain = play(false);
    expect(drawn.battle!.seed).toBe(plain.battle!.seed);
    expect(drawn.battle!.tally).toEqual(plain.battle!.tally);
    expect(drawn.play.walker.at).toEqual(plain.play.walker.at);
    expect(placeOf(GROTTO_DUNGEON, drawn).room).toBe(placeOf(GROTTO_DUNGEON, plain).room);
    void advanceBattle;
  }, 60_000);
});
