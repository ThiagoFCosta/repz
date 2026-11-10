import { formatarDecimal } from '../../../dominio/numeros';
import type { Acao } from '../../../dominio/progressao/motor';
import type { TipoCartao } from '../../../dominio/treino/resumo';

const dois = (n: number) => String(n).padStart(2, '0');

// 95 → '1:35'
export function mmss(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${dois(s % 60)}`;
}

// Tempo decorrido: '12:05' ou '1:02:05'
export function decorrido(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${dois(Math.floor((s % 3600) / 60))}:${dois(s % 60)}` : mmss(s);
}

// '52 min' | '1 h 05 min'
export function duracaoTxt(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${dois(min % 60)} min`;
}

// '80 kg × 10 · 10 · 9' (mesma carga) | '80×10 · 77,5×8' (cargas diferentes); por tempo em segundos
export function seriesTxt(series: readonly { kg: number; reps: number }[], porTempo = false): string {
  if (!series.length) return '';
  const u = porTempo ? ' s' : '';
  const kgs = new Set(series.map((s) => s.kg));
  if (kgs.size === 1) {
    const kg = series[0]!.kg;
    const reps = series.map((s) => `${s.reps}${u}`).join(' · ');
    return porTempo && kg === 0 ? reps : `${formatarDecimal(kg)} kg × ${reps}`;
  }
  return series.map((s) => `${formatarDecimal(s.kg)}×${s.reps}${u}`).join(' · ');
}

export const ICONE_ACAO: Record<Acao, string> = { aumentar: '↑', manter: '=', reduzir: '↓', calibrar: '·' };

export const rirTxt = (rir: number | null) => (rir == null ? '–' : rir >= 4 ? '4+' : String(rir));

export const ICONE_CARTAO: Record<TipoCartao, string> = {
  aumentar: '↑',
  manter: '=',
  reduzir: '↓',
  alerta: '!',
};
