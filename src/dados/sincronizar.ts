// Motor da sincronização (docs/v2/ARCHITECTURE.md, seção 8): sobe o que está marcado como pendente, na ordem
// das dependências, e desce o que mudou no servidor desde o último cursor de cada tabela. Sem rede, nada se perde:
// as marcas continuam pendentes e a próxima rodada tenta de novo.

import { ORDEM_ENVIO, venceLocal } from '../dominio/sync/regras';
import { ErroRede, type LinhaRemota, type Remoto } from '../remoto/tipos';
import type { RepzDb } from './db';
import { doRemoto, idRemoto, paraRemoto, TABELA_DA_STORE, type StoreSync } from './mapa';
import { chaveMarca, marcarTransacaoDoServidor, type MarcaSincronia } from './sincronia';

const LOTE = 200;
const PAGINA = 500;
const STORE_DA_TABELA = Object.fromEntries(Object.entries(TABELA_DA_STORE).map(([s, t]) => [t, s])) as Record<
  string,
  StoreSync
>;
const CURSOR = '_cursor';

export interface ResumoSync {
  enviados: number;
  recusados: number;
  recebidos: number;
}

const lotes = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

function tabelaDaMarca(m: MarcaSincronia): string | null {
  if (m.store === 'meta') return m.id === 'preferencias' ? 'preferencias' : null;
  return TABELA_DA_STORE[m.store as StoreSync] ?? null;
}

// Confirma as marcas enviadas, se o registro não mudou enquanto subia
async function confirmar(db: RepzDb, enviadas: MarcaSincronia[]): Promise<void> {
  await db.transaction('rw', db.sincronia, async () => {
    for (const m of enviadas) {
      const atual = await db.sincronia.get(m.chave);
      if (atual && atual.modificadoEm === m.modificadoEm) {
        if (atual.excluido) await db.sincronia.delete(m.chave);
        else await db.sincronia.update(m.chave, { pendente: 0, erro: null });
      }
    }
  });
}

export async function enviarPendentes(
  db: RepzDb,
  remoto: Remoto,
  usuarioId: string,
): Promise<{ enviados: number; recusados: number }> {
  const marcas = (await db.sincronia.where('pendente').equals(1).toArray()).filter((m) => !m.erro);
  let enviados = 0;
  let recusados = 0;
  for (const tabela of ORDEM_ENVIO) {
    const daTabela = marcas.filter((m) => tabelaDaMarca(m) === tabela);
    if (!daTabela.length) continue;
    const store = STORE_DA_TABELA[tabela]!;

    // Exclusões: excluido_em no servidor (a linha pode nem ter chegado lá; aí não há o que marcar)
    const exclusoes = daTabela.filter((m) => m.excluido);
    if (exclusoes.length) {
      await remoto.excluir(
        tabela,
        exclusoes.map((m) => ({ id: idRemoto(store, m.id, usuarioId), em: m.modificadoEm })),
      );
      await confirmar(db, exclusoes);
      enviados += exclusoes.length;
    }

    const vivas = daTabela.filter((m) => !m.excluido);
    for (const lote of lotes(vivas, LOTE)) {
      const registros = await db.table(store).bulkGet(lote.map((m) => m.id));
      const pares = lote
        .map((m, i) => ({
          m,
          r: store === 'meta' ? (registros[i] as { valor?: unknown } | undefined)?.valor : registros[i],
        }))
        .filter((p) => p.r != null);
      const linhas = pares.map((p) => paraRemoto(store, p.r, usuarioId, p.m.modificadoEm));
      const { recusadas } = await remoto.enviar(tabela, linhas);
      const ruins = new Map(recusadas.map((r) => [r.id, r.motivo]));
      const ok = pares.filter((p) => !ruins.has(idRemoto(store, p.m.id, usuarioId))).map((p) => p.m);
      // registro sumiu sem marca de exclusão (não deveria acontecer): confirma para a marca não ficar presa
      const sumidos = lote.filter((_, i) => registros[i] == null);
      await confirmar(db, [...ok, ...sumidos]);
      await db.transaction('rw', db.sincronia, async () => {
        for (const p of pares) {
          const motivo = ruins.get(idRemoto(store, p.m.id, usuarioId));
          if (motivo) await db.sincronia.update(p.m.chave, { erro: motivo });
        }
      });
      enviados += ok.length;
      recusados += ruins.size;
    }
  }

  // Plano ativo: um por usuário, depois que os planos já estão no servidor
  const ativo = marcas.find((m) => m.store === 'meta' && m.id === 'planoAtivoId');
  if (ativo) {
    const valor = (await db.meta.get('planoAtivoId'))?.valor as string | null | undefined;
    await remoto.ativarPlano(valor ?? null, ativo.modificadoEm);
    await confirmar(db, [ativo]);
    enviados++;
  }
  return { enviados, recusados };
}

// Aplica as linhas do servidor numa transação marcada "do servidor" (não gera marca nova)
async function aplicar(db: RepzDb, tabela: string, linhas: LinhaRemota[]): Promise<number> {
  const store = STORE_DA_TABELA[tabela]!;
  let mudou = 0;
  await db.transaction('rw', [db.table(store), db.sincronia, db.meta], async (tx) => {
    marcarTransacaoDoServidor(tx.idbtrans);
    for (const l of linhas) {
      const r = doRemoto(tabela, l);
      if (!r) continue;
      const marca = await db.sincronia.get(chaveMarca(store, r.id));
      if (marca?.pendente && venceLocal(marca.modificadoEm, l.atualizado_em)) continue;
      if (l.excluido_em) await db.table(store).delete(r.id);
      else await db.table(store).put(r.registro);
      if (marca) await db.sincronia.delete(marca.chave);
      mudou++;
      // plano ativo do servidor vale aqui, se a escolha local não estiver pendente
      if (tabela === 'planos_treino' && l.ativo === true && !l.excluido_em) {
        const m = await db.sincronia.get(chaveMarca('meta', 'planoAtivoId'));
        if (!m?.pendente) await db.meta.put({ chave: 'planoAtivoId', valor: r.id });
      }
    }
  });
  return mudou;
}

export async function receberNovidades(db: RepzDb, remoto: Remoto): Promise<number> {
  let total = 0;
  for (const tabela of ORDEM_ENVIO) {
    const chave = chaveMarca(CURSOR, tabela);
    for (;;) {
      const cursor = (await db.sincronia.get(chave))?.modificadoEm ?? null;
      const linhas = await remoto.receber(tabela, cursor, PAGINA);
      if (!linhas.length) break;
      total += await aplicar(db, tabela, linhas);
      const ultimo = linhas.at(-1)!.servidor_em!;
      await db.sincronia.put({
        chave,
        store: CURSOR,
        id: tabela,
        pendente: 0,
        excluido: false,
        modificadoEm: ultimo,
      });
      if (linhas.length < PAGINA) break;
    }
  }
  return total;
}

export async function sincronizar(db: RepzDb, remoto: Remoto, usuarioId: string): Promise<ResumoSync> {
  const { enviados, recusados } = await enviarPendentes(db, remoto, usuarioId);
  const recebidos = await receberNovidades(db, remoto);
  return { enviados, recusados, recebidos };
}

export async function contarPendentes(db: RepzDb): Promise<{ pendentes: number; erros: MarcaSincronia[] }> {
  const marcas = await db.sincronia.where('pendente').equals(1).toArray();
  return { pendentes: marcas.length, erros: marcas.filter((m) => m.erro) };
}

// "Tentar de novo": tira o erro das marcas recusadas para a próxima rodada reenviar
export async function limparErros(db: RepzDb): Promise<void> {
  await db.sincronia
    .where('pendente')
    .equals(1)
    .modify((m) => {
      m.erro = null;
    });
}

export { ErroRede };
