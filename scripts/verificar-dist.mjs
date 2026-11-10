// Verificações do build (rodam no CI depois de `npm run build`):
// 1. Privacidade: nenhuma URL http(s) de terceiros no código entregue (BRIEFING seção 11).
// 2. Orçamento: JS inicial ≤ 200 KB gzip, sem contar pdf.js e jsPDF, que carregam sob demanda (seção 15).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = path.resolve('dist');
const LIMITE_KB = 200;

// URLs inertes: namespaces XML e comentários de licença não fazem requisição.
const PERMITIDAS = [
  /^http:\/\/www\.w3\.org\//,
  /^https?:\/\/(www\.)?apache\.org\/licenses/,
  /^https?:\/\/opensource\.org\/licenses/,
  /^https?:\/\/github\.com\/(mozilla\/pdf\.js|parallax\/jsPDF|dexie\/Dexie\.js)/,
  // texto de uma mensagem de erro do Workbox (precache); nunca é requisitado
  /^https:\/\/bit\.ly\/wb-precache$/,
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
const base = '/carga-treino/';
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
