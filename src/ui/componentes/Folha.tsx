import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

// Folha inferior (bottom sheet) para menus e confirmações; fecha no fundo ou com Esc
export function Folha({
  titulo,
  aoFechar,
  children,
}: {
  titulo: string;
  aoFechar: () => void;
  children: ComponentChildren;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aoFechar]);
  return (
    <div class="folha-fundo" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div class="folha" role="dialog" aria-modal="true" aria-label={titulo}>
        <div class="folha-topo">
          <h2>{titulo}</h2>
          <button type="button" class="folha-fechar" aria-label="Fechar" onClick={aoFechar}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
