import { OFFLINE_CAP_MS, type AwayReport } from '../core/away';
import type { Content } from '../core/content';
import { button, h } from './dom';
import { formatDuration, formatNumber } from './format';

/** The away report: what the character got done while the game was shut. */
export function awayReportOverlay(
  report: AwayReport,
  content: Content,
  dismiss: () => void,
): HTMLElement {
  const action = content.actions[report.actionId];
  const skill = action && content.skills[action.skill];
  const itemName = (id: string): string => content.items[id]?.name ?? id;

  const gains = [
    ...Object.entries(report.items).map(([item, qty]) =>
      h('li', { class: qty < 0 ? 'loss' : '' }, [
        h('span', { text: itemName(item) }),
        h('span', { class: 'qty', text: `${qty > 0 ? '+' : '−'}${formatNumber(Math.abs(qty))}` }),
      ]),
    ),
    ...Object.entries(report.xp).map(([id, xp]) =>
      h('li', {}, [
        h('span', { text: `${content.skills[id]?.name ?? id} XP` }),
        h('span', { class: 'qty', text: `+${formatNumber(xp)}` }),
      ]),
    ),
  ];
  const levels = Object.entries(report.levels).map(([id, { from, to }]) =>
    h('p', { class: 'level-up', text: `${content.skills[id]?.name ?? id} level ${from} → ${to}` }),
  );

  let stopped = '';
  if (report.stopped?.reason === 'ran_out') {
    stopped = `Stopped: you ran out of ${itemName(report.stopped.item)}.`;
  } else if (report.stopped) {
    stopped = 'Stopped: that is no longer something you can do.';
  }

  return h(
    'div',
    { class: 'overlay', attrs: { role: 'dialog', 'aria-label': 'While you were away' } },
    [
      h('section', { class: 'panel stack' }, [
        h('h2', { text: 'While you were away' }),
        h('p', {
          class: 'muted',
          text: `${formatDuration(report.awayMs)}${
            action && skill ? `, ${skill.verb.toLowerCase()} ${action.name}` : ''
          }`,
        }),
        report.awayMs > report.countedMs &&
          h('p', {
            class: 'muted small',
            text: `Only the first ${formatDuration(OFFLINE_CAP_MS)} count.`,
          }),
        gains.length > 0
          ? h('ul', { class: 'gains' }, gains)
          : h('p', { class: 'muted', text: 'Nothing finished in that time.' }),
        ...levels,
        stopped && h('p', { class: 'problem', text: stopped }),
        button('Carry on', dismiss, 'primary'),
      ]),
    ],
  );
}
