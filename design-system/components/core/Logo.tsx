import type { HTMLAttributes } from 'react';
import logoMark from '../../assets/logo-mark.svg';
import { cx } from './cx';
import './Logo.css';

/** Lockup da marca Repz (provisória, decisão 16.4) — marca hexagonal facetada + wordmark Urbanist. */
export interface LogoProps extends HTMLAttributes<HTMLSpanElement> {
  /** "full" = marca + wordmark; "mark" = só o hexágono */
  variant?: 'full' | 'mark';
  /** Altura da marca em px; o wordmark escala a partir dela. Padrão 32 */
  size?: number;
  /** Cor do wordmark: dark (forest) em superfícies claras, light (branco) sobre forest */
  tone?: 'dark' | 'light';
  /** Substitui a imagem (padrão: assets/logo-mark.svg) */
  src?: string;
}

export function Logo({ variant = 'full', size = 32, tone = 'dark', src = logoMark, className, style, ...rest }: LogoProps) {
  const w = Math.round(size * 0.853);
  const mark = <img src={src} alt={variant === 'mark' ? 'Repz' : ''} width={w} height={size} style={{ width: w, height: size }} />;
  if (variant === 'mark') return <span className={cx('pr-logo', className)} style={style} {...rest}>{mark}</span>;
  return (
    <span role="img" aria-label="Repz" className={cx('pr-logo', tone === 'light' && 'pr-logo--light', className)} style={{ gap: Math.round(size * 0.3), ...style }} {...rest}>
      {mark}
      <span aria-hidden="true" className="pr-logo__word" style={{ fontSize: Math.round(size * 0.72) }}>Repz</span>
    </span>
  );
}
