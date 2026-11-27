import { expect, test, type Page } from '@playwright/test';

const servidor = (page: Page, tabela: string) =>
  page.evaluate(
    (t) => Object.values(JSON.parse(localStorage.getItem('repz.memoria.banco') ?? '{}')[t] ?? {}),
    tabela,
  );

function data(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function registrarPeso(page: Page, kg: string, diasAtras: number) {
  await page.getByRole('button', { name: 'Registrar peso' }).click();
  const folha = page.getByRole('dialog', { name: 'Registrar peso' });
  await folha.getByLabel('Peso (kg)').fill(kg);
  await folha.getByLabel('Data').fill(data(diasAtras));
  await folha.getByRole('button', { name: 'Salvar peso' }).click();
  await expect(folha).toBeHidden();
}

// PLAN V5: média de 7 dias, tendência de 4 semanas, medidas e bioimpedância; sem relógio, só peso e fita
test('Corpo: peso com média e tendência, medidas e bioimpedância', async ({ page }) => {
  await page.goto('./corpo');
  await expect(page.getByText('Registre seu peso para ver a média.')).toBeVisible();
  // Sem bioimpedância registrada, nenhum card do relógio
  await expect(page.getByText('Gordura · relógio')).toBeHidden();

  // 7 pesagens em 3 semanas, caindo 0,3 kg por semana (0,1 a cada 2-3 dias)
  const pesos: [string, number][] = [
    ['84,0', 20],
    ['83,9', 17],
    ['83,8', 14],
    ['83,7', 10],
    ['83,6', 7],
    ['83,5', 3],
    ['83,4', 0],
  ];
  for (const [kg, dias] of pesos) await registrarPeso(page, kg, dias);

  // média de 7 dias: hoje, há 3 e há 7 dias ficam fora? há 7 dias fica fora (janela de 7 dias termina hoje)
  // (83,4 + 83,5) / 2 = 83,45 → 83,5
  await expect(page.getByLabel('Peso, média de 7 dias')).toContainText('83,5');
  await expect(page.getByLabel('Peso, média de 7 dias')).toContainText('kg/semana');
  await expect(page.getByRole('img', { name: /^Peso nas últimas 4 semanas/ })).toBeVisible();

  // Medidas com fita
  await page.getByRole('button', { name: 'Medidas' }).first().click();
  const fita = page.getByRole('dialog', { name: 'Medidas com fita' });
  await fita.getByLabel('Cintura (cm)').fill('89,5');
  await fita.getByLabel('Braço (cm)').fill('35');
  await fita.getByRole('button', { name: 'Salvar medidas' }).click();
  await expect(page.getByText('Cintura · fita')).toBeVisible();
  await expect(page.getByText('89,5')).toBeVisible();

  // Bioimpedância do relógio: aparece com o aviso de precisão
  await page.getByRole('button', { name: 'Registrar bioimpedância' }).click();
  const bio = page.getByRole('dialog', { name: 'Bioimpedância do relógio' });
  await bio.getByLabel('Gordura (%)').fill('24,1');
  await bio.getByLabel('Músculo esquelético (kg)').fill('36,2');
  await bio.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Gordura · relógio')).toBeVisible();
  await expect(page.getByText('use como tendência', { exact: false })).toBeVisible();

  // Tudo sincronizado com o servidor
  await expect.poll(async () => (await servidor(page, 'medicoes_peso')).length, { timeout: 15_000 }).toBe(7);
  await expect.poll(async () => (await servidor(page, 'medicoes_fita')).length, { timeout: 15_000 }).toBe(2);
  await expect.poll(async () => (await servidor(page, 'medicoes_bio')).length, { timeout: 15_000 }).toBe(1);
});
