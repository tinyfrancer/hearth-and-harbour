import { itemIcon } from '../art/icons';
import {
  EAT_AT_MAX,
  EAT_AT_MIN,
  EAT_AT_STEP,
  PLAYER_ATTACK_MS,
  RESPAWN_MS,
  hitChance,
  mayFight,
  monsterDef,
  monstersIn,
  playerCombat,
} from '../core/combat';
import type { Content, MonsterDef } from '../core/content';
import type { FightEnd } from '../core/fight';
import { bankCount, type Fight, type GameState } from '../core/state';
import { bar } from './bar';
import { bountyEntry } from './bountyScreen';
import { button, h, titled } from './dom';
import { face } from './face';
import { formatNumber } from './format';
import type { View } from './view';

/** How the last fight ended, kept by the app while the player has not moved on from it. */
export interface FightOver {
  monster: string;
  reason: FightEnd | 'stopped';
  /** What it came to. */
  tally: Fight;
}

export interface CombatActions {
  /** Back to the list of skills. */
  back(): void;
  /** From the fight to the areas. */
  areas(): void;
  /** From the areas to the fight under way. */
  showFight(): void;
  /** To the bounties page. */
  bounties(): void;
  fight(monsterId: string): void;
  stop(): void;
  loadFood(itemId: string): void;
  unloadFood(): void;
  setEatAt(percent: number): void;
}

const percent = (chance: number): string => `${Math.round(chance * 100)}%`;
const itemName = (content: Content, id: string): string => content.items[id]?.name ?? id;

/**
 * What a monster drops, by name once it has been seen to and as "?" until
 * then, so there is something to find out by fighting it.
 */
export function dropsText(monster: MonsterDef, state: GameState, content: Content): string {
  const record = state.bestiary[monster.id];
  const seen = new Set(record?.seen ?? []);
  const names = [
    ...(monster.coins[1] > 0 ? [record?.kills ? 'Coins' : '?'] : []),
    ...[...monster.always, ...monster.rare].map(({ item }) =>
      seen.has(item) ? itemName(content, item) : '?',
    ),
  ];
  return names.join(', ');
}

/** "12 kills · 30 coins", what dropped, and what was eaten and shot. */
function tallyLines(fight: Fight, content: Content): string[] {
  const loot = Object.entries(fight.loot)
    .map(([item, qty]) => `${itemName(content, item)} ×${formatNumber(qty)}`)
    .join(', ');
  const used = [
    `${formatNumber(fight.eaten)} fish eaten`,
    ...(fight.arrows ? [`${formatNumber(fight.arrows)} arrows shot`] : []),
  ];
  return [
    `${formatNumber(fight.kills)} ${fight.kills === 1 ? 'kill' : 'kills'} · ${formatNumber(fight.coins)} coins`,
    loot || 'Nothing dropped yet',
    used.join(' · '),
  ];
}

/** The tally of the fight under way, updated in place as it goes. */
function tallyPanel(updates: ((state: GameState) => void)[], content: Content): HTMLElement {
  const lines = [0, 1, 2].map((i) => h('p', { class: i === 0 ? '' : 'small muted' }));
  updates.push((now) => {
    if (!now.fight) return;
    tallyLines(now.fight, content).forEach((text, i) => {
      if (lines[i]!.textContent !== text) lines[i]!.textContent = text;
    });
  });
  return h('section', { class: 'panel stack tight', attrs: { 'data-tally': '' } }, [
    h('h2', { text: 'This fight' }),
    ...lines,
  ]);
}

/**
 * The food slot and the line the character eats below. Changing either is a
 * player's action and redraws the screen; only the count moves by itself.
 */
function foodPanel(
  state: GameState,
  content: Content,
  actions: CombatActions,
  updates: ((state: GameState) => void)[],
): HTMLElement {
  const held = h('span', { class: 'qty' });
  const note = h('p', { class: 'small muted' });
  updates.push((now) => {
    const food = now.food;
    held.textContent = food
      ? `${itemName(content, food.item)} ×${formatNumber(food.qty)}`
      : 'Empty';
    note.textContent = food
      ? `Each heals ${content.items[food.item]?.heals ?? 0} hit points.`
      : 'With nothing here the character fights on without eating.';
  });
  const fish = Object.values(content.items).filter(
    (item) => item.heals && bankCount(state, item.id) > 0 && item.id !== state.food?.item,
  );
  const choices = fish.map((item) =>
    h(
      'button',
      {
        class: 'btn choice-row',
        attrs: { type: 'button', 'data-food-choice': item.id },
        on: { click: () => actions.loadFood(item.id) },
      },
      [
        h('span', { class: 'titled' }, [itemIcon(item.id), item.name]),
        h('span', {
          class: 'muted',
          text: `×${formatNumber(bankCount(state, item.id))} · heals ${item.heals}`,
        }),
      ],
    ),
  );
  const step = (by: number): HTMLButtonElement => {
    const next = state.eatAt + by;
    const el = button(by < 0 ? '−' : '+', () => actions.setEatAt(next), 'step');
    el.setAttribute('data-eat', by < 0 ? 'lower' : 'higher');
    el.setAttribute('aria-label', by < 0 ? 'Eat later' : 'Eat sooner');
    el.disabled = next < EAT_AT_MIN || next > EAT_AT_MAX;
    return el;
  };
  return h('section', { class: 'panel stack tight food', attrs: { 'data-food': '' } }, [
    h('div', { class: 'card-head' }, [titled(itemIcon(state.food?.item ?? ''), 'Food'), held]),
    note,
    ...choices,
    choices.length === 0 &&
      !state.food &&
      h('p', { class: 'small muted', text: 'No cooked fish in the bank. Cooking makes some.' }),
    state.food && button('Take out', actions.unloadFood),
    h('div', { class: 'eat-line' }, [
      h('span', { attrs: { 'data-eat-at': '' }, text: `Eat below ${state.eatAt}% health` }),
      step(-EAT_AT_STEP),
      step(EAT_AT_STEP),
    ]),
  ]);
}

/** The character's numbers for the style in hand, in one line, with their health as it stands. */
function youLine(state: GameState, content: Content): string {
  const me = playerCombat(state, content);
  const style = me.style === 'ranged' ? 'Ranged' : 'Melee';
  const health =
    me.hp < me.maxHp ? `${me.hp} / ${me.maxHp} hit points, healing` : `${me.maxHp} hit points`;
  return `${style} · attack ${me.attack} · defence ${me.defence} · max hit ${me.maxHit} · ${health}`;
}

/** The Combat section's front page: the fight under way, food, and every area's monsters. */
export function areasView(state: GameState, content: Content, actions: CombatActions): View {
  const updates: ((state: GameState) => void)[] = [];
  const fighting = state.fight && monsterDef(content, state.fight.monster);
  let now: HTMLElement | null = null;
  if (fighting) {
    const status = h('span', { class: 'doing' });
    updates.push((latest) => {
      const kills = latest.fight?.kills ?? 0;
      status.textContent = `${formatNumber(kills)} ${kills === 1 ? 'kill' : 'kills'} so far`;
    });
    now = h(
      'button',
      {
        class: 'panel card active',
        attrs: { type: 'button', 'data-now-fighting': fighting.id },
        on: { click: actions.showFight },
      },
      [
        h('div', { class: 'card-head' }, [
          h('h2', { text: `Fighting the ${fighting.name}` }),
          h('span', { class: 'hint', text: 'Watch' }),
        ]),
        status,
      ],
    );
  }

  const monsterCard = (monster: MonsterDef): HTMLElement => {
    const active = state.fight?.monster === monster.id;
    const kills = state.bestiary[monster.id]?.kills ?? 0;
    // Only a bounty leads to some: they are listed, but plainly out of reach without one.
    const locked = !mayFight(state, monster);
    const wanted = state.bounty?.monster === monster.id ? state.bounty : null;
    return h(
      'button',
      {
        class: `panel card monster${active ? ' active' : ''}${locked ? ' locked' : ''}`,
        attrs: { type: 'button', 'data-monster': monster.id },
        on: { click: () => actions.fight(monster.id) },
      },
      [
        face(monster, 'small'),
        h('div', { class: 'stack tight monster-text' }, [
          h('div', { class: 'card-head' }, [
            h('h2', { text: monster.name }),
            h('span', { class: 'level', text: `Level ${monster.level}` }),
          ]),
          h('p', {
            class: 'small muted',
            text: `${monster.hp} hit points · hits up to ${monster.maxHit}`,
          }),
          h('p', { class: 'small drops', text: `Drops: ${dropsText(monster, state, content)}` }),
          kills > 0 && h('p', { class: 'small muted', text: `Killed ${formatNumber(kills)}` }),
          locked && h('p', { class: 'small muted', text: 'Only with a bounty on it.' }),
          wanted &&
            h('p', {
              class: 'small wanted',
              text: `Bounty: ${formatNumber(wanted.done)} / ${formatNumber(wanted.count)}`,
            }),
        ]),
      ],
    );
  };

  const areas = Object.values(content.areas ?? {}).map((area) =>
    h('section', { class: 'stack', attrs: { 'data-area': area.id } }, [
      h('div', { class: 'stack tight' }, [
        h('h2', { class: 'group-heading', text: area.name }),
        h('p', { class: 'small muted', text: area.description }),
      ]),
      ...monstersIn(content, area.id).map(monsterCard),
    ]),
  );

  const update = (latest: GameState): void => updates.forEach((apply) => apply(latest));
  const food = foodPanel(state, content, actions, updates);
  const bounty = bountyEntry(state, content, actions.bounties);
  // Health comes back as the page is watched, so the line is kept current.
  const you = h('p', { class: 'small muted', attrs: { 'data-you': '' } });
  updates.push((latest) => {
    const text = youLine(latest, content);
    if (you.textContent !== text) you.textContent = text;
  });
  if (bounty.update) updates.push(bounty.update);
  update(state);
  return {
    el: h('div', { class: 'stack groups' }, [
      button('‹ All skills', actions.back, 'back'),
      now,
      bounty.el,
      you,
      food,
      ...areas,
    ]),
    update,
  };
}

/** What to say when a fight is over. */
function overText(
  over: FightOver,
  monster: MonsterDef | undefined,
): { title: string; text: string } {
  const name = monster?.name ?? 'monster';
  switch (over.reason) {
    case 'died':
      return {
        title: 'Knocked out',
        text: `The ${name} got the better of you. No harm done: you come round sore, and heal as you rest.`,
      };
    case 'no_arrows':
      return { title: 'Out of arrows', text: 'Your last arrow is gone, and the fight with it.' };
    case 'gone':
      return { title: 'Gone', text: 'That fight is no longer there to be had.' };
    default:
      return { title: 'Stopped', text: `You stopped fighting the ${name}.` };
  }
}

/**
 * The fight screen: both sides' health and the wait for each one's next
 * blow, the food slot, and the tally. Built once; every frame moves only the
 * bars and the numbers. When the fight is over it says how, and offers
 * another go.
 */
export function fightView(
  state: GameState,
  content: Content,
  over: FightOver | null,
  actions: CombatActions,
): View {
  const updates: ((state: GameState) => void)[] = [];
  const back = button('‹ Areas', actions.areas, 'back');
  const fight = state.fight;
  const monster = fight && monsterDef(content, fight.monster);

  if (!fight || !monster) {
    const ended = over ? monsterDef(content, over.monster) : undefined;
    if (!over) return areasView(state, content, actions);
    const { title, text } = overText(over, ended);
    const food = foodPanel(state, content, actions, updates);
    const update = (latest: GameState): void => updates.forEach((apply) => apply(latest));
    update(state);
    return {
      update,
      el: h('div', { class: 'stack' }, [
        back,
        h(
          'section',
          { class: 'panel stack fight-over', attrs: { 'data-fight-over': over.reason } },
          [
            h('div', { class: 'foe-head' }, [
              ended && face(ended, 'large'),
              h('div', { class: 'stack tight' }, [
                h('h2', { text: title }),
                h('p', { class: 'small', text }),
              ]),
            ]),
            ...tallyLines(over.tally, content).map((line, i) =>
              h('p', { class: i === 0 ? '' : 'small muted', text: line }),
            ),
            ended &&
              over.reason !== 'gone' &&
              button(`Fight the ${ended.name} again`, () => actions.fight(ended.id), 'primary'),
          ],
        ),
        food,
      ]),
    };
  }

  // The monster's side.
  const foeHealth = bar('foe', `${monster.name}'s health`);
  const foeHp = h('span', { class: 'qty' });
  const foeSwing = bar('swing', `${monster.name}'s next blow`);
  const foeWait = h('span', { class: 'small muted' });
  updates.push((now) => {
    const f = now.fight;
    if (!f) return;
    foeHealth.set(f.foeHp / monster.hp);
    foeHp.textContent = `${f.foeHp} / ${monster.hp}`;
    const arriving = f.foeHp === 0;
    foeSwing.set(1 - f.foeMs / (arriving ? RESPAWN_MS : monster.speedMs));
    foeWait.textContent = arriving ? 'Another on its way' : 'Next blow';
  });

  // The character's side.
  const me = playerCombat(state, content);
  const health = bar('health', 'Your health');
  const hp = h('span', { class: 'qty' });
  const swing = bar('swing', 'Your next blow');
  const line = h('div', { class: 'eat-mark' });
  updates.push((now) => {
    const f = now.fight;
    if (!f) return;
    health.set(f.hp / me.maxHp);
    hp.textContent = `${f.hp} / ${me.maxHp}`;
    swing.set(f.foeHp === 0 ? 0 : 1 - f.playerMs / PLAYER_ATTACK_MS);
  });
  // The eating line, marked on the health bar.
  line.style.left = `${state.eatAt}%`;
  // Kills towards a bounty on this monster, counted in place.
  let wanted: HTMLElement | null = null;
  if (state.bounty?.monster === monster.id) {
    const line = h('p', { class: 'small wanted', attrs: { 'data-wanted': '' } });
    updates.push((now) => {
      const held = now.bounty;
      if (!held || held.monster !== monster.id) return;
      const text =
        held.done >= held.count
          ? `Bounty done: ${formatNumber(held.count)} / ${formatNumber(held.count)}. Hand it in.`
          : `Bounty: ${formatNumber(held.done)} / ${formatNumber(held.count)}`;
      if (line.textContent !== text) line.textContent = text;
    });
    wanted = line;
  }
  const chances = `You hit ${percent(hitChance(me.attack, monster.defence))} of the time, up to ${me.maxHit}. It hits ${percent(hitChance(monster.attack, me.defence))}, up to ${monster.maxHit}.`;

  const update = (latest: GameState): void => updates.forEach((apply) => apply(latest));
  const el = h('div', { class: 'stack' }, [
    back,
    h('section', { class: 'panel stack tight foe', attrs: { 'data-foe': monster.id } }, [
      h('div', { class: 'foe-head' }, [
        face(monster, 'large'),
        h('div', { class: 'stack tight' }, [
          h('h2', { text: monster.name }),
          h('p', {
            class: 'small muted',
            text: `Level ${monster.level} · ${content.areas?.[monster.area]?.name ?? ''}`,
          }),
        ]),
      ]),
      h('div', { class: 'card-head small' }, [h('span', { text: 'Health' }), foeHp]),
      foeHealth.el,
      foeWait,
      foeSwing.el,
      wanted,
    ]),
    h('section', { class: 'panel stack tight you', attrs: { 'data-you': '' } }, [
      h('div', { class: 'card-head' }, [
        h('h2', { text: state.name }),
        h('span', { class: 'muted small', text: me.style === 'ranged' ? 'Ranged' : 'Melee' }),
      ]),
      h('div', { class: 'card-head small' }, [h('span', { text: 'Health' }), hp]),
      h('div', { class: 'health-wrap' }, [health.el, line]),
      h('span', { class: 'small muted', text: 'Next blow' }),
      swing.el,
      h('p', { class: 'small muted', text: chances }),
    ]),
    foodPanel(state, content, actions, updates),
    tallyPanel(updates, content),
    button('Stop fighting', actions.stop),
  ]);
  update(state);
  return { el, update };
}
