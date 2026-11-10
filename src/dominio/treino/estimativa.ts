// Duração estimada da sessão (BRIEFING 9.3): soma de séries × (tempo médio da série + descanso).
// Bi-set: o descanso vem só no fim de cada rodada.

import type { Faixa } from '../tipos';

export const TEMPO_SERIE_S = 45; // tempo médio de execução de uma série

export interface ItemEstimativa {
  series: number; // já com a periodização da semana
  reps: Faixa;
  porTempo: boolean;
  descanso: Faixa | null; // segundos; vale o máximo da faixa (padrão do cronômetro)
  grupo: number | null;
}

const execucao = (it: ItemEstimativa) => (it.porTempo ? it.reps.max : TEMPO_SERIE_S);

// Em minutos, arredondado para múltiplo de 5 (mínimo 5)
export function duracaoEstimada(itens: readonly ItemEstimativa[]): number {
  let segundos = 0;
  const grupos = new Map<number, ItemEstimativa[]>();
  for (const it of itens) {
    segundos += it.series * execucao(it);
    if (it.grupo == null) segundos += it.series * (it.descanso?.max ?? 0);
    else grupos.set(it.grupo, [...(grupos.get(it.grupo) ?? []), it]);
  }
  for (const membros of grupos.values()) {
    const rodadas = Math.max(...membros.map((m) => m.series));
    const descanso = Math.max(...membros.map((m) => m.descanso?.max ?? 0));
    segundos += rodadas * descanso;
  }
  return Math.max(5, Math.round(segundos / 60 / 5) * 5);
}
