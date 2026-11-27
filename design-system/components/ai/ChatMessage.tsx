import type { CSSProperties, ReactNode } from 'react';
import { AIOrb } from './AIOrb';
import { IconButton } from '../core/IconButton';
import './ChatMessage.css';

export interface ChatMessageProps {
  role?: 'user' | 'assistant';
  children?: ReactNode;
  time?: string;
  /** Indicador "digitando" */
  pending?: boolean;
  /** Mostra copiar / útil / não útil (só assistente) */
  actions?: boolean;
  /** Mensagem que falhou ao enviar/gerar. Adição do projeto. */
  error?: ReactNode;
  style?: CSSProperties;
}

export function ChatMessage({ role = 'assistant', children, time, pending = false, actions = false, error, style }: ChatMessageProps) {
  const user = role === 'user';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: user ? 'flex-end' : 'flex-start', ...style }}>
      {!user ? <AIOrb size={30} thinking={pending} /> : null}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: user ? 'flex-end' : 'flex-start', gap: 6, maxWidth: 'min(560px, 82%)' }}>
        <div style={{ padding: '11px 14px', borderRadius: user ? '16px 16px 4px 16px' : '4px 16px 16px 16px', background: user ? 'var(--surface-inverse)' : 'var(--surface-card)', color: user ? 'var(--text-on-inverse)' : 'var(--text-primary)', boxShadow: user ? 'none' : `inset 0 0 0 1px ${error ? 'var(--border-danger)' : 'var(--border-default)'}`, font: '400 var(--text-base)/1.55 var(--font-sans)', textWrap: 'pretty' }}>
          {pending ? (
            <span aria-label="Digitando" className="pr-msg__dots"><span /><span /><span /></span>
          ) : children}
        </div>
        {error ? <span role="alert" style={{ font: '400 var(--text-xs)/1.3 var(--font-sans)', color: 'var(--text-danger)' }}>{error}</span> : null}
        {(time || actions) && !pending ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, font: '400 var(--text-2xs)/1 var(--font-sans)', color: 'var(--text-tertiary)' }}>
            {time ? <span style={{ marginRight: 6 }}>{time}</span> : null}
            {actions && !user ? (
              <>
                <IconButton icon="copy" label="Copiar" size="sm" iconSize={14} />
                <IconButton icon="thumbs-up" label="Útil" size="sm" iconSize={14} />
                <IconButton icon="thumbs-down" label="Não útil" size="sm" iconSize={14} />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
