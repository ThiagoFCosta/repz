import { createBrowserRouter } from 'react-router';
import type { ReactNode } from 'react';
import { signal } from './sinal';

// Rotas por caminho com React Router 7 (docs/v2/DECISOES.md, D33): a Netlify faz o fallback de SPA.
// O app lê a rota pelo sinal `rota` (como na v1) e navega com `navegar('plano/importar')`.
//   /                 Início
//   /treino           treino em andamento (sem treino aberto, o Início) · /treino/sessao · /treino/cardio
//   /historico/...    Histórico (exercício, treinos, treino, cardio)
//   /plano/...        Plano de treino (importar, revisar) e dados
//   /corpo /dieta /coach /referencias /perfil   telas novas da v2
export const ABAS = [
  'inicio',
  'treino',
  'historico',
  'plano',
  'corpo',
  'dieta',
  'coach',
  'referencias',
  'perfil',
] as const;
export type Aba = (typeof ABAS)[number];

export interface Rota {
  aba: Aba;
  caminho: string[];
}

export function rotaDoCaminho(pathname: string): Rota {
  const partes = pathname.split('?')[0]!.split('#')[0]!.split('/').filter(Boolean).map(decodeURIComponent);
  const [primeira = '', ...resto] = partes;
  return primeira !== 'inicio' && (ABAS as readonly string[]).includes(primeira)
    ? { aba: primeira as Aba, caminho: resto }
    : { aba: 'inicio', caminho: [] };
}

export const rota = signal<Rota>(
  typeof location === 'undefined' ? { aba: 'inicio', caminho: [] } : rotaDoCaminho(location.pathname),
);

let roteador: ReturnType<typeof createBrowserRouter> | null = null;

// Uma rota só: as telas da v1 escolhem o que mostrar pelo sinal `rota`
export function criarRoteador(elemento: ReactNode) {
  roteador = createBrowserRouter([{ path: '*', element: elemento }]);
  roteador.subscribe((estado) => {
    const nova = rotaDoCaminho(estado.location.pathname);
    if (nova.aba !== rota.peek().aba || nova.caminho.join('/') !== rota.peek().caminho.join('/')) {
      rota.value = nova;
      document.querySelector('.pr-shell__content')?.scrollTo(0, 0);
      window.scrollTo(0, 0);
    }
  });
  return roteador;
}

// `destino` sem barra inicial: '' = Início, 'plano/importar'…
export function navegar(destino: string): void {
  const caminho = '/' + destino.replace(/^\/+/, '');
  if (roteador) void roteador.navigate(caminho);
  else history.pushState(null, '', caminho);
}
