import type { CSSProperties } from 'react';
import { Badge } from '../core/Badge';

export interface DeltaProps {
  value: number;
  suffix?: string;
  precision?: number;
  locale?: string;
  /** trata negativo como bom (despesas) */
  invert?: boolean;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

/** Variação percentual em pílula: verde se bom, vermelho se ruim; sinal de menos verdadeiro (−). */
export function Delta({ value, suffix = '%', precision = 2, locale = 'pt-BR', invert = false, size = 'sm', style }: DeltaProps) {
  const up = value >= 0;
  const good = invert ? !up : up;
  const txt = (up ? '+' : '−') + Math.abs(value).toLocaleString(locale, { minimumFractionDigits: precision, maximumFractionDigits: precision }) + suffix;
  return (
    <Badge tone={good ? 'success' : 'danger'} size={size} shape="pill" icon={up ? 'trending-up' : 'trending-down'} style={style} aria-label={(up ? 'Alta de ' : 'Queda de ') + txt}>
      {txt}
    </Badge>
  );
}
