// Verificações do build (rodam no CI depois de `npm run build`):
// 1. Privacidade: nenhuma URL http(s) de terceiros no código entregue (BRIEFING seção 11).
// 2. Orçamento: JS inicial ≤ 200 KB gzip, sem contar pdf.js e jsPDF, que carregam sob demanda (seção 15).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = path.resolve('dist');
const LIMITE_KB = 200;

// URLs inertes: namespaces XML e comentários de licença não fazem requisição.
// O projeto Supabase do Repz (lido do .env no build) é o único host externo permitido (docs/v2, D46)
const SUPABASE = (process.env.VITE_SUPABASE_URL ?? lerEnv('.env').VITE_SUPABASE_URL ?? '').replace(
  /\/+$/,
  '',
);
function lerEnv(arquivo) {
  try {
    return Object.fromEntries(
      fs
        .readFileSync(arquivo, 'utf8')
        .split(/\r?\n/)
        .filter((l) => /^[A-Z_]+=/.test(l))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
    );
  } catch {
    return {};
  }
}

const PERMITIDAS = [
  ...(SUPABASE ? [new RegExp(`^${SUPABASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)] : []),
  /^http:\/\/www\.w3\.org\//,
  /^https?:\/\/(www\.)?apache\.org\/licenses/,
  /^https?:\/\/opensource\.org\/licenses/,
  // cabeçalho de licença do Tailwind no CSS (/*! tailwindcss … | https://tailwindcss.com */)
  /^https:\/\/tailwindcss\.com$/,
  /^https?:\/\/github\.com\/(mozilla\/pdf\.js|parallax\/jsPDF|dexie\/Dexie\.js)/,
  // texto de uma mensagem de erro do Workbox (precache); nunca é requisitado
  /^https:\/\/bit\.ly\/wb-precache$/,
  // textos de mensagens de erro do Dexie (PrematureCommit, MissingAPI); nunca são requisitados
  /^http:\/\/bit\.ly\/2kdckMn$/,
  /^https:\/\/tinyurl\.com\/y2uuvskb$/,
  /^https:\/\/dexie\.org$/,
  // React: prefixo do link montado nas mensagens de erro minificadas; nunca é requisitado (v2, D49)
  /^https:\/\/reactjs\.org\/docs\/error-decoder\.html/,
  // React Router: base fictícia para montar URLs relativas (new URL(caminho, 'http://localhost')) e o link
  // da documentação num aviso de desenvolvimento. Nenhum dos dois é requisitado (v2, D49)
  /^http:\/\/localhost$/,
  /^https:\/\/reactrouter\.com\/en\/main\/routers\/picking-a-router/,
  // supabase-js (chunk carregado só para falar com o servidor): links de documentação em avisos e a URL padrão
  // do GoTrue local, usada só quando nenhuma URL é passada. Nenhum é requisitado: o app usa a URL do projeto
  /^https:\/\/github\.com\/supabase\/supabase-js\/blob\//,
  /^https:\/\/github\.com\/orgs\/supabase\/discussions\//,
  /^http:\/\/localhost:9999$/,
  // pdf.js: namespaces XML de formulários XFA/XMP e o prefixo que ele põe em links "www." de
  // anotações do PDF. São identificadores, não requisições.
  /^http:\/\/www\.xfa\.org\/schema\//,
  /^http:\/\/ns\.adobe\.com\/(xdp|xfdf|xmpmeta)\//,
  /^http:\/\/\$\{[a-z]\}$/,
  // jsPDF: namespace padrão dos metadados XMP do documento (identificador, não requisição).
  // A URL de CDN do pdfobject sai no build (plugin repz-jspdf-sem-cdn no vite.config.ts).
  /^http:\/\/jspdf\.default\.namespaceuri\/$/,
];

function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? arquivos(p) : [p];
  });
}

if (!fs.existsSync(DIST)) {
  console.error('dist/ não existe: rode `npm run build` antes.');
  process.exit(1);
}

let falhou = false;

const texto = arquivos(DIST).filter((f) => /\.(js|mjs|html|css|webmanifest|json)$/.test(f));
for (const f of texto) {
  const conteudo = fs.readFileSync(f, 'utf8');
  for (const m of conteudo.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) {
    if (PERMITIDAS.some((re) => re.test(m[0]))) continue;
    console.error(`Privacidade: URL externa em ${path.relative(DIST, f)}: ${m[0]}`);
    falhou = true;
  }
}

// JS inicial = scripts e modulepreloads referenciados pelo index.html
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const iniciais = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map((m) => m[1]);
const base = '/';
// pdf.js e jsPDF só na importação e na exportação (import() dinâmico), nunca no carregamento inicial
const sobDemanda = iniciais.filter((u) => /\/(pdf|pdf\.worker|jspdf)[.-]/.test(u));
if (sobDemanda.length) {
  console.error(`pdf.js/jsPDF no JS inicial: ${sobDemanda.join(', ')}`);
  falhou = true;
}
let total = 0;
for (const url of iniciais) {
  const arquivo = path.join(DIST, url.startsWith(base) ? url.slice(base.length) : url);
  total += zlib.gzipSync(fs.readFileSync(arquivo)).length;
}
const kb = total / 1024;
console.log(`JS inicial: ${kb.toFixed(1)} KB gzip (${iniciais.length} arquivo(s)), limite ${LIMITE_KB} KB`);
if (kb > LIMITE_KB) {
  console.error('Orçamento de JS inicial estourado.');
  falhou = true;
}

if (falhou) process.exit(1);
console.log('dist/ OK: sem URLs de terceiros e dentro do orçamento.');
