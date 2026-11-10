import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Download, type Page } from '@playwright/test';

// BRIEFING 15: os 5 E2E em sequência, numa única execução, com a rede desligada depois da 1ª carga.
// Cada fluxo também tem o seu teste isolado (importar, treino, dados); aqui eles dependem um do outro,
// como no uso real: o plano importado no 1 é o do treino do 3, que gera a sugestão do 4 e o backup do 5.

const fixture = (nome: string) => fileURLToPath(new URL(`../fixtures/${nome}`, import.meta.url));

const titulo = (page: Page, nome: string) =>
  expect(page.getByRole('heading', { level: 1, name: nome, exact: true })).toBeVisible();

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

async function baixar(page: Page, botao: string, quantos = 1): Promise<Download[]> {
  const baixados: Download[] = [];
  const todos = new Promise<void>((ok) =>
    page.on('download', (d) => {
      baixados.push(d);
      if (baixados.length === quantos) ok();
    }),
  );
  await page.getByRole('button', { name: botao }).click();
  await todos;
  page.removeAllListeners('download');
  return baixados.sort((a, b) => a.suggestedFilename().localeCompare(b.suggestedFilename()));
}

const conteudo = async (d: Download) => fs.readFileSync((await d.path())!);

test('os 5 fluxos da seção 15 em sequência, offline depois da 1ª carga', async ({ page, context }) => {
  test.setTimeout(240_000);
  const externas: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:4173/')) externas.push(r.url());
  });

  // 1ª carga online; depois disso, sem rede até o fim
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Comece pelo seu plano')).toBeVisible();

  await test.step('E2E 2: PDF sem anexo mostra o erro', async () => {
    await page.getByRole('link', { name: 'Plano' }).click();
    await page.getByLabel('Arquivo PDF do plano').setInputFiles(fixture('plano-original-raul.pdf'));
    await expect(page.getByText('Anexo TREINO v1 não encontrado')).toBeVisible();
    await expect(page.getByText('Marcador #TREINO-INICIO não encontrado')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Revisar plano' })).toHaveCount(0);
  });

  await test.step('E2E 1: importar o PDF do Raul, revisar e salvar', async () => {
    await page.getByLabel('Arquivo PDF do plano').setInputFiles(fixture('raul-com-anexo-ok.pdf'));
    await expect(page.getByText('5 sessões · 30 exercícios')).toBeVisible();
    await page.getByRole('button', { name: 'Revisar plano' }).click();
    await expect(page.getByText('Hipertrofia natural 5x')).toBeVisible();
    await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
    await expect(page.getByText('Plano salvo e ativo')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Hipertrofia natural 5x')).toBeVisible();
  });

  await test.step('E2E 3: Push completo com bi-set, recarregando no meio', async () => {
    await page.getByRole('link', { name: 'Treino' }).click();
    await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible();
    await page.getByRole('button', { name: 'Iniciar treino' }).click();

    // topo da faixa (6-10) com RIR 2: a sugestão do E2E 4 é subir
    await titulo(page, 'Supino inclinado com halteres');
    await serie(page, '24', '10');
    for (let i = 0; i < 2; i++) {
      await pularDescanso(page);
      await serie(page);
    }
    await pularDescanso(page);

    await titulo(page, 'Supino reto');
    await page.getByRole('button', { name: 'Supino reto barra' }).click();
    await serie(page, '60');
    for (let i = 0; i < 2; i++) {
      await pularDescanso(page);
      await serie(page);
    }
    await pularDescanso(page);

    await titulo(page, 'Desenvolvimento com halteres sentado');
    for (let i = 0; i < 3; i++) {
      await serie(page, i === 0 ? '18' : undefined);
      await pularDescanso(page);
    }

    await titulo(page, 'Elevacao lateral');
    await serie(page, '8');
    await titulo(page, 'Triceps na corda');
    await serie(page, '20');
    await pularDescanso(page);
    await serie(page);
    await titulo(page, 'Triceps na corda');

    // fecha a aba no meio da rodada 2, sem rede
    await page.reload();
    await titulo(page, 'Triceps na corda');
    await expect(page.getByText('Rodada 2 de 4')).toBeVisible();
    await serie(page);
    await pularDescanso(page);
    await serie(page);
    await serie(page);
    await pularDescanso(page);
    await expect(page.getByText('Rodada 4 de 4')).toBeVisible();
    await serie(page);
    await pularDescanso(page);

    await titulo(page, 'Triceps');
    await page.getByRole('button', { name: 'Triceps frances' }).click();
    await serie(page, '15');
    await pularDescanso(page);
    await serie(page);
    // o descanso só aparece depois que a série e o estado foram gravados: aí pode recarregar
    await expect(page.getByRole('timer', { name: 'Descanso restante' })).toBeVisible();
    await page.reload();
    await pularDescanso(page);
    await serie(page);

    await titulo(page, 'Treino concluído');
    await expect(page.locator('.kpi').filter({ hasText: 'séries' })).toContainText('19');
  });

  await test.step('E2E 4: sugestão ↑ no fim e carga pré-preenchida no treino seguinte', async () => {
    const cartao = page
      .getByRole('list', { name: 'Para o próximo treino' })
      .getByRole('listitem', { name: 'Supino inclinado com halteres' });
    await expect(cartao).toContainText('↑');
    await expect(cartao).toContainText('suba para 26 kg');
    await page.getByRole('button', { name: 'Fechar' }).click();

    await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible();
    await page.getByRole('button', { name: 'Trocar sessão' }).click();
    await page.getByRole('button', { name: /^Push/ }).click();
    await page.getByRole('button', { name: 'Iniciar treino' }).click();
    await titulo(page, 'Supino inclinado com halteres');
    await expect(page.getByLabel('kg', { exact: true })).toHaveValue('26');
    await expect(page.getByLabel('reps', { exact: true })).toHaveValue('6');

    // não faz este treino: descarta (fica fora do histórico e da rotação)
    await page.getByRole('button', { name: 'Mais ações' }).click();
    await page.getByRole('button', { name: 'Descartar treino' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Descartar treino' }).click();
    await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible();
  });

  await test.step('E2E 5: cardio, CSV, backup, limpar os dados e restaurar', async () => {
    await page.getByRole('button', { name: 'Registrar cardio' }).click();
    await titulo(page, 'Cardio');
    await page.getByRole('group', { name: 'Tipo' }).getByRole('button', { name: 'Remo' }).click();
    await page.getByLabel('Duração (min)').fill('35');
    await page.getByRole('button', { name: 'Registrar cardio' }).click();
    await expect(page.getByText('1 de 2')).toBeVisible();

    await page.getByRole('link', { name: 'Plano' }).click();
    const [cardio, series] = await baixar(page, 'Planilha CSV', 2);
    expect((await conteudo(cardio!)).toString('utf8')).toContain(';Remo;35;;;');
    const csv = (await conteudo(series!)).toString('utf8');
    expect(csv).toContain(';Push;Supino inclinado com halteres;Supino inclinado com halteres;1;24;10;2;não;');
    // 19 séries do Push concluído; o treino descartado fica fora
    expect(csv.trim().split('\r\n')).toHaveLength(20);

    const [backup] = await baixar(page, 'Backup completo (.json)');
    const arquivo = test.info().outputPath('backup.json');
    await backup!.saveAs(arquivo);

    await page.evaluate(
      () =>
        new Promise<void>((ok, erro) => {
          const r = indexedDB.deleteDatabase('repz');
          r.onsuccess = () => ok();
          r.onerror = () => erro(r.error);
        }),
    );
    await page.goto('./#/plano');
    await page.reload();
    await titulo(page, 'Importar plano');

    await page.getByLabel('Arquivo de backup').setInputFiles(arquivo);
    const folha = page.getByRole('dialog', { name: 'Restaurar backup' });
    await folha.getByRole('button', { name: 'Substituir tudo' }).click();
    await folha.getByRole('button', { name: 'Apagar e substituir tudo' }).click();
    await expect(page.getByText('Backup restaurado.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible();
    await expect(page.getByText('1 de 2')).toBeVisible();
    await page.getByRole('link', { name: 'Histórico' }).click();
    // o histórico voltou: gráfico do último exercício feito
    await expect(page.getByRole('img', { name: /^1RM estimado por semana/ })).toBeVisible();
  });

  // Nenhuma requisição para fora da origem em toda a jornada (BRIEFING 11)
  expect(externas).toEqual([]);
});
