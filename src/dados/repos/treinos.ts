// Leitura de treinos e séries (a escrita chega com a máquina de estados no M3).

import type { RepzDb } from '../db';
import type { Treino } from '../tipos';

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
