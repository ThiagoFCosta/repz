import type { ChangeEventHandler, CSSProperties, ReactNode } from 'react';
import { IconButton } from '../core/IconButton';
import { Avatar } from '../core/Avatar';
import { Input } from '../forms/Input';
import { cx } from '../core/cx';
import './TopBar.css';

export interface TopBarProps {
  title?: ReactNode;
  /** Descrição da página — o Prisma escreve entre aspas curvas */
  subtitle?: ReactNode;
  onMenuClick?: () => void;
  /** Mostra a busca do desktop (padrão true). Adição do projeto: telas sem busca passam false. */
  search?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: ChangeEventHandler<HTMLInputElement>;
  onSearchFocus?: () => void;
  user?: { name: string; avatarSrc?: string };
  notifications?: number;
  desktopActions?: ReactNode;
  mobileActions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function TopBar({ title, subtitle, onMenuClick, search = true, searchPlaceholder = 'Buscar qualquer coisa', searchValue, onSearchChange, onSearchFocus, user, notifications = 0, desktopActions, mobileActions, className, style }: TopBarProps) {
  return (
    <header className={cx('pr-tb', className)} style={style}>
      <IconButton className="pr-tb__menu" icon="menu" label="Abrir menu" variant="white" shape="circle" size="lg" onClick={onMenuClick} />
      <div className="pr-tb__titles">
        {title ? <div className="pr-tb__title">{title}</div> : null}
        {subtitle ? <div className="pr-tb__sub">{subtitle}</div> : null}
      </div>
      <div className="pr-tb__right">
        {search ? (
          <>
            <span className="pr-tb__d">
              <Input className="pr-tb__search" leadingIcon="search" kbd={['⌘', 'F']} placeholder={searchPlaceholder} value={searchValue} onChange={onSearchChange} onFocus={onSearchFocus} aria-label="Buscar" />
            </span>
            <span className="pr-tb__d pr-tb__sep" aria-hidden="true" />
          </>
        ) : null}
        <span className="pr-tb__d">
          {desktopActions ?? (
            <>
              <IconButton icon="settings" label="Configurações" />
              <IconButton icon="circle-help" label="Central de ajuda" />
            </>
          )}
        </span>
        <span className="pr-tb__m">
          {mobileActions ?? (
            <>
              <IconButton icon="search" label="Buscar" variant="white" shape="circle" size="lg" onClick={onSearchFocus} />
              <IconButton icon="bell" label="Notificações" variant="white" shape="circle" size="lg" dot={notifications > 0} />
            </>
          )}
        </span>
        {user ? (
          <>
            <span className="pr-tb__sep" aria-hidden="true" />
            <Avatar name={user.name} src={user.avatarSrc} size={40} />
          </>
        ) : null}
      </div>
    </header>
  );
}
