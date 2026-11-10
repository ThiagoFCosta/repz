// Estado global da aplicação (signals) e as ações que o alteram, sempre passando por dados/.

import { computed, signal } from '@preact/signals';
import { hojeLocal } from '../dominio/datas';
import { rotuloSemana, semanaDoBloco } from '../dominio/periodizacao/semana';
import { RepzDb } from '../dados/db';
import { lerConfigs, type MapaConfig } from '../dados/repos/config';
import { gravarMeta, lerMeta } from '../dados/repos/meta';
import { listarPlanos, planoAtivo as lerPlanoAtivo } from '../dados/repos/planos';
import { chavesComHistorico, treinoEmAndamento } from '../dados/repos/treinos';
import type { Persistencia, Plano, Treino } from '../dados/tipos';

export const db = new RepzDb();

export const carregado = signal(false);
export const erroFatal = signal<string | null>(null);
export const hoje = signal(hojeLocal(new Date()));
export const planoAtivo = signal<Plano | null>(null);
export const planos = signal<Plano[]>([]);
export const configs = signal<MapaConfig>(new Map());
export const chavesHistorico = signal<Map<string, string>>(new Map());
export const treinoAberto = signal<Treino | null>(null);
export const persistencia = signal<Persistencia>('indisponivel');

export const semanaAtual = computed(() =>
  planoAtivo.value ? semanaDoBloco(planoAtivo.value, hoje.value) : null,
);
export const pilulaSemana = computed(() =>
  planoAtivo.value && semanaAtual.value ? rotuloSemana(planoAtivo.value, semanaAtual.value) : null,
);

// Mensagem curta no rodapé ("Plano salvo")
export const aviso = signal<string | null>(null);
let timerAviso: ReturnType<typeof setTimeout> | undefined;
export function mostrarAviso(msg: string): void {
  aviso.value = msg;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => (aviso.value = null), 3500);
}

export async function recarregar(): Promise<void> {
  const [p, todos, c, h, t] = await Promise.all([
    lerPlanoAtivo(db),
    listarPlanos(db),
    lerConfigs(db),
    chavesComHistorico(db),
    treinoEmAndamento(db),
  ]);
  planoAtivo.value = p;
  planos.value = todos;
  configs.value = c;
  chavesHistorico.value = h;
  treinoAberto.value = t;
}

// Pede armazenamento persistente uma vez e guarda o resultado (BRIEFING seção 11)
async function garantirPersistencia(): Promise<void> {
  let estado: Persistencia = 'indisponivel';
  try {
    if (navigator.storage?.persisted) {
      estado =
        (await navigator.storage.persisted()) || (await navigator.storage.persist()) ? 'concedida' : 'negada';
    }
  } catch {
    estado = 'indisponivel';
  }
  persistencia.value = estado;
  if (estado !== (await lerMeta(db, 'persistencia'))) await gravarMeta(db, 'persistencia', estado);
}

export async function iniciarEstado(): Promise<void> {
  try {
    await db.open();
    await recarregar();
    carregado.value = true;
    void garantirPersistencia();
  } catch (e) {
    console.error(e);
    erroFatal.value =
      'Não foi possível abrir os dados do app neste navegador. Se estiver em modo anônimo, abra em uma janela normal.';
  }
  // O app pode ficar aberto de um dia para o outro
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') hoje.value = hojeLocal(new Date());
  });
}
