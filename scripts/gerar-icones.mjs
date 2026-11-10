// Gera os ícones PNG do app (sem dependências): uma barra com anilhas verde sobre o fundo escuro.
// Uso: node scripts/gerar-icones.mjs  → public/icones/*.png e icone.svg
import fs from 'node:fs';
import zlib from 'node:zlib';

const FUNDO = [0x0d, 0x11, 0x17];
const VERDE = [0x2e, 0xa0, 0x43];
const CLARO = [0x58, 0xd6, 0x8d];

// Desenho num quadro 100×100: [x, y, largura, altura, cor]
const FORMAS = [
  [14, 46, 72, 8, CLARO], // barra
  [22, 30, 9, 40, VERDE], // anilhas grandes
  [69, 30, 9, 40, VERDE],
  [33, 36, 6, 28, VERDE], // anilhas menores
  [61, 36, 6, 28, VERDE],
];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function bloco(tipo, dados) {
  const t = Buffer.from(tipo, 'ascii');
  const tam = Buffer.alloc(4);
  tam.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
  return Buffer.concat([tam, t, dados, crc]);
}

// escala: fração do quadro ocupada pelo desenho (maskable precisa de margem de segurança)
function png(tamanho, escala) {
  const linhas = [];
  const desloc = (1 - escala) / 2;
  for (let y = 0; y < tamanho; y++) {
    const linha = Buffer.alloc(1 + tamanho * 3);
    for (let x = 0; x < tamanho; x++) {
      const u = (((x + 0.5) / tamanho - desloc) / escala) * 100;
      const v = (((y + 0.5) / tamanho - desloc) / escala) * 100;
      let cor = FUNDO;
      for (const [fx, fy, fw, fh, c] of FORMAS) if (u >= fx && u < fx + fw && v >= fy && v < fy + fh) cor = c;
      linha.set(cor, 1 + x * 3);
    }
    linhas.push(linha);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', zlib.deflateSync(Buffer.concat(linhas), { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="${hex(FUNDO)}"/>${FORMAS.map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${hex(c)}"/>`).join('')}</svg>\n`;

const dir = new URL('../public/icones/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(new URL('icone-192.png', dir), png(192, 1));
fs.writeFileSync(new URL('icone-512.png', dir), png(512, 1));
fs.writeFileSync(new URL('icone-maskable-512.png', dir), png(512, 0.7));
fs.writeFileSync(new URL('apple-touch-icon.png', dir), png(180, 0.85));
fs.writeFileSync(new URL('icone.svg', dir), svg);
console.log('Ícones gerados em public/icones/');
