import type { HTMLAttributes, ReactNode } from 'react';

/** Faixa do medidor: vai do fim da anterior (ou 0) até `to` (inclusive), na escala 0..1. */
export interface GaugeBand { to: number; label: string }

/** Faixas do investidômetro (02 §12): ≤ 22,5% · ≤ 45% · ≤ 55% · ≤ 77,5% · acima. */
export const GAUGE_BANDS_INVESTIDOMETRO: GaugeBand[] = [
  { to: 0.225, label: 'Muito endividado!' },
  { to: 0.45, label: 'Endividado' },
  { to: 0.55, label: 'Quase no zero a zero!' },
  { to: 0.775, label: 'Investidor' },
  { to: 1, label: 'Mega Investidor!' },
];

export interface GaugeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Valor de 0 a 1; `null` = sem dados (sem ponteiro). Valores fora da escala ficam no limite. */
  value: number | null;
  /** Até 5 faixas, em ordem crescente; a última termina em 1. Cores `--gauge-1..5`. */
  bands?: GaugeBand[];
  /** Texto principal; padrão: o rótulo da faixa do valor. */
  label?: ReactNode;
  /** Texto do valor no centro; padrão: o percentual com uma casa. */
  valueLabel?: ReactNode;
  caption?: ReactNode;
  /** Largura em px (a altura é ~metade). */
  size?: number;
  loading?: boolean;
}

/** Índice da faixa do valor (limites inclusivos, primeiro que couber — igual à planilha). */
export function gaugeBandIndex(value: number, bands: GaugeBand[] = GAUGE_BANDS_INVESTIDOMETRO): number {
  const i = bands.findIndex((b) => value <= b.to);
  return i === -1 ? bands.length - 1 : i;
}

const fmtPct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** Medidor em semicírculo com faixas coloridas e ponteiro (investidômetro). */
export function Gauge({ value, bands = GAUGE_BANDS_INVESTIDOMETRO, label, valueLabel, caption, size = 240, loading = false, style, ...rest }: GaugeProps) {
  const stroke = Math.max(10, Math.round(size * 0.09));
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = r + stroke / 2;
  const h = cy + stroke / 2;
  const ponto = (t: number, raio = r) => {
    const a = Math.PI * (1 - t);
    return [cx + raio * Math.cos(a), cy - raio * Math.sin(a)];
  };
  const arco = (t0: number, t1: number) => {
    const [x0, y0] = ponto(t0);
    const [x1, y1] = ponto(t1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const semDados = value === null || !Number.isFinite(value);
  const v = semDados ? 0 : Math.max(0, Math.min(1, value));
  const ativa = loading || semDados ? -1 : gaugeBandIndex(v, bands);
  const gap = 0.006;
  const texto = loading ? 'Carregando…' : semDados ? 'Sem dados' : label ?? bands[ativa]!.label;
  const [nx, ny] = ponto(v, r - stroke * 0.9);
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={semDados || loading ? undefined : Math.round(v * 1000) / 10}
      aria-valuetext={typeof texto === 'string' ? (semDados || loading ? texto : `${fmtPct(v)} · ${texto}`) : fmtPct(v)}
      aria-busy={loading || undefined}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: size, maxWidth: '100%', ...style }}
      {...rest}
    >
      <svg width="100%" viewBox={`0 0 ${size} ${h}`} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
        {bands.map((b, i) => {
          const t0 = i === 0 ? 0 : bands[i - 1]!.to;
          return (
            <path
              key={i}
              d={arco(Math.min(t0 + (i === 0 ? 0 : gap), b.to), Math.max(t0, b.to - (i === bands.length - 1 ? 0 : gap)))}
              fill="none"
              stroke={loading ? 'var(--chart-track)' : `var(--gauge-${i + 1})`}
              strokeWidth={stroke}
              strokeLinecap="butt"
              opacity={ativa === -1 || ativa === i ? 1 : 0.35}
              style={{ transition: 'opacity var(--duration-chart) var(--ease-out)' }}
            />
          );
        })}
        {!semDados && !loading ? (
          <g style={{ transition: 'transform var(--duration-chart) var(--ease-out)' }}>
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--text-primary)" strokeWidth={Math.max(2, stroke / 4)} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={Math.max(4, stroke / 2.2)} fill="var(--text-primary)" />
          </g>
        ) : null}
      </svg>
      <span style={{ font: '600 var(--text-2xl)/1.1 var(--font-sans)', letterSpacing: 'var(--tracking-snug)', color: 'var(--text-primary)' }}>
        {loading ? '—' : semDados ? '—' : valueLabel ?? fmtPct(v)}
      </span>
      <span style={{ font: '600 var(--text-sm)/1.3 var(--font-sans)', color: loading || semDados ? 'var(--text-secondary)' : 'var(--text-primary)', textAlign: 'center' }}>{texto}</span>
      {caption ? <span style={{ font: '400 var(--text-xs)/1.3 var(--font-sans)', color: 'var(--text-secondary)', textAlign: 'center' }}>{caption}</span> : null}
    </div>
  );
}
