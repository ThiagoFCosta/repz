import { useState, type HTMLAttributes, type ReactNode } from 'react';

export interface BarDatum { label: string; income: number; expense: number }

export interface BarChartProps extends HTMLAttributes<HTMLDivElement> {
  data: BarDatum[];
  height?: number;
  max?: number;
  ticks?: number;
  seriesLabels?: { income: string; expense: string };
  formatValue?: (v: number) => string;
  formatTick?: (v: number) => string;
  defaultActive?: number;
  tooltipTitle?: (d: BarDatum) => ReactNode;
}

const fmtK = (v: number) => (v === 0 ? '0' : Math.abs(v) >= 1000 ? `${v / 1000}K` : `${v}`);
const brl0 = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** Barras divergentes de fluxo de caixa: receita (chart-1) para cima, despesa (chart-2) para baixo. */
export function BarChart({ data = [], height = 220, max, ticks = 5, seriesLabels = { income: 'Receita', expense: 'Despesa' }, formatValue = brl0, formatTick = fmtK, defaultActive = -1, tooltipTitle = (d) => d.label, style, ...rest }: BarChartProps) {
  const [active, setActive] = useState(defaultActive);
  const peak = max || Math.max(1, ...data.map((d) => Math.max(d.income || 0, d.expense || 0)));
  const half = (ticks - 1) / 2;
  const step = Math.ceil(peak / half / 1000) * 1000 || 1;
  const top = step * half;
  const tickVals = Array.from({ length: ticks }, (_, i) => top - i * step);
  const plotH = height - 28;
  const a = data[active];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr)', gap: 6, ...style }} {...rest}>
      <div style={{ position: 'relative', height: plotH }}>
        {tickVals.map((t, i) => (
          <span key={t} style={{ position: 'absolute', right: 0, top: `${(i / (ticks - 1)) * 100}%`, transform: 'translateY(-50%)', font: '500 var(--text-2xs)/1 var(--font-sans)', color: 'var(--text-secondary)' }}>{formatTick(t)}</span>
        ))}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ position: 'relative', height: plotH }} onMouseLeave={() => setActive(defaultActive)}>
          {tickVals.map((t, i) => <div key={t} aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: `${(i / (ticks - 1)) * 100}%`, borderTop: '1px solid var(--chart-grid)' }} />)}
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {data.map((d, i) => {
              const ring = i === active ? '0 0 0 3px var(--chart-highlight)' : 'none';
              return (
                <div key={d.label} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} tabIndex={0} aria-label={`${d.label}: ${seriesLabels.income} ${formatValue(d.income)}, ${seriesLabels.expense} ${formatValue(d.expense)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', outline: 'none', cursor: 'default' }}>
                  <div style={{ height: '50%', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: '58%', maxWidth: 30, height: `${((d.income || 0) / top) * 100}%`, background: 'var(--chart-1)', borderRadius: '4px 4px 0 0', boxShadow: ring, transition: 'height var(--duration-chart) var(--ease-out), box-shadow var(--duration-fast)' }} />
                  </div>
                  <div style={{ height: '50%', width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                    <div style={{ width: '58%', maxWidth: 30, height: `${((d.expense || 0) / top) * 100}%`, background: 'var(--chart-2)', borderRadius: '0 0 4px 4px', boxShadow: ring, transition: 'height var(--duration-chart) var(--ease-out), box-shadow var(--duration-fast)' }} />
                  </div>
                </div>
              );
            })}
          </div>
          {a ? (
            <div role="status" style={{ position: 'absolute', top: -6, left: `${((active + 0.5) / data.length) * 100}%`, transform: `translate(${active > data.length - 3 ? '-100%' : active < 2 ? '0' : '-50%'}, -100%)`, padding: '8px 12px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-md), inset 0 0 0 1px var(--border-default)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 2 }}>
              <div style={{ font: '500 var(--text-xs)/1.3 var(--font-sans)', color: 'var(--text-secondary)', marginBottom: 4 }}>{tooltipTitle(a)}</div>
              {([['income', a.income], ['expense', a.expense]] as const).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, font: '400 var(--text-xs)/1.5 var(--font-sans)', color: 'var(--text-secondary)' }}>
                  <span>{seriesLabels[k]}</span><b style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatValue(v)}</b>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', height: 28, alignItems: 'flex-end' }}>
          {data.map((d, i) => <span key={d.label} style={{ flex: 1, textAlign: 'center', font: `${i === active ? 600 : 500} var(--text-2xs)/1 var(--font-sans)`, color: i === active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{d.label}</span>)}
        </div>
      </div>
    </div>
  );
}
