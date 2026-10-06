import type { ActionDef, Content } from '../core/content';
import { markChance, stealChance, thiefRating } from '../core/thieving';
import { masteryLevel, masteryXp, skillLevel, type GameState } from '../core/state';
import { levelProgress } from '../core/xp';
import { bar } from './bar';
import { h } from './dom';
import { faceIfDrawn } from './face';
import { formatNumber, formatSeconds } from './format';

const percent = (chance: number): string => `${Math.round(chance * 100)}%`;

/** A face beside what is written, or what is written alone. */
const withFace = (portrait: HTMLElement | null, text: HTMLElement[]): HTMLElement =>
  portrait
    ? h('div', { class: 'foe-head' }, [
        portrait,
        h('div', { class: 'stack tight monster-text' }, text),
      ])
    : h('div', { class: 'stack tight' }, text);

/**
 * What a mark may give up besides coins: by name once it has, "?" until
 * then, as a monster's drops are.
 */
function lootText(state: GameState, mark: ActionDef, content: Content): string {
  const seen = new Set(state.marks[mark.id]?.seen ?? []);
  const [least, most] = mark.steal!.coins;
  const loot = mark.steal!.loot.map(({ item }) =>
    seen.has(item) ? (content.items[item]?.name ?? item) : '?',
  );
  return [`${least}–${most} coins`, ...loot].join(' · ');
}

/**
 * One mark on the Thieving page: what it is, the chance of getting away with
 * it and the stun for not, what it pays, and the bar. While stunned the bar
 * runs down in red. Everything that moves is updated in place.
 */
export function markCard(
  state: GameState,
  mark: ActionDef,
  content: Content,
  updates: ((state: GameState) => void)[],
  actions: { start(id: string): void; stop(): void },
): HTMLElement {
  const steal = mark.steal!;
  const active = state.action?.id === mark.id;
  const progress = bar('action', `${mark.name} progress`);
  const mastery = bar('mastery', `${mark.name} mastery`);
  const chance = h('p', { class: 'small chance', attrs: { 'data-chance': mark.id } });
  const tally = h('p', { class: 'muted small' });
  const masteryText = h('span', { class: 'small mastery-level' });
  const loot = h('p', { class: 'small drops' });
  const hint = h('span', { class: 'small hint', text: active ? 'Tap to stop' : 'Tap to start' });

  updates.push((now) => {
    const running = now.action?.id === mark.id ? now.action : null;
    const stunned = running?.stunMs ?? 0;
    progress.el.classList.toggle('stun', stunned > 0);
    progress.set(
      stunned > 0 ? stunned / steal.stunMs : running ? running.progressMs / mark.durationMs : 0,
    );
    const text =
      stunned > 0
        ? `Caught! Lying low for ${formatSeconds(Math.ceil(stunned / 100) * 100)}`
        : `${percent(markChance(now, mark))} chance · caught: ${formatSeconds(steal.stunMs)} stun`;
    if (chance.textContent !== text) chance.textContent = text;
    chance.classList.toggle('problem', stunned > 0);
    const level = masteryLevel(now, mark.id);
    mastery.set(levelProgress(masteryXp(now, mark.id)));
    // What mastery has added to the chance, at the Thieving level the character has now.
    const thief = skillLevel(now, mark.skill);
    const gained =
      stealChance(thiefRating(thief, level), steal.difficulty) -
      stealChance(thiefRating(thief, 1), steal.difficulty);
    masteryText.textContent =
      gained > 0 ? `Mastery ${level} · chance +${percent(gained)}` : `Mastery ${level}`;
    const record = now.marks[mark.id];
    tally.textContent = record
      ? `Picked ${formatNumber(record.picked)} · Caught ${formatNumber(record.caught)}`
      : 'Not yet tried';
    loot.textContent = lootText(now, mark, content);
  });

  return h(
    'button',
    {
      class: `panel card mark${active ? ' active' : ''}`,
      attrs: { type: 'button', 'data-action': mark.id, 'aria-pressed': String(active) },
      on: { click: () => (active ? actions.stop() : actions.start(mark.id)) },
    },
    [
      // The mark's face beside who they are, once art draws one; the card stands without.
      withFace(faceIfDrawn(mark, 'small'), [
        h('div', { class: 'card-head' }, [
          h('h2', { text: mark.name }),
          h('span', {
            class: 'muted rate',
            text: `${formatSeconds(mark.durationMs)} · ${mark.xp} XP`,
          }),
        ]),
        h('p', { class: 'small muted', text: steal.description }),
      ]),
      chance,
      progress.el,
      loot,
      h('div', { class: 'card-head' }, [tally, hint]),
      h('div', { class: 'mastery-row' }, [masteryText, mastery.el]),
    ],
  );
}
