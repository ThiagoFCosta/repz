import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serve o app em /<repositório>/
const BASE = '/repz/';

// CSP só no build: o servidor de desenvolvimento usa scripts inline e websocket (HMR).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function csp(): Plugin {
  return {
    name: 'repz-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<!--CSP-->', `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

// O jsPDF tem a URL de um script de CDN (pdfobject) para output('pdfobjectnewwindow'), que o REPZ não
// usa. Tirá-la do build garante que nenhum caminho do código aponte para fora (BRIEFING seção 11).
function jspdfSemCdn(): Plugin {
  const URL_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js';
  return {
    name: 'repz-jspdf-sem-cdn',
    transform(code, id) {
      if (!id.includes('/node_modules/jspdf/') || !code.includes(URL_CDN)) return null;
      return { code: code.replace(URL_CDN, ''), map: null };
    },
  };
}

// Dependências opcionais do jsPDF que o REPZ não usa (ver src/dados/vazio)
const VAZIO = fileURLToPath(new URL('./src/dados/vazio/index.ts', import.meta.url));

export default defineConfig({
  base: BASE,
  resolve: {
    alias: { html2canvas: VAZIO, canvg: VAZIO, dompurify: VAZIO },
  },
  plugins: [
    preact(),
    csp(),
    jspdfSemCdn(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'REPZ · diário de treino',
        short_name: 'REPZ',
        description: 'Registre seu treino e receba sugestões de carga. Funciona offline.',
        lang: 'pt-BR',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d1117',
        theme_color: '#0d1117',
        icons: [
          { src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,woff2,png,svg,webmanifest}'],
        // o worker do pdf.js (M1) tem ~1,4 MB; o chunk do jsPDF (M6), ~400 KB
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // sem runtimeCaching: nada é buscado fora do precache
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/dados/**/*.test.ts', 'tests/pdf/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/dominio/**/*.ts'],
      thresholds: { lines: 95 },
    },
  },
});
