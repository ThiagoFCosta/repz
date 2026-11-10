// Treinos e séries. Toda mudança do treino em andamento passa por persistirTransicao (ARCHITECTURE 7.4).

import type { RepzDb } from '../db';
import type { SerieRealizada, Treino } from '../tipos';

export async function treinoEmAndamento(db: RepzDb): Promise<Treino | null> {
  return (await db.treinos.where('status').equals('em_andamento').first()) ?? null;
}

// Chaves de variante que já têm séries registradas (exceto de treinos descartados) → nome da variante
export async function chavesComHistorico(db: RepzDb): Promise<Map<string, string>> {
  const descartados = new Set(await db.treinos.where('status').equals('descartado').primaryKeys());
  const chaves = new Map<string, string>();
  await db.series.each((s) => {
    if (!s.aquecimento && !descartados.has(s.treinoId)) chaves.set(s.chave, s.variante);
  });
  return chaves;
}

// Último treino concluído do plano (para a rotação de sessões)
export async function ultimoConcluido(db: RepzDb, planoId: string): Promise<Treino | null> {
  const ts = await db.treinos.where('[planoId+status]').equals([planoId, 'concluido']).toArray();
  return ts.reduce<Treino | null>((a, t) => (!a || t.inicio > a.inicio ? t : a), null);
}

export async function seriesDoTreino(db: RepzDb, treinoId: string): Promise<SerieRealizada[]> {
  const s = await db.series.where('treinoId').equals(treinoId).toArray();
  return s.sort((a, b) => a.feitaEm.localeCompare(b.feitaEm));
}

export async function criarTreino(db: RepzDb, treino: Treino): Promise<void> {
  await db.transaction('rw', db.treinos, async () => {
    if (await db.treinos.where('status').equals('em_andamento').count())
      throw new Error('Já existe um treino em andamento.');
    await db.treinos.add(treino);
  });
}

export type DadosEdicao = Pick<SerieRealizada, 'kg' | 'reps' | 'rir'>;

export interface Transicao {
  novas: SerieRealizada[];
  edicoes: { id: string; dados: DadosEdicao }[];
  treino: Partial<Pick<Treino, 'estadoUI' | 'atualizadoEm' | 'status' | 'fim' | 'notas'>>;
}

// Grava as séries e o estado do treino numa transação: ou entra tudo, ou nada.
export async function persistirTransicao(db: RepzDb, treinoId: string, t: Transicao): Promise<void> {
  await db.transaction('rw', [db.treinos, db.series], async () => {
    for (const s of t.novas) await db.series.add(s);
    for (const e of t.edicoes)
      if (!(await db.series.update(e.id, e.dados))) throw new Error(`Série ${e.id} não encontrada.`);
    if (!(await db.treinos.update(treinoId, t.treino))) throw new Error(`Treino ${treinoId} não encontrado.`);
  });
}
