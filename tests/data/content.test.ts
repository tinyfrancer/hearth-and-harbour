import { describe, expect, it } from 'vitest';
import { DEFENCE, MELEE, RANGED, VITALITY } from '../../src/core/combat';
import { SLOTS } from '../../src/core/content';
import { meets } from '../../src/core/achievements';
import { collectable, collectionSources } from '../../src/core/collection';
import { equip } from '../../src/core/equipment';
import { newGame, type GameState } from '../../src/core/state';
import { MAX_LEVEL, xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';

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
    for (const piece of ['sword', 'axe', 'helmet', 'shield', 'breastplate', 'arrows']) {
      expect(sum(`iron_${piece}`), piece).toBeGreaterThanOrEqual(sum(`bronze_${piece}`) * 1.5);
    }
    for (const [cloth, metal] of [
      ['linen_hood', 'bronze_helmet'],
      ['linen_tunic', 'bronze_breastplate'],
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
    expect(Object.keys(CONTENT.monsters!)).toEqual([
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
    expect(Object.keys(CONTENT.areas!)).toEqual([
      'docks',
      'north_road',
      'saltmarsh',
      'blackthorn_wood',
    ]);
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
    const marks = Object.values(CONTENT.actions).filter((action) => action.skill === 'thieving');
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
    const hunted = Object.values(CONTENT.monsters!).filter((monster) => monster.bountyOnly);
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
    const melee = Object.values(CONTENT.items).filter(
      (item) => item.equip?.slot === 'main_hand' && item.equip.style === 'melee',
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
    expect(Object.keys(CONTENT.dungeons!)).toEqual(['brinebeards_grotto']);
    expect(CONTENT.dungeons!.brinebeards_grotto!.loot).toEqual(GROTTO_LOOT);
  });

  it('stocks the general store with real things, each dearer than it sells back for', () => {
    const store = Object.values(CONTENT.store!);
    for (const entry of store) {
      expect(CONTENT.store![entry.id], entry.id).toBe(entry);
      expect(Number.isInteger(entry.price) && entry.price > 0, entry.id).toBe(true);
      if (entry.perk) {
        expect(entry.perk.description.length, entry.id).toBeGreaterThan(10);
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

  it('has about twenty-five achievements over real things, with names and lines', () => {
    const all = Object.values(CONTENT.achievements!);
    expect(all.length).toBeGreaterThanOrEqual(22);
    expect(all.length).toBeLessThanOrEqual(30);
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
      if (rule.kind === 'cleared') expect(CONTENT.dungeons![rule.dungeon], def.id).toBeDefined();
      if (rule.kind === 'collected') {
        expect(rule.count, def.id).toBeLessThanOrEqual(collectable(CONTENT).length);
      }
      // Nobody has one at the start.
      expect(meets(newGame('Cody', 0), rule, CONTENT), def.id).toBe(false);
    }
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
    for (const piece of ['sword', 'axe', 'helmet', 'shield', 'breastplate']) {
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
