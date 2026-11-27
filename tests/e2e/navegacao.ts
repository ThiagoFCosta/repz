import type { Page } from '@playwright/test';

// v2 (docs/v2/DECISOES.md, D36): as 3 abas da v1 viraram a barra inferior (Início · Corpo · Treino · Dieta · Coach)
// e o menu ☰. Os E2E da v1 trocaram só o clique de navegação por este atalho; as asserções são as mesmas.
export async function irPara(page: Page, destino: 'Início' | 'Histórico' | 'Plano') {
  if (destino === 'Início') {
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('button', { name: 'Início' })
      .click();
    return;
  }
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page
    .getByRole('complementary', { name: 'Navegação principal' })
    .getByRole('button', { name: destino === 'Plano' ? 'Plano de treino' : destino })
    .click();
}

// v2 (V3): "Iniciar treino" abre o check-in de prontidão; "Começar treino" é o 2º toque (BRIEFING-v2 7.3)
export async function iniciarTreino(page: Page) {
  await page.getByRole('button', { name: 'Iniciar treino' }).click();
  await page
    .getByRole('dialog', { name: 'Antes de começar' })
    .getByRole('button', { name: 'Começar treino' })
    .click();
}
