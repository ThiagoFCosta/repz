// Fotos das telas para conferência visual (uso local): node scripts/fotos.mjs <pasta> light dark
// Precisa do preview em http://localhost:4173 com o build do remoto em memória (VITE_REMOTO=memoria npm run build).
import fs from 'node:fs';
import { chromium } from '@playwright/test';
const [, , saida, ...temas] = process.argv;
const plano = fs.readFileSync('tests/fixtures/raul.treino.txt', 'utf8');
const nav = await chromium.launch();
for (const tema of temas.length ? temas : ['light']) {
  const ctx = await nav.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: tema,
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(() => localStorage.setItem('repz.boasVindas', 'dispensada'));
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/plano');
  await page.getByRole('button', { name: 'Colar texto' }).click();
  await page.getByLabel('Cole o anexo do plano').fill(plano);
  await page.getByRole('button', { name: 'Ler texto' }).click();
  await page.getByRole('button', { name: 'Revisar plano' }).click();
  await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
  await page.getByRole('heading', { name: 'Plano e dados' }).waitFor();
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${saida}/inicio-${tema}.png` });
  await page.getByRole('button', { name: 'Iniciar treino' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${saida}/checkin-${tema}.png` });
  await page.getByRole('button', { name: 'Começar treino' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${saida}/registro-${tema}.png` });
  // Corpo com algumas pesagens, medidas e bioimpedância
  await page.goto('http://localhost:4173/corpo');
  for (const [kg, dias] of [
    ['84,2', 21],
    ['84,0', 17],
    ['83,9', 14],
    ['83,7', 10],
    ['83,6', 7],
    ['83,4', 3],
    ['83,3', 0],
  ]) {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    await page.getByRole('button', { name: 'Registrar peso' }).click();
    await page.getByLabel('Peso (kg)').fill(kg);
    await page.getByLabel('Data').fill(d.toLocaleDateString('en-CA'));
    await page.getByRole('button', { name: 'Salvar peso' }).click();
  }
  await page.getByRole('button', { name: 'Medidas' }).first().click();
  await page.getByLabel('Cintura (cm)').fill('89,5');
  await page.getByLabel('Braço (cm)').fill('35');
  await page.getByRole('button', { name: 'Salvar medidas' }).click();
  await page.getByRole('button', { name: 'Registrar bioimpedância' }).click();
  await page.getByLabel('Gordura (%)').fill('24,1');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${saida}/corpo-${tema}.png`, fullPage: true });
  await ctx.close();
}
await nav.close();
