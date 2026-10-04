import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'jsdom',
  },
});
