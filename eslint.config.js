import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import noOnlyTests from 'eslint-plugin-no-only-tests';

// The layering in CLAUDE.md, held by the linter rather than by memory: game
// rules never reach for anything that draws or shows.
const layer = (files, banned, why) => ({
  files,
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: [{ group: banned.map((dir) => `**/${dir}/**`), message: why }] },
    ],
  },
});

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'public/sw.js'] },
  ...tseslint.configs.recommended,
  layer(
    ['src/core/**'],
    ['data', 'persistence', 'ui', 'scene', 'art'],
    'core is pure game rules and imports nothing outside itself.',
  ),
  layer(
    ['src/data/**', 'src/persistence/**'],
    ['ui', 'scene', 'art'],
    'Only ui and scene may import art, and nothing below them imports ui or scene.',
  ),
  layer(
    ['src/art/**'],
    ['core', 'data', 'persistence', 'ui', 'scene'],
    'art knows nothing about the game.',
  ),
  {
    files: ['tests/**/*.ts'],
    plugins: { 'no-only-tests': noOnlyTests },
    rules: { 'no-only-tests/no-only-tests': 'error' },
  },
  eslintConfigPrettier,
);
