import type { HTMLAttributes, ReactNode } from 'react';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  /** split: segmento chart-1 + resto lime (pontuação/limite); bar: preenchimento lime em trilho menta; track-gray: trilho cinza */
  variant?: 'split' | 'bar' | 'track-gray';
  height?: number;
  label?: ReactNode;
  valueLabel?: ReactNode;
  caption?: ReactNode;
  gap?: number;
}

export function ProgressBar({ value = 0, max = 100, variant = 'split', height = 12, label, valueLabel, caption, gap = 6, style, ...rest }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const r = Math.min(height / 2, 6);
  const bar = variant === 'split' ? (
    <div style={{ display: 'flex', gap, height }}>
      <div style={{ width: `${pct}%`, background: 'var(--chart-1)', borderRadius: r, transition: 'width var(--duration-chart) var(--ease-out)' }} />
      {pct < 100 ? <div style={{ flex: 1, background: 'var(--chart-2)', borderRadius: r }} /> : null}
    </div>
  ) : (
    <div style={{ height, background: variant === 'track-gray' ? 'var(--chart-track)' : 'var(--chart-3)', borderRadius: r, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--chart-2)', borderRadius: r, transition: 'width var(--duration-chart) var(--ease-out)' }} />
    </div>
  );
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={typeof label === 'string' ? label : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, ...style }} {...rest}>
      {label || valueLabel ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ font: '400 var(--text-sm)/1.2 var(--font-sans)', color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ font: '600 var(--text-sm)/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>{valueLabel}</span>
        </div>
      ) : null}
      {bar}
      {caption ? <span style={{ font: '400 var(--text-xs)/1.3 var(--font-sans)', color: 'var(--text-secondary)' }}>{caption}</span> : null}
    </div>
  );
}
