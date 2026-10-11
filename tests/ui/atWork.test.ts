import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACTIVITY2_IDS,
  STRIKE2_HIT_FRAME,
  activityFrameMs2,
  activityFrames2,
} from '../../src/art/character2';
import { actionDuration } from '../../src/core/actions';
import { freshFight } from '../../src/core/combat';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';
import { doingNow, workFrame } from '../../src/ui/atWork';

// Cody: "idle animation: maybe something in the afk menu showing our character
// mining/fletching/fighting/etc, for a more interactive way of seeing the
// currently afk activity."
let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();
const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const tab = (id: string): void => q<HTMLButtonElement>(`.tab[data-tab="${id}"]`).click();

function playing(extra: Partial<GameState> = {}): App {
  saves().save({
    ...newGame('Cody', clock),
    equipment: { main_hand: { item: 'bronze_sword', qty: 1 } },
    ...extra,
  });
  return mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
}

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

describe('what the hero is drawn doing', () => {
  it('is named by the tables for every skill, and the art has a loop for each', () => {
    for (const skill of Object.values(CONTENT.skills)) {
      expect(skill.activity, skill.id).toBeDefined();
      expect(ACTIVITY2_IDS, skill.id).toContain(skill.activity);
    }
  });

  it('reads the running action, the fight in its style, or nothing', () => {
    const state = newGame('Cody', 0);
    expect(doingNow(state, CONTENT).activity).toBeNull();
    const chopping = { ...state, action: { id: 'chop_oak', progressMs: 1000 } };
    expect(doingNow(chopping, CONTENT)).toEqual({
      activity: 'woodcutting',
      fraction: 1000 / actionDuration(chopping, CONTENT.actions.chop_oak!, CONTENT),
      durationMs: actionDuration(chopping, CONTENT.actions.chop_oak!, CONTENT),
    });
    const fighting = { ...state, fight: freshFight(CONTENT.monsters!.dock_rat!, 10) };
    expect(doingNow(fighting, CONTENT).activity).toBe('melee');
    const archer = {
      ...fighting,
      equipment: {
        main_hand: { item: 'pine_shortbow', qty: 1 },
        ammo: { item: 'bronze_arrows', qty: 10 },
      },
    };
    expect(doingNow(archer, CONTENT).activity).toBe('ranged');
    // Between foes, and caught stealing, he stands and breathes.
    expect(
      doingNow({ ...fighting, fight: { ...fighting.fight, foeHp: 0 } }, CONTENT).activity,
    ).toBeNull();
    expect(
      doingNow({ ...state, action: { id: 'steal_fisherman', progressMs: 0, stunMs: 500 } }, CONTENT)
        .activity,
    ).toBeNull();
  });

  it('lands the work as each completion lands, a whole number of turns of the loop to each', () => {
    const n = activityFrames2('woodcutting');
    const turn = n * activityFrameMs2('woodcutting');
    const doing = (fraction: number) => ({ activity: 'woodcutting', fraction, durationMs: 4000 });
    const turns = Math.max(1, Math.round(4000 / turn));
    const landing = workFrame(doing(0), 0);
    // Just completed: the landing frame. Just before: the frame before it.
    expect(workFrame(doing(0.999), 0)).toBe((landing + n - 1) % n);
    // Each turn of the loop starts on the landing frame again.
    for (let k = 0; k < turns; k += 1) expect(workFrame(doing(k / turns), 123_456)).toBe(landing);
    // The clock does not move it: the action does.
    expect(workFrame(doing(0.5), 0)).toBe(workFrame(doing(0.5), 99_999));
    // The fight's blow lands on the art's hit frame when the wait for the next blow ends.
    expect(workFrame({ activity: 'melee', fraction: 0, durationMs: 2400 }, 0)).toBe(
      STRIKE2_HIT_FRAME,
    );
  });

  it('runs by the clock when the action is too quick to tie to, and stands still with less motion', () => {
    const frameMs = activityFrameMs2('mining');
    const quick = { activity: 'mining', fraction: 0.5, durationMs: 50 };
    expect(workFrame(quick, 0)).toBe(0);
    expect(workFrame(quick, frameMs)).toBe(1);
    const still = workFrame({ activity: 'mining', fraction: 0.1, durationMs: 5000 }, 0, true);
    expect(workFrame({ activity: 'mining', fraction: 0.7, durationMs: 5000 }, 777, true)).toBe(
      still,
    );
    expect(workFrame({ activity: null, fraction: null, durationMs: null }, 5000, true)).toBe(0);
  });
});

describe('the hero at work in the menus', () => {
  it('shows a "now doing" strip on every tab, drawn only when its frame changes', () => {
    const app = playing({ action: { id: 'chop_pine', progressMs: 0 } });
    for (const id of ['skills', 'bank', 'character', 'menu', 'skills']) {
      tab(id);
      expect(q('[data-now-doing]').textContent).toContain('Chopping Pine');
    }
    const stage = q<HTMLCanvasElement>('[data-now-doing] .work-stage');
    expect(stage.dataset.activity).toBe('woodcutting');
    const draws = Number(stage.dataset.draws);
    // Sixteen-millisecond frames: far fewer draws than frames.
    for (let i = 0; i < 60; i += 1) {
      clock += 16;
      app.tick();
    }
    const drawn = Number(stage.dataset.draws) - draws;
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThan(15);
    // The same strip, never rebuilt by the game.
    expect(q('[data-now-doing] .work-stage')).toBe(stage);
  });

  it('takes the thumb to the running action, or to the skills when resting', () => {
    playing({ action: { id: 'mine_copper', progressMs: 0 } });
    tab('bank');
    q<HTMLButtonElement>('[data-now-doing]').click();
    expect(q('[data-action="mine_copper"]').getAttribute('aria-pressed')).toBe('true');
    // The running card has him at work too.
    expect(q<HTMLElement>('[data-at-work] .work-stage').dataset.activity).toBe('mining');
    q<HTMLButtonElement>('[data-action="mine_copper"]').click();
    expect(q('[data-now-doing]').textContent).toContain('Resting');
    expect(q<HTMLElement>('[data-now-doing] .work-stage').dataset.activity).toBe('resting');
    tab('bank');
    q<HTMLButtonElement>('[data-now-doing]').click();
    expect(q('[data-skill="woodcutting"]')).toBeTruthy();
  });

  it('strikes opposite the foe in a fight, and the strip says so', () => {
    playing({ fight: freshFight(CONTENT.monsters!.dock_rat!, 20) });
    expect(q('[data-now-doing]').textContent).toContain('Fighting the Dock rat');
    q<HTMLButtonElement>('[data-now-doing]').click();
    expect(q<HTMLElement>('[data-duel] .work-stage').dataset.activity).toBe('melee');
  });
});
