import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './cx';
import './Button.css';

export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'white' | 'soft' | 'ghost' | 'danger';

/** Botão de ação, pill por padrão. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  /** "pill" (padrão) para fluxos principais; "rounded" (8px) para ações compactas de toolbar (Exportar/Baixar) */
  shape?: 'pill' | 'rounded';
  iconLeft?: IconName;
  iconRight?: IconName;
  iconLeftColor?: string;
  iconRightColor?: string;
  block?: boolean;
  /** Borda inferior interna — botões lime de confirmação em largura total */
  raised?: boolean;
  loading?: boolean;
  as?: 'button' | 'a';
  href?: string;
}

export function Button({ children, variant = 'primary', size = 'md', shape = 'pill', iconLeft, iconRight, iconLeftColor, iconRightColor, block = false, raised = false, loading = false, disabled = false, as = 'button', type, className, ...rest }: ButtonProps) {
  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 20 : 17;
  const classes = cx('pr-btn', `pr-btn--${variant}`, size !== 'md' && `pr-btn--${size}`, shape === 'rounded' && 'pr-btn--rounded', block && 'pr-btn--block', raised && 'pr-btn--raised', className);
  const content = (
    <>
      {loading ? <span className="pr-btn__spin" aria-hidden="true" /> : iconLeft ? <Icon name={iconLeft} size={iconSize} color={iconLeftColor} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={iconSize} color={iconRightColor} /> : null}
    </>
  );
  if (as === 'a') {
    return (
      <a className={classes} aria-disabled={disabled || loading || undefined} aria-busy={loading || undefined} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }
  return (
    <button type={type ?? 'button'} disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...rest}>
      {content}
    </button>
  );
}
