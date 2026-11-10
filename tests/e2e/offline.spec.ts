import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

test('abre e importa PDF offline depois da primeira visita', async ({ page, context }) => {
  // Qualquer requisição para fora da origem é um defeito de privacidade (BRIEFING seção 11)
  const externas: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:4173/')) externas.push(r.url());
  });

  await page.goto('./');
  await expect(page.getByText('Comece pelo seu plano')).toBeVisible();

  // Espera o service worker instalar o precache. Em modo "prompt" ele só controla a página
  // depois de um recarregamento (sem clientsClaim), como acontece no celular.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Comece pelo seu plano')).toBeVisible();

  await page.getByRole('link', { name: 'Plano' }).click();
  await expect(page.getByRole('heading', { name: 'Importar plano' })).toBeVisible();

  // pdf.js e o worker vêm do precache: a importação funciona sem rede (BRIEFING 2.2)
  await page
    .getByLabel('Arquivo PDF do plano')
    .setInputFiles(fileURLToPath(new URL('../fixtures/raul-com-anexo-ok.pdf', import.meta.url)));
  await expect(page.getByText('5 sessões · 30 exercícios')).toBeVisible();

  expect(externas).toEqual([]);
});

test('manifest instalável', async ({ page }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await page.request.get(new URL(href!, page.url()).toString())).json();
  expect(manifest).toMatchObject({
    short_name: 'REPZ',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'pt-BR',
  });
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
});
