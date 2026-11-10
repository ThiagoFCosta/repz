// Fim do treino (BRIEFING 9.6 e 7.6): volume, recordes e a sugestão "Para o próximo treino".
// Recordes comparam a variante com todo o histórico anterior; o treino atual entra no histórico
// do motor uma única vez (ele ainda não está concluído, então o histórico gravado não o inclui).

import type { ISODate } from '../datas';
import { e1rm, umaCasa } from '../progressao/e1rm';
import type { Acao, SerieHistorico, Sugestao, TreinoHistorico } from '../progressao/motor';
import type { Faixa } from '../tipos';

export interface SerieFeita {
  kg: number;
  reps: number; // segundos quando o exercício é por tempo
}

// Volume total (kg × reps) das séries de trabalho; exercícios por tempo não somam
export function volume(series: readonly (SerieFeita & { porTempo: boolean })[]): number {
  return series.filter((s) => !s.porTempo).reduce((t, s) => t + s.kg * s.reps, 0);
}

// Histórico do motor com o treino atual no fim (sem séries hoje, fica como está)
export function comTreinoAtual(
  antes: readonly TreinoHistorico[],
  data: ISODate,
  hoje: readonly SerieHistorico[],
): TreinoHistorico[] {
  return hoje.length ? [...antes, { data, series: [...hoje] }] : [...antes];
}

export type Recorde =
  | { tipo: 'e1rm'; valor: number; anterior: number; serie: SerieFeita }
  | { tipo: 'carga'; valor: number; anterior: number; serie: SerieFeita }
  | { tipo: 'tempo'; valor: number; anterior: number };

/**
 * Recorde da variante neste treino: melhor e1RM; senão, maior carga; por tempo, maior duração.
 * Primeira vez na variante não é recorde (não há com o que comparar).
 * @param rir  RIR alvo da semana: o ponto médio substitui o RIR não anotado (como no motor, 7.2)
 */
export function recorde(
  hoje: readonly SerieHistorico[],
  antes: readonly TreinoHistorico[],
  presc: { rir: Faixa; porTempo: boolean },
): Recorde | null {
  const anteriores = antes.flatMap((t) => t.series);
  if (!hoje.length || !anteriores.length) return null;

  if (presc.porTempo) {
    const valor = Math.max(...hoje.map((s) => s.reps));
    const anterior = Math.max(...anteriores.map((s) => s.reps));
    return valor > anterior ? { tipo: 'tempo', valor, anterior } : null;
  }

  const rirMeio = (presc.rir.min + presc.rir.max) / 2;
  const e1 = (s: SerieHistorico) => umaCasa(e1rm(s.kg, s.reps, s.rir ?? rirMeio));
  const melhor = hoje.reduce((a, s) => (e1(s) > e1(a) ? s : a));
  const anteriorE1 = Math.max(...anteriores.map(e1));
  if (e1(melhor) > anteriorE1)
    return { tipo: 'e1rm', valor: e1(melhor), anterior: anteriorE1, serie: pick(melhor) };

  const pesada = hoje.reduce((a, s) => (s.kg > a.kg || (s.kg === a.kg && s.reps > a.reps) ? s : a));
  const anteriorKg = Math.max(...anteriores.map((s) => s.kg));
  return pesada.kg > anteriorKg
    ? { tipo: 'carga', valor: pesada.kg, anterior: anteriorKg, serie: pick(pesada) }
    : null;
}

const pick = (s: SerieFeita): SerieFeita => ({ kg: s.kg, reps: s.reps });

// Ícone do cartão "Para o próximo treino" (7.6): ↑ · = · ↓, e ! quando a carga se mantém
// mas há um alerta (queda isolada, estagnação), que é o que o usuário precisa ler (D15)
export type TipoCartao = Exclude<Acao, 'calibrar'> | 'alerta';

export function tipoCartao(s: Pick<Sugestao, 'acao' | 'alertas'>): TipoCartao {
  if (s.acao === 'aumentar' || s.acao === 'reduzir') return s.acao;
  return s.alertas.length ? 'alerta' : 'manter';
}
