// Gera a migração com a base global de alimentos (docs/v2/ARCHITECTURE.md 7.3, D40):
// TACO 4ª ed. (NEPA/UNICAMP, reprodução permitida com citação; JSON via isaquetdiniz/taco-api, MIT) + rótulos
// genéricos de referencia/dieta/alimentos.js, com o grupo de substituição de referencia/dieta/substituicoes.js.
// Ids estáveis (uuid v5 de "taco:<id>" / "rotulo:<id>"), para o mesmo alimento ter o mesmo id em qualquer projeto.
// Uso: node scripts/gerar-seeds.mjs  (reescreve supabase/migrations/20261127120100_v1_alimentos.sql)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { GRUPOS, GRUPO_DE } from '../referencia/dieta/substituicoes.js';
import { ROTULO } from '../referencia/dieta/alimentos.js';

const DESTINO = new URL('../supabase/migrations/20261127120100_v1_alimentos.sql', import.meta.url);
// Namespace próprio do Repz para os uuid v5 (gerado uma vez; não mude)
const NAMESPACE = '6f1c2b0e-8a4d-5c3e-9b7a-2d4e6f8a1c3b';

export function uuidv5(nome, ns = NAMESPACE) {
  const bytesNs = Buffer.from(ns.replace(/-/g, ''), 'hex');
  const h = createHash('sha1')
    .update(Buffer.concat([bytesNs, Buffer.from(nome, 'utf8')]))
    .digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

// "Tr" = traços = 0; "*", "NA" e vazio = sem dado
const num = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v === 'Tr' ? 0 : null);
const sql = (v) =>
  v == null ? 'null' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;

// Grupo de cada alimento: o mapeamento explícito; senão, o 1º grupo em que ele aparece como candidato
const grupoDe = (nome) =>
  GRUPO_DE[nome] ?? Object.entries(GRUPOS).find(([, g]) => g.candidatos?.includes(nome))?.[0] ?? null;

const taco = JSON.parse(readFileSync(new URL('../referencia/dieta/taco.json', import.meta.url), 'utf8'));
const linhas = [
  ...taco.map((t) => ({
    id: uuidv5(`taco:${t.id}`),
    nome: t.description,
    fonte: 'taco',
    categoria: t.category,
    kcal: num(t.energy_kcal),
    p: num(t.protein_g),
    c: num(t.carbohydrate_g),
    g: num(t.lipid_g),
    fibra: num(t.fiber_g),
  })),
  ...ROTULO.map((r) => ({
    id: uuidv5(`rotulo:${r.id.replace(/^rot:/, '')}`),
    nome: r.nome,
    fonte: 'rotulo',
    categoria: 'Rótulo genérico (confira o seu)',
    kcal: r.kcal,
    p: r.p,
    c: r.c,
    g: r.g,
    fibra: null,
  })),
];

const valores = linhas.map(
  (a) =>
    `(${[a.id, a.nome, a.fonte, a.categoria, a.kcal, a.p, a.c, a.g, a.fibra, grupoDe(a.nome)].map(sql).join(', ')}, null)`,
);
const texto = `-- GERADO por scripts/gerar-seeds.mjs: não edite à mão.
-- Base global de alimentos (user_id nulo, somente leitura): ${taco.length} da TACO 4ª ed. (NEPA/UNICAMP, 2011;
-- reprodução permitida com citação da fonte) + ${ROTULO.length} rótulos genéricos. Valores por 100 g.
insert into public.alimentos (id, nome, fonte, categoria, kcal, p, c, g, fibra, grupo_substituicao, user_id) values
${valores.join(',\n')};
`;
writeFileSync(DESTINO, texto);
console.log(
  `${linhas.length} alimentos (${linhas.filter((l) => grupoDe(l.nome)).length} com grupo) → ${DESTINO.pathname}`,
);
