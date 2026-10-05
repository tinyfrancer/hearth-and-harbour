/*
 * A dungeon run on screen: the room on the stage with whatever fights in it,
 * the hero's health and his target's at the top, the ability and food
 * buttons under the left thumb, the prompt to turn the phone on its side, the
 * way out, the dark of going through a door, and the results at the end. The
 * rules are in `dungeon.ts` and `battle.ts`; this only shows them and passes
 * on time, taps and presses. Where the run is lives with the Town tab
 * (`townView.ts`), so a rebuilt tab finds it as it was.
 */
import { DAY } from '../art/palette';
import { pixelCanvas } from '../art/canvas';
import { itemIcon, skillIcon } from '../art/icons';
import { portrait } from '../art/portraits';
import { PLAYER_ATTACK_MS } from '../core/combat';
import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import { button, h } from '../ui/dom';
import type { View } from '../ui/view';
import {
  ABILITIES,
  FOOD_MS,
  abilityProblem,
  alive,
  arrowsLeft,
  cooldownLeft,
  eat,
  foeAt,
  foodLeft,
  foodProblem,
  stopChasing,
  targetFoe,
  useAbility,
  type Battle,
  type Tally,
} from './battle';
import {
  advanceRun,
  doorwayDark,
  placeOf,
  roomScene,
  runLocked,
  runTime,
  sideways,
  type Dungeon,
  type Run,
} from './dungeon';
import { fightExtra } from './fightArt';
import { abilityPicture } from './foes';
import type { Hero } from './hero';
import type { Play } from './play';
import { dungeonScale } from './scale';
import { stage, type Insets } from './stage';
import { HERO_FEET } from './townArt';

/**
 * Room kept at the screen's edges, in CSS pixels: the health bars and the
 * Leave button at the top, the notches at the sides of a phone on its side,
 * and the ability bar at the bottom. The camera keeps the hero clear of all
 * of it.
 */
export const DUNGEON_INSETS: Insets = { top: 64, right: 56, bottom: 80, left: 56 };

export interface DungeonViewOptions {
  readonly dungeon: Dungeon;
  readonly content: Content;
  /** The run as it stands, and a way to keep it when it changes. */
  readonly run: () => Run;
  readonly keep: (run: Run) => void;
  readonly hero: Hero;
  /** The player chose to go back to town: from Leave (once confirmed) or the results. */
  readonly leave: () => void;
  /** The run has just ended by itself: the last room cleared, or the hero down. */
  readonly finished: () => void;
}

/** Whole seconds left on a cooldown, as the button shows it. */
export function secondsLeft(ms: number): string {
  return ms > 0 ? String(Math.ceil(ms / 1000)) : '';
}

/** How full a bar is, in hundredths: a bar moves only when this does. */
const fraction = (part: number, whole: number): number =>
  Math.round((100 * Math.max(0, Math.min(part, whole))) / Math.max(1, whole)) / 100;

/** Sets text only when it changes, so a frame does not touch the page for nothing. */
function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/**
 * Fills a bar (across) or a shade (upwards) by a transform rather than its
 * size, so a bar moving every frame costs no layout, only the compositor.
 */
function fill(el: HTMLElement, axis: 'X' | 'Y', k: number): void {
  const value = `scale${axis}(${k})`;
  if (el.style.transform !== value) el.style.transform = value;
}

/** A picture for a button, two CSS pixels to the art pixel. */
function buttonPicture(id: string): HTMLCanvasElement | null {
  const pic = abilityPicture(id);
  if (!pic) return null;
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const canvas = pixelCanvas(pic, { palette: DAY, scale: Math.round(2 * dpr), dpr });
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

/** One of the buttons under the thumb: a picture, a name, and a shade that drains as it cools. */
interface FightButton {
  readonly el: HTMLButtonElement;
  readonly shade: HTMLElement;
  readonly count: HTMLElement;
}

function fightButton(
  name: string,
  picture: Element | null,
  extraClass: string,
  act: () => void,
): FightButton {
  const shade = h('span', { class: 'fight-shade', attrs: { 'aria-hidden': 'true' } });
  const count = h('span', { class: 'fight-count' });
  const el = h(
    'button',
    { class: `fight-button ${extraClass}`.trim(), attrs: { type: 'button', 'aria-label': name } },
    [picture, h('span', { class: 'fight-name', text: name }), shade, count],
  );
  // Pressed means used: on the press, not the lift, as a fight needs.
  el.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    act();
  });
  el.addEventListener('click', (event) => {
    // A keyboard's press (no pointer) arrives only as a click.
    if (event.detail === 0) act();
  });
  return { el, shade, count };
}

/** One line of results: an icon if there is one, a name, and an amount. */
function resultLine(icon: Element | null, name: string, amount: string): HTMLElement {
  return h('li', {}, [
    h('span', { class: 'run-icon' }, [icon]),
    h('span', { class: 'run-what', text: name }),
    h('span', { class: 'run-amount', text: amount }),
  ]);
}

export function dungeonView(options: DungeonViewOptions): View {
  const { dungeon, hero, content } = options;
  const room = h('div', { class: 'dungeon-room' });
  const fade = h('div', { class: 'dungeon-fade', attrs: { 'aria-hidden': 'true' } });

  const promptLine = h('p');
  const prompt = h(
    'section',
    { class: 'dungeon-prompt', attrs: { 'aria-label': 'Turn your phone on its side' } },
    [
      h('div', { class: 'dungeon-phone', attrs: { 'aria-hidden': 'true' } }),
      h('h2', { text: 'Turn your phone on its side' }),
      promptLine,
    ],
  );

  const confirm = h('div', { class: 'dungeon-confirm', attrs: { role: 'group' } });
  const leaveButton = h('button', {
    class: 'btn dungeon-leave',
    text: 'Leave',
    attrs: { type: 'button' },
    on: {
      click: () => {
        // Asks once more: a stray thumb should not end a run.
        if (confirm.childElementCount > 0) return;
        leaveButton.hidden = true;
        confirm.replaceChildren(
          h('p', { text: 'Row back to town? You keep what you’ve picked up.' }),
          h('div', { class: 'row' }, [
            button('Row back', () => options.leave(), 'primary'),
            button('Stay', () => {
              confirm.replaceChildren();
              leaveButton.hidden = false;
            }),
          ]),
        );
      },
    },
  });
  const way = h('div', { class: 'dungeon-way' }, [leaveButton, confirm]);

  /* ----- Health at the top: the hero's on the left, his target's in the middle ----- */

  const heroFill = h('span', { class: 'fight-fill' });
  const heroNumbers = h('span', { class: 'fight-numbers' });
  const heroSwing = h('span', { class: 'fight-swing-fill' });
  const heroPanel = h('div', { class: 'fight-hero', attrs: { 'aria-label': 'Your health' } }, [
    h('span', { class: 'fight-heart', attrs: { 'aria-hidden': 'true' } }),
    h('span', { class: 'fight-track' }, [heroFill, heroNumbers]),
    h('span', { class: 'fight-swing', attrs: { 'aria-hidden': 'true' } }, [heroSwing]),
  ]);

  const targetFace = h('span', { class: 'fight-face' });
  const targetName = h('span', { class: 'fight-target-name' });
  const targetFill = h('span', { class: 'fight-fill' });
  const targetNumbers = h('span', { class: 'fight-numbers' });
  const targetPanel = h('div', { class: 'fight-target', attrs: { 'aria-label': 'Your target' } }, [
    targetFace,
    h('span', { class: 'fight-target-body' }, [
      targetName,
      h('span', { class: 'fight-track' }, [targetFill, targetNumbers]),
    ]),
  ]);
  targetPanel.hidden = true;
  let targetShown: string | null = null;

  /* ----- The buttons under the left thumb ----- */

  const battleOf = (): Battle | null => options.run().battle;
  const style = battleOf()?.fighter.style ?? 'melee';
  const abilities = ABILITIES[style];

  const press = (slot: 0 | 1): void => {
    const run = options.run();
    if (!run.battle || run.finished || run.doorway) return;
    const used = useAbility(run.battle, placeOf(dungeon, run), run.play, slot);
    if (used.battle === run.battle) return;
    options.keep({ ...run, battle: used.battle, play: used.play });
  };
  const eatOne = (): void => {
    const run = options.run();
    if (!run.battle || run.finished || run.doorway) return;
    const fed = eat(run.battle, run.play.walker.at);
    if (fed !== run.battle) options.keep({ ...run, battle: fed });
  };

  const abilityButtons = abilities.map((a, i) =>
    fightButton(a.name, buttonPicture(a.id), '', () => press(i as 0 | 1)),
  );
  const food = battleOf()?.fighter.food ?? null;
  const foodButton = food ? fightButton('Eat', itemIcon(food.item), 'fight-food', eatOne) : null;
  const bar = h('div', { class: 'fight-bar' }, [
    ...abilityButtons.map((b) => b.el),
    foodButton?.el ?? null,
  ]);
  const hud = h('div', { class: 'fight-hud' }, [heroPanel, targetPanel, bar]);
  if (!battleOf()) hud.hidden = true;

  const root = h('div', { class: 'dungeon' }, [room, hud, fade, prompt, way]);

  /** The view's size in CSS pixels: whether the phone is on its side. */
  let size = { width: 0, height: 0 };
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(([entry]) => {
      if (!root.isConnected) {
        observer.disconnect();
        return;
      }
      if (entry) size = { width: entry.contentRect.width, height: entry.contentRect.height };
    });
    observer.observe(root);
  }

  let roomShown = '';
  /** The walker as last handed to the stage: a different one back means a tap moved him. */
  let given: Play = options.run().play;
  let roomView: View | null = null;
  let lock: { shut: boolean } = { shut: false };
  const playing = (): boolean => sideways(size) && !options.run().finished;

  const showRoom = (): void => {
    const run = options.run();
    const made = roomScene(dungeon.rooms[run.room]!);
    lock = made.lock;
    lock.shut = runLocked(run);
    given = run.play;
    roomShown = run.room;
    roomView = stage({
      scene: made.scene,
      art: {
        ground: made.art.ground,
        heroFeet: HERO_FEET,
        walkerAt: (feet, facing, palette) => hero.at(feet, facing, palette.lightsOn),
        shadowAt: made.art.shadowAt,
      },
      play: run.play,
      keep: () => {},
      press: () => {},
      scaleOf: dungeonScale,
      insets: DUNGEON_INSETS,
      frozen: () => !playing(),
      drive: (play, ms) => {
        const before = options.run();
        const after = advanceRun(dungeon, before, play === given ? before.play : play, ms);
        options.keep(after);
        given = after.play;
        return after.play;
      },
      tap: (point, min, play) => {
        const run = options.run();
        if (!run.battle || run.finished || run.doorway) return null;
        const from = play === given ? run.play : play;
        const foe = foeAt(run.battle, run.room, point, min);
        if (!foe) {
          options.keep({ ...run, battle: stopChasing(run.battle), play: from });
          return null;
        }
        const aimed = targetFoe(run.battle, placeOf(dungeon, run), from, foe.key);
        options.keep({ ...run, battle: aimed.battle, play: aimed.play });
        given = aimed.play;
        return aimed.play;
      },
      extra: (_now, palette) => fightExtra(dungeon, options.run(), palette),
      label: 'A cave. Tap the ground to walk there, or something to fight it.',
      fallback: 'The grotto needs a browser that can draw on a canvas.',
    });
    room.replaceChildren(roomView.el);
  };

  let results: HTMLElement | null = null;
  const showResults = (): void => {
    if (results) return;
    leaveButton.hidden = true;
    confirm.replaceChildren();
    hud.hidden = true;
    const run = options.run();
    const tally: Tally | null = run.battle?.tally ?? null;
    const fell = run.ending === 'fell';
    const title = !run.battle
      ? 'You reached the end'
      : fell
        ? 'Washed back to town'
        : 'The grotto is cleared';
    const line = !run.battle
      ? 'Nothing down here yet but a damp floor and a good echo. Someone will be along to fill it.'
      : fell
        ? 'The tide put you back on the quay, damp but whole. Everything you picked up came with you.'
        : 'Everything down there has been firmly discouraged. Their belongings have come with you.';
    const facts: HTMLElement[] = [
      h('p', { class: 'dungeon-time', text: `Time taken: ${runTime(run.ms)}` }),
    ];
    const earned: HTMLElement[] = [];
    if (tally) {
      facts.push(h('p', { text: `Kills: ${tally.kills}` }));
      if (tally.eaten > 0) facts.push(h('p', { text: `Eaten: ${tally.eaten}` }));
      if (tally.shot > 0) facts.push(h('p', { text: `Arrows shot: ${tally.shot}` }));
      for (const [skill, xp] of Object.entries(tally.xp)) {
        earned.push(
          resultLine(skillIcon(skill), content.skills[skill]?.name ?? skill, `+${xp} XP`),
        );
      }
      if (tally.coins > 0) earned.push(resultLine(null, 'Coins', `+${tally.coins}`));
      for (const [item, qty] of Object.entries(tally.loot)) {
        earned.push(resultLine(itemIcon(item), content.items[item]?.name ?? item, `×${qty}`));
      }
      if (earned.length === 0)
        earned.push(h('li', { class: 'muted', text: 'Nothing, this time.' }));
    }
    results = h('section', { class: 'dungeon-results', attrs: { 'aria-label': 'Results' } }, [
      h('div', { class: `dungeon-card${tally ? ' run-card' : ''}` }, [
        h('div', { class: 'run-head' }, [
          h('h2', { text: title }),
          h('p', { class: 'muted', text: line }),
          ...facts,
          button('Back to town', () => options.leave(), 'primary'),
        ]),
        tally ? h('ul', { class: 'run-earned', attrs: { 'aria-label': 'Earned' } }, earned) : null,
      ]),
    ]);
    root.append(results);
  };

  /** The top and bottom of the fight, brought up to date: only what changed is touched. */
  const showFight = (run: Run): void => {
    const battle = run.battle;
    if (!battle) return;
    const me = battle.fighter;
    fill(heroFill, 'X', fraction(battle.hp, me.maxHp));
    setText(heroNumbers, `${battle.hp}/${me.maxHp}`);
    heroPanel.classList.toggle('low', battle.hp * 4 <= me.maxHp);
    fill(heroSwing, 'X', fraction(PLAYER_ATTACK_MS - battle.blowMs, PLAYER_ATTACK_MS));

    const target = battle.foes.find((f) => f.key === battle.target && alive(f)) ?? null;
    targetPanel.hidden = !target;
    if (target) {
      const def = battle.monsters[target.monster]!;
      if (targetShown !== target.monster) {
        targetShown = target.monster;
        setText(targetName, `${def.name} · ${def.level}`);
        const face = portrait(target.monster);
        targetFace.replaceChildren(...(face ? [face] : []));
        targetFace.hidden = !face;
      }
      fill(targetFill, 'X', fraction(target.hp, def.hp));
      setText(targetNumbers, `${target.hp}/${def.hp}`);
    }

    const place = placeOf(dungeon, run);
    abilityButtons.forEach((b, i) => {
      const slot = i as 0 | 1;
      const left = cooldownLeft(battle, slot === 0 ? 'first' : 'second');
      const ability = abilities[slot];
      const problem = abilityProblem(battle, place, run.play, slot);
      b.el.dataset.state = left > 0 ? 'cooling' : problem ? 'idle' : 'ready';
      fill(b.shade, 'Y', fraction(left, ability.cooldownMs));
      setText(b.count, secondsLeft(left));
    });
    if (style === 'ranged') {
      const quiver = abilityButtons[0]!;
      quiver.el.dataset.arrows = String(arrowsLeft(battle));
    }
    if (foodButton) {
      const left = cooldownLeft(battle, 'food');
      const problem = foodProblem(battle);
      foodButton.el.dataset.state =
        problem === 'none' ? 'empty' : left > 0 ? 'cooling' : problem ? 'idle' : 'ready';
      fill(foodButton.shade, 'Y', fraction(left, FOOD_MS));
      setText(foodButton.count, String(foodLeft(battle)));
    }
  };

  showRoom();
  if (options.run().finished) showResults();

  return {
    el: root,
    update: (state: GameState) => {
      const before = options.run();
      const ready = sideways(size);
      prompt.hidden = ready || before.finished;
      promptLine.textContent =
        before.ms > 0
          ? 'The grotto will wait. Nothing in it is going anywhere.'
          : 'The grotto is wide and low. So, to be fair, is the boat.';
      lock.shut = runLocked(before);
      roomView?.update?.(state);
      const after = options.run();
      if (after.room !== roomShown) showRoom();
      if (after.finished && !before.finished) {
        showResults();
        options.finished();
      }
      showFight(after);
      fade.style.opacity = String(doorwayDark(after.doorway));
    },
  };
}
