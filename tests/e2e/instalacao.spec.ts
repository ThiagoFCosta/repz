import { expect, test } from '@playwright/test';

// Primeira visita, sem as boas-vindas dispensadas
test.use({ storageState: { cookies: [], origins: [] } });

// BRIEFING 11 e ARCHITECTURE 9.4: boas-vindas fora do app instalado, lembrete depois de dispensar
test('boas-vindas com instruções, dispensar e reabrir pelo lembrete', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Bem-vindo ao REPZ' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Android (Chrome)' })).toBeVisible();
  await expect(page.getByText('Instalar app', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'iPhone (Safari)' })).toBeVisible();
  await expect(page.getByText('Adicionar à Tela de Início', { exact: true })).toBeVisible();
  // sem beforeinstallprompt, sem botão
  await expect(page.getByRole('button', { name: 'Instalar app' })).toHaveCount(0);
  await expect(page.getByRole('navigation')).toHaveCount(0);

  await page.getByRole('button', { name: 'Continuar no navegador' }).click();
  await expect(page.getByText('Comece pelo seu plano')).toBeVisible();
  const lembrete = page.getByRole('complementary', { name: 'Lembrete de instalação' });
  await expect(lembrete).toContainText('Instale o app');

  // Dispensada continua dispensada depois de recarregar
  await page.reload();
  await expect(page.getByText('Comece pelo seu plano')).toBeVisible();
  await lembrete.getByRole('button', { name: 'Como instalar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Instalar o REPZ' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(lembrete).toBeVisible();
});

test('com beforeinstallprompt, o botão Instalar abre o pedido do navegador', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Bem-vindo ao REPZ' })).toBeVisible();

  // O Chromium headless não dispara o evento; simula o que o Chrome do Android faz
  const disparar = () =>
    page.evaluate(() => {
      const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & Record<string, unknown>;
      e.prompt = () => {
        (window as unknown as { pedido: number }).pedido = 1;
        return Promise.resolve();
      };
      e.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    });
  expect(await disparar()).toBe(true);
  await page.getByRole('button', { name: 'Instalar app' }).click();
  expect(await page.evaluate(() => (window as unknown as { pedido?: number }).pedido)).toBe(1);
  // recusado: o evento não serve mais; a tela continua com as instruções
  await expect(page.getByRole('button', { name: 'Instalar app' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Continuar no navegador' }).click();
  await disparar();
  const lembrete = page.getByRole('complementary', { name: 'Lembrete de instalação' });
  await expect(lembrete.getByRole('button', { name: 'Instalar' })).toBeVisible();

  // Instalado: o lembrete some
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(lembrete).toHaveCount(0);
});
