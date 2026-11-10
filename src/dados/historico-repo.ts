// Histórico por variante na forma que o motor de carga espera (ARCHITECTURE 4.7 e 5.3):
// chaves equivalentes por apelido, sem aquecimento, só de treinos concluídos, agrupado por treino.

import Dexie from 'dexie';
import type { TreinoHistorico } from '../dominio/progressao/motor';
import type { RepzDb } from './db';
import { chavesEquivalentes, type MapaConfig } from './repos/config';

export interface HistoricoVariante {
  treinos: TreinoHistorico[]; // em ordem cronológica
  ultimaEm: string | null; // feitaEm da série mais recente (escolha da variante padrão, D3)
}

// Datas dos treinos concluídos, por id
export async function treinosConcluidos(db: RepzDb): Promise<Map<string, string>> {
  const ts = await db.treinos.where('status').equals('concluido').toArray();
  return new Map(ts.map((t) => [t.id, t.data]));
}

export async function historicoDaChave(
  db: RepzDb,
  configs: MapaConfig,
  chave: string,
  concluidos: Map<string, string>,
): Promise<HistoricoVariante> {
  const chaves = chavesEquivalentes(configs, chave, []);
  const series = (
    await Promise.all(
      chaves.map((k) =>
        db.series.where('[chave+feitaEm]').between([k, Dexie.minKey], [k, Dexie.maxKey]).toArray(),
      ),
    )
  )
    .flat()
    .filter((s) => !s.aquecimento && concluidos.has(s.treinoId))
    .sort((a, b) => a.feitaEm.localeCompare(b.feitaEm));

  const porTreino = new Map<string, TreinoHistorico>();
  for (const s of series) {
    let t = porTreino.get(s.treinoId);
    if (!t) porTreino.set(s.treinoId, (t = { data: concluidos.get(s.treinoId)!, series: [] }));
    t.series.push({ kg: s.kg, reps: s.reps, rir: s.rir });
  }
  return { treinos: [...porTreino.values()], ultimaEm: series.at(-1)?.feitaEm ?? null };
}
