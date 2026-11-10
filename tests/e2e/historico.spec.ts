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

async function serie(page: Page, kg?: string, reps?: string) {
  if (kg) await page.getByLabel('kg', { exact: true }).fill(kg);
  if (reps) await page.getByLabel('reps', { exact: true }).fill(reps);
  await page.getByRole('group', { name: 'RIR', exact: true }).getByRole('button', { name: '2' }).click();
  await page.getByRole('button', { name: /^Concluir série \d+$/ }).click();
}

const titulo = (page: Page, nome: string) =>
  expect(page.getByRole('heading', { level: 1, name: nome, exact: true })).toBeVisible();

// BRIEFING 9.7 e 9.8: cardio sem treino de força; Histórico com o gráfico; editar uma série muda o gráfico
test('registrar cardio e ver o Histórico com o gráfico', async ({ page }) => {
  await importarPlano(page);

  // Cardio em qualquer dia, sem treino de força
  await page.goto('./#/treino');
  await expect(page.getByText('0 de 2')).toBeVisible();
  await page.getByRole('button', { name: 'Registrar cardio' }).click();
  await titulo(page, 'Cardio');
  await page.getByRole('group', { name: 'Tipo' }).getByRole('button', { name: 'Remo' }).click();
  await expect(page.getByText('30-40 min · FC 115-135 · z2 · 2x por semana')).toBeVisible();
  await page.getByLabel('Duração (min)').fill('25');
  await page.getByLabel('FC média (bpm)').fill('128');
  await expect(page.getByText('! Duração abaixo da meta')).toBeVisible();
  await expect(page.getByText('✓ FC dentro da meta')).toBeVisible();
  await page.getByLabel('Duração (min)').fill('35');
  await expect(page.getByText('✓ Duração dentro da meta')).toBeVisible();
  await page.getByRole('button', { name: 'Registrar cardio' }).click();
  await expect(page.getByText('1 de 2')).toBeVisible();

  // Um treino curto: supino inclinado 24 × 10 e 24 × 8, RIR 2
  await page.getByRole('button', { name: 'Iniciar treino' }).click();
  await titulo(page, 'Supino inclinado com halteres');
  await serie(page, '24', '10');
  await page.getByRole('button', { name: 'Pular descanso' }).click();
  await serie(page, '24', '8');
  await page.getByRole('button', { name: 'Pular descanso' }).click();
  await page.getByRole('button', { name: 'Mais ações' }).click();
  await page.getByRole('button', { name: 'Encerrar treino' }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible();

  // Histórico: o exercício feito por último, KPIs e gráfico
  await page.getByRole('link', { name: 'Histórico' }).click();
  await expect(page.getByRole('button', { name: /Supino inclinado com halteres/ })).toBeVisible();
  // 24 × (1 + (10 + 2) / 30) = 33,6
  await expect(page.locator('.kpi').first()).toContainText('33,6 kg');
  await expect(page.locator('.kpi').nth(1)).toContainText('24 kg × 10');
  const grafico = page.getByRole('img', { name: /^1RM estimado por semana: 1 semana, de 33,6 kg/ });
  await expect(grafico).toBeVisible();
  await expect(grafico.locator('.grafico-ponto')).toHaveCount(1);
  await expect(page.getByRole('list', { name: 'Treinos do exercício' })).toContainText('24 kg × 10 · 8');

  // Seletor com busca
  await page.getByRole('button', { name: /Trocar/ }).click();
  await page.getByLabel('Buscar exercício').fill('supino incl');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Supino inclinado com halteres' }),
  ).toBeVisible();
  await page.getByLabel('Buscar exercício').fill('agachamento');
  await expect(page.getByText('Nenhum exercício com esse nome.')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();

  // Tocar no treino abre o treino completo; corrigir a 1ª série muda o gráfico
  await page.getByRole('list', { name: 'Treinos do exercício' }).getByRole('link').first().click();
  await titulo(page, 'Push');
  await page.getByRole('button', { name: 'Editar série 1' }).click();
  await page.getByLabel('kg').fill('26');
  await page.getByRole('button', { name: 'Salvar série 1' }).click();
  await expect(page.getByRole('button', { name: 'Editar série 1' })).toContainText('26 kg');
  await page.getByRole('link', { name: 'Histórico' }).click();
  // 26 × 1,4 = 36,4
  await expect(page.locator('.kpi').first()).toContainText('36,4 kg');

  // Visão Treinos: o treino e o cardio, em ordem cronológica
  await page.getByRole('link', { name: 'Treinos' }).click();
  const lista = page.getByRole('list', { name: 'Treinos e cardio' });
  await expect(lista.getByRole('listitem')).toHaveCount(2);
  await expect(lista.getByRole('listitem').first()).toContainText('Push');
  await expect(lista.getByRole('listitem').nth(1)).toContainText('Remo');
  await expect(lista.getByRole('listitem').nth(1)).toContainText('✓ dentro da meta');

  // Excluir o cardio, com confirmação
  await lista.getByRole('link', { name: /Remo/ }).click();
  await titulo(page, 'Editar cardio');
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir cardio' }).click();
  await expect(lista.getByRole('listitem')).toHaveCount(1);
});
