/*
 * The harbour chart on screen: lane B's map filling the panel, each landing
 * on it as a button (48 px at the least), and under it the landing picked:
 * its name and line, the level it is meant for against the character's, its
 * clears and best time, what to bring, and "Row out". A dotted route draws
 * itself from home out to the landing picked, the rowboat at its head, timed
 * by the time passed in. Plain DOM over the town; no browser dialogs.
 */
import { combatLevel } from '../core/bounty';
import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import { button, h } from '../ui/dom';
import {
  firstPick,
  landings,
  levelWarning,
  routeShown,
  routeTo,
  whatToBring,
  type Landing,
} from './chart';
import { runTime } from './dungeon';
import { chartBoat, chartEmblem, chartMarker, harbourChart } from './fromLaneB';

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
/** The room kept round the map inside the panel, in CSS pixels. */
const SIDE_ROOM = 16;

/** CSS pixels per map pixel: as large as fits, landing on whole device pixels. */
export function chartScale(mapWidth: number, room: number, dpr: number): number {
  const device = Math.max(1, Math.floor((room * dpr) / mapWidth));
  return device / dpr;
}

const STATE_WORDS: Readonly<Record<Landing['state'], string>> = {
  open: 'Open',
  cleared: 'Cleared',
  locked: 'Locked',
  soon: 'Not yet charted',
};

export function chartPanel(o: ChartPanelOptions): ChartPanel {
  const map = harbourChart();
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const width = typeof innerWidth === 'number' && innerWidth > 0 ? Math.min(innerWidth, 480) : 390;
  const k = chartScale(map.width, width - 2 * SIDE_ROOM, dpr);
  const cssW = Math.round(map.width * k);
  const cssH = Math.round(map.height * k);

  let list = landings(o.state(), o.content, map);
  let chosen = firstPick(list);
  /** When the landing was picked, on the app's clock; null until the first frame says. */
  let pickedAt: number | null = null;
  let lastNow: number | undefined;

  const paper = map.canvas ?? h('div', { class: 'chart-paper-plain' });
  paper.classList.add('chart-paper');
  paper.setAttribute('aria-hidden', 'true');
  paper.style.width = `${cssW}px`;
  paper.style.height = `${cssH}px`;
  const route = h('canvas', { class: 'chart-route', attrs: { 'aria-hidden': 'true' } });
  route.width = Math.round(cssW * dpr);
  route.height = Math.round(cssH * dpr);
  route.style.width = `${cssW}px`;
  route.style.height = `${cssH}px`;

  const pins = h('div', { class: 'chart-pins' });
  const mapBox = h('div', { class: 'chart-map' }, [paper, route, pins]);
  mapBox.style.width = `${cssW}px`;
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

  const pinFor = (l: Landing): HTMLElement => {
    const art = chartEmblem(l.id) ?? chartMarker(l.state);
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
      [
        art ?? h('span', { class: 'chart-pin', attrs: { 'aria-hidden': 'true' } }),
        h('span', { class: 'chart-pin-name', text: l.name ?? '?' }),
      ],
    );
    b.style.left = `${Math.round(l.at.x * k - LANDING_CSS / 2)}px`;
    b.style.top = `${Math.round(l.at.y * k - LANDING_CSS / 2)}px`;
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
    drawRoute(0);
    const l = list.find((x) => x.id === id);
    if (l?.rowable) o.picked?.(id);
  }

  let routeCtx: CanvasRenderingContext2D | null | undefined;
  /** What the route last drew: drawn again only when it moves. */
  let drawnAt = -1;
  const drawRoute = (shown: number): void => {
    const step = Math.round(shown * 100) / 100;
    if (step === drawnAt) return;
    drawnAt = step;
    if (routeCtx === undefined) {
      try {
        routeCtx = route.getContext('2d');
      } catch {
        routeCtx = null;
      }
    }
    const ctx = routeCtx;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, route.width, route.height);
    const l = list.find((x) => x.id === chosen);
    if (!l) return;
    const s = k * dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    const points = routeTo(map.home, l.at);
    const last = Math.max(1, Math.floor((points.length - 1) * shown));
    // Dots every other step: a dotted line drawing itself out.
    ctx.fillStyle = '#7a3e2c';
    for (let i = 0; i <= last; i += 2) {
      const p = points[i]!;
      ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
    }
    const head = points[last]!;
    const boat = chartBoat();
    if (boat)
      ctx.drawImage(boat, Math.round(head.x - boat.width / 2), Math.round(head.y - boat.height));
    else {
      // A plain boat: a hull and a sail.
      ctx.fillStyle = '#5e3a2c';
      ctx.fillRect(Math.round(head.x) - 4, Math.round(head.y) - 2, 9, 3);
      ctx.fillStyle = '#fbf4e4';
      ctx.fillRect(Math.round(head.x), Math.round(head.y) - 8, 1, 6);
      ctx.fillRect(Math.round(head.x) + 1, Math.round(head.y) - 7, 3, 4);
    }
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
      }
      if (now === undefined) {
        drawRoute(1);
        return;
      }
      pickedAt ??= now;
      drawRoute(routeShown(now - pickedAt));
    },
    picked: () => chosen,
    pick,
  };
}
