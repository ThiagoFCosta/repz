import fs from 'node:fs';
import { vincular } from './alimentos.js';
import { substituir, nutrientes } from './substituicoes.js';
const plano = JSON.parse(fs.readFileSync('plano.json'));
const naoVinc = new Set();
console.log('TOTAIS ESTIMADOS POR TIPO DE DIA (TACO + rótulo genérico; itens sem gramas ficam fora)');
for (const d of plano.dias) {
  const t = { kcal: 0, p: 0, c: 0, g: 0 };
  for (const r of d.refeicoes) for (const i of r.itens) {
    const a = vincular(i.nome); if (!a) { naoVinc.add(i.nome); continue; }
    if (i.gramas == null) continue;
    const n = nutrientes(a, i.gramas); for (const k in t) t[k] += n[k];
  }
  console.log(`  ${d.nome.padEnd(20)} ${Math.round(t.kcal)} kcal · P ${Math.round(t.p)} g · C ${Math.round(t.c)} g · G ${Math.round(t.g)} g`);
}
console.log('Não vinculados:', [...naoVinc]);
const almoco = plano.dias[0].refeicoes.find((r) => r.nome === 'Almoço');
const cafe = plano.dias[0].refeicoes[0], lanche = plano.dias[0].refeicoes[1], tarde = plano.dias[0].refeicoes[3];
for (const i of [...almoco.itens.slice(0, 2), ...cafe.itens.slice(0, 2), lanche.itens[0], lanche.itens[1], tarde.itens[1]]) {
  const a = vincular(i.nome); const s = substituir(a, i.gramas);
  console.log(`\n${i.nome.split('(')[0].trim()} ${i.gramas} g → ${s.grupo} (por ${s.referencia}) · ${s.original.kcal} kcal P${s.original.p} C${s.original.c} G${s.original.g}`);
  for (const o of s.opcoes) console.log(`   ${String(o.gramas).padStart(4)} g  ${o.nome.padEnd(46)} ${o.kcal} kcal  P${o.p} C${o.c} G${o.g}  (${o.difKcal > 0 ? '+' : ''}${o.difKcal}% kcal)`);
}
