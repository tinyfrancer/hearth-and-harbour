/**
 * The tab bar's icons, drawn in the house's light: each is one object, lit
 * from the upper left in three tones of the tab's own colour (the lit face,
 * the turn, the shadow) with its parts separated by gaps, the way an engraved
 * glyph is, so it takes whatever colour the tab gives it, muted when the tab
 * is not chosen and bright gold when it is, and reads at 32 CSS pixels.
 *
 * Rows of characters, 16 x 16: '1' lit, '2' the turn, '3' shadow, '.' empty.
 */

/** Each tone's opacity of the tab's colour. */
export const TAB_TONES: Readonly<Record<string, number>> = { '1': 1, '2': 0.72, '3': 0.46 };

export const TAB_ICONS2: Readonly<Record<string, readonly string[]>> = {
  // A hammer crossed over a pick: the trades.
  skills: [
    '..........1111..',
    '1111112..1.1122.',
    '1122223.....1123',
    '1222223....12.23',
    '2333333...12...3',
    '....12...12.....',
    '.....12..12.....',
    '......1212......',
    '.......12.......',
    '......1212......',
    '.....12..12.....',
    '....12....12....',
    '...12......12...',
    '..12........12..',
    '.12..........12.',
    '12............12',
  ],
  // A sea chest: a rounded lid, iron bands, a lock.
  bank: [
    '................',
    '..1111111111....',
    '.111111111112...',
    '11.2222222.223..',
    '1122222222222223',
    '1222222222222223',
    '................',
    '1112.11111.1123.',
    '1112.1.33.1.123.',
    '1112.11.3.1.123.',
    '1112.1111111123.',
    '1112.22222221233',
    '1112.22222221233',
    '1223.22222222333',
    '.333333333333333',
    '................',
  ],
  // A helmed head and shoulders: you.
  character: [
    '....11111222....',
    '...1111112222...',
    '..111111122223..',
    '..111111122223..',
    '..11........23..',
    '..1111.1222223..',
    '..1111.1222223..',
    '..1111.1222233..',
    '...111.122233...',
    '....11112223....',
    '................',
    '..111112222223..',
    '.11111122222233.',
    '1111111222222233',
    '1111112222222333',
    '1111122222233333',
  ],
  // A house: a roof of tiles, a chimney smoking, a door and a lit window.
  town: [
    '...........1.1..',
    '............1...',
    '......11...11...',
    '.....1112..12...',
    '....111122.12...',
    '...11111222223..',
    '..1111112222223.',
    '.111111122222223',
    '1111111122222222',
    '................',
    '..111111222223..',
    '..1...112..223..',
    '..1...112..223..',
    '..1...11222223..',
    '..1...11222233..',
    '..1...12223333..',
  ],
  // A scroll, half unrolled, written on: the game's own pages.
  menu: [
    '................',
    '..11111111111...',
    '.1222222222221..',
    '.1222222222221..',
    '..1111111111112.',
    '...1.........2..',
    '...1.111111..2..',
    '...1.........2..',
    '...1.11111...2..',
    '...1.........2..',
    '...1.1111111.2..',
    '...1.........2..',
    '..11111111111123',
    '.1222222222222.3',
    '.1222222222222.3',
    '..33333333333333',
  ],
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * An icon as an inline SVG at `pixelSize` CSS pixels per art pixel, each tone
 * a path filled with the text's own colour at its opacity, edges crisp.
 */
export function tabSvg(rows: readonly string[], pixelSize = 2): SVGSVGElement {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', String(w * pixelSize));
  svg.setAttribute('height', String(h * pixelSize));
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'tab-art');
  for (const [tone, opacity] of Object.entries(TAB_TONES)) {
    let d = '';
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== tone) continue;
        let end = x;
        while (end + 1 < row.length && row[end + 1] === tone) end++;
        d += `M${x} ${y}h${end - x + 1}v1h-${end - x + 1}z`;
        x = end;
      }
    });
    if (!d) continue;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'currentColor');
    if (opacity < 1) path.setAttribute('fill-opacity', String(opacity));
    svg.append(path);
  }
  return svg;
}
