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

// Registra a série atual: carga e reps (se informadas), RIR 2 e Concluir. Sem elas, é o caso de 2 toques.
async function serie(page: Page, kg?: string, reps?: string) {
  if (kg) await page.getByLabel('kg', { exact: true }).fill(kg);
  if (reps) await page.getByLabel('reps', { exact: true }).fill(reps);
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
  // a série está gravada quando a tela passa ao tríceps
  await titulo(page, 'Triceps na corda');

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
  await expect(page.getByRole('timer')).toBeVisible();

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

// BRIEFING 15, E2E 4: sugestão ↑ no fim do treino e a carga pré-preenchida no treino seguinte
test('sugestão ↑ no fim e carga pré-preenchida no treino seguinte do exercício', async ({ page }) => {
  await importarPlano(page);
  await page.goto('./#/treino');
  await page.getByRole('button', { name: 'Iniciar treino' }).click();

  // Supino inclinado (6-10 reps): 24 kg × 10 · 10 · 10, topo da faixa
  await titulo(page, 'Supino inclinado com halteres');
  await serie(page, '24', '10');
  await pularDescanso(page);
  await expect(page.getByLabel('reps', { exact: true })).toHaveValue('10');
  await serie(page);
  await pularDescanso(page);
  await serie(page);
  await pularDescanso(page);

  // Encerra o treino pelo menu, sem fazer o resto
  await page.getByRole('button', { name: 'Mais ações' }).click();
  await page.getByRole('button', { name: 'Encerrar treino' }).click();
  await titulo(page, 'Treino concluído');
  const cartao = page
    .getByRole('list', { name: 'Para o próximo treino' })
    .getByRole('listitem', { name: 'Supino inclinado com halteres' });
  await expect(cartao).toContainText('↑');
  await expect(cartao).toContainText('24 kg × 10 · 10 · 10');
  await expect(cartao).toContainText('suba para 26 kg (menor salto possível: 2 kg)');
  await expect(page.getByText('Não feitos:')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();

  // A rotação sugere o Pull; troca para o Push e começa de novo
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible();
  await page.getByRole('button', { name: 'Trocar sessão' }).click();
  await page.getByRole('button', { name: /^Push/ }).click();
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar treino' }).click();

  // Carga sugerida pré-preenchida e reps no mínimo da faixa, em todas as séries
  await titulo(page, 'Supino inclinado com halteres');
  await expect(page.getByText('24 kg × 10 · 10 · 10')).toBeVisible(); // Última vez
  await expect(page.getByLabel('kg', { exact: true })).toHaveValue('26');
  await expect(page.getByLabel('reps', { exact: true })).toHaveValue('6');
  await serie(page);
  await pularDescanso(page);
  await expect(page.getByLabel('kg', { exact: true })).toHaveValue('26');
  await expect(page.getByLabel('reps', { exact: true })).toHaveValue('6');
});

test('botão Cardio do fim do treino conclui o treino e abre o cardio', async ({ page }) => {
  await importarPlano(page);
  await page.goto('./#/treino');
  await page.getByRole('button', { name: 'Iniciar treino' }).click();
  await serie(page, '24', '8');
  await pularDescanso(page);
  await page.getByRole('button', { name: 'Mais ações' }).click();
  await page.getByRole('button', { name: 'Encerrar treino' }).click();
  await page.getByRole('button', { name: 'Cardio' }).click();
  await titulo(page, 'Cardio');
  await page.getByRole('button', { name: 'Voltar ao início' }).click();
  // o treino entrou na rotação
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible();
});
