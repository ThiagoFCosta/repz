import { signal } from '@preact/signals';
import { registerSW } from 'virtual:pwa-register';

// Nunca recarrega sozinho: a UI mostra o aviso e o usuário decide (BRIEFING seção 11).
export const atualizacaoDisponivel = signal(false);
let aplicar: ((recarregar?: boolean) => Promise<void>) | null = null;

export function registrarServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  aplicar = registerSW({
    immediate: true,
    onNeedRefresh() {
      atualizacaoDisponivel.value = true;
    },
  });
}

export async function aplicarAtualizacao(): Promise<void> {
  await aplicar?.(true);
}
