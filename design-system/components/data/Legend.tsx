import type { HTMLAttributes, ReactNode } from 'react';

export interface LegendItem { label: string; color: string; value?: ReactNode }

export interface LegendProps extends HTMLAttributes<HTMLUListElement> {
  items: LegendItem[];
  direction?: 'row' | 'column';
  shape?: 'square' | 'dot';
}

const LIGHT_SWATCHES = ['var(--forest-100)', 'var(--gray-100)', 'var(--chart-3)', 'var(--chart-5)'];

export function Legend({ items = [], direction = 'row', shape = 'square', style, ...rest }: LegendProps) {
  const col = direction === 'column';
  return (
    <ul style={{ display: 'flex', flexDirection: col ? 'column' : 'row', flexWrap: col ? 'nowrap' : 'wrap', gap: col ? 10 : 16, margin: 0, padding: 0, listStyle: 'none', ...style }} {...rest}>
      {items.map((it) => (
        <li key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 var(--text-sm)/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: shape === 'dot' ? '50%' : 2, background: it.color, boxShadow: LIGHT_SWATCHES.includes(it.color) ? 'inset 0 0 0 1px var(--border-strong)' : 'none', flexShrink: 0 }} />
          <span style={{ flex: col ? 1 : undefined }}>{it.label}</span>
          {it.value !== undefined ? <span style={{ fontWeight: 600, marginLeft: col ? 'auto' : 0 }}>{it.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}
