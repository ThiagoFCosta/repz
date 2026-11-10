import type { Faixa } from '../../../dominio/tipos';

export const faixaTxt = (f: Faixa) => (f.min === f.max ? `${f.min}` : `${f.min}-${f.max}`);

// "3 × 6-10" | "3 × 30-45 s"
export function seriesReps(series: number, reps: Faixa, porTempo: boolean): string {
  return `${series} × ${faixaTxt(reps)}${porTempo ? ' s' : ''}`;
}

export function descansoTxt(d: Faixa | null): string {
  return d ? `${faixaTxt(d)} s` : 'sem descanso';
}
