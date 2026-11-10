import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const plano = fs.readFileSync(new URL('../fixtures/raul.treino.txt', import.meta.url), 'utf8');

async function importarPlano(page: Page) {
  await page.goto('./#/plano');
  await page.getByRole('button', { name: 'Colar texto' }).click();
  await page.getByLabel('Cole o anexo do plano').fill(plano);
  await page.getByRole('button', { name: 'Ler texto' }).click();
  await page.getByRole('button', { name: 'Revisar plano' }).click();
  await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
  await expect(page.getByRole('heading', { name: 'Plano e dados' })).toBeVisible();
}

// Registra a série atual: carga (se informada), RIR 2 e Concluir. Sem carga, é o caso de 2 toques.
async function serie(page: Page, kg?: string) {
  if (kg) await page.getByLabel('kg', { exact: true }).fill(kg);
  await page.getByRole('group', { name: 'RIR', exact: true }).getByRole('button', { name: '2' }).click();
  await page.getByRole('button', { name: /^Concluir série \d+$/ }).click();
}

async function pularDescanso(page: Page) {
  await expect(page.getByRole('timer', { name: 'Descanso restante' })).toBeVisible();
  await page.getByRole('button', { name: 'Pular descanso' }).click();
}

const titulo = (page: Page, nome: string) =>
  expect(page.getByRole('heading', { level: 1, name: nome, exact: true })).toBeVisible();

// BRIEFING 15, E2E 3: Push completo com bi-set; recarregar no meio; continuar sem perder séries
test('treino Push completo com bi-set, recarregando no meio', async ({ page }) => {
  await importarPlano(page);
  await page.getByRole('link', { name: 'Treino' }).click();
  await expect(page.getByText('Próximo treino')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar treino' }).click();

  // Supino inclinado: 3 séries; da 2ª em diante a carga vem pré-preenchida (RIR + Concluir)
  await titulo(page, 'Supino inclinado com halteres');
  await serie(page, '24');
  await pularDescanso(page);
  await expect(page.getByLabel('kg', { exact: true })).toHaveValue('24');
  await serie(page);
  await pularDescanso(page);
  await serie(page);
  await pularDescanso(page);

  // Supino reto [barra / maquina]: sem histórico, a variante é obrigatória (D3)
  await titulo(page, 'Supino reto');
  await expect(page.getByRole('button', { name: 'Escolha a variante' })).toBeDisabled();
  await page.getByRole('button', { name: 'Supino reto barra' }).click();
  await serie(page, '60');
  await pularDescanso(page);
  await serie(page);
  await pularDescanso(page);
  await serie(page);
  await pularDescanso(page);

  await titulo(page, 'Desenvolvimento com halteres sentado');
  for (let i = 0; i < 3; i++) {
    await serie(page, i === 0 ? '18' : undefined);
    await pularDescanso(page);
  }

  // Bi-set: elevação → tríceps sem descanso; descanso no fim da rodada
  await titulo(page, 'Elevacao lateral');
  await expect(page.getByText('Rodada 1 de 4')).toBeVisible();
  await serie(page, '8');
  await titulo(page, 'Triceps na corda');
  await expect(page.getByRole('timer')).toHaveCount(0);
  await serie(page, '20');
  await pularDescanso(page);
  await titulo(page, 'Elevacao lateral');
  await expect(page.getByText('Rodada 2 de 4')).toBeVisible();
  await serie(page);

  // Fecha a aba no meio da rodada 2 e reabre
  await page.reload();
  await titulo(page, 'Triceps na corda');
  await expect(page.getByText('Rodada 2 de 4')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Séries feitas' }).getByRole('listitem')).toHaveCount(1);
  await serie(page);
  await pularDescanso(page);

  // Rodada 3 e rodada 4 (só elevação)
  await serie(page);
  await serie(page);
  await pularDescanso(page);
  await expect(page.getByText('Rodada 4 de 4')).toBeVisible();
  await titulo(page, 'Elevacao lateral');
  await serie(page);
  await pularDescanso(page);

  await titulo(page, 'Triceps');
  await page.getByRole('button', { name: 'Triceps frances' }).click();
  await serie(page, '15');
  await pularDescanso(page);
  await serie(page);

  // Descanso em andamento sobrevive ao recarregar (o fim é um timestamp)
  await page.reload();
  await pularDescanso(page);
  await serie(page);

  await titulo(page, 'Treino concluído');
  await expect(page.locator('.kpi').filter({ hasText: 'séries' })).toContainText('19');
  await expect(page.getByText('60 kg × 6 · 6 · 6')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();

  // Rotação: o próximo é o Pull
  await expect(page.getByText('Próximo treino')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible();
});

test('descartar treino pede confirmação e volta ao início', async ({ page }) => {
  await importarPlano(page);
  await page.goto('./#/treino');
  await page.getByRole('button', { name: 'Iniciar treino' }).click();
  await serie(page, '24');
  await pularDescanso(page);
  await page.getByRole('button', { name: 'Mais ações' }).click();
  await page.getByRole('button', { name: 'Descartar treino' }).click();
  await expect(page.getByRole('dialog', { name: 'Descartar treino?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Descartar treino' }).click();
  // treino descartado não conta para a rotação
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar treino' })).toBeVisible();
});
