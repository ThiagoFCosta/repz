import { useId, useState, type HTMLAttributes, type ReactNode } from 'react';

export interface AreaSeries { name: string; data: number[]; color: string; area?: boolean; dashed?: boolean; width?: number }

export interface AreaChartProps extends HTMLAttributes<HTMLDivElement> {
  labels: string[];
  series: AreaSeries[];
  height?: number;
  ticks?: number;
  min?: number;
  max?: number;
  formatValue?: (v: number) => string;
  formatTick?: (v: number) => string;
  defaultActive?: number;
  tooltip?: (index: number) => ReactNode;
}

function smooth(pts: Array<[number, number]>) {
  if (pts.length < 2) return '';
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i]!, p2 = pts[i + 1]!, p0 = pts[i - 1] || p1, p3 = pts[i + 2] || p2;
    const t = 0.18;
    d += ` C${p1[0] + (p2[0] - p0[0]) * t},${p1[1] + (p2[1] - p0[1]) * t} ${p2[0] - (p3[0] - p1[0]) * t},${p2[1] - (p3[1] - p1[1]) * t} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const niceStep = (range: number, n: number) => { const raw = range / n || 1; const p = Math.pow(10, Math.floor(Math.log10(raw))); const m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };
const brl0 = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const tickK = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`);

const axisText = { font: '500 var(--text-2xs)/1 var(--font-sans)', color: 'var(--text-secondary)' } as const;
const tooltipBox = { padding: '10px 12px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-md), inset 0 0 0 1px var(--border-default)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 2 } as const;

/** Linhas suaves com área em degradê, crosshair tracejado lime e tooltip. */
export function AreaChart({ labels = [], series = [], height = 220, ticks = 5, min, max, formatValue = brl0, formatTick = tickK, defaultActive = -1, tooltip, style, ...rest }: AreaChartProps) {
  const uid = useId().replace(/:/g, '');
  const [active, setActive] = useState(defaultActive);
  const all = series.flatMap((s) => s.data);
  const lo0 = min !== undefined ? min : Math.min(0, ...all);
  const hi0 = max !== undefined ? max : Math.max(...all, 1);
  const step = niceStep(hi0 - lo0, ticks - 1);
  const lo = Math.floor(lo0 / step) * step, hi = Math.ceil(hi0 / step) * step;
  const tickVals: number[] = []; for (let v = hi; v >= lo - 1e-9; v -= step) tickVals.push(v);
  const n = labels.length, pad = 2;
  const x = (i: number) => pad + (n <= 1 ? 50 : (i / (n - 1)) * (100 - pad * 2));
  const y = (v: number) => 100 - ((v - lo) / (hi - lo || 1)) * 100;
  const plotH = height - 28;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '38px minmax(0,1fr)', gap: 6, ...style }} {...rest}>
      <div style={{ position: 'relative', height: plotH }}>
        {tickVals.map((t) => <span key={t} style={{ position: 'absolute', right: 0, top: `${y(t)}%`, transform: 'translateY(-50%)', ...axisText }}>{formatTick(t)}</span>)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ position: 'relative', height: plotH }} onMouseLeave={() => setActive(defaultActive)}>
          {tickVals.map((t) => <div key={t} aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: `${y(t)}%`, borderTop: '1px dashed var(--chart-grid)' }} />)}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
            <defs>
              {series.map((s, si) => (
                <linearGradient key={si} id={`${uid}g${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {series.map((s, si) => {
              const line = smooth(s.data.map((v, i) => [x(i), y(v)]));
              return (
                <g key={si}>
                  {s.area !== false ? <path d={`${line} L${x(n - 1)},100 L${x(0)},100 Z`} fill={`url(#${uid}g${si})`} /> : null}
                  <path d={line} fill="none" stroke={s.color} strokeWidth={s.width || 2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeDasharray={s.dashed ? '4 4' : undefined} />
                </g>
              );
            })}
          </svg>
          {active >= 0 ? (
            <>
              <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: `${x(active)}%`, borderLeft: '1.5px dashed var(--chart-crosshair)' }} />
              {series.map((s, si) => <span key={si} aria-hidden="true" style={{ position: 'absolute', left: `${x(active)}%`, top: `${y(s.data[active]!)}%`, width: 10, height: 10, marginLeft: -5, marginTop: -5, borderRadius: '50%', background: s.color, boxShadow: '0 0 0 3px var(--surface-card)' }} />)}
              <div role="status" style={{ position: 'absolute', top: 8, left: `${x(active)}%`, transform: `translateX(${active > n * 0.6 ? 'calc(-100% - 12px)' : '12px'})`, ...tooltipBox }}>
                {tooltip ? tooltip(active) : (
                  <>
                    <div style={{ font: '500 var(--text-xs)/1.3 var(--font-sans)', color: 'var(--text-secondary)', marginBottom: 4 }}>{labels[active]}</div>
                    {series.map((s, si) => (
                      <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 var(--text-xs)/1.6 var(--font-sans)', color: 'var(--text-secondary)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />{s.name}<b style={{ marginLeft: 'auto', paddingLeft: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{formatValue(s.data[active]!)}</b>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          ) : null}
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {labels.map((_, i) => <div key={i} onMouseEnter={() => setActive(i)} style={{ flex: 1 }} />)}
          </div>
        </div>
        <div style={{ position: 'relative', height: 28 }}>
          {labels.map((l, i) => <span key={i} style={{ position: 'absolute', bottom: 0, left: `${x(i)}%`, transform: 'translateX(-50%)', ...axisText, color: i === active ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{l}</span>)}
        </div>
      </div>
    </div>
  );
}
