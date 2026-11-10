import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';

const plano = fs.readFileSync(new URL('../fixtures/raul.treino.txt', import.meta.url), 'utf8');
const DIST = path.resolve('dist');
const TIPOS: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

// Servidor próprio, numa origem só deste teste: o roteamento do Playwright não intercepta o script do
// service worker, e trocar o sw.js do preview afetaria os outros testes. Cada `versao` muda um byte.
let versao = 1;
let servidor: http.Server;
let origem: string;

test.beforeAll(async () => {
  servidor = http.createServer((req, res) => {
    const url = new URL(req.url!, 'http://x').pathname.replace(/^\/repz\//, '/');
    const arquivo = path.join(DIST, url === '/' ? 'index.html' : url);
    if (!arquivo.startsWith(DIST) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    let corpo: Buffer | string = fs.readFileSync(arquivo);
    if (url === '/sw.js') corpo = `${corpo.toString('utf8')}\n// versão ${versao}\n`;
    res.writeHead(200, {
      'content-type': TIPOS[path.extname(arquivo)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(corpo);
  });
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
  origem = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/repz/`;
});

test.afterAll(() => new Promise<void>((ok) => servidor.close(() => ok())));

// BRIEFING 11 e ARCHITECTURE 9.2: com versão nova, o aviso espera o fim do treino; nada recarrega sozinho
test('atualização fica pendente durante o treino e aparece no resumo e no Início', async ({ page }) => {
  await page.goto(origem);
  await page.getByRole('button', { name: 'Continuar no navegador' }).click();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await page.goto(`${origem}#/plano`);
  await page.getByRole('button', { name: 'Colar texto' }).click();
  await page.getByLabel('Cole o anexo do plano').fill(plano);
  await page.getByRole('button', { name: 'Ler texto' }).click();
  await page.getByRole('button', { name: 'Revisar plano' }).click();
  await page.getByRole('button', { name: 'Salvar e ativar plano' }).click();
  await page.getByRole('link', { name: 'Treino' }).click();
  await page.getByRole('button', { name: 'Iniciar treino' }).click();
  await page.getByLabel('kg', { exact: true }).fill('24');
  await page.getByRole('button', { name: 'Concluir série 1' }).click();

  // Publica uma versão nova, e o navegador a encontra no meio do treino
  versao = 2;
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r!.update()));
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r?.waiting)))
    .toBe(true);

  // Durante o treino: nenhum aviso, e a página não recarregou (o descanso continua)
  await expect(page.getByRole('timer', { name: 'Descanso restante' })).toBeVisible();
  await expect(page.getByText('Atualização disponível')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pular descanso' }).click();

  // No resumo, o aviso pendente, sem botão
  await page.getByRole('button', { name: 'Mais ações' }).click();
  await page.getByRole('button', { name: 'Encerrar treino' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Treino concluído' })).toBeVisible();
  await expect(page.getByText(/^Atualização disponível\. Ela fica no Início/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Atualizar' })).toHaveCount(0);

  // No Início, o banner com o botão; atualizar recarrega com a versão nova ativa
  await page.getByRole('button', { name: 'Fechar' }).click();
  const banner = page.getByRole('status').filter({ hasText: 'Atualização disponível' });
  await expect(banner).toBeVisible();
  await Promise.all([page.waitForEvent('load'), banner.getByRole('button', { name: 'Atualizar' }).click()]);
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible();
  await expect(page.getByText('Atualização disponível')).toHaveCount(0);
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !r?.waiting))).toBe(
    true,
  );
});
