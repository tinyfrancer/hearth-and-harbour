/*
 * The harbour chart on screen: lane B's map filling the panel, each landing
 * on it with its marker (and its emblem), a button over each (48 px at the
 * least), and under the map the landing picked: its name and line, the level
 * it is meant for against the character's, its clears and best time, what to
 * bring, and "Row out". A dotted route lays itself out from home to the
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
  chartRoute,
  harbourChart,
  type ChartPiece,
} from './fromLaneB';
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
  sheet.style.transform = `translateX(${-shift}px)`;
  const mapBox = h('div', { class: 'chart-map' }, [sheet]);
  mapBox.style.width = `${boxW}px`;
  mapBox.style.height = `${cssH}px`;

  const detail = h('div', { class: 'chart-detail', attrs: { 'aria-live': 'polite' } });

  const closeButton = h('button', {
    class: 'chart-close',
    text: '×',
    attrs: { type: 'button', 'aria-label': 'Close the chart' },
    on: { click: () => o.close() },
  });
  const say = o.say
    ? h('p', { class: 'chart-say' }, [
        h('span', { class: 'chart-who', text: `${o.say.who}: ` }),
        o.say.line,
      ])
    : null;
  const el = h(
    'section',
    { class: 'chart', attrs: { role: 'dialog', 'aria-label': 'The harbour chart' } },
    [
      h('div', { class: 'chart-sheet' }, [
        h('header', { class: 'chart-head' }, [h('h2', { text: 'The harbour chart' }), closeButton]),
        say,
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

  const showDetail = (): void => {
    const state = o.state();
    const l = list.find((x) => x.id === chosen);
    if (!l) {
      detail.replaceChildren(
        h('p', { class: 'muted', text: 'Tap a landing to see what is there.' }),
      );
      return;
    }
    const level = combatLevel(state);
    const warn = levelWarning(state, l);
    const record =
      l.state === 'soon'
        ? null
        : l.clears > 0
          ? `Cleared ${l.clears === 1 ? 'once' : `${l.clears} times`}${l.bestMs !== undefined ? ` · best ${runTime(l.bestMs)}` : ''}`
          : 'Not yet cleared';
    const go = l.rowable ? button('Row out', () => o.rowOut(l.id), 'primary') : null;
    if (go) go.classList.add('chart-row');
    const parts: (HTMLElement | null)[] = [
      h('h3', { text: l.name ?? 'Uncharted waters' }),
      h('p', {
        class: 'chart-state',
        attrs: { 'data-state': l.state },
        text: STATE_WORDS[l.state],
      }),
      l.description ? h('p', { class: 'muted', text: l.description }) : null,
      l.state === 'soon' || l.state === 'locked'
        ? h('p', { class: 'chart-unlock', text: l.unlock })
        : null,
      l.state === 'soon'
        ? null
        : h('p', {
            class: 'chart-level',
            text: `Meant for combat level ${l.recommended}. You are ${level}.`,
          }),
      warn ? h('p', { class: 'chart-warn', text: warn }) : null,
      record ? h('p', { class: 'chart-record', text: record }) : null,
      l.state === 'open' || l.state === 'cleared'
        ? h('p', { class: 'chart-bring', text: whatToBring(state, l) })
        : null,
      go,
    ];
    detail.replaceChildren(...parts.filter((p): p is HTMLElement => p !== null));
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
    drawn = -1;
    drawMarks(0);
    const l = list.find((x) => x.id === id);
    if (l?.rowable) o.picked?.(id);
  }

  let ctx: CanvasRenderingContext2D | null | undefined;
  /** How much of the route was last drawn: drawn again only when it moves. */
  let drawn = -1;
  const lay = (c: CanvasRenderingContext2D, p: ChartPiece | null, at: Point): void => {
    if (p) c.drawImage(p.canvas, Math.round(at.x - p.anchor.x), Math.round(at.y - p.anchor.y));
  };
  const drawMarks = (shown: number): void => {
    const l = list.find((x) => x.id === chosen);
    const dots = l ? routeShort(chartRoute(map.home, l.at), l.at) : [];
    const n = Math.round(dots.length * shown);
    if (n === drawn) return;
    drawn = n;
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
      if (now === undefined) {
        drawMarks(1);
        return;
      }
      pickedAt ??= now;
      drawMarks(routeShown(now - pickedAt));
    },
    picked: () => chosen,
    pick,
  };
}
