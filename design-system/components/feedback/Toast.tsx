import type { HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { IconButton } from '../core/IconButton';

export type ToastTone = 'success' | 'danger' | 'warning' | 'info' | 'ai';

const TONES: Record<ToastTone, { icon: IconName; fg: string; bg: string }> = {
  success: { icon: 'circle-check', fg: 'var(--forest-900)', bg: 'var(--lime-400)' },
  danger: { icon: 'circle-x', fg: 'var(--text-on-danger)', bg: 'var(--surface-danger-strong)' },
  warning: { icon: 'triangle-alert', fg: 'var(--amber-700)', bg: 'var(--amber-100)' },
  info: { icon: 'info', fg: 'var(--forest-900)', bg: 'var(--forest-100)' },
  ai: { icon: 'sparkles', fg: 'var(--forest-900)', bg: 'var(--lime-400)' },
};

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  /** Ação — ex.: botão "Desfazer" depois de salvar (docs/04) */
  action?: ReactNode;
  onClose?: () => void;
  icon?: IconName;
  inverse?: boolean;
}

export function Toast({ tone = 'success', title, description, action, onClose, icon, inverse = false, style, ...rest }: ToastProps) {
  const t = TONES[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', maxWidth: 400, padding: '12px 12px 12px 14px', borderRadius: 'var(--radius-xl)', background: inverse ? 'var(--surface-inverse)' : 'var(--surface-card)', color: inverse ? 'var(--text-on-inverse)' : 'var(--text-primary)', boxShadow: inverse ? 'var(--shadow-lg)' : 'var(--shadow-lg), inset 0 0 0 1px var(--border-default)', ...style }} {...rest}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: t.bg, color: t.fg, flexShrink: 0 }}>
        <Icon name={icon ?? t.icon} size={16} strokeWidth={2} />
      </span>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 5 }}>
        <div style={{ font: '600 var(--text-base)/1.3 var(--font-sans)' }}>{title}</div>
        {description ? <div style={{ font: '400 var(--text-sm)/1.45 var(--font-sans)', color: inverse ? 'var(--text-on-inverse-secondary)' : 'var(--text-secondary)', marginTop: 2 }}>{description}</div> : null}
        {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
      </div>
      {onClose ? <IconButton icon="x" label="Dispensar" size="sm" onClick={onClose} style={inverse ? { color: 'var(--text-on-inverse)' } : undefined} /> : null}
    </div>
  );
}
