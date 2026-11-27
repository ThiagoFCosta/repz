import type { HTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './cx';
import './Badge.css';

export type BadgeTone = 'success' | 'danger' | 'warning' | 'neutral' | 'brand' | 'tint' | 'inverse' | 'outline' | 'owe';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** `owe` (laranja) é adição do projeto para "Eu devo" (docs/04). */
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  shape?: 'rounded' | 'pill';
  icon?: IconName;
  dot?: boolean;
}

export function Badge({ children, tone = 'neutral', size = 'md', shape = 'rounded', icon, dot = false, className, ...rest }: BadgeProps) {
  return (
    <span className={cx('pr-badge', `pr-badge--${tone}`, size === 'sm' && 'pr-badge--sm', shape === 'pill' && 'pr-badge--pill', className)} {...rest}>
      {dot ? <span className="pr-badge__dot" aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size={size === 'sm' ? 11 : 13} strokeWidth={2} /> : null}
      {children}
    </span>
  );
}
