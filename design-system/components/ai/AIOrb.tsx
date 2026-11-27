import type { HTMLAttributes } from 'react';
import orb from '../../assets/ai-orb.png';
import { cx } from '../core/cx';
import './AIOrb.css';

export interface AIOrbProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
  /** Pulsa enquanto o assistente pensa */
  thinking?: boolean;
  src?: string;
}

/** Orbe verde desfocado do assistente (raster de assets/ai-orb.png). */
export function AIOrb({ size = 64, thinking = false, src = orb, className, style, ...rest }: AIOrbProps) {
  return (
    <span role="img" aria-label="Coach" className={cx('pr-orb', thinking && 'pr-orb--thinking', className)} style={{ width: size, height: size, ...style }} {...rest}>
      <img src={src} alt="" />
    </span>
  );
}
