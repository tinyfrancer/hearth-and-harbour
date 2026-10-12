/*
 * A run's challenges and results on screen (S16): the quiet tracker in the
 * corner while a run lasts, and the card at its end. Every judgement is lane
 * A's `challengeMet`, never a second one: a challenge is still to be had
 * while the run, cleared now, would meet it; lost once it would have and no
 * longer would (every statistic only grows); waiting while it would not yet
 * (brace three, step out of three). Plain DOM; no dialogs.
 */
import type { Content, RunStats } from '../core/content';
import type { GameState } from '../core/state';
import { button, h } from '../ui/dom';
import { itemIcon, skillIcon } from '../art/icons';
import { runTime, type Run } from './dungeon';
import {
  challengeDone,
  challengeMet,
  challengesOf,
  chartRow,
  effectWords,
  modifierDef,
  rewardOf,
  spoilsUnder,
  type ChallengeDef,
} from './fromLaneA';
import {
  CHALLENGE_MEDAL_FRAME_MS,
  CHALLENGE_MEDAL_FRAMES,
  challengeIcon,
  challengeMedal,
  modifierIcon,
} from './fromLaneB';
import { runSpoils, runStats } from './modifiers';

/** A run's statistics before it has done anything: what "still to be had" is judged from. */
const NOTHING_YET: RunStats = {
  timeMs: 0,
  damageTaken: 0,
  foodEaten: 0,
  braces: 0,
  stepOuts: 0,
  knockedOut: false,
  kills: 0,
};

/** As much of everything as a run could do: with `NOTHING_YET`, the two ends every statistic runs between. */
const EVERYTHING: RunStats = {
  timeMs: Number.MAX_SAFE_INTEGER,
  damageTaken: Number.MAX_SAFE_INTEGER,
  foodEaten: Number.MAX_SAFE_INTEGER,
  braces: Number.MAX_SAFE_INTEGER,
  stepOuts: Number.MAX_SAFE_INTEGER,
  knockedOut: false,
  kills: Number.MAX_SAFE_INTEGER,
};

/**
 * Whether a run could meet a challenge at all: met at one end of what a run
 * can do or the other (every statistic only grows). One a run cannot meet,
 * whatever it does (a challenge of another day's modifier), is not tracked.
 */
function possible(c: ChallengeDef, modifier: string | null): boolean {
  const ctx = { cleared: true, modifier };
  return challengeMet(c.rule, NOTHING_YET, ctx) || challengeMet(c.rule, EVERYTHING, ctx);
}

/** Where a challenge stands as a run goes. */
export type ChallengeState = 'open' | 'waiting' | 'met' | 'lost';

export interface TrackerLine {
  readonly id: string;
  readonly name: string;
  readonly state: ChallengeState;
  /** For a challenge against the clock: the time so far and the time to beat. */
  readonly clock?: string;
}

/**
 * The challenges a run can still meet, as the tracker shows them: those not
 * done before, each judged by `challengeMet` as if the run were cleared now.
 * Met-from-the-start and still met is `open` (keep it so); not met yet but
 * possible is `waiting`; met now having not been at the start is `met`; met
 * at the start and no longer is `lost`.
 */
export function trackerLines(
  challenges: readonly ChallengeDef[],
  stats: RunStats,
  modifier: string | null,
  done: (id: string) => boolean = () => false,
): TrackerLine[] {
  const ctx = { cleared: true, modifier };
  return challenges
    .filter((c) => !done(c.id) && possible(c, modifier))
    .map((c) => {
      const before = challengeMet(c.rule, NOTHING_YET, ctx);
      const now = challengeMet(c.rule, stats, ctx);
      const state: ChallengeState = before ? (now ? 'open' : 'lost') : now ? 'met' : 'waiting';
      const rule = c.rule;
      const timed = rule.kind === 'atMost' && rule.stat === 'timeMs' ? rule.n : null;
      return {
        id: c.id,
        name: c.name,
        state,
        ...(timed !== null ? { clock: `${runTime(stats.timeMs)} / ${runTime(timed)}` } : {}),
      };
    });
}

/** The most lines the tracker shows at once: what can still be had first, what is lost last. */
export const TRACKER_LINES = 3;

/** The order the tracker shows its lines in: still to be had, waiting, met, then lost. */
const TRACKER_ORDER: Readonly<Record<ChallengeState, number>> = {
  open: 0,
  waiting: 1,
  met: 2,
  lost: 3,
};

/**
 * The tracker's lines as it shows them: what can still be had first (one
 * against the clock first of those), then those waiting, then those met,
 * the lost last; `TRACKER_LINES` at the most.
 */
export function trackerShown(lines: readonly TrackerLine[]): TrackerLine[] {
  return lines
    .map((l, at) => ({ l, at }))
    .sort(
      (a, b) =>
        TRACKER_ORDER[a.l.state] - TRACKER_ORDER[b.l.state] ||
        Number(!a.l.clock) - Number(!b.l.clock) ||
        a.at - b.at,
    )
    .slice(0, TRACKER_LINES)
    .map(({ l }) => l);
}

/** The tracker in the corner of a run: a line a challenge, or folded to one button. */
export interface Tracker {
  readonly el: HTMLElement;
  /** Brought up to date: only what changed is touched. */
  update(run: Run, shown: boolean): void;
  folded(): boolean;
}

export function trackerView(
  content: Content,
  dungeon: string,
  state: GameState,
  o: {
    readonly folded: boolean;
    readonly fold: (folded: boolean) => void;
    /** The run's modifier: a challenge only another day can meet is not tracked. */
    readonly modifier?: string | null;
  },
): Tracker {
  const challenges = challengesOf(content, dungeon);
  const done = (id: string): boolean => challengeDone(state, dungeon, id);
  const modifier = o.modifier ?? null;
  let folded = o.folded;
  const list = h('ul', { class: 'run-tracker-list' });
  const toggle = h('button', {
    class: 'run-tracker-toggle',
    attrs: { type: 'button', 'aria-expanded': String(!folded) },
    on: {
      click: () => {
        folded = !folded;
        o.fold(folded);
        el.dataset.folded = String(folded);
        toggle.setAttribute('aria-expanded', String(!folded));
        toggle.textContent = folded ? 'Goals' : 'Hide';
      },
    },
    text: folded ? 'Goals' : 'Hide',
  });
  const el = h('section', { class: 'run-tracker', attrs: { 'aria-label': 'Challenges' } }, [
    list,
    toggle,
  ]);
  el.dataset.folded = String(folded);
  const lines = new Map<string, { li: HTMLElement; clock: HTMLElement; state: string }>();
  for (const c of challenges) {
    if (done(c.id) || !possible(c, modifier)) continue;
    const clock = h('span', { class: 'run-tracker-clock' });
    const li = h('li', { attrs: { 'data-id': c.id } }, [
      h('span', { class: 'run-tracker-name', text: c.name }),
      clock,
    ]);
    lines.set(c.id, { li, clock, state: '' });
    list.append(li);
  }
  el.hidden = lines.size === 0;
  return {
    el,
    folded: () => folded,
    update(run, shown) {
      const show = shown && lines.size > 0;
      if (el.hidden === show) el.hidden = !show;
      if (!show || folded) return;
      const all = trackerLines(challenges, runStats(run), run.modifier?.id ?? null, done);
      const visible = trackerShown(all);
      for (const line of all) {
        const at = lines.get(line.id);
        if (!at) continue;
        if (at.state !== line.state) {
          at.state = line.state;
          at.li.dataset.state = line.state;
        }
        const text = line.clock ?? '';
        if (at.clock.textContent !== text) at.clock.textContent = text;
        // Three lines at the most, in their order (a flex column's `order`, so nothing is rebuilt).
        const place = visible.indexOf(line);
        const hide = place < 0;
        if (at.li.hidden !== hide) at.li.hidden = hide;
        const order = String(Math.max(0, place));
        if (at.li.style.order !== order) at.li.style.order = order;
      }
    },
  };
}

/** What the results card shows of a run's statistics, a line each. */
export function statLines(stats: RunStats): string[] {
  return [
    `Time: ${runTime(stats.timeMs)}`,
    `Damage taken: ${stats.damageTaken}`,
    `Eaten: ${stats.foodEaten}`,
    `Braced: ${stats.braces}`,
    `Stepped out: ${stats.stepOuts}`,
    `Kills: ${stats.kills}`,
  ];
}

/** One reward the run earns besides its spoils: the first clear's, or a challenge's. */
export interface RunReward {
  /** What earned it: `first` for the first clear, else the challenge's id. */
  readonly for: string;
  /** Its name for the card: "First clear", or the challenge's. */
  readonly name: string;
  readonly coins: number;
  readonly bountyPoints: number;
  readonly items: readonly { readonly item: string; readonly qty: number }[];
}

/**
 * What settling will pay a run on top of its spoils, as lane A pays it: a
 * first clear's items (`DungeonDef.firstClear`, once), and the reward of
 * each challenge met for the first time (`rewardOf`). Nothing for a run that
 * did not clear. Read from the character as the run ended, before settling.
 */
export function runRewards(content: Content, run: Run, state: GameState): RunReward[] {
  if (run.ending !== 'cleared') return [];
  const out: RunReward[] = [];
  const def = chartRow(content, run.dungeon);
  const first = (state.dungeons[run.dungeon]?.clears ?? 0) === 0;
  const items = (def?.firstClear ?? []).filter(
    (r) => Object.hasOwn(content.items, r.item) && r.qty > 0,
  );
  if (first && items.length)
    out.push({ for: 'first', name: 'First clear', coins: 0, bountyPoints: 0, items });
  const stats = runStats(run);
  for (const c of challengesOf(content, run.dungeon)) {
    if (challengeDone(state, run.dungeon, c.id)) continue;
    if (!challengeMet(c.rule, stats, { cleared: true, modifier: run.modifier?.id ?? null }))
      continue;
    out.push({ for: c.id, name: c.name, ...rewardOf(c.reward, content) });
  }
  return out;
}

/** A reward's amounts, short: "250 coins, 2 bounty points, 5 Cooked shrimp". */
export function rewardWords(r: RunReward, content: Content): string {
  const parts: string[] = [];
  if (r.coins > 0) parts.push(`${r.coins} coins`);
  if (r.bountyPoints > 0)
    parts.push(`${r.bountyPoints} bounty point${r.bountyPoints === 1 ? '' : 's'}`);
  for (const { item, qty } of r.items)
    parts.push(`${qty > 1 ? `${qty} ` : ''}${content.items[item]?.name ?? item}`);
  return parts.join(', ');
}

export interface ResultsOptions {
  readonly content: Content;
  readonly run: Run;
  /** The character as the run ended, before it is settled: what was done before. */
  readonly state: GameState;
  readonly title: string;
  readonly line: string;
  readonly again: (() => void) | null;
  readonly home: () => void;
}

/**
 * The end of a run, laid out for a phone on its side (wave 18): along the
 * top its heading and time; on the left how it went (its line, its
 * statistics three to a row, each challenge met, new ones with lane B's
 * medal glinting once); on the right what it earns (the first clear's and
 * the challenges' rewards, the day's modifier and what it added, what comes
 * home as settling will pay it, `spoilsUnder`), scrolling in its own column
 * if it must; along the foot Row out again and Back to town, always whole,
 * 48 pixels at the least, clear of the card's edge.
 */
export function resultsCard(o: ResultsOptions): {
  readonly el: HTMLElement;
  /** The new medals' glint, `ms` (the page's time) after the card showed: once, then done. */
  step(ms: number): void;
} {
  const { content, run, state } = o;
  const stats = runStats(run);
  const cleared = run.ending === 'cleared';
  const spoils = runSpoils(run, cleared);
  const paid = spoilsUnder(spoils, content);
  const plain = spoilsUnder({ ...spoils, modifier: null }, content);
  const modifier = run.modifier ? modifierDef(content, run.modifier.id) : undefined;

  const top = h('div', { class: 'run-top' }, [
    h('h2', { text: o.title }),
    h('p', { class: 'dungeon-time', text: `Time taken: ${runTime(stats.timeMs)}` }),
  ]);

  // Challenges met this run, new ones first noticed: a medal that glints once.
  const met = challengesOf(content, run.dungeon).filter((c) =>
    challengeMet(c.rule, stats, { cleared, modifier: run.modifier?.id ?? null }),
  );
  const medals: HTMLElement[] = [];
  const challengeList = met.length
    ? h(
        'ul',
        { class: 'run-challenges', attrs: { 'aria-label': 'Challenges met' } },
        met.map((c) => {
          const fresh = !challengeDone(state, run.dungeon, c.id);
          const slot = h('span', { class: 'run-medal' }, [
            challengeMedal(fresh ? 'new' : 'done', 0),
          ]);
          if (fresh) medals.push(slot);
          return h('li', { attrs: { 'data-new': String(fresh) } }, [
            slot,
            h('span', { class: 'run-icon' }, [challengeIcon(c.id)]),
            h('span', { class: 'run-what', text: c.name }),
            fresh ? h('span', { class: 'run-new', text: 'New!' }) : null,
          ]);
        }),
      )
    : null;

  const head = h('div', { class: 'run-head' }, [
    h('p', { class: 'muted run-line', text: o.line }),
    h(
      'ul',
      { class: 'run-stats', attrs: { 'aria-label': 'How it went' } },
      statLines(stats)
        .slice(1)
        .map((t) => {
          const [name, value] = t.split(': ');
          return h('li', { attrs: { 'aria-label': t } }, [
            h('span', { class: 'run-stat-name', text: `${name}: ` }),
            h('span', { class: 'run-stat-value', text: value ?? '' }),
          ]);
        }),
    ),
    challengeList,
  ]);

  // What settling pays on top: the first clear's and each new challenge's (lane A's rewards).
  const rewards = runRewards(content, run, state);
  const rewardList = rewards.length
    ? h(
        'ul',
        { class: 'run-rewards', attrs: { 'aria-label': 'Rewards' } },
        rewards.map((r) =>
          h('li', { attrs: { 'data-for': r.for } }, [
            h('span', { class: 'run-medal' }, [
              r.for === 'first' ? null : challengeMedal('done', 0),
            ]),
            h('span', { class: 'run-reward-body' }, [
              h('span', { class: 'run-reward-name', text: r.name }),
              h('span', { class: 'run-reward-what', text: rewardWords(r, content) }),
            ]),
          ]),
        ),
      )
    : null;

  const bonus: string[] = [];
  if (modifier) {
    const sum = (r: Record<string, number>): number => Object.values(r).reduce((x, y) => x + y, 0);
    const coins = paid.coins - plain.coins;
    const xp = sum(paid.xp) - sum(plain.xp);
    const loot = sum(paid.loot) - sum(plain.loot);
    if (coins) bonus.push(`+${coins} coins`);
    if (xp) bonus.push(`+${xp} XP`);
    if (loot) bonus.push(`+${loot} of the usual drops`);
  }
  // The day's modifier on a line of its own in the right column: its icon, its name and what
  // it added; what it does, in full, to a screen reader and on a long press (title).
  const effects = modifier ? effectWords(modifier.effects).join(', ').toLowerCase() : '';
  const day = modifier
    ? h(
        'p',
        {
          class: 'run-modifier',
          attrs: {
            title: `${modifier.name}: ${effects}`,
            'aria-label': `${modifier.name}: ${effects}. ${bonus.join(', ')}`,
          },
        },
        [
          h('span', { class: 'run-modifier-icon' }, [modifierIcon(modifier.id)]),
          h('span', { class: 'run-modifier-name', text: modifier.name }),
          bonus.length ? h('span', { class: 'run-modifier-bonus', text: bonus.join(', ') }) : null,
        ],
      )
    : null;

  const earned: HTMLElement[] = [];
  const line = (icon: Element | null, name: string, amount: string): HTMLElement =>
    h('li', {}, [
      h('span', { class: 'run-icon' }, [icon]),
      h('span', { class: 'run-what', text: name }),
      h('span', { class: 'run-amount', text: amount }),
    ]);
  for (const [skill, xp] of Object.entries(paid.xp))
    earned.push(line(skillIcon(skill), content.skills[skill]?.name ?? skill, `+${xp} XP`));
  if (paid.coins > 0) earned.push(line(null, 'Coins', `+${paid.coins}`));
  for (const [item, qty] of Object.entries(paid.loot))
    earned.push(line(itemIcon(item), content.items[item]?.name ?? item, `×${qty}`));
  if (!earned.length) earned.push(h('li', { class: 'muted', text: 'Nothing, this time.' }));

  const again = o.again ? button('Row out again', o.again) : null;
  let frame = 0;
  const step = (ms: number): void => {
    const f = Math.min(CHALLENGE_MEDAL_FRAMES - 1, Math.floor(ms / CHALLENGE_MEDAL_FRAME_MS));
    if (f === frame) return;
    frame = f;
    for (const slot of medals) slot.replaceChildren(challengeMedal('new', f));
  };
  const el = h('div', { class: 'dungeon-card run-card run-card-s16' }, [
    top,
    head,
    h('div', { class: 'run-side' }, [
      rewardList,
      day,
      h('ul', { class: 'run-earned', attrs: { 'aria-label': 'Earned' } }, earned),
    ]),
    h('div', { class: 'run-buttons' }, [again, button('Back to town', o.home, 'primary')]),
  ]);
  return { el, step };
}
