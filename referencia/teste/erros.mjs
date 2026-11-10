import fs from 'node:fs';
import { parse } from '../parser/parser.js';
const base = fs.readFileSync('../tests/fixtures/raul.treino.txt', 'utf8');
const casos = {
  'sem marcador de fim': base.replace('#TREINO-FIM', ''),
  'sem bloco nenhum (PDF comum)': 'Plano de treino...\nSupino 3x10',
  'exercício faltando (TOTAL não bate)': base.replace(/EX: Rosca martelo.*\n/, ''),
  'campo faltando': base.replace('EX: Hip thrust | 3 | 8-12 | 120s', 'EX: Hip thrust | 3 | 8-12'),
  'reps inválidas': base.replace('Leg press | 3 | 8-12', 'Leg press | 3 | oito a doze'),
  'fases sobrepostas': base.replace('FASE: 5-8', 'FASE: 4-8'),
  'colado do chat com markdown': '```\n' + base + '\n```',
};
for (const [nome, txt] of Object.entries(casos)) {
  const r = parse(txt);
  console.log(`\n# ${nome} → ${r.plano ? 'IMPORTA' : 'BLOQUEIA'}`);
  r.erros.forEach((e) => console.log('  ERRO', e.linha ? `linha ${e.linha}:` : '', e.msg));
}
