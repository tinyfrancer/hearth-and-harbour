import { describe, expect, it } from 'vitest';
import { seedFrom } from '../../src/core/rng';
import { GAME_STATE_VERSION, newGame, type GameState } from '../../src/core/state';
import { SAVE_FILE_GAME, readSave, writeSaveExport } from '../../src/persistence/saveFile';

const state: GameState = {
  ...newGame('Zoë the Bold', 1_700_000_000_000),
  skills: { woodcutting: 1234 },
  bank: { pine_logs: 40 },
  coins: 77,
  mastery: { chop_pine: 480 },
  action: { id: 'chop_pine', progressMs: 1500.5 },
  potion: { item: 'sage_tonic', charges: 87 },
  look: { skin: 'a-skin', hair: 'a-hair', hairColour: 'a-colour' },
  equipment: {
    main_hand: { item: 'pine_shortbow', qty: 1 },
    ammo: { item: 'bronze_arrows', qty: 120 },
  },
  food: { item: 'cooked_herring', qty: 30 },
  eatAt: 40,
  bestiary: { dock_rat: { kills: 12, seen: ['rat_hide'] } },
};
/** The same character halfway through a fight instead of chopping. */
const fighting: GameState = {
  ...state,
  action: null,
  fight: {
    monster: 'dock_rat',
    hp: 14,
    foeHp: 0,
    playerMs: 800,
    foeMs: 1200,
    kills: 3,
    coins: 20,
    loot: { rat_hide: 3 },
    eaten: 1,
    arrows: 9,
  },
};
/** What version 6 adds to a save from before it. */
const unfought = {
  fight: null,
  food: null,
  eatAt: 50,
  rng: seedFrom(state.createdAt),
  bestiary: {},
};
/** A purse from before version 8, when every price went up tenfold. */
const tenfold = { coins: 770 };
/** What version 8 adds to a save from before it, but for the log of what it proves was held. */
const V8_FIELDS = ['collection', 'achievements', 'dungeons', 'stats', 'perks'];
/** What version 9 adds to a save from before it, but for a bare chin on the look. */
const V9_FIELDS = ['bountyBoard', 'lastBounty', 'autoBounty', 'run'];
/** What version 10 adds to a save from before it: nothing remembered. */
const V10_FIELDS = ['seen'];
/** What version 11 adds to a save from before it: no dungeon run idle. */
const V11_FIELDS = ['idleRun'];
/** The look an older save comes in with: as it was, with the art's bare chin. */
const bearded = { look: { ...state.look, beard: 'none' } };
/** A save as a version before 6 wrote it. */
const before6 = (version: number): Record<string, unknown> => {
  const old: Record<string, unknown> = { ...state, version };
  for (const field of [
    'fight',
    'food',
    'eatAt',
    'rng',
    'bestiary',
    ...V8_FIELDS,
    ...V9_FIELDS,
    ...V10_FIELDS,
    ...V11_FIELDS,
  ]) {
    delete old[field];
  }
  return old;
};

/** A dungeon run idle, walking to its first room. */
const IDLE = {
  dungeon: 'tidepool_cave',
  clock: 5,
  utcOffset: 0,
  modifier: null,
  room: 0,
  walkMs: 1000,
  hp: 10,
  playerMs: 2400,
  foes: [],
  runs: 0,
  kills: 0,
  coins: 0,
  loot: {},
  eaten: 0,
  arrows: 0,
};

describe('save export and import', () => {
  it('round-trips through a file', () => {
    const out = writeSaveExport('file', state, new Date(2026, 9, 4));
    expect(out).toMatchObject({
      kind: 'file',
      fileName: 'hearth-and-harbour-zo-the-bold-2026-10-04.json',
    });
    expect(readSave(out.text)).toEqual({ ok: true, state });
    const mid = writeSaveExport('file', fighting);
    expect(readSave(mid.text)).toEqual({ ok: true, state: fighting });
  });

  it('round-trips through a code, accents and all, even when a message wraps it', () => {
    const { text } = writeSaveExport('code', state);
    expect(text).toMatch(/^[A-Za-z0-9+/=]+$/);
    const wrapped = text.replace(/(.{20})/g, '$1\n');
    expect(readSave(`  ${wrapped} `)).toEqual({ ok: true, state });
  });

  it('loads a save exported by the first release', () => {
    const v1 = {
      game: SAVE_FILE_GAME,
      save: { version: 1, name: 'Cody', createdAt: 5, savedAt: 9 },
    };
    expect(readSave(JSON.stringify(v1))).toEqual({
      ok: true,
      state: { ...newGame('Cody', 5), savedAt: 9, look: { beard: 'none' } },
    });
  });

  it('loads a version 3 save, from before potions, with none drunk', () => {
    const v3 = before6(3);
    delete v3.potion;
    delete v3.look;
    delete v3.equipment;
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v3 }))).toEqual({
      ok: true,
      state: {
        ...state,
        potion: null,
        look: { beard: 'none' },
        equipment: {},
        ...unfought,
        ...tenfold,
        collection: ['pine_logs'],
      },
    });
  });

  it('loads a version 4 save, from before equipment, with nothing worn', () => {
    const v4 = before6(4);
    delete v4.look;
    delete v4.equipment;
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v4 }))).toEqual({
      ok: true,
      state: {
        ...state,
        look: { beard: 'none' },
        equipment: {},
        ...unfought,
        ...tenfold,
        collection: ['pine_logs', 'sage_tonic'],
      },
    });
  });

  it('loads a version 5 save, from before combat, still wearing its gear', () => {
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: before6(5) }))).toEqual({
      ok: true,
      state: {
        ...state,
        ...unfought,
        ...tenfold,
        ...bearded,
        collection: ['pine_logs', 'pine_shortbow', 'bronze_arrows', 'sage_tonic'],
      },
    });
  });

  it('loads a version 6 save, from before thieving, unrobbed, with no bounty and at full health', () => {
    const v6: Record<string, unknown> = { ...fighting, version: 6 };
    for (const field of ['marks', 'bounty', 'bountyPoints', 'health', ...V8_FIELDS, ...V9_FIELDS]) {
      delete v6[field];
    }
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v6 }))).toEqual({
      ok: true,
      state: {
        ...fighting,
        marks: {},
        bounty: null,
        bountyPoints: 0,
        health: null,
        ...tenfold,
        ...bearded,
        collection: [
          'pine_logs',
          'pine_shortbow',
          'bronze_arrows',
          'cooked_herring',
          'sage_tonic',
          'rat_hide',
        ],
      },
    });
  });

  it('loads a version 7 save, from before the log, with what it proves was held found', () => {
    const v7: Record<string, unknown> = { ...state, version: 7 };
    for (const field of [...V8_FIELDS, ...V9_FIELDS]) delete v7[field];
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v7 }))).toEqual({
      ok: true,
      state: {
        ...state,
        ...tenfold,
        ...bearded,
        collection: [
          'pine_logs',
          'pine_shortbow',
          'bronze_arrows',
          'cooked_herring',
          'sage_tonic',
          'rat_hide',
        ],
      },
    });
  });

  it('loads a version 8 save with the board unread, auto bounty off, no run, and a bare chin', () => {
    const v8: Record<string, unknown> = {
      ...state,
      version: 8,
      bounty: { monster: 'marsh_troll', count: 18, done: 4 },
    };
    for (const field of [...V9_FIELDS, ...V10_FIELDS]) delete v8[field];
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v8 }))).toEqual({
      ok: true,
      state: { ...state, bounty: { monster: 'marsh_troll', count: 18, done: 4 }, ...bearded },
    });
  });

  it('loads a version 9 save with nothing remembered and everything else as it was', () => {
    const v9: Record<string, unknown> = { ...state, version: 9, autoBounty: true };
    for (const field of [...V10_FIELDS, ...V11_FIELDS]) delete v9[field];
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v9 }))).toEqual({
      ok: true,
      state: { ...state, autoBounty: true, seen: [] },
    });
  });

  it('loads a version 10 save with no dungeon run idle and its dungeon records as they were', () => {
    const v10: Record<string, unknown> = {
      ...state,
      version: 10,
      dungeons: { tidepool_cave: { clears: 2, bestMs: 95_000 } },
    };
    for (const field of V11_FIELDS) delete v10[field];
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v10 }))).toEqual({
      ok: true,
      state: { ...state, dungeons: { tidepool_cave: { clears: 2, bestMs: 95_000 } } },
    });
  });

  it('loads a version 11 save with its red cloak moved from the neck to the back', () => {
    const v11: Record<string, unknown> = {
      ...state,
      version: 11,
      equipment: { neck: { item: 'red_cloak', qty: 1 }, body: { item: 'salt_iron_plate', qty: 1 } },
    };
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v11 }))).toEqual({
      ok: true,
      state: {
        ...state,
        equipment: {
          back: { item: 'red_cloak', qty: 1 },
          body: { item: 'salt_iron_plate', qty: 1 },
        },
      },
    });
  });

  it('round-trips a cloak on the back beside an amulet at the neck', () => {
    const knight: GameState = {
      ...state,
      equipment: {
        neck: { item: 'gold_amulet', qty: 1 },
        back: { item: 'red_cloak', qty: 1 },
      },
    };
    expect(readSave(writeSaveExport('file', knight).text)).toEqual({ ok: true, state: knight });
  });

  it('round-trips a dungeon’s records, a run’s statistics and modifier, and a dungeon run idle', () => {
    const progressed: GameState = {
      ...state,
      dungeons: {
        tidepool_cave: {
          clears: 12,
          bestMs: 81_000,
          leastDamage: 0,
          leastFood: 0,
          challenges: ['tidepool_cave.quick', 'tidepool_cave.unhurt'],
          modifiers: ['rich_pickings'],
          idleRuns: 40,
        },
      },
      run: {
        dungeon: 'brinebeards_grotto',
        scene: 1,
        spoils: {
          coins: 0,
          dungeon: 'brinebeards_grotto',
          modifier: 'spring_tide',
          stats: {
            timeMs: 61_000,
            damageTaken: 30,
            foodEaten: 2,
            braces: 1,
            stepOuts: 4,
            knockedOut: false,
            kills: 3,
          },
        },
        data: { room: 'store' },
      },
    };
    expect(readSave(writeSaveExport('code', progressed).text)).toEqual({
      ok: true,
      state: progressed,
    });
    const idling: GameState = {
      ...state,
      action: null,
      health: null,
      idleRun: {
        dungeon: 'tidepool_cave',
        clock: 1_700_000_100_000,
        utcOffset: 60,
        modifier: 'slack_tide',
        room: 1,
        walkMs: 0,
        hp: 17,
        playerMs: 1200,
        foes: [
          { id: 'dock_rat', hp: 4, ms: 900 },
          { id: 'dock_rat', hp: 6, ms: 2000 },
        ],
        runs: 3,
        kills: 21,
        coins: 30,
        loot: { seashells: 4 },
        eaten: 2,
        arrows: 0,
      },
    };
    expect(readSave(writeSaveExport('file', idling).text)).toEqual({ ok: true, state: idling });
  });

  it('round-trips what is remembered, in the order it was remembered', () => {
    const remembering: GameState = {
      ...state,
      seen: ['town.pan', 'cave.lesson.attack', 'cave.lesson.wide_swing', 'grotto-2'],
    };
    expect(readSave(writeSaveExport('code', remembering).text)).toEqual({
      ok: true,
      state: remembering,
    });
  });

  it('round-trips the notice board, auto bounty, a bounty’s pay, a beard and a run under way', () => {
    const board: GameState = {
      ...state,
      look: { ...state.look, beard: 'a-beard', ...{ eyeColour: 'a-part-the-art-added' } },
      bountyBoard: [
        { monster: 'dock_rat', count: 60, points: 4 },
        { monster: 'footpad', count: 22, points: 6 },
      ],
      lastBounty: 'marsh_troll',
      autoBounty: true,
    };
    expect(readSave(writeSaveExport('code', board).text)).toEqual({ ok: true, state: board });
    const hunting: GameState = {
      ...board,
      bountyBoard: [],
      bounty: { monster: 'footpad', count: 22, done: 3, points: 6 },
      run: {
        dungeon: 'brinebeards_grotto',
        scene: 1,
        spoils: { xp: { melee: 120.5 }, loot: { doubloon: 3 }, coins: 40, kills: { deckhand: 2 } },
        data: { room: 'tide_pools', battle: { seed: 77, clock: 1200 } },
      },
    };
    expect(readSave(writeSaveExport('file', hunting).text)).toEqual({ ok: true, state: hunting });
  });

  it('round-trips a log, achievements, clears, counts and perks', () => {
    const seasoned: GameState = {
      ...state,
      collection: ['pine_logs', 'doubloon'],
      achievements: ['first_log'],
      dungeons: { brinebeards_grotto: { clears: 2, bestMs: 412_000 }, test_cave: { clears: 1 } },
      stats: { bounties: 4, streak: 2, bestStreak: 3, potions: 1, bought: 7 },
      perks: ['potion_case'],
    };
    expect(readSave(writeSaveExport('code', seasoned).text)).toEqual({ ok: true, state: seasoned });
  });

  it('round-trips a stunned thief, hurt, holding a bounty and points', () => {
    const thief: GameState = {
      ...state,
      action: { id: 'steal_fisherman', progressMs: 0, stunMs: 1800 },
      marks: { steal_fisherman: { picked: 40, caught: 22, seen: ['raw_shrimp'] } },
      bounty: { monster: 'footpad', count: 24, done: 24 },
      bountyPoints: 31,
      health: { hp: 17, regenMs: 2500 },
    };
    expect(readSave(writeSaveExport('code', thief).text)).toEqual({ ok: true, state: thief });
  });

  it('says so when the text is not a save', () => {
    for (const text of ['', 'hello', '{"game":"other","save":{}}', '[]']) {
      expect(readSave(text)).toEqual({ ok: false, reason: "That isn't a Hearth & Harbour save." });
    }
  });

  it('tells a newer save from a damaged one', () => {
    const wrap = (save: object) => JSON.stringify({ game: SAVE_FILE_GAME, save });
    const newer = readSave(wrap({ ...state, version: GAME_STATE_VERSION + 1 }));
    expect(newer).toMatchObject({ ok: false, reason: expect.stringContaining('newer version') });
    for (const broken of [
      { ...state, version: 'one' },
      { ...state, name: '' },
      { ...state, name: 'x'.repeat(40) },
      { ...state, savedAt: 'yesterday' },
      { ...state, createdAt: -1 },
      { ...state, skills: { woodcutting: -5 } },
      { ...state, skills: null },
      { ...state, bank: { pine_logs: 1.5 } },
      { ...state, action: { id: 'chop_pine' } },
      { ...state, action: 'chop_pine' },
      { ...state, coins: 1.5 },
      { ...state, coins: -1 },
      { ...state, mastery: { chop_pine: 'lots' } },
      { ...state, potion: 'sage_tonic' },
      { ...state, potion: { item: 'sage_tonic' } },
      { ...state, potion: { item: 'sage_tonic', charges: 0 } },
      { ...state, potion: { item: 'sage_tonic', charges: 2.5 } },
      { ...state, potion: { item: 7, charges: 10 } },
      { ...state, potion: undefined },
      { ...state, look: undefined },
      { ...state, look: 'handsome' },
      { ...state, look: { skin: 3 } },
      // A part must be a plain name (any the art may add); its value a string.
      { ...state, look: { 'a nose': 'long' } },
      { ...state, look: { nose: 3 } },
      { ...state, equipment: undefined },
      { ...state, equipment: [] },
      { ...state, equipment: { pocket: { item: 'seashells', qty: 1 } } },
      { ...state, equipment: { head: 'linen_hood' } },
      { ...state, equipment: { head: { item: 'linen_hood', qty: 2 } } },
      { ...state, equipment: { head: { item: 5, qty: 1 } } },
      { ...state, equipment: { ammo: { item: 'bronze_arrows', qty: 0 } } },
      { ...state, equipment: { ammo: { item: 'bronze_arrows', qty: 1.5 } } },
      // Version 12 wears the cloak on the back: at the neck it is an unmigrated older save's.
      { ...state, equipment: { neck: { item: 'red_cloak', qty: 1 } } },
      { ...state, equipment: { back: { item: 'red_cloak', qty: 2 } } },
      { ...state, fight: undefined },
      { ...state, fight: 'dock_rat' },
      // Fighting and chopping at once.
      { ...fighting, action: state.action },
      { ...fighting, fight: { ...fighting.fight, hp: 0 } },
      { ...fighting, fight: { ...fighting.fight, foeHp: -1 } },
      { ...fighting, fight: { ...fighting.fight, playerMs: 0 } },
      { ...fighting, fight: { ...fighting.fight, foeMs: 2.5 } },
      { ...fighting, fight: { ...fighting.fight, monster: 3 } },
      { ...fighting, fight: { ...fighting.fight, kills: -1 } },
      { ...fighting, fight: { ...fighting.fight, loot: { rat_hide: 'some' } } },
      { ...fighting, fight: { ...fighting.fight, eaten: undefined } },
      { ...state, food: { item: 'cooked_herring', qty: 0 } },
      { ...state, food: 'cooked_herring' },
      { ...state, food: undefined },
      { ...state, eatAt: 150 },
      { ...state, eatAt: 'half' },
      { ...state, rng: -1 },
      { ...state, rng: 2 ** 32 },
      { ...state, rng: 0.5 },
      { ...state, bestiary: undefined },
      { ...state, bestiary: { dock_rat: { kills: 1 } } },
      { ...state, bestiary: { dock_rat: { kills: 1, seen: [4] } } },
      // A stun is time still to wait, with nothing in the bar.
      { ...state, action: { id: 'steal_fisherman', progressMs: 0, stunMs: 0 } },
      { ...state, action: { id: 'steal_fisherman', progressMs: 0, stunMs: -5 } },
      { ...state, action: { id: 'steal_fisherman', progressMs: 900, stunMs: 2000 } },
      { ...state, marks: undefined },
      { ...state, marks: { steal_fisherman: { picked: 1, caught: 0 } } },
      { ...state, marks: { steal_fisherman: { picked: -1, caught: 0, seen: [] } } },
      { ...state, marks: { steal_fisherman: { picked: 1, caught: 0.5, seen: [] } } },
      { ...state, bounty: undefined },
      { ...state, bounty: 'dock_rat' },
      { ...state, bounty: { monster: 'dock_rat', count: 0, done: 0 } },
      { ...state, bounty: { monster: 'dock_rat', count: 10, done: 11 } },
      { ...state, bounty: { monster: 3, count: 10, done: 1 } },
      { ...state, bountyPoints: -2 },
      { ...state, bountyPoints: undefined },
      { ...state, health: undefined },
      { ...state, health: { hp: 0, regenMs: 0 } },
      { ...state, health: { hp: 5 } },
      { ...state, health: { hp: 5.5, regenMs: 0 } },
      // Hurt out of a fight while in one.
      { ...fighting, health: { hp: 5, regenMs: 0 } },
      { ...state, collection: undefined },
      { ...state, collection: 'pine_logs' },
      { ...state, collection: ['pine_logs', 'pine_logs'] },
      { ...state, collection: [3] },
      { ...state, achievements: undefined },
      { ...state, achievements: ['first_log', 'first_log'] },
      { ...state, dungeons: undefined },
      { ...state, dungeons: { brinebeards_grotto: 2 } },
      { ...state, dungeons: { brinebeards_grotto: { clears: 0 } } },
      { ...state, dungeons: { brinebeards_grotto: { clears: 1, bestMs: 0 } } },
      { ...state, dungeons: { brinebeards_grotto: { clears: 1.5 } } },
      { ...state, stats: undefined },
      { ...state, stats: { bounties: -1 } },
      { ...state, stats: { luck: 3 } },
      { ...state, stats: { streak: 4, bestStreak: 3 } },
      { ...state, perks: undefined },
      { ...state, perks: [null] },
      { ...state, look: { beard: 7 } },
      { ...state, bounty: { monster: 'dock_rat', count: 10, done: 1, points: -1 } },
      { ...state, bounty: { monster: 'dock_rat', count: 10, done: 1, points: 1.5 } },
      { ...state, bountyBoard: undefined },
      { ...state, bountyBoard: 'dock_rat' },
      { ...state, bountyBoard: [{ monster: 'dock_rat', count: 0, points: 2 }] },
      { ...state, bountyBoard: [{ monster: 'dock_rat', count: 5, points: 0 }] },
      { ...state, bountyBoard: [{ monster: 4, count: 5, points: 2 }] },
      // The same monster twice on the board, and more offers than it holds.
      {
        ...state,
        bountyBoard: [
          { monster: 'dock_rat', count: 5, points: 2 },
          { monster: 'dock_rat', count: 6, points: 2 },
        ],
      },
      {
        ...state,
        bountyBoard: ['a', 'b', 'c', 'd'].map((monster) => ({ monster, count: 5, points: 2 })),
      },
      // Offers still up while a bounty is held.
      {
        ...state,
        bounty: { monster: 'footpad', count: 10, done: 1, points: 3 },
        bountyBoard: [{ monster: 'dock_rat', count: 5, points: 2 }],
      },
      { ...state, lastBounty: 4 },
      { ...state, lastBounty: undefined },
      { ...state, autoBounty: 'yes' },
      { ...state, autoBounty: undefined },
      { ...state, run: undefined },
      { ...state, run: 'grotto' },
      { ...state, run: { dungeon: 'brinebeards_grotto', scene: 0, spoils: {}, data: {} } },
      { ...state, run: { dungeon: 'brinebeards_grotto', scene: 1, spoils: {}, data: 'run' } },
      {
        ...state,
        run: { dungeon: 'brinebeards_grotto', scene: 1, spoils: { coins: -3 }, data: {} },
      },
      {
        ...state,
        run: {
          dungeon: 'brinebeards_grotto',
          scene: 1,
          spoils: { loot: { doubloon: 'lots' } },
          data: {},
        },
      },
      {
        ...state,
        run: {
          dungeon: 'brinebeards_grotto',
          scene: 1,
          spoils: {},
          data: { junk: 'x'.repeat(300 * 1024) },
        },
      },
      // A dungeon's records: whole numbers, lists of ids each once.
      { ...state, dungeons: { tidepool_cave: { clears: 1, leastDamage: -1 } } },
      { ...state, dungeons: { tidepool_cave: { clears: 1, leastFood: 0.5 } } },
      { ...state, dungeons: { tidepool_cave: { clears: 1, idleRuns: 'many' } } },
      { ...state, dungeons: { tidepool_cave: { clears: 1, challenges: 'all' } } },
      { ...state, dungeons: { tidepool_cave: { clears: 1, challenges: ['a', 'a'] } } },
      { ...state, dungeons: { tidepool_cave: { clears: 1, modifiers: [3] } } },
      // A kept run's statistics and modifier.
      {
        ...state,
        run: { dungeon: 'tidepool_cave', scene: 1, spoils: { stats: 'good' }, data: {} },
      },
      {
        ...state,
        run: { dungeon: 'tidepool_cave', scene: 1, spoils: { stats: { braces: -1 } }, data: {} },
      },
      {
        ...state,
        run: {
          dungeon: 'tidepool_cave',
          scene: 1,
          spoils: { stats: { knockedOut: 'no' } },
          data: {},
        },
      },
      { ...state, run: { dungeon: 'tidepool_cave', scene: 1, spoils: { modifier: 4 }, data: {} } },
      { ...state, run: { dungeon: 'tidepool_cave', scene: 1, spoils: { dungeon: 4 }, data: {} } },
      // A dungeon run idle: its shape, and never beside another task or hit points kept outside it.
      { ...state, idleRun: undefined },
      { ...state, idleRun: 'cave' },
      { ...state, action: null, idleRun: { ...IDLE, hp: 0 } },
      { ...state, action: null, idleRun: { ...IDLE, utcOffset: 15 * 60 } },
      { ...state, action: null, idleRun: { ...IDLE, utcOffset: 1.5 } },
      { ...state, action: null, idleRun: { ...IDLE, modifier: 3 } },
      { ...state, action: null, idleRun: { ...IDLE, playerMs: 0 } },
      { ...state, action: null, idleRun: { ...IDLE, loot: { seashells: -1 } } },
      { ...state, action: null, idleRun: { ...IDLE, walkMs: 0 } },
      {
        ...state,
        action: null,
        idleRun: { ...IDLE, foes: [{ id: 'dock_rat', hp: 3, ms: 100 }] },
      },
      {
        ...state,
        action: null,
        idleRun: { ...IDLE, walkMs: 0, foes: [{ id: 'dock_rat', hp: 0, ms: 100 }] },
      },
      { ...state, idleRun: IDLE },
      { ...state, action: null, health: { hp: 3, regenMs: 0 }, idleRun: IDLE },
      // What is remembered: short plain keys, each once, and not without end.
      { ...state, seen: undefined },
      { ...state, seen: 'town.pan' },
      { ...state, seen: { 'town.pan': true } },
      { ...state, seen: ['town.pan', 'town.pan'] },
      { ...state, seen: [7] },
      { ...state, seen: ['town pan'] },
      { ...state, seen: ['<b>'] },
      { ...state, seen: [''] },
      { ...state, seen: ['.town'] },
      { ...state, seen: ['k'.repeat(49)] },
      { ...state, seen: Array.from({ length: 257 }, (_, i) => `key${i}`) },
    ]) {
      expect(readSave(wrap(broken))).toMatchObject({
        ok: false,
        reason: expect.stringContaining('damaged'),
      });
    }
  });
});
