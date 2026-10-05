/**
 * Draws a small pixel picture, given as rows of characters, as an inline SVG
 * that scales in whole steps and takes its colour from the text around it.
 * '.' is empty; any other character is a filled pixel.
 *
 * This is the placeholder path for menu glyphs only. The real pixel engine
 * (palette ramps, automatic outlines, day and dusk) is grid.ts and its
 * neighbours.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

export function pixelSvg(rows: readonly string[], pixelSize = 2): SVGSVGElement {
  const height = rows.length;
  const width = Math.max(...rows.map((row) => row.length));
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width * pixelSize));
  svg.setAttribute('height', String(height * pixelSize));
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  let path = '';
  rows.forEach((row, y) => {
    // One run per stretch of filled pixels, so a row is a few rectangles.
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '.') continue;
      let end = x;
      while (end + 1 < row.length && row[end + 1] !== '.') end += 1;
      path += `M${x} ${y}h${end - x + 1}v1h-${end - x + 1}z`;
      x = end;
    }
  });
  const shape = document.createElementNS(SVG_NS, 'path');
  shape.setAttribute('d', path);
  shape.setAttribute('fill', 'currentColor');
  svg.append(shape);
  return svg;
}
