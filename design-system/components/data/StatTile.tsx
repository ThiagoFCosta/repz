import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { IconButton } from '../core/IconButton';
import { Delta } from './Delta';

function IconBox({ icon, tone }: { icon: IconName; tone: StatTileProps['iconTone'] }) {
  const brand = tone === 'brand';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 'var(--radius-md)', background: brand ? 'var(--surface-brand)' : 'var(--surface-card)', boxShadow: brand ? 'none' : 'inset 0 0 0 1px var(--border-strong)', color: brand ? 'var(--text-on-brand)' : tone === 'lime' ? 'var(--icon-brand)' : 'var(--icon-primary)', flexShrink: 0 }}>
      <Icon name={icon} size={18} />
    </span>
  );
}

export interface StatTileProps extends HTMLAttributes<HTMLDivElement> {
  icon?: IconName;
  iconTone?: 'lime' | 'forest' | 'brand';
  label: ReactNode;
  value: ReactNode;
  delta?: number;
  deltaInvert?: boolean;
  caption?: ReactNode;
  /** inline: linha ícone+rótulo, linha valor+delta. stack: ícone/menu, delta, valor, rótulo */
  variant?: 'inline' | 'stack';
  onMenu?: () => void;
  bordered?: boolean;
}

export function StatTile({ icon, iconTone = 'lime', label, value, delta, deltaInvert = false, caption, variant = 'inline', onMenu, bordered = true, style, ...rest }: StatTileProps) {
  const box = { display: 'flex', flexDirection: 'column', gap: variant === 'stack' ? 10 : 12, minWidth: 0, padding: 14, borderRadius: 'var(--radius-tile)', background: 'var(--surface-card)', boxShadow: bordered ? 'inset 0 0 0 1px var(--border-default)' : 'none', ...style } as const;
  const valueEl = <span style={{ font: '600 var(--text-2xl)/1.1 var(--font-sans)', letterSpacing: 'var(--tracking-snug)', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{value}</span>;
  if (variant === 'stack') {
    return (
      <div style={box} {...rest}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {icon ? <IconBox icon={icon} tone={iconTone} /> : <span />}
          {onMenu ? <IconButton icon="ellipsis-vertical" label="Mais opções" size="sm" onClick={onMenu} /> : null}
        </div>
        {delta !== undefined ? <span><Delta value={delta} invert={deltaInvert} /></span> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {valueEl}
          <span style={{ font: '400 var(--text-sm)/1.3 var(--font-sans)', color: 'var(--text-secondary)' }}>{label}</span>
        </div>
      </div>
    );
  }
  return (
    <div style={box} {...rest}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon ? <IconBox icon={icon} tone={iconTone} /> : null}
        <span style={{ font: '400 var(--text-base)/1.2 var(--font-sans)', color: 'var(--text-secondary)' }}>{label}</span>
        {onMenu ? <IconButton icon="ellipsis-vertical" label="Mais opções" size="sm" onClick={onMenu} style={{ marginLeft: 'auto' }} /> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {valueEl}
        {delta !== undefined ? <Delta value={delta} invert={deltaInvert} /> : null}
      </div>
      {caption ? <span style={{ font: '400 var(--text-xs)/1.3 var(--font-sans)', color: 'var(--text-secondary)', marginTop: -4 }}>{caption}</span> : null}
    </div>
  );
}
