import { beforeEach, describe, expect, it } from 'vitest';
import { settleRun } from '../../src/core/run';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';

// The Combat pages, driven the way a thumb would, against real storage.
let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();
const saved = (): GameState => saves().load()!;

const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const press = (label: string): void => {
  const found = [...root.querySelectorAll('button')].find((b) => b.textContent === label);
  if (!found) throw new Error(`no button says ${label}`);
  found.click();
};
const tab = (id: string): void => q<HTMLButtonElement>(`.tab[data-tab="${id}"]`).click();
const lastToast = (): string => [...root.querySelectorAll('.toast')].at(-1)?.textContent ?? '';

/** A character from a save, with `extra` laid over a fresh one, on the Skills tab. */
function playing(extra: Partial<GameState> = {}): App {
  saves().save({
    ...newGame('Cody', clock),
    equipment: { main_hand: { item: 'bronze_sword', qty: 1 } },
    ...extra,
  });
  return mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
}

/** Live play: `ms` of frames a second apart. */
function play(app: App, ms: number): void {
  for (let spent = 0; spent < ms; spent += 1000) {
    clock += 1000;
    app.tick();
  }
}

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

describe('the Combat section', () => {
  it('heads the combat skills with a way into the fighting', () => {
    playing();
    const combat = q('[data-group="Combat"]');
    expect([...combat.querySelectorAll('[data-skill] h2')].map((el) => el.textContent)).toEqual([
      'Melee',
      'Ranged',
      'Defence',
      'Vitality',
    ]);
    q<HTMLButtonElement>('[data-combat]').click();
    expect(q('[data-area="docks"]').textContent).toContain('The Docks');
    press('‹ All skills');
    // A combat skill's card leads to the fighting too: it has nothing else to do.
    q<HTMLButtonElement>('[data-skill="defence"]').click();
    // Tier 2's two areas (S22) are listed too, closed until the grotto is cleared.
    expect(root.querySelectorAll('[data-area]')).toHaveLength(6);
    // The first areas list in a worker draws every monster's face: seconds in jsdom.
  }, 20_000);

  it('lists every monster with its level, and its drops as "?" until they are seen', () => {
    playing();
    q<HTMLButtonElement>('[data-combat]').click();
    expect(root.querySelectorAll('[data-monster]')).toHaveLength(17);
    const rat = q('[data-monster="dock_rat"]');
    expect(rat.textContent).toContain('Level 1');
    expect(rat.querySelector('.drops')!.textContent).toBe('Drops: ?, ?, ?');
    // Every monster's face comes from the art's C-scale door, the bounty-only ones too
    // (until wave 11 the goblin's frame held a blank "G").
    for (const card of root.querySelectorAll('[data-monster]')) {
      expect(card.querySelector('.portrait:not(.blank) .portrait2-art'), card.id).not.toBeNull();
    }
    expect(q('[data-monster="goblin_poacher"] .portrait2-art')).not.toBeNull();
    expect(root.querySelector('[data-monster] .portrait.blank')).toBeNull();
  });

  it("lists the grotto's cast after the areas: who has been beaten there, and a ? for the rest", () => {
    playing({
      bestiary: { deckhand: { kills: 23, seen: [] }, brinebeard: { kills: 1, seen: [] } },
    });
    q<HTMLButtonElement>('[data-combat]').click();
    const grotto = q('[data-dungeon="brinebeards_grotto"]');
    expect(grotto.querySelector('.group-heading')!.textContent).toBe('Brinebeard’s Grotto');
    // After every area (and the cave, before it on the chart), and not something to tap and
    // fight from here.
    expect(grotto.previousElementSibling!.matches('[data-dungeon="tidepool_cave"]')).toBe(true);
    expect(grotto.previousElementSibling!.previousElementSibling!.matches('[data-area]')).toBe(
      true,
    );
    expect(grotto.querySelector('button')).toBeNull();
    const cast = [...grotto.querySelectorAll<HTMLElement>('[data-cast]')];
    expect(cast.map((el) => el.dataset.cast)).toEqual(
      CONTENT.dungeons!.brinebeards_grotto!.cast!.map((foe) => foe.id),
    );
    // Once beaten, as a table monster is shown: level, numbers, drops (by name once held), kills.
    const deckhand = CONTENT.dungeons!.brinebeards_grotto!.cast!.find((f) => f.id === 'deckhand')!;
    expect(q('[data-cast="deckhand"] h2').textContent).toBe('Deckhand');
    expect(q('[data-cast="deckhand"] .level').textContent).toBe(`Level ${deckhand.level}`);
    expect(q('[data-cast="deckhand"]').textContent).toContain(
      `${deckhand.hp} hit points · hits up to ${deckhand.maxHit}`,
    );
    expect(q('[data-cast="deckhand"] .drops').textContent).toBe('Drops: ?, ?, ?');
    expect(q('[data-cast="deckhand"]').textContent).toContain('Killed 23');
    expect(q('[data-cast="deckhand"] .portrait:not(.blank) .portrait2-art')).not.toBeNull();
    // The dungeon's line gives the range of levels inside, naming no one.
    expect(grotto.querySelector('.small.muted')!.textContent).toContain('levels 14 to 22');
    expect(q('[data-cast="brinebeard"]').textContent).toContain('Killed 1');
    expect(q('[data-cast="giant_crab"]').textContent).toBe('??Not beaten yet');
    expect(q('[data-cast="giant_crab"]').classList).toContain('unmet');
  });

  it("names a grotto foe's drops once that foe has dropped them, and ? until then", () => {
    playing({
      bestiary: {
        deckhand: { kills: 4, seen: ['doubloon', 'pirate_cutlass'] },
        brinebeard: { kills: 1, seen: ['spyglass'] },
        giant_crab: { kills: 2, seen: [] },
        // A pearl from a sand crab, found and in the collection log...
        sand_crab: { kills: 9, seen: ['pearl'] },
      },
      collection: ['doubloon', 'pirate_cutlass', 'spyglass', 'pearl', 'tricorn'],
    });
    q<HTMLButtonElement>('[data-combat]').click();
    expect(q('[data-cast="deckhand"] .drops').textContent).toBe(
      'Drops: Doubloon, Pirate cutlass, ?',
    );
    // The captain's one-thing-or-the-other shows both, each seen or not;
    // a doubloon in the collection log is not one the captain was seen to drop.
    expect(q('[data-cast="brinebeard"] .drops').textContent).toBe('Drops: ?, ?, ?, ?, Spyglass');
    // ...names nothing of the giant crab's, nor a tricorn found elsewhere the powder monkey's.
    expect(q('[data-cast="giant_crab"] .drops').textContent).toBe('Drops: ?, ?');
  });

  it("names a grotto foe's drops from the run that saw them dropped", () => {
    // What a run reports, settled as the town's scene settles it.
    const after = settleRun(
      newGame('Cody', clock),
      { kills: { powder_monkey: 1 }, dropped: { powder_monkey: ['tricorn'] } },
      CONTENT,
    );
    playing({ bestiary: after.bestiary });
    q<HTMLButtonElement>('[data-combat]').click();
    expect(q('[data-cast="powder_monkey"] .drops').textContent).toBe('Drops: ?, Tricorn');
  });

  it('fills the food slot and moves the line to eat at', () => {
    playing({ bank: { cooked_shrimp: 30, cooked_herring: 4, hide: 2 } });
    q<HTMLButtonElement>('[data-combat]').click();
    expect(root.querySelector('[data-food-choice="hide"]')).toBeNull();
    q<HTMLButtonElement>('[data-food-choice="cooked_shrimp"]').click();
    expect(q('[data-food] .qty').textContent).toBe('Cooked shrimp ×30');
    q<HTMLButtonElement>('[data-eat="higher"]').click();
    expect(q('[data-eat-at]').textContent).toBe('Eat below 60% health');
    expect(saved()).toMatchObject({ food: { item: 'cooked_shrimp', qty: 30 }, eatAt: 60 });
    press('Take out');
    expect(saved()).toMatchObject({ food: null, bank: { cooked_shrimp: 30 } });
  });
});

describe('a fight', () => {
  it('is won against dock rats, with loot arriving in the bank', () => {
    const app = playing();
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('[data-monster="dock_rat"]').click();
    expect(q('[data-foe="dock_rat"]').textContent).toContain('Dock rat');
    expect(q('[data-foe] .qty').textContent).toBe('10 / 10');
    play(app, 120_000);
    const kills = saved().fight!.kills;
    expect(kills).toBeGreaterThan(3);
    expect(q('[data-tally]').textContent).toContain(`${kills} kills`);
    expect(q('[data-tally]').textContent).toContain(`Hide ×${kills}`);
    tab('bank');
    expect(q('[data-item="hide"]').textContent).toContain(String(kills));
    // The rat's card now names what it was seen to drop.
    tab('skills');
    tab('skills');
    q<HTMLButtonElement>('[data-combat]').click();
    press('‹ Areas');
    expect(q('[data-monster="dock_rat"] .drops').textContent).toMatch(/^Drops: Coins, Hide/);
  });

  it('is lost to a marsh troll at level 1, plainly and at no cost', () => {
    const app = playing({ bank: { cooked_shrimp: 5 }, coins: 10 });
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('[data-food-choice="cooked_shrimp"]').click();
    q<HTMLButtonElement>('[data-monster="marsh_troll"]').click();
    play(app, 120_000);
    expect(saved()).toMatchObject({ fight: null, action: null, coins: 10 });
    expect(q('[data-fight-over="died"]').textContent).toContain('Knocked out');
    expect(q('[data-fight-over]').textContent).toContain('heal as you rest');
    // The food slot says what is left of it, and it is not lost.
    expect(q('[data-food] .qty').textContent).toMatch(/^(Cooked shrimp ×\d|Empty)/);
    press('Fight the Marsh troll again');
    expect(saved().fight).toMatchObject({ monster: 'marsh_troll', kills: 0 });
  });

  it('eats when hurt, and says so when the food runs out', () => {
    const app = playing({ food: { item: 'cooked_shrimp', qty: 2 }, eatAt: 90 });
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('[data-monster="sand_crab"]').click();
    let toasts = '';
    for (let i = 0; i < 300 && saved().food; i += 1) {
      play(app, 1000);
      toasts += lastToast();
    }
    expect(saved().food).toBeNull();
    expect(toasts).toContain('Out of Cooked shrimp. Fighting on without eating.');
    expect(q('[data-food] .qty').textContent).toBe('Empty');
  });

  it('stops for anything else the character is set to do, and stops when told', () => {
    playing({ bank: { cooked_shrimp: 3 } });
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('[data-monster="dock_rat"]').click();
    press('Stop fighting');
    expect(saved().fight).toBeNull();
    expect(q('[data-fight-over="stopped"]').textContent).toContain('Stopped');
    press('Fight the Dock rat again');
    tab('skills');
    tab('skills');
    q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
    q<HTMLButtonElement>('[data-action="chop_pine"]').click();
    expect(saved()).toMatchObject({ fight: null, action: { id: 'chop_pine' } });
  });

  it('will not start with a bow and no arrows', () => {
    playing({ equipment: { main_hand: { item: 'pine_shortbow', qty: 1 } } });
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('[data-monster="dock_rat"]').click();
    expect(lastToast()).toBe('A bow needs arrows. Ready some first.');
    expect(saved().fight).toBeNull();
  });
});

describe('the away report for a fight', () => {
  it('counts kills, loot and food, and says when the character was knocked out', () => {
    const app = playing({ bank: { cooked_shrimp: 40 } });
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('[data-food-choice="cooked_shrimp"]').click();
    q<HTMLButtonElement>('[data-monster="footpad"]').click();
    app.save();
    root.replaceChildren();
    clock += 3 * 60 * 60 * 1000;
    mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
    const report = q('[role="dialog"]').textContent!;
    expect(report).toContain('fighting the Footpad');
    expect(report).toContain('Footpad kill');
    expect(report).toContain('Cooked shrimp eaten');
    expect(report).toContain('Knocked out by the Footpad');
    expect(report).toContain('Defence XP');
  });

  it('counts arrows, and says when they ran out', () => {
    const app = playing({
      equipment: {
        main_hand: { item: 'pine_shortbow', qty: 1 },
        ammo: { item: 'bronze_arrows', qty: 30 },
      },
    });
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('[data-monster="dock_rat"]').click();
    app.save();
    root.replaceChildren();
    clock += 2 * 60 * 60 * 1000;
    mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
    const report = q('[role="dialog"]').textContent!;
    expect(report).toContain('30 arrows shot');
    expect(report).toContain('your last arrow is gone');
    expect(report).toContain('Ranged XP');
  });
});

describe('the bank and the sheet', () => {
  it('puts food in the slot from its card, and says what it heals', () => {
    playing({ bank: { cooked_cod: 12 } });
    tab('bank');
    q<HTMLButtonElement>('[data-item="cooked_cod"]').click();
    expect(q('[data-card="cooked_cod"]').textContent).toContain('20 hit points');
    press('Put in the food slot');
    expect(saved()).toMatchObject({ food: { item: 'cooked_cod', qty: 12 }, bank: {} });
  });

  it('says what level a thing needs, and will not put it on until then', () => {
    playing({ bank: { iron_helmet: 1 } });
    tab('character');
    q<HTMLButtonElement>('[data-slot="head"]').click();
    expect(q('[data-equip="iron_helmet"]').textContent).toContain('Needs Defence level 10.');
    q<HTMLButtonElement>('[data-equip="iron_helmet"]').click();
    expect(lastToast()).toBe('Needs Defence level 10.');
    expect(saved().equipment.head).toBeUndefined();
  });

  it('lets a trained character wear it', () => {
    playing({ bank: { iron_helmet: 1 }, skills: { defence: xpForLevel(10) } });
    tab('bank');
    q<HTMLButtonElement>('[data-item="iron_helmet"]').click();
    expect(q('[data-card="iron_helmet"]').textContent).toContain('Defence level 10');
    press('Equip Iron helmet');
    expect(saved().equipment.head).toEqual({ item: 'iron_helmet', qty: 1 });
  });
});

describe('the Dungeons card (wave 15)', () => {
  const rows = (): string[] =>
    [...root.querySelectorAll<HTMLElement>('[data-dungeon-row]')].map(
      (el) => `${el.dataset.dungeonRow} ${el.dataset.status}`,
    );

  it("lists the chart's dungeons for a new player: the cave and the grotto open, two to come", () => {
    playing();
    q<HTMLButtonElement>('[data-combat]').click();
    expect(rows()).toEqual([
      'tidepool_cave open',
      'brinebeards_grotto open',
      'thistlewood_burrow soon',
      'unknown_2 soon',
      'unknown_3 soon',
    ]);
    const cave = q('[data-dungeon-row="tidepool_cave"]');
    expect(cave.querySelector('h3')!.textContent).toBe('Tidepool Cave');
    expect(cave.textContent).toContain('Recommended combat level 1');
    expect(q('[data-dungeon-row="brinebeards_grotto"]').textContent).toContain(
      'Recommended combat level 20',
    );
    // A landing to come keeps its name back, and says what will open it.
    const soon = q('[data-dungeon-row="thistlewood_burrow"]');
    expect(soon.querySelector('h3')!.textContent).toBe('?');
    expect(soon.textContent).toContain('Clear Brinebeard’s Grotto.');
    expect(soon.textContent).not.toContain('Uncharted');
    // Above the areas, with its way in.
    const card = q('[data-dungeons]');
    expect(card.compareDocumentPosition(q('[data-area]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(card.querySelector('button.primary')!.textContent).toBe('To the harbour');
  });

  it('shows clears and the best time once cleared, and what opens next', () => {
    let state = newGame('Cody', clock);
    state = settleRun(state, { cleared: 'tidepool_cave', timeMs: 101_400 }, CONTENT);
    state = settleRun(state, { cleared: 'tidepool_cave', timeMs: 84_900 }, CONTENT);
    state = settleRun(state, { cleared: 'brinebeards_grotto', timeMs: 512_000 }, CONTENT);
    playing(state);
    q<HTMLButtonElement>('[data-combat]').click();
    expect(rows()).toEqual([
      'tidepool_cave cleared',
      'brinebeards_grotto cleared',
      'thistlewood_burrow soon',
      'unknown_2 soon',
      'unknown_3 soon',
    ]);
    expect(q('[data-dungeon-row="tidepool_cave"]').textContent).toContain(
      'Recommended combat level 1 · cleared 2 times · best 1:24',
    );
    expect(q('[data-dungeon-row="brinebeards_grotto"]').textContent).toContain(
      'cleared once · best 8:32',
    );
  });

  it("names only the cave's own boss among its cast: its rats and crabs are the shore's", () => {
    playing({
      bestiary: { old_snapper: { kills: 1, seen: [] }, dock_rat: { kills: 3, seen: [] } },
    });
    q<HTMLButtonElement>('[data-combat]').click();
    const cave = q('[data-dungeon="tidepool_cave"]');
    expect(
      [...cave.querySelectorAll<HTMLElement>('[data-cast]')].map((el) => el.dataset.cast),
    ).toEqual(['old_snapper']);
    expect(cave.textContent).toContain('Dock rat and Sand crab are met here too');
    expect(root.querySelectorAll('[data-monster="dock_rat"]').length).toBe(1);
  });
});
