// Screen Wake Lock durante o treino (BRIEFING 9.5). O sistema libera o bloqueio quando o app sai
// da tela; ele é pedido de novo ao voltar.

let desejado = false;
let sentinela: WakeLockSentinel | null = null;

async function pedir(): Promise<void> {
  if (!desejado || sentinela || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    sentinela = await navigator.wakeLock.request('screen');
    sentinela.addEventListener('release', () => (sentinela = null));
  } catch {
    sentinela = null; // bateria fraca, permissão negada ou sem suporte: segue sem
  }
}

export function manterTelaLigada(ligar: boolean): void {
  desejado = ligar;
  if (ligar) void pedir();
  else {
    void sentinela?.release();
    sentinela = null;
  }
}

export const wakeLockSuportado = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => void pedir());
}
