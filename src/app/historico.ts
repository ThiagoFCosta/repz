// Histórico, visão Treinos e cardio (BRIEFING 9.7 e 9.8). Toda escrita recarrega o estado global:
// editar ou excluir uma série muda o histórico que o motor lê no próximo treino.

import {
  exerciciosComHistorico,
  historicoDoExercicio,
  indiceDeExercicios,
  type ExercicioComHistorico,
  type HistoricoExercicio,
} from '../dados/historico-repo';
import { excluirCardio, salvarCardio } from '../dados/repos/cardio';
import {
  editarSerieSalva,
  excluirSerie as excluirSerieDb,
  excluirTreino as excluirTreinoDb,
  listarTreinosConcluidos,
  seriesDoTreino,
  type DadosEdicao,
} from '../dados/repos/treinos';
import type { CardioRealizado, SerieRealizada, Treino } from '../dados/tipos';
import { configs, db, planoAtivo, planos, recarregar } from './estado';

export const listarExercicios = (): Promise<ExercicioComHistorico[]> =>
  exerciciosComHistorico(db, configs.value, planoAtivo.value);

export const carregarHistorico = (chave: string): Promise<HistoricoExercicio> =>
  historicoDoExercicio(db, configs.value, planos.value, chave);

export const listarTreinos = (): Promise<Treino[]> => listarTreinosConcluidos(db);

export interface TreinoCompleto {
  treino: Treino;
  series: SerieRealizada[];
  porTempo: Set<string>; // exercicioPrescritoId dos exercícios por tempo
}

export async function carregarTreino(id: string): Promise<TreinoCompleto | null> {
  const treino = await db.treinos.get(id);
  if (!treino || treino.status !== 'concluido') return null;
  const indice = indiceDeExercicios(planos.value);
  const series = await seriesDoTreino(db, id);
  const porTempo = new Set(
    series.map((s) => s.exercicioPrescritoId).filter((e) => indice.get(e)?.ex.porTempo),
  );
  return { treino, series, porTempo };
}

export async function editarSerie(id: string, dados: DadosEdicao): Promise<void> {
  await editarSerieSalva(db, id, dados);
  await recarregar();
}

export async function excluirSerie(id: string): Promise<void> {
  await excluirSerieDb(db, id);
  await recarregar();
}

export async function excluirTreino(id: string): Promise<void> {
  await excluirTreinoDb(db, id);
  await recarregar(); // a rotação pode mudar
}

export async function gravarCardio(c: CardioRealizado): Promise<void> {
  await salvarCardio(db, c);
  await recarregar();
}

export async function apagarCardio(id: string): Promise<void> {
  await excluirCardio(db, id);
  await recarregar();
}
