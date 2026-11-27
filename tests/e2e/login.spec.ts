import { expect, test } from '@playwright/test';

// v2 (D37): entrar e sair. Com o remoto em memória a conta de teste começa logada (os E2E da v1 seguem iguais).
test('sair mostra o login; senha errada avisa; entrar volta ao app com os dados', async ({ page }) => {
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'Boa noite' }).or(page.getByRole('heading', { level: 1 }).first()),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page
    .getByRole('complementary', { name: 'Navegação principal' })
    .getByRole('button', { name: 'Perfil' })
    .click();
  await expect(page.getByText('teste@repz.test')).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();

  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await page.getByLabel('E-mail').fill('teste@repz.test');
  await page.getByLabel('Senha').fill('errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');

  await page.getByLabel('Senha').fill('senha-de-teste');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
});
