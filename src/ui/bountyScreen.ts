import { itemIcon } from '../art/icons';
import { bountyChoices, bountyReady, bountyReward, shopProblem, swapCost } from '../core/bounty';
import { monsterDef } from '../core/combat';
import type { Content, MonsterDef, ShopEntry } from '../core/content';
import type { GameState } from '../core/state';
import { bar } from './bar';
import { face } from './face';
import { button, h, titled } from './dom';
import { counted, formatNumber } from './format';
import { gearText, slotText } from './gear';
import type { View } from './view';

export interface BountyActions {
  /** Back to the list of skills. */
  back(): void;
  take(): void;
  handIn(): void;
  swap(): void;
  /** Fight the monster the bounty names. */
  hunt(monsterId: string): void;
  buy(entryId: string): void;
}

const plural = counted;

/** "6 of 24 Footpads", or "Ready to hand in". */
function progressText(state: GameState, monster: MonsterDef | undefined): string {
  const bounty = state.bounty;
  if (!bounty) return '';
  if (bountyReady(state)) return 'Ready to hand in';
  return `${formatNumber(bounty.done)} of ${formatNumber(bounty.count)} ${monster?.name ?? 'monsters'}`;
}

/**
 * The way to the bounties, at the head of the Combat section and on the
 * areas page: the bounty held and how far along it is, or an invitation.
 */
export function bountyEntry(state: GameState, content: Content, open: () => void): View {
  const monster = state.bounty ? monsterDef(content, state.bounty.monster) : undefined;
  const status = h('span', { class: 'small' });
  const update = (now: GameState): void => {
    const ready = bountyReady(now);
    status.className = ready ? 'small doing' : now.bounty ? 'small' : 'small muted';
    status.textContent = now.bounty
      ? progressText(now, monster)
      : 'The notice board has work for you.';
  };
  update(state);
  return {
    el: h(
      'button',
      {
        class: 'panel card',
        attrs: { type: 'button', 'data-bounties': '' },
        on: { click: open },
      },
      [
        h('div', { class: 'card-head' }, [
          h('h2', { text: monster ? `Bounty: ${monster.name}` : 'Bounties' }),
          h('span', {
            class: 'muted small',
            text: `${formatNumber(state.bountyPoints)} ${state.bountyPoints === 1 ? 'point' : 'points'}`,
          }),
        ]),
        status,
      ],
    ),
    update,
  };
}

/** Swapping costs points, so it asks once more before it acts. */
function swapButton(state: GameState, content: Content, swap: () => void): HTMLElement | null {
  const bounty = state.bounty!;
  if (bountyChoices(state, content).every((monster) => monster.id === bounty.monster)) {
    return h('p', { class: 'small muted', text: 'Nothing else on the board for you yet.' });
  }
  const cost = swapCost(state);
  const label = cost > 0 ? `Swap it (${plural(cost, 'point')})` : 'Swap it (free)';
  let armed = false;
  const el = button(label, () => {
    if (!armed && cost > 0) {
      armed = true;
      el.textContent = `Tap again to spend ${plural(cost, 'point')}`;
      el.classList.add('danger');
      return;
    }
    swap();
  });
  el.setAttribute('data-swap', '');
  return el;
}

/** Where a thing is worn, what it gives, and what it needs. */
function wornLines(entry: ShopEntry, content: Content): string[] {
  const def = content.items[entry.item]?.equip;
  if (!def) return [];
  const needs = def.requires
    ? [
        `Needs ${content.skills[def.requires.skill]?.name ?? def.requires.skill} level ${def.requires.level}.`,
      ]
    : [];
  return [`${slotText(def)}: ${gearText(def)}`, ...needs];
}

/** One thing the shop sells: what it is, what it gives, its price, and Buy. */
function shopRow(state: GameState, entry: ShopEntry, content: Content, buy: () => void) {
  const item = content.items[entry.item];
  const name = item?.name ?? entry.item;
  const problem = shopProblem(state, entry);
  const buyButton = button(`Buy for ${entry.cost}`, buy, problem ? '' : 'primary');
  buyButton.disabled = problem !== null;
  buyButton.setAttribute('data-buy', entry.id);
  return h('section', { class: 'panel stack tight', attrs: { 'data-shop': entry.id } }, [
    h('div', { class: 'card-head' }, [
      titled(itemIcon(entry.item), entry.qty > 1 ? `${name} ×${entry.qty}` : name),
      h('span', { class: 'level', text: `${entry.cost} pts` }),
    ]),
    item && h('p', { class: 'small muted', text: item.description }),
    ...wornLines(entry, content).map((line) => h('p', { class: 'small', text: line })),
    entry.once && h('p', { class: 'small muted', text: 'One to a customer.' }),
    problem && h('p', { class: 'small muted', text: problem }),
    buyButton,
  ]);
}

/**
 * The bounties page: points, the bounty held (its progress, hunting it,
 * handing it in, swapping it) or the board's offer of one, and the shop.
 * Progress moves in place; the app redraws the page when a bounty is done.
 */
export function bountiesView(state: GameState, content: Content, actions: BountyActions): View {
  const updates: ((state: GameState) => void)[] = [];
  const bounty = state.bounty;
  const monster = bounty ? monsterDef(content, bounty.monster) : undefined;

  let held: HTMLElement;
  if (!bounty) {
    held = h('section', { class: 'panel stack', attrs: { 'data-bounty': '' } }, [
      h('h2', { text: 'The notice board' }),
      h('p', {
        class: 'small muted',
        text: 'Wanted posters, a lost cat, and a list of things the town would like killed. Take one; the board pays in points.',
      }),
      button('Take a bounty', actions.take, 'primary'),
    ]);
  } else {
    const progress = bar('action', 'Bounty progress');
    const count = h('span', { class: 'qty' });
    updates.push((now) => {
      if (!now.bounty) return;
      progress.set(now.bounty.done / now.bounty.count);
      count.textContent = `${formatNumber(now.bounty.done)} / ${formatNumber(now.bounty.count)}`;
    });
    const { points, coins } = bountyReward(state, content);
    const ready = bountyReady(state);
    const name = monster?.name ?? bounty.monster;
    const fighting = state.fight?.monster === bounty.monster;
    held = h(
      'section',
      { class: `panel stack${ready ? ' ready' : ''}`, attrs: { 'data-bounty': bounty.monster } },
      [
        h('div', { class: 'foe-head' }, [
          monster && face(monster, 'small'),
          h('div', { class: 'stack tight' }, [
            h('h2', { text: `Wanted: ${plural(bounty.count, name)}` }),
            h('p', {
              class: 'small muted',
              text: monster
                ? `Level ${monster.level} · ${content.areas?.[monster.area]?.name ?? ''}`
                : '',
            }),
          ]),
        ]),
        h('div', { class: 'card-head small' }, [h('span', { text: 'Killed' }), count]),
        progress.el,
        h('p', {
          class: 'small',
          text: `Pays ${plural(points, 'bounty point')} and ${formatNumber(coins)} coins.`,
        }),
        ready
          ? button(`Hand in for ${plural(points, 'point')}`, actions.handIn, 'primary')
          : monster &&
            button(
              fighting ? `Watch the fight` : `Hunt the ${name}`,
              () => actions.hunt(monster.id),
              'primary',
            ),
        !ready && swapButton(state, content, actions.swap),
      ],
    );
  }

  const shop = Object.values(content.shop ?? {}).map((entry) =>
    shopRow(state, entry, content, () => actions.buy(entry.id)),
  );

  const update = (now: GameState): void => updates.forEach((apply) => apply(now));
  update(state);
  return {
    el: h('div', { class: 'stack groups' }, [
      button('‹ All skills', actions.back, 'back'),
      h('section', { class: 'panel stack tight points' }, [
        h('div', { class: 'card-head' }, [
          h('h2', { text: 'Bounty points' }),
          h('span', {
            class: 'level',
            attrs: { 'data-points': '' },
            text: formatNumber(state.bountyPoints),
          }),
        ]),
        h('p', {
          class: 'small muted',
          text: 'Earned by handing in bounties. Spent on things nothing else gives.',
        }),
      ]),
      held,
      shop.length > 0 && h('h2', { class: 'group-heading', text: 'The bounty shop' }),
      ...shop,
    ]),
    update,
  };
}
