import { signal } from '@preact/signals';

// Hash router: o GitHub Pages não faz fallback de SPA, então as rotas ficam depois do "#".
// Formato: #/<aba>/<subcaminho…>, ex. #/plano/revisar
export const ABAS = ['treino', 'historico', 'plano'] as const;
export type Aba = (typeof ABAS)[number];

export interface Rota {
  aba: Aba;
  caminho: string[];
}

export function rotaDoHash(hash: string): Rota {
  const partes = hash.replace(/^#\/?/, '').split('?')[0]!.split('/').filter(Boolean).map(decodeURIComponent);
  const [primeira = '', ...resto] = partes;
  return (ABAS as readonly string[]).includes(primeira)
    ? { aba: primeira as Aba, caminho: resto }
    : { aba: 'treino', caminho: [] };
}

export const rota = signal<Rota>(
  typeof location === 'undefined' ? { aba: 'treino', caminho: [] } : rotaDoHash(location.hash),
);

export function iniciarRoteador(): void {
  window.addEventListener('hashchange', () => {
    rota.value = rotaDoHash(location.hash);
    window.scrollTo(0, 0);
  });
}

export function navegar(destino: string): void {
  location.hash = destino.startsWith('#') ? destino : `#/${destino}`;
}
