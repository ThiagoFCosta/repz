// Quando sincronizar (docs/v2/ARCHITECTURE.md 8.3-8.4): ao abrir, ao voltar a rede, ao voltar ao app, pouco
// depois de cada escrita e, com pendência, de tempos em tempos. Nunca bloqueia a tela: tudo em segundo plano.

import { esperaMs } from '../dominio/sync/regras';
import { contarPendentes, limparErros, sincronizar } from '../dados/sincronizar';
import { ErroRede, remoto } from '../remoto';
import { db, recarregar, treinoAberto } from './estado';
import { signal } from './sinal';

export interface EstadoSync {
  online: boolean;
  rodando: boolean;
  pendentes: number;
  erros: { id: string; store: string; erro: string }[];
  ultimaEm: string | null; // última sincronização completa
  pendenteDesde: number | null; // epoch ms: desde quando há algo esperando para subir
}

export const estadoSync = signal<EstadoSync>({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  rodando: false,
  pendentes: 0,
  erros: [],
  ultimaEm: null,
  pendenteDesde: null,
});

let usuario: string | null = null;
let falhas = 0;
let proxima: ReturnType<typeof setTimeout> | undefined;

const atualizar = (m: Partial<EstadoSync>) => (estadoSync.value = { ...estadoSync.value, ...m });

async function lerPendencias(): Promise<void> {
  const { pendentes, erros } = await contarPendentes(db);
  atualizar({
    pendentes,
    erros: erros.map((e) => ({ id: e.id, store: e.store, erro: e.erro ?? '' })),
    pendenteDesde: pendentes ? (estadoSync.value.pendenteDesde ?? Date.now()) : null,
  });
}

function agendar(ms: number): void {
  clearTimeout(proxima);
  proxima = setTimeout(() => void sincronizarAgora(), ms);
}

export async function sincronizarAgora(): Promise<void> {
  if (!usuario || estadoSync.value.rodando) return;
  atualizar({ rodando: true });
  try {
    const r = await sincronizar(db, remoto, usuario);
    falhas = 0;
    atualizar({ online: true, ultimaEm: new Date().toISOString() });
    // O que chegou do servidor aparece nas telas; o treino em andamento é só deste aparelho
    if (r.recebidos && !treinoAberto.value) await recarregar();
  } catch (e) {
    falhas++;
    if (e instanceof ErroRede) atualizar({ online: false });
    else console.warn('[sync]', e);
    agendar(esperaMs(falhas));
  } finally {
    atualizar({ rodando: false });
    await lerPendencias();
  }
}

export async function tentarDeNovo(): Promise<void> {
  await limparErros(db);
  await sincronizarAgora();
}

// Chamado depois que o banco do usuário abriu
export function iniciarSincronizador(usuarioId: string): void {
  usuario = usuarioId;
  void lerPendencias().then(() => sincronizarAgora());
  window.addEventListener('online', () => {
    atualizar({ online: true });
    void sincronizarAgora();
  });
  window.addEventListener('offline', () => atualizar({ online: false }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void sincronizarAgora();
  });
  // Escritas novas: a contagem é barata (índice) e a subida espera 2 s para agrupar séries seguidas
  setInterval(() => {
    void lerPendencias().then(() => {
      const s = estadoSync.value;
      if (s.pendentes > s.erros.length && !s.rodando) agendar(2_000);
    });
  }, 5_000);
  // Rede de segurança: puxa novidades de outro aparelho de tempos em tempos
  setInterval(() => void sincronizarAgora(), 5 * 60_000);
}

// Selo da tela: sem rede, ou com algo esperando para subir há mais de 1 min
export function mostrarSeloOffline(s: EstadoSync, agora: number): boolean {
  return !s.online || (s.pendenteDesde != null && agora - s.pendenteDesde > 60_000);
}
