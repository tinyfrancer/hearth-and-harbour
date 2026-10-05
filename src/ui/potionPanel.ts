import type { Content, PotionDef } from '../core/content';
import { activePotion } from '../core/potions';
import type { GameState } from '../core/state';
import { itemIcon } from '../art/icons';
import { bar } from './bar';
import { h, titled } from './dom';
import { formatNumber, listed } from './format';
import type { View } from './view';

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/** What a potion does to each completion, in a few words: "10% quicker". */
export function potionEffectText(potion: PotionDef): string {
  const { effect } = potion;
  if (effect.kind === 'speed') return `${effect.percent}% quicker`;
  if (effect.kind === 'xp') return `${effect.percent}% more XP`;
  return `An extra item every ${ordinal(effect.every)} time`;
}

/**
 * Which skills a potion helps, as briefly as the tables allow: a whole
 * group by its heading ("Gathering skills"), otherwise the skills by name.
 */
export function potionSkillsText(potion: PotionDef, content: Content): string {
  const helped = new Set(potion.skills);
  const groups = new Map<string, string[]>();
  for (const skill of Object.values(content.skills)) {
    groups.set(skill.group, [...(groups.get(skill.group) ?? []), skill.id]);
  }
  const whole = [...groups].filter(([, ids]) => ids.every((id) => helped.has(id)));
  const covered = new Set(whole.flatMap(([, ids]) => ids));
  if (whole.length > 0 && covered.size === helped.size) {
    return `${listed(whole.map(([group]) => group))} skills`;
  }
  return listed(potion.skills.map((id) => content.skills[id]?.name ?? id));
}

/**
 * The potion working on the character: what it does, for which skills, and
 * the charges it has left, falling as actions complete. Null when there is
 * none, or (given a skill) when it does not help that skill.
 */
export function potionPanel(state: GameState, content: Content, skillId?: string): View | null {
  const active = activePotion(state, content);
  if (!active || (skillId && !active.potion.skills.includes(skillId))) {
    return null;
  }
  const { item, potion } = active;
  const left = h('span', { class: 'qty' });
  const charges = bar('potion', `${item.name} charges left`);
  const update = (now: GameState): void => {
    const count = now.potion?.item === item.id ? now.potion.charges : 0;
    left.textContent = `${formatNumber(count)} left`;
    charges.set(count / potion.charges);
  };
  update(state);
  return {
    el: h('section', { class: 'panel stack tight potion', attrs: { 'data-potion': item.id } }, [
      h('div', { class: 'card-head' }, [titled(itemIcon(item.id), item.name), left]),
      h('p', {
        class: 'small',
        text: `${potionEffectText(potion)} · ${potionSkillsText(potion, content)}`,
      }),
      charges.el,
    ]),
    update,
  };
}
