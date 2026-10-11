/**
 * The name set as a logotype, two ways (and a carved variant of the second):
 *
 * - Caps lockup: HEARTH over HARBOUR in gilded Roman capitals, a small cream
 *   uncial ampersand between them on a short rule. Formal, heraldic.
 * - Uncial lockup: "Hearth" then "& Harbour" in the broad-nib hand, cream
 *   with a red shadow. Warmer, a storybook's title page.
 */
import { tgrid, type TGrid } from '../../src/art/town2/cells';
import { capsWord, uncialGlyph, uncialWord } from './glyphs';
import { stampF, treat, type Framed, type Treatment } from './logo';
import { X, type XMat } from './pal';

const memo = new Map<string, Framed>();
const keep = (key: string, make: () => Framed): Framed => {
  let f = memo.get(key);
  if (!f) memo.set(key, (f = crop(make())));
  return f;
};

/** Crops a lockup to the box round what is drawn, so placing it places its ink. */
function crop(f: Framed): Framed {
  const { w, h, d } = f.g;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[y * w + x]) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return f;
  const g = tgrid(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) g.d[(y - y0) * g.w + x - x0] = d[y * w + x] as number;
  return { g, ox: 0, oy: 0 };
}

function place(parts: { f: Framed; x: number; y: number }[], w: number, h: number): Framed {
  const g = tgrid(w, h);
  for (const p of parts) stampF(g, p.f, p.x, p.y);
  return { g, ox: 0, oy: 0 };
}

export interface CapsOpts {
  cap?: number;
  treatment?: Treatment;
  rim?: [XMat, number];
  drop?: number;
  dropCell?: [XMat, number];
  amp?: Treatment;
}

/** HEARTH / & / HARBOUR, centred on one another. */
export function lockupCaps(o: CapsOpts = {}): Framed {
  const cap = o.cap ?? 40;
  const key = `caps ${JSON.stringify(o)}`;
  return keep(key, () => {
    const t = o.treatment ?? 'gilt';
    const rim = o.rim ?? (['navy', 6] as [XMat, number]);
    const dropCell = o.dropCell ?? (['navy', 7] as [XMat, number]);
    const drop = o.drop ?? 3;
    const a = treat(capsWord('HEARTH', cap), t, { rim, rimW: 1, drop, dropCell });
    const b = treat(capsWord('HARBOUR', cap), t, { rim, rimW: 1, drop, dropCell });
    const ampM = uncialGlyph('&', Math.round(cap * 0.42));
    const amp = treat(ampM, o.amp ?? 'cream', { rim, rimW: 1, drop: 2, dropCell });
    const w = Math.max(a.g.w, b.g.w);
    // The ampersand sits on a short rule between the lines.
    const ampH = Math.round(cap * 0.55);
    const gap = 2;
    const h = a.g.h + ampH + b.g.h + gap * 2;
    const out = place(
      [
        { f: a, x: Math.round((w - a.g.w) / 2), y: 0 },
        { f: b, x: Math.round((w - b.g.w) / 2), y: a.g.h + ampH + gap * 2 },
      ],
      w,
      h,
    );
    // The rule either side of the ampersand: gold over its dark line.
    const ry = a.g.h + gap + Math.round(ampH / 2);
    const ruleHalf = Math.round(w * 0.3);
    const cx = Math.round(w / 2);
    for (let x = cx - ruleHalf; x <= cx + ruleHalf; x++) {
      if (Math.abs(x - cx) < Math.round(cap * 0.42)) continue;
      const end = Math.abs(x - cx) > ruleHalf - 3;
      out.g.d[(ry - 1) * w + x] = X('navy', 6);
      out.g.d[ry * w + x] = X('gilt', end ? 3 : 1);
      out.g.d[(ry + 1) * w + x] = X('gilt', end ? 5 : 4);
      out.g.d[(ry + 2) * w + x] = X('navy', 6);
    }
    // A lozenge at each end of the rule.
    for (const ex of [cx - ruleHalf - 3, cx + ruleHalf + 3])
      for (let j = -3; j <= 3; j++)
        for (let i = -3; i <= 3; i++) {
          const d = Math.abs(i) + Math.abs(j);
          if (d > 3) continue;
          const idx = (ry + j) * w + ex + i;
          if (idx < 0 || ex + i < 0 || ex + i >= w) continue;
          out.g.d[idx] = d === 3 ? X('navy', 6) : X('gilt', i + j < 0 ? 1 : 3);
        }
    stampF(
      out.g,
      amp,
      cx - Math.round(amp.g.w / 2),
      a.g.h + gap + Math.round(ampH / 2) - Math.round(amp.g.h * 0.58),
    );
    return out;
  });
}

export interface UncialOpts {
  xh?: number;
  treatment?: Treatment;
  rim?: [XMat, number];
  drop?: number;
  dropCell?: [XMat, number];
  /** Indent of the second line, in pixels. */
  indent?: number;
  /** One line instead of two. */
  single?: boolean;
}

/** "Hearth" / "& Harbour" in the uncial hand, the second line set in. */
export function lockupUncial(o: UncialOpts = {}): Framed {
  const xh = o.xh ?? 26;
  const key = `uncial ${JSON.stringify(o)}`;
  return keep(key, () => {
    const t = o.treatment ?? 'cream';
    const rim = o.rim ?? (['navy', 6] as [XMat, number]);
    const dropCell = o.dropCell ?? (['banner', 5] as [XMat, number]);
    const drop = o.drop ?? 3;
    const opts = { rim, rimW: 1, drop, dropCell };
    const a = treat(uncialWord('Hearth', xh), t, opts);
    const amp = treat(uncialGlyph('&', Math.round(xh * 0.9)), t, opts);
    const b = treat(uncialWord('Harbour', xh), t, opts);
    if (o.single) {
      const gap = Math.round(xh * 0.3);
      const w = a.g.w + amp.g.w + b.g.w + gap * 2;
      const h = Math.max(a.g.h, b.g.h);
      return place(
        [
          { f: a, x: 0, y: 0 },
          { f: amp, x: a.g.w + gap, y: Math.round(xh * 0.16) + 2 },
          { f: b, x: a.g.w + amp.g.w + gap * 2, y: 0 },
        ],
        w,
        h,
      );
    }
    const indent = o.indent ?? Math.round(xh * 1.4);
    const line2 = amp.g.w + Math.round(xh * 0.25) + b.g.w;
    const w = Math.max(a.g.w, indent + line2);
    // The second line tucks up under the first's descender space.
    const lift = Math.round(xh * 0.95);
    const h = a.g.h + b.g.h - lift;
    return place(
      [
        { f: a, x: 0, y: 0 },
        { f: amp, x: indent, y: a.g.h - lift + Math.round(xh * 0.16) + 2 },
        { f: b, x: indent + amp.g.w + Math.round(xh * 0.25), y: a.g.h - lift },
      ],
      w,
      h,
    );
  });
}

/** A framed lockup stamped centred at row y. */
export function stampCentred(g: TGrid, f: Framed, y: number, dx = 0): void {
  stampF(g, f, Math.round((g.w - f.g.w) / 2) + dx, y);
}
