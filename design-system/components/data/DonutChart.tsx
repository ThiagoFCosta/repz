import type { HTMLAttributes, ReactNode } from 'react';

export interface DonutSegment { label: string; value: number; color: string }

export interface DonutChartProps extends HTMLAttributes<HTMLDivElement> {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  gap?: number;
  label?: ReactNode;
  value?: ReactNode;
  track?: boolean;
}

/** Rosca de segmentos grossos com 3px de intervalo e rótulo central. */
export function DonutChart({ segments = [], size = 180, thickness = 24, gap = 3, label, value, track = true, style, ...rest }: DonutChartProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const desc = segments.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(', ');
  const offsets = segments.reduce<number[]>((acc, _seg, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + (segments[i - 1]!.value / total) * C], []);
  return (
    <div role="img" aria-label={`${typeof label === 'string' ? `${label}: ` : ''}${typeof value === 'string' ? value : ''}. ${desc}`} style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }} {...rest}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        {track ? <circle cx={size / 2} cy={size / 2} r={r + thickness / 2 + 5} fill="none" stroke="var(--chart-track)" strokeWidth="1" /> : null}
        {segments.map((s, i) => {
          const len = Math.max(0, (s.value / total) * C - gap);
          return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offsets[i]!} style={{ transition: 'stroke-dasharray var(--duration-chart) var(--ease-out)' }} />;
        })}
      </svg>
      {label || value ? (
        <div style={{ position: 'absolute', inset: thickness + 8, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 4, boxShadow: track ? 'inset 0 0 0 1px var(--chart-track)' : 'none' }}>
          {label ? <span style={{ font: '400 var(--text-2xs)/1.2 var(--font-sans)', color: 'var(--text-secondary)' }}>{label}</span> : null}
          {value ? <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: Math.round(size * 0.12), lineHeight: 1, color: 'var(--text-primary)', letterSpacing: 'var(--tracking-snug)' }}>{value}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
