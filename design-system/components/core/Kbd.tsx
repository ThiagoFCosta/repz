import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import './Kbd.css';

export type KbdProps = HTMLAttributes<HTMLElement>;

/** Tecla de atalho (Space Grotesk). */
export function Kbd({ children, className, ...rest }: KbdProps) {
  return <kbd className={cx('pr-kbd', className)} {...rest}>{children}</kbd>;
}
