// Gera a fixture anonimizada do NutriDiet a partir do PDF real (BRIEFING-v2 10.1). Roda só na máquina do Thiago:
// o PDF fica em dados-reais/ (fora do git). Troca nome, data da consulta, idade, peso e altura; os alimentos ficam.
// Uso: node scripts/anonimizar-nutridiet.mjs [dados-reais/plano-alimentar-nutridiet.pdf]
import fs from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { linhasDoPdf } from '../referencia/dieta/extrair-linhas.js';

const entrada = process.argv[2] ?? 'dados-reais/plano-alimentar-nutridiet.pdf';
const saida = 'tests/fixtures/nutridiet-anonimizado.linhas.json';

const linhas = await linhasDoPdf(pdfjs, new Uint8Array(fs.readFileSync(entrada)));

// Valores originais, para conferir que nenhum sobrou
const original = linhas.map((l) => l.texto).join('\n');
const nome = original.match(/Nome:\s*(.+?)(?:\t|$)/m)?.[1]?.trim();

const anonimas = linhas.map((l) => ({
  ...l,
  texto: l.texto
    .replace(/Nome:\s*[^\t]+/, 'Nome: Paciente Exemplo')
    .replace(/Data da consulta:\s*\d{2}\/\d{2}\/\d{4}/, 'Data da consulta: 01/01/2026')
    .replace(/Idade:\s*\d+\s*anos/, 'Idade: 30 anos')
    .replace(/Peso:\s*[\d.,]+\s*kg/i, 'Peso: 80.0 kg')
    .replace(/Altura:\s*[\d.,]+\s*cm/i, 'Altura: 175.0 cm'),
}));

const texto = anonimas.map((l) => l.texto).join('\n');
const sobras = [nome, ...(nome ?? '').split(/\s+/).filter((p) => p.length > 3)].filter(
  (p) => p && texto.includes(p),
);
if (sobras.length) throw new Error(`Dados pessoais sobraram na fixture: ${sobras.length} trecho(s)`);
if (/12\/05\/2026|90\.8|169\.0/.test(texto))
  throw new Error('Data, peso ou altura originais sobraram na fixture');

fs.writeFileSync(saida, JSON.stringify(anonimas, null, 1) + '\n');
console.log(`${anonimas.length} linhas anonimizadas → ${saida}`);
