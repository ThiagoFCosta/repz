// Publica o dist/ na Netlify pela API (deploy manual; docs/v2/ARCHITECTURE.md 13). SÓ quando o Thiago pedir:
// cada deploy consome créditos do plano gratuito. Usa o login da Netlify CLI desta máquina (%APPDATA%/netlify) e
// nunca mostra o token. Uso: npm run build && node scripts/publicar-netlify.mjs
// Na 1ª vez cria o site e grava o id em .netlify/state.json (fora do git).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const NOMES = ['repz', 'repz-app', 'repz-treino'];
const config = JSON.parse(
  readFileSync(join(process.env.APPDATA ?? '', 'netlify', 'Config', 'config.json'), 'utf8'),
);
const usuario = Object.values(config.users ?? {}).find((u) => u.auth?.token);
if (!usuario) throw new Error('Sem login da Netlify nesta máquina: rode "npx netlify-cli login".');
const token = usuario.auth.token;
const api = async (caminho, opcoes = {}) => {
  const r = await fetch(`https://api.netlify.com/api/v1${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${token}`, ...(opcoes.headers ?? {}) },
  });
  const corpo = await r.text();
  if (!r.ok)
    throw Object.assign(new Error(`Netlify ${r.status}: ${corpo.slice(0, 200)}`), { status: r.status });
  return corpo ? JSON.parse(corpo) : null;
};

if (!existsSync('dist/index.html')) throw new Error('Rode npm run build antes.');

const ESTADO = '.netlify/state.json';
let siteId = existsSync(ESTADO) ? JSON.parse(readFileSync(ESTADO, 'utf8')).siteId : null;
if (!siteId) {
  for (const nome of NOMES) {
    try {
      const site = await api('/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nome }),
      });
      siteId = site.id;
      console.log(`Site criado: ${site.ssl_url ?? site.url}`);
      break;
    } catch (e) {
      if (e.status !== 422) throw e; // 422 = nome em uso
    }
  }
  if (!siteId) throw new Error('Nenhum dos nomes estava livre.');
  mkdirSync('.netlify', { recursive: true });
  writeFileSync(ESTADO, JSON.stringify({ siteId }, null, 2));
}

// Zip do dist com o tar do Windows (bsdtar): caminhos com /, que a Netlify entende. O Compress-Archive do
// PowerShell 5.1 grava com \ e a Netlify não acha as subpastas.
const zip = join(tmpdir(), `repz-dist-${Date.now()}.zip`);
execFileSync(join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'tar.exe'), [
  '-a',
  '-c',
  '-f',
  zip,
  '-C',
  'dist',
  ...readdirSync('dist'),
]);
const deploy = await api(`/sites/${siteId}/deploys`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/zip' },
  body: readFileSync(zip),
});
rmSync(zip);
let d = deploy;
for (let i = 0; i < 60 && !['ready', 'error'].includes(d.state); i++) {
  await new Promise((r) => setTimeout(r, 3000));
  d = await api(`/deploys/${deploy.id}`);
}
if (d.state !== 'ready') throw new Error(`Deploy terminou em "${d.state}": ${d.error_message ?? ''}`);
const site = await api(`/sites/${siteId}`);
console.log(`Publicado: ${site.ssl_url}`);
