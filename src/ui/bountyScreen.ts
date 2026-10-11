import { itemIcon } from '../art/icons';
import {
  COINS_PER_POINT,
  REROLL_COST,
  bountyChoices,
  bountyReady,
  bountyReward,
  giveUpCost,
  shopProblem,
} from '../core/bounty';
import { monsterDef } from '../core/combat';
import type { Content, MonsterDef, ShopEntry } from '../core/content';
import type { BountyOffer, GameState } from '../core/state';
import { bar } from './bar';
import { face } from './face';
import { button, h, setText, titled } from './dom';
import { counted, formatNumber } from './format';
import { gearText, slotText } from './gear';
import type { View } from './view';

export interface BountyActions {
  /** Back to the list of skills. */
  back(): void;
  /** Read the notice board: post its offers when nothing is posted yet. */
  read(): void;
  /** Take the offer at this place on the board. */
  take(index: number): void;
  /** Three fresh offers, for a point. */
  reroll(): void;
  handIn(): void;
  giveUp(): void;
  /** Switch auto bounty on or off. */
  auto(on: boolean): void;
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
  const status = h('span', { class: 'small' });
  const title = h('h2');
  const points = h('span', { class: 'muted small' });
  // All of it moves in place: a bounty can be handed in and the next taken by itself.
  const update = (now: GameState): void => {
    const monster = now.bounty ? monsterDef(content, now.bounty.monster) : undefined;
    const ready = bountyReady(now);
    status.className = ready ? 'small doing' : now.bounty ? 'small' : 'small muted';
    setText(status, now.bounty ? progressText(now, monster) : 'The notice board has work for you.');
    setText(title, monster ? `Bounty: ${monster.name}` : 'Bounties');
    setText(points, plural(now.bountyPoints, 'point'));
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
      [h('div', { class: 'card-head' }, [title, points]), status],
    ),
    update,
  };
}

/** Giving up costs points, so it asks once more before it acts. */
function giveUpButton(state: GameState, content: Content, giveUp: () => void): HTMLElement | null {
  const bounty = state.bounty!;
  if (bountyChoices(state, content).every((monster) => monster.id === bounty.monster)) {
    return h('p', { class: 'small muted', text: 'Nothing else on the board for you yet.' });
  }
  const cost = giveUpCost(state);
  const label = cost > 0 ? `Give it up (${plural(cost, 'point')})` : 'Give it up (free)';
  let armed = false;
  const el = button(label, () => {
    if (!armed && cost > 0) {
      armed = true;
      el.textContent = `Tap again to spend ${plural(cost, 'point')}`;
      el.classList.add('danger');
      return;
    }
    giveUp();
  });
  el.setAttribute('data-give-up', '');
  return el;
}

/** "Level 11 · The North Road": where to find a monster, under its name. */
function whereText(monster: MonsterDef | undefined, content: Content): string {
  return monster ? `Level ${monster.level} · ${content.areas?.[monster.area]?.name ?? ''}` : '';
}

/** One notice on the board: who, how many, what it pays, and Take it. */
function offerCard(
  offer: BountyOffer,
  index: number,
  content: Content,
  take: (index: number) => void,
): HTMLElement {
  const monster = monsterDef(content, offer.monster);
  const name = monster?.name ?? offer.monster;
  const take1 = button('Take it', () => take(index), 'primary');
  take1.setAttribute('aria-label', `Take the bounty on ${plural(offer.count, name)}`);
  return h(
    'section',
    { class: 'panel stack tight offer', attrs: { 'data-offer': offer.monster } },
    [
      h('div', { class: 'foe-head' }, [
        monster && face(monster, 'small'),
        h('div', { class: 'stack tight monster-text' }, [
          h('h2', { text: `Wanted: ${plural(offer.count, name)}` }),
          h('p', { class: 'small muted', text: whereText(monster, content) }),
          monster?.bountyOnly &&
            h('p', { class: 'small wanted', text: 'Only bounty hunters go after these.' }),
        ]),
      ]),
      h('p', {
        class: 'small',
        text: `Pays ${plural(offer.points, 'bounty point')} and ${formatNumber(offer.points * COINS_PER_POINT)} coins.`,
      }),
      take1,
    ],
  );
}

/**
 * The switch for auto bounty: when a bounty is done in a fight, it is handed
 * in, the next taken, and the fight goes on against that monster, here or
 * away. A 48-pixel switch that says what it is set to.
 */
function autoSwitch(
  updates: ((state: GameState) => void)[],
  set: (on: boolean) => void,
): HTMLElement {
  let on = false;
  const state = h('span', { class: 'switch-state' });
  const toggle = h(
    'button',
    {
      class: 'btn switch',
      attrs: { type: 'button', role: 'switch', 'data-auto': '' },
      on: { click: () => set(!on) },
    },
    [h('span', { text: 'Auto bounty' }), state],
  );
  updates.push((now) => {
    on = now.autoBounty;
    toggle.setAttribute('aria-checked', String(on));
    setText(state, on ? 'On' : 'Off');
  });
  return h('section', { class: 'panel stack tight' }, [
    toggle,
    h('p', {
      class: 'small muted',
      text: 'When a fight finishes a bounty, hand it in, take the next on the board and fight on, here or while you are away.',
    }),
  ]);
}

/** Where a thing is worn, what it gives, and what it needs. */
export function wornLines(itemId: string, content: Content): string[] {
  const def = content.items[itemId]?.equip;
  if (!def) return [];
  const needs = def.requires
    ? [
        `Needs ${content.skills[def.requires.skill]?.name ?? def.requires.skill} level ${def.requires.level}.`,
      ]
    : [];
  return [`${slotText(def)}: ${gearText(def)}`, ...needs];
}

/** One thing the shop sells: what it is, what it gives, its price, and Buy, which follows the points in place. */
function shopRow(
  entry: ShopEntry,
  content: Content,
  buy: () => void,
  updates: ((state: GameState) => void)[],
) {
  const item = content.items[entry.item];
  const name = item?.name ?? entry.item;
  const buyButton = button(`Buy for ${entry.cost}`, buy);
  buyButton.setAttribute('data-buy', entry.id);
  const why = h('p', { class: 'small muted' });
  updates.push((now) => {
    const problem = shopProblem(now, entry);
    buyButton.disabled = problem !== null;
    buyButton.classList.toggle('primary', problem === null);
    setText(why, problem ?? '');
    why.hidden = !problem;
  });
  return h('section', { class: 'panel stack tight', attrs: { 'data-shop': entry.id } }, [
    h('div', { class: 'card-head' }, [
      titled(itemIcon(entry.item), entry.qty > 1 ? `${name} ×${entry.qty}` : name),
      h('span', { class: 'level', text: `${entry.cost} pts` }),
    ]),
    item && h('p', { class: 'small muted', text: item.description }),
    ...wornLines(entry.item, content).map((line) => h('p', { class: 'small', text: line })),
    entry.once && h('p', { class: 'small muted', text: 'One to a customer.' }),
    why,
    buyButton,
  ]);
}

/**
 * The bounties page: points, auto bounty, the bounty held (its progress,
 * hunting it, handing it in, giving it up) or the board's offers to choose
 * from, and the shop. Progress, points and the shop move in place; the page
 * is built again only when the bounty held, the board or auto bounty changes.
 */
export function bountiesView(state: GameState, content: Content, actions: BountyActions): View {
  const updates: ((state: GameState) => void)[] = [];
  const bounty = state.bounty;
  const monster = bounty ? monsterDef(content, bounty.monster) : undefined;

  let held: HTMLElement;
  if (!bounty) {
    const board = state.bountyBoard;
    const reroll = button(`Fresh notices (${plural(REROLL_COST, 'point')})`, actions.reroll);
    reroll.setAttribute('data-reroll', '');
    updates.push((now) => {
      reroll.disabled = now.bountyPoints < REROLL_COST;
    });
    held = h('section', { class: 'stack', attrs: { 'data-bounty': '' } }, [
      h('section', { class: 'panel stack tight' }, [
        h('h2', { text: 'The notice board' }),
        h('p', {
          class: 'small muted',
          text:
            board.length > 0
              ? 'Pick one. Each pays for the time it should take, whoever it is.'
              : 'Wanted posters, a lost cat, and a list of things the town would like killed. The board pays in points.',
        }),
        board.length === 0 && button('Read the notice board', actions.read, 'primary'),
      ]),
      ...board.map((offer, index) => offerCard(offer, index, content, actions.take)),
      board.length > 0 && reroll,
    ]);
  } else {
    const progress = bar('action', 'Bounty progress');
    const count = h('span', { class: 'qty' });
    updates.push((now) => {
      if (!now.bounty) return;
      progress.set(now.bounty.done / now.bounty.count);
      setText(count, `${formatNumber(now.bounty.done)} / ${formatNumber(now.bounty.count)}`);
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
            h('p', { class: 'small muted', text: whereText(monster, content) }),
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
        !ready && giveUpButton(state, content, actions.giveUp),
      ],
    );
  }

  const shop = Object.values(content.shop ?? {}).map((entry) =>
    shopRow(entry, content, () => actions.buy(entry.id), updates),
  );
  const auto = autoSwitch(updates, actions.auto);
  const pointsText = h('span', { class: 'level', attrs: { 'data-points': '' } });
  updates.push((now) => setText(pointsText, formatNumber(now.bountyPoints)));

  const update = (now: GameState): void => updates.forEach((apply) => apply(now));
  update(state);
  const shape = (now: GameState): string =>
    JSON.stringify([now.bounty?.monster, now.bounty?.count, bountyReady(now), now.bountyBoard]);
  return {
    stale: (before, after) => shape(before) !== shape(after),
    el: h('div', { class: 'stack groups' }, [
      button('‹ All skills', actions.back, 'back'),
      h('section', { class: 'panel stack tight points' }, [
        h('div', { class: 'card-head' }, [h('h2', { text: 'Bounty points' }), pointsText]),
        h('p', {
          class: 'small muted',
          text: 'Earned by handing in bounties. Spent on things nothing else gives.',
        }),
      ]),
      auto,
      held,
      shop.length > 0 && h('h2', { class: 'group-heading', text: 'The bounty shop' }),
      ...shop,
    ]),
    update,
  };
}
