import { itemIcon } from '../art/icons';
import { collectable, collectionSources } from '../core/collection';
import type { AchievementDef, Content } from '../core/content';
import type { GameState } from '../core/state';
import { button, h } from './dom';
import { formatNumber } from './format';
import type { View } from './view';

const outOf = (have: number, of: number): string => `${formatNumber(have)} / ${formatNumber(of)}`;

/** How many of the things the log lists the character has found. */
function foundCount(state: GameState, content: Content): { found: number; of: number } {
  const all = collectable(content);
  const found = new Set(state.collection);
  return { found: all.filter((id) => found.has(id)).length, of: all.length };
}

/** How many achievements are earned, of those the tables hold. */
function earnedCount(state: GameState, content: Content): { earned: number; of: number } {
  const all = Object.keys(content.achievements ?? {});
  const earned = new Set(state.achievements);
  return { earned: all.filter((id) => earned.has(id)).length, of: all.length };
}

/**
 * The two ways from the character sheet to the records: the collection log
 * and the achievements, each with its count, kept current in place.
 */
export function recordsEntry(
  state: GameState,
  content: Content,
  open: (page: 'log' | 'achievements') => void,
): View {
  const logCount = h('span', { class: 'qty' });
  const awardCount = h('span', { class: 'qty' });
  const card = (
    label: string,
    hint: string,
    count: HTMLElement,
    attr: string,
    page: 'log' | 'achievements',
  ) =>
    h(
      'button',
      {
        class: 'panel card',
        attrs: { type: 'button', [attr]: '' },
        on: { click: () => open(page) },
      },
      [
        h('div', { class: 'card-head' }, [h('h2', { text: label }), count]),
        h('p', { class: 'small muted', text: hint }),
      ],
    );
  const update = (now: GameState): void => {
    const { found, of } = foundCount(now, content);
    logCount.textContent = outOf(found, of);
    const { earned, of: all } = earnedCount(now, content);
    awardCount.textContent = outOf(earned, all);
  };
  update(state);
  return {
    el: h('div', { class: 'stack' }, [
      card('Collection log', 'Everything you have ever held.', logCount, 'data-log', 'log'),
      card(
        'Achievements',
        'Things done, and things still to do.',
        awardCount,
        'data-achievements',
        'achievements',
      ),
    ]),
    update,
  };
}

/**
 * The collection log: every source, with how many of its things have been
 * found, and each thing found (named, with its picture) or not (a "?").
 * Something found while the page is open turns over in place.
 */
export function collectionView(state: GameState, content: Content, back: () => void): View {
  const updates: ((found: Set<string>) => void)[] = [];
  const total = h('span', { class: 'qty', attrs: { 'data-found': '' } });
  const sections = collectionSources(content).map((source) => {
    const count = h('span', { class: 'small muted' });
    const chips = source.items.map((id) => {
      const chip = h('li', { class: 'log-item', attrs: { 'data-log-item': id } });
      let shown: boolean | null = null;
      updates.push((found) => {
        const has = found.has(id);
        if (has === shown) return;
        shown = has;
        chip.classList.toggle('found', has);
        const item = content.items[id];
        chip.replaceChildren(
          ...(has
            ? [
                itemIcon(id) ?? h('span', { class: 'log-blank', attrs: { 'aria-hidden': 'true' } }),
                h('span', { text: item?.name ?? id }),
              ]
            : [h('span', { class: 'unknown', text: '?' })]),
        );
        chip.setAttribute('aria-label', has ? (item?.name ?? id) : 'Not yet found');
      });
      return chip;
    });
    updates.push((found) => {
      count.textContent = outOf(
        source.items.filter((id) => found.has(id)).length,
        source.items.length,
      );
    });
    return h('section', { class: 'panel stack tight', attrs: { 'data-source': source.id } }, [
      h('div', { class: 'card-head' }, [h('h2', { text: source.name }), count]),
      h('ul', { class: 'log-items' }, chips),
    ]);
  });
  updates.push(() => {
    const { found, of } = foundCount(latest, content);
    total.textContent = outOf(found, of);
  });

  let latest = state;
  let seen = -1;
  const update = (now: GameState): void => {
    latest = now;
    // The log only grows, so its length says whether anything is new.
    if (now.collection.length === seen) return;
    seen = now.collection.length;
    const found = new Set(now.collection);
    updates.forEach((apply) => apply(found));
  };
  update(state);
  return {
    el: h('div', { class: 'stack groups', attrs: { 'data-collection': '' } }, [
      button('‹ Character', back, 'back'),
      h('section', { class: 'panel stack tight' }, [
        h('div', { class: 'card-head' }, [h('h2', { text: 'Collection log' }), total]),
        h('p', {
          class: 'small muted',
          text: 'Everything you have ever held, by where it comes from. A thing counts once you have had it, whatever you did with it after.',
        }),
      ]),
      ...sections,
    ]),
    update,
  };
}

/** One achievement's row: what it is called and asks, or a hidden one's veil. */
function achievementRow(def: AchievementDef, earned: boolean): HTMLElement {
  const veiled = def.hidden && !earned;
  return h(
    'li',
    {
      class: `achievement${earned ? ' earned' : ''}`,
      attrs: { 'data-achievement': def.id },
    },
    [
      h('span', { class: 'mark', text: earned ? '★' : '·', attrs: { 'aria-hidden': 'true' } }),
      h('div', { class: 'stack tight' }, [
        h('h2', { text: veiled ? '???' : def.name }),
        h('p', { class: 'small muted', text: veiled ? 'A hidden achievement.' : def.text }),
      ]),
      earned && h('span', { class: 'small doing', text: 'Earned' }),
    ],
  );
}

/** The achievements: earned and not, in table order, hidden ones veiled until earned. */
export function achievementsView(state: GameState, content: Content, back: () => void): View {
  const all = Object.values(content.achievements ?? {});
  const total = h('span', { class: 'qty', attrs: { 'data-earned': '' } });
  const list = h('ul', { class: 'achievements' });
  let seen = -1;
  const update = (now: GameState): void => {
    if (now.achievements.length === seen) return;
    seen = now.achievements.length;
    const earned = new Set(now.achievements);
    const { earned: count, of } = earnedCount(now, content);
    total.textContent = outOf(count, of);
    list.replaceChildren(...all.map((def) => achievementRow(def, earned.has(def.id))));
  };
  update(state);
  return {
    el: h('div', { class: 'stack groups', attrs: { 'data-achievement-list': '' } }, [
      button('‹ Character', back, 'back'),
      h('section', { class: 'panel stack tight' }, [
        h('div', { class: 'card-head' }, [h('h2', { text: 'Achievements' }), total]),
        h('p', {
          class: 'small muted',
          text: 'Earned the moment you do the thing, here or away, and yours for good.',
        }),
      ]),
      list,
    ]),
    update,
  };
}
