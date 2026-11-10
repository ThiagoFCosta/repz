import fs from 'node:fs';
import { expect, test, type Download, type Page } from '@playwright/test';

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

const titulo = (page: Page, nome: string) =>
  expect(page.getByRole('heading', { level: 1, name: nome, exact: true })).toBeVisible();

// Sem Web Share no Chromium headless: os arquivos saem como download
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

const DATA = /\d{4}-\d{2}-\d{2}/.source;

// E2E 5 (BRIEFING 15): registrar cardio, exportar CSV, fazer backup, limpar os dados e restaurar
test('exportar, fazer backup, limpar os dados e restaurar', async ({ page }) => {
  await importarPlano(page);

  // Cardio e um treino curto (supino inclinado 24 × 10, RIR 2)
  await page.goto('./#/treino');
  await page.getByRole('button', { name: 'Registrar cardio' }).click();
  await titulo(page, 'Cardio');
  await page.getByRole('group', { name: 'Tipo' }).getByRole('button', { name: 'Remo' }).click();
  await page.getByLabel('Duração (min)').fill('35');
  await page.getByLabel('Distância (km)').fill('6,5');
  await page.getByRole('button', { name: 'Registrar cardio' }).click();
  await expect(page.getByText('1 de 2')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Lembrete de backup' })).toBeHidden();

  await page.getByRole('button', { name: 'Iniciar treino' }).click();
  await titulo(page, 'Supino inclinado com halteres');
  await page.getByLabel('kg', { exact: true }).fill('24');
  await page.getByLabel('reps', { exact: true }).fill('10');
  await page.getByRole('group', { name: 'RIR', exact: true }).getByRole('button', { name: '2' }).click();
  await page.getByRole('button', { name: 'Concluir série 1' }).click();
  await page.getByRole('button', { name: 'Pular descanso' }).click();
  await page.getByRole('button', { name: 'Mais ações' }).click();
  await page.getByRole('button', { name: 'Encerrar treino' }).click();
  await page.getByRole('button', { name: 'Fechar' }).click();

  // Com 1 treino e nenhum backup, o Início lembra
  const lembrete = page.getByRole('complementary', { name: 'Lembrete de backup' });
  await expect(lembrete).toContainText('Você ainda não fez backup');

  // Planilha CSV: séries e cardio
  await page.getByRole('link', { name: 'Plano' }).click();
  await expect(page.getByText('Nenhum backup feito ainda.')).toBeVisible();
  const [cardio, series] = await baixar(page, 'Planilha CSV', 2);
  expect(cardio!.suggestedFilename()).toMatch(new RegExp(`^treino-cardio-${DATA}\\.csv$`));
  expect(series!.suggestedFilename()).toMatch(new RegExp(`^treino-series-${DATA}\\.csv$`));
  const csvCardio = await conteudo(cardio!);
  expect([...csvCardio.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  expect(csvCardio.toString('utf8').slice(1)).toMatch(
    new RegExp(`^data;tipo;minutos;fc_media;distancia_km;esforco\\r\\n${DATA};Remo;35;;6,5;\\r\\n$`),
  );
  expect((await conteudo(series!)).toString('utf8')).toContain(
    ';Push;Supino inclinado com halteres;Supino inclinado com halteres;1;24;10;2;não;',
  );

  // Histórico em PDF
  const [pdf] = await baixar(page, 'Histórico em PDF');
  expect(pdf!.suggestedFilename()).toMatch(new RegExp(`^treino-historico-${DATA}\\.pdf$`));
  expect((await conteudo(pdf!)).subarray(0, 5).toString()).toBe('%PDF-');

  // Backup completo
  const [backup] = await baixar(page, 'Backup completo (.json)');
  expect(backup!.suggestedFilename()).toMatch(new RegExp(`^treino-backup-${DATA}\\.json$`));
  const json = JSON.parse((await conteudo(backup!)).toString('utf8'));
  expect(json).toMatchObject({ app: 'app-treino', versaoSchema: 1 });
  expect(json.cardio).toHaveLength(1);
  const arquivoBackup = test.info().outputPath('backup.json');
  await backup!.saveAs(arquivoBackup);
  await expect(page.getByText(/^Último backup: /)).toBeVisible();
  await page.getByRole('link', { name: 'Treino' }).click();
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible();
  await expect(lembrete).toBeHidden();

  // Limpar os dados (como num celular novo)
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

  // Restaurar: resumo, depois "Substituir tudo" com confirmação
  await page.getByLabel('Arquivo de backup').setInputFiles(arquivoBackup);
  const folha = page.getByRole('dialog', { name: 'Restaurar backup' });
  await expect(folha.getByRole('list', { name: 'Conteúdo do backup' })).toContainText(
    '1 treino (1 série) · 1 cardio · 1 plano',
  );
  await folha.getByRole('button', { name: 'Substituir tudo' }).click();
  await expect(folha).toContainText('Tudo o que está neste celular também está no backup.');
  await folha.getByRole('button', { name: 'Apagar e substituir tudo' }).click();
  await expect(page.getByText('Backup restaurado.')).toBeVisible();

  // Tudo de volta: rotação, cardio da semana, histórico, último backup
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible();
  await expect(page.getByText('1 de 2')).toBeVisible();
  await expect(lembrete).toBeHidden();
  await page.getByRole('link', { name: 'Histórico' }).click();
  await expect(page.locator('.kpi').first()).toContainText('33,6 kg');

  // Mesclar o mesmo backup não duplica nada
  await page.goto('./#/plano');
  await page.getByLabel('Arquivo de backup').setInputFiles(arquivoBackup);
  await folha.getByRole('button', { name: 'Mesclar com os dados deste celular' }).click();
  await folha.getByRole('button', { name: 'Mesclar dados' }).click();
  await expect(page.getByText('Dados mesclados: 0 treinos novos, 0 cardios novos.')).toBeVisible();
  await expect(page.getByText('1 de 2')).toBeVisible();
});

test('recusa um arquivo que não é backup do REPZ', async ({ page }) => {
  await page.goto('./#/plano');
  await page.getByLabel('Arquivo de backup').setInputFiles({
    name: 'outro.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ app: 'outro-app', versaoSchema: 1 })),
  });
  await expect(page.getByText('Este arquivo não é um backup do REPZ.')).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();
});
