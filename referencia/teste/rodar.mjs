import fs from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parse, prescricao } from '../parser/parser.js';
import { textoDoPdf } from '../parser/extrair-pdf.js';

const arq = process.argv[2];
const texto = arq.endsWith('.pdf')
  ? await textoDoPdf(pdfjs, new Uint8Array(fs.readFileSync(arq)))
  : fs.readFileSync(arq, 'utf8');
if (process.env.DUMP) console.log(texto.split('\n').filter((l) => /TREINO|EX:|SS\d|SESSAO/.test(l)).join('\n'));

const r = parse(texto);
console.log(`Erros: ${r.erros.length} | Avisos: ${r.avisos.length}`);
r.erros.forEach((e) => console.log('  ERRO', e.linha ? `linha ${e.linha}:` : '', e.msg));
r.avisos.forEach((e) => console.log('  aviso', e.linha ? `linha ${e.linha}:` : '', e.msg));
const p = r.rascunho;
console.log(`Plano: ${p.nome} | ${p.autor} | ${p.data}`);
for (const s of p.sessoes) {
  console.log(`\n[${s.nome}] dia=${s.dia}`);
  for (const e of s.itens) {
    const g = e.grupo ? `SS${e.grupo} ` : '    ';
    const v = e.variantes.length > 1 ? ` {${e.variantes.join(' | ')}}` : '';
    console.log(`  ${g}${e.nome}${v} — ${e.series}x${e.reps.min}-${e.reps.max}${e.porTempo ? 's' : ''} desc=${e.descanso ? e.descanso.min + '-' + e.descanso.max + 's' : '-'}${e.iso ? ' iso' : ''}${e.rir ? ' rir' + e.rir.min : ''}`);
  }
}
console.log('\nCardio:', JSON.stringify(p.cardio));
if (p.bloco) {
  const ex = (n) => p.sessoes.flatMap((s) => s.itens).find((e) => e.chaves[0].startsWith(n.toLowerCase()));
  for (const w of [1, 6, 10, 12]) {
    const a = prescricao(p, ex('Supino inclinado'), w), b = prescricao(p, ex('Elevacao lateral'), w), c = prescricao(p, ex('Stiff'), w);
    console.log(`Semana ${w}: supino incl ${a.series}s RIR ${a.rir.min}-${a.rir.max} | elev lat ${b.series}s RIR ${b.rir.min}-${b.rir.max} | stiff ${c.series}s RIR ${c.rir.min}-${c.rir.max}`);
  }
}
