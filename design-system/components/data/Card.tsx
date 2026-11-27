import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../core/cx';
import './Card.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'default' | 'subtle' | 'sunken' | 'brand' | 'brand-soft' | 'inverse';
  outline?: boolean;
  interactive?: boolean;
  as?: 'section' | 'div' | 'article' | 'aside' | 'li';
}

/** Card branco, raio 16, sem sombra nem borda sobre a página cinza. */
export function Card({ title, subtitle, actions, children, padding = 'md', tone = 'default', outline = false, interactive = false, as: Tag = 'section', className, ...rest }: CardProps) {
  return (
    <Tag className={cx('pr-card', padding !== 'md' && `pr-card--${padding}`, tone !== 'default' && `pr-card--${tone}`, outline && 'pr-card--outline', interactive && 'pr-card--interactive', className)} tabIndex={interactive ? 0 : undefined} {...rest}>
      {title || actions ? (
        <div className="pr-card__head">
          <div style={{ minWidth: 0 }}>
            {title ? <h3 className="pr-card__title">{title}</h3> : null}
            {subtitle ? <p className="pr-card__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="pr-card__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}
