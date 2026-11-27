import type { CSSProperties } from 'react';
import { CreditCard, type CardTone } from './CreditCard';
import { IconButton } from '../core/IconButton';
import { cx } from '../core/cx';
import './PaymentCardItem.css';

export interface PaymentCardItemProps {
  name: string;
  last4: string;
  tone?: CardTone;
  network?: string;
  selected?: boolean;
  /** Adição do projeto. */
  disabled?: boolean;
  onSelect?: () => void;
  onMenu?: () => void;
  className?: string;
  style?: CSSProperties;
}

/** Item de cartão selecionável (role=radio) — use dentro de um role=radiogroup. */
export function PaymentCardItem({ name, last4, tone = 'lime', network = 'VISA', selected = false, disabled = false, onSelect, onMenu, className, style }: PaymentCardItemProps) {
  const select = () => { if (!disabled) onSelect?.(); };
  return (
    <div role="radio" aria-checked={selected} aria-disabled={disabled || undefined} tabIndex={disabled ? -1 : 0} className={cx('pr-pci', selected && 'pr-pci--on', disabled && 'pr-pci--disabled', className)} style={style}
      onClick={select} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } }}>
      <span className="pr-pci__radio" aria-hidden="true" />
      <CreditCard size="mini" tone={tone} network={network} last4={last4} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="pr-pci__name">{name}</span>
        <span className="pr-pci__num">•••• {last4}</span>
      </span>
      {onMenu ? <IconButton icon="ellipsis" label={`Opções do cartão ${name}`} size="sm" disabled={disabled} onClick={(e) => { e.stopPropagation(); onMenu(); }} /> : null}
    </div>
  );
}
