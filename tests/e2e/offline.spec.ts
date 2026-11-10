import { expect, test } from '@playwright/test';

test('abre offline depois da primeira visita', async ({ page, context }) => {
  // Qualquer requisição para fora da origem é um defeito de privacidade (BRIEFING seção 11)
  const externas: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:4173/')) externas.push(r.url());
  });

  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Treino' })).toBeVisible();

  // Espera o service worker instalar o precache. Em modo "prompt" ele só controla a página
  // depois de um recarregamento (sem clientsClaim), como acontece no celular.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Treino' })).toBeVisible();

  await page.getByRole('link', { name: 'Plano' }).click();
  await expect(page.getByRole('heading', { name: 'Plano' })).toBeVisible();
  await expect(page.getByText('Seus dados ficam só neste celular')).toBeVisible();

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
