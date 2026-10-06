/**
 * The C-scale harbour: the pier, the rowing boat, the ship and the rock with
 * its wreck. The same things as the approved mock-up's harbour (src/art/
 * harbour.ts) drawn fresh to scale with a 64-pixel person: planks you could
 * walk on, a boat a person fits in, a ship as long as a street, a rock with a
 * face as big as a house. Each lit as a solid; afloat things carry their own
 * waterline foam and say where their waterline is.
 */
import type { Glow } from '../raster';
import { at, cell, dim, hash, isMat, oval, put, segment, solid, tgrid } from './cells';
import type { Drawn } from './props';
import { m } from './scale';
import { bayer, clamp, cyl, fbm } from './texture';
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
  }
  // The stern cabin: a raised house with a lit window.
  const cabX = x0 + Math.round(hullL * 0.78);
  const cabW = m(2.0);
  const cabTop = deck - sheer(cabX + cabW) - m(1.2);
  for (let y = cabTop; y < deck - sheer(cabX); y++)
    for (let i = 0; i < cabW; i++) {
      let t = 2;
      if ((y - cabTop) % 6 === 5) t = 4;
      if (i === 0) t = 1;
      if (i === cabW - 1) t = 5;
      put(g, cabX + i, y, C('tar', t));
    }
  for (let i = -2; i < cabW + 2; i++) {
    put(g, cabX + i, cabTop - 1, C('tar', 1));
    put(g, cabX + i, cabTop, C('tar', 3));
  }
  const winX = cabX + m(0.5);
  const winY = cabTop + m(0.3);
  for (let j = 0; j < m(0.45); j++)
    for (let i = 0; i < m(0.75); i++) {
      const bar = i === Math.round(m(0.75) / 2) || j === Math.round(m(0.45) / 2);
      put(g, winX + i, winY + j, bar ? C('gold', 3) : C('glass', j < 2 ? 5 : 3));
    }
  glows.push({ x: winX + m(0.37), y: winY + m(0.22), radius: m(1.2), strength: 0.4 });
  // Rail along the deck.
  for (let x = x0 + 4; x < x0 + hullL - 2; x++) {
    const y = deck - sheer(x) - 4;
    put(g, x, y, C('tar', 1));
    if (x % 10 === 0) for (let j = 1; j < 4; j++) put(g, x, y + j, C('tar', 3));
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
  // The furled sail on the yard: a fat roll of canvas, gathered by gaskets.
  for (let i = -m(2.2); i < m(2.2); i++) {
    const ph = ((i + 1000) % 16) / 16;
    const rr = 7 + Math.round(Math.sin(ph * Math.PI) * 3);
    for (let j = 0; j < rr; j++) {
      const gasket = ph < 0.1;
      const t = j < 2 ? 1 : j > rr - 3 ? 4 : ph < 0.3 ? 3 : 2;
      put(g, mx + mw / 2 + i, yardY + 4 + j, gasket ? C('linen', 4) : C('sail', t));
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
  for (let s = 0; s < 4; s++) {
    rig(mx + 1, nestY + m(0.4), mx - m(0.6) - s * 7, deck - sheer(mx - m(0.6)) - 4);
    rig(mx + mw - 1, nestY + m(0.4), mx + mw + m(0.6) + s * 7, deck - sheer(mx + m(0.6)) - 4);
  }
  for (let s = 0; s < 4; s++)
    for (let j = 0; j < 3; j++) {
      const y = nestY + m(0.4) + Math.round(((deck - nestY) * (j + 1)) / 4);
      segment(g, mx - m(0.15) * (j + 1) - 2, y, mx + mw + m(0.15) * (j + 1) + 1, y, C('tar', 4));
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

/** The rock with a face, half a ship's ribs and a broken mast against it, weed and barnacles at its foot. */
export function wreckRock(): Drawn {
  const W = m(5.2);
  const H = m(3.6);
  const g = tgrid(W, H);
  const rx = m(1.8);
  const ry = m(1.4);
  const cx = m(1.9);
  const cy = H - ry - 3;
  // The wreck's ribs and mast behind the rock, to its right.
  const ribX = cx + m(1.3);
  for (let n = 0; n < 4; n++) {
    const bx = ribX + n * m(0.55);
    const top = H - m(1.6) - n * m(0.2) + (n % 2) * 6;
    for (let y = top; y < H - 3; y++) {
      const curve = Math.round(Math.pow((H - 3 - y) / (H - 3 - top), 1.6) * m(0.35));
      for (let i = 0; i < 6; i++)
        put(g, bx + i - curve, y, C('tar', i === 0 ? 1 : i === 5 ? 5 : 2 + (y % 9 === 0 ? 1 : 0)));
    }
  }
  for (let i = 0; i < m(2.4); i++)
    for (let j = 0; j < 5; j++)
      put(
        g,
        ribX - 4 + i,
        H - m(0.75) + j - Math.round(i * 0.12),
        C('tar', j === 0 ? 1 : j === 4 ? 5 : 3),
      );
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
  // The rock: a lumpy solid, lit top-left, with cracks.
  const inside = (x: number, y: number) => {
    const a = (x - cx) / rx;
    const b = (y - cy) / ry;
    const lump = (fbm(x, y, 18, 4) - 0.5) * 0.5;
    return a * a + b * b * (b > 0 ? 0.6 : 1) < 1 + lump && y < H - 3;
  };
  solid(g, 0, 0, Math.round(cx + rx + 6), H, inside, 'rock', {
    base: 2.4,
    contrast: 1.5,
    radius: 10,
    jitter: 0.5,
    k: 7,
  });
  // Cracks, lit on their lower lip.
  for (let n = 0; n < 6; n++) {
    let x = cx - rx * 0.6 + hash(n, 1, 9) * rx * 1.2;
    let y = cy - ry * 0.5 + hash(n, 2, 9) * ry;
    for (let s = 0; s < 10; s++) {
      if (!inside(Math.round(x), Math.round(y))) break;
      put(g, x, y, C('rock', 5));
      if (inside(Math.round(x), Math.round(y) + 1)) put(g, x, y + 1, C('rock', 1));
      x += hash(n, s, 3) - 0.4;
      y += hash(s, n, 4) < 0.5 ? 1 : 0;
    }
  }
  // The face: two hollow eyes with brows that slope in sorrow, and a downturned mouth.
  const fy = cy - m(0.2);
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
  // Weed and barnacles at the tide line, foam at the foot.
  for (let x = 0; x < W; x++)
    for (let y = H - m(0.5); y < H - 3; y++) {
      const c = at(g, x, y);
      if (!isMat(c, 'rock')) continue;
      const v = fbm(x, y, 6, 8);
      if (v > 0.5) put(g, x, y, C('moss', v > 0.7 ? 3 : 5));
      else if (hash(x, y, 9) < 0.08) put(g, x, y, C('linen', 1));
      if (bayer(x, y) < (y - (H - m(0.5))) / m(0.5)) dim(g, x, y, 1);
    }
  for (let x = 0; x < W; x++)
    if (at(g, x, H - 4)) put(g, x, H - 3, C('sea', (x * 3) % 7 === 0 ? 1 : 0));
  return { grid: g, glows: [] };
}
