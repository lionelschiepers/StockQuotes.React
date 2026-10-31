import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages (via actions/configure-pages) passes e.g. "/StockQuotes.React"
// or "" for a custom domain; Vite expects a trailing slash.
const trimTrailingSlashes = (value) => {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end--;
  return value.slice(0, end);
};
const base = `${trimTrailingSlashes(process.env.PAGES_BASE_PATH ?? '')}/`;

// GitHub Pages has no SPA fallback: serving the app shell as 404.html lets
// deep links such as /profile/ boot the router instead of showing a 404 page.
const spaFallback = () => ({
  name: 'spa-fallback-404',
  apply: 'build',
  async writeBundle({ dir }) {
    await copyFile(path.join(dir, 'index.html'), path.join(dir, '404.html'));
  }
});

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), spaFallback()],
  server: {
    port: 3000
  },
  build: {
    outDir: 'out',
    sourcemap: true,
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks stay cached across app deployments.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/
            },
            {
              name: 'react-router',
              test: /[\\/]node_modules[\\/]react-router[\\/]/
            },
            { name: 'auth0', test: /[\\/]node_modules[\\/]@auth0[\\/]/ }
          ]
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'clover', 'json']
    }
  }
});
