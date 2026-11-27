import type { SVGProps } from 'react';
import { ICON_PATHS, type IconName } from './iconPaths';

export type { IconName };

/** Ícone de traço derivado do Lucide (113 glifos, ver assets/icons). */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  /** Nome Lucide em kebab-case, ex.: "house", "wand-sparkles", "arrow-up-right". */
  name: IconName;
  /** px; padrão 20 */
  size?: number;
  /** padrão 1.75 — Prisma usa 1.5–2 */
  strokeWidth?: number;
  color?: string;
  /** Rótulo acessível; omita em ícones decorativos */
  title?: string;
}

export function Icon({ name, size = 20, strokeWidth = 1.75, color = 'currentColor', title, style, className, ...rest }: IconProps) {
  const inner: string = ICON_PATHS[name] ?? '';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} aria-label={title}
      className={className} style={{ flexShrink: 0, display: 'block', ...style }}
      dangerouslySetInnerHTML={{ __html: inner }}
      {...rest}
    />
  );
}

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];
