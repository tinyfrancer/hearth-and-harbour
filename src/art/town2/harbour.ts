/**
 * The C-scale harbour: the pier, the rowing boat, the ship and the rock with
 * its wreck. The same things as the approved mock-up's harbour (src/art/
 * harbour.ts) drawn fresh to scale with a 64-pixel person: planks you could
 * walk on, a boat a person fits in, a ship as long as a street, a rock with a
 * face as big as a house. Each lit as a solid; afloat things carry their own
 * waterline foam and say where their waterline is.
 */
import type { Glow } from '../raster';
import { at, cell, dim, hash, isMat, oval, put, segment, tgrid } from './cells';
import type { Drawn } from './props';
import { m } from './scale';
import { clamp, clumps, cyl, fbm, noise } from './texture';
import { beamH, beamV } from './walls';

const C = cell;

/** Pier deck width in art pixels (the walkable boards), and the margin either side for piles. */
export const PIER_DECK = m(2.6);
export const PIER_MARGIN = 6;

/**
 * The pier: boards laid across it, a stringer down each side with pile heads
 * standing proud every two metres, and its seaward end showing the deck's
 * thickness and the piles going down into the water.
 */
export function pier(length = m(10)): Drawn {
  const W = PIER_DECK + PIER_MARGIN * 2;
  const end = m(0.9);
  const H = length + end;
  const g = tgrid(W, H);
  const x0 = PIER_MARGIN;
  const bh = m(0.2);
  // Boards: each its own length offset, lit along its top edge, a dark gap below, nail heads.
  for (let y = 0; y < length; y++) {
    const row = Math.floor(y / bh);
    const py = y % bh;
    const tone = 2 + (hash(row, 1, 7) < 0.2 ? 1 : 0) - (hash(row, 2, 7) < 0.15 ? 1 : 0);
    for (let i = 0; i < PIER_DECK; i++) {
      let t = tone;
      if (py === bh - 1) t = 5;
      else if (py === 0) t = tone - 1;
      else if (hash(i, Math.floor(y / 2), 9) < 0.06) t = tone + 1;
      if (i === 0) t = Math.min(t, 1);
      if (i >= PIER_DECK - 2) t = Math.max(t, 4);
      if ((i === 4 || i === PIER_DECK - 6) && py === 2) t = 0;
      put(g, x0 + i, y, C('wood', clamp(t, 0, 5)));
    }
  }
  // Stringers down each side and pile heads.
  for (const sx of [x0 - 3, x0 + PIER_DECK - 1]) beamV(g, sx, 0, 4, length, 31 + sx);
  for (let y = m(0.6); y < length - 4; y += m(2.0))
    for (const px of [x0 - 5, x0 + PIER_DECK - 2]) {
      const pw = 7;
      for (let j = 0; j < 9; j++)
        for (let i = 0; i < pw; i++) {
          const nx = ((i + 0.5) / pw) * 2 - 1;
          put(g, px + i, y + j, C('tar', clamp(cyl(nx, 2.2, 1.3) + (j === 0 ? -1 : 0), 0, 5)));
        }
      oval(g, px + pw / 2 - 0.5, y, pw / 2, 2, C('tar', 1));
    }
  // The seaward end: the deck's edge and the piles into the water, foam at their feet.
  beamH(g, x0 - 3, length, PIER_DECK + 6, m(0.25), 41);
  for (let px = x0 - 2; px < x0 + PIER_DECK; px += m(0.75))
    for (let y = length + m(0.25); y < H - 2; y++)
      for (let i = 0; i < 6; i++) {
        const nx = ((i + 0.5) / 6) * 2 - 1;
        const wet = y > H - m(0.35);
        put(g, px + i, y, C(wet ? 'tar' : 'wood', clamp(cyl(nx, wet ? 3 : 3, 1.2), 1, 5)));
      }
  for (let x = 0; x < W; x++) if (at(g, x, H - 3)) put(g, x, H - 2, C('sea', x % 3 === 0 ? 1 : 0));
  return { grid: g, glows: [] };
}

/** The rowing boat: planked hull seen from above and the side, thwarts, oars shipped, a painter to the quay. */
export function rowboat(): Drawn {
  const L = m(3.4);
  const B = m(1.25);
  const side = m(0.38);
  const W = L + 4;
  const H = Math.round(B * 0.75) + side + 6;
  const g = tgrid(W, H);
  const cx = W / 2;
  const top = 3;
  const ry = Math.round(B * 0.75) / 2;
  const cy = top + ry;
  // The hull's plan: blunt transom at the left, pointed bow at the right.
  const half = (x: number) => {
    const f = (x - 2) / (L - 1);
    if (f < 0 || f > 1) return -1;
    return (
      ry * (f < 0.1 ? 0.7 + f * 3 : Math.pow(Math.max(0, 1 - Math.pow((f - 0.35) / 0.65, 2)), 0.6))
    );
  };
  // Outside face of the hull below the gunwale: planks (strakes) lit along their tops.
  for (let x = 2; x < L + 2; x++) {
    const hw = half(x);
    if (hw < 0) continue;
    const yTop = cy + hw;
    const depth = side * (0.6 + 0.4 * Math.min(1, hw / ry));
    for (let j = 0; j < depth; j++) {
      const strake = Math.floor((j / depth) * 3);
      const py = (j / depth) * 3 - strake;
      let t = 2 + strake * 0.6;
      if (py < 0.2) t -= 1;
      if (py > 0.8) t += 1;
      put(g, x, yTop + j, C('wood', clamp(t + (x > cx + L * 0.3 ? 0.5 : 0), 1, 5)));
    }
  }
  // Inside: the bottom boards in shadow, the gunwale lit, thwarts across.
  for (let x = 2; x < L + 2; x++) {
    const hw = half(x);
    if (hw < 0) continue;
    for (let y = Math.ceil(cy - hw); y <= cy + hw; y++) {
      const e = Math.abs(y - cy) / Math.max(1, hw);
      let c = C('wood', (Math.floor((y - top) / 4) % 2 ? 4 : 3) + (y > cy ? 0 : 1) * 0);
      if (e > 0.78 || hw - Math.abs(y - cy) < 2.5) c = C('wood', y < cy ? 1 : 2);
      else if (y < cy - hw + 5) c = C('wood', 5);
      put(g, x, y, c);
    }
  }
  for (const fx of [0.3, 0.55, 0.78]) {
    const x = Math.round(2 + fx * L);
    const hw = half(x);
    for (let y = Math.round(cy - hw + 2); y <= cy + hw - 2; y++)
      for (let i = 0; i < 6; i++) put(g, x + i, y, C('wood', i === 0 ? 1 : i === 5 ? 5 : 2));
  }
  // Two oars lying along the thwarts.
  segment(g, cx - L * 0.3, cy - 2, cx + L * 0.34, cy - 4, C('linen', 2));
  segment(g, cx - L * 0.3, cy - 1, cx + L * 0.34, cy - 3, C('linen', 4));
  for (let i = 0; i < 12; i++)
    put(g, cx + L * 0.34 + i, cy - 4 - (i > 2 ? 1 : 0), C('linen', i < 6 ? 1 : 3));
  // Waterline: foam along the hull's foot.
  for (let x = 1; x < W - 1; x++) {
    let y = H - 1;
    while (y > 0 && !at(g, x, y)) y--;
    if (y > 0 && y < H - 1) put(g, x, y + 1, C('sea', (x * 7) % 5 === 0 ? 1 : 0));
  }
  // The painter, up from the bow ring to the top edge (a ring on the quay above).
  for (let y = 0; y < top + 2; y++) put(g, Math.round(cx + L * 0.4), y, C('linen', 3));
  return { grid: g, glows: [] };
}

/** A pirate cutter at anchor, bow to the left: tarred hull, gun ports, a stern cabin, a mast and its black flag. */
export function ship(): Drawn {
  const hullL = m(11);
  const hullH = m(2.4);
  const mastH = m(10.5);
  const W = hullL + m(3.2);
  const H = mastH + hullH + 4;
  const g = tgrid(W, H);
  const glows: Glow[] = [];
  const x0 = m(2.6);
  const wl = H - 3;
  const deck = wl - hullH;
  // The hull: sheer rising at bow and stern, a tumblehome, planks, a gilded wale, red below.
  const sheer = (x: number) => {
    const f = (x - x0) / hullL;
    return Math.round(Math.pow(Math.abs(f - 0.55) / 0.55, 2.2) * m(0.9));
  };
  const deckAt = (x: number) => deck - sheer(Math.max(x0, Math.min(x0 + hullL - 1, x)));
  for (let y = deckAt(x0) - 2; y < wl; y++) {
    // The stem curves back from the bow toward the waterline; the transom rakes at the stern.
    const jy = (y - (deck - m(0.4))) / (wl - (deck - m(0.4)));
    const fore = x0 + Math.round(Math.pow(Math.max(0, jy), 2.2) * m(1.6));
    const aft = x0 + hullL - Math.round(Math.max(0, jy) * m(0.7));
    for (let x = fore; x < aft; x++) {
      const topY = deckAt(x);
      if (y < topY) continue;
      const j = y - topY;
      const f = (x - x0) / hullL;
      const strake = Math.floor(j / 6);
      let mat: 'tar' | 'gold' | 'crimson' = 'tar';
      // A rounded hull: upper strakes lit, lower ones turning under, the ends turning away.
      let t = 1.7 + (j / hullH) * 1.6;
      if (j % 6 === 5) t += 1.2;
      else if (j % 6 === 0) t -= 0.7;
      if (hash(Math.floor((x + strake * 17) / 40), strake, 3) < 0.12) t += 0.7;
      if (j < 3) t = j === 0 ? 1 : 2;
      const waleY = Math.round(hullH * 0.42);
      if (j >= waleY && j < waleY + 4) {
        mat = 'gold';
        t = j === waleY ? 2 : j === waleY + 3 ? 4 : 3;
      }
      if (wl - y < m(0.4)) {
        mat = 'crimson';
        t = 3 + (wl - y < 4 ? 1 : 0);
      }
      if (f > 0.88 || x - fore < 6) t += 0.8;
      if (aft - x < 3) t += 1;
      put(g, x, y, C(mat, clamp(t, 0, 5)));
    }
  }
  // Gun ports with their lids open and a cannon's muzzle in each.
  for (let n = 0; n < 4; n++) {
    const px = x0 + Math.round(hullL * (0.24 + n * 0.15));
    const py = deck - sheer(px) + m(0.32);
    const pw = m(0.4);
    for (let j = 0; j < pw; j++)
      for (let i = 0; i < pw; i++) put(g, px + i, py + j, C('shade', i === 0 || j === 0 ? 3 : 2));
    for (let i = 0; i < pw; i++) put(g, px + i, py - 3, C('crimson', 2));
    oval(g, px + pw / 2, py + pw / 2, 3, 3, C('iron', 4));
    oval(g, px + pw / 2 - 1, py + pw / 2 - 1, 1.5, 1.5, C('shade', 4));
    // Rust weeping from the port's sill.
    for (const [sx, len] of [
      [px + 2, 9 + n * 2],
      [px + pw - 4, 6 + ((n * 5) % 4)],
    ] as const)
      for (let j = 0; j < len; j++)
        if (isMat(at(g, sx, py + pw + j), 'tar'))
          put(g, sx, py + pw + j, C('wood', j < len / 2 ? 4 : 5));
  }
  // The hull's wear (B9): butt joints staggered strake by strake, planks
  // bleached by salt along the top and at the waterline, tar run down the
  // seams, and rust weeping from under each gun port.
  for (let x = x0 + 4; x < x0 + hullL - 4; x++)
    for (let y = deckAt(x); y < wl - m(0.4); y++) {
      if (!isMat(at(g, x, y), 'tar')) continue;
      const j = y - deckAt(x);
      const strake = Math.floor(j / 6);
      if ((x + strake * 23) % 41 === 0 && j % 6 !== 5) dim(g, x, y, 2);
      const salt = noise(x, y, 9, 61);
      if ((j < 10 || wl - y < m(0.8)) && salt > 0.72 && j % 6 !== 5)
        put(g, x, y, C('tar', Math.max(1, (at(g, x, y) & 7) - 1)));
    }
  // The stern castle (B9; B7's was a plain box): the quarterdeck raised over
  // the great cabin, a row of three windows in gilded frames under a carved
  // band, a balustraded gallery round the stern, a taffrail with turned
  // balusters along the top, and the stern lantern.
  const cabX = x0 + Math.round(hullL * 0.76);
  const cabR = x0 + hullL - 2;
  const cabTop = deck - sheer(cabR) - m(1.25);
  for (let x = cabX; x < cabR; x++) {
    const yb = deck - sheer(x);
    for (let y = cabTop; y < yb; y++) {
      const j = y - cabTop;
      let t = j % 6 === 5 ? 4 : 2 + (hash(Math.floor((x + j * 3) / 30), j >> 3, 5) < 0.2 ? 1 : 0);
      if (x === cabX) t = 1;
      else if (x === cabX + 1) t = 2;
      else if (x > cabR - 4) t = 4;
      put(g, x, y, C('tar', t));
    }
  }
  // The carved band under the windows and the quarterdeck's edge above them.
  const bandY = cabTop + m(0.95);
  for (let x = cabX; x < cabR; x++) {
    put(g, x, cabTop - 1, C('tar', 1));
    put(g, x, cabTop, C('tar', 3));
    for (let j = 0; j < 3; j++)
      put(g, x, bandY + j, C('gold', j === 0 ? 2 : j === 2 ? 4 : x % 4 < 2 ? 3 : 2));
  }
  // Three windows in gilded frames, the middle one lit at dusk.
  const winW = m(0.42);
  const winH = m(0.55);
  const winY = cabTop + m(0.25);
  const gap = Math.round((cabR - cabX - 3 * winW) / 4);
  for (let n = 0; n < 3; n++) {
    const wx = cabX + gap + n * (winW + gap);
    for (let j = -1; j <= winH; j++)
      for (let i = -1; i <= winW; i++) {
        const frame = i < 0 || j < 0 || i === winW || j === winH;
        const bar = i === winW >> 1 || j === winH >> 1;
        const lit = n === 1;
        put(
          g,
          wx + i,
          winY + j,
          frame
            ? C('gold', i < 0 || j < 0 ? 2 : 4)
            : bar
              ? C('gold', 3)
              : C(lit ? 'glass' : 'pane', j < winH / 2 ? 4 : 3),
        );
      }
    if (n === 1)
      glows.push({ x: wx + winW / 2, y: winY + winH / 2, radius: m(1.3), strength: 0.45 });
  }
  // The stern gallery: a walk with a balustrade round the transom, its floor lit along its edge.
  const galY = bandY + 4;
  const galX0 = cabR - m(0.8);
  for (let x = galX0; x < cabR + m(0.35); x++) {
    put(g, x, galY + 7, C('tar', 1));
    put(g, x, galY + 8, C('tar', 4));
    put(g, x, galY, C('wood', 1));
    if ((x - galX0) % 3 === 0)
      for (let j = 1; j < 7; j++) put(g, x, galY + j, C('wood', j === 1 ? 2 : 3));
  }
  // The taffrail along the top, turned balusters under its rail, and the stern lantern.
  const tY = cabTop - m(0.5);
  for (let x = cabX - 2; x < cabR + 2; x++) {
    put(g, x, tY, C('wood', 1));
    put(g, x, tY + 1, C('wood', 3));
    if ((x - cabX) % 4 === 1)
      for (let j = 2; j < m(0.5) - 1; j++) put(g, x, tY + j, C('wood', j === 4 ? 1 : 3));
  }
  const lx = cabR - 2;
  for (let j = 0; j < m(0.6); j++) put(g, lx, tY - j, C('iron', 3));
  for (let j = 0; j < 9; j++)
    for (let i = 0; i < 7; i++) {
      const edge = i === 0 || i === 6 || j === 0 || j === 8;
      put(
        g,
        lx - 3 + i,
        tY - m(0.6) - 9 + j,
        edge ? C('iron', i === 0 ? 2 : 4) : C('lamp', j < 4 ? 1 : 2),
      );
    }
  glows.push({ x: lx, y: tY - m(0.6) - 5, radius: m(1.6), strength: 0.55 });
  // The bulwark along the waist: a cap rail lit on top, planks under it, a
  // stanchion every so often, scuppers at deck level.
  for (let x = x0 + 4; x < cabX; x++) {
    const y = deck - sheer(x) - 5;
    put(g, x, y, C('wood', 1));
    put(g, x, y + 1, C('tar', 2));
    for (let j = 2; j < 5; j++)
      put(g, x, y + j, C('tar', (x - x0) % 12 === 0 ? 1 : j === 4 ? 4 : 3));
    if ((x - x0) % 24 === 6) put(g, x, y + 5, C('shade', 3));
  }
  // The bowsprit, out over the bow.
  const bsY = deck - sheer(x0) - 2;
  for (let i = 0; i < m(3.0); i++)
    for (let j = 0; j < 4; j++)
      put(g, x0 + 6 - i, bsY - Math.round(i * 0.35) + j, C('wood', j === 0 ? 1 : j === 3 ? 4 : 2));
  // The mast, lit on its left, a yard, a gaff with the sail furled, a crow's nest.
  const mx = x0 + Math.round(hullL * 0.42);
  const mw = m(0.26);
  const mTop = 6;
  for (let y = mTop; y < deck - sheer(mx); y++)
    for (let i = 0; i < mw; i++) {
      const nx = ((i + 0.5) / mw) * 2 - 1;
      put(g, mx + i, y, C('wood', clamp(cyl(nx, 2.3, 1.4), 1, 5)));
    }
  const yardY = mTop + m(2.6);
  for (let i = -m(2.4); i < m(2.4); i++)
    for (let j = 0; j < 4; j++)
      put(g, mx + mw / 2 + i, yardY + j, C('wood', j === 0 ? 1 : j === 3 ? 5 : 3));
  // The furled sail on the yard (B9): canvas gathered in bunches between the
  // gaskets, each bunch a soft bulge lit on its upper left with a crease
  // running into the tie, the roll fattest at the bunt in the middle where
  // the slack hangs lowest.
  const half = m(2.2);
  for (let i = -half; i < half; i++) {
    const ph = ((i + 1000) % 18) / 18;
    const bunt = Math.max(0, 1 - Math.abs(i) / (half * 0.35));
    const rr = 6 + Math.round(Math.sin(ph * Math.PI) * 3 + bunt * 5);
    for (let j = 0; j < rr; j++) {
      const gasket = ph < 0.08;
      let t = j < 2 ? 1 : j > rr - 3 ? 4 : 2;
      if (!gasket && ph < 0.25 && j > 1) t = 3;
      if (!gasket && ph > 0.4 && ph < 0.55 && j > 2 && j < rr - 2) t = 1;
      if (!gasket && j > 2 && j < rr - 2 && Math.abs(ph - 0.75) < 0.04) t = 3;
      put(g, mx + mw / 2 + i, yardY + 4 + j, gasket ? C('linen', j === 0 ? 3 : 4) : C('sail', t));
    }
  }
  // Crow's nest.
  const nestY = mTop + m(1.4);
  for (let j = 0; j < m(0.4); j++)
    for (let i = -m(0.45); i < m(0.45) + mw; i++)
      put(
        g,
        mx + i,
        nestY + j,
        C('wood', j === 0 ? 1 : j === m(0.4) - 1 ? 5 : i < -m(0.3) ? 2 : 3),
      );
  // The boom low over the deck, with the mainsail lashed to it.
  const boomY = deck - sheer(mx) - m(1.6);
  for (let i = 0; i < m(5.0); i++) {
    for (let j = 0; j < 4; j++)
      put(g, mx + mw + i, boomY + j + Math.round(i * 0.08), C('wood', j === 0 ? 1 : 3));
    const rr = 6 - Math.round(i / m(1.4));
    for (let j = 0; j < Math.max(2, rr); j++)
      put(
        g,
        mx + mw + i,
        boomY - Math.max(2, rr) + j + Math.round(i * 0.08),
        C('sail', j === 0 ? 1 : 3),
      );
  }
  // Rigging: shrouds to the rail, a forestay to the bowsprit, backstay to the stern.
  const rig = (ax: number, ay: number, bx: number, by: number) => {
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(ax + ((bx - ax) * i) / n);
      const y = Math.round(ay + ((by - ay) * i) / n);
      if (!isMat(at(g, x, y), 'sail')) put(g, x, y, C('tar', 4));
    }
  };
  rig(mx, mTop + 4, x0 + 6 - m(3.0), bsY - Math.round(m(3.0) * 0.35));
  rig(mx + mw, mTop + 4, x0 + hullL - 4, deck - sheer(x0 + hullL - 4) - 4);
  // The shrouds (B9): four a side from under the crow's nest down to the
  // channels on the hull's side, each a dark line with a lit pixel every few
  // rows where the light catches the tarred rope; the deadeyes at their feet;
  // and the ratlines, the rungs the crew climb by, tied across between
  // neighbouring shrouds every five rows. B7 drew them as three long bars.
  const nestFoot = nestY + m(0.4);
  for (const side of [-1, 1]) {
    const feet: [number, number][] = [];
    for (let s = 0; s < 4; s++) {
      const fx = side < 0 ? mx - m(0.5) - s * 11 : mx + mw + m(0.5) + s * 11;
      feet.push([fx, deck - sheer(fx) - 1]);
    }
    const top = side < 0 ? mx + 1 : mx + mw - 1;
    const at2 = (s: number, y: number) => {
      const [fx, fy] = feet[s]!;
      return top + ((fx - top) * (y - nestFoot)) / (fy - nestFoot);
    };
    for (let s = 0; s < 4; s++) {
      const [fx, fy] = feet[s]!;
      for (let y = nestFoot; y <= fy; y++) {
        const x = Math.round(at2(s, y));
        if (!isMat(at(g, x, y), 'sail')) put(g, x, y, C('tar', y % 7 === 0 ? 2 : 3));
      }
      // The deadeye and its chainplate on the hull.
      oval(g, fx, fy - 2, 2, 2, C('wood', 3));
      put(g, fx - 1, fy - 3, C('wood', 1));
      for (let j = 0; j < 7; j++) put(g, fx, fy + j, C('iron', 3));
    }
    for (let y = nestFoot + 5; y < feet[0]![1] - 4; y += 7)
      for (let s = 0; s < 3; s++) {
        const a = Math.round(at2(s, y));
        const b = Math.round(at2(s + 1, y));
        for (let x = Math.min(a, b) + 1; x < Math.max(a, b); x++)
          if (!isMat(at(g, x, y), 'sail') && !isMat(at(g, x, y), 'wood')) put(g, x, y, C('tar', 2));
      }
  }
  // The jib furled along the bowsprit, and the topping lift up to the boom's end.
  for (let i = 6; i < m(2.6); i++) {
    const x = x0 + 6 - i;
    const y = bsY - Math.round(i * 0.35) - 3;
    put(g, x, y, C('sail', i % 9 === 0 ? 4 : 1));
    put(g, x, y + 1, C('sail', i % 9 === 0 ? 4 : 3));
  }
  // The black flag at the masthead, a skull on it, rippling away to the right.
  const fx = mx + mw;
  const fw = m(1.5);
  const fh = m(0.95);
  for (let i = 0; i < fw; i++) {
    const wave = Math.round(Math.sin(i / 6) * 2);
    for (let j = 0; j < fh; j++) {
      let t = 2 + (Math.sin(i / 6) > 0.4 ? -1 : Math.sin(i / 6) < -0.5 ? 1 : 0);
      if (j === 0 || j === fh - 1) t = 3;
      put(g, fx + i, 4 + j + wave, C('shade', t));
    }
  }
  const sx = fx + Math.round(fw * 0.42);
  const sy = 4 + Math.round(fh * 0.4);
  oval(g, sx, sy, 5, 4.5, C('linen', 1));
  put(g, sx - 2, sy, C('shade', 3));
  put(g, sx + 2, sy, C('shade', 3));
  put(g, sx - 2, sy - 1, C('shade', 3));
  put(g, sx + 2, sy - 1, C('shade', 3));
  for (let i = -2; i <= 2; i++) put(g, sx + i, sy + 4, C('linen', 2));
  for (const s of [-1, 1]) {
    segment(g, sx - 8 * s, sy + 6, sx + 8 * s, sy + 9, C('linen', 2));
  }
  // Waterline foam and a reflection-dark band under the hull.
  for (let x = 0; x < W; x++)
    if (at(g, x, wl - 1)) put(g, x, wl, C('sea', (x * 5) % 7 === 0 ? 1 : 0));
  return { grid: g, glows };
}

/**
 * The rock with a face, the ribs of a wreck and its broken mast against it,
 * weed and barnacles at the tide line. Redrawn in B9: B7's rock was a lumpy
 * speckled solid with no form and the wreck's ribs were sticks beside it.
 * The rock is now planes: broad facets, each lit by which way it faces, the
 * face itself on one broad plane turned to the viewer so it reads exactly as
 * before; the facets meet in edges (a lit lip where a plane turns to the
 * light, a dark crack where it turns away), strata run across it, and below
 * the tide line it is dark and wet under a fringe of weed with barnacles
 * crusted above. The wreck is half a hull: heavy curved ribs as tall as the
 * rock, a keelson, a few strakes of planking still nailed on.
 */
export function wreckRock(): Drawn {
  const W = m(5.2);
  const H = m(3.6);
  const g = tgrid(W, H);
  const rx = m(1.8);
  const ry = m(1.4);
  const cx = m(1.9);
  const cy = H - ry - 3;
  const tide = H - m(0.55);
  // The wreck, behind the rock to its right: the keelson along the bottom,
  // five ribs curving up out of the water, thick and dark with weathered
  // lit edges, the planking still on the lower ribs.
  const ribX = cx + m(1.05);
  const keelY = H - m(0.5);
  for (let i = 0; i < m(2.9); i++)
    for (let j = 0; j < 7; j++)
      put(
        g,
        ribX - 6 + i,
        keelY + j - Math.round(i * 0.1),
        C('tar', j === 0 ? 1 : j === 6 ? 5 : 3),
      );
  for (let n = 0; n < 5; n++) {
    const bx = ribX + n * m(0.55);
    const top = m(0.5) + n * m(0.18) + (n % 2) * 8;
    const bottom = keelY + 2 - Math.round(n * m(0.55) * 0.1);
    const broken = n === 3;
    for (let y = broken ? top + m(0.7) : top; y < bottom; y++) {
      const f = (bottom - y) / (bottom - top);
      // Ribs curve: out from the keel, then up and in toward the top.
      const curve = Math.round(Math.sin(f * Math.PI * 0.85) * m(0.45));
      const w = 9 - Math.round(f * 3);
      for (let i = 0; i < w; i++) {
        let t = i === 0 ? 1 : i === 1 ? 2 : i >= w - 2 ? 5 : 3;
        if ((y + n * 5) % 13 === 0 && i > 1) t = 4;
        put(g, bx + i - curve, y, C('tar', t));
      }
      // A splintered top.
      if (y === (broken ? top + m(0.7) : top))
        for (let i = 0; i < w; i += 2)
          put(g, bx + i - curve, y - 1 - (i % 4 === 0 ? 1 : 0), C('tar', 2));
    }
  }
  // Strakes of planking across the lower ribs, some sprung.
  for (let s = 0; s < 4; s++) {
    const sy = keelY - 10 - s * 9;
    const len = m(2.4) - s * m(0.45);
    for (let i = 0; i < len; i++) {
      if (s === 2 && i > len * 0.45 && i < len * 0.62) continue;
      const droop = s === 3 && i > len * 0.6 ? Math.round((i - len * 0.6) * 0.3) : 0;
      for (let j = 0; j < 6; j++)
        put(
          g,
          ribX - 2 + i,
          sy + j + droop - Math.round(i * 0.08),
          C('wood', j === 0 ? 3 : j === 5 ? 5 : 4),
        );
    }
  }
  // The broken mast leaning across, a rag of sail still on it.
  const ax = ribX + m(0.8);
  const ay = H - 6;
  const bx = ribX + m(2.6);
  const by = 4;
  for (let i = 0; i < 6; i++)
    segment(g, ax + i, ay, bx + i, by, C('wood', i === 0 ? 1 : i > 3 ? 4 : 2));
  for (let j = 0; j < m(0.9); j++)
    for (let i = 0; i < m(0.8) - j * 0.5; i++) {
      const px = bx - m(0.3) + i - Math.round(j * 0.4);
      const py = by + m(0.6) + j;
      if (hash(px, py, 3) < 0.1) continue;
      put(g, px, py, C('sail', 2 + (i % 5 === 0 ? 1 : 0) + Math.round(j / 10)));
    }
  // The rock's outline: a lumpy mass, flatter below.
  const inside = (x: number, y: number) => {
    const a = (x - cx) / rx;
    const b = (y - cy) / ry;
    const lump = (fbm(x, y, 18, 4) - 0.5) * 0.5;
    return a * a + b * b * (b > 0 ? 0.6 : 1) < 1 + lump && y < H - 3;
  };
  // Its planes: seeds over the mass, each facing a way of its own; the
  // middle one, where the face is, turned straight to the viewer.
  const fy = cy - m(0.2);
  const seeds: { x: number; y: number; nx: number; ny: number }[] = [
    { x: cx, y: fy + m(0.2), nx: -0.05, ny: -0.05 },
  ];
  for (let n = 0; n < 11; n++) {
    const a = (n / 11) * Math.PI * 2 + hash(n, 1, 21) * 0.5;
    const r = 0.62 + hash(n, 2, 21) * 0.3;
    const x = cx + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r * 0.9;
    seeds.push({
      x,
      y,
      nx: Math.cos(a) * 0.75 + (hash(n, 3, 21) - 0.5) * 0.5,
      ny: Math.sin(a) * 0.75 + (hash(n, 4, 21) - 0.5) * 0.5,
    });
  }
  const L = [-0.55, -0.72, 0.78];
  const LN = Math.hypot(...L);
  const facet = new Int8Array(W * H).fill(-1);
  const x1 = Math.round(cx + rx + 6);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < x1; x++) {
      if (!inside(x, y)) continue;
      let best = 0;
      let bd = Infinity;
      seeds.forEach((s, i) => {
        // The face's plane is broad; the others crowd round it.
        const d = Math.hypot(x - s.x, (y - s.y) * 1.2) * (i === 0 ? 0.62 : 1);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      facet[y * W + x] = best;
      const s = seeds[best]!;
      // B10: each plane bends with the mass it is part of (its normal half the
      // plane's, half the rounded rock's), so planes read as weathered stone
      // rather than cut facets.
      const ox = Math.max(-1, Math.min(1, (x - cx) / rx));
      const oy = Math.max(-1, Math.min(1, (y - cy) / ry));
      const nx = s.nx * 0.55 + ox * 0.45;
      const ny = s.ny * 0.55 + oy * 0.45;
      const nz = Math.sqrt(Math.max(0.1, 1 - nx * nx - ny * ny));
      const lit = (nx * L[0]! + ny * L[1]! + nz * L[2]!) / LN;
      let t = 2.4 + (0.82 - lit) * 2.2;
      // Weathering in clumps across each plane, never a speckle.
      t += (clumps(x, y, 23) - 0.5) * 1.4;
      put(g, x, y, C('rock', clamp(t, 1, 5)));
    }
  // Where planes meet: a lit lip where the lower plane turns to the light, a
  // dark crack where it turns away.
  for (let y = 0; y < H - 1; y++)
    for (let x = 0; x < x1; x++) {
      const me = facet[y * W + x]!;
      if (me < 0) continue;
      const r = facet[y * W + x + 1]!;
      const d = facet[(y + 1) * W + x]!;
      for (const o of [r, d]) {
        if (o < 0 || o === me) continue;
        const a = at(g, x, y) & 7;
        const b = (o === r ? at(g, x + 1, y) : at(g, x, y + 1)) & 7;
        // Worn joins (B10): a join shows only where the planes differ, and
        // breaks off here and there rather than running as a crisp line.
        if (a === b || clumps(x, y, 24) < 0.38) continue;
        put(g, x, y, C('rock', b < a ? Math.max(1, a - 1) : Math.min(5, a + 1)));
      }
    }
  // Two long cracks running down from the crown, lit on their lower lip.
  for (const [sx, sy, drift] of [
    [cx + m(0.9), cy - ry * 0.75, 0.35],
    [cx - m(1.15), cy - ry * 0.4, -0.25],
  ] as const) {
    let x = sx;
    let y = sy;
    for (let s = 0; s < m(1.2); s++) {
      if (!inside(Math.round(x), Math.round(y))) break;
      put(g, x, y, C('rock', 5));
      if (inside(Math.round(x), Math.round(y) + 1)) put(g, x + 1, y, C('rock', 1));
      x += drift + (hash(s, 3, 9) - 0.5) * 0.9;
      y += 1;
    }
  }
  // The face: two hollow eyes with brows that slope in sorrow, and a downturned mouth.
  for (const s of [-1, 1]) {
    const ex = cx + s * m(0.45);
    oval(g, ex, fy, 4.5, 3.5, C('rock', 5));
    oval(g, ex, fy + 0.5, 2.5, 2, C('shade', 2));
    put(g, ex - s, fy - 1, C('rock', 6));
    for (let i = -5; i <= 5; i++) put(g, ex + i, fy - 6 + Math.round((i * s) / 3), C('rock', 5));
    for (let i = -5; i <= 5; i++) put(g, ex + i, fy - 5 + Math.round((i * s) / 3), C('rock', 1));
  }
  for (let i = -m(0.35); i <= m(0.35); i++) {
    const y = fy + m(0.55) + Math.round(-Math.cos((i / m(0.35)) * 1.3) * 4) + 4;
    put(g, cx + i, y, C('rock', 6));
    put(g, cx + i, y + 1, C('rock', 1));
  }
  // Below the tide line the rock is dark and wet; along it hangs a fringe of
  // weed in strands of different lengths, and above it barnacles crust in
  // clusters, pale and lit on top. The ribs' feet are weeded too.
  for (let x = 0; x < W; x++) {
    const ripple = Math.round(Math.sin(x / 6) * 1.5);
    const strand = 3 + Math.floor(hash(x >> 1, 7, 13) * 7);
    for (let y = tide - 10 + ripple; y < H - 3; y++) {
      const c = at(g, x, y);
      if (!isMat(c, 'rock') && !isMat(c, 'tar')) continue;
      const below = y - (tide + ripple);
      if (below >= 0) {
        const wet = Math.min(5, (c & 7) + 1 + (below > 6 ? 1 : 0));
        put(g, x, y, isMat(c, 'tar') ? C('tar', 5) : C('rock', wet));
        if (below < strand && ((x >> 1) + (below >> 2)) % 3 !== 2)
          put(g, x, y, C('moss', below === 0 ? 4 : 5));
      } else if (below > -9 && isMat(c, 'rock')) {
        const k = hash(x >> 1, (y + 100) >> 1, 17);
        if (k < 0.16 + (below + 9) * 0.03) {
          put(g, x, y, C('linen', 1));
          if (isMat(at(g, x, y + 1), 'rock')) put(g, x, y + 1, C('rock', 5));
        }
      }
    }
  }
  for (let x = 0; x < W; x++)
    if (at(g, x, H - 4)) put(g, x, H - 3, C('sea', (x * 3) % 7 === 0 ? 1 : 0));
  return { grid: g, glows: [] };
}
