import { FIGURE2_H } from '../art/character2';
import { actionDuration } from '../core/actions';
import { monsterDef, playerCombat } from '../core/combat';
import type { Content } from '../core/content';
import { bankCount, type GameState } from '../core/state';
import type { Prefs } from '../persistence/Prefs';
import { workStage } from './atWork';
import { bar } from './bar';
import { h, setText } from './dom';
import { formatNumber } from './format';

/**
 * Device pixels to an art pixel for the hero in the strip: the fewest whole
 * ones that show him at least 0.6 CSS pixels an art pixel, but never so many
 * that he stands taller than `STRIP_TALLEST` CSS pixels. He fills his
 * canvas's height (his hair to his soles, `FIGURE2_H`), so that sets the
 * strip's. Two at 3x (48 CSS tall) and at 2.625x (55); one at 1x (72, a
 * desktop, where nothing smaller is whole).
 *
 * At 2x the only whole sizes are 36 and 72 CSS: wave 15 chose 72, which made
 * the strip 75 tall on a 2x phone against 55 at 3x (wave 16: "cap it
 * sensibly"); the cap brings him back to 36 there, the strip to its 52
 * minimum, the same as on a 3x phone. At 3.5x two (41).
 */
export function stripScale(dpr: number): number {
  const least = Math.max(1, Math.ceil(STRIP_LEAST * dpr - 1e-9));
  const most = Math.max(1, Math.floor((STRIP_TALLEST * dpr) / FIGURE2_H + 1e-9));
  return Math.min(least, most);
}
const STRIP_LEAST = 0.6;
/** The tallest the hero stands in the strip, in CSS pixels. */
export const STRIP_TALLEST = 56;

/** The strip folded to a slim bar, on this device (a preference, never the save). */
export const STRIP_FOLDED_PREF = 'strip-folded';

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
export function nowDoing(
  content: Content,
  go: (target: NowTarget) => void,
  prefs?: Prefs,
): NowDoing {
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  // Fitted to the work under way: as wide as this loop and its prop, no wider.
  const stage = workStage(content, stripScale(dpr) / dpr, true, {}, true);
  const line = h('span', { class: 'now-line' });
  const detail = h('span', { class: 'now-detail small muted' });
  const progress = bar('action', 'Progress');
  let target: NowTarget = { kind: 'choose' };
  let folded = prefs?.get(STRIP_FOLDED_PREF) === '1';
  const main = h(
    'button',
    {
      class: 'now-doing',
      attrs: { type: 'button', 'data-now-doing': '' },
      on: { click: () => go(target) },
    },
    [
      h('span', { class: 'now-stage' }, [stage.el]),
      h('span', { class: 'now-text' }, [line, progress.el, detail]),
    ],
  );
  // Folded, the strip is a slim bar: the words and the bar, no hero. Its own
  // button, beside the strip's (a button cannot hold another), remembered.
  const fold = h('button', {
    class: 'now-fold',
    attrs: { type: 'button', 'data-now-fold': '' },
    on: {
      click: () => {
        folded = !folded;
        prefs?.set(STRIP_FOLDED_PREF, folded ? '1' : '0');
        show();
      },
    },
  });
  const el = h('div', { class: 'now-strip' }, [main, fold]);
  const show = (): void => {
    el.classList.toggle('folded', folded);
    fold.textContent = folded ? '▴' : '▾';
    fold.setAttribute('aria-label', folded ? 'Show the hero at work' : 'Fold the strip away');
    fold.setAttribute('aria-expanded', String(!folded));
  };
  show();
  return {
    el,
    update(state, ms) {
      if (!folded) stage.show(state, ms);
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
