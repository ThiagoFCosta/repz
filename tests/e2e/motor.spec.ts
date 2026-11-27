import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { iniciarTreino } from './navegacao';

const plano = fs.readFileSync(new URL('../fixtures/raul.treino.txt', import.meta.url), 'utf8');

async function serie(page: Page, kg?: string, reps?: string) {
  if (kg) await page.getByLabel('kg', { exact: true }).fill(kg);
  if (reps) await page.getByLabel('reps', { exact: true }).fill(reps);
  await page.getByRole('group', { name: 'RIR', exact: true }).getByRole('button', { name: '2' }).click();
  await page.getByRole('button', { name: /^Concluir série \d+$/ }).click();
}
const pular = (page: Page) => page.getByRole('button', { name: 'Pular descanso' }).click();
const servidor = (page: Page, tabela: string) =>
  page.evaluate(
    (t) => Object.values(JSON.parse(localStorage.getItem('repz.memoria.banco') ?? '{}')[t] ?? {}),
    tabela,
  );

// PLAN V4 e BRIEFING-v2 8.1 (P1): check-in com sono baixo → nada de aumento no dia; o log guarda a sugestão
test('com sono baixo no check-in, a sugestão do dia não aumenta a carga', async ({ page }) => {
  await page.goto('./plano');
  await page.getByRole('button', { name: 'Colar texto' }).click();
  await page.getByLabel('Cole o anexo do plano').fill(plano);
  await page.getByRole('button', { name: 'Ler texto' }).click();
  await page.getByRole('button', { name: 'Revisar plano' }).click();
  await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
  await page.goto('./');

  // 1º treino (sono normal): supino inclinado 24 × 10 · 10 · 10, topo da faixa
  await iniciarTreino(page);
  await serie(page, '24', '10');
  await pular(page);
  await serie(page);
  await pular(page);
  await serie(page);
  await pular(page);
  await page.getByRole('button', { name: 'Mais ações' }).click();
  await page.getByRole('button', { name: 'Encerrar treino' }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();

  // 2º treino do Push: check-in com 5 h de sono
  await page.getByRole('button', { name: 'Trocar sessão' }).click();
  await page.getByRole('button', { name: /^Push/ }).click();
  await page.getByRole('button', { name: 'Iniciar treino' }).click();
  const folha = page.getByRole('dialog', { name: 'Antes de começar' });
  for (let i = 0; i < 4; i++) await folha.getByRole('button', { name: 'Menos meia hora' }).click();
  await expect(folha.getByLabel('Horas de sono')).toHaveText('5 h');
  await folha.getByRole('button', { name: 'Começar treino' }).click();

  // Sem o check-in seria ↑ 26 kg; com prontidão baixa, mantém 24 kg e explica
  await expect(page.getByLabel('kg', { exact: true })).toHaveValue('24');
  await expect(page.getByText('Prontidão baixa hoje: mantenha 24 kg.', { exact: false })).toBeVisible();

  // O log do motor chegou ao servidor com a regra P1 e a prontidão do dia
  await expect
    .poll(
      async () =>
        (await servidor(page, 'sugestoes')).filter((s) => (s as { regra: string }).regra === 'P1').length,
      {
        timeout: 15_000,
      },
    )
    .toBeGreaterThan(0);
  const p1 = (await servidor(page, 'sugestoes')).find((s) => (s as { regra: string }).regra === 'P1') as {
    carga: number;
    prontidao: { baixa: boolean; sono: number };
  };
  expect(p1).toMatchObject({ carga: 24, prontidao: { baixa: true, sono: 5 } });
  // O 1º treino já foi fechado: aceita/editada com a carga usada
  const fechadas = (await servidor(page, 'sugestoes')).filter(
    (s) => (s as { desfecho: string | null }).desfecho,
  );
  expect(fechadas.length).toBeGreaterThan(0);
});
