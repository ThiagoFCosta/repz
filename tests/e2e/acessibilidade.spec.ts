import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const plano = fs.readFileSync(new URL('../fixtures/raul.treino.txt', import.meta.url), 'utf8');

// BRIEFING 12: contraste AA, labels, foco visível e alvos ≥ 44 px, em cada tela principal
async function verificar(page: Page, tela: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const violacoes = r.violations.map(
    (v) => `${tela}: ${v.id} (${v.help}) em ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(violacoes).toEqual([]);

  // Alvos de toque: tudo o que é clicável e visível tem pelo menos 44 × 44 px. Um campo dentro de um
  // <label> vale pelo label inteiro (tocar no texto também marca a caixa).
  const pequenos = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, summary, [role="button"]',
      ),
    ]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      })
      .filter((el) => {
        const r = (el.closest('label') ?? el).getBoundingClientRect();
        return r.height < 44 || r.width < 44;
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`;
      }),
  );
  expect(pequenos, `${tela}: alvos menores que 44 px`).toEqual([]);
}

test.describe('acessibilidade', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('telas principais sem violações do axe e com alvos ≥ 44 px', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao REPZ' })).toBeVisible();
    await verificar(page, 'Boas-vindas');
    await page.getByRole('button', { name: 'Continuar no navegador' }).click();

    await expect(page.getByText('Comece pelo seu plano')).toBeVisible();
    await verificar(page, 'Início sem plano');

    await page.goto('./#/plano');
    await expect(page.getByRole('heading', { name: 'Importar plano' })).toBeVisible();
    await verificar(page, 'Importar');
    await page.getByRole('button', { name: 'Colar texto' }).click();
    await page.getByLabel('Cole o anexo do plano').fill(plano);
    await page.getByRole('button', { name: 'Ler texto' }).click();
    await expect(page.getByText('5 sessões · 30 exercícios')).toBeVisible();
    await verificar(page, 'Importar lido');
    await page.getByRole('button', { name: 'Revisar plano' }).click();
    await expect(page.getByRole('heading', { name: 'Revisar plano' })).toBeVisible();
    await verificar(page, 'Revisar');
    await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
    await expect(page.getByRole('heading', { name: 'Plano e dados' })).toBeVisible();
    await verificar(page, 'Plano e dados');

    await page.getByRole('link', { name: 'Treino' }).click();
    await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible();
    await verificar(page, 'Início');
    await page.getByRole('button', { name: 'Trocar sessão' }).click();
    await verificar(page, 'Trocar sessão');
    await page.getByRole('button', { name: /^Push/ }).click();

    await page.getByRole('button', { name: 'Iniciar treino' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Supino inclinado com halteres' }),
    ).toBeVisible();
    await page.getByLabel('kg', { exact: true }).fill('24');
    await page.getByLabel('reps', { exact: true }).fill('10');
    await verificar(page, 'Registro');
    await page.getByRole('group', { name: 'RIR', exact: true }).getByRole('button', { name: '2' }).click();
    await page.getByRole('button', { name: 'Concluir série 1' }).click();
    await expect(page.getByRole('timer', { name: 'Descanso restante' })).toBeVisible();
    await verificar(page, 'Descanso');
    await page.getByRole('button', { name: 'Pular descanso' }).click();
    await page.getByRole('button', { name: 'Mais ações' }).click();
    await verificar(page, 'Menu do treino');
    await page.getByRole('button', { name: 'Encerrar treino' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Treino concluído' })).toBeVisible();
    await verificar(page, 'Resumo');
    await page.getByRole('button', { name: 'Cardio' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Cardio' })).toBeVisible();
    await page.getByLabel('Duração (min)').fill('35');
    await verificar(page, 'Cardio');
    await page.getByRole('button', { name: 'Registrar cardio' }).click();
    await expect(page.getByText('1 de 2')).toBeVisible();

    await page.getByRole('link', { name: 'Histórico' }).click();
    await expect(page.getByRole('img', { name: /^1RM estimado por semana/ })).toBeVisible();
    await verificar(page, 'Histórico');
    await page.getByRole('link', { name: 'Treinos' }).click();
    await expect(page.getByRole('list', { name: 'Treinos e cardio' })).toBeVisible();
    await verificar(page, 'Treinos');
    await page.getByRole('list', { name: 'Treinos e cardio' }).getByRole('link', { name: /Push/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Push' })).toBeVisible();
    await verificar(page, 'Detalhe do treino');
  });

  test('foco visível pelo teclado e animações desligadas com prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Continuar no navegador' })).toBeVisible();
    await page.keyboard.press('Tab');
    const contorno = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const s = getComputedStyle(el);
      return { tag: el.tagName, estilo: s.outlineStyle, largura: parseFloat(s.outlineWidth) };
    });
    expect(contorno.tag).toBe('BUTTON');
    expect(contorno.estilo).not.toBe('none');
    expect(contorno.largura).toBeGreaterThanOrEqual(2);

    // Nenhuma animação ou transição perceptível
    const longas = await page.evaluate(
      () =>
        [...document.querySelectorAll('*')]
          .map((el) => getComputedStyle(el))
          .filter((s) =>
            [...s.animationDuration.split(','), ...s.transitionDuration.split(',')].some(
              (d) => parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000) > 1,
            ),
          ).length,
    );
    expect(longas).toBe(0);
  });
});
