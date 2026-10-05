import { describe, expect, it } from 'vitest';
import {
  DEFENCE,
  MELEE,
  PLAYER_ATTACK_MS,
  RANGED,
  VITALITY,
  XP_PER_DAMAGE,
} from '../../src/core/combat';
import { settleRun } from '../../src/core/run';
import { newGame } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import {
  BEAT_MS,
  BRACE_MS,
  FOOD_MS,
  MELEE_REACH,
  RANGED_REACH,
  STEP_BACK,
  TICK_MS,
  WINDUP_MS,
  abilityProblem,
  advanceBattle,
  alive,
  arrowsLeft,
  cooldownLeft,
  eat,
  fighterOf,
  foeAt,
  foodProblem,
  inReach,
  spoilsOf,
  startBattle,
  targetFoe,
  useAbility,
  type Battle,
  type Fighter,
  type Foe,
  type Place,
} from '../../src/scene/battle';
import {
  advanceRun,
  buildDungeon,
  placeOf,
  runLocked,
  startRun,
  type Run,
} from '../../src/scene/dungeon';
import { FOE_KINDS } from '../../src/scene/foes';
import { GROTTO } from '../../src/scene/grotto';
import { startPlay, type Play } from '../../src/scene/play';
import { centreOf, isSolid, type Point } from '../../src/scene/tileMap';
import { WALK_SPEED } from '../../src/scene/walker';

const monsters = CONTENT.monsters!;

/** A bare room: open floor, a rock pillar to hide behind, a door east; and a small yard past it. */
const HALL = [
  '##############################',
  '#............................#',
  '#............................#',
  '#..s.........................#',
  '#.............###............a',
  '#.............###............#',
  '#............................#',
  '#............................#',
  '#............................#',
  '##############################',
];
const YARD = ['#####', '#...#', 'a...#', '#.x.#', '#####'];
const ARENA = buildDungeon({ id: 'arena', first: 'hall', rooms: { hall: HALL, yard: YARD } });
const GROTTO_DUNGEON = buildDungeon(GROTTO);
const hall = ARENA.rooms.hall!;
const place = (last = false): Place => ({ room: 'hall', map: hall.shut, last });

const melee = (over: Partial<Fighter> = {}): Fighter => ({
  style: 'melee',
  skill: MELEE,
  attack: 40,
  defence: 40,
  maxHit: 6,
  maxHp: 60,
  food: { item: 'cooked_cod', qty: 3, heals: 20 },
  arrows: 0,
  ...over,
  hp: over.hp ?? over.maxHp ?? 60,
});

const archer = (over: Partial<Fighter> = {}): Fighter =>
  melee({ style: 'ranged', skill: RANGED, arrows: 50, ...over });

const P = (x: number, y: number): Point => ({ x, y });

function battle(fighter: Fighter, foes: [string, Point][], seed = 7): Battle {
  return startBattle(
    fighter,
    monsters,
    foes.map(([monster, at]) => ({ room: 'hall', monster, at })),
    seed,
  );
}

/** Time in a battle in frames of `frame` ms, the hero walking as `play` has him. */
function run(b: Battle, play: Play, ms: number, frame = 16, at = place()) {
  let state = { battle: b, play };
  for (let t = 0; t < ms; t += frame)
    state = advanceBattle(state.battle, at, state.play, Math.min(frame, ms - t));
  return state;
}

const foe = (b: Battle, i = 0): Foe => b.foes[i]!;
/** A foe made to have noticed the hero already, its first heavy attack due at once. */
const awake = (b: Battle, i = 0, over: Partial<Foe> = {}): Battle => ({
  ...b,
  foes: b.foes.map((f, j) => (j === i ? { ...f, aware: true, heavyMs: 0, ...over } : f)),
});

describe('targeting and reach', () => {
  it('strikes whatever is in reach by itself, and marks it as the target', () => {
    const b = awake(battle(melee(), [['dock_rat', P(120, 72)]]));
    const after = run(b, startPlay(P(100, 72)), TICK_MS);
    expect(after.battle.target).toBe(foe(b).key);
    expect(after.battle.blowMs).toBe(PLAYER_ATTACK_MS);
    expect(
      after.battle.effects.some((e) => ('on' in e && e.on === 'foe') || e.kind === 'miss'),
    ).toBe(true);
  });

  it('does not strike what is out of reach, until a tap on it sends the hero over', () => {
    const b = battle(melee(), [['dock_rat', P(300, 120)]]);
    const play = startPlay(P(60, 56));
    const idle = run(b, play, 2000);
    expect(idle.battle.target).toBeNull();
    expect(idle.battle.effects).toEqual([]);

    const tapped = targetFoe(idle.battle, place(), idle.play, foe(b).key);
    expect(tapped.battle.target).toBe(foe(b).key);
    expect(tapped.battle.chase).toBe(true);
    expect(tapped.play.walker.path.length).toBeGreaterThan(0);
    const there = run(tapped.battle, tapped.play, 6000);
    const rat = foe(there.battle);
    // Beside it and striking: either it is down or it has been swung at.
    expect(!alive(rat) || there.battle.tally.xp[MELEE] || there.battle.effects.length).toBeTruthy();
    if (alive(rat))
      expect(
        Math.hypot(rat.at.x - there.play.walker.at.x, rat.at.y - there.play.walker.at.y),
      ).toBeLessThanOrEqual(MELEE_REACH);
  });

  it('shoots from a distance with a bow, but not through rock, and one arrow a shot', () => {
    const map = place().map;
    const b = awake(battle(archer(), [['sand_crab', P(200, 40)]]));
    const rat = foe(b);
    expect(inReach(b, map, P(100, 40), rat)).toBe(true);
    expect(inReach(b, map, P(200 - RANGED_REACH - 1, 40), rat)).toBe(false);
    // The pillar at columns 14-16, rows 4-5 stands between.
    expect(inReach(b, map, P(200, 104), { ...rat, at: P(200, 104) })).toBe(true);
    expect(inReach(b, map, P(184, 40), { ...rat, at: P(280, 40) })).toBe(true);
    expect(inReach(b, map, P(200, 72), { ...rat, at: P(300, 72) })).toBe(false);
    expect(inReach(b, map, P(220, 40), { ...rat, at: P(240, 104) })).toBe(false);
    const shot = run(b, startPlay(P(100, 40)), TICK_MS);
    expect(shot.battle.tally.shot).toBe(1);
    expect(arrowsLeft(shot.battle)).toBe(49);
  });

  it('finds the foe under a tap, grown to a thumb', () => {
    const b = battle(melee(), [
      ['smuggler', P(200, 100)],
      ['dock_rat', P(100, 100)],
    ]);
    expect(foeAt(b, 'hall', P(200, 80))?.monster).toBe('smuggler');
    expect(foeAt(b, 'hall', P(100, 95))?.monster).toBe('dock_rat');
    expect(foeAt(b, 'hall', P(100, 75))).toBeNull();
    expect(foeAt(b, 'hall', P(100, 75), 40)?.monster).toBe('dock_rat');
    expect(foeAt(b, 'yard', P(200, 80))).toBeNull();
  });
});

describe('enemies', () => {
  it('notice the hero within their range and in sight, come at him, and wind up before the first blow', () => {
    const near = battle(melee(), [['dock_rat', P(160, 40)]]);
    const far = battle(melee(), [['dock_rat', P(440, 130)]]);
    const hero = startPlay(P(100, 40));
    const n = run(near, hero, 600);
    expect(foe(n.battle).aware).toBe(true);
    expect(foe(n.battle).at.x).toBeLessThan(160);
    expect(foe(run(far, hero, 600).battle).aware).toBe(false);

    // Arriving beside him starts its wind-up: no blow lands sooner.
    let state = { battle: near, play: hero };
    let arrived = -1;
    for (let t = 0; t < 4000; t += TICK_MS) {
      state = advanceBattle(state.battle, place(), state.play, TICK_MS);
      if (arrived < 0 && foe(state.battle).engaged) arrived = state.battle.clock;
      if (arrived >= 0 && state.battle.effects.some((e) => 'on' in e && e.on === 'hero')) break;
    }
    const blow = state.battle.effects.find((e) => 'on' in e && e.on === 'hero')!;
    expect(blow.from - arrived).toBeGreaterThanOrEqual(WINDUP_MS);
  });

  it('a thrower keeps its distance and throws at where the hero stands', () => {
    const b = awake(battle(melee(), [['smuggler', P(280, 40)]]));
    const after = run(b, startPlay(P(150, 40)), 200);
    const s = foe(after.battle);
    expect(s.heavy).not.toBeNull();
    expect(s.heavy!.at).toEqual(P(150, 40));
    // ...but not from behind rock: the pillar between them hides him.
    const hidden = awake(battle(melee(), [['smuggler', P(300, 72)]]));
    expect(foe(run(hidden, startPlay(P(200, 72)), 200).battle).heavy).toBeNull();
    expect(s.heavy!.origin).not.toBeNull();
  });
});

describe('the telegraph', () => {
  const kinds = Object.entries(FOE_KINDS).filter(([, k]) => k.heavy);

  it.each(kinds)(
    '%s: warns long enough to walk out from its middle, and lands on a tick',
    (_id, kind) => {
      const heavy = kind.heavy!;
      const walkOut = (1000 * heavy.radius) / WALK_SPEED;
      // Half a second to see it and tap, on top of the walk.
      expect(heavy.warnMs).toBeGreaterThanOrEqual(walkOut + 500);
      expect(heavy.warnMs % TICK_MS).toBe(0);
      expect(heavy.everyMs % TICK_MS).toBe(0);
      expect(heavy.firstMs % TICK_MS).toBe(0);
    },
  );

  /** A crab beside the hero, its slam just begun. */
  function slam(): { b: Battle; play: Play } {
    const b = awake(battle(melee({ maxHp: 200 }), [['sand_crab', P(200, 72)]]));
    const play = startPlay(P(176, 72));
    let state = { battle: b, play };
    while (!foe(state.battle).heavy)
      state = advanceBattle(state.battle, place(), state.play, TICK_MS);
    return { b: state.battle, play: state.play };
  }

  it('hits hard if he is still in it when it lands', () => {
    const { b, play } = slam();
    const t = foe(b).heavy!;
    const before = run(b, play, t.lands - b.clock - TICK_MS, TICK_MS);
    expect(foe(before.battle).heavy).not.toBeNull();
    const landed = run(before.battle, before.play, TICK_MS, TICK_MS);
    expect(foe(landed.battle).heavy).toBeNull();
    expect(before.battle.hp - landed.battle.hp).toBe(t.damage);
    expect(t.damage).toBe(2 * monsters.sand_crab!.maxHit);
  });

  it('misses him entirely if he walked out, and the walk out fits in the warning', () => {
    const { b, play } = slam();
    const t = foe(b).heavy!;
    // Straight away from the middle, from the moment it appears.
    const out = {
      ...play,
      walker: { at: play.walker.at, path: [P(t.at.x - t.radius - 6, t.at.y)] },
    };
    const hp = b.hp;
    const after = run(b, out, t.lands - b.clock + 50, 16);
    expect(foe(after.battle).heavy).toBeNull();
    expect(after.battle.effects.some((e) => e.kind === 'landed')).toBe(true);
    expect(after.battle.hp).toBe(hp);
  });

  it('judges by exactly where his feet are when it lands: inside the edge hit, on it not', () => {
    const { b } = slam();
    const t = foe(b).heavy!;
    const at = (d: number) => startPlay(P(t.at.x - d, t.at.y));
    const inside = run(b, at(t.radius - 0.5), t.lands - b.clock, TICK_MS);
    const edge = run(b, at(t.radius), t.lands - b.clock, TICK_MS);
    expect(b.hp - inside.battle.hp).toBe(t.damage);
    // The crab's ordinary blows wait while it winds up, so nothing else touched him.
    expect(edge.battle.hp).toBe(b.hp);
  });

  it('is halved by a brace, which is then spent', () => {
    const { b, play } = slam();
    const t = foe(b).heavy!;
    const braced = useAbility(b, place(), play, 1);
    expect(braced.battle.braceUntil).toBe(b.clock + BRACE_MS);
    const after = run(braced.battle, braced.play, t.lands - b.clock, TICK_MS);
    expect(b.hp - after.battle.hp).toBe(Math.ceil(t.damage / 2));
    expect(after.battle.braceUntil).toBe(0);
  });

  it('is called off if its thrower falls first', () => {
    const { b, play } = slam();
    const down = { ...b, foes: b.foes.map((f) => ({ ...f, hp: 1 })) };
    let state: { battle: Battle; play: Play } = { battle: { ...down, blowMs: 0 }, play };
    // A hero who never misses, for the test.
    state.battle = { ...state.battle, fighter: { ...state.battle.fighter, attack: 1e9 } };
    state = advanceBattle(state.battle, place(), state.play, TICK_MS);
    expect(alive(foe(state.battle))).toBe(false);
    expect(foe(state.battle).heavy).toBeNull();
    expect(state.battle.hp).toBe(b.hp);
  });
});

describe('abilities, cooldowns and food', () => {
  it('a wide swing reaches everything near, then cools down before it can be used again', () => {
    const b = awake(
      battle(melee({ attack: 1e9 }), [
        ['dock_rat', P(120, 72)],
        ['dock_rat', P(80, 80)],
        ['dock_rat', P(200, 72)],
      ]),
    );
    const play = startPlay(P(100, 72));
    const swung = useAbility(b, place(), play, 0);
    const struck = swung.battle.effects.filter((e) => e.kind === 'hit');
    expect(struck).toHaveLength(2);
    expect(cooldownLeft(swung.battle, 'first')).toBe(8000);
    expect(abilityProblem(swung.battle, place(), play, 0)).toBe('cooling');
    expect(useAbility(swung.battle, place(), play, 0).battle).toBe(swung.battle);
    const later = run(swung.battle, play, 8000, TICK_MS);
    expect(cooldownLeft(later.battle, 'first')).toBe(0);
  });

  it('a wide swing with nobody near does nothing and costs nothing', () => {
    const b = battle(melee(), [['dock_rat', P(300, 72)]]);
    const play = startPlay(P(100, 72));
    expect(abilityProblem(b, place(), play, 0)).toBe('nobody');
    expect(useAbility(b, place(), play, 0).battle).toBe(b);
  });

  it('a double shot looses two arrows at the target', () => {
    const b = awake(battle(archer({ attack: 1e9, maxHit: 1 }), [['smuggler', P(200, 72)]]));
    const play = startPlay(P(120, 72));
    const aimed = targetFoe(b, place(), play, foe(b).key);
    const shot = useAbility(aimed.battle, place(), aimed.play, 0);
    expect(shot.battle.tally.shot).toBe(2);
    expect(foe(shot.battle).hp).toBe(monsters.smuggler!.hp - 2);
    expect(
      useAbility({ ...aimed.battle, fighter: archer({ arrows: 0 }) }, place(), aimed.play, 0).battle
        .tally.shot,
    ).toBe(0);
  });

  it('a step back carries the hero away from what is nearest, at a run', () => {
    const b = awake(battle(archer(), [['dock_rat', P(130, 72)]]));
    const play = startPlay(P(110, 72));
    const stepped = useAbility(b, place(), play, 1);
    expect(stepped.battle.dash).not.toBeNull();
    const after = run(stepped.battle, stepped.play, 200, 16);
    expect(after.play.walker.at.x).toBeCloseTo(110 - STEP_BACK, 5);
  });

  it('eats one from the food slot to heal, with a short wait between', () => {
    const b = { ...battle(melee(), []), hp: 20 };
    const fed = eat(b, P(0, 0));
    expect(fed.hp).toBe(40);
    expect(fed.tally.eaten).toBe(1);
    expect(foodProblem(fed)).toBe('cooling');
    expect(eat(fed, P(0, 0))).toBe(fed);
    const later = run(fed, startPlay(P(60, 60)), FOOD_MS, TICK_MS).battle;
    expect(foodProblem(later)).toBeNull();
    expect(foodProblem({ ...later, hp: 60 })).toBe('full');
    expect(foodProblem({ ...later, tally: { ...later.tally, eaten: 3 } })).toBe('none');
    expect(foodProblem(battle(melee({ food: null }), []))).toBe('none');
  });
});

describe('a run with something to fight', () => {
  const strong = (): Fighter => melee({ attack: 1e9, maxHit: 100, maxHp: 500, defence: 1e9 });
  const plan = buildDungeon({
    id: 'arena2',
    first: 'hall',
    rooms: { hall: HALL, yard: YARD },
    foes: {
      hall: [{ monster: 'dock_rat', at: { col: 10, row: 3 } }],
      yard: [{ monster: 'dock_rat', at: { col: 2, row: 1 } }],
    },
  });
  const setup = (fighter: Fighter, seed = 3) => ({ fighter, monsters, seed });

  /** A run with the hero going after whatever is left in his room until it is clear or he is down. */
  function fightOut(start: Run, frame = 16, limit = 120_000): Run {
    let r = start;
    for (let t = 0; t < limit && !r.finished && runLocked(r); t += frame) {
      if (!r.battle!.target) {
        const left = r.battle!.foes.find((f) => f.room === r.room && alive(f));
        if (left) {
          const aimed = targetFoe(r.battle!, placeOf(plan, r), r.play, left.key);
          r = { ...r, battle: aimed.battle, play: aimed.play };
        }
      }
      r = advanceRun(plan, r, r.play, frame);
    }
    return r;
  }

  it('keeps its doors shut until the room is cleared, then opens them', () => {
    let r = startRun(plan, setup(strong()));
    const door = plan.rooms.hall!.doors[0]!;
    expect(runLocked(r)).toBe(true);
    expect(isSolid(placeOf(plan, r).map, door.cell)).toBe(true);
    // Walking at the door does nothing while it is shut.
    const tryDoor = advanceRun(
      plan,
      r,
      { ...r.play, walker: { at: r.play.walker.at, path: [centreOf(door.cell)] } },
      100,
    );
    expect(tryDoor.doorway).toBeNull();
    r = fightOut(r);
    expect(runLocked(r)).toBe(false);
    expect(r.battle!.opened.hall).toBeGreaterThan(0);
    expect(isSolid(placeOf(plan, r).map, door.cell)).toBe(false);
  });

  it('ends cleared a moment after the last room is cleared, with its floor gathered up', () => {
    let r = startRun(plan, setup(strong()));
    r = fightOut(r);
    // Through the door to the last room.
    const door = plan.rooms.hall!.doors[0]!;
    r = {
      ...r,
      play: { ...r.play, walker: { at: centreOf(door.inside), path: [centreOf(door.cell)] } },
    };
    for (let i = 0; i < 100 && r.room === 'hall'; i++) r = advanceRun(plan, r, r.play, 16);
    for (let i = 0; i < 40 && r.doorway; i++) r = advanceRun(plan, r, r.play, 16);
    expect(r.room).toBe('yard');
    r = fightOut(r);
    expect(r.battle!.over?.why).toBe('cleared');
    const at = r.battle!.over!.at;
    expect(r.finished).toBe(false);
    for (let i = 0; i < 200 && !r.finished; i++) r = advanceRun(plan, r, r.play, 16);
    expect(r.finished).toBe(true);
    expect(r.ending).toBe('cleared');
    expect(r.battle!.clock).toBeGreaterThanOrEqual(at + BEAT_MS);
    expect(r.battle!.piles.filter((p) => p.room === 'yard')).toEqual([]);
    const spoils = spoilsOf(r.battle!);
    expect(r.battle!.tally.kills).toBe(2);
    // A rat always drops a hide; both are home, the yard's gathered without walking to it.
    expect(spoils.loot!.hide).toBeGreaterThanOrEqual(1 + (r.battle!.piles.length === 0 ? 1 : 0));
    expect(spoils.xp![MELEE]).toBe(XP_PER_DAMAGE * 2 * monsters.dock_rat!.hp);
    expect(spoils.xp![VITALITY]).toBeGreaterThan(0);
    expect(r.ms).toBeGreaterThan(r.battle!.clock);
    expect(advanceRun(plan, r, r.play, 5000)).toBe(r);
  });

  it('ends fallen when the hero is knocked down, with what was picked up and nothing on the floor', () => {
    const weak = melee({ attack: 1, maxHit: 1, maxHp: 4, defence: 1 });
    let r = startRun(plan, setup(weak));
    r = fightOut(r);
    expect(r.battle!.over?.why).toBe('fell');
    expect(r.battle!.hp).toBe(0);
    for (let i = 0; i < 200 && !r.finished; i++) r = advanceRun(plan, r, r.play, 16);
    expect(r.ending).toBe('fell');
    const spoils = spoilsOf(r.battle!);
    expect(spoils.loot).toEqual({});
    expect(spoils.xp![DEFENCE]).toBeGreaterThan(0);
  });

  it('starts with the hit points the character rowed out with, and takes home what is left', () => {
    const hurt = startBattle(melee({ hp: 25 }), monsters, [], 1);
    expect(hurt.hp).toBe(25);
    expect(spoilsOf({ ...hurt, hp: 13 }).hp).toBe(13);
    const state = { ...newGame('Cody', 0), health: { hp: 9, regenMs: 0 } };
    const fighter = fighterOf(state, CONTENT);
    expect(fighter.hp).toBe(9);
    expect(startBattle(fighter, monsters, [], 1).hp).toBe(9);
    // Down is 0, and the character comes round as from an idle knock-out.
    const after = settleRun(state, spoilsOf({ ...startBattle(fighter, monsters, [], 1), hp: 0 }));
    expect(after.health!.hp).toBeGreaterThan(0);
    expect(after.health!.hp).toBeLessThan(fighter.maxHp);
  });

  it('settles into the save as `settleRun` takes it: XP and loot in, food and arrows out', () => {
    const state = {
      ...newGame('Cody', 0),
      food: { item: 'cooked_cod', qty: 5 },
      equipment: { ammo: { item: 'iron_arrows', qty: 30 } },
    };
    const b: Battle = {
      ...startBattle(fighterOf(state, CONTENT), monsters, [], 1),
      tally: { xp: { ranged: 40 }, loot: { hide: 2 }, coins: 7, kills: 2, eaten: 2, shot: 9 },
    };
    const after = settleRun(state, spoilsOf(b));
    expect(after.food).toEqual({ item: 'cooked_cod', qty: 3 });
    expect(after.equipment.ammo).toEqual({ item: 'iron_arrows', qty: 21 });
    expect(after.bank.hide).toBe(2);
    expect(after.coins).toBe(7);
    expect(after.skills.ranged).toBe(40);
  });

  it('rolls the same from the same seed and the same taps, however the frames fall', () => {
    const play = (frame: number, seed: number): Run => {
      let r = startRun(GROTTO_DUNGEON, setup(melee({ maxHp: 300 }), seed));
      for (let t = 0; t < 40_000; t += frame) {
        // The same taps at the same moments: every two seconds, the nearest foe.
        if (t % 2000 === 0) {
          const left = r.battle!.foes.find((f) => f.room === r.room && alive(f));
          if (left) {
            const aimed = targetFoe(r.battle!, placeOf(GROTTO_DUNGEON, r), r.play, left.key);
            r = { ...r, battle: aimed.battle, play: aimed.play };
          }
        }
        r = advanceRun(GROTTO_DUNGEON, r, r.play, frame);
      }
      return r;
    };
    const summary = (r: Run) => ({
      hp: r.battle!.hp,
      tally: r.battle!.tally,
      seed: r.battle!.seed,
      foes: r.battle!.foes.map((f) => [f.hp, f.diedAt]),
    });
    const a = play(20, 99);
    expect(play(20, 99)).toEqual(a);
    expect(summary(play(50, 99))).toEqual(summary(a));
    expect(summary(play(100, 99))).toEqual(summary(a));
    expect(a.battle!.tally.kills).toBeGreaterThan(0);
    expect(summary(play(20, 100))).not.toEqual(summary(a));
  });
});
