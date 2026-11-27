import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { iniciarTreino, irPara } from './navegacao';

const plano = fs.readFileSync(new URL('../fixtures/raul.treino.txt', import.meta.url), 'utf8');

// Linhas que chegaram ao "servidor" (remoto em memória, guardado no localStorage do app)
const noServidor = (page: Page, tabela: string) =>
  page.evaluate(
    (t) =>
      Object.values(
        (JSON.parse(localStorage.getItem('repz.memoria.banco') ?? '{}') as Record<string, object>)[t] ?? {},
      ),
    tabela,
  );

async function serie(page: Page, kg: string, reps: string) {
  await page.getByLabel('kg', { exact: true }).fill(kg);
  await page.getByLabel('reps', { exact: true }).fill(reps);
  await page.getByRole('group', { name: 'RIR', exact: true }).getByRole('button', { name: '2' }).click();
  await page.getByRole('button', { name: /^Concluir série \d+$/ }).click();
}

// docs/v2/PLAN.md, V2: treino completo offline sincroniza depois, sem perda nem duplicidade
test('treino feito sem internet sobe quando a conexão volta', async ({ page, context }) => {
  await page.goto('./plano');
  await page.getByRole('button', { name: 'Colar texto' }).click();
  await page.getByLabel('Cole o anexo do plano').fill(plano);
  await page.getByRole('button', { name: 'Ler texto' }).click();
  await page.getByRole('button', { name: 'Revisar plano' }).click();
  await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
  await expect
    .poll(async () => (await noServidor(page, 'planos_treino')).length, { timeout: 15_000 })
    .toBe(1);

  await context.setOffline(true);
  await irPara(page, 'Início');
  await expect(page.getByText('Offline · salvo no celular')).toBeVisible();
  await iniciarTreino(page);
  await serie(page, '24', '10');
  await page.getByRole('button', { name: 'Pular descanso' }).click();
  await serie(page, '24', '9');
  await page.getByRole('button', { name: 'Pular descanso' }).click();
  await page.getByRole('button', { name: 'Mais ações' }).click();
  await page.getByRole('button', { name: 'Encerrar treino' }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  // nada subiu sem rede, e recarregar offline não perde nada
  expect(await noServidor(page, 'series')).toHaveLength(0);
  await page.reload();
  await expect(page.getByText('Offline · salvo no celular')).toBeVisible();

  await context.setOffline(false);
  await expect.poll(async () => (await noServidor(page, 'series')).length, { timeout: 20_000 }).toBe(2);
  expect(await noServidor(page, 'treinos')).toMatchObject([{ status: 'concluido' }]);
  await expect(page.getByText('Offline · salvo no celular')).toBeHidden();

  // no Perfil: tudo salvo na conta
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page
    .getByRole('complementary', { name: 'Navegação principal' })
    .getByRole('button', { name: 'Perfil' })
    .click();
  await expect(page.getByText('Tudo salvo na sua conta.')).toBeVisible();
});
