import { useId, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../core/cx';
import './Tooltip.css';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom';
  tone?: 'dark' | 'light';
  /** Força visível */
  open?: boolean;
  style?: CSSProperties;
}

export function Tooltip({ content, children, placement = 'top', tone = 'dark', open = false, style }: TooltipProps) {
  const id = useId();
  return (
    <span className={cx('pr-tip', open && 'pr-tip--open')} style={style} aria-describedby={id}>
      {children}
      <span role="tooltip" id={id} className={cx('pr-tip__bubble', `pr-tip__bubble--${placement}`, tone === 'light' && 'pr-tip__bubble--light')}>{content}</span>
    </span>
  );
}
