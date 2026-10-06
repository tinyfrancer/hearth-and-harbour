import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hitPoints } from '../../src/core/combat';
import { newGame, type GameState } from '../../src/core/state';
import { alive } from '../../src/scene/battle';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { cameraFor } from '../../src/scene/camera';
import { DUNGEON_INSETS } from '../../src/scene/dungeonView';
import { GROTTO } from '../../src/scene/grotto';
import { FOCUS_RISE } from '../../src/scene/stage';
import { centreOf, type Point } from '../../src/scene/tileMap';
import { TOWN2_H, TOWN2_TILE, TOWN2_W } from '../../src/art/town2/town';
import { town2Scene } from '../../src/scene/town2';
import { FOCUS_RISE2 } from '../../src/scene/town2Place';
import { BOAT_LANDING, heroAt, resetTown, runNow, townView } from '../../src/scene/townView';
import { mountApp } from '../../src/ui/app';
import type { Shell, View } from '../../src/ui/view';

// A run from the boat to the end and back, driven the way a thumb would in
// jsdom: the scene is told its size by hand (portrait or on its side) and
// tapped where things are, and the shell is a spy that records what it is asked.

let observers: ResizeObserverCallback[];
let clock: number;
/** The Town screen's size, as the scene is told it. */
let screen: { width: number; height: number };

beforeEach(() => {
  observers = [];
  clock = 1000;
  resetTown();
  character = newGame('Cody', 0);
  localStorage.clear();
  // A run's dice are seeded from the moment it starts: the same moment every test.
  vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        observers.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('devicePixelRatio', 3);
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  document.body.replaceChildren();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function shellSpy(): Shell & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    openTab: (tab) => calls.push(`tab:${tab}`),
    openSkill: (id) => calls.push(`skill:${id}`),
    pauseIdle: (on) => calls.push(`pause:${on}`),
    fullScreen: (on) => calls.push(`full:${on}`),
    settleRun: (spoils) => calls.push(`settle:${JSON.stringify(spoils)}`),
  };
}

/** Tells every scene on the page its size, as a phone held one way or the other does. */
function resize(width: number, height: number): void {
  screen = { width, height };
  const entry = { contentRect: { width, height } } as ResizeObserverEntry;
  for (const callback of [...observers]) callback([entry], {} as ResizeObserver);
}

/** The character the town is shown for: a new one unless a test says otherwise. */
let character: GameState;

const lvl = (n: number): number => Math.round(40 * (n - 1) ** 2.5);

/** Strong enough for a room or two standing still, every heavy blow taken. */
function veteran(level = 60): GameState {
  return {
    ...newGame('Cody', 0),
    skills: { melee: lvl(level), defence: lvl(level), vitality: lvl(level) },
    equipment: {
      main_hand: { item: 'iron_sword', qty: 1 },
      body: { item: 'iron_breastplate', qty: 1 },
    },
    food: { item: 'cooked_cod', qty: 4 },
  };
}

/** Strong enough to clear the whole grotto standing still, every volley taken. */
const champion = (): GameState => veteran(99);

function shown(shell?: Shell): View {
  const view = townView(character, CONTENT, shell);
  document.body.append(view.el);
  resize(390, 727);
  view.update?.(character);
  return view;
}

function wait(view: View, ms: number): void {
  for (let t = 0; t < ms; t += 50) {
    clock += 50;
    view.update?.(character);
  }
}

/** Taps a point in the town or in the room the run is in, worked out as the stage does. */
function tap(root: ParentNode, at: Point): void {
  const k = 4 / 3;
  const run = runNow();
  let camera: Point;
  if (run) {
    const rows = GROTTO.rooms[run.room]!;
    const world = { width: rows[0]!.length * 16, height: rows.length * 16 };
    const view = { width: (screen.width * 3) / 4, height: (screen.height * 3) / 4 };
    const room = {
      top: Math.round(DUNGEON_INSETS.top / k),
      right: Math.round(DUNGEON_INSETS.right / k),
      bottom: Math.round(DUNGEON_INSETS.bottom / k),
      left: Math.round(DUNGEON_INSETS.left / k),
    };
    const hero = run.play.walker.at;
    const c = cameraFor(
      { x: hero.x, y: hero.y - FOCUS_RISE },
      {
        width: view.width - room.left - room.right,
        height: view.height - room.top - room.bottom,
      },
      world,
    );
    camera = { x: c.x - room.left, y: c.y - room.top };
  } else {
    // The town is 3 device pixels an art pixel at 3x: one CSS pixel each.
    const hero = heroAt();
    camera = cameraFor(
      { x: hero.x, y: hero.y - FOCUS_RISE2 },
      { width: screen.width, height: screen.height },
      { width: TOWN2_W, height: TOWN2_H },
    );
  }
  const canvas = root.querySelector('canvas')!;
  const css = run ? k : 1;
  const where = {
    bubbles: true,
    clientX: (at.x - camera.x) * css,
    clientY: (at.y - camera.y) * css,
  };
  canvas.dispatchEvent(new MouseEvent('pointerdown', where));
  canvas.dispatchEvent(new MouseEvent('pointerup', where));
}

const click = (root: ParentNode, text: string): void =>
  [...root.querySelectorAll<HTMLButtonElement>('button')]
    .find((b) => b.textContent === text)!
    .click();

/** The rowing boat, in the middle of its tap box: in view from the start of town. */
const boat = (): Point => {
  const box = town2Scene().things.find((t) => t.id === 'rowboat')!.tap!;
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
};

/** From the start of town to the boat's panel, and out in it. */
function rowOut(view: View): void {
  tap(view.el, boat());
  wait(view, 6000);
  expect(view.el.querySelector('.scene-panel h2')!.textContent).toBe('Rowing boat');
  click(view.el, 'Row out to Brinebeard’s Grotto');
}

const prompt = (view: View) => view.el.querySelector<HTMLElement>('.dungeon-prompt')!;

describe('the way into the grotto', () => {
  it('rows out from the boat: the bars go, the idle task waits, and the phone must turn', () => {
    const shell = shellSpy();
    const view = shown(shell);
    rowOut(view);
    expect(shell.calls).toEqual(['full:true', 'pause:true']);
    expect(view.el.querySelector('.dungeon')).not.toBeNull();
    resize(390, 844);
    wait(view, 1000);
    expect(prompt(view).hidden).toBe(false);
    expect(prompt(view).textContent).toMatch(/Turn your phone/);
    // Behind the prompt the run has not begun.
    expect(runNow()!.ms).toBe(0);
    resize(844, 390);
    wait(view, 1000);
    expect(prompt(view).hidden).toBe(true);
    expect(runNow()!.ms).toBe(1000);
  });

  it('pauses the run behind the same prompt when the phone is turned back', () => {
    const shell = shellSpy();
    const view = shown(shell);
    rowOut(view);
    resize(844, 390);
    tap(view.el, centreOf({ col: 20, row: 4 }));
    wait(view, 500);
    const there = { ...runNow()!.play.walker.at };
    const ms = runNow()!.ms;
    resize(390, 844);
    wait(view, 3000);
    expect(prompt(view).hidden).toBe(false);
    expect(runNow()!.ms).toBe(ms);
    expect(runNow()!.play.walker.at).toEqual(there);
    // Nothing more was asked of the shell: the idle task still waits.
    expect(shell.calls).toEqual(['full:true', 'pause:true']);
  });

  it('comes back from the background where it was: a long gap is a moment, not a fight lost', () => {
    character = veteran();
    const shell = shellSpy();
    const view = shown(shell);
    rowOut(view);
    resize(844, 390);
    wait(view, 500);
    const before = { ms: runNow()!.ms, clock: runNow()!.battle!.clock, hp: runNow()!.battle!.hp };
    // The phone locked for ten minutes: no frames, then one.
    clock += 10 * 60_000;
    view.update?.(character);
    const after = runNow()!;
    expect(after.ms - before.ms).toBeLessThanOrEqual(250);
    expect(after.battle!.clock - before.clock).toBeLessThanOrEqual(250);
    expect(after.battle!.hp).toBe(before.hp);
    expect(after.finished).toBe(false);
    // Nothing more was asked of the shell: the idle task still waits for the run.
    expect(shell.calls).toEqual(['full:true', 'pause:true']);
  });

  it('asks once more before Leave acts, then gives the clock and the bars back', () => {
    const shell = shellSpy();
    const view = shown(shell);
    rowOut(view);
    resize(844, 390);
    wait(view, 200);
    view.el.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    expect(view.el.querySelector('.dungeon-confirm')!.textContent).toMatch(/Row back to town\?/);
    expect(shell.calls).toEqual(['full:true', 'pause:true']);
    click(view.el, 'Stay');
    expect(view.el.querySelector('.dungeon-confirm')!.childElementCount).toBe(0);
    expect(view.el.querySelector<HTMLElement>('.dungeon-leave')!.hidden).toBe(false);
    view.el.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    click(view.el, 'Row back');
    // Nothing was picked up, and that is what comes home, before the clock starts again.
    expect(shell.calls).toEqual([
      'full:true',
      'pause:true',
      'settle:{"xp":{},"loot":{},"coins":0,"foodEaten":0,"arrowsUsed":0,"hp":20,"kills":{}}',
      'full:false',
      'pause:false',
    ]);
    expect(view.el.querySelector('.dungeon')).toBeNull();
    expect(view.el.querySelector('.scene-canvas')).not.toBeNull();
    expect(runNow()).toBeNull();
    // Back on the quay by the boat.
    const hero = heroAt();
    const landing = centreOf(BOAT_LANDING, TOWN2_TILE);
    expect([hero.x, hero.y]).toEqual([landing.x, landing.y]);
  });

  /** Goes after whatever is standing in the room, one tap at a time, until it is clear or the run is over. */
  function fightRoom(view: View, limit = 300_000): void {
    for (let t = 0; t < limit; t += 1000) {
      const run = runNow()!;
      if (run.finished || run.battle!.over) return;
      const left = run.battle!.foes.filter((f) => f.room === run.room && alive(f));
      if (left.length === 0) return;
      if (!left.some((f) => f.key === run.battle!.target)) tap(view.el, left[0]!.at);
      wait(view, 1000);
    }
  }

  /** Walks through the door at `cell` to the next room. */
  function through(view: View, col: number, row: number): void {
    const from = runNow()!.room;
    resize(844, 390);
    tap(view.el, centreOf({ col, row }));
    for (let t = 0; t < 40_000 && (runNow()!.room === from || runNow()!.doorway); t += 500)
      wait(view, 500);
    // A browser tells a new room's canvas its size as it goes on the page; jsdom is told here.
    resize(844, 390);
  }

  it('fights through all five rooms, their doors opening as each is cleared, and settles a clear once', () => {
    character = champion();
    const shell = shellSpy();
    const view = shown(shell);
    rowOut(view);
    resize(844, 390);
    wait(view, 100);
    expect(view.el.querySelector('.fight-hud')).not.toBeNull();
    expect(view.el.querySelectorAll('.fight-button')).toHaveLength(3);
    const rooms: string[] = [runNow()!.room];
    const exits: Record<string, [number, number]> = {
      pools: [37, 6],
      store: [35, 5],
      bridge: [41, 6],
      brig: [33, 6],
    };
    for (const room of ['pools', 'store', 'bridge', 'brig']) {
      fightRoom(view);
      expect(runNow()!.battle!.opened[room], room).toBeGreaterThan(0);
      through(view, ...exits[room]!);
      rooms.push(runNow()!.room);
    }
    fightRoom(view);
    wait(view, 2000);
    expect(rooms).toEqual(['pools', 'store', 'bridge', 'brig', 'cove']);
    const run = runNow()!;
    expect(run.ending).toBe('cleared');
    expect(run.battle!.tally.kills).toBeGreaterThanOrEqual(14);
    const results = view.el.querySelector('.dungeon-results')!;
    expect(results.textContent).toMatch(/The grotto is cleared/);
    expect(results.textContent).toMatch(/Time taken: \d+:\d\d/);
    expect(results.textContent).toMatch(/Melee\+\d+ XP/);
    // Settled once, then the idle task carries on while the results are read, still full screen.
    const settles = shell.calls.filter((c) => c.startsWith('settle:'));
    expect(settles).toHaveLength(1);
    const spoils = JSON.parse(settles[0]!.slice('settle:'.length));
    expect(spoils.cleared).toBe('brinebeards_grotto');
    expect(spoils.kills.brinebeard).toBe(1);
    expect(spoils.kills.giant_crab).toBe(2);
    expect(spoils.xp.melee).toBeGreaterThan(0);
    expect(shell.calls.slice(-3, -2)[0]).toMatch(/^settle:/);
    expect(shell.calls.slice(-2)).toEqual(['full:true', 'pause:false']);
    expect(view.el.querySelector<HTMLElement>('.dungeon-leave')!.hidden).toBe(true);
    click(view.el, 'Back to town');
    expect(shell.calls.slice(-2)).toEqual(['full:false', 'pause:false']);
    expect(shell.calls.filter((c) => c.startsWith('settle:'))).toHaveLength(1);
    expect(view.el.querySelector('.dungeon')).toBeNull();
  }, 60_000);

  it('washes a hero who falls back to town with what he picked up, settled once', () => {
    // A new character, no weapon, no food: the rats are a fair fight and the crabs are not.
    const shell = shellSpy();
    const view = shown(shell);
    rowOut(view);
    resize(844, 390);
    wait(view, 100);
    expect(view.el.querySelectorAll('.fight-button')).toHaveLength(2);
    fightRoom(view);
    if (!runNow()!.battle!.over) {
      through(view, 37, 6);
      fightRoom(view);
    }
    wait(view, 2000);
    const run = runNow()!;
    expect(run.ending).toBe('fell');
    const results = view.el.querySelector('.dungeon-results')!;
    expect(results.textContent).toMatch(/Washed back to town/);
    const settles = shell.calls.filter((c) => c.startsWith('settle:'));
    expect(settles).toHaveLength(1);
    expect(JSON.parse(settles[0]!.slice('settle:'.length)).loot).toEqual(run.battle!.tally.loot);
    click(view.el, 'Back to town');
    expect(shell.calls.filter((c) => c.startsWith('settle:'))).toHaveLength(1);
  });

  it('shows health, the target, and buttons that cool down when pressed', () => {
    character = veteran();
    const view = shown(shellSpy());
    rowOut(view);
    resize(844, 390);
    wait(view, 100);
    const hp = view.el.querySelector('.fight-hero .fight-numbers')!;
    expect(hp.textContent).toBe('256/256');
    const target = view.el.querySelector<HTMLElement>('.fight-target')!;
    expect(target.hidden).toBe(true);
    const [swing, brace, food] = [...view.el.querySelectorAll<HTMLButtonElement>('.fight-button')];
    expect(swing!.getAttribute('aria-label')).toBe('Wide swing');
    // Nobody near: ready in itself, but nothing to swing at, so it waits and costs nothing.
    expect(swing!.dataset.state).toBe('idle');
    swing!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(runNow()!.battle!.ready.first).toBe(0);
    // Full health: the food waits too, and shows how many are left.
    expect(food!.dataset.state).toBe('idle');
    expect(food!.textContent).toMatch(/4/);
    const rat = runNow()!.battle!.foes[0]!;
    tap(view.el, rat.at);
    wait(view, 100);
    expect(target.hidden).toBe(false);
    expect(target.textContent).toMatch(/Giant crab/);
    // Walked up beside it.
    for (
      let i = 0;
      i < 150 && swing!.dataset.state !== 'ready' && alive(runNow()!.battle!.foes[0]!);
      i++
    )
      wait(view, 100);
    expect(swing!.dataset.state).toBe('ready');
    swing!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    wait(view, 50);
    expect(swing!.dataset.state).toBe('cooling');
    expect(swing!.querySelector('.fight-count')!.textContent).toBe('8');
    brace!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    wait(view, 50);
    expect(brace!.dataset.state).toBe('cooling');
    expect(runNow()!.battle!.braceUntil).toBeGreaterThan(runNow()!.battle!.clock);
  });

  it('carries on with a run when the shell rebuilds the tab, and never shows the town paused', () => {
    const shell = shellSpy();
    const first = shown(shell);
    rowOut(first);
    first.el.remove();
    shell.calls.length = 0;
    const again = shown(shell);
    expect(again.el.querySelector('.dungeon')).not.toBeNull();
    // The rebuilt tab makes sure of what the run needs, in case the shell let go of it.
    expect(shell.calls).toEqual(['full:true', 'pause:true']);
    again.el.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    click(again.el, 'Row back');
    again.el.remove();
    shell.calls.length = 0;
    const town = shown(shell);
    expect(town.el.querySelector('.dungeon')).toBeNull();
    // Nothing was held, so nothing needs giving back.
    expect(shell.calls).toEqual([]);
  });
});

describe('the idle task during a run', () => {
  it('makes no progress while the run is on, and carries on afterwards', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const saves = new LocalStorageSaveService();
    const app = mountApp(root, { saves, content: CONTENT, now: () => clock });
    root.querySelector<HTMLInputElement>('input[name="character-name"]')!.value = 'Cody';
    root.querySelector<HTMLFormElement>('form')!.requestSubmit();
    root.querySelector<HTMLElement>('[data-skill="woodcutting"]')!.click();
    root.querySelector<HTMLElement>('[data-action="chop_pine"]')!.click();
    root.querySelector<HTMLElement>('.tab[data-tab="town"]')!.click();
    resize(390, 727);
    const frames = (ms: number) => {
      for (let t = 0; t < ms; t += 50) {
        clock += 50;
        app.tick();
      }
    };
    frames(100);
    tap(root, boat());
    frames(6000);
    click(root, 'Row out to Brinebeard’s Grotto');
    expect(root.classList.contains('fullscreen')).toBe(true);
    app.save();
    const before = saves.load()!;
    resize(844, 390);
    // A long run, frame by frame, and a stretch long enough to look like time away.
    frames(20_000);
    clock += 30 * 60_000;
    frames(1000);
    app.save();
    expect(saves.load()!.bank).toEqual(before.bank);
    expect(saves.load()!.skills).toEqual(before.skills);
    root.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    click(root, 'Row back');
    expect(root.classList.contains('fullscreen')).toBe(false);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    frames(6100);
    app.save();
    const logs = (state: typeof before) => state.bank.pine_logs ?? 0;
    expect(logs(saves.load()!)).toBe(logs(before) + 2);
  });
});

describe('a run’s spoils in the real app', () => {
  it('pays what was picked up into the save, and the bank and skills show it after rowing back', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const saves = new LocalStorageSaveService();
    const start = { ...veteran(), createdAt: clock, savedAt: clock };
    saves.save(start);
    const app = mountApp(root, { saves, content: CONTENT, now: () => clock });
    root.querySelector<HTMLElement>('.tab[data-tab="town"]')!.click();
    resize(390, 727);
    const frames = (ms: number) => {
      for (let t = 0; t < ms; t += 50) {
        clock += 50;
        app.tick();
      }
    };
    frames(100);
    tap(root, boat());
    frames(6000);
    click(root, 'Row out to Brinebeard’s Grotto');
    resize(844, 390);
    frames(100);
    // Both crabs, then whatever they left on the floor.
    const standing = () => runNow()!.battle!.foes.filter((f) => f.room === 'pools' && alive(f));
    for (let i = 0; i < 120 && standing().length > 0; i++) {
      const crab = standing()[0]!;
      if (runNow()!.battle!.target !== crab.key) tap(root, crab.at);
      frames(1000);
    }
    expect(standing()).toEqual([]);
    for (const pile of runNow()!.battle!.piles) {
      tap(root, pile.at);
      frames(6000);
    }
    const tally = runNow()!.battle!.tally;
    const hpLeft = runNow()!.battle!.hp;
    root.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    click(root, 'Row back');
    const saved = saves.load()!;
    // Whatever was picked up is in the bank: only things the game's tables know.
    for (const [item, qty] of Object.entries(tally.loot)) {
      expect(CONTENT.items[item], item).toBeDefined();
      expect(saved.bank[item]).toBe((start.bank[item] ?? 0) + qty);
    }
    expect(saved.coins).toBe(start.coins + tally.coins);
    expect(saved.skills.melee).toBe(start.skills.melee! + tally.xp.melee!);
    expect(saved.skills.vitality).toBe(start.skills.vitality! + tally.xp.vitality!);
    expect(saved.food).toEqual({ item: 'cooked_cod', qty: 4 - tally.eaten });
    // Hurt in the grotto is hurt in town.
    expect(hitPoints(saved)).toBe(hpLeft);
    root.querySelector<HTMLElement>('.tab[data-tab="bank"]')!.click();
    root.querySelector<HTMLElement>('.tab[data-tab="skills"]')!.click();
    expect(root.textContent).toMatch(/Melee/);
  });
});
