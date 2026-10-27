import { beforeEach, describe, expect, it, vi } from 'vitest';
import { modifierOn, localDay } from '../../src/core/progress';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';
import type { Shell } from '../../src/ui/view';
import { IDLE_DUNGEON_ACTIVITY, doingNow } from '../../src/ui/atWork';

// S16 in the menus: the Dungeons card's day, challenges and what a clear
// opens; sending the hero through a cleared dungeon idle, the strip and the
// Combat page showing it, the away report after a night of it. The town is a
// stand-in that keeps the Shell it was given.
let shell: Shell | undefined;
vi.mock('../../src/scene/townView', () => ({
  townView: (_state: unknown, _content: unknown, given: Shell) => {
    shell = given;
    return { el: document.createElement('div') };
  },
}));

const CAVE = 'tidepool_cave';
const GROTTO = 'brinebeards_grotto';
const HOUR = 60 * 60 * 1000;
let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();
const saved = (): GameState => saves().load()!;
const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const tab = (id: string): void => q<HTMLButtonElement>(`.tab[data-tab="${id}"]`).click();
/** Away to the bank and back to the Combat page: the page built afresh. */
const backToCombat = (): void => {
  tab('bank');
  tab('skills');
  if (!root.querySelector('[data-dungeons]')) {
    if (!root.querySelector('[data-combat]')) tab('skills');
    q<HTMLButtonElement>('[data-combat]').click();
  }
};

/** A character of some standing, with fish, on the Combat page. */
function onCombat(extra: Partial<GameState> = {}): App {
  const xp = xpForLevel(5);
  saves().save({
    ...newGame('Cody', clock),
    skills: { melee: xp, defence: xp, vitality: xp },
    equipment: { main_hand: { item: 'bronze_sword', qty: 1 } },
    food: { item: 'cooked_shrimp', qty: 40 },
    ...extra,
  });
  const app = mountApp(root, {
    saves: saves(),
    content: CONTENT,
    now: () => clock,
    utcOffset: () => 0,
  });
  q<HTMLButtonElement>('[data-combat]').click();
  return app;
}

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = Date.UTC(2026, 9, 11, 12);
  shell = undefined;
});

describe('the Dungeons card (S16)', () => {
  it('shows each dungeon’s day, its challenges with what they pay, and what the grotto will open', () => {
    onCombat();
    const cave = q(`[data-dungeon-row="${CAVE}"]`);
    const day = modifierOn(localDay(clock), CAVE, CONTENT)!;
    expect(cave.querySelector('[data-modifier]')!.getAttribute('data-modifier')).toBe(day);
    expect(cave.querySelector('.day-name')!.textContent).toBe(
      `Today: ${CONTENT.modifiers![day]!.name}`,
    );
    expect(cave.querySelectorAll('[data-challenge]')).toHaveLength(4);
    expect(cave.textContent).toContain('Challenges · 0 of 4 done');
    expect(q('[data-challenge="tidepool_cave.quick"]').textContent).toContain(
      '250 coins and 2 bounty points.',
    );
    const tier = q(`[data-dungeon-row="${GROTTO}"] [data-tier]`);
    expect(tier.getAttribute('data-unlocked')).toBe('false');
    // Tier 2 is real since S22: what it brings, with no "still being built"; and since wave 21
    // the landing its clear opens too.
    expect(tier.textContent).toBe(
      'Its first clear unlocks tier 2, from level 20: deep-water fishing, driftwood, salt-iron to mine and smith, richer pockets to pick and somewhere new to fight. ' +
        'It opens Thistlewood Burrow too.',
    );
    expect(tier.textContent).not.toContain('still being built');
    // Nothing to send the hero through yet.
    expect(root.querySelector('[data-idle-start]')).toBeNull();
  });

  it('marks challenges done, states tier 2 unlocked and what it brings, and offers the idle run once cleared', () => {
    onCombat({
      dungeons: {
        [CAVE]: { clears: 3, bestMs: 81_000, leastDamage: 4, challenges: ['tidepool_cave.quick'] },
        [GROTTO]: { clears: 1 },
      },
    });
    const done = q('[data-challenge="tidepool_cave.quick"]');
    expect(done.getAttribute('data-done')).toBe('true');
    expect(done.textContent).toContain('Done');
    expect(q(`[data-dungeon-row="${CAVE}"]`).textContent).toContain('1 of 4 done');
    expect(q(`[data-dungeon-row="${CAVE}"] [data-facts]`).textContent).toBe(
      'Recommended combat level 1 · cleared 3 times · best 1:21 · least damage 4',
    );
    const tier = q(`[data-dungeon-row="${GROTTO}"] [data-tier]`);
    expect(tier.getAttribute('data-unlocked')).toBe('true');
    expect(tier.textContent).toBe(
      'Tier 2 unlocked, from level 20: deep-water fishing, driftwood, salt-iron to mine and smith, richer pockets to pick and somewhere new to fight. ' +
        'Thistlewood Burrow is open.',
    );
    expect(root.querySelectorAll('[data-idle-start]')).toHaveLength(2);
  });

  it('folds each dungeon to one line to tap, and remembers which the player left open (wave 18)', () => {
    onCombat();
    const row = q(`[data-dungeon-row="${CAVE}"]`);
    const toggle = q<HTMLButtonElement>(`[data-dungeon-toggle="${CAVE}"]`);
    const body = q(`[data-dungeon-body="${CAVE}"]`);
    // Folded to begin with: the name and a line of where things stand.
    expect(body.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const day = CONTENT.modifiers![modifierOn(localDay(clock), CAVE, CONTENT)!]!.name;
    expect(row.querySelector('[data-summary]')!.textContent).toBe(
      `Open · 0 of 4 challenges · Today: ${day}`,
    );
    // No seal before a clear: a space that keeps the names lined up.
    expect(row.querySelector('[data-seal]')).toBeNull();
    toggle.click();
    expect(body.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    // Kept open across a rebuild of the page.
    backToCombat();
    expect(q(`[data-dungeon-body="${CAVE}"]`).hidden).toBe(false);
    expect(q(`[data-dungeon-body="${GROTTO}"]`).hidden).toBe(true);
  });

  it('seals a cleared dungeon, in gold once every challenge is done', () => {
    const all = CONTENT.dungeons![CAVE]!.challenges!.map((c) => c.id);
    onCombat({ dungeons: { [CAVE]: { clears: 4, challenges: all }, [GROTTO]: { clears: 1 } } });
    expect(q(`[data-dungeon-row="${CAVE}"] [data-seal]`).getAttribute('data-seal')).toBe(
      'all-challenges',
    );
    expect(q(`[data-dungeon-row="${GROTTO}"] [data-seal]`).getAttribute('data-seal')).toBe(
      'cleared',
    );
  });

  it('sparkles a medal won since the card last showed it, once', () => {
    onCombat({ dungeons: { [CAVE]: { clears: 1, challenges: ['tidepool_cave.quick'] } } });
    // Done before the app opened: nothing new.
    expect(
      q('[data-challenge="tidepool_cave.quick"] [data-medal]').getAttribute('data-medal'),
    ).toBe('done');
    // A run by hand meets another.
    tab('town');
    shell!.settleRun({
      cleared: CAVE,
      dungeon: CAVE,
      timeMs: 150_000,
      stats: {
        timeMs: 150_000,
        damageTaken: 20,
        foodEaten: 0,
        braces: 0,
        stepOuts: 0,
        knockedOut: false,
        kills: 7,
      },
    });
    backToCombat();
    const medal = (): string | null =>
      q('[data-challenge="tidepool_cave.no_food"] [data-medal]').getAttribute('data-medal');
    expect(medal()).toBe('new');
    expect(
      q(`[data-dungeon-row="${CAVE}"] .summary-medal [data-medal]`).getAttribute('data-medal'),
    ).toBe('new');
    // Shown once: the page built again has it done.
    backToCombat();
    expect(medal()).toBe('done');
  });

  it('says a hero sent alone takes a hard day plain', () => {
    onCombat({ dungeons: { [CAVE]: { clears: 1 }, [GROTTO]: { clears: 1 } } });
    expect(q(`[data-dungeon-body="${GROTTO}"]`).textContent).toContain(
      'A hard day he takes plain: its catch and its bonus both left out.',
    );
    // The cave's days are all kind: nothing to say.
    expect(q(`[data-dungeon-body="${CAVE}"]`).textContent).not.toContain('hard day');
  });

  it('turns the day over at local midnight in place, without a rebuild', () => {
    const app = onCombat();
    const card = q('[data-dungeons]');
    const before = q(`[data-dungeon-row="${GROTTO}"] [data-modifier]`).getAttribute(
      'data-modifier',
    );
    clock = Date.UTC(2026, 9, 12, 0, 0, 1);
    app.tick();
    expect(q('[data-dungeons]')).toBe(card);
    const after = q(`[data-dungeon-row="${GROTTO}"] [data-modifier]`).getAttribute('data-modifier');
    expect(after).toBe(modifierOn(localDay(clock), GROTTO, CONTENT));
    expect(after).not.toBe(before);
  });
});

describe('a dungeon run idle in the menus (S16)', () => {
  it('is sent from the card, shown on the Combat page and in the strip, and called home', () => {
    const app = onCombat({ dungeons: { [CAVE]: { clears: 1 } } });
    q(`[data-idle-start="${CAVE}"]`).click();
    expect(saved().idleRun).toMatchObject({ dungeon: CAVE, clock });
    expect(root.querySelector('.toast')!.textContent).toContain('sets off for Tidepool Cave');
    const panel = q(`[data-idle-run="${CAVE}"]`);
    expect(panel.textContent).toContain('Rowing out to room 1 of 4');
    expect(q('[data-now-doing]').textContent).toContain('Running Tidepool Cave idle');
    // Time passes: the panel and the strip move in place.
    for (let i = 0; i < 60; i += 1) {
      clock += 5000;
      app.tick();
    }
    expect(q(`[data-idle-run="${CAVE}"]`)).toBe(panel);
    expect(q('[data-idle-tally]').textContent).toMatch(/run.* felled/);
    expect(q('.now-strip').dataset.target).toBe('dungeons');
    expect(saved().idleRun ?? root.querySelector('[data-idle-run]')).toBeTruthy();
    q(`[data-idle-stop="${CAVE}"]`).click();
    expect(root.querySelector('[data-idle-run]')).toBeNull();
    expect(q('[data-now-doing]').textContent).toContain('Resting');
  });

  it('can be sent by the scene through the shell, and the strip takes the thumb to the card', () => {
    onCombat({ dungeons: { [CAVE]: { clears: 1 } } });
    tab('town');
    expect(shell!.sendIdle!(GROTTO)).toBe(false);
    expect(root.querySelector('.toast')!.textContent).toBe(
      'Clear Brinebeard’s Grotto by hand first.',
    );
    expect(shell!.sendIdle!(CAVE)).toBe(true);
    q('[data-now-doing]').click();
    expect(q(`[data-idle-run="${CAVE}"]`)).toBeTruthy();
  });

  it('keeps its calendar to the clock after a dungeon played by hand', () => {
    const app = onCombat({ dungeons: { [CAVE]: { clears: 1 } } });
    q(`[data-idle-start="${CAVE}"]`).click();
    tab('town');
    shell!.pauseIdle(true);
    clock += 40 * 60_000;
    app.tick();
    shell!.pauseIdle(false);
    app.save();
    expect(saved().idleRun!.clock).toBe(clock);
  });

  it('reports a night of runs on return: runs, foes, food, loot, and a knock-out', () => {
    saves().save({
      ...newGame('Cody', clock),
      dungeons: { [GROTTO]: { clears: 1 } },
      food: { item: 'cooked_shrimp', qty: 30 },
      idleRun: {
        dungeon: GROTTO,
        clock,
        utcOffset: 0,
        modifier: null,
        room: 0,
        walkMs: 1000,
        hp: 20,
        playerMs: 2400,
        foes: [],
        runs: 0,
        kills: 0,
        coins: 0,
        loot: {},
        eaten: 0,
        arrows: 0,
      },
    });
    clock += 8 * HOUR;
    mountApp(root, { saves: saves(), content: CONTENT, now: () => clock, utcOffset: () => 0 });
    const report = q('[role="dialog"]');
    expect(report.textContent).toContain('running Brinebeard’s Grotto idle');
    expect(report.textContent).toMatch(/runs? through Brinebeard’s Grotto, \d+ foes? felled/);
    expect(report.textContent).toContain('Knocked out in Brinebeard’s Grotto.');
    expect(saved().idleRun).toBeNull();
  });
});

describe('the hero at work on a dungeon run idle (S16)', () => {
  it('rows out on lane B’s dungeon loop, strikes while fighting, and breathes between rooms', () => {
    const run = {
      dungeon: CAVE,
      clock,
      utcOffset: 0,
      modifier: null,
      room: 0,
      walkMs: 5000,
      hp: 20,
      playerMs: 1200,
      foes: [],
      runs: 0,
      kills: 0,
      coins: 0,
      loot: {},
      eaten: 0,
      arrows: 0,
    };
    const state = { ...newGame('Cody', clock), idleRun: run };
    expect(doingNow(state, CONTENT).activity).toBe(IDLE_DUNGEON_ACTIVITY);
    const walking = { ...state, idleRun: { ...run, room: 2 } };
    expect(doingNow(walking, CONTENT).activity).toBeNull();
    const fighting = {
      ...state,
      idleRun: { ...run, room: 1, walkMs: 0, foes: [{ id: 'dock_rat', hp: 6, ms: 900 }] },
    };
    expect(doingNow(fighting, CONTENT)).toEqual({
      activity: CONTENT.skills.melee!.activity,
      fraction: 0.5,
      durationMs: 2400,
    });
  });
});
