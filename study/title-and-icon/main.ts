import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-700.css';
import { logosPage } from './pages';
import { screenEl, type Title } from './screen';
import { TITLE_A } from './titleA';
import { TITLE_B } from './titleB';

const TITLES: Record<string, Title> = { A: TITLE_A, B: TITLE_B };

const q = new URLSearchParams(location.search);
const v = q.get('v') ?? 'logos';

/** One title as a phone screen; ?t= picks the moment, ?play animates it. */
function titlePage(): void {
  const title = TITLES[q.get('o') ?? 'A']!;
  const t = Number(q.get('t') ?? 0);
  const s = screenEl(title, t);
  document.body.style.margin = '0';
  document.body.append(s.el);
  if (q.has('play')) {
    const start = performance.now();
    const step = () => {
      s.paint(performance.now() - start);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  // For GIFs: frames as PNG data, at one pixel per art pixel.
  (window as unknown as { frameAt: (t: number) => string }).frameAt = (time: number) => {
    s.paint(time);
    return s.canvas.toDataURL('image/png');
  };
}

const pages: Record<string, () => void | Promise<void>> = { logos: logosPage, title: titlePage };
void Promise.resolve((pages[v] ?? logosPage)()).then(() => {
  (window as unknown as { ready: boolean }).ready = true;
});
