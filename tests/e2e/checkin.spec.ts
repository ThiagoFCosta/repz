import fs from 'node:fs';
import { expect, test } from '@playwright/test';

const plano = fs.readFileSync(new URL('../fixtures/raul.treino.txt', import.meta.url), 'utf8');

// BRIEFING-v2 7.3 e PLAN V3: check-in em ≤ 2 toques, sono em passos de 0,5 h, disposição opcional
test('check-in antes do treino: ajustar o sono, escolher a disposição e começar', async ({ page }) => {
  await page.goto('./plano');
  await page.getByRole('button', { name: 'Colar texto' }).click();
  await page.getByLabel('Cole o anexo do plano').fill(plano);
  await page.getByRole('button', { name: 'Ler texto' }).click();
  await page.getByRole('button', { name: 'Revisar plano' }).click();
  await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
  await page.goto('./');

  await page.getByRole('button', { name: 'Iniciar treino' }).click();
  const folha = page.getByRole('dialog', { name: 'Antes de começar' });
  await expect(folha.getByLabel('Horas de sono')).toHaveText('7 h'); // sem histórico: 7 h
  await folha.getByRole('button', { name: 'Menos meia hora' }).click();
  await folha.getByRole('button', { name: 'Menos meia hora' }).click();
  await expect(folha.getByLabel('Horas de sono')).toHaveText('6 h');
  await folha
    .getByRole('group', { name: /Disposição/ })
    .getByRole('button', { name: '2' })
    .click();
  await folha.getByRole('button', { name: 'Começar treino' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Supino inclinado com halteres' })).toBeVisible();

  // gravado e sincronizado (remoto em memória)
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Object.values(JSON.parse(localStorage.getItem('repz.memoria.banco') ?? '{}').checkins ?? {}),
        ),
      { timeout: 15_000 },
    )
    .toMatchObject([{ sono_horas: 6, disposicao: 2, pulado: false }]);
});
