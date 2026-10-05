import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { townView } from '../../src/scene/townView';

// jsdom has no canvas to draw on, so these check the view's life rather than its pixels.
let frames: FrameRequestCallback[];
const runFrame = (time: number): void => {
  const due = frames;
  frames = [];
  for (const callback of due) callback(time);
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  document.body.replaceChildren();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('townView', () => {
  it('is a canvas scene that says what it is', () => {
    const view = townView(newGame('Cody', 0), CONTENT);
    const canvas = view.el.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas!.getAttribute('aria-label')).toMatch(/Tap the ground/);
  });

  it('runs its own loop while on the page, without the shell ticking it', () => {
    const view = townView(newGame('Cody', 0), CONTENT);
    document.body.append(view.el);
    for (let i = 0; i < 5; i++) {
      expect(frames).toHaveLength(1);
      runFrame(i * 16);
    }
    expect(frames).toHaveLength(1);
  });

  it('stops its loop on the first frame after it leaves the page', () => {
    const view = townView(newGame('Cody', 0), CONTENT);
    document.body.append(view.el);
    runFrame(0);
    runFrame(16);
    view.el.remove();
    runFrame(32);
    expect(frames).toHaveLength(0);
  });

  it('waits to be put on the page, and gives up on a view that never is', () => {
    townView(newGame('Cody', 0), CONTENT);
    for (let i = 0; i < 10; i++) runFrame(i * 16);
    expect(frames).toHaveLength(1);
    for (let i = 0; i < 100; i++) runFrame(i * 16);
    expect(frames).toHaveLength(0);
  });
});
