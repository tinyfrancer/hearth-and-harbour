import { actionDuration } from '../core/actions';
import { monsterDef, playerCombat } from '../core/combat';
import type { Content } from '../core/content';
import { bankCount, type GameState } from '../core/state';
import { workStage } from './atWork';
import { bar } from './bar';
import { h, setText } from './dom';
import { formatNumber } from './format';

/**
 * CSS pixels to an art pixel for the hero in the strip: two device pixels to
 * one at 3x (and 2.625x), one at 2x, so he fits a strip a thumb's height
 * tall (he fills his canvas's height, so only the air behind him is trimmed).
 */
export const STRIP_SCALE = 0.67;
const STRIP_TRIM = { left: 8 };

/** Where the strip takes the thumb: the running action's skill, the fight, or the skills to choose from. */
export type NowTarget = { kind: 'skill'; skill: string } | { kind: 'fight' } | { kind: 'choose' };

export interface NowDoing {
  readonly el: HTMLElement;
  /** Moves the hero, the words and the bar to `state` at `ms`; only what changed is touched. */
  update(state: GameState, ms: number): void;
}

/** What the strip says, and where a tap goes. */
function said(
  state: GameState,
  content: Content,
): { line: string; detail: string; fraction: number | null; target: NowTarget } {
  if (state.fight) {
    const monster = monsterDef(content, state.fight.monster);
    const skill = content.skills[playerCombat(state, content).skill];
    const kills = state.fight.kills;
    return {
      line: `${skill?.verb ?? 'Fighting'} the ${monster?.name ?? 'monster'}`,
      detail:
        state.fight.foeHp === 0
          ? 'Another on its way'
          : `${formatNumber(kills)} ${kills === 1 ? 'kill' : 'kills'}`,
      fraction: monster && state.fight.foeHp > 0 ? 1 - state.fight.foeHp / monster.hp : 0,
      target: { kind: 'fight' },
    };
  }
  const action = state.action && content.actions[state.action.id];
  if (action && state.action) {
    const skill = content.skills[action.skill];
    if (action.steal && state.action.stunMs) {
      return {
        line: 'Caught! Lying low',
        detail: action.name,
        fraction: 0,
        target: { kind: 'skill', skill: action.skill },
      };
    }
    const made = action.gives[0];
    return {
      line: `${skill?.verb ?? 'Doing'} ${action.name}`,
      detail: made
        ? `${content.items[made.item]?.name ?? made.item}: ${formatNumber(bankCount(state, made.item))}`
        : (skill?.name ?? ''),
      fraction: state.action.progressMs / actionDuration(state, action, content),
      target: { kind: 'skill', skill: action.skill },
    };
  }
  return {
    line: 'Resting',
    detail: 'Tap to find something to do',
    fraction: null,
    target: { kind: 'choose' },
  };
}

/**
 * The "now doing" strip above the tabs, on every tab: the hero at the work
 * under way (or standing and breathing), what it is and how it is going, a
 * tap from its page. Built once and kept across every screen; every frame
 * moves only the picture (when its frame changes), the bar and the words.
 */
export function nowDoing(content: Content, go: (target: NowTarget) => void): NowDoing {
  const stage = workStage(content, STRIP_SCALE, true, STRIP_TRIM);
  const line = h('span', { class: 'now-line' });
  const detail = h('span', { class: 'now-detail small muted' });
  const progress = bar('action', 'Progress');
  let target: NowTarget = { kind: 'choose' };
  const el = h(
    'button',
    {
      class: 'now-doing',
      attrs: { type: 'button', 'data-now-doing': '' },
      on: { click: () => go(target) },
    },
    [
      h('span', { class: 'now-stage' }, [stage.el]),
      h('span', { class: 'now-text' }, [line, progress.el, detail]),
      h('span', { class: 'hint', text: '›', attrs: { 'aria-hidden': 'true' } }),
    ],
  );
  return {
    el,
    update(state, ms) {
      stage.show(state, ms);
      const now = said(state, content);
      target = now.target;
      el.dataset.target = now.target.kind;
      el.classList.toggle('resting', now.target.kind === 'choose');
      setText(line, now.line);
      setText(detail, now.detail);
      progress.el.hidden = now.fraction === null;
      if (now.fraction !== null) progress.set(now.fraction);
    },
  };
}
