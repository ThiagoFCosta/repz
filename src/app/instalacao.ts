// Instalação na tela inicial (BRIEFING 11; ARCHITECTURE 9.4): boas-vindas enquanto o app roda
// no navegador, lembrete discreto depois de dispensada e o botão "Instalar" quando o navegador
// oferece o `beforeinstallprompt` (Chrome do Android).

import { computed, signal } from '@preact/signals';

// Evento do Chrome, fora do lib.dom do TypeScript
interface PromptInstalacao extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Preferência só da interface, deste navegador: não vai no backup nem no IndexedDB
const CHAVE = 'repz.boasVindas';

function lerDispensada(): boolean {
  try {
    return localStorage.getItem(CHAVE) === 'dispensada';
  } catch {
    return false;
  }
}

function rodandoInstalado(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS: navigator.standalone; demais: display-mode do manifest
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export const instalado = signal(rodandoInstalado());
export const boasVindasDispensada = signal(lerDispensada());
// Reaberta pelo lembrete ("Como instalar")
export const boasVindasAberta = signal(false);
export const promptInstalacao = signal<PromptInstalacao | null>(null);

export const mostrarBoasVindas = computed(
  () => !instalado.value && (!boasVindasDispensada.value || boasVindasAberta.value),
);
export const mostrarLembreteInstalacao = computed(() => !instalado.value && !mostrarBoasVindas.value);

// Ordem das instruções: a do aparelho primeiro (iPadOS se apresenta como Mac com toque)
export const ehIos =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

export function iniciarInstalacao(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Guarda o evento para o botão "Instalar" em vez do mini-infobar do Chrome
    e.preventDefault();
    promptInstalacao.value = e as PromptInstalacao;
  });
  window.addEventListener('appinstalled', () => {
    instalado.value = true;
    promptInstalacao.value = null;
  });
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (e) => {
    if (e.matches) instalado.value = true;
  });
}

export function dispensarBoasVindas(): void {
  boasVindasDispensada.value = true;
  boasVindasAberta.value = false;
  try {
    localStorage.setItem(CHAVE, 'dispensada');
  } catch {
    // modo anônimo ou armazenamento bloqueado: vale só nesta sessão
  }
}

export async function instalar(): Promise<void> {
  const p = promptInstalacao.value;
  if (!p) return;
  // O evento só pode ser usado uma vez
  promptInstalacao.value = null;
  await p.prompt();
  const { outcome } = await p.userChoice;
  if (outcome === 'accepted') {
    instalado.value = true;
    boasVindasAberta.value = false;
  }
}
