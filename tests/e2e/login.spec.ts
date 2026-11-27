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

// Link do convite / "esqueci a senha": a sessão chega no endereço e o app pede a senha antes de abrir
test('link do convite pede a senha; link vencido avisa no login', async ({ page }) => {
  await page.goto('./#access_token=x&type=invite');
  await expect(page.getByRole('heading', { name: 'Crie a sua senha' })).toBeVisible();
  await expect(page).not.toHaveURL(/access_token/);
  await page.getByLabel('Senha', { exact: true }).fill('curta');
  await page.getByLabel('Repita a senha').fill('curta');
  await page.getByRole('button', { name: 'Salvar e entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('Use pelo menos 8 caracteres.');
  await page.getByLabel('Senha', { exact: true }).fill('senha-nova-123');
  await page.getByLabel('Repita a senha').fill('senha-outra-123');
  await page.getByRole('button', { name: 'Salvar e entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText('As duas senhas não são iguais.');
  await page.getByLabel('Repita a senha').fill('senha-nova-123');
  await page.getByRole('button', { name: 'Salvar e entrar' }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();

  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem('repz.memoria.sessao', 'saiu'));
  await page.goto('./#error=access_denied&error_code=otp_expired');
  await page.reload(); // só o hash mudou: o goto não recarrega
  await expect(page.getByText('Esse link venceu ou já foi usado.', { exact: false })).toBeVisible();
});
