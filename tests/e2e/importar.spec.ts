import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const fixture = (nome: string) => fileURLToPath(new URL(`../fixtures/${nome}`, import.meta.url));

// BRIEFING 15, E2E 1: importar o PDF do Raul → revisar → salvar → continua salvo depois de recarregar
test('importa o PDF do Raul, revisa, salva e mantém após recarregar', async ({ page }) => {
  await page.goto('./#/plano');
  await expect(page.getByRole('heading', { name: 'Importar plano' })).toBeVisible();

  await page.getByLabel('Arquivo PDF do plano').setInputFiles(fixture('raul-com-anexo-ok.pdf'));
  await expect(page.getByText('Anexo TREINO v1 encontrado')).toBeVisible();
  await expect(page.getByText('5 sessões · 30 exercícios')).toBeVisible();
  await expect(page.getByText('TOTAL confere')).toBeVisible();
  await expect(page.getByText('Periodização: 12 semanas, 4 fases')).toBeVisible();
  await expect(page.getByText('2 avisos')).toBeVisible();

  await page.getByRole('button', { name: 'Revisar plano' }).click();
  await expect(page.getByRole('heading', { name: 'Revisar plano' })).toBeVisible();
  await expect(page.getByText('Hipertrofia natural 5x')).toBeVisible();
  await expect(page.getByLabel('Início do bloco')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  await page.getByLabel('Início do bloco').fill('2026-11-02');

  await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
  await expect(page.getByRole('heading', { name: 'Plano e dados' })).toBeVisible();
  await expect(page.getByText('Plano salvo e ativo')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Plano e dados' })).toBeVisible();
  await expect(page.getByText('Hipertrofia natural 5x')).toBeVisible();
  await expect(page.getByLabel('Início do bloco')).toHaveValue('2026-11-02');

  await page.getByRole('link', { name: 'Treino' }).click();
  await expect(page.getByText(/Semana \d+ de 12/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible();
});

// BRIEFING 15, E2E 2: PDF sem anexo → erro claro, nada salvo
test('PDF sem anexo mostra o erro e não salva nada', async ({ page }) => {
  await page.goto('./#/plano');
  await page.getByLabel('Arquivo PDF do plano').setInputFiles(fixture('plano-original-raul.pdf'));
  await expect(page.getByText('Anexo TREINO v1 não encontrado')).toBeVisible();
  await expect(page.getByText('Marcador #TREINO-INICIO não encontrado')).toBeVisible();
  await expect(page.getByText('Peça à sua IA para corrigir o anexo')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Revisar plano' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Importar plano' })).toBeVisible();
});

test('colar texto com erro aponta a linha', async ({ page }) => {
  await page.goto('./#/plano');
  await page.getByRole('button', { name: 'Colar texto' }).click();
  await page
    .getByLabel('Cole o anexo do plano')
    .fill('#TREINO-INICIO v1\nPLANO: X | Ana\nSESSAO: A\nEX: Hip thrust | 3 | 8-12\n#TREINO-FIM');
  await page.getByRole('button', { name: 'Ler texto' }).click();
  await expect(page.getByText('Linha 3:')).toBeVisible();
  await expect(page.getByText('Faltam campos')).toBeVisible();
});

test('a semana pode ser ajustada com − e +', async ({ page }) => {
  await page.goto('./#/plano');
  await page.getByRole('button', { name: 'Colar texto' }).click();
  await page
    .getByLabel('Cole o anexo do plano')
    .fill(
      '#TREINO-INICIO v1\nPLANO: X | Ana\nBLOCO: 4\nFASE: 1-4 | rir 2-3\nSESSAO: A\nEX: Supino | 3 | 8-12 | 90s\nTOTAL: 1 sessoes | 1 exercicios\n#TREINO-FIM',
    );
  await page.getByRole('button', { name: 'Ler texto' }).click();
  await page.getByRole('button', { name: 'Revisar plano' }).click();
  await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
  await expect(page.getByRole('heading', { name: 'Plano e dados' })).toBeVisible();
  await page
    .getByLabel('Início do bloco')
    .fill(await page.evaluate(() => new Date().toLocaleDateString('sv-SE')));
  await page.getByLabel('Início do bloco').blur();
  await expect(page.getByText('Semana 1 de 4 · Fase 1 · RIR 2-3')).toBeVisible();
  await page.getByRole('button', { name: 'Próxima semana' }).click();
  await expect(page.getByText('Semana 2 de 4 · Fase 1 · RIR 2-3')).toBeVisible();
  await page.getByRole('button', { name: 'Semana anterior' }).click();
  await expect(page.getByText('Semana 1 de 4 · Fase 1 · RIR 2-3')).toBeVisible();
});
