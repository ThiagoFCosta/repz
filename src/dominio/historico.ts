// Histórico de um exercício (BRIEFING 9.8, ARCHITECTURE 4.6): melhor e1RM por semana para o
// gráfico, com as semanas de deload marcadas; variação em 8 semanas; melhor série.
// Exercício por tempo usa a maior duração (segundos) no lugar do e1RM.

import { inicioDaSemana, somarDias, type ISODate } from './datas';
import { e1rm, umaCasa } from './progressao/e1rm';
import type { SerieHistorico } from './progressao/motor';

export interface TreinoDoExercicio {
  treinoId: string;
  data: ISODate;
  deload: boolean; // a semana do bloco em que o treino foi feito era de deload
  rirPadrao: number; // RIR não anotado vale o ponto médio do alvo (como no motor, 7.2)
  series: SerieHistorico[]; // de trabalho, sem aquecimento
}

export interface MelhorSerie extends SerieHistorico {
  data: ISODate;
  treinoId: string;
  valor: number; // e1RM (kg) ou segundos
}

export function valorDaSerie(s: SerieHistorico, rirPadrao: number, porTempo: boolean): number {
  return porTempo ? s.reps : umaCasa(e1rm(s.kg, s.reps, s.rir ?? rirPadrao));
}

// Melhor série: maior e1RM (ou maior duração); no empate, a mais antiga (quem bateu primeiro)
export function melhorSerie(treinos: readonly TreinoDoExercicio[], porTempo: boolean): MelhorSerie | null {
  let melhor: MelhorSerie | null = null;
  for (const t of treinos)
    for (const s of t.series) {
      const valor = valorDaSerie(s, t.rirPadrao, porTempo);
      if (!melhor || valor > melhor.valor) melhor = { ...s, data: t.data, treinoId: t.treinoId, valor };
    }
  return melhor;
}

export interface PontoSemana {
  semana: ISODate; // segunda-feira
  valor: number; // melhor e1RM (ou duração) da semana
  deload: boolean; // algum treino da semana foi em semana de deload
}

// Um ponto por semana com treino, em ordem cronológica
export function melhorPorSemana(treinos: readonly TreinoDoExercicio[], porTempo: boolean): PontoSemana[] {
  const semanas = new Map<ISODate, PontoSemana>();
  for (const t of treinos) {
    if (!t.series.length) continue;
    const semana = inicioDaSemana(t.data);
    const valor = Math.max(...t.series.map((s) => valorDaSerie(s, t.rirPadrao, porTempo)));
    const p = semanas.get(semana);
    if (!p) semanas.set(semana, { semana, valor, deload: t.deload });
    else semanas.set(semana, { semana, valor: Math.max(p.valor, valor), deload: p.deload || t.deload });
  }
  return [...semanas.values()].sort((a, b) => a.semana.localeCompare(b.semana));
}

export interface Variacao {
  atual: number; // valor da semana mais recente
  referencia: number;
  desde: ISODate; // semana de referência
  delta: number;
  pct: number;
  completa: boolean; // a referência está a 8 semanas ou mais; senão, é o primeiro ponto
}

/**
 * Variação em 8 semanas: semana mais recente contra a última semana com treino até 8 semanas antes
 * dela. Com menos de 8 semanas de histórico, compara com a primeira semana. Um ponto só: null.
 */
export function variacao8Semanas(pontos: readonly PontoSemana[], semanas = 8): Variacao | null {
  const ultimo = pontos.at(-1);
  if (!ultimo || pontos.length < 2) return null;
  const limite = somarDias(ultimo.semana, -7 * semanas);
  const anteriores = pontos.filter((p) => p.semana <= limite);
  const ref = anteriores.at(-1) ?? pontos[0]!;
  const delta = umaCasa(ultimo.valor - ref.valor);
  return {
    atual: ultimo.valor,
    referencia: ref.valor,
    desde: ref.semana,
    delta,
    pct: ref.valor ? umaCasa((delta / ref.valor) * 100) : 0,
    completa: anteriores.length > 0,
  };
}
