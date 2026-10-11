import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The home-screen icons `npm run icons` writes, and what points at them.
// Tests run from the repository root.
const file = (path: string): Buffer => readFileSync(resolve(process.cwd(), path));

/** A PNG's width and height, from its header. */
const pngSize = (path: string): [number, number] => {
  const png = file(path);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

describe('the home-screen icons', () => {
  it('are the sizes their names and links say, the iPhone one at 180', () => {
    expect(pngSize('public/icons/apple-touch-icon.png')).toEqual([180, 180]);
    expect(pngSize('public/icons/icon-192.png')).toEqual([192, 192]);
    expect(pngSize('public/icons/icon-512.png')).toEqual([512, 512]);
    expect(pngSize('public/icons/icon-maskable-192.png')).toEqual([192, 192]);
    expect(pngSize('public/icons/icon-maskable-512.png')).toEqual([512, 512]);
    expect(pngSize('public/icons/favicon-32.png')).toEqual([32, 32]);
    expect(file('public/icons/favicon.svg').toString()).toMatch(/^<svg [^>]*viewBox="0 0 36 36"/);
  });

  it('are named in the manifest for each purpose, every file there', () => {
    const manifest = JSON.parse(file('public/manifest.webmanifest').toString()) as {
      icons: { src: string; sizes: string; purpose: string }[];
      theme_color: string;
      background_color: string;
    };
    for (const purpose of ['any', 'maskable']) {
      const sizes = manifest.icons.filter((icon) => icon.purpose === purpose).map((i) => i.sizes);
      expect(sizes, purpose).toEqual(['192x192', '512x512']);
    }
    for (const icon of manifest.icons) {
      const [w, h] = pngSize(`public${icon.src}`);
      expect(`${w}x${h}`).toBe(icon.sizes);
    }
    // The maskable art is its own file: the plain one's ship would be cut by a launcher's mask.
    expect(
      manifest.icons.filter((i) => i.purpose === 'maskable').every((i) => /maskable/.test(i.src)),
    ).toBe(true);
    const html = file('index.html').toString();
    expect(html).toContain('<meta name="theme-color" content="' + manifest.theme_color + '"');
    expect(html).toContain('href="/icons/apple-touch-icon.png"');
    expect(html).toContain('sizes="180x180"');
  });
});
