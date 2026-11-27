import type { HTMLAttributes } from 'react';
import { cx } from '../core/cx';
import { Icon, type IconName } from '../core/Icon';
import './BottomNav.css';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: IconName;
  /** Ação principal (o "+"): botão circular lime no centro. Use em no máximo um item. */
  primary?: boolean;
  /** Contador no canto do ícone (ex.: alertas). */
  count?: number;
  disabled?: boolean;
}

/** Barra inferior fixa do celular (adição do projeto). Dentro do AppShell, some a partir de 1024px de container. */
export interface BottomNavProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  items: BottomNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Rótulo do landmark de navegação. */
  label?: string;
}

export function BottomNav({ items, activeId, onSelect, label = 'Navegação principal', className, ...rest }: BottomNavProps) {
  return (
    <nav aria-label={label} className={cx('pr-bnav', className)} {...rest}>
      {items.map((it) => {
        const ativo = it.id === activeId;
        return (
          <button
            key={it.id}
            type="button"
            className={cx('pr-bnav__item', it.primary && 'pr-bnav__item--primary')}
            aria-current={ativo && !it.primary ? 'page' : undefined}
            disabled={it.disabled}
            onClick={() => onSelect?.(it.id)}
          >
            <span className="pr-bnav__icon">
              <Icon name={it.icon} size={it.primary ? 22 : 20} strokeWidth={it.primary ? 2.25 : 1.75} />
              {it.count ? <span className="pr-bnav__count">{it.count > 99 ? '99+' : it.count}</span> : null}
            </span>
            <span className="pr-bnav__label">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
