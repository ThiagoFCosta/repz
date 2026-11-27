import { Fragment, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { Avatar } from '../core/Avatar';
import { Logo } from '../core/Logo';
import { cx } from '../core/cx';
import './Sidebar.css';

export interface NavEntry { id: string; label: string; icon?: IconName; badge?: ReactNode; disabled?: boolean }
export interface NavSection { label?: string; small?: boolean; items: NavEntry[] }

export interface NavItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: IconName;
  label: string;
  active?: boolean;
  badge?: ReactNode;
}

export function NavItem({ icon, label, active = false, badge, className, ...rest }: NavItemProps) {
  return (
    <button type="button" className={cx('pr-nav', className)} aria-current={active ? 'page' : undefined} {...rest}>
      {icon ? <Icon name={icon} size={20} strokeWidth={active ? 2 : 1.6} /> : null}
      <span className="pr-nav__label">{label}</span>
      {badge ? <span className="pr-nav__badge">{badge}</span> : null}
    </button>
  );
}

export interface SidebarProps {
  /** Padrão <Logo />; string vira wordmark simples; ou qualquer nó */
  brand?: ReactNode;
  account?: { name: string; subtitle?: string; avatarSrc?: string };
  onAccountClick?: () => void;
  sections: NavSection[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Slot inferior — normalmente o card promocional */
  footer?: ReactNode;
  /** Quando informado, mostra botão de fechar no modo drawer */
  onClose?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function Sidebar({ brand, account, onAccountClick, sections = [], activeId, onSelect, footer, onClose, className, style }: SidebarProps) {
  return (
    <aside className={cx('pr-sb', className)} style={style} aria-label="Navegação principal">
      <div className="pr-sb__brand">
        {brand === undefined ? <Logo size={30} /> : typeof brand === 'string' ? <span className="pr-sb__word">{brand}</span> : brand}
        {onClose ? (
          <button type="button" className="pr-sb__close" aria-label="Fechar menu" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        ) : null}
      </div>
      <nav className="pr-sb__scroll">
        {account ? (
          <button type="button" className="pr-sb__acct" onClick={onAccountClick}>
            <Avatar name={account.name} src={account.avatarSrc} size={34} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="pr-sb__acct-name">{account.name}</span>
              <span className="pr-sb__acct-sub">{account.subtitle}</span>
            </span>
            <Icon name="chevron-down" size={16} color="var(--icon-secondary)" />
          </button>
        ) : null}
        {sections.map((sec, si) => (
          <Fragment key={sec.label ?? si}>
            {sec.label ? <div className={cx('pr-sb__label', sec.small && 'pr-sb__label--small')}>{sec.label}</div> : null}
            {sec.items.map((it) => (
              <NavItem key={it.id} icon={it.icon} label={it.label} badge={it.badge} disabled={it.disabled} active={it.id === activeId} onClick={() => onSelect?.(it.id)} />
            ))}
          </Fragment>
        ))}
      </nav>
      {footer ? <div className="pr-sb__foot">{footer}</div> : null}
    </aside>
  );
}
