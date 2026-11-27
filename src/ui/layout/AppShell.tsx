// Moldura do app no design system do Prisma (mockup aprovado): topo com menu ☰, barra inferior
// Início · Corpo · Treino · Dieta · Coach e a gaveta do menu com as telas secundárias.

import { useState, type ReactNode } from 'react';
import {
  AppShell as Moldura,
  BottomNav,
  Button,
  Logo,
  Sidebar,
  TopBar,
  type BottomNavItem,
  type NavSection,
} from '@ds';
import { aplicarAtualizacao, atualizacaoDisponivel } from '../../app/pwa';
import { aviso, preferencias, treinoAberto } from '../../app/estado';
import { navegar, rota, type Aba } from '../../app/roteador';

const BARRA: (BottomNavItem & { destino: string; aba: Aba })[] = [
  { id: 'inicio', label: 'Início', icon: 'house', destino: '', aba: 'inicio' },
  { id: 'corpo', label: 'Corpo', icon: 'heart-pulse', destino: 'corpo', aba: 'corpo' },
  { id: 'treino', label: 'Treino', icon: 'activity', primary: true, destino: 'treino', aba: 'treino' },
  { id: 'dieta', label: 'Dieta', icon: 'utensils', destino: 'dieta', aba: 'dieta' },
  { id: 'coach', label: 'Coach', icon: 'sparkles', destino: 'coach', aba: 'coach' },
];

// Menu ☰ (BRIEFING-v2, seção 12). Cardio abre o registro; Configurações e Plano alimentar entram nos marcos V1/V6.
const MENU: NavSection[] = [
  {
    items: [
      { id: 'historico', label: 'Histórico', icon: 'history' },
      { id: 'treino/cardio', label: 'Cardio', icon: 'zap' },
      { id: 'plano', label: 'Plano de treino', icon: 'clipboard' },
      { id: 'dieta', label: 'Plano alimentar', icon: 'utensils' },
      { id: 'referencias', label: 'Referências', icon: 'book-open' },
      { id: 'perfil', label: 'Perfil', icon: 'user' },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const r = rota.value;
  const ativo = r.aba === 'treino' && r.caminho[0] === 'cardio' ? null : r.aba;
  const ir = (destino: string) => {
    setMenuAberto(false);
    navegar(destino);
  };
  const nome = preferencias.value.nomeExibicao ?? 'Repz';
  return (
    <Moldura
      drawerOpen={menuAberto}
      onDrawerClose={() => setMenuAberto(false)}
      // A gaveta só existe aberta: fechada, os itens do menu não entram na árvore de acessibilidade
      sidebar={
        menuAberto && (
          <Sidebar
            brand={<Logo size={28} />}
            sections={MENU}
            activeId={r.aba === 'treino' && r.caminho[0] === 'cardio' ? 'treino/cardio' : r.aba}
            onSelect={ir}
            onClose={() => setMenuAberto(false)}
          />
        )
      }
      topbar={
        <TopBar
          className="repz-topo"
          title={<Logo size={24} />}
          search={false}
          onMenuClick={() => setMenuAberto(true)}
          mobileActions={<span />}
          desktopActions={<span />}
          user={{ name: nome }}
        />
      }
      bottomNav={
        <BottomNav
          items={BARRA.map((b) => ({ ...b, count: undefined }))}
          activeId={ativo ?? undefined}
          onSelect={(id) => ir(BARRA.find((b) => b.id === id)?.destino ?? '')}
        />
      }
    >
      {children}
      {/* Nunca atualiza no meio de um treino (BRIEFING seção 11) */}
      {atualizacaoDisponivel.value && !treinoAberto.value && (
        <div className="banner" role="status">
          <span>Atualização disponível</span>
          <Button size="sm" onClick={() => void aplicarAtualizacao()}>
            Atualizar
          </Button>
        </div>
      )}
      {aviso.value && (
        <div className="banner banner-aviso" role="status">
          {aviso.value}
        </div>
      )}
    </Moldura>
  );
}
