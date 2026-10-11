import { tgrid } from '../../src/art/town2/cells';
import { capsWord, uncialWord, uncialGlyph } from './glyphs';
import { treat, stampF } from './logo';
import { gridCanvas, xpal } from './pal';

export function logosPage(): void {
  const g = tgrid(390, 400);
  const pal = xpal('dusk');
  let y = 6;
  for (const cap of [30, 24, 18]) {
    const f = treat(capsWord('HEARTH', cap), 'gilt', { rim: ['navy', 6], drop: 2, dropCell: ['navy', 7] });
    stampF(g, f, 6, y);
    const f2 = treat(capsWord('HARBOUR', cap), 'gilt', { rim: ['navy', 6], drop: 2, dropCell: ['navy', 7] });
    stampF(g, f2, 6 + f.g.w + 8, y);
    y += f.g.h + 6;
  }
  const u = treat(uncialWord('Hearth', 22), 'cream', { rim: ['navy', 6], drop: 2, dropCell: ['banner', 5] });
  stampF(g, u, 6, y);
  const a = treat(uncialGlyph('&', 22), 'cream', { rim: ['navy', 6] });
  stampF(g, a, 6 + u.g.w + 4, y);
  y += u.g.h + 4;
  const u2 = treat(uncialWord('Harbour', 22), 'cream', { rim: ['navy', 6], drop: 2, dropCell: ['banner', 5] });
  stampF(g, u2, 6, y);
  y += u2.g.h + 4;
  const c = treat(uncialWord('Harbour', 18), 'carved', {});
  stampF(g, c, 6, y);
  document.body.append(gridCanvas(g, pal, [], 2));
}
