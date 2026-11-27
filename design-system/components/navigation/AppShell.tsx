import { useEffect, type CSSProperties, type ReactNode, type Ref } from 'react';
import { cx } from '../core/cx';
import './AppShell.css';

/** Shell responsivo: sidebar fixa + top bar + área de rolagem; vira drawer abaixo de 1024px (container query). */
export interface AppShellProps {
  sidebar: ReactNode;
  topbar?: ReactNode;
  /** Barra inferior (BottomNav) mostrada só abaixo de 1024px de container. Adição do projeto. */
  bottomNav?: ReactNode;
  children?: ReactNode;
  drawerOpen?: boolean;
  onDrawerClose?: () => void;
  contentRef?: Ref<HTMLElement>;
  className?: string;
  style?: CSSProperties;
}

export function AppShell({ sidebar, topbar, bottomNav, children, drawerOpen = false, onDrawerClose, contentRef, className, style }: AppShellProps) {
  useEffect(() => {
    if (!drawerOpen) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onDrawerClose?.(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [drawerOpen, onDrawerClose]);
  return (
    <div className={cx('pr-shell', drawerOpen && 'pr-shell--open', className)} style={style}>
      <div className="pr-shell__grid">
        <div className="pr-shell__side">{sidebar}</div>
        <div className="pr-shell__main">
          {topbar}
          <main className="pr-shell__content" ref={contentRef}><div className="pr-shell__inner">{children}</div></main>
          {bottomNav ? <div className="pr-shell__bottom">{bottomNav}</div> : null}
        </div>
      </div>
      <div className="pr-shell__scrim" onClick={onDrawerClose} aria-hidden="true" />
    </div>
  );
}
