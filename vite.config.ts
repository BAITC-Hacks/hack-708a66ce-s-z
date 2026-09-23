import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    {
      name: 'qala-third-party-notice',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          const license = readFileSync(
            new URL('./src/vendor/isocity/LICENSE', import.meta.url),
            'utf8',
          );
          return html.replace(
            '</body>',
            `<script type="text/plain" id="isocity-license">QALA city renderer adapts amilich/isometric-city, commit f1bbce8a93fae61d2446d1ece50309f26531d987.\n${license}</script></body>`,
          );
        },
      },
    },
  ],
  base: './',
  // Preserve the browser Host so the local API can verify the exact Origin.
  server: { proxy: { '/api': { target: 'http://127.0.0.1:8789', changeOrigin: false } } },
  build: { target: 'es2022' },
});
