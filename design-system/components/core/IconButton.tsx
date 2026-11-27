import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './cx';
import './IconButton.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Rótulo acessível obrigatório (também vira title) */
  label: string;
  variant?: 'ghost' | 'outline' | 'white' | 'soft' | 'brand' | 'inverse';
  size?: 'sm' | 'md' | 'lg';
  shape?: 'square' | 'circle';
  /** Ponto vermelho de notificação */
  dot?: boolean;
  count?: number;
  iconSize?: number;
}

export function IconButton({ icon, label, variant = 'ghost', size = 'md', shape = 'square', dot = false, count, iconSize, className, ...rest }: IconButtonProps) {
  const s = iconSize ?? (size === 'sm' ? 16 : size === 'lg' ? 22 : 19);
  return (
    <button type="button" aria-label={label} title={label}
      className={cx('pr-ib', `pr-ib--${variant}`, size !== 'md' && `pr-ib--${size}`, shape === 'circle' && 'pr-ib--circle', className)}
      {...rest}>
      <Icon name={icon} size={s} />
      {dot && !count ? <span className="pr-ib__dot" aria-hidden="true" /> : null}
      {count ? <span className="pr-ib__count">{count > 99 ? '99+' : count}</span> : null}
    </button>
  );
}
