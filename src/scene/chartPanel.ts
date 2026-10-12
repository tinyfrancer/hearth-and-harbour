/*
 * The harbour chart on screen: lane B's map, each landing on it with its
 * marker (and its emblem), a button over each (48 px at the least), and
 * under the map the landing picked. Wave 18: everything a player decides by
 * is in view on a phone without scrolling (390 x 844, and 360 x 740): the
 * map, cropped from above and below (never shrunk) round the landing picked;
 * the dungeon's seal, name and state; today's modifier with its icon and
 * what it does; its challenges as a row of medals (tap one for its words);
 * the level it is meant for; and Row out / Send him in. The rest (its line,
 * clears and best time, what to bring) scrolls in a box of its own with a
 * cue while there is more. A dotted route lays itself out from home to the
 * landing picked, the rowboat at its head, timed by the time passed in.
 * Everything on the map is drawn on one canvas at whole device pixels over
 * the map's own; the buttons are only where a thumb lands. Plain DOM over
 * the town; no browser dialogs.
 */
import { combatLevel } from '../core/bounty';
import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import { button, h } from '../ui/dom';
import { firstPick, landings, levelWarning, routeShown, whatToBring, type Landing } from './chart';
import { runTime } from './dungeon';
import {
  chartBoat,
  chartDot,
  chartEmblem,
  chartMarker,
  chartPennant,
  chartRoute,
  chartSeal,
  challengeMedal,
  CHALLENGE_MEDAL_FRAME_MS,
  CHALLENGE_MEDAL_FRAMES,
  harbourChart,
  modifierIcon,
  PENNANT_FRAME_MS,
  type ChartPiece,
} from './fromLaneB';
import {
  challengeDone,
  challengesOf,
  effectWords,
  idleRunOf,
  mayIdle,
  modifierDef,
} from './fromLaneA';
import type { Point } from './tileMap';

export interface ChartPanelOptions {
  readonly content: Content;
  /** The character as of now: the chart is read from it each time it is built or picked from. */
  readonly state: () => GameState;
  /** Someone's word as the chart opens (the ferryman's), with who says it; none from the boat. */
  readonly say?: { readonly who: string; readonly line: string } | null;
  /** Rows out to a dungeon by id. */
  rowOut(id: string): void;
  close(): void;
  /** A landing was picked: its first room can be painted ahead. */
  picked?(id: string): void;
  /** Today's modifier on a dungeon (a modifier id), or null: the shell's, by its clock (S16). */
  today?(id: string): string | null;
  /**
   * Sends the hero through a cleared dungeon unattended (lane A's idle run);
   * left out, the chart offers no such button.
   */
  sendIn?(id: string): void;
}

export interface ChartPanel {
  readonly el: HTMLElement;
  /** Moves the route along; `now` is the app's clock (left out, the route shows whole). */
  update(state: GameState, now?: number): void;
  /** The landing picked. */
  picked(): string | null;
  pick(id: string): void;
}

/** The smallest a landing's button is, in CSS pixels: a thumb's width. */
export const LANDING_CSS = 48;
/** The room the chart's sheet takes round the map, in CSS pixels, each side. */
const SIDE_ROOM = 20;

/**
 * CSS pixels per map pixel: as large as fits, landing on whole device
 * pixels, and never under one device pixel's worth of the phone's own scale
 * (a narrow phone shows the map cropped at its sides rather than tiny).
 */
export function chartScale(mapWidth: number, room: number, dpr: number): number {
  const device = Math.max(1, Math.floor((room * dpr) / mapWidth), Math.floor(dpr));
  return device / dpr;
}

/**
 * How far the map is slid left inside a box `box` CSS pixels wide when it is
 * wider (`width`): so the landings and home are in the middle, as far as the
 * map's edges allow. 0 when it fits.
 */
export function chartShift(width: number, box: number, xs: readonly number[]): number {
  if (width <= box || xs.length === 0) return 0;
  const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
  return Math.round(Math.max(0, Math.min(width - box, middle - box / 2)));
}

const STATE_WORDS: Readonly<Record<Landing['state'], string>> = {
  open: 'Open',
  cleared: 'Cleared',
  locked: 'Locked',
  soon: 'Not yet charted',
};

/** How far short of a landing the route and its boat stop, in map pixels: clear of its marker. */
export const ROUTE_SHORT = 12;

/** A route's dots less those within `ROUTE_SHORT` of the landing, so nothing is laid over its marker. */
export function routeShort(dots: readonly Point[], to: Point): Point[] {
  const kept = dots.filter((p) => Math.hypot(p.x - to.x, p.y - to.y) >= ROUTE_SHORT);
  return kept.length ? kept : dots.slice(0, 1);
}

/**
 * How far the map is slid up inside a box `box` CSS pixels tall when it is
 * taller (`height`): the landing picked (at `y`) in the middle, as far as
 * the map's edges allow. 0 when it fits. The map is cropped, never shrunk.
 */
export function chartShiftY(height: number, box: number, y: number): number {
  if (!(box > 0) || height <= box) return 0;
  return Math.round(Math.max(0, Math.min(height - box, y - box / 2)));
}

/**
 * The challenges each dungeon had done when this page first showed the
 * chart, and every medal shown since: one done after that is new to the
 * chart, and its medal glints once (lane B's `'new'` frames) the next time
 * it is shown. This page's only: a reload starts from what is done.
 */
let medalsSeen: Set<string> | null = null;

/** Forgets the medals seen (a new page, or a test). */
export function forgetMedalsSeen(): void {
  medalsSeen = null;
}

/** The chart's pieces at whole device pixels, about one CSS pixel an art pixel. */
function pieceCanvas(piece: ChartPiece | null, dpr: number): HTMLCanvasElement | null {
  if (!piece) return null;
  const k = Math.max(1, Math.round(dpr));
  const c = document.createElement('canvas');
  c.width = piece.canvas.width * k;
  c.height = piece.canvas.height * k;
  c.style.width = `${(piece.canvas.width * k) / dpr}px`;
  c.style.height = `${(piece.canvas.height * k) / dpr}px`;
  c.setAttribute('aria-hidden', 'true');
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(piece.canvas, 0, 0, c.width, c.height);
  return c;
}

/** The level line beside the medals, short: what it is meant for, and the character's. */
export function levelWords(recommended: number, level: number): string {
  return `Level ${recommended} · you ${level}`;
}

export function chartPanel(o: ChartPanelOptions): ChartPanel {
  const map = harbourChart();
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const width = typeof innerWidth === 'number' && innerWidth > 0 ? Math.min(innerWidth, 480) : 390;
  const room = width - 2 * SIDE_ROOM;
  const k = chartScale(map.width, room, dpr);
  const cssW = Math.round(map.width * k);
  const cssH = Math.round(map.height * k);
  const boxW = Math.min(cssW, room);

  let list = landings(o.state(), o.content, map);
  let chosen = firstPick(list);
  /** When the landing was picked, on the app's clock; null until the first frame says. */
  let pickedAt: number | null = null;
  let lastNow: number | undefined;

  const seen = (medalsSeen ??= new Set(
    Object.entries(o.state().dungeons).flatMap(([id, r]) =>
      (r.challenges ?? []).map((c) => `${id} ${c}`),
    ),
  ));

  const shift = chartShift(
    cssW,
    boxW,
    [...list.map((l) => l.at.x), map.home.x].map((x) => x * k),
  );

  const paper = map.canvas ?? h('div', { class: 'chart-paper-plain' });
  paper.classList.add('chart-paper');
  paper.setAttribute('aria-hidden', 'true');
  paper.style.width = `${cssW}px`;
  paper.style.height = `${cssH}px`;
  const marks = h('canvas', { class: 'chart-route', attrs: { 'aria-hidden': 'true' } });
  marks.width = Math.round(cssW * dpr);
  marks.height = Math.round(cssH * dpr);
  marks.style.width = `${cssW}px`;
  marks.style.height = `${cssH}px`;

  const pins = h('div', { class: 'chart-pins' });
  const sheet = h('div', { class: 'chart-slide' }, [paper, marks, pins]);
  sheet.style.width = `${cssW}px`;
  sheet.style.height = `${cssH}px`;
  // Someone's word as the chart opens, over the top of the map (the land, not the sea).
  const say = o.say
    ? h('p', { class: 'chart-say' }, [
        h('span', { class: 'chart-who', text: `${o.say.who}: ` }),
        o.say.line,
      ])
    : null;
  const mapBox = h('div', { class: 'chart-map' }, [sheet, say]);
  mapBox.style.width = `${boxW}px`;
  // As tall as the map at the most; shorter (cropped) where the phone is short.
  mapBox.style.height = `${cssH}px`;
  /** The map's box as last laid out, and how far the map is slid up in it. */
  let boxH = -1;
  const slide = (): void => {
    const shown = mapBox.clientHeight;
    const l = list.find((x) => x.id === chosen);
    const up = chartShiftY(cssH, shown, (l ? l.at.y - 8 : map.home.y) * k);
    const value = `translate(${-shift}px, ${-up}px)`;
    if (sheet.style.transform !== value) sheet.style.transform = value;
    boxH = shown;
  };
  slide();

  const detail = h('div', { class: 'chart-detail', attrs: { 'aria-live': 'polite' } });

  const closeButton = h('button', {
    class: 'chart-close',
    text: '×',
    attrs: { type: 'button', 'aria-label': 'Close the chart' },
    on: { click: () => o.close() },
  });
  const el = h(
    'section',
    { class: 'chart', attrs: { role: 'dialog', 'aria-label': 'The harbour chart' } },
    [
      h('div', { class: 'chart-sheet' }, [
        h('header', { class: 'chart-head' }, [h('h2', { text: 'The harbour chart' }), closeButton]),
        mapBox,
        detail,
      ]),
    ],
  );

  /** A landing's button: where a thumb picks it, with its name under it. The marker is drawn. */
  const pinFor = (l: Landing): HTMLElement => {
    const b = h(
      'button',
      {
        class: 'chart-landing',
        attrs: {
          type: 'button',
          'data-id': l.id,
          'data-state': l.state,
          'aria-label': `${l.name ?? 'Uncharted'}: ${STATE_WORDS[l.state]}`,
          'aria-pressed': String(l.id === chosen),
        },
        on: { click: () => pick(l.id) },
      },
      [h('span', { class: 'chart-pin-name', text: l.name ?? '?' })],
    );
    // Its middle a little above the landing: over the marker standing on it.
    b.style.left = `${Math.round(l.at.x * k - LANDING_CSS / 2)}px`;
    b.style.top = `${Math.round((l.at.y - 8) * k - LANDING_CSS / 2)}px`;
    return b;
  };

  /** The medals glinting as new, and when on the app's clock they began; null until a frame says. */
  let glinting: { slot: HTMLElement; frame: number }[] = [];
  let glintFrom: number | null = null;
  /** The details' box, and whether there is more in it below what shows (its cue). */
  let more: HTMLElement | null = null;
  const moreCue = h('span', {
    class: 'chart-more-cue',
    text: 'More ▾',
    attrs: { 'aria-hidden': 'true' },
  });
  const cue = (): void => {
    if (!more) return;
    const left = more.scrollHeight - more.clientHeight - more.scrollTop;
    const value = String(left > 2);
    if (more.dataset.more !== value) {
      more.dataset.more = value;
      moreCue.hidden = value !== 'true';
    }
  };

  const showDetail = (): void => {
    const state = o.state();
    const l = list.find((x) => x.id === chosen);
    glinting = [];
    glintFrom = null;
    if (!l) {
      more = null;
      detail.replaceChildren(
        h('p', { class: 'muted', text: 'Tap a landing to see what is there.' }),
      );
      return;
    }
    const level = combatLevel(state);
    const warn = levelWarning(state, l);
    const open = l.state === 'open' || l.state === 'cleared';
    const record =
      l.state === 'soon'
        ? null
        : l.clears > 0
          ? `Cleared ${l.clears === 1 ? 'once' : `${l.clears} times`}${l.bestMs !== undefined ? ` · best ${runTime(l.bestMs)}` : ''}`
          : 'Not yet cleared';
    const challenges = open ? challengesOf(o.content, l.id) : [];
    const doneOf = (id: string): boolean => challengeDone(state, l.id, id);
    const all = challenges.length > 0 && challenges.every((c) => doneOf(c.id));

    // The name, with the dungeon's seal once it is cleared (gold with every challenge done).
    const seal =
      l.state === 'cleared'
        ? pieceCanvas(chartSeal(l.id, all ? 'all-challenges' : 'cleared'), dpr)
        : null;
    if (seal) seal.classList.add('chart-seal');
    const name = h('div', { class: 'chart-name' }, [
      seal,
      h('h3', { text: l.name ?? 'Uncharted waters' }),
      h('p', {
        class: 'chart-state',
        attrs: { 'data-state': l.state },
        text: STATE_WORDS[l.state],
      }),
    ]);

    // S16: the day's modifier, its icon and what it does, plainly.
    const todayId = open ? (o.today?.(l.id) ?? null) : null;
    const today = todayId ? modifierDef(o.content, todayId) : undefined;
    const day = today
      ? h('div', { class: 'chart-day', attrs: { 'data-modifier': today.id } }, [
          h('span', { class: 'chart-day-icon' }, [modifierIcon(today.id)]),
          h('span', { class: 'chart-day-body' }, [
            h('span', { class: 'chart-day-name', text: `Today: ${today.name}` }),
            h('span', {
              class: 'chart-day-words',
              text: effectWords(today.effects).join('. ') + '.',
            }),
          ]),
        ])
      : null;

    // The challenges as a row of medals: tap one for its words, in a line over the row.
    const said = h('p', { class: 'chart-said', attrs: { role: 'status' } });
    said.hidden = true;
    let saying: string | null = null;
    const medals = challenges.map((c) => {
      const done = doneOf(c.id);
      const fresh = done && !seen.has(`${l.id} ${c.id}`);
      const slot = h('span', { class: 'chart-goal-medal' }, [
        challengeMedal(done ? (fresh ? 'new' : 'done') : 'todo', 0),
      ]);
      if (fresh) glinting.push({ slot, frame: 0 });
      const words = `${c.name}: ${c.text}${done ? ' Done.' : ''}`;
      const b = h(
        'button',
        {
          class: 'chart-medal',
          attrs: {
            type: 'button',
            'data-id': c.id,
            'aria-label': words,
            'aria-expanded': 'false',
          },
          on: {
            click: () => {
              saying = saying === c.id ? null : c.id;
              said.hidden = saying === null;
              said.textContent = saying ? words : '';
              said.dataset.done = String(done);
              for (const m of goals?.querySelectorAll<HTMLElement>('.chart-medal') ?? [])
                m.setAttribute('aria-expanded', String(m.dataset.id === saying));
            },
          },
        },
        [slot],
      );
      return h('li', { attrs: { 'data-done': String(done), 'data-new': String(fresh) } }, [b]);
    });
    const goals = medals.length
      ? h('ul', { class: 'chart-goals', attrs: { 'aria-label': 'Challenges' } }, medals)
      : null;
    // Shown as new once: from now on these are seen.
    for (const c of challenges) if (doneOf(c.id)) seen.add(`${l.id} ${c.id}`);
    const levelLine =
      l.state === 'soon'
        ? null
        : h('p', {
            class: warn ? 'chart-level chart-level-warn' : 'chart-level',
            attrs: { 'aria-label': `Meant for combat level ${l.recommended}. You are ${level}.` },
            text: levelWords(l.recommended, level),
          });
    const row =
      goals || levelLine ? h('div', { class: 'chart-goal-row' }, [goals, levelLine]) : null;

    // The rest scrolls in a box of its own, with a cue while there is more below.
    const away = idleRunOf(state);
    const details: (HTMLElement | null)[] = [
      l.state === 'soon' || l.state === 'locked'
        ? h('p', { class: 'chart-unlock', text: l.unlock })
        : null,
      warn ? h('p', { class: 'chart-warn', text: warn }) : null,
      l.description ? h('p', { class: 'muted', text: l.description }) : null,
      record ? h('p', { class: 'chart-record', text: record }) : null,
      open ? h('p', { class: 'chart-bring', text: whatToBring(state, l) }) : null,
      o.sendIn && away === l.id
        ? h('p', { class: 'chart-away', text: 'He is away there now, running it on his own.' })
        : null,
    ];
    more = h(
      'div',
      { class: 'chart-more', attrs: { tabindex: '0', 'aria-label': 'More about it' } },
      details.filter((p): p is HTMLElement => p !== null),
    );
    more.addEventListener('scroll', cue, { passive: true });
    moreCue.hidden = true;

    const go = l.rowable ? button('Row out', () => o.rowOut(l.id), 'primary') : null;
    if (go) go.classList.add('chart-row');
    const send =
      o.sendIn && mayIdle(state, l.id, o.content) && away !== l.id
        ? button('Send him in', () => o.sendIn!(l.id))
        : null;
    if (send) send.classList.add('chart-send');
    const buttons = go || send ? h('div', { class: 'chart-go' }, [send, go]) : null;

    const parts: (HTMLElement | null)[] = [
      name,
      day,
      row,
      said,
      h('div', { class: 'chart-more-box' }, [more, moreCue]),
      buttons,
    ];
    detail.replaceChildren(...parts.filter((p): p is HTMLElement => p !== null));
    cue();
  };

  const showPins = (): void => {
    pins.replaceChildren(...list.map(pinFor));
  };

  function pick(id: string): void {
    if (!list.some((l) => l.id === id)) return;
    chosen = id;
    pickedAt = lastNow ?? null;
    for (const b of pins.querySelectorAll<HTMLElement>('.chart-landing'))
      b.setAttribute('aria-pressed', String(b.dataset.id === id));
    showDetail();
    slide();
    drawn = -1;
    drawMarks(0);
    const l = list.find((x) => x.id === id);
    if (l?.rowable) o.picked?.(id);
  }

  let ctx: CanvasRenderingContext2D | null | undefined;
  /** The landings with a modifier today, and the pennants' frame as drawn and as due. */
  const pennants = new Set(
    list
      .filter((l) => (l.state === 'open' || l.state === 'cleared') && o.today?.(l.id))
      .map((l) => l.id),
  );
  let pennantFrame = 0;
  let pennantDrawn = 0;
  /** How much of the route was last drawn: drawn again only when it moves. */
  let drawn = -1;
  const lay = (c: CanvasRenderingContext2D, p: ChartPiece | null, at: Point): void => {
    if (p) c.drawImage(p.canvas, Math.round(at.x - p.anchor.x), Math.round(at.y - p.anchor.y));
  };
  const drawMarks = (shown: number): void => {
    const l = list.find((x) => x.id === chosen);
    const dots = l ? routeShort(chartRoute(map.home, l.at), l.at) : [];
    const n = Math.round(dots.length * shown);
    if (n === drawn && pennantFrame === pennantDrawn) return;
    drawn = n;
    pennantDrawn = pennantFrame;
    if (ctx === undefined) {
      try {
        ctx = marks.getContext('2d');
      } catch {
        ctx = null;
      }
    }
    const c = ctx;
    if (!c) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, marks.width, marks.height);
    const s = k * dpr;
    c.setTransform(s, 0, 0, s, 0, 0);
    c.imageSmoothingEnabled = false;
    const dot = chartDot();
    for (const p of dots.slice(0, n)) lay(c, dot, p);
    // The boat at the route's head, rowing towards the landing, and stopping short of it:
    // under the markers, so it never covers a landing's pole or the ring.
    if (l && dots.length) {
      const head = dots[Math.min(n, dots.length - 1)]!;
      lay(c, chartBoat(l.at.x < map.home.x ? 'left' : 'right'), head);
    }
    // Each landing's marker standing on it, its emblem beside it; the picked one ringed.
    for (const x of list) {
      // A pennant beside a landing that has a modifier today (lane B's, B17a).
      if (pennants.has(x.id)) lay(c, chartPennant(pennantFrame), { x: x.at.x - 8, y: x.at.y });
      lay(c, chartMarker(x.state), x.at);
      const emblem = x.state === 'soon' ? null : chartEmblem(x.id, x.state === 'locked');
      lay(c, emblem, { x: x.at.x + 16, y: x.at.y - 6 });
    }
    if (l) lay(c, chartMarker('selected'), { x: l.at.x, y: l.at.y - 6 });
  };

  showPins();
  showDetail();
  if (chosen) {
    const l = list.find((x) => x.id === chosen);
    if (l?.rowable) o.picked?.(chosen);
  }

  return {
    el,
    update(state, now) {
      lastNow = now;
      const next = landings(state, o.content, map);
      if (JSON.stringify(next) !== JSON.stringify(list)) {
        list = next;
        showPins();
        showDetail();
        drawn = -1;
      }
      // Laid out anew (the phone turned, the sheet shown): the map's crop round the landing.
      if (mapBox.clientHeight !== boxH) slide();
      cue();
      if (now === undefined) {
        drawMarks(1);
        return;
      }
      pickedAt ??= now;
      if (pennants.size) pennantFrame = Math.floor(now / PENNANT_FRAME_MS);
      // A medal new to the chart glints once, by the app's clock.
      if (glinting.length) {
        glintFrom ??= now;
        const f = Math.min(
          CHALLENGE_MEDAL_FRAMES - 1,
          Math.floor((now - glintFrom) / CHALLENGE_MEDAL_FRAME_MS),
        );
        for (const g of glinting)
          if (g.frame !== f) {
            g.frame = f;
            g.slot.replaceChildren(challengeMedal('new', f));
          }
      }
      drawMarks(routeShown(now - pickedAt));
    },
    picked: () => chosen,
    pick,
  };
}
