import type { ActionDef, Content, SkillDef } from '../core/content';
import { bankCount, skillLevel, skillXp, type GameState } from '../core/state';
import { MAX_LEVEL, levelProgress, xpForLevel } from '../core/xp';
import { bar } from './bar';
import { button, h } from './dom';
import { formatNumber, formatSeconds } from './format';
import type { View } from './view';

/** What the character is doing in this skill right now, or nothing. */
function doing(state: GameState, skill: SkillDef, content: Content): string {
  const action = state.action && content.actions[state.action.id];
  return action && action.skill === skill.id ? `${skill.verb} ${action.name}` : '';
}

/** The Skills tab: every skill with its level, to tap into. */
export function skillListView(
  state: GameState,
  content: Content,
  open: (skillId: string) => void,
): View {
  const updates: ((state: GameState) => void)[] = [];
  const rows = Object.values(content.skills).map((skill) => {
    const xp = bar('xp', `${skill.name} experience`);
    const status = h('span', { class: 'doing' });
    updates.push((now) => {
      xp.set(levelProgress(skillXp(now, skill.id)));
      status.textContent = doing(now, skill, content);
    });
    return h(
      'button',
      {
        class: 'panel card',
        attrs: { type: 'button', 'data-skill': skill.id },
        on: { click: () => open(skill.id) },
      },
      [
        h('div', { class: 'card-head' }, [
          h('h2', { text: skill.name }),
          h('span', { class: 'level', text: `Level ${skillLevel(state, skill.id)}` }),
        ]),
        xp.el,
        status,
      ],
    );
  });
  const update = (now: GameState): void => updates.forEach((apply) => apply(now));
  update(state);
  return { el: h('div', { class: 'stack' }, rows), update };
}

interface SkillPageActions {
  back(): void;
  start(actionId: string): void;
  stop(): void;
}

/** One skill: its level and XP, and everything it can do. */
export function skillPageView(
  state: GameState,
  content: Content,
  skill: SkillDef,
  actions: SkillPageActions,
): View {
  const level = skillLevel(state, skill.id);
  const updates: ((state: GameState) => void)[] = [];

  const xp = bar('xp', `${skill.name} experience`);
  const xpText = h('p', { class: 'muted small' });
  updates.push((now) => {
    const have = skillXp(now, skill.id);
    xp.set(levelProgress(have));
    xpText.textContent =
      level >= MAX_LEVEL
        ? `${formatNumber(have)} XP`
        : `${formatNumber(have)} / ${formatNumber(xpForLevel(level + 1))} XP`;
  });

  const card = (action: ActionDef): HTMLElement => {
    if (level < action.level) {
      return h('div', { class: 'panel card locked', attrs: { 'data-action': action.id } }, [
        h('div', { class: 'card-head' }, [
          h('h2', { text: action.name }),
          h('span', { class: 'muted', text: `Level ${action.level}` }),
        ]),
      ]);
    }
    const active = state.action?.id === action.id;
    const progress = bar('action', `${action.name} progress`);
    const owned = h('p', { class: 'muted small' });
    updates.push((now) => {
      progress.set(now.action?.id === action.id ? now.action.progressMs / action.durationMs : 0);
      owned.textContent = action.gives
        .map(
          ({ item }) =>
            `${content.items[item]?.name ?? item}: ${formatNumber(bankCount(now, item))}`,
        )
        .join(' · ');
    });
    return h(
      'button',
      {
        class: `panel card${active ? ' active' : ''}`,
        attrs: { type: 'button', 'data-action': action.id, 'aria-pressed': String(active) },
        on: { click: () => (active ? actions.stop() : actions.start(action.id)) },
      },
      [
        h('div', { class: 'card-head' }, [
          h('h2', { text: action.name }),
          h('span', {
            class: 'muted',
            text: `${formatSeconds(action.durationMs)} · ${action.xp} XP`,
          }),
        ]),
        progress.el,
        h('div', { class: 'card-head' }, [
          owned,
          h('span', { class: 'small hint', text: active ? 'Tap to stop' : 'Tap to start' }),
        ]),
      ],
    );
  };

  const cards = Object.values(content.actions)
    .filter((action) => action.skill === skill.id)
    .sort((a, b) => a.level - b.level)
    .map(card);

  const update = (now: GameState): void => updates.forEach((apply) => apply(now));
  update(state);
  return {
    el: h('div', { class: 'stack' }, [
      button('‹ All skills', actions.back, 'back'),
      h('section', { class: 'panel stack tight' }, [
        h('div', { class: 'card-head' }, [
          h('h2', { text: skill.name }),
          h('span', { class: 'level', text: `Level ${level}` }),
        ]),
        xp.el,
        xpText,
      ]),
      ...cards,
    ]),
    update,
  };
}
