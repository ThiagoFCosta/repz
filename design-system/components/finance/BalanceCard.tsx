import type { HTMLAttributes, ReactNode } from 'react';
import { Button } from '../core/Button';
import { IconButton } from '../core/IconButton';
import type { IconName } from '../core/Icon';

export interface BalanceAction { label: string; icon?: IconName; onClick?: () => void }

export interface BalanceCardProps extends HTMLAttributes<HTMLElement> {
  label?: ReactNode;
  amount: ReactNode;
  currency?: string;
  onAdd?: () => void;
  primaryAction?: BalanceAction;
  secondaryAction?: BalanceAction;
  compact?: boolean;
}

// Arte do card: anéis brancos suaves sobre lime (eco do swirl 3D da referência). Valores de arte, não de UI.
const ART = 'radial-gradient(130px 130px at 30% 118%, rgba(255,255,255,0) 58%, rgba(255,255,255,.42) 61%, rgba(255,255,255,0) 72%), radial-gradient(220px 220px at 88% 112%, rgba(255,255,255,0) 52%, rgba(255,255,255,.5) 56%, rgba(203,242,176,0) 66%), radial-gradient(260px 180px at 95% 100%, rgba(108,194,58,.55), rgba(108,194,58,0) 70%), var(--lime-400)';

/** Card herói lime de saldo total com depositar/enviar. */
export function BalanceCard({ label = 'Saldo total', amount, currency = 'BRL', onAdd, primaryAction, secondaryAction, compact = false, children, style, ...rest }: BalanceCardProps) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: compact ? 16 : 22, minWidth: 0, padding: compact ? 14 : 16, borderRadius: 'var(--radius-card)', color: 'var(--forest-900)', background: ART, ...style }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: '500 var(--text-md)/1.2 var(--font-sans)' }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
            <span style={{ font: `600 ${compact ? 'var(--text-3xl)' : 'var(--text-4xl)'}/1 var(--font-sans)`, letterSpacing: 'var(--tracking-snug)', whiteSpace: 'nowrap' }}>{amount}</span>
            {currency ? <span style={{ font: '500 var(--text-sm)/1 var(--font-sans)', marginTop: 4 }}>{currency}</span> : null}
          </div>
        </div>
        {onAdd ? <IconButton icon="plus" label="Adicionar" variant="white" shape="circle" size="sm" onClick={onAdd} style={{ width: 30, height: 30 }} /> : null}
      </div>
      {children}
      {primaryAction || secondaryAction ? (
        <div style={{ display: 'flex', gap: 10 }}>
          {secondaryAction ? <Button variant="white" iconRight={secondaryAction.icon ?? 'arrow-down'} iconRightColor="var(--lime-600)" onClick={secondaryAction.onClick} style={{ flex: 1 }} size={compact ? 'sm' : 'md'}>{secondaryAction.label}</Button> : null}
          {primaryAction ? <Button variant="primary" iconRight={primaryAction.icon ?? 'arrow-up-right'} onClick={primaryAction.onClick} style={{ flex: 1 }} size={compact ? 'sm' : 'md'}>{primaryAction.label}</Button> : null}
        </div>
      ) : null}
    </section>
  );
}
