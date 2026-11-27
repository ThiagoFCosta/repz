import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../core/cx';
import './Breadcrumb.css';

export interface BreadcrumbItem { label: ReactNode; onClick?: () => void }

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  size?: 'sm' | 'md' | 'lg';
}

export function Breadcrumb({ items = [], size = 'md', className, ...rest }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cx('pr-bc', size !== 'md' && `pr-bc--${size}`, className)} {...rest}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={i}>
            {last ? (
              <span aria-current="page" className="pr-bc__current">{it.label}</span>
            ) : (
              <button type="button" onClick={it.onClick} className={cx('pr-bc__link', it.onClick && 'pr-bc__link--click')}>{it.label}</button>
            )}
            {!last ? <span aria-hidden="true" className="pr-bc__sep">/</span> : null}
          </Fragment>
        );
      })}
    </nav>
  );
}
