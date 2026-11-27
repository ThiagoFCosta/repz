import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { IconButton } from '../core/IconButton';
import { cx } from '../core/cx';
import './Dialog.css';

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
  /** position:absolute em vez de fixed (dentro de molduras / cards) */
  contained?: boolean;
  /** Não rouba o foco ao abrir (uso em galerias/documentação). Adição do projeto. */
  autoFocus?: boolean;
  closeLabel?: string;
  className?: string;
}

/** Diálogo modal; vira bottom sheet abaixo de 560px de container. */
export function Dialog({ open, onClose, title, description, children, footer, width = 440, contained = false, autoFocus = true, closeLabel = 'Fechar', className }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    document.addEventListener('keydown', k);
    const t = autoFocus ? window.setTimeout(() => {
      const f = panel.current?.querySelector<HTMLElement>(`input,button:not([aria-label="${closeLabel}"]),select,textarea,[tabindex]`);
      (f ?? panel.current)?.focus();
    }, 30) : undefined;
    return () => { document.removeEventListener('keydown', k); window.clearTimeout(t); if (autoFocus) prev?.focus?.(); };
  }, [open, autoFocus, closeLabel]);
  if (!open) return null;
  return (
    <div className={cx('pr-dlg', contained && 'pr-dlg--contained', className)}>
      <div className="pr-dlg__scrim" onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} tabIndex={-1} className="pr-dlg__panel" style={{ '--w': `${width}px` } as CSSProperties}>
        <div className="pr-dlg__head">
          <div style={{ flex: 1, minWidth: 0 }}>
            {title ? <h2 className="pr-dlg__title">{title}</h2> : null}
            {description ? <p className="pr-dlg__desc">{description}</p> : null}
          </div>
          {onClose ? <IconButton icon="x" label={closeLabel} variant="soft" shape="circle" size="sm" onClick={onClose} /> : null}
        </div>
        {children}
        {footer ? <div className="pr-dlg__foot">{footer}</div> : null}
      </div>
    </div>
  );
}
