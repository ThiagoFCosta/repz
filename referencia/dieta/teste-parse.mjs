import fs from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; // npm i pdfjs-dist@4
import { linhasDoPdf } from './extrair-linhas.js';
import { parseNutriDiet } from './nutridiet.js';
const l = await linhasDoPdf(pdfjs, new Uint8Array(fs.readFileSync(process.argv[2])));
const r = parseNutriDiet(l);
fs.writeFileSync('plano.json', JSON.stringify(r, null, 1));
console.log(r.cabecalho);
for (const d of r.dias) { console.log(`\n## ${d.nome}  (${d.refeicoes.length} refeições, ${d.refeicoes.reduce((a, x) => a + x.itens.length, 0)} itens)  notas: ${JSON.stringify(d.notas)}`);
  for (const f of d.refeicoes) console.log(`  ${f.horario} ${f.nome}: ` + f.itens.map((i) => `${i.nome.slice(0, 28)} [${i.gramas ?? '?'}${i.unidade ?? ''}]`).join(' · ')); }
console.log('\nAvisos:', r.avisos);
