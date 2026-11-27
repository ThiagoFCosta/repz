import type { HTMLAttributes, MouseEvent } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './cx';
import './Chip.css';

export interface ChipProps extends Omit<HTMLAttributes<HTMLElement>, 'onClick'> {
  icon?: IconName;
  trailingIcon?: IconName;
  selected?: boolean;
  variant?: 'outline' | 'filled';
  size?: 'md' | 'lg';
  /** Só tem efeito quando o chip é clicável (onClick). Adição do projeto. */
  disabled?: boolean;
  onRemove?: () => void;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
}

export function Chip({ children, icon, trailingIcon, selected = false, variant = 'outline', size = 'md', disabled = false, onRemove, onClick, className, ...rest }: ChipProps) {
  const classes = cx('pr-chip', size === 'lg' && 'pr-chip--lg', variant === 'filled' && 'pr-chip--filled', selected && 'pr-chip--selected', !onClick && !onRemove && 'pr-chip--static', className);
  const body = (
    <>
      {icon ? <Icon name={icon} size={size === 'lg' ? 15 : 13} /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size={13} /> : null}
      {onRemove ? (
        <span role="button" tabIndex={0} aria-label="Remover" className="pr-chip__x"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRemove(); } }}>
          <Icon name="x" size={13} />
        </span>
      ) : null}
    </>
  );
  if (onClick) {
    return <button type="button" onClick={onClick} disabled={disabled} aria-pressed={selected} className={classes} {...rest}>{body}</button>;
  }
  return <span className={classes} {...rest}>{body}</span>;
}
