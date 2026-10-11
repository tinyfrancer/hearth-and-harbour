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
  effectWords,
  modifierDef,
  spoilsUnder,
  type ChallengeDef,
} from './fromLaneA';
import {
  CHALLENGE_MEDAL_FRAME_MS,
  CHALLENGE_MEDAL_FRAMES,
  challengeIcon,
  challengeMedal,
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
      for (const line of trackerLines(challenges, runStats(run), run.modifier?.id ?? null, done)) {
        const at = lines.get(line.id);
        if (!at) continue;
        if (at.state !== line.state) {
          at.state = line.state;
          at.li.dataset.state = line.state;
        }
        const text = line.clock ?? '';
        if (at.clock.textContent !== text) at.clock.textContent = text;
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
 * The end of a run: its heading and line, its time and statistics, each
 * challenge it met (new ones with a medal that glints, once), the day's
 * modifier and what it paid, and what comes home as settling will pay it
 * (`spoilsUnder`), with Row out again and Back to town.
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

  const head: (HTMLElement | null)[] = [
    h('h2', { text: o.title }),
    h('p', { class: 'muted', text: o.line }),
    h('p', { class: 'dungeon-time', text: `Time taken: ${runTime(stats.timeMs)}` }),
    // Two to a line: the card fits a phone on its side.
    h(
      'ul',
      { class: 'run-stats', attrs: { 'aria-label': 'How it went' } },
      statLines(stats)
        .slice(1)
        .map((t) => h('li', { text: t })),
    ),
  ];

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
            h('span', { class: 'run-what', text: fresh ? `${c.name} — new!` : c.name }),
          ]);
        }),
      )
    : null;

  const bonus: string[] = [];
  if (modifier) {
    const more = (a: number, b: number): number => a - b;
    const sum = (r: Record<string, number>): number => Object.values(r).reduce((x, y) => x + y, 0);
    const coins = more(paid.coins, plain.coins);
    const xp = more(sum(paid.xp), sum(plain.xp));
    const loot = more(sum(paid.loot), sum(plain.loot));
    if (coins) bonus.push(`+${coins} coins`);
    if (xp) bonus.push(`+${xp} XP`);
    if (loot) bonus.push(`+${loot} of the usual drops`);
  }
  const day = modifier
    ? h('p', { class: 'run-modifier' }, [
        h('span', { class: 'run-modifier-name', text: modifier.name }),
        ` (${effectWords(modifier.effects).join(', ').toLowerCase()})${
          bonus.length ? `: ${bonus.join(', ')}` : ''
        }`,
      ])
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
  // Two columns on a phone on its side: how it went on the left; what it paid and the way on on
  // the right, its buttons always at the foot of the card.
  const el = h('div', { class: 'dungeon-card run-card run-card-s16' }, [
    h('div', { class: 'run-head' }, [...head, challengeList]),
    h('div', { class: 'run-side' }, [
      day,
      h('ul', { class: 'run-earned', attrs: { 'aria-label': 'Earned' } }, earned),
      h('div', { class: 'run-buttons' }, [again, button('Back to town', o.home, 'primary')]),
    ]),
  ]);
  return { el, step };
}
