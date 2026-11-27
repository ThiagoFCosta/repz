import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { IconButton } from '../core/IconButton';
import { Button } from '../core/Button';

export interface ComposerTool { icon: IconName; label: string; onClick?: () => void }

const DEFAULT_TOOLS: ComposerTool[] = [{ icon: 'paperclip', label: 'Anexar arquivo' }, { icon: 'mic', label: 'Falar' }, { icon: 'image', label: 'Enviar imagem' }];

export interface AIComposerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  onSubmit?: (text: string) => void;
  placeholder?: string;
  tools?: ComposerTool[];
  /** Slot antes das ferramentas — ex.: Chip "Finanças" + Select de modelo */
  leading?: ReactNode;
  sendLabel?: string;
  minRows?: number;
  disabled?: boolean;
  /** Botão enviar em estado carregando. Adição do projeto. */
  loading?: boolean;
  style?: CSSProperties;
}

export function AIComposer({ value, defaultValue = '', onChange, onSubmit, placeholder = 'Pergunte qualquer coisa…', tools = DEFAULT_TOOLS, leading, sendLabel = 'Enviar', minRows = 2, disabled = false, loading = false, style }: AIComposerProps) {
  const [inner, setInner] = useState(defaultValue);
  const v = value !== undefined ? value : inner;
  const ta = useRef<HTMLTextAreaElement>(null);
  const set = (x: string) => { if (value === undefined) setInner(x); onChange?.(x); };
  useLayoutEffect(() => { const el = ta.current; if (!el) return; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 180)}px`; }, [v]);
  const submit = () => { const t = v.trim(); if (!t || disabled || loading) return; onSubmit?.(t); if (value === undefined) setInner(''); };
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 'var(--radius-xl)', background: 'var(--surface-sunken)', boxShadow: 'inset 0 0 0 1px var(--border-subtle)', opacity: disabled ? 0.6 : 1, ...style }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Icon name="wand-sparkles" size={17} color="var(--icon-secondary)" style={{ marginTop: 2 }} />
        <textarea ref={ta} rows={minRows} value={v} disabled={disabled} placeholder={placeholder} aria-label={placeholder}
          onChange={(e) => set(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          style={{ flex: 1, minWidth: 0, resize: 'none', border: 0, outline: 0, background: 'transparent', font: '400 var(--text-base)/1.5 var(--font-sans)', color: 'var(--text-primary)', padding: 0 }} />
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {leading}
        {tools.map((t) => <IconButton key={t.icon} icon={t.icon} label={t.label} variant="white" shape="circle" disabled={disabled} onClick={t.onClick} />)}
        <Button type="submit" variant="brand" size="sm" iconLeft="arrow-up" loading={loading} disabled={disabled || !v.trim()} style={{ marginLeft: 'auto' }}>{sendLabel}</Button>
      </div>
    </form>
  );
}
