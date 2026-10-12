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
import type { Content, DungeonFoe, MonsterDef } from '../core/content';
import type { FightEnd } from '../core/fight';
import { foeDrops } from '../core/run';
import { bankCount, type Fight, type GameState } from '../core/state';
import { monsterLock, tierLock, tierOf, tierUnlocked } from '../core/tiers';
import { tierChip, tierLockLine } from './tierMarks';
import { bar } from './bar';
import { bountyEntry } from './bountyScreen';
import { button, h, setText, titled } from './dom';
import { keyedList } from './keyed';
import { face } from './face';
import { dungeonsCard, idleRunPanel } from './dungeonsCard';
import { formatNumber } from './format';
import type { View } from './view';
import { workStage } from './atWork';

/** CSS pixels to an art pixel for the hero in the duel: as tall as the foe's large portrait. */
const DUEL_SCALE = 2;

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
  /** To the Town tab with the harbour chart open: the way into a dungeon. */
  harbour(): void;
  /** Send the hero through a cleared dungeon idle. */
  sendIdle(dungeonId: string): void;
  /** Call the hero home from a dungeon run idle. */
  stopIdle(): void;
  /** Today's modifier on a dungeon, by the app's clock and the phone's time zone. */
  today(dungeonId: string): string | null;
  /** The Dungeons card's rows: open or folded on this phone (`DungeonsCardActions`). */
  rowOpen?(dungeonId: string): boolean;
  setRowOpen?(dungeonId: string, open: boolean): void;
  /** True once for each challenge done since the card last showed it. */
  freshMedal?(challengeId: string): boolean;
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

/**
 * What one of a dungeon's cast drops, from its own row in the dungeon's data
 * (`src/data/dungeons.ts`): a thing by name once this foe has been seen to
 * drop it (the run says who dropped what), "?" until then, as a table
 * monster's are. What is one thing or another (`pick`) shows each. Never
 * from the collection log: a pearl from a sand crab says nothing of the
 * giant crab's.
 */
export function castDropsText(foe: DungeonFoe, state: GameState, content: Content): string {
  const seen = new Set(state.bestiary[foe.id]?.seen ?? []);
  const names = [
    ...(foe.coins[1] > 0 ? ['Coins'] : []),
    ...foeDrops(foe).map((id) => (seen.has(id) ? itemName(content, id) : '?')),
  ];
  return names.join(', ');
}

/** "14 to 22": the levels of a dungeon's cast, weakest to strongest. */
function levelRange(cast: readonly DungeonFoe[]): string {
  const levels = cast.map((foe) => foe.level);
  const least = Math.min(...levels);
  const most = Math.max(...levels);
  return least === most ? `${least}` : `${least} to ${most}`;
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
  // The fish to choose from follow the bank in place: a kind cooked, bought
  // or dropped while the page is open gets its row; one eaten up loses it.
  const choices = h('div', { class: 'stack tight food-choices' });
  const rows = keyedList<GameState>(choices, (id) => {
    const item = content.items[id]!;
    const held = h('span', { class: 'muted' });
    const el = h(
      'button',
      {
        class: 'btn choice-row',
        attrs: { type: 'button', 'data-food-choice': item.id },
        on: { click: () => actions.loadFood(item.id) },
      },
      [h('span', { class: 'titled' }, [itemIcon(item.id), item.name]), held],
    );
    return {
      el,
      update: (now) =>
        setText(held, `×${formatNumber(bankCount(now, item.id))} · heals ${item.heals}`),
    };
  });
  const none = h('p', {
    class: 'small muted',
    text: 'No cooked fish in the bank. Cooking makes some.',
  });
  updates.push((now) => {
    const fish = Object.values(content.items)
      .filter((item) => item.heals && bankCount(now, item.id) > 0 && item.id !== state.food?.item)
      .map((item) => item.id);
    rows.sync(fish, now);
    none.hidden = fish.length > 0 || Boolean(state.food);
  });
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
    choices,
    none,
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
    // Only a bounty leads to some, and a later tier's wait for its dungeon (S22): they are
    // listed, but plainly out of reach, saying why.
    const tierClosed = monsterLock(state, monster, content);
    const locked = Boolean(tierClosed) || !mayFight(state, monster);
    // What a kill changes moves in place: the count, what has been seen to drop, the bounty.
    const drops = h('p', { class: 'small drops' });
    const killed = h('p', { class: 'small muted' });
    const wanted = h('p', { class: 'small wanted' });
    updates.push((now) => {
      const kills = now.bestiary[monster.id]?.kills ?? 0;
      setText(drops, `Drops: ${dropsText(monster, now, content)}`);
      setText(killed, kills > 0 ? `Killed ${formatNumber(kills)}` : '');
      killed.hidden = kills === 0;
      const held = now.bounty?.monster === monster.id ? now.bounty : null;
      setText(
        wanted,
        held ? `Bounty: ${formatNumber(held.done)} / ${formatNumber(held.count)}` : '',
      );
      wanted.hidden = !held;
    });
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
          drops,
          killed,
          tierClosed
            ? tierLockLine(tierClosed)
            : locked && h('p', { class: 'small muted', text: 'Only with a bounty on it.' }),
          wanted,
        ]),
      ],
    );
  };

  const areas = Object.values(content.areas ?? {}).map((area) => {
    // A later tier's area (S22) wears its chip, and says why while it is closed.
    const tier = tierOf(area);
    const closed = tierLock(state, tier, content);
    return h('section', { class: 'stack', attrs: { 'data-area': area.id } }, [
      h('div', { class: 'stack tight' }, [
        h('div', { class: 'area-head' }, [
          h('h2', { class: 'group-heading', text: area.name }),
          tier > 1 && tierChip(tier, !closed),
        ]),
        h('p', { class: 'small muted', text: area.description }),
        closed && tierLockLine(closed),
      ]),
      ...monstersIn(content, area.id).map(monsterCard),
    ]);
  });

  // A dungeon's cast is fought in its scene, not from here; what has been
  // beaten there is kept like any kill, and shown after the areas. Anyone not
  // yet met stays a "?", so there is someone to find out about.
  // One met on the shore as well (the cave's dock rats) has the one card, the
  // area's, and is named here only.
  const casts = Object.values(content.dungeons ?? {})
    .filter((dungeon) => dungeon.cast?.length && !dungeon.comingSoon)
    .map((dungeon) => {
      const own = dungeon.cast!.filter((foe) => !content.monsters?.[foe.id]);
      const shared = dungeon.cast!.filter((foe) => content.monsters?.[foe.id]);
      const also = shared.length
        ? ` ${shared.map((foe) => foe.name).join(' and ')} ${shared.length === 1 ? 'is' : 'are'} met here too, and counted with those above.`
        : '';
      return h('section', { class: 'stack', attrs: { 'data-dungeon': dungeon.id } }, [
        h('div', { class: 'stack tight' }, [
          h('h2', { class: 'group-heading', text: dungeon.name }),
          h('p', {
            class: 'small muted',
            text: `Fought in the dungeon itself, not from here: levels ${levelRange(dungeon.cast!)}. Everyone beaten there is counted.${also}`,
          }),
        ]),
        ...own.map((foe) => {
          const kills = state.bestiary[foe.id]?.kills ?? 0;
          if (!kills) {
            return h('div', { class: 'panel card monster unmet', attrs: { 'data-cast': foe.id } }, [
              h('div', { class: 'portrait small blank', attrs: { 'aria-hidden': 'true' } }, [
                h('span', { text: '?' }),
              ]),
              h('div', { class: 'stack tight monster-text' }, [
                h('h2', { text: '?' }),
                h('p', { class: 'small muted', text: 'Not beaten yet' }),
              ]),
            ]);
          }
          // Once beaten, as a table monster is shown: level, numbers, drops.
          return h('div', { class: 'panel card monster', attrs: { 'data-cast': foe.id } }, [
            face(foe, 'small'),
            h('div', { class: 'stack tight monster-text' }, [
              h('div', { class: 'card-head' }, [
                h('h2', { text: foe.name }),
                h('span', { class: 'level', text: `Level ${foe.level}` }),
              ]),
              h('p', {
                class: 'small muted',
                text: `${foe.hp} hit points · hits up to ${foe.maxHit}`,
              }),
              h('p', {
                class: 'small drops',
                text: `Drops: ${castDropsText(foe, state, content)}`,
              }),
              h('p', { class: 'small muted', text: `Killed ${formatNumber(kills)}` }),
            ]),
          ]);
        }),
      ]);
    });

  const idle = idleRunPanel(state, content, actions.stopIdle);
  if (idle) updates.push(idle.update);
  const dungeons = dungeonsCard(state, content, actions);
  if (dungeons) updates.push(dungeons.update);
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
      idle?.el,
      dungeons?.el,
      you,
      food,
      ...areas,
      ...casts,
    ]),
    update,
    // Built for the fight under way, the bounty held (which monsters are open)
    // and the food slot's state; a kill, a level or a drop changes none of those.
    stale: (before, after) =>
      before.fight?.monster !== after.fight?.monster ||
      before.idleRun?.dungeon !== after.idleRun?.dungeon ||
      before.bounty?.monster !== after.bounty?.monster ||
      Boolean(before.food) !== Boolean(after.food) ||
      tierUnlocked(before, 2, content) !== tierUnlocked(after, 2, content),
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
      stale: (before, after) =>
        Boolean(after.fight) || Boolean(before.food) !== Boolean(after.food),
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

  // The character's side. A level gained mid-fight (a kill can bring three)
  // moves these numbers in place; the screen is not rebuilt for it.
  const health = bar('health', 'Your health');
  const hp = h('span', { class: 'qty' });
  const swing = bar('swing', 'Your next blow');
  const line = h('div', { class: 'eat-mark' });
  const styleLine = h('p', { class: 'small muted' });
  const chances = h('p', { class: 'small muted' });
  updates.push((now) => {
    const f = now.fight;
    if (!f) return;
    const me = playerCombat(now, content);
    health.set(f.hp / me.maxHp);
    setText(hp, `${f.hp} / ${me.maxHp}`);
    swing.set(f.foeHp === 0 ? 0 : 1 - f.playerMs / PLAYER_ATTACK_MS);
    setText(styleLine, `${me.style === 'ranged' ? 'Ranged' : 'Melee'} · max hit ${me.maxHit}`);
    setText(
      chances,
      `You hit ${percent(hitChance(me.attack, monster.defence))} of the time, up to ${me.maxHit}. It hits ${percent(hitChance(monster.attack, me.defence))}, up to ${monster.maxHit}.`,
    );
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
  // Face to face: the hero striking on the left, his blow landing as each one
  // does (the wait for his next blow drives it), the foe's portrait opposite.
  const hero = workStage(content, DUEL_SCALE, false, { left: 8 });
  const update = (latest: GameState, time?: number): void => {
    updates.forEach((apply) => apply(latest));
    if (time !== undefined) hero.show(latest, time);
  };
  const el = h('div', { class: 'stack' }, [
    back,
    h('section', { class: 'duel', attrs: { 'data-duel': monster.id } }, [
      h('div', { class: 'duel-hero' }, [hero.el]),
      face(monster, 'large'),
    ]),
    h('section', { class: 'panel stack tight foe', attrs: { 'data-foe': monster.id } }, [
      h('div', { class: 'foe-head' }, [
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
      // Face to face: the foe's on the left of its panel, the hero's on the right of theirs.
      h('div', { class: 'foe-head you-head' }, [
        h('div', { class: 'stack tight' }, [h('h2', { text: state.name }), styleLine]),
      ]),
      h('div', { class: 'card-head small' }, [h('span', { text: 'Health' }), hp]),
      h('div', { class: 'health-wrap' }, [health.el, line]),
      h('span', { class: 'small muted', text: 'Next blow' }),
      swing.el,
      chances,
    ]),
    foodPanel(state, content, actions, updates),
    tallyPanel(updates, content),
    button('Stop fighting', actions.stop),
  ]);
  update(state);
  hero.show(state, 0);
  return {
    el,
    update,
    // The fight screen is the one a kill is about, and still it moves in
    // place; it is built again only for another monster (a bounty taken by
    // itself), the fight's end, a bounty on this monster coming or going, or
    // the food slot emptying.
    stale: (before, after) =>
      before.fight?.monster !== after.fight?.monster ||
      before.idleRun?.dungeon !== after.idleRun?.dungeon ||
      (before.bounty?.monster === monster.id) !== (after.bounty?.monster === monster.id) ||
      Boolean(before.food) !== Boolean(after.food),
  };
}
