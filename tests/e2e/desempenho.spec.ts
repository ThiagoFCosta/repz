import fs from 'node:fs';
import { expect, test } from '@playwright/test';

const plano = fs.readFileSync(new URL('../fixtures/raul.treino.txt', import.meta.url), 'utf8');

// BRIEFING 15: 1ª tela interativa em < 2 s num Android médio, com cache. Aproximação: CPU 4× mais
// lenta (o fator que o Lighthouse usa para celular médio), app servido pelo service worker, plano
// importado. Mede do início da navegação até o botão "Iniciar treino" aparecer no Início.
const LENTIDAO = 4;
const LIMITE_MS = 2000;

test('Início interativo em menos de 2 s com CPU 4× mais lenta e o app em cache', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.goto('./#/plano');
  await page.getByRole('button', { name: 'Colar texto' }).click();
  await page.getByLabel('Cole o anexo do plano').fill(plano);
  await page.getByRole('button', { name: 'Ler texto' }).click();
  await page.getByRole('button', { name: 'Revisar plano' }).click();
  await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
  await expect(page.getByRole('heading', { name: 'Plano e dados' })).toBeVisible();
  await page.goto('./#/treino');
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  // Marca o instante em que o botão aparece, dentro da própria página
  await page.addInitScript(() => {
    const w = window as unknown as { interativo?: number };
    new MutationObserver((_, obs) => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent === 'Iniciar treino');
      if (b) {
        w.interativo = performance.now();
        obs.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: LENTIDAO });

  const tempos: number[] = [];
  for (let i = 0; i < 5; i++) {
    await page.reload();
    await expect(page.getByRole('button', { name: 'Iniciar treino' })).toBeVisible();
    tempos.push(await page.evaluate(() => (window as unknown as { interativo: number }).interativo));
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  const mediana = [...tempos].sort((a, b) => a - b)[2]!;
  const resumo = `Início interativo (CPU ${LENTIDAO}×, com cache): mediana ${Math.round(mediana)} ms; medidas ${tempos.map(Math.round).join(', ')} ms`;
  console.log(resumo);
  test.info().annotations.push({ type: 'desempenho', description: resumo });
  expect(mediana).toBeLessThan(LIMITE_MS);
});
