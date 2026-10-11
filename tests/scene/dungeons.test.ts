import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import {
  eat,
  fighterOf,
  foodLeft,
  foodProblem,
  spoilsOf,
  startBattle,
  type Battle,
} from '../../src/scene/battle';
import { GROTTO_CAST } from '../../src/scene/cast';
import { buildDungeon, startRun } from '../../src/scene/dungeon';
import {
  castOf,
  dungeonById,
  dungeonScene,
  DUNGEON_IDS,
  healsOf,
  sayingOf,
} from '../../src/scene/dungeons';
import { CAPTAIN_SAYS } from '../../src/scene/grottoWords';
import { DUNGEON_PLANS } from '../../src/scene/plans';
import { TIDEPOOL } from '../../src/scene/tidepool';

// Dungeons by id: every plan the scene can play, its words and cast, and food
// found in a run (the cave's crate) eaten there without touching the food slot.

describe('the dungeons the scene can play', () => {
  it('holds the grotto and the cave, each built from its plan, by id', () => {
    expect(DUNGEON_IDS).toEqual(['brinebeards_grotto', 'tidepool_cave']);
    for (const id of DUNGEON_IDS) {
      const dungeon = dungeonById(id)!;
      expect(dungeon.id).toBe(id);
      expect(dungeonById(id)).toBe(dungeon);
      expect(DUNGEON_PLANS[id]!.id).toBe(id);
      // Each room knows its dungeon, so a worker can paint it by both ids.
      for (const room of Object.values(dungeon.rooms)) expect(room.dungeon).toBe(id);
      // Every dungeon the tables know is one the scene can play.
      expect(CONTENT.dungeons![id]).toBeDefined();
    }
    expect(dungeonById('nowhere')).toBeNull();
  });

  it('fights the grotto by the same rows as before, and the cave by the tables’ own', () => {
    const grotto = castOf(CONTENT, 'brinebeards_grotto');
    for (const [id, row] of Object.entries(GROTTO_CAST)) expect(grotto[id]).toEqual(row);
    const cave = castOf(CONTENT, 'tidepool_cave');
    const rows = CONTENT.dungeons!.tidepool_cave!.cast!;
    for (const row of rows) expect(cave[row.id]).toEqual({ ...row, area: 'tidepool_cave' });
    // The cave's rat is the tables' creature, weaker here; elsewhere it fights by the tables.
    expect(cave.dock_rat!.hp).toBeLessThan(CONTENT.monsters!.dock_rat!.hp);
    expect(grotto.dock_rat).toEqual(CONTENT.monsters!.dock_rat);
  });

  it('says each dungeon’s own words: the captain his, the cave its results', () => {
    expect(sayingOf('brinebeards_grotto', 'brinebeard', 'tide')).toBe(CAPTAIN_SAYS.tide);
    expect(sayingOf('tidepool_cave', 'brinebeard', 'tide')).toBeNull();
    expect(dungeonScene('brinebeards_grotto')!.words.cleared.title).toBe('The grotto is cleared');
    expect(dungeonScene('tidepool_cave')!.words.cleared.title).toBe('The cave is cleared');
    expect(dungeonScene('tidepool_cave')!.lessons!.length).toBeGreaterThan(0);
    expect(dungeonScene('brinebeards_grotto')!.lessons).toBeUndefined();
  });

  it('has no tide in the cave, and its rooms fit one phone on its side', () => {
    const cave = dungeonById('tidepool_cave')!;
    for (const room of Object.values(cave.rooms)) {
      expect(room.ground.tidal || room.ground.ownTide).toBe(false);
      expect(room.ground.cols * 24).toBeLessThanOrEqual(740 - 112);
    }
    expect(Object.keys(cave.rooms)).toEqual(['landing', 'pools', 'snapper']);
  });
});

describe('food found in a run', () => {
  const fresh = newGame('Cody', 0);
  const cave = buildDungeon(TIDEPOOL);
  const run = startRun(cave, {
    fighter: fighterOf(fresh, CONTENT),
    monsters: castOf(CONTENT, 'tidepool_cave'),
    seed: 1,
    known: Object.keys(CONTENT.items),
    heals: healsOf(CONTENT),
  });
  /** The battle with the crate picked up and the hero hurt. */
  const picked = (b: Battle): Battle => ({
    ...b,
    hp: 5,
    piles: [],
    tally: { ...b.tally, loot: { ...b.piles[0]!.loot } },
  });

  it('lies in the crate from the start, and is nothing to eat until picked up', () => {
    const b = run.battle!;
    expect(b.piles).toEqual([
      {
        room: 'landing',
        at: { x: 8 * 24 + 12, y: 3 * 24 + 12 },
        loot: { cooked_shrimp: 4 },
        coins: 0,
      },
    ]);
    expect(foodLeft(b)).toBe(0);
    expect(foodProblem(b)).toBe('none');
  });

  it('is eaten from what was picked up, never the food slot, and the rest goes home', () => {
    let b = picked(run.battle!);
    expect(foodLeft(b)).toBe(4);
    b = eat(b, { x: 0, y: 0 });
    expect(b.hp).toBe(5 + CONTENT.items.cooked_shrimp!.heals!);
    expect(b.tally.ateFound).toEqual({ cooked_shrimp: 1 });
    expect(b.tally.eaten).toBe(0);
    const spoils = spoilsOf(b);
    expect(spoils.foodEaten).toBe(0);
    expect(spoils.loot).toEqual({ cooked_shrimp: 3 });
  });

  it('comes before the food slot’s own fish, and a battle without finds is as before', () => {
    const fed = { ...fresh, food: { item: 'cooked_cod', qty: 2 } };
    const b = picked(
      startRun(cave, {
        fighter: fighterOf(fed, CONTENT),
        monsters: castOf(CONTENT, 'tidepool_cave'),
        seed: 1,
        heals: healsOf(CONTENT),
      }).battle!,
    );
    expect(foodLeft(b)).toBe(6);
    expect(eat(b, { x: 0, y: 0 }).tally.ateFound).toEqual({ cooked_shrimp: 1 });
    const plain = startBattle(fighterOf(fed, CONTENT), CONTENT.monsters!, [], 1);
    expect(plain.piles).toEqual([]);
    expect(plain.larder).toBeUndefined();
  });
});
