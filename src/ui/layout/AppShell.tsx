import type { ComponentChildren } from 'preact';
import { rota, type Rota } from '../../app/roteador';
import { atualizacaoDisponivel, aplicarAtualizacao } from '../../app/pwa';

const ABAS: { rota: Rota; rotulo: string; icone: ComponentChildren }[] = [
  { rota: 'treino', rotulo: 'Treino', icone: <path d="M3 10v4M6 7v10M9 12h6M18 7v10M21 10v4" /> },
  { rota: 'historico', rotulo: 'Histórico', icone: <path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" /> },
  { rota: 'plano', rotulo: 'Plano', icone: <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" /> },
];

export function AppShell({ children }: { children: ComponentChildren }) {
  return (
    <div class="shell">
      <main class="shell-conteudo">{children}</main>
      {atualizacaoDisponivel.value && (
        <div class="banner" role="status">
          <span>Atualização disponível</span>
          <button class="botao" onClick={() => void aplicarAtualizacao()}>
            Atualizar
          </button>
        </div>
      )}
      <nav class="abas" aria-label="Navegação principal">
        {ABAS.map((a) => (
          <a
            key={a.rota}
            class="aba"
            href={`#/${a.rota}`}
            aria-current={rota.value === a.rota ? 'page' : undefined}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              {a.icone}
            </svg>
            {a.rotulo}
          </a>
        ))}
      </nav>
    </div>
  );
}
