import { signal } from '@preact/signals';

// Hash router: o GitHub Pages não faz fallback de SPA, então as rotas ficam depois do "#".
export const ROTAS = ['treino', 'historico', 'plano'] as const;
export type Rota = (typeof ROTAS)[number];

export function rotaDoHash(hash: string): Rota {
  const nome = hash.replace(/^#\/?/, '').split(/[/?]/)[0] ?? '';
  return (ROTAS as readonly string[]).includes(nome) ? (nome as Rota) : 'treino';
}

export const rota = signal<Rota>(typeof location === 'undefined' ? 'treino' : rotaDoHash(location.hash));

export function iniciarRoteador(): void {
  window.addEventListener('hashchange', () => {
    rota.value = rotaDoHash(location.hash);
  });
}
