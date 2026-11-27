import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import './Avatar.css';

const TONES: Array<[string, string]> = [
  ['var(--forest-900)', 'var(--lime-400)'],
  ['var(--lime-400)', 'var(--forest-900)'],
  ['var(--forest-100)', 'var(--forest-900)'],
  ['var(--gray-200)', 'var(--forest-900)'],
];

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  name?: string;
  src?: string;
  /** px, padrão 36 */
  size?: number;
  /** anel lime */
  ring?: boolean;
  status?: 'online' | 'offline';
}

export function Avatar({ name = '', src, size = 36, ring = false, status, className, style, ...rest }: AvatarProps) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const [bg, fg] = TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length]!;
  const dot = Math.max(8, size * 0.26);
  return (
    <span role="img" aria-label={name || 'Avatar'} className={cx('pr-avatar', ring && 'pr-avatar--ring', className)} style={{ width: size, height: size, ...style }} {...rest}>
      <span className="pr-avatar__face" style={{ background: src ? 'var(--surface-muted)' : bg, color: fg, fontSize: Math.round(size * 0.38) }}>
        {src ? <img src={src} alt="" /> : initials}
      </span>
      {status ? <span aria-hidden="true" className={cx('pr-avatar__status', `pr-avatar__status--${status}`)} style={{ width: dot, height: dot }} /> : null}
    </span>
  );
}
