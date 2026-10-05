import type { ActionDef, Content, SkillDef } from '../core/content';
import { MASTERY_SPEED_PER_LEVEL, actionDuration, affordable } from '../core/actions';
import {
  bankCount,
  masteryLevel,
  masteryXp,
  skillLevel,
  skillXp,
  type GameState,
} from '../core/state';
import { MAX_LEVEL, levelProgress, xpForLevel } from '../core/xp';
import { itemIcon, skillIcon } from '../art/icons';
import { bar } from './bar';
import { button, h, titled } from './dom';
import { formatNumber, formatSeconds } from './format';
import type { View } from './view';

/** What the character is doing in this skill right now, or nothing. */
function doing(state: GameState, skill: SkillDef, content: Content): string {
  const action = state.action && content.actions[state.action.id];
  return action && action.skill === skill.id ? `${skill.verb} ${action.name}` : '';
}

/** The Skills tab: every skill with its level, to tap into, under its group's heading. */
export function skillListView(
  state: GameState,
  content: Content,
  open: (skillId: string) => void,
): View {
  const updates: ((state: GameState) => void)[] = [];
  const row = (skill: SkillDef): HTMLElement => {
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
          titled(skillIcon(skill.id), skill.name),
          h('span', { class: 'level', text: `Level ${skillLevel(state, skill.id)}` }),
        ]),
        xp.el,
        status,
      ],
    );
  };
  const groups = new Map<string, SkillDef[]>();
  for (const skill of Object.values(content.skills)) {
    groups.set(skill.group, [...(groups.get(skill.group) ?? []), skill]);
  }
  const sections = [...groups].map(([group, skills]) =>
    h('section', { class: 'stack', attrs: { 'data-group': group } }, [
      h('h2', { class: 'group-heading', text: group }),
      ...skills.map(row),
    ]),
  );
  const update = (now: GameState): void => updates.forEach((apply) => apply(now));
  update(state);
  return { el: h('div', { class: 'stack groups' }, sections), update };
}

/**
 * What a recipe takes, how many of each the bank holds, and how many times
 * over it can be made. Updated in place, since the counts move as it runs.
 */
function recipeNeeds(
  action: ActionDef,
  content: Content,
  updates: ((state: GameState) => void)[],
): { el: HTMLElement; short(state: GameState): boolean } {
  const uses = action.uses ?? [];
  const name = (item: string): string => content.items[item]?.name ?? item;
  const shortOf = (now: GameState): string[] =>
    uses.filter(({ item, qty }) => bankCount(now, item) < qty).map(({ item }) => name(item));
  const rows = uses.map(({ item, qty }) => {
    const held = h('span', { class: 'qty' });
    const el = h('li', { attrs: { 'data-input': item } }, [
      h('span', { class: 'titled' }, [itemIcon(item), `${name(item)} × ${qty}`]),
      held,
    ]);
    updates.push((now) => {
      const have = bankCount(now, item);
      held.textContent = formatNumber(have);
      el.classList.toggle('short', have < qty);
    });
    return el;
  });
  const verdict = h('p', { class: 'small afford' });
  updates.push((now) => {
    const short = shortOf(now);
    verdict.classList.toggle('problem', short.length > 0);
    verdict.textContent =
      short.length > 0
        ? `Not enough ${short.join(' or ')}`
        : `Enough for ${formatNumber(affordable(now, action))}`;
  });
  return {
    el: h('div', { class: 'needs small' }, [
      h('ul', { class: 'inputs' }, [
        h('li', { class: 'muted' }, [h('span', { text: 'Uses' }), h('span', { text: 'Held' })]),
        ...rows,
      ]),
      verdict,
    ]),
    short: (now) => shortOf(now).length > 0,
  };
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
    const needs = action.uses?.length ? recipeNeeds(action, content, updates) : null;
    const hint = h('span', { class: 'small hint' });
    const progress = bar('action', `${action.name} progress`);
    const mastery = bar('mastery', `${action.name} mastery`);
    const rate = h('span', { class: 'muted' });
    const owned = h('p', { class: 'muted small' });
    const masteryText = h('span', { class: 'small mastery-level' });
    updates.push((now) => {
      const duration = actionDuration(now, action);
      progress.set(now.action?.id === action.id ? now.action.progressMs / duration : 0);
      mastery.set(levelProgress(masteryXp(now, action.id)));
      rate.textContent = `${formatSeconds(duration)} · ${action.xp} XP`;
      const level = masteryLevel(now, action.id);
      const quicker = Number(((level - 1) * MASTERY_SPEED_PER_LEVEL * 100).toFixed(1));
      masteryText.textContent =
        level > 1 ? `Mastery ${level} · ${quicker}% quicker` : `Mastery ${level}`;
      owned.textContent = action.gives
        .map(
          ({ item }) =>
            `${content.items[item]?.name ?? item}: ${formatNumber(bankCount(now, item))}`,
        )
        .join(' · ');
    });
    const el = h(
      'button',
      {
        class: `panel card${active ? ' active' : ''}`,
        attrs: { type: 'button', 'data-action': action.id, 'aria-pressed': String(active) },
        // A recipe that cannot be paid for still answers a tap, with what is short.
        on: { click: () => (active ? actions.stop() : actions.start(action.id)) },
      },
      [
        h('div', { class: 'card-head' }, [
          titled(itemIcon(action.gives[0]?.item ?? ''), action.name),
          rate,
        ]),
        progress.el,
        needs?.el,
        h('div', { class: 'card-head' }, [owned, hint]),
        h('div', { class: 'mastery-row' }, [masteryText, mastery.el]),
      ],
    );
    updates.push((now) => {
      const short = !active && (needs?.short(now) ?? false);
      el.classList.toggle('short', short);
      el.setAttribute('aria-disabled', String(short));
      hint.textContent = active ? 'Tap to stop' : short ? '' : 'Tap to start';
    });
    return el;
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
          titled(skillIcon(skill.id), skill.name),
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
