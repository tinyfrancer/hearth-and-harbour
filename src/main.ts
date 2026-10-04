import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './ui/styles.css';
import './art/art.css';
import './scene/scene.css';
import { CONTENT } from './data';
import { LocalStorageSaveService } from './persistence/LocalStorageSaveService';
import { mountApp } from './ui/app';

const app = mountApp(document.getElementById('app')!, {
  saves: new LocalStorageSaveService(),
  content: CONTENT,
  now: () => Date.now(),
});

// The game moves once a frame. A hidden page gets no frames; the first one
// back carries the whole gap, which `advance` takes in one step.
const frame = (): void => {
  app.tick();
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

// A phone gives no warning before it drops a page, so the moment it is hidden
// is the last sure chance to write. `pagehide` covers the browsers that close
// without hiding first.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') app.save();
});
window.addEventListener('pagehide', () => app.save());

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
