import { defineConfig, devices } from '@playwright/test';

const PORTA = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORTA}/repz/`,
    trace: 'retain-on-failure',
    // Boas-vindas de instalação já dispensadas; tests/e2e/instalacao.spec.ts começa sem isso
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${PORTA}`,
          localStorage: [{ name: 'repz.boasVindas', value: 'dispensada' }],
        },
      ],
    },
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  // roda contra o build de produção, com o mesmo base do GitHub Pages
  webServer: {
    command: 'npm run build && npm run preview',
    url: `http://localhost:${PORTA}/repz/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
