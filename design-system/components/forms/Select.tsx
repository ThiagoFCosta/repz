import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { cx } from '../core/cx';
import './Select.css';

export interface SelectOption { value: string; label: string; icon?: IconName; imageSrc?: string; disabled?: boolean }

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, option: SelectOption) => void;
  placeholder?: string;
  /** Rótulo acessível do gatilho */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'ghost' | 'filled';
  align?: 'left' | 'right';
  block?: boolean;
  disabled?: boolean;
  /** Borda de erro. Adição do projeto. */
  invalid?: boolean;
  /** Abre o menu (controlado) — usado no showcase. Adição do projeto. */
  defaultOpen?: boolean;
  /** Menu em fluxo normal em vez de flutuante (showcase/documentação). Adição do projeto. */
  staticMenu?: boolean;
  emptyLabel?: string;
  renderValue?: (option?: SelectOption) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

function Lead({ opt }: { opt?: SelectOption }) {
  if (!opt) return null;
  if (opt.imageSrc) return <img src={opt.imageSrc} alt="" />;
  if (opt.icon) return <Icon name={opt.icon} size={16} />;
  return null;
}

export function Select({ options = [], value, defaultValue, onChange, placeholder = 'Selecionar', label, size = 'md', variant = 'outline', align = 'left', block = false, disabled = false, invalid = false, defaultOpen = false, staticMenu = false, emptyLabel = 'Nenhuma opção', renderValue, className, style }: SelectProps) {
  const [inner, setInner] = useState<string | undefined>(defaultValue ?? options[0]?.value);
  const val = value !== undefined ? value : inner;
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const sel = options.find((o) => o.value === val);

  useEffect(() => {
    if (!open || staticMenu) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, staticMenu]);

  const pick = (o: SelectOption) => {
    if (o.disabled) return;
    if (value === undefined) setInner(o.value);
    onChange?.(o.value, o);
    if (!staticMenu) setOpen(false);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if ((e.key === 'Enter' || e.key === ' ') && open && active >= 0) { e.preventDefault(); pick(options[active]!); }
  };

  return (
    <div ref={ref} className={cx('pr-select', `pr-select--${size}`, variant !== 'outline' && `pr-select--${variant}`, open && 'pr-select--open', block && 'pr-select--block', invalid && 'pr-select--error', className)} style={{ ...(staticMenu ? { flexDirection: 'column' } : null), ...style }} onKeyDown={onKey}>
      <button type="button" className="pr-select__trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={label} aria-invalid={invalid || undefined} disabled={disabled} onClick={() => setOpen((o) => !o)}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Lead opt={sel} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{renderValue ? renderValue(sel) : sel ? sel.label : placeholder}</span>
        </span>
        <Icon name="chevron-down" size={15} className="pr-select__chev" />
      </button>
      {open ? (
        <ul role="listbox" className={cx('pr-select__menu', align === 'right' && 'pr-select__menu--right', staticMenu && 'pr-select__menu--static')}>
          {options.length === 0 ? <li className="pr-select__empty">{emptyLabel}</li> : null}
          {options.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === val} aria-disabled={o.disabled || undefined} className={cx('pr-select__opt', i === active && 'pr-select__opt--active')} onMouseEnter={() => setActive(i)} onClick={() => pick(o)}>
              <Lead opt={o} />
              <span>{o.label}</span>
              {o.value === val ? <Icon name="check" size={15} className="pr-select__check" /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
