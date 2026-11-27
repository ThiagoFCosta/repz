import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../core/cx';
import './Tabs.css';

export interface TabItem { value: string; label: ReactNode; meta?: ReactNode; disabled?: boolean }

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** underline (indicador lime de 2px), segmented (trilho cinza), pill */
  variant?: 'underline' | 'segmented' | 'pill';
  block?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

export function Tabs({ items = [], value, defaultValue, onChange, variant = 'underline', block = false, className, style, ...rest }: TabsProps) {
  const [inner, setInner] = useState<string | undefined>(defaultValue ?? items[0]?.value);
  const val = value !== undefined ? value : inner;
  const pick = (v: string) => { if (value === undefined) setInner(v); onChange?.(v); };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const enabled = items.filter((it) => !it.disabled);
    const cur = enabled.indexOf(items[i]!);
    const n = enabled[(cur + (e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length]!;
    pick(n.value);
    const btn = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[items.indexOf(n)];
    btn?.focus();
  };
  return (
    <div role="tablist" className={cx('pr-tabs', `pr-tabs--${variant}`, block && 'pr-tabs--block', className)} style={style} {...rest}>
      {items.map((it, i) => (
        <button key={it.value} type="button" role="tab" aria-selected={it.value === val} tabIndex={it.value === val ? 0 : -1} disabled={it.disabled} className="pr-tab" onClick={() => pick(it.value)} onKeyDown={(e) => onKey(e, i)}>
          {it.label}
          {it.meta ? <span className="pr-tab__meta">{it.meta}</span> : null}
        </button>
      ))}
    </div>
  );
}
