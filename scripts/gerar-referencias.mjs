// Gera a semente da tabela `referencias` a partir de src/dominio/referencias.ts (fonte única, BRIEFING-v2 11).
// Uso: node scripts/gerar-referencias.mjs  (o Node 24 lê TypeScript direto). Reescreve a migração abaixo e depois
// é só `npm run db:push`.
import { writeFileSync } from 'node:fs';
import { REFERENCIAS } from '../src/dominio/referencias.ts';

const DESTINO = new URL('../supabase/migrations/20261127140000_v4_referencias.sql', import.meta.url);
const sql = (v) => (v == null ? 'null' : `'${String(v).replaceAll("'", "''")}'`);
const arr = (xs) => `array[${xs.map(sql).join(', ')}]::text[]`;

const linhas = REFERENCIAS.map(
  (r) =>
    `(${[sql(r.chave), sql(r.citacao), sql(r.doiUrl), sql(r.nivel), sql(r.resumo), arr(r.sustenta)].join(', ')})`,
);
writeFileSync(
  DESTINO,
  `-- GERADO por scripts/gerar-referencias.mjs a partir de src/dominio/referencias.ts: não edite à mão.
-- Referências científicas (BRIEFING-v2, seção 11), conferidas na fonte em 27/11/2026.
insert into public.referencias (chave, citacao, doi_url, nivel, resumo, sustenta) values
${linhas.join(',\n')}
on conflict (chave) do update set citacao = excluded.citacao, doi_url = excluded.doi_url, nivel = excluded.nivel,
  resumo = excluded.resumo, sustenta = excluded.sustenta;
`,
);
console.log(`${REFERENCIAS.length} referências → ${DESTINO.pathname}`);
