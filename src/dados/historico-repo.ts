// Histórico por variante na forma que o motor de carga espera (ARCHITECTURE 4.7 e 5.3):
// chaves equivalentes por apelido, sem aquecimento, só de treinos concluídos, agrupado por treino.

import Dexie from 'dexie';
import type { TreinoDoExercicio } from '../dominio/historico';
import { prescricao } from '../dominio/periodizacao/prescricao';
import type { TreinoHistorico } from '../dominio/progressao/motor';
import type { RepzDb } from './db';
import { canonica, chavesEquivalentes, type MapaConfig } from './repos/config';
import type { ExercicioPrescrito, Plano, Treino } from './tipos';

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

// ---- Tela Histórico (BRIEFING 9.8) ----

export interface ExercicioComHistorico {
  chave: string; // canônica (apelidos resolvidos)
  nome: string; // nome da variante mais recente
  ultimaEm: string;
  noPlanoAtivo: boolean;
}

// Exercícios com séries de trabalho (fora de treinos descartados), inclusive os fora do plano ativo:
// os do plano ativo primeiro, depois os demais, cada grupo em ordem alfabética
export async function exerciciosComHistorico(
  db: RepzDb,
  configs: MapaConfig,
  planoAtivo: Plano | null,
): Promise<ExercicioComHistorico[]> {
  const descartados = new Set(await db.treinos.where('status').equals('descartado').primaryKeys());
  const doPlano = new Set(
    (planoAtivo?.sessoes ?? []).flatMap((s) =>
      s.itens.flatMap((ex) => ex.chaves.map((k) => canonica(configs, k))),
    ),
  );
  const porChave = new Map<string, ExercicioComHistorico>();
  await db.series.each((s) => {
    if (s.aquecimento || descartados.has(s.treinoId)) return;
    const chave = canonica(configs, s.chave);
    const atual = porChave.get(chave);
    if (!atual || s.feitaEm > atual.ultimaEm)
      porChave.set(chave, { chave, nome: s.variante, ultimaEm: s.feitaEm, noPlanoAtivo: doPlano.has(chave) });
  });
  return [...porChave.values()].sort(
    (a, b) => Number(b.noPlanoAtivo) - Number(a.noPlanoAtivo) || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

// Onde cada exercício prescrito está (os ids são únicos entre planos: uuid gerado ao salvar)
export function indiceDeExercicios(
  planos: readonly Plano[],
): Map<string, { plano: Plano; ex: ExercicioPrescrito }> {
  const indice = new Map<string, { plano: Plano; ex: ExercicioPrescrito }>();
  for (const plano of planos)
    for (const s of plano.sessoes) for (const ex of s.itens) indice.set(ex.id, { plano, ex });
  return indice;
}

// Semana usada na prescrição do treino (a do estado salvo segue a D1); senão, a do bloco
const semanaDoTreino = (t: Treino) => t.estadoUI?.semana ?? t.semanaBloco;

export interface TreinoNoHistorico extends TreinoDoExercicio {
  sessaoNome: string;
}

export interface HistoricoExercicio {
  treinos: TreinoNoHistorico[]; // em ordem cronológica
  porTempo: boolean;
}

// Treinos concluídos do exercício (todas as chaves equivalentes), com o deload e o RIR padrão
// tirados da prescrição do plano em que cada treino foi feito
export async function historicoDoExercicio(
  db: RepzDb,
  configs: MapaConfig,
  planos: readonly Plano[],
  chave: string,
): Promise<HistoricoExercicio> {
  const chaves = chavesEquivalentes(configs, chave, []);
  const series = (
    await Promise.all(
      chaves.map((k) =>
        db.series.where('[chave+feitaEm]').between([k, Dexie.minKey], [k, Dexie.maxKey]).toArray(),
      ),
    )
  )
    .flat()
    .filter((s) => !s.aquecimento)
    .sort((a, b) => a.feitaEm.localeCompare(b.feitaEm));
  const treinos = new Map(
    (await db.treinos.bulkGet([...new Set(series.map((s) => s.treinoId))]))
      .filter((t): t is Treino => t?.status === 'concluido')
      .map((t) => [t.id, t]),
  );
  const indice = indiceDeExercicios(planos);

  let porTempo = false;
  const porTreino = new Map<string, TreinoNoHistorico>();
  for (const s of series) {
    const t = treinos.get(s.treinoId);
    if (!t) continue;
    let h = porTreino.get(t.id);
    if (!h) {
      const onde = indice.get(s.exercicioPrescritoId);
      const p = onde ? prescricao(onde.plano, onde.ex, semanaDoTreino(t)) : null;
      const rir = p?.rir ?? planos.find((x) => x.id === t.planoId)?.progressao.rir ?? { min: 1, max: 2 };
      porTempo = p?.porTempo ?? porTempo;
      h = {
        treinoId: t.id,
        data: t.data,
        sessaoNome: t.sessaoNome,
        deload: p?.fase?.deload ?? false,
        rirPadrao: (rir.min + rir.max) / 2,
        series: [],
      };
      porTreino.set(t.id, h);
    }
    h.series.push({ kg: s.kg, reps: s.reps, rir: s.rir });
  }
  return { treinos: [...porTreino.values()], porTempo };
}
