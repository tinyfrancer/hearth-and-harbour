import { describe, expect, it } from 'vitest';
import { MELEE } from '../../src/core/combat';
import { CONTENT } from '../../src/data';
import {
  FLOOD_HURT,
  TICK_MS,
  WADE_PACE,
  advanceBattle,
  alive,
  inMark,
  mapOf,
  spoilsOf,
  startBattle,
  tideOf,
  type Battle,
  type Fighter,
  type Foe,
  type Place,
} from '../../src/scene/battle';
import { GROTTO_CAST, GROTTO_ID } from '../../src/scene/cast';
import { FOE_KINDS } from '../../src/scene/foes';
import { readGround } from '../../src/scene/ground';
import { startPlay, type Play } from '../../src/scene/play';
import { SURGE_FIRST_MS, SURGE_STEP_MS, TIDE_CYCLE, TIDE_START } from '../../src/scene/tide';
import { DUNGEON, far } from '../../src/scene/dungeonMetrics';
import { centreOf, type Point } from '../../src/scene/tileMap';
import { WALK_SPEED } from '../../src/scene/walker';

const monsters = { ...CONTENT.monsters!, ...GROTTO_CAST };
/** A place given in first-scale pixels, at the dungeons' scale. */
const P = (x: number, y: number): Point => ({ x: far(x), y: far(y) });
/** A tile's side in the dungeons. */
const T = DUNGEON.tile;

const fighter = (over: Partial<Fighter> = {}): Fighter => ({
  style: 'melee',
  skill: MELEE,
  attack: 40,
  defence: 40,
  maxHit: 6,
  maxHp: 70,
  food: null,
  arrows: 0,
  ...over,
  hp: over.hp ?? over.maxHp ?? 70,
});

function place(rows: readonly string[], extra: Partial<Place> = {}, ownTide = false): Place {
  return { room: 'r', ground: readGround(rows, ownTide), last: false, ...extra };
}

function battle(f: Fighter, foes: [string, Point, number?][], known?: string[]): Battle {
  return startBattle(
    f,
    monsters,
    foes.map(([monster, at, wave]) => ({
      room: 'r',
      monster,
      at,
      ...(wave !== undefined ? { wave } : {}),
    })),
    5,
    known ? { known } : {},
  );
}

/** Time in a battle in ticks, the hero walking as `play` has him. */
function run(b: Battle, where: Place, play: Play, ms: number, frame = TICK_MS) {
  let state = { battle: b, play };
  for (let t = 0; t < ms; t += frame)
    state = advanceBattle(state.battle, where, state.play, Math.min(frame, ms - t));
  return state;
}

const foe = (b: Battle, i = 0): Foe => b.foes[i]!;
const cell = (col: number, row: number): Point => centreOf({ col, row }, T);
/** The first rise of the shared tide, and the second, on the run's clock. */
const FIRST_RISE = TIDE_CYCLE[0]!.ms - TIDE_START;
const SECOND_RISE = FIRST_RISE + TIDE_CYCLE[1]!.ms;

/** A strip of sand with a bar across it that the first rise wets and the second covers. */
const BAR = ['##########', '#....11..#', '#....11..#', '##########'];

describe('the tide in a fight', () => {
  it('washes a hero off a sandbar as it floods, onto the nearest dry ground, for a little health', () => {
    const where = place(BAR);
    const b = { ...battle(fighter(), []), clock: SECOND_RISE - 500 };
    const after = run(b, where, startPlay(cell(5, 1)), 2000);
    // Not drowned, not lost: carried to the nearest sand beside the bar, a tile west.
    expect(after.play.walker.at).toEqual(cell(4, 1));
    expect(b.hp - after.battle.hp).toBe(Math.ceil(70 * FLOOD_HURT));
    expect(after.battle.over).toBeNull();
    expect(after.battle.wash).toBeNull();
  });

  it('never knocks him down: on his last hit point the sea only moves him', () => {
    const where = place(BAR);
    const b = { ...battle(fighter(), []), clock: SECOND_RISE - 500, hp: 1 };
    const after = run(b, where, startPlay(cell(5, 1)), 2000);
    expect(after.battle.hp).toBe(1);
    expect(after.battle.over).toBeNull();
  });

  it('slows him in the shallows and lets him walk at pace on dry ground', () => {
    const where = place(['##############', '#,,,,,,,,,,,,#', '#............#', '##############']);
    const b = battle(fighter(), []);
    const going = (row: number): Play => ({
      ...startPlay(cell(1, row)),
      walker: { at: cell(1, row), path: [cell(12, row)] },
    });
    const wade = run(b, where, going(1), 2000);
    const walk = run(b, where, going(2), 2000);
    const waded = wade.play.walker.at.x - cell(1, 1).x;
    const walked = walk.play.walker.at.x - cell(1, 2).x;
    expect(walked).toBeCloseTo(2 * far(WALK_SPEED), 5);
    // The first tenth of a second is before he has felt the water.
    expect(waded).toBeCloseTo(far(WALK_SPEED) * (0.1 + 1.9 * WADE_PACE), 5);
  });

  it('holds the enemies to the same water: washed off, and slowed', () => {
    const where = place(BAR);
    const b = { ...battle(fighter(), [['deckhand', cell(5, 2)]]), clock: SECOND_RISE - 500 };
    const after = run(b, where, startPlay(cell(1, 1)), 2000);
    const d = foe(after.battle);
    const map = mapOf(after.battle, where);
    const c = { col: Math.floor(d.at.x / T), row: Math.floor(d.at.y / T) };
    expect(map.tiles[c.row]![c.col]).not.toBe('water');
    expect(d.at.x).not.toBe(cell(5, 2).x);
  });

  it('walks round water the tide has put in his way', () => {
    const where = place(BAR);
    const b = { ...battle(fighter(), []), clock: SECOND_RISE + 100 };
    // Planned across the bar, but it is under water now: he goes nowhere wet.
    const play = { ...startPlay(cell(1, 1)), walker: { at: cell(1, 1), path: [cell(8, 1)] } };
    const after = run(b, where, play, 6000);
    const map = mapOf(after.battle, where);
    const c = { col: Math.floor(after.play.walker.at.x / T), row: 1 };
    expect(map.tiles[c.row]![c.col]).not.toBe('water');
    expect(after.play.walker.at.x).toBeLessThan(cell(5, 1).x);
  });
});

describe('the powder monkey’s kegs', () => {
  const STORE = ['##############', '#............#', '#,,,,,,......#', '##############'];

  it('lands a lit keg where he stood, and it goes out if it lands in water', () => {
    const where = place(STORE);
    const thrown = (at: Point) => {
      let b = battle(fighter({ maxHp: 200 }), [['powder_monkey', cell(11, 1)]]);
      b = { ...b, foes: b.foes.map((f) => ({ ...f, aware: true, heavyMs: 0 })) };
      let state = { battle: b, play: startPlay(at) };
      while (!foe(state.battle).heavy) state = run(state.battle, where, state.play, TICK_MS);
      const t = foe(state.battle).heavy!;
      expect(t.douse).toBe(true);
      expect(t.at).toEqual(at);
      return run(state.battle, where, state.play, t.lands - state.battle.clock);
    };
    const dry = thrown(cell(4, 1));
    const wet = thrown(cell(4, 2));
    const landed = (s: { battle: Battle }) => s.battle.effects.find((e) => e.kind === 'landed');
    expect(landed(dry)).toMatchObject({ doused: false });
    expect(landed(wet)).toMatchObject({ doused: true });
    expect(dry.battle.hp).toBe(200 - 3 * GROTTO_CAST.powder_monkey!.maxHit);
    expect(wet.battle.hp).toBe(200);
  });
});

describe('the ship’s parrot', () => {
  const ROOM = [
    '##############',
    '#............#',
    '#............#',
    '#............#',
    '##############',
  ];

  /** When each of the deckhand's blows at the hero came, on the clock: his timer starting again. */
  function blows(b: Battle, where: Place, ms: number): number[] {
    let state = { battle: b, play: startPlay(cell(6, 2)) };
    const at: number[] = [];
    let last = foe(b).blowMs;
    for (let t = 0; t < ms; t += TICK_MS) {
      state = run(state.battle, where, state.play, TICK_MS);
      const now = foe(state.battle);
      if (now.blowMs === GROTTO_CAST.deckhand!.speedMs && last < now.blowMs)
        at.push(state.battle.clock);
      last = now.blowMs;
    }
    return at;
  }

  const gaps = (times: number[]) => times.slice(1).map((t, i) => t - times[i]!);

  it('makes a pirate near it hit half as fast again, until it is dealt with', () => {
    const where = place(ROOM, { perches: [cell(9, 1), cell(3, 1)] });
    const strong = fighter({ maxHp: 10_000, attack: 1 });
    const base = battle(strong, [
      ['deckhand', cell(7, 2)],
      ['ships_parrot', cell(9, 1)],
    ]);
    const egged = { ...base, foes: base.foes.map((f) => ({ ...f, aware: true })) };
    const speed = GROTTO_CAST.deckhand!.speedMs;
    const rally = FOE_KINDS.ships_parrot!.rally!;
    const fast = gaps(blows(egged, where, 12_000)).filter((g) => g < speed);
    expect(fast.length).toBeGreaterThan(0);
    expect(new Set(fast)).toEqual(new Set([speed / rally.pace]));
    // The parrot gone, the pirate is back to his own pace.
    const alone = {
      ...egged,
      foes: egged.foes.map((f) => (f.monster === 'ships_parrot' ? { ...f, hp: 0, diedAt: 0 } : f)),
    };
    expect(new Set(gaps(blows(alone, where, 12_000)))).toEqual(new Set([speed]));
    const after = run(egged, where, startPlay(cell(6, 2)), 1000);
    expect(foe(after.battle).rallied).toBe(true);
    const ended = run(alone, where, startPlay(cell(6, 2)), 1000);
    expect(foe(ended.battle).rallied).toBe(false);
  });

  it('sits out of reach, comes down beside the hero, and goes back up to its other perch', () => {
    const where = place(ROOM, { perches: [cell(9, 1), cell(3, 1)] });
    const b = battle(fighter({ maxHp: 10_000, attack: 1 }), [['ships_parrot', cell(9, 1)]]);
    const awake = { ...b, foes: b.foes.map((f) => ({ ...f, aware: true })) };
    const flies = FOE_KINDS.ships_parrot!.flies!;
    const modes: string[] = [];
    let state: { battle: Battle; play: Play } = { battle: awake, play: startPlay(cell(6, 3)) };
    for (let t = 0; t < 20_000; t += TICK_MS) {
      state = run(state.battle, where, state.play, TICK_MS);
      const mode = foe(state.battle).flight!.mode;
      if (modes.at(-1) !== mode) modes.push(mode);
    }
    expect(modes.slice(0, 5)).toEqual(['in', 'down', 'out', 'perch', 'in']);
    expect(flies.perchMs).toBeGreaterThan(0);
  });
});

describe('the brig', () => {
  const BRIG = ['##########', '##..##..##', '##BB##DD##', 'a........#', '#........#', '##########'];

  it('keeps its prisoners in until the hero is in, then lets the second pair out when the first are beaten', () => {
    const where = place(BRIG);
    const b = battle(fighter({ attack: 1e9, maxHit: 1000, maxHp: 10_000, defence: 1e9 }), [
      ['deckhand', cell(2, 1), 0],
      ['deckhand', cell(6, 1), 1],
    ]);
    // At the door: nobody comes out.
    const atDoor = run(b, where, startPlay(cell(1, 3)), 1000);
    expect(atDoor.battle.released.r ?? 0).toBe(0);
    expect(atDoor.battle.foes.every((f) => !f.aware)).toBe(true);
    expect(mapOf(atDoor.battle, where).tiles[2]![2]).toBe('bars');
    // Further in: the first cell opens.
    const inside = run(atDoor.battle, where, startPlay(cell(4, 3)), 300);
    expect(inside.battle.released.r).toBe(1);
    expect(foe(inside.battle, 0).aware).toBe(true);
    expect(foe(inside.battle, 1).aware).toBe(false);
    expect(mapOf(inside.battle, where).tiles[2]![2]).not.toBe('bars');
    expect(mapOf(inside.battle, where).tiles[2]![6]).toBe('bars');
    // The first beaten, the second is let out.
    const down = {
      ...inside.battle,
      foes: inside.battle.foes.map((f, i) =>
        i === 0 ? { ...f, hp: 0, diedAt: inside.battle.clock } : f,
      ),
    };
    const next = run(down, where, inside.play, 300);
    expect(next.battle.released.r).toBe(2);
    expect(foe(next.battle, 1).aware).toBe(true);
  });
});

describe('Captain Brinebeard', () => {
  /** A cove: a rock middle, sand round it that his tide covers. */
  const COVE = [
    '####################',
    '#2222............22#',
    '#2222............22#',
    '#2222............22#',
    '#111111111111111111#',
    '####################',
  ];
  const where = place(COVE, { spawns: [cell(6, 2), cell(14, 2)] }, true);
  const def = GROTTO_CAST.brinebeard!;
  const rules = FOE_KINDS.brinebeard!.boss!;

  function fight(hp: number, over: Partial<Fighter> = {}): Battle {
    const b = battle(fighter({ maxHp: 10_000, defence: 1e9, ...over }), [
      ['brinebeard', cell(10, 2)],
    ]);
    return { ...b, foes: b.foes.map((f) => ({ ...f, aware: true, hp })) };
  }

  it('turns to his second phase at two thirds of his health: the sea comes in, and help with it', () => {
    const above = run(fight(Math.floor((def.hp * 2) / 3) + 1), where, startPlay(cell(7, 2)), 500);
    expect(foe(above.battle).phase).toBe(1);
    expect(above.battle.surge).toBeNull();
    const at = run(fight(Math.floor((def.hp * 2) / 3)), where, startPlay(cell(7, 2)), 500);
    expect(foe(at.battle).phase).toBe(2);
    expect(at.battle.surge).toBe(TICK_MS);
    const helpers = at.battle.foes.filter((f) => f.monster === rules.calls.monster);
    expect(helpers).toHaveLength(rules.calls.count);
    expect(helpers.every((h) => h.aware)).toBe(true);
    expect(at.battle.effects.some((e) => e.kind === 'say' && e.line === 'tide')).toBe(true);
    // The sea rises in his cove, warned of first.
    const later = run(at.battle, where, at.play, SURGE_FIRST_MS + SURGE_STEP_MS);
    expect(tideOf(later.battle, where).level).toBe(2);
  });

  it('brings out the anchor at one third, and swings it only then', () => {
    const third = Math.floor(def.hp / 3);
    const two = run(fight(third + 1), where, startPlay(cell(9, 2)), 6000);
    expect(foe(two.battle).phase).toBe(2);
    expect(two.battle.foes.some((f) => f.heavy?.shape === 'arc')).toBe(false);
    let state = { battle: fight(third), play: startPlay(cell(9, 2)) };
    let swung = false;
    for (let t = 0; t < 20_000 && !swung; t += TICK_MS) {
      state = run(state.battle, where, state.play, TICK_MS);
      swung = foe(state.battle).heavy?.shape === 'arc';
    }
    expect(foe(state.battle).phase).toBe(3);
    expect(swung).toBe(true);
    expect(state.battle.effects.some((e) => e.kind === 'say' && e.line === 'anchor')).toBe(true);
  });

  it('marks volleys in lines down the cove, the first through the hero, apart enough to stand between', () => {
    let state = { battle: fight(def.hp), play: startPlay(cell(5, 2)) };
    while (state.battle.volleys.length === 0) state = run(state.battle, where, state.play, TICK_MS);
    const lines = state.battle.volleys;
    expect(lines).toHaveLength(rules.volleys.phases[0]!.lines);
    expect(lines.every((l) => l.shape === 'line')).toBe(true);
    expect(inMark(lines[0]!, cell(5, 2))).toBe(true);
    expect(Math.abs(lines[0]!.at.x - lines[1]!.at.x)).toBeGreaterThanOrEqual(rules.volleys.gap);
    // Standing in one when it lands hurts; beside it does not.
    const t = lines[0]!;
    const hit = run(
      state.battle,
      where,
      startPlay({ x: t.at.x, y: P(0, 40).y }),
      t.lands - state.battle.clock,
    );
    const missed = run(
      state.battle,
      where,
      startPlay({ x: t.at.x + t.radius + 1, y: P(0, 40).y }),
      t.lands - state.battle.clock,
    );
    const hurt = (s: { battle: Battle }) =>
      s.battle.effects.filter((e) => e.kind === 'hit' && e.on === 'hero' && e.from === t.lands);
    expect(hurt(hit).map((e) => (e as { amount: number }).amount)).toContain(rules.volleys.damage);
    expect(
      hurt(missed).some((e) => (e as { amount: number }).amount === rules.volleys.damage),
    ).toBe(false);
  });

  it('never has a volley and the anchor coming at once: one big thing to step out of at a time', () => {
    let state = { battle: fight(Math.floor(def.hp / 3)), play: startPlay(cell(9, 2)) };
    let anchors = 0;
    let volleys = 0;
    for (let t = 0; t < 60_000; t += TICK_MS) {
      state = run(state.battle, where, state.play, TICK_MS);
      const swinging = !!foe(state.battle).heavy;
      const firing = state.battle.volleys.length > 0;
      expect(swinging && firing).toBe(false);
      if (swinging) anchors++;
      if (firing) volleys++;
    }
    expect(anchors).toBeGreaterThan(0);
    expect(volleys).toBeGreaterThan(0);
  });

  it('falls: his crew run for it, the sea goes out, and the cove is cleared', () => {
    const b = fight(1, { attack: 1e9, maxHit: 1000 });
    const two = run(fight(Math.floor((def.hp * 2) / 3)), where, startPlay(cell(9, 2)), 500).battle;
    const last = {
      ...two,
      fighter: b.fighter,
      foes: two.foes.map((f) => (f.monster === 'brinebeard' ? { ...f, hp: 1 } : f)),
    };
    const over = run(last, { ...where, last: true }, startPlay(cell(9, 2)), 3000);
    const boss = over.battle.foes.find((f) => f.monster === 'brinebeard')!;
    expect(alive(boss)).toBe(false);
    expect(over.battle.foes.filter((f) => f.fled)).toHaveLength(rules.calls.count);
    expect(over.battle.tally.killed).toEqual({ brinebeard: 1 });
    expect(over.battle.ebb).not.toBeNull();
    expect(over.battle.over?.why).toBe('cleared');
  });
});

describe('loot and spoils', () => {
  const ROOM = ['########', '#......#', '########'];

  it('skips loot the game’s tables do not know, and rolls the same dice either way', () => {
    const where = place(ROOM);
    const kill = (known?: string[]) => {
      const b = battle(fighter({ attack: 1e9, maxHit: 1000 }), [['deckhand', cell(3, 1)]], known);
      return run(b, where, startPlay(cell(2, 1)), 200).battle;
    };
    const all = kill();
    const none = kill(['hide']);
    const withDoubloons = kill([...Object.keys(CONTENT.items), 'doubloon']);
    expect(all.piles[0]!.loot.doubloon).toBeGreaterThan(0);
    expect(none.piles).toEqual([]);
    expect(withDoubloons.piles[0]!.loot.doubloon).toBe(all.piles[0]!.loot.doubloon);
    expect(none.seed).toBe(all.seed);
  });

  it('gives the kills and drops by monster and, for a clear, the dungeon cleared', () => {
    const b: Battle = {
      ...battle(fighter(), []),
      tally: {
        xp: { melee: 10 },
        loot: { doubloon: 3 },
        coins: 0,
        kills: 3,
        killed: { deckhand: 2, brinebeard: 1 },
        dropped: { deckhand: ['doubloon', 'pirate_cutlass'], brinebeard: ['doubloon'] },
        eaten: 1,
        shot: 0,
      },
    };
    expect(spoilsOf(b, GROTTO_ID)).toMatchObject({
      kills: { deckhand: 2, brinebeard: 1 },
      cleared: 'brinebeards_grotto',
      loot: { doubloon: 3 },
      foodEaten: 1,
      dropped: { deckhand: ['doubloon', 'pirate_cutlass'], brinebeard: ['doubloon'] },
    });
    expect(spoilsOf(b)).not.toHaveProperty('cleared');
    // Nothing seen to drop: no word of it.
    expect(spoilsOf({ ...b, tally: { ...b.tally, dropped: {} } })).not.toHaveProperty('dropped');
  });
});
