import type { ReactNode } from 'react';
import { useEffect } from 'react';

// Folha inferior (bottom sheet) para menus e confirmações; fecha no fundo ou com Esc
export function Folha({
  titulo,
  aoFechar,
  children,
}: {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aoFechar]);
  return (
    <div className="folha-fundo" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="folha" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="folha-topo">
          <h2>{titulo}</h2>
          <button type="button" className="folha-fechar" aria-label="Fechar" onClick={aoFechar}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
