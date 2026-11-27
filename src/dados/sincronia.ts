// Marca de sincronização (docs/v2/ARCHITECTURE.md, seção 8): um middleware do Dexie registra, NA MESMA
// TRANSAÇÃO de cada escrita, uma linha na store `sincronia` dizendo que aquele registro precisa subir. Assim
// nenhuma escrita fica sem marca (ou entra tudo, ou nada) e os repositórios da v1 não mudam.
// A marca fica fora do registro: o backup e os tipos da v1 continuam iguais.

import type { DBCore, DBCoreMutateRequest, DBCoreTransaction, Middleware } from 'dexie';

// Stores locais que sobem para o Supabase; em `meta`, só as chaves abaixo
export const STORES_SINCRONIZADAS = new Set([
  'planos',
  'treinos',
  'series',
  'cardio',
  'configExercicios',
  'meta',
  'checkins',
  'sugestoes',
]);
export const META_SINCRONIZADA = new Set(['preferencias', 'planoAtivoId']);

export interface MarcaSincronia {
  chave: string; // `${store}|${id}`
  store: string;
  id: string;
  pendente: 0 | 1;
  excluido: boolean;
  modificadoEm: string; // ISO: vira atualizado_em no servidor (last-write-wins)
  erro?: string | null; // recusado pelo servidor (4xx): fica parado até "Tentar de novo"
}

export const chaveMarca = (store: string, id: string) => `${store}|${id}`;

// Escritas feitas pelo próprio sincronizador (dados que vieram do servidor) não geram marca
const transacoesDoServidor = new WeakSet<object>();
export function marcarTransacaoDoServidor(idbtrans: object): void {
  transacoesDoServidor.add(idbtrans);
}

let ultimo = 0;
// Relógio estritamente crescente: duas escritas no mesmo milissegundo não empatam no last-write-wins
function agoraISO(): string {
  ultimo = Math.max(Date.now(), ultimo + 1);
  return new Date(ultimo).toISOString();
}

export const middlewareSincronia: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'repz-sincronia',
  create(down) {
    return {
      ...down,
      transaction(stores, mode, options) {
        const precisa = mode === 'readwrite' && stores.some((s) => STORES_SINCRONIZADAS.has(s));
        return down.transaction(
          precisa && !stores.includes('sincronia') ? [...stores, 'sincronia'] : stores,
          mode,
          options,
        );
      },
      table(nome) {
        const tabela = down.table(nome);
        if (!STORES_SINCRONIZADAS.has(nome)) return tabela;
        return {
          ...tabela,
          async mutate(req: DBCoreMutateRequest) {
            const doServidor = transacoesDoServidor.has(req.trans as object);
            let apagadas: unknown[] | null = null;
            if (req.type === 'deleteRange' && !doServidor) {
              const r = await tabela.query({
                trans: req.trans,
                values: false,
                query: { index: tabela.schema.primaryKey, range: req.range },
              });
              apagadas = r.result;
            }
            const res = await tabela.mutate(req);
            if (doServidor) return res;
            const excluido = req.type === 'delete' || req.type === 'deleteRange';
            let chaves: unknown[];
            if (req.type === 'delete') chaves = req.keys;
            else if (req.type === 'deleteRange') chaves = apagadas ?? [];
            else chaves = (res.results ?? req.keys ?? []).filter((_, i) => !res.failures[i]);
            const ids = chaves.filter((k): k is string => typeof k === 'string');
            const validos = nome === 'meta' ? ids.filter((k) => META_SINCRONIZADA.has(k)) : ids;
            if (validos.length) await registrar(down, req.trans, nome, validos, excluido);
            return res;
          },
        };
      },
    };
  },
};

async function registrar(
  down: DBCore,
  trans: DBCoreTransaction,
  store: string,
  ids: string[],
  excluido: boolean,
) {
  const modificadoEm = agoraISO();
  const values: MarcaSincronia[] = ids.map((id) => ({
    chave: chaveMarca(store, id),
    store,
    id,
    pendente: 1,
    excluido,
    modificadoEm,
    erro: null,
  }));
  await down.table('sincronia').mutate({ type: 'put', trans, values });
}
