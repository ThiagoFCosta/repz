// Prescrição efetiva de um exercício numa semana do bloco (BRIEFING 6.2).

import type { ExercicioImportado, Faixa, Fase, PlanoImportado } from '../tipos';

export interface Prescricao {
  series: number;
  reps: Faixa;
  porTempo: boolean;
  rir: Faixa;
  descanso: Faixa | null;
  fase: Fase | null;
}

type PlanoPeriodizado = Pick<PlanoImportado, 'bloco' | 'progressao'>;
type ExercicioPrescrito = Pick<
  ExercicioImportado,
  'series' | 'reps' | 'porTempo' | 'descanso' | 'rir' | 'iso' | 'foco'
>;

export function faseDaSemana(plano: PlanoPeriodizado, semana: number | null): Fase | null {
  if (semana == null) return null;
  return plano.bloco?.fases.find((f) => semana >= f.de && semana <= f.ate) ?? null;
}

/**
 * @param semana  semana do bloco (null quando o plano não tem BLOCO)
 * @param foco    foco efetivo: a configuração do usuário tem prioridade sobre o plano (6.2)
 */
export function prescricao(
  plano: PlanoPeriodizado,
  ex: ExercicioPrescrito,
  semana: number | null,
  foco: boolean = ex.foco,
): Prescricao {
  const fase = faseDaSemana(plano, semana);
  let series = ex.series;
  const alvo = fase?.series?.alvo;
  if (fase?.series && (alvo === 'todos' || (alvo === 'foco' && foco) || (alvo === 'iso' && ex.iso)))
    series += fase.series.delta;
  if (fase && fase.volume < 1) series = Math.max(1, Math.ceil(series * fase.volume));
  const rir = ex.rir ?? (ex.iso ? fase?.rirIso : null) ?? fase?.rir ?? plano.progressao.rir;
  return { series, reps: ex.reps, porTempo: ex.porTempo, rir, descanso: ex.descanso, fase };
}
