import { describe, expect, it } from 'vitest';
import { DEFENCE, MELEE, RANGED, VITALITY } from '../../src/core/combat';
import { SLOTS } from '../../src/core/content';
import { meets } from '../../src/core/achievements';
import { collectable, collectionSources } from '../../src/core/collection';
import { dungeonName } from '../../src/core/dungeons';
import { foeDrops } from '../../src/core/run';
import { itemTier, tierOf } from '../../src/core/tiers';
import { equip } from '../../src/core/equipment';
import { effectWords, idleModifier, isKind } from '../../src/core/progress';
import { newGame, type GameState } from '../../src/core/state';
import { MAX_LEVEL, xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import { PORTRAIT2_IDS } from '../../src/art/portraits2';
import { ITEM_LAYERS2 } from '../../src/art/character2';
import { ITEM_ICON_IDS } from '../../src/art/icons';
import { foeKind } from '../../src/scene/foes';
import { DUNGEON_PLANS } from '../../src/scene/plans';

// Fixed in docs/lanes.md (wave 6): the dungeon drops them, and art draws them, by these ids.
const GROTTO_LOOT = [
  'doubloon',
  'pirate_cutlass',
  'boarding_axe',
  'tricorn',
  'captains_coat',
  'spyglass',
  'brinebeards_anchor',
  'ships_figurehead',
];

// The tables are typed, but a type cannot see a typo in an id.
describe('the content tables', () => {
  it('keys every row by its own id', () => {
    for (const table of [
      CONTENT.skills,
      CONTENT.items,
      CONTENT.actions,
      CONTENT.areas!,
      CONTENT.monsters!,
    ]) {
      for (const [key, row] of Object.entries(table)) {
        expect(row.id).toBe(key);
      }
    }
  });

  it('has actions that point at real skills and items, with sane numbers', () => {
    for (const action of Object.values(CONTENT.actions)) {
      expect(CONTENT.skills[action.skill], action.id).toBeDefined();
      expect(action.level).toBeGreaterThanOrEqual(1);
      expect(action.level).toBeLessThanOrEqual(MAX_LEVEL);
      expect(action.durationMs).toBeGreaterThan(0);
      expect(action.xp).toBeGreaterThan(0);
      // A theft gives nothing for certain: what it may give is in its `steal`.
      if (action.steal) expect(action.gives, action.id).toEqual([]);
      else expect(action.gives.length, action.id).toBeGreaterThan(0);
      for (const { item, qty } of action.gives) {
        expect(CONTENT.items[item], `${action.id} gives ${item}`).toBeDefined();
        expect(Number.isInteger(qty) && qty > 0).toBe(true);
      }
    }
  });

  it('has recipes that use real items, each of which something makes or a monster drops', () => {
    const made = new Set([
      ...Object.values(CONTENT.actions).flatMap((action) => action.gives.map(({ item }) => item)),
      ...Object.values(CONTENT.monsters!).flatMap((monster) =>
        [...monster.always, ...monster.rare].map(({ item }) => item),
      ),
    ]);
    for (const action of Object.values(CONTENT.actions)) {
      for (const { item, qty } of action.uses ?? []) {
        expect(CONTENT.items[item], `${action.id} uses ${item}`).toBeDefined();
        expect(made.has(item), `nothing makes ${item}`).toBe(true);
        expect(Number.isInteger(qty) && qty > 0).toBe(true);
      }
    }
  });

  it('has potions that help real skills, in whole numbers, and that something brews', () => {
    const potions = Object.values(CONTENT.items).filter((item) => item.potion);
    expect(potions.length).toBeGreaterThanOrEqual(3);
    for (const item of potions) {
      const { charges, skills, effect } = item.potion!;
      expect(Number.isInteger(charges) && charges > 0, item.id).toBe(true);
      expect(skills.length, item.id).toBeGreaterThan(0);
      for (const skill of skills) {
        expect(CONTENT.skills[skill], `${item.id} helps ${skill}`).toBeDefined();
      }
      const amount = effect.kind === 'extra' ? effect.every : effect.percent;
      expect(Number.isInteger(amount) && amount > 0, item.id).toBe(true);
      if (effect.kind === 'speed') expect(effect.percent).toBeLessThan(100);
      // An extra item from a recipe would be something made from nothing.
      if (effect.kind === 'extra') {
        for (const skill of skills) {
          const recipes = Object.values(CONTENT.actions).filter(
            (action) => action.skill === skill && action.uses?.length,
          );
          expect(recipes, `${item.id} doubles ${skill}'s recipes`).toEqual([]);
        }
      }
      const brewedBy = Object.values(CONTENT.actions).filter((action) =>
        action.gives.some((entry) => entry.item === item.id),
      );
      expect(brewedBy.length, `nothing makes ${item.id}`).toBeGreaterThan(0);
    }
  });

  it('gives every wearable made so far a slot and whole, sensible numbers', () => {
    const wearable = [
      'bronze_sword',
      'iron_sword',
      'bronze_axe',
      'iron_axe',
      'bronze_helmet',
      'iron_helmet',
      'bronze_shield',
      'iron_shield',
      'bronze_breastplate',
      'iron_breastplate',
      'bronze_greaves',
      'iron_greaves',
      'linen_hood',
      'linen_tunic',
      'linen_trousers',
      'shell_necklace',
      'shell_bracelet',
      'pine_shortbow',
      'oak_shortbow',
      'willow_shortbow',
      'bronze_arrows',
      'iron_arrows',
    ];
    for (const id of wearable) {
      expect(CONTENT.items[id]?.equip, id).toBeDefined();
    }
    for (const item of Object.values(CONTENT.items)) {
      const def = item.equip;
      if (!def) continue;
      expect(SLOTS, item.id).toContain(def.slot);
      if (def.twoHanded) expect(def.slot, item.id).toBe('main_hand');
      if (def.slot === 'main_hand') expect(def.style, `${item.id} needs a style`).toBeDefined();
      for (const amount of [def.attack ?? 0, def.strength ?? 0, def.armour ?? 0]) {
        expect(Number.isInteger(amount) && amount >= 0, item.id).toBe(true);
      }
    }
    expect(CONTENT.items.pine_shortbow?.equip).toMatchObject({ twoHanded: true, style: 'ranged' });
    expect(CONTENT.items.bronze_arrows?.equip).toMatchObject({ slot: 'ammo', style: 'ranged' });
  });

  it('makes iron clearly better than bronze, and cloth a poor sort of armour', () => {
    const sum = (id: string): number => {
      const def = CONTENT.items[id]!.equip!;
      return (def.attack ?? 0) + (def.strength ?? 0) + (def.armour ?? 0);
    };
    for (const piece of ['sword', 'axe', 'helmet', 'shield', 'breastplate', 'greaves', 'arrows']) {
      expect(sum(`iron_${piece}`), piece).toBeGreaterThanOrEqual(sum(`bronze_${piece}`) * 1.5);
    }
    for (const [cloth, metal] of [
      ['linen_hood', 'bronze_helmet'],
      ['linen_tunic', 'bronze_breastplate'],
      ['linen_trousers', 'bronze_greaves'],
    ] as const) {
      expect(sum(cloth) * 3, cloth).toBeLessThanOrEqual(sum(metal));
    }
  });

  it('groups every action of a skill or none of them', () => {
    for (const skill of Object.values(CONTENT.skills)) {
      const actions = Object.values(CONTENT.actions).filter((a) => a.skill === skill.id);
      const grouped = actions.filter((action) => action.group);
      expect([0, actions.length], skill.id).toContain(grouped.length);
    }
    const smithing = Object.values(CONTENT.actions).filter((a) => a.skill === 'smithing');
    expect([...new Set(smithing.map((action) => action.group))]).toEqual([
      'Bars',
      'Bronze',
      'Iron',
      'Salt-iron',
      'Silver and gold',
    ]);
  });

  it('gives every skill something to do at level 1, except those trained by fighting', () => {
    for (const skill of Object.values(CONTENT.skills)) {
      if (skill.group === 'Combat') continue;
      const first = Object.values(CONTENT.actions).filter(
        (action) => action.skill === skill.id && action.level === 1,
      );
      expect(first.length, skill.id).toBeGreaterThan(0);
    }
  });

  it('has the four combat skills combat reads, under one heading, with nothing to do but fight', () => {
    const combat = Object.values(CONTENT.skills).filter((skill) => skill.group === 'Combat');
    expect(combat.map((skill) => skill.id)).toEqual([MELEE, RANGED, DEFENCE, VITALITY]);
    for (const skill of combat) {
      expect(Object.values(CONTENT.actions).filter((a) => a.skill === skill.id)).toEqual([]);
    }
  });

  it('has the monsters of tier 1 by the ids art draws them by, in real areas, with sane numbers', () => {
    const tier1 = (rows: Record<string, { tier?: number }>): string[] =>
      Object.entries(rows).flatMap(([id, row]) => (row.tier ? [] : [id]));
    expect(tier1(CONTENT.monsters!)).toEqual([
      'dock_rat',
      'sand_crab',
      'thieving_gull',
      'bramble_boar',
      'footpad',
      'grey_wolf',
      'smuggler',
      'marsh_troll',
      'goblin_poacher',
      'bramble_wyrm',
    ]);
    expect(tier1(CONTENT.areas!)).toEqual(['docks', 'north_road', 'saltmarsh', 'blackthorn_wood']);
    for (const monster of Object.values(CONTENT.monsters!)) {
      expect(CONTENT.areas![monster.area], monster.id).toBeDefined();
      for (const amount of [
        monster.level,
        monster.hp,
        monster.attack,
        monster.defence,
        monster.maxHit,
        monster.speedMs,
      ]) {
        expect(Number.isInteger(amount) && amount > 0, monster.id).toBe(true);
      }
      const [least, most] = monster.coins;
      expect(Number.isInteger(least) && least >= 0 && most >= least, monster.id).toBe(true);
      expect(monster.always.length, `${monster.id} always drops something`).toBeGreaterThan(0);
      for (const drop of [...monster.always, ...monster.rare]) {
        expect(CONTENT.items[drop.item], `${monster.id} drops ${drop.item}`).toBeDefined();
        expect(Number.isInteger(drop.min) && drop.min > 0 && drop.max >= drop.min).toBe(true);
      }
      for (const { oneIn } of monster.rare) expect(oneIn).toBeGreaterThan(1);
    }
    // One rare thing each worth chasing, at the far end of the marsh.
    expect(CONTENT.monsters!.smuggler!.rare.map((d) => d.item)).toContain('smugglers_cutlass');
    expect(CONTENT.monsters!.marsh_troll!.rare.map((d) => d.item)).toContain('trollstone');
  });

  it('has marks for Thieving across tier 1, each with a description and sane numbers', () => {
    const marks = Object.values(CONTENT.actions).filter(
      (action) => action.skill === 'thieving' && !action.tier,
    );
    expect(CONTENT.skills.thieving).toMatchObject({ group: 'Roguery' });
    expect(marks.length).toBeGreaterThanOrEqual(4);
    expect(marks.map((mark) => mark.level)[0]).toBe(1);
    expect(Math.max(...marks.map((mark) => mark.level))).toBeLessThanOrEqual(20);
    for (const mark of marks) {
      const steal = mark.steal!;
      expect(steal, mark.id).toBeDefined();
      expect(steal.description.length, mark.id).toBeGreaterThan(10);
      expect(Number.isInteger(steal.difficulty) && steal.difficulty > 0, mark.id).toBe(true);
      // A short stun: a few seconds, not a punishment.
      expect(steal.stunMs, mark.id).toBeGreaterThanOrEqual(1000);
      expect(steal.stunMs, mark.id).toBeLessThanOrEqual(6000);
      const [least, most] = steal.coins;
      expect(Number.isInteger(least) && least > 0 && most >= least, mark.id).toBe(true);
      for (const drop of steal.loot) {
        expect(CONTENT.items[drop.item], `${mark.id} gives ${drop.item}`).toBeDefined();
        expect(Number.isInteger(drop.min) && drop.min > 0 && drop.max >= drop.min).toBe(true);
        expect(drop.oneIn).toBeGreaterThan(1);
      }
    }
    // Only marks are thefts, and no potion helps one.
    for (const action of Object.values(CONTENT.actions)) {
      expect(Boolean(action.steal), action.id).toBe(action.skill === 'thieving');
    }
    for (const item of Object.values(CONTENT.items)) {
      expect(item.potion?.skills ?? [], item.id).not.toContain('thieving');
    }
  });

  it('posts a bounty on every monster, and keeps two for bounty hunters alone', () => {
    for (const monster of Object.values(CONTENT.monsters!)) {
      const { kills, points } = monster.bounty!;
      expect(Number.isInteger(kills[0]) && kills[0] > 0 && kills[1] >= kills[0], monster.id).toBe(
        true,
      );
      expect(Number.isInteger(points) && points > 0, monster.id).toBe(true);
    }
    const hunted = Object.values(CONTENT.monsters!).filter(
      (monster) => monster.bountyOnly && !monster.tier,
    );
    expect(hunted.map((monster) => [monster.id, monster.level])).toEqual([
      ['goblin_poacher', 10],
      ['bramble_wyrm', 18],
    ]);
    for (const monster of hunted) {
      // In an area of their own, with a drop worth the trip: something to wear.
      expect(monster.area).toBe('blackthorn_wood');
      expect(
        monster.rare.some(({ item }) => CONTENT.items[item]?.equip),
        monster.id,
      ).toBe(true);
    }
    expect(
      Object.values(CONTENT.monsters!).filter(
        (monster) => monster.area === 'blackthorn_wood' && !monster.bountyOnly,
      ),
    ).toEqual([]);
  });

  it('stocks the bounty shop with real things nothing else gives', () => {
    const shop = Object.values(CONTENT.shop!);
    expect(shop.length).toBeGreaterThanOrEqual(3);
    const elsewhere = new Set([
      ...Object.values(CONTENT.actions).flatMap((action) => [
        ...action.gives.map(({ item }) => item),
        ...(action.steal?.loot ?? []).map(({ item }) => item),
      ]),
      ...Object.values(CONTENT.monsters!).flatMap((monster) =>
        [...monster.always, ...monster.rare].map(({ item }) => item),
      ),
    ]);
    for (const entry of shop) {
      expect(CONTENT.shop![entry.id], entry.id).toBe(entry);
      expect(CONTENT.items[entry.item], entry.id).toBeDefined();
      expect(Number.isInteger(entry.qty) && entry.qty > 0, entry.id).toBe(true);
      expect(Number.isInteger(entry.cost) && entry.cost > 0, entry.id).toBe(true);
      expect(elsewhere.has(entry.item), `${entry.item} comes from elsewhere too`).toBe(false);
    }
    // A charm a shade above shell, a quiver, and something to wear for the look.
    const sum = (id: string): number => {
      const def = CONTENT.items[id]!.equip!;
      return (def.attack ?? 0) + (def.strength ?? 0) + (def.armour ?? 0);
    };
    expect(sum('hunters_charm')).toBeGreaterThan(sum('shell_necklace'));
    expect(sum('hunters_charm')).toBeLessThanOrEqual(sum('shell_necklace') + 2);
    expect(CONTENT.items.barbed_arrows!.equip!.slot).toBe('ammo');
    expect(CONTENT.shop!.feathered_hat).toMatchObject({ once: true });
  });

  it("has the grotto's loot by the ids the dungeon drops it by, worn where the plan says", () => {
    const worn = (id: string) => CONTENT.items[id]?.equip;
    for (const id of GROTTO_LOOT) expect(CONTENT.items[id], id).toBeDefined();
    expect(worn('doubloon')).toBeUndefined();
    expect(worn('ships_figurehead')).toBeUndefined();
    expect(worn('pirate_cutlass')).toMatchObject({ slot: 'main_hand', style: 'melee' });
    expect(worn('boarding_axe')).toMatchObject({ slot: 'main_hand', style: 'melee' });
    expect(worn('tricorn')).toMatchObject({ slot: 'head' });
    expect(worn('captains_coat')).toMatchObject({ slot: 'body' });
    expect(worn('spyglass')).toMatchObject({ slot: 'off_hand' });
    expect(worn('brinebeards_anchor')).toMatchObject({
      slot: 'main_hand',
      twoHanded: true,
      style: 'melee',
    });
    for (const id of GROTTO_LOOT) {
      const needs = worn(id)?.requires;
      if (!worn(id)) continue;
      expect(needs?.level, id).toBeGreaterThanOrEqual(18);
      expect(needs?.level, id).toBeLessThanOrEqual(20);
    }
  });

  it("sets the grotto's gear just above iron, with the anchor the strongest blow so far", () => {
    const def = (id: string) => CONTENT.items[id]!.equip!;
    const offence = (id: string) => (def(id).attack ?? 0) + (def(id).strength ?? 0);
    // A clear step up from the iron weapon of the same kind.
    expect(offence('pirate_cutlass')).toBeGreaterThanOrEqual(offence('iron_sword') * 1.2);
    expect(offence('boarding_axe')).toBeGreaterThanOrEqual(offence('iron_axe') * 1.2);
    // About iron's armour, with a little attack on top.
    for (const [piece, iron] of [
      ['tricorn', 'iron_helmet'],
      ['captains_coat', 'iron_breastplate'],
    ] as const) {
      expect(def(piece).armour, piece).toBeGreaterThanOrEqual(def(iron).armour! - 2);
      expect(def(piece).armour, piece).toBeLessThanOrEqual(def(iron).armour!);
      expect(def(piece).attack, piece).toBeGreaterThan(0);
      expect(def(piece).attack, piece).toBeLessThanOrEqual(3);
    }
    // An off hand for aiming: attack, and nothing to hide behind.
    expect(def('spyglass').attack).toBeGreaterThan(0);
    expect(def('spyglass').armour ?? 0).toBe(0);
    // The anchor out-hits every melee weapon in the tables, and out-strengths
    // any one-handed weapon even with the best shield's armour beside it.
    // So far: tier 1's (tier 2's salt-iron and the ogre's maul climb past it, S22).
    const melee = Object.values(CONTENT.items).filter(
      (item) =>
        item.equip?.slot === 'main_hand' &&
        item.equip.style === 'melee' &&
        itemTier(CONTENT, item.id) === 1,
    );
    for (const weapon of melee) {
      if (weapon.id === 'brinebeards_anchor') continue;
      expect(def('brinebeards_anchor').strength!, weapon.id).toBeGreaterThan(
        weapon.equip!.strength ?? 0,
      );
      expect(offence('brinebeards_anchor'), weapon.id).toBeGreaterThan(offence(weapon.id));
    }
    // Doubloons sell well; the figurehead hardly at all.
    expect(CONTENT.items.doubloon!.value).toBeGreaterThan(CONTENT.items.smuggled_tea!.value);
    expect(CONTENT.items.ships_figurehead!.value).toBeLessThan(CONTENT.items.doubloon!.value);
  });

  it("wields the anchor in both hands and keeps the grotto's gear from the unready", () => {
    const at = (level: number): GameState => ({
      ...newGame('Cody', 0),
      skills: { melee: xpForLevel(level), defence: xpForLevel(level) },
      bank: { brinebeards_anchor: 1, iron_shield: 1, pirate_cutlass: 1, captains_coat: 1 },
    });
    const shielded = equip(at(20), 'iron_shield', CONTENT);
    if (!shielded.ok) throw new Error(shielded.reason);
    const anchored = equip(shielded.state, 'brinebeards_anchor', CONTENT);
    if (!anchored.ok) throw new Error(anchored.reason);
    expect(anchored.state.equipment.off_hand).toBeUndefined();
    expect(anchored.state.bank.iron_shield).toBe(1);
    expect(equip(at(17), 'pirate_cutlass', CONTENT).ok).toBe(false);
    expect(equip(at(19), 'captains_coat', CONTENT).ok).toBe(false);
    expect(equip(at(20), 'captains_coat', CONTENT).ok).toBe(true);
  });

  it('lists the grotto as a dungeon whose loot is the grotto’s eight items', () => {
    expect(CONTENT.dungeons!.brinebeards_grotto!.loot).toEqual(GROTTO_LOOT);
  });

  // The harbour chart (wave 15): the lesson first, the grotto, then landings to come.
  it('charts every dungeon in order, each with a level, a rule and the words for it', () => {
    const rows = Object.values(CONTENT.dungeons!);
    expect(rows.map((row) => row.id)).toEqual([
      'tidepool_cave',
      'brinebeards_grotto',
      'thistlewood_burrow',
      'unknown_2',
      'unknown_3',
    ]);
    expect(rows.map((row) => row.order)).toEqual([1, 2, 3, 4, 5]);
    for (const row of rows) {
      expect(row.description.length, row.id).toBeGreaterThan(5);
      expect(row.unlockText, row.id).toMatch(/^[A-Z].*\.$/);
      expect(Number.isInteger(row.recommended) && row.recommended >= 1, row.id).toBe(true);
      if (row.unlock.kind === 'cleared')
        expect(CONTENT.dungeons![row.unlock.dungeon], row.id).toBeDefined();
      for (const { item } of row.firstClear ?? []) {
        expect(CONTENT.items[item], `${row.id} first clear ${item}`).toBeDefined();
        expect(row.loot, `${row.id} lists ${item} in its loot`).toContain(item);
      }
      if (row.comingSoon && !row.cast) {
        // A placeholder landing: nothing to give away, no name, loot, cast or reward.
        expect(row.name, row.id).toBe('Uncharted');
        expect([row.loot.length, row.firstClear], row.id).toEqual([0, undefined]);
      }
    }
    // Wave 19: a designed dungeon may wait as a landing to come with its real rows; the burrow
    // waited a wave so, and is charted since wave 20, named.
    const burrow = CONTENT.dungeons!.thistlewood_burrow!;
    expect([burrow.comingSoon, burrow.recommended, burrow.unlock]).toEqual([
      undefined,
      40,
      { kind: 'cleared', dungeon: 'brinebeards_grotto' },
    ]);
    expect(burrow.cast!.map((foe) => foe.id)).toEqual([
      'spore_puff',
      'lantern_moth',
      'cap_guard',
      'bramble_hound',
      'badger_king',
    ]);
    expect(dungeonName(burrow)).toBe('Thistlewood Burrow');
    // Wave 20: lane C's idle rooms, room by room (src/scene/burrow.ts), checked against the plan below.
    expect(burrow.idle!.rooms.map((room) => room.foes.length)).toEqual([3, 4, 5, 4, 5]);
    for (const foe of burrow.cast!) {
      expect(CONTENT.monsters![foe.id], foe.id).toBeUndefined();
      for (const id of foeDrops(foe)) expect(burrow.loot, `${foe.id} drops ${id}`).toContain(id);
    }
    // Recommended levels climb along the chart.
    const levels = rows.map((row) => row.recommended);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  // S16: the day's modifiers and the challenges.
  it('draws every dungeon’s days from modifiers the tables hold, each used, kind for the cave and a trade elsewhere', () => {
    const modifiers = Object.values(CONTENT.modifiers!);
    expect(modifiers.length).toBeGreaterThanOrEqual(6);
    expect(modifiers.length).toBeLessThanOrEqual(12);
    const drawn = new Set<string>();
    for (const dungeon of Object.values(CONTENT.dungeons!)) {
      for (const id of dungeon.modifiers ?? []) {
        expect(CONTENT.modifiers![id], `${dungeon.id} draws ${id}`).toBeDefined();
        drawn.add(id);
      }
      if (dungeon.comingSoon && !dungeon.cast)
        expect(dungeon.modifiers, dungeon.id).toBeUndefined();
    }
    for (const modifier of modifiers) {
      expect(drawn.has(modifier.id), `${modifier.id} is drawn somewhere`).toBe(true);
      expect(modifier.text, modifier.id).toMatch(/^[A-Z].*[.!]$/);
      expect(effectWords(modifier.effects).length, modifier.id).toBeGreaterThan(0);
      const { effects } = modifier;
      const pays = (effects.loot ?? 1) > 1 || (effects.coins ?? 1) > 1 || (effects.xp ?? 1) > 1;
      expect(Boolean(modifier.kind), modifier.id).toBe(isKind(effects));
      // A hero sent through idle takes a kind day as it comes and plays a trade day plain.
      expect(idleModifier(CONTENT, modifier.id), modifier.id).toBe(
        modifier.kind ? modifier.id : null,
      );
      if (!modifier.kind) {
        expect(pays, `${modifier.id} pays for its trouble`).toBe(true);
        // No day takes away what the dungeon is balanced on (wave 18: No Rations could not be
        // cleared): food may go less far, never be forbidden.
        expect(effects.noFood, modifier.id).toBeUndefined();
        // Gentle numbers (wave 18): a trade is at most a quarter harder or richer in any one way.
        for (const value of [
          effects.foeHealth,
          effects.foeDamage,
          effects.foeSpeed,
          effects.heroDamage,
          effects.foodHeals,
          effects.tideFaster,
          effects.loot,
          effects.coins,
          effects.xp,
        ]) {
          if (value !== undefined)
            expect(Math.abs(value - 1), modifier.id).toBeLessThanOrEqual(0.25 + 1e-9);
        }
      }
      // And a kind one no more than half again.
      for (const value of [effects.foeSpeed, effects.loot, effects.coins, effects.xp]) {
        if (value !== undefined) expect(Math.abs(value - 1), modifier.id).toBeLessThanOrEqual(0.5);
      }
    }
    // The tide is the grotto's own: only a dungeon with one draws a day that hurries it.
    for (const dungeon of Object.values(CONTENT.dungeons!)) {
      for (const id of dungeon.modifiers ?? []) {
        if (CONTENT.modifiers![id]!.effects.tideFaster)
          expect(dungeon.id, id).toBe('brinebeards_grotto');
      }
    }
  });

  it('gives each built dungeon three or four challenges, paid in things the tables hold', () => {
    const ids = new Set<string>();
    for (const dungeon of Object.values(CONTENT.dungeons!)) {
      if (dungeon.comingSoon && !dungeon.cast) {
        expect(dungeon.challenges, dungeon.id).toBeUndefined();
        continue;
      }
      const challenges = dungeon.challenges ?? [];
      expect(challenges.length, dungeon.id).toBeGreaterThanOrEqual(3);
      expect(challenges.length, dungeon.id).toBeLessThanOrEqual(4);
      for (const challenge of challenges) {
        expect(ids.has(challenge.id), challenge.id).toBe(false);
        ids.add(challenge.id);
        expect(challenge.id.startsWith(`${dungeon.id}.`), challenge.id).toBe(true);
        expect(challenge.text, challenge.id).toMatch(/^[A-Z].*\.$/);
        for (const { item, qty } of challenge.reward.items ?? []) {
          expect(CONTENT.items[item], `${challenge.id} pays ${item}`).toBeDefined();
          expect(Number.isInteger(qty) && qty > 0, challenge.id).toBe(true);
        }
        if (challenge.rule.kind === 'withModifier' && challenge.rule.id) {
          expect(dungeon.modifiers, challenge.id).toContain(challenge.rule.id);
        }
      }
    }
  });

  // S16: how a dungeon is run idle (src/core/idleRun.ts). Its rooms are the
  // scene's own cast, so who is met idle is who is met by hand: every foe the
  // scene places (src/scene/plans.ts), and those a boss calls in, once each.
  it('runs each built dungeon idle on the scene’s own cast, at a walk, keeping a share and never the rarest', () => {
    for (const dungeon of Object.values(CONTENT.dungeons!)) {
      // A placeholder landing has no rooms; a designed one waiting to open (the burrow, wave
      // 20) has them already, held to its plan like any other (`startIdleRun` refuses it).
      if (dungeon.comingSoon && !dungeon.cast) {
        expect(dungeon.idle, dungeon.id).toBeUndefined();
        continue;
      }
      const idle = dungeon.idle!;
      expect(idle, dungeon.id).toBeDefined();
      const cast = new Set(dungeon.cast!.map((foe) => foe.id));
      for (const room of idle.rooms) {
        expect(room.foes.length, dungeon.id).toBeGreaterThan(0);
        for (const id of room.foes) expect(cast.has(id), `${dungeon.id} ${id}`).toBe(true);
        expect(Number.isInteger(room.walkMs) && room.walkMs >= 1000, dungeon.id).toBe(true);
      }
      expect(idle.tripMs, dungeon.id).toBeGreaterThanOrEqual(30_000);
      expect(idle.lootPercent, dungeon.id).toBeGreaterThan(0);
      expect(idle.lootPercent, dungeon.id).toBeLessThan(100);
      for (const item of idle.activeOnly ?? []) expect(dungeon.loot, dungeon.id).toContain(item);
      const tally = (ids: string[]): Record<string, number> =>
        ids.reduce<Record<string, number>>((all, id) => ({ ...all, [id]: (all[id] ?? 0) + 1 }), {});
      const plan = DUNGEON_PLANS[dungeon.id]!;
      const placed = Object.values(plan.foes ?? {}).flatMap((foes) =>
        foes.map((foe) => foe.monster),
      );
      // Those a boss calls, in every phase (the burrow's king calls more as he goes: `more`).
      const called = placed.flatMap((id) => {
        const boss = foeKind(id).boss;
        return [...(boss?.calls ? [boss.calls] : []), ...(boss?.more ?? [])].flatMap((call) =>
          Array.from({ length: call.count }, () => call.monster),
        );
      });
      expect(tally(idle.rooms.flatMap((room) => [...room.foes])), dungeon.id).toEqual(
        tally([...placed, ...called]),
      );
    }
    // The grotto's rarest things are only found by hand (docs/design.md, open question 2).
    expect(CONTENT.dungeons!.brinebeards_grotto!.idle!.activeOnly).toEqual([
      'brinebeards_anchor',
      'ships_figurehead',
    ]);
  });

  it('opens the cave from the start at level 1, and the grotto by advice alone', () => {
    const cave = CONTENT.dungeons!.tidepool_cave!;
    expect([cave.recommended, cave.unlock]).toEqual([1, { kind: 'none' }]);
    const grotto = CONTENT.dungeons!.brinebeards_grotto!;
    expect([grotto.recommended, grotto.unlock]).toEqual([20, { kind: 'none' }]);
  });

  // The cave's dock rats and sand crabs are the shore's own creatures (one
  // bestiary entry each), so what they drop there must be among what the
  // tables' rows say they drop, or it would never show as seen.
  it("holds the cave's cast: the shore's rat and crab, weaker, and a boss of its own", () => {
    const cast = CONTENT.dungeons!.tidepool_cave!.cast!;
    expect(cast.map((foe) => foe.id)).toEqual(['dock_rat', 'sand_crab', 'old_snapper']);
    for (const foe of cast) {
      const table = CONTENT.monsters![foe.id];
      const drops = [...foe.always, ...foe.rare].map((drop) => drop.item);
      for (const id of drops) expect(CONTENT.items[id], `${foe.id} drops ${id}`).toBeDefined();
      if (!table) continue;
      const theirs = [...table.always, ...table.rare].map((drop) => drop.item);
      for (const id of drops) expect(theirs, `${foe.id} drops ${id}`).toContain(id);
      for (const key of ['hp', 'attack', 'defence', 'maxHit'] as const)
        expect(foe[key], `${foe.id} ${key}`).toBeLessThan(table[key]);
    }
    expect(CONTENT.monsters!.old_snapper).toBeUndefined();
    const levels = cast.map((foe) => foe.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  // The scene reads its cast from src/data/dungeons.ts (lane C, wave 12), so
  // there is one set of numbers and nothing to keep in step with it.
  it("holds the grotto's cast: none a table monster, each with a face and real drops, weakest first", () => {
    for (const foe of CONTENT.dungeons!.brinebeards_grotto!.cast!) {
      expect(CONTENT.monsters![foe.id], foe.id).toBeUndefined();
      expect(PORTRAIT2_IDS, foe.id).toContain(foe.id);
      for (const id of [
        ...foe.always.map((drop) => drop.item),
        ...foe.rare.map((drop) => drop.item),
        ...(foe.pick?.items ?? []),
      ])
        expect(CONTENT.items[id], `${foe.id} drops ${id}`).toBeDefined();
    }
    // Listed weakest first, the captain last.
    const levels = CONTENT.dungeons!.brinebeards_grotto!.cast!.map((foe) => foe.level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it('has a face from the art for every monster the menus show', () => {
    for (const id of Object.keys(CONTENT.monsters!)) expect(PORTRAIT2_IDS, id).toContain(id);
  });

  it('has a face from the art for everyone in every dungeon’s cast', () => {
    // A dungeon still to come is not shown in the menus (the bestiary lists only charted ones), so
    // its cast's faces may arrive with its art pass; once it opens, this holds them too.
    const cast = Object.values(CONTENT.dungeons!)
      .filter((dungeon) => !dungeon.comingSoon)
      .flatMap((dungeon) => dungeon.cast ?? []);
    expect(cast.map((foe) => foe.id)).toContain('old_snapper');
    for (const foe of cast) expect(PORTRAIT2_IDS, foe.id).toContain(foe.id);
  });

  // Wave 20: a dungeon is charted only once it can be played in full in the menus too: rooms to
  // run idle, a face for everyone in its cast, an icon for everything it gives up, and its first
  // clear's and challenges' things among them.
  it('gives every charted dungeon idle rooms, faces and icons', () => {
    const charted = Object.values(CONTENT.dungeons!).filter((dungeon) => !dungeon.comingSoon);
    expect(charted.map((dungeon) => dungeon.id)).toContain('thistlewood_burrow');
    for (const dungeon of charted) {
      expect(dungeon.idle?.rooms.length ?? 0, dungeon.id).toBeGreaterThan(0);
      for (const foe of dungeon.cast ?? []) expect(PORTRAIT2_IDS, foe.id).toContain(foe.id);
      const things = [
        ...dungeon.loot,
        ...(dungeon.firstClear ?? []).map((reward) => reward.item),
        ...(dungeon.challenges ?? []).flatMap((c) => (c.reward.items ?? []).map((r) => r.item)),
      ];
      for (const item of things) expect(ITEM_ICON_IDS, `${dungeon.id} ${item}`).toContain(item);
    }
  });

  it('describes the captain’s coat in the colour art draws it', () => {
    expect(CONTENT.items.captains_coat!.description).toMatch(/^Long, purple/);
  });

  it('stocks the general store with real things, each dearer than it sells back for', () => {
    const store = Object.values(CONTENT.store!);
    for (const entry of store) {
      expect(CONTENT.store![entry.id], entry.id).toBe(entry);
      expect(Number.isInteger(entry.price) && entry.price > 0, entry.id).toBe(true);
      if (entry.perk) {
        expect(entry.perk.description.length, entry.id).toBeGreaterThan(10);
        // What it does is said in numbers, and they are its own (Cody found the
        // case's old words confusing): a potion perk names its percent.
        expect(entry.perk.effect, entry.id).toMatch(/\d/);
        if (entry.perk.potionCharges) {
          expect(entry.perk.effect, entry.id).toContain(`${entry.perk.potionCharges}%`);
          const base = 150;
          const stretched = Math.floor((base * (100 + entry.perk.potionCharges)) / 100);
          expect(entry.perk.effect, entry.id).toContain(`${base} actions helps ${stretched}`);
          expect(entry.perk.shows, entry.id).toContain('potions');
        }
        continue;
      }
      const item = CONTENT.items[entry.item];
      expect(item, entry.id).toBeDefined();
      expect(Number.isInteger(entry.qty) && entry.qty > 0, entry.id).toBe(true);
      // Buying to sell straight back never pays, and making it yourself is cheaper.
      expect(entry.price, entry.id).toBeGreaterThan(entry.qty * item!.value * 1.5);
    }
    // A way into every style of fighting, food, and the bottles Alchemy needs.
    const sold = store.flatMap((entry) => (entry.item ? [entry.item] : []));
    const worn = (style: string) =>
      sold.some(
        (id) =>
          CONTENT.items[id]!.equip?.style === style &&
          CONTENT.items[id]!.equip?.slot === 'main_hand',
      );
    expect(worn('melee') && worn('ranged')).toBe(true);
    expect(sold.some((id) => CONTENT.items[id]!.equip?.slot === 'ammo')).toBe(true);
    expect(sold.some((id) => CONTENT.items[id]!.heals)).toBe(true);
    expect(sold).toContain('shell_vial');
    // And something dear to save for: a lasting thing and something to wear for the look.
    expect(store.some((entry) => entry.perk?.potionCharges)).toBe(true);
    expect(store.some((entry) => entry.once && entry.price >= 50_000)).toBe(true);
  });

  it('lists every item in the collection log under where it comes from', () => {
    const listed = new Set(collectable(CONTENT));
    for (const id of Object.keys(CONTENT.items)) {
      expect(listed.has(id), `${id} comes from nowhere the log knows`).toBe(true);
    }
    const sources = collectionSources(CONTENT);
    expect(sources[0]).toMatchObject({ id: 'skills:Gathering' });
    expect(sources.map((source) => source.id)).toContain('dungeon:brinebeards_grotto');
    expect(sources.map((source) => source.id)).toContain('bounty_shop');
  });

  // Thirty-one since the Tidepool Cave's two (wave 15), forty-two since S16's
  // eleven (wave 17); the set grows with the content.
  it('has about forty achievements over real things, with names and lines', () => {
    const all = Object.values(CONTENT.achievements!);
    expect(all.length).toBeGreaterThanOrEqual(22);
    // Fifty since S22's eight for tier 2 (wave 19); raised on purpose as the content grows.
    expect(all.length).toBeLessThanOrEqual(60);
    expect(all.some((def) => def.hidden)).toBe(true);
    const names = new Set<string>();
    for (const def of all) {
      expect(CONTENT.achievements![def.id], def.id).toBe(def);
      expect(def.name.length, def.id).toBeGreaterThan(2);
      expect(def.text.length, def.id).toBeGreaterThan(8);
      expect(names.has(def.name), `${def.name} twice`).toBe(false);
      names.add(def.name);
      const rule = def.rule;
      if (rule.kind === 'found' || rule.kind === 'worn') {
        for (const item of rule.items)
          expect(CONTENT.items[item], `${def.id}: ${item}`).toBeDefined();
      }
      if (rule.kind === 'made') {
        for (const item of rule.items) {
          expect(
            Object.values(CONTENT.actions).some(
              (action) => !action.steal && action.gives.some((g) => g.item === item),
            ),
            `${def.id}: nothing makes ${item}`,
          ).toBe(true);
        }
      }
      if (rule.kind === 'level') {
        if (rule.skill) expect(CONTENT.skills[rule.skill], def.id).toBeDefined();
        if (rule.group) {
          expect(
            Object.values(CONTENT.skills).some((skill) => skill.group === rule.group),
            def.id,
          ).toBe(true);
        }
      }
      if (rule.kind === 'kills' && rule.monster) {
        expect(CONTENT.monsters![rule.monster], def.id).toBeDefined();
      }
      if (
        rule.kind === 'cleared' ||
        rule.kind === 'challenges' ||
        rule.kind === 'underModifiers' ||
        (rule.kind === 'idleRuns' && rule.dungeon)
      ) {
        expect(CONTENT.dungeons![rule.dungeon!], def.id).toBeDefined();
      }
      if (rule.kind === 'collected') {
        expect(rule.count, def.id).toBeLessThanOrEqual(collectable(CONTENT).length);
      }
      // Nobody has one at the start.
      expect(meets(newGame('Cody', 0), rule, CONTENT), def.id).toBe(false);
    }
  });

  // Cody's Milestone A review: the first foraging achievement came from a sand
  // crab's shells. A skill's achievements are for doing it; one that reads
  // the collection log is about owning a thing, so it may name only what no
  // skill makes (a monster's prize, the grotto's loot).
  it('earns a skill’s achievements by doing it, never by owning what it makes', () => {
    const made = new Set(
      Object.values(CONTENT.actions)
        .filter((action) => !action.steal)
        .flatMap((action) => action.gives.map(({ item }) => item)),
    );
    for (const def of Object.values(CONTENT.achievements!)) {
      if (def.rule.kind !== 'found') continue;
      for (const item of def.rule.items) expect(made.has(item), `${def.id}: ${item}`).toBe(false);
    }
    const firsts = [
      'first_log',
      'first_catch',
      'first_ore',
      'first_find',
      'first_meal',
      'first_bar',
    ];
    for (const id of firsts) expect(CONTENT.achievements![id]!.rule.kind, id).toBe('made');
  });

  it('feeds Crafting with hides, and gives leather a small set of armour', () => {
    const drops = (item: string) =>
      Object.values(CONTENT.monsters!).filter((m) => m.always.some((d) => d.item === item));
    expect(drops('hide').length).toBeGreaterThanOrEqual(2);
    const tanning = Object.values(CONTENT.actions).find((a) =>
      a.uses?.some(({ item }) => item === 'hide'),
    );
    expect(tanning).toMatchObject({ skill: 'crafting', gives: [{ item: 'leather', qty: 1 }] });
    for (const piece of ['leather_cap', 'leather_jerkin', 'leather_bracers']) {
      expect(CONTENT.items[piece]?.equip, piece).toBeDefined();
      expect(
        Object.values(CONTENT.actions).some((a) => a.gives.some(({ item }) => item === piece)),
        `nothing makes ${piece}`,
      ).toBe(true);
    }
  });

  it('heals with the cooked fish, more for the better fish, and with nothing raw', () => {
    const heals = (id: string) => CONTENT.items[id]!.heals ?? 0;
    expect(heals('cooked_shrimp')).toBeGreaterThan(0);
    expect(heals('cooked_herring')).toBeGreaterThan(heals('cooked_shrimp'));
    expect(heals('cooked_cod')).toBeGreaterThan(heals('cooked_herring'));
    for (const raw of ['raw_shrimp', 'raw_herring', 'raw_cod']) expect(heals(raw)).toBe(0);
  });

  it('asks levels to wear things: bronze at 1, iron at 10, bows by Ranged', () => {
    const needs = (id: string) => CONTENT.items[id]!.equip!.requires;
    for (const piece of ['sword', 'axe', 'helmet', 'shield', 'breastplate', 'greaves']) {
      expect(needs(`bronze_${piece}`), piece).toBeUndefined();
      expect(needs(`iron_${piece}`)?.level, piece).toBe(10);
    }
    expect(needs('iron_sword')?.skill).toBe(MELEE);
    expect(needs('iron_helmet')?.skill).toBe(DEFENCE);
    expect(needs('pine_shortbow')).toBeUndefined();
    expect(needs('oak_shortbow')).toEqual({ skill: RANGED, level: 10 });
    expect(needs('willow_shortbow')?.skill).toBe(RANGED);
    for (const item of Object.values(CONTENT.items)) {
      const requires = item.equip?.requires;
      if (requires) expect(CONTENT.skills[requires.skill], item.id).toBeDefined();
    }
  });
});

// Tier 2 (S22): every id is docs/tier2-manifest.md's, fixed, since lane B's
// art keys on them. Its rows follow tier 1's shape, a tier up.
describe('tier 2', () => {
  const T2_ITEMS = [
    'driftwood',
    'elm_logs',
    'yew_logs',
    'raw_mackerel',
    'raw_halibut',
    'raw_swordfish',
    'salt_iron_ore',
    'silver_ore',
    'gold_ore',
    'sea_holly',
    'nettles',
    'sea_glass',
    'duskbloom',
    'cooked_mackerel',
    'cooked_halibut',
    'cooked_swordfish',
    'salt_iron_bar',
    'silver_bar',
    'gold_bar',
    'salt_iron_arrowheads',
    'nettle_cloth',
    'thick_hide',
    'thick_leather',
    'salt_iron_axe',
    'salt_iron_sword',
    'salt_iron_helm',
    'salt_iron_shield',
    'salt_iron_greaves',
    'salt_iron_plate',
    'red_cloak',
    'salt_iron_arrows',
    'ranger_hood',
    'ranger_bracers',
    'ranger_coat',
    'driftwood_shortbow',
    'elm_longbow',
    'yew_longbow',
    'silver_bangle',
    'gold_amulet',
    'ogre_maul',
    'briar_charm',
    'mossback_shield',
    'broadhead_arrows',
    'holly_tonic',
    'forgehand_draught',
    'duskbloom_tincture',
    'twilight_elixir',
  ];
  const actions = Object.values(CONTENT.actions).filter((action) => tierOf(action) === 2);

  it('holds every id of the manifest, each of tier 2', () => {
    for (const id of T2_ITEMS) {
      expect(CONTENT.items[id], id).toBeDefined();
      expect(itemTier(CONTENT, id), id).toBe(2);
    }
    expect(
      Object.values(CONTENT.monsters!)
        .filter((monster) => monster.tier === 2)
        .map((monster) => monster.id),
    ).toEqual([
      'brigand',
      'black_bear',
      'hobgoblin',
      'dire_wolf',
      'hill_ogre',
      'briar_hag',
      'moss_golem',
    ]);
    expect(actions.filter((action) => action.steal).map((action) => action.id)).toEqual([
      'steal_spice_merchant',
      'steal_customs_house',
      'steal_noble',
      'steal_guild_coffer',
      'steal_counting_house',
    ]);
  });

  it('gives every skill with actions something from 20 to 39, in tier 1’s shape', () => {
    const count = (skill: string): number => actions.filter((a) => a.skill === skill).length;
    for (const skill of ['woodcutting', 'fishing', 'mining']) expect(count(skill), skill).toBe(3);
    expect(count('foraging')).toBe(4);
    expect(count('cooking')).toBe(3);
    expect(count('alchemy')).toBe(4);
    expect(count('thieving')).toBe(5);
    for (const action of actions) {
      expect(action.level, action.id).toBeGreaterThanOrEqual(20);
      expect(action.level, action.id).toBeLessThan(40);
    }
    // Each skill's first opens at 20, on the tier's first day.
    for (const skill of Object.values(CONTENT.skills)) {
      if (skill.group === 'Combat') continue;
      expect(Math.min(...actions.filter((a) => a.skill === skill.id).map((a) => a.level))).toBe(20);
    }
  });

  it('makes salt-iron about half as good again as iron, the knight’s set', () => {
    const def = (id: string) => CONTENT.items[id]!.equip!;
    const offence = (id: string) => (def(id).attack ?? 0) + (def(id).strength ?? 0);
    for (const piece of ['sword', 'axe'])
      expect(offence(`salt_iron_${piece}`) / offence(`iron_${piece}`), piece).toBeGreaterThan(1.4);
    for (const [salt, iron] of [
      ['salt_iron_helm', 'iron_helmet'],
      ['salt_iron_shield', 'iron_shield'],
      ['salt_iron_greaves', 'iron_greaves'],
      ['salt_iron_plate', 'iron_breastplate'],
    ] as const) {
      const ratio = def(salt).armour! / def(iron).armour!;
      expect(ratio, salt).toBeGreaterThan(1.4);
      expect(ratio, salt).toBeLessThan(1.8);
    }
    // Wave 20: the cloak has the back to itself, so a knight wears it and an amulet.
    expect(def('red_cloak').slot).toBe('back');
    // Each needs a tier 2 level to wear, the plate the most.
    for (const id of T2_ITEMS.filter((id) => id.startsWith('salt_iron_') && def(id) !== undefined))
      if (CONTENT.items[id]!.equip) expect(def(id).requires!.level, id).toBeGreaterThanOrEqual(20);
  });

  it('fights in two areas of its own, at its rate of XP, two for bounty hunters alone', () => {
    const monsters = Object.values(CONTENT.monsters!).filter((monster) => monster.tier === 2);
    for (const monster of monsters) {
      expect(CONTENT.areas![monster.area]!.tier, monster.id).toBe(2);
      expect(monster.level, monster.id).toBeGreaterThanOrEqual(22);
      expect(monster.level, monster.id).toBeLessThanOrEqual(40);
      expect(monster.xpPercent, monster.id).toBe(270);
    }
    const hunted = monsters.filter((monster) => monster.bountyOnly);
    expect(hunted.map((monster) => monster.area)).toEqual(['the_deepthorn', 'the_deepthorn']);
    for (const monster of hunted)
      expect(
        monster.rare.some(({ item }) => CONTENT.items[item]?.equip),
        monster.id,
      ).toBe(true);
    // Tier 1's monsters pay XP as they always have.
    for (const monster of Object.values(CONTENT.monsters!).filter((m) => !m.tier))
      expect(monster.xpPercent, monster.id).toBeUndefined();
  });

  it('sells tier 2’s things only once tier 2 is open', () => {
    expect(
      Object.values(CONTENT.store!)
        .filter((entry) => entry.tier === 2)
        .map((entry) => entry.id),
    ).toEqual(['cooked_mackerel', 'salt_iron_arrows']);
    expect(
      Object.values(CONTENT.shop!)
        .filter((entry) => entry.tier === 2)
        .map((entry) => entry.id),
    ).toEqual(['broadhead_arrows']);
  });
});

// Nothing reaches the menus half-drawn (S22): every item has an icon from the
// art's door and every wearable a figure layer, so a new row waits for its
// art, not the other way round.
describe('art for every row', () => {
  it('has an icon for every item and a figure layer for every wearable', () => {
    // What only a landing still to come gives can wait for that dungeon's art pass.
    const charted = new Set(
      collectionSources({
        ...CONTENT,
        dungeons: Object.fromEntries(
          Object.entries(CONTENT.dungeons!).filter(([, dungeon]) => !dungeon.comingSoon),
        ),
      }).flatMap((source) => source.items),
    );
    for (const item of Object.values(CONTENT.items)) {
      if (!charted.has(item.id)) continue;
      expect(ITEM_ICON_IDS, `${item.id} has an icon`).toContain(item.id);
      if (item.equip) expect(ITEM_LAYERS2[item.id], `${item.id} has a layer`).toBeDefined();
    }
  });
});
