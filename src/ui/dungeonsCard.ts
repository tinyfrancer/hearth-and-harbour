import {
  CHALLENGE_MEDAL_FRAMES,
  CHALLENGE_MEDAL_FRAME_MS,
  challengeIcon,
  challengeMedal,
  dungeonSeal,
  modifierIcon,
} from '../art/dungeonIcons';
import { DAY2 } from '../art/town2/ramps';
import { pixelCanvas2 } from '../art/town2/raster';
import { maxHp } from '../core/combat';
import type { ChallengeDef, Content, DungeonDef } from '../core/content';
import { dungeonStatus, dungeonsInOrder, type DungeonState } from '../core/dungeons';
import { challengeDone, effectWords, mayIdle, modifierDef } from '../core/progress';
import type { GameState } from '../core/state';
import { bar } from './bar';
import { button, h, setText } from './dom';
import { rewardWords } from './dungeonWords';
import { formatClock, formatNumber } from './format';

/** What the Dungeons card can ask of the app. */
export interface DungeonsCardActions {
  /** To the Town tab with the harbour chart open: the way into a dungeon. */
  harbour(): void;
  /** Send the hero through a cleared dungeon idle. */
  sendIdle(dungeonId: string): void;
  /** Call the hero home from the dungeon run idle. */
  stopIdle(): void;
  /** Today's modifier on a dungeon, by the app's clock and the phone's time zone. */
  today(dungeonId: string): string | null;
  /** Whether the player left a dungeon's row open on this phone; folded if not said. */
  rowOpen?(dungeonId: string): boolean;
  /** Keep a dungeon's row open or folded on this phone. */
  setRowOpen?(dungeonId: string, open: boolean): void;
  /** True the first time it is asked of a challenge done since the app last showed it: its medal sparkles. */
  freshMedal?(challengeId: string): boolean;
}

/** The word for where the character stands with a dungeon, as its row shows it. */
const STANDING: Readonly<Record<DungeonState, string>> = {
  open: 'Open',
  cleared: 'Cleared',
  locked: 'Locked',
  soon: 'Not yet charted',
};

/** A dungeon's facts in a line: the level, its clears and its bests. */
function factsOf(state: GameState, dungeon: DungeonDef, content: Content): string {
  const status = dungeonStatus(state, dungeon.id, content)!;
  const record = state.dungeons[dungeon.id];
  const facts = [`Recommended combat level ${status.recommended}`];
  if (status.clears > 0) {
    facts.push(`cleared ${status.clears === 1 ? 'once' : `${formatNumber(status.clears)} times`}`);
    if (status.bestMs !== undefined) facts.push(`best ${formatClock(status.bestMs)}`);
    if (record?.leastDamage !== undefined)
      facts.push(
        record.leastDamage === 0 ? 'cleared unhurt' : `least damage ${record.leastDamage}`,
      );
  }
  if (record?.idleRuns) {
    facts.push(`${formatNumber(record.idleRuns)} ${record.idleRuns === 1 ? 'run' : 'runs'} idle`);
  }
  return facts.join(' · ');
}

/**
 * Today's modifier on a dungeon: its icon (lane B's, chosen by its id),
 * its name and what it does, plainly. Moves in place at local midnight.
 */
function todayLine(dungeon: DungeonDef, content: Content, actions: DungeonsCardActions) {
  const icon = h('span', { class: 'day-icon', attrs: { 'aria-hidden': 'true' } });
  const name = h('span', { class: 'day-name' });
  const words = h('span', { class: 'small muted day-words' });
  const el = h('div', { class: 'dungeon-day', attrs: { 'data-modifier': '' } }, [
    icon,
    h('div', { class: 'stack tight' }, [name, words]),
  ]);
  let shown: string | null | undefined;
  const update = (): void => {
    const id = actions.today(dungeon.id);
    if (id === shown) return;
    shown = id;
    const modifier = id ? modifierDef(content, id) : undefined;
    el.hidden = !modifier;
    el.setAttribute('data-modifier', id ?? '');
    if (!modifier) return;
    // By its id, whose words were chosen for lane B's pictures: a slack tide is
    // a tide, where its effects alone (foes slower) would draw it as haste.
    icon.replaceChildren(modifierIcon(modifier.id));
    setText(name, `Today: ${modifier.name}`);
    setText(words, `${effectWords(modifier.effects).join('. ')}.`);
  };
  update();
  return { el, update };
}

/**
 * A medal, gold once done; a challenge done since the card last showed it
 * gets lane B's `new` medal, its sparkle played once, which ends as the done
 * medal for good.
 */
function medalOf(done: boolean, fresh: boolean): HTMLElement {
  const holder = h('span', {
    class: 'challenge-medal',
    attrs: {
      'aria-label': done ? 'Done' : 'Not yet',
      'data-medal': fresh ? 'new' : done ? 'done' : 'todo',
    },
  });
  if (!fresh) {
    holder.append(challengeMedal(done ? 'done' : 'todo'));
    return holder;
  }
  let frame = 0;
  const step = (): void => {
    holder.replaceChildren(challengeMedal('new', frame));
    frame += 1;
    if (frame < CHALLENGE_MEDAL_FRAMES) setTimeout(step, CHALLENGE_MEDAL_FRAME_MS);
    else holder.setAttribute('data-medal', 'done');
  };
  step();
  return holder;
}

/** One challenge: its picture, what it asks and pays, and a medal, gold once done. */
function challengeRow(
  dungeon: DungeonDef,
  challenge: ChallengeDef,
  state: GameState,
  content: Content,
  fresh: boolean,
): HTMLElement {
  const done = challengeDone(state, dungeon.id, challenge.id);
  return h(
    'li',
    {
      class: `challenge${done ? ' done' : ''}`,
      attrs: { 'data-challenge': challenge.id, 'data-done': String(done) },
    },
    [
      h('span', { class: 'challenge-icon', attrs: { 'aria-hidden': 'true' } }, [
        challengeIcon(challenge.id),
      ]),
      h('div', { class: 'stack tight challenge-text' }, [
        h('span', { class: 'challenge-name', text: challenge.name }),
        h('span', { class: 'small muted', text: challenge.text }),
        h('span', {
          class: 'small reward',
          text: done ? 'Done' : rewardWords(challenge.reward, content),
        }),
      ]),
      medalOf(done, done && fresh),
    ],
  );
}

/** Every challenge done in a state, as `<dungeon>.<slug>` ids: what the card has nothing new to show of. */
export function doneChallenges(state: GameState | null): Set<string> {
  return new Set(Object.values(state?.dungeons ?? {}).flatMap((record) => record.challenges ?? []));
}

/** A dungeon's seal (lane B's), at about a tap target's size: bronze once cleared, gold with every challenge. */
function sealOf(dungeon: DungeonDef, allDone: boolean): HTMLElement {
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const tier = allDone ? 'all-challenges' : 'cleared';
  const seal = pixelCanvas2(
    dungeonSeal(dungeon.id, tier).picture,
    DAY2,
    Math.max(1, Math.round(dpr * 1.5)),
    dpr,
  );
  seal.setAttribute('aria-hidden', 'true');
  return h('span', { class: 'dungeon-seal', attrs: { 'data-seal': tier } }, [seal]);
}

/** What a dungeon's first clear opens, honestly: tier 2 is not built yet. */
function tierLine(state: GameState, dungeon: DungeonDef): HTMLElement | null {
  if (!dungeon.opens || dungeon.comingSoon) return null;
  const cleared = (state.dungeons[dungeon.id]?.clears ?? 0) > 0;
  const { tier, brings } = dungeon.opens;
  return h('p', {
    class: `small tier${cleared ? ' unlocked' : ''}`,
    attrs: { 'data-tier': String(tier), 'data-unlocked': String(cleared) },
    text: cleared
      ? `Tier ${tier} unlocked. It is still being built; when it comes, it brings ${brings}.`
      : `Its first clear unlocks tier ${tier}, still being built: ${brings}.`,
  });
}

export interface DungeonsCard {
  readonly el: HTMLElement;
  update(state: GameState): void;
}

/**
 * Every dungeon on the harbour chart, in its order: whether it is open,
 * cleared or locked (and what unlocks it), the combat level it is meant for,
 * its clears and bests, today's modifier, its challenges done and not, what
 * its first clear opens, and, once cleared, the way to send the hero through
 * it idle. Landings to come show as a "?" with what will open them. The way
 * in by hand is the boat at the quay: "To the harbour".
 *
 * Built once for a state (the clears and challenges change only after a run
 * by hand, which rebuilds the page); the day's modifier and the counts move
 * in place.
 */
export function dungeonsCard(
  state: GameState,
  content: Content,
  actions: DungeonsCardActions,
): DungeonsCard | null {
  const updates: ((state: GameState) => void)[] = [];
  const rows = dungeonsInOrder(content).flatMap((dungeon) => {
    const status = dungeonStatus(state, dungeon.id, content);
    if (!status) return [];
    const soon = status.state === 'soon';
    if (soon) {
      return [
        h(
          'div',
          {
            class: 'dungeon-row stack tight soon',
            attrs: { 'data-dungeon-row': dungeon.id, 'data-status': status.state },
          },
          [
            h('div', { class: 'card-head' }, [
              h('h3', { text: '?' }),
              h('span', { class: 'standing soon', text: STANDING.soon }),
            ]),
            h('p', { class: 'small muted', text: status.unlock }),
          ],
        ),
      ];
    }
    const facts = h('p', { class: 'small muted', attrs: { 'data-facts': '' } });
    updates.push((now) => setText(facts, factsOf(now, dungeon, content)));
    const day = todayLine(dungeon, content, actions);
    updates.push(day.update);
    const challenges = dungeon.challenges ?? [];
    const done = challenges.filter((c) => challengeDone(state, dungeon.id, c.id));
    // Asked of every challenge done, so each is shown as new once only.
    const fresh = new Set(done.filter((c) => actions.freshMedal?.(c.id) ?? false).map((c) => c.id));
    const running = state.idleRun?.dungeon === dungeon.id;
    const idleButton = !mayIdle(state, dungeon.id, content)
      ? null
      : running
        ? button('Call the hero home', actions.stopIdle, 'stop')
        : button('Send the hero through idle', () => actions.sendIdle(dungeon.id), 'primary');
    idleButton?.setAttribute(running ? 'data-idle-stop' : 'data-idle-start', dungeon.id);
    // A day that is a trade is played plain by a hero sent alone (`idleModifier`): say so.
    const trades = (dungeon.modifiers ?? []).some((id) => {
      const modifier = modifierDef(content, id);
      return modifier && !modifier.kind;
    });
    const body = h(
      'div',
      { class: 'stack tight dungeon-body', attrs: { 'data-dungeon-body': dungeon.id } },
      [
        h('p', { class: 'small muted', text: dungeon.description }),
        status.state === 'locked' &&
          h('p', { class: 'small', attrs: { 'data-unlock': '' }, text: status.unlock }),
        facts,
        day.el,
        challenges.length > 0 &&
          h('div', { class: 'stack tight' }, [
            h('h4', {
              class: 'challenges-head',
              text: `Challenges · ${done.length} of ${challenges.length} done`,
            }),
            h(
              'ul',
              { class: 'challenges', attrs: { 'data-challenges': dungeon.id } },
              challenges.map((challenge) =>
                challengeRow(dungeon, challenge, state, content, fresh.has(challenge.id)),
              ),
            ),
          ]),
        tierLine(state, dungeon),
        idleButton,
        mayIdle(state, dungeon.id, content) &&
          !running &&
          h('p', {
            class: 'small muted',
            text: `Sent alone he fights his way through again and again, slower than by hand and keeping only some of what falls; never a clear, never a challenge.${trades ? ' A hard day he takes plain: its catch and its bonus both left out.' : ''}`,
          }),
      ],
    );
    // Folded, the row is one line to tap: the seal once cleared, the name, where things stand.
    const summary = h('span', { class: 'small muted summary-line', attrs: { 'data-summary': '' } });
    const allDone = challenges.length > 0 && done.length === challenges.length;
    const cleared = status.clears > 0;
    updates.push(() => {
      const today = actions.today(dungeon.id);
      const modifier = today ? modifierDef(content, today) : undefined;
      const parts = [
        running ? 'Running idle' : STANDING[status.state],
        challenges.length > 0 ? `${done.length} of ${challenges.length} challenges` : '',
        modifier ? `Today: ${modifier.name}` : '',
      ];
      setText(summary, parts.filter(Boolean).join(' · '));
    });
    const toggle = h(
      'button',
      {
        class: 'dungeon-toggle',
        attrs: { type: 'button', 'data-dungeon-toggle': dungeon.id },
        on: {
          click: () => {
            const open = row.getAttribute('data-open') !== 'true';
            actions.setRowOpen?.(dungeon.id, open);
            show(open);
          },
        },
      },
      [
        cleared ? sealOf(dungeon, allDone) : h('span', { class: 'dungeon-seal none' }),
        h('span', { class: 'stack tight dungeon-title' }, [
          h('h3', { text: dungeon.name }),
          summary,
        ]),
        done.length > 0 && h('span', { class: 'summary-medal' }, [medalOf(true, fresh.size > 0)]),
      ],
    );
    const row = h(
      'div',
      {
        class: 'dungeon-row stack tight',
        attrs: { 'data-dungeon-row': dungeon.id, 'data-status': status.state },
      },
      [toggle, body],
    );
    const show = (open: boolean): void => {
      body.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      row.setAttribute('data-open', String(open));
    };
    show(actions.rowOpen?.(dungeon.id) ?? running);
    return [row];
  });
  if (rows.length === 0) return null;
  const el = h('section', { class: 'panel stack dungeons', attrs: { 'data-dungeons': '' } }, [
    h('div', { class: 'card-head' }, [
      h('h2', { text: 'Dungeons' }),
      h('span', { class: 'hint', text: 'By boat from the quay' }),
    ]),
    ...rows,
    button('To the harbour', actions.harbour, 'primary'),
  ]);
  const update = (now: GameState): void => updates.forEach((apply) => apply(now));
  update(state);
  return { el, update };
}

/**
 * The dungeon being run idle, at the top of the Combat page: where the hero
 * is in it, his health, the runs and what they have come to, and the way to
 * call him home. Moves in place.
 */
export function idleRunPanel(
  state: GameState,
  content: Content,
  stopIdle: () => void,
): DungeonsCard | null {
  const run = state.idleRun;
  const dungeon = run && content.dungeons?.[run.dungeon];
  if (!run || !dungeon?.idle) return null;
  const rooms = dungeon.idle.rooms.length;
  const where = h('p', { attrs: { 'data-idle-where': '' } });
  const health = bar('health', 'Hit points');
  const hp = h('span', { class: 'small muted' });
  const tally = h('p', { class: 'small', attrs: { 'data-idle-tally': '' } });
  const loot = h('p', { class: 'small muted' });
  const update = (now: GameState): void => {
    const idle = now.idleRun;
    if (!idle) return;
    const modifier = idle.modifier ? modifierDef(content, idle.modifier) : undefined;
    setText(
      where,
      `${idle.foes.length > 0 ? 'Fighting in' : idle.room === 0 ? 'Rowing out to' : 'Walking to'} room ${idle.room + 1} of ${rooms}${modifier ? ` · ${modifier.name}` : ''}`,
    );
    const most = maxHp(now);
    health.set(idle.hp / most);
    setText(hp, `${idle.hp} / ${most} hit points`);
    setText(
      tally,
      `${formatNumber(idle.runs)} ${idle.runs === 1 ? 'run' : 'runs'} · ${formatNumber(idle.kills)} ${idle.kills === 1 ? 'foe' : 'foes'} felled · ${formatNumber(idle.eaten)} eaten`,
    );
    const found = Object.entries(idle.loot)
      .map(([item, qty]) => `${content.items[item]?.name ?? item} ×${formatNumber(qty)}`)
      .join(', ');
    setText(loot, found || 'Nothing kept yet');
  };
  const el = h(
    'section',
    { class: 'panel stack tight active idle-run', attrs: { 'data-idle-run': run.dungeon } },
    [
      h('div', { class: 'card-head' }, [
        h('h2', { text: `Running ${dungeon.name}` }),
        h('span', { class: 'doing', text: 'Idle' }),
      ]),
      where,
      h('div', { class: 'stack tight' }, [health.el, hp]),
      tally,
      loot,
      button('Call the hero home', stopIdle, 'stop'),
    ],
  );
  update(state);
  return { el, update };
}
