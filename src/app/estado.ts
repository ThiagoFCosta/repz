// Estado global da aplicação (signals) e as ações que o alteram, sempre passando por dados/.

import { computed, signal } from './sinal';
import { progressoDaSemana } from '../dominio/cardio';
import { hojeLocal, inicioDaSemana } from '../dominio/datas';
import { rotuloSemana, semanaDoBloco } from '../dominio/periodizacao/semana';
import { precisaLembrete } from '../dados/backup';
import { RepzDb } from '../dados/db';
import { listarCardio } from '../dados/repos/cardio';
import { listarCheckins } from '../dados/repos/checkins';
import { listarBio, listarFita, listarPesos } from '../dados/repos/corpo';
import { lerConfigs, type MapaConfig } from '../dados/repos/config';
import { gravarMeta, lerMeta, lerPreferencias } from '../dados/repos/meta';
import { listarPlanos, planoAtivo as lerPlanoAtivo } from '../dados/repos/planos';
import { chavesComHistorico, treinoEmAndamento, ultimoConcluido } from '../dados/repos/treinos';
import {
  PREFERENCIAS_PADRAO,
  type CardioRealizado,
  type BioLocal,
  type CheckinLocal,
  type FitaLocal,
  type PesoLocal,
  type Persistencia,
  type Plano,
  type Preferencias,
  type Treino,
} from '../dados/tipos';

// Um banco local por usuário (repz-<user_id>, ARCHITECTURE 7.1); aberto por iniciarEstado depois do login.
// `let` exportado: quem importa `db` enxerga o banco aberto (ligação viva do módulo).
export let db = new RepzDb();

export const carregado = signal(false);
export const erroFatal = signal<string | null>(null);
export const hoje = signal(hojeLocal(new Date()));
export const planoAtivo = signal<Plano | null>(null);
export const planos = signal<Plano[]>([]);
export const configs = signal<MapaConfig>(new Map());
export const chavesHistorico = signal<Map<string, string>>(new Map());
export const treinoAberto = signal<Treino | null>(null);
export const persistencia = signal<Persistencia>('indisponivel');
export const preferencias = signal<Preferencias>(PREFERENCIAS_PADRAO);
// Cardio registrado, do mais recente ao mais antigo (poucos registros: cabe na memória)
export const cardios = signal<CardioRealizado[]>([]);
// Esta semana (segunda a domingo) no Início do mockup: treinos concluídos e séries de trabalho
export const semanaResumo = signal({ treinos: 0, series: 0 });
// Corpo (V5), em ordem cronológica
export const pesos = signal<PesoLocal[]>([]);
export const bios = signal<BioLocal[]>([]);
export const fitas = signal<FitaLocal[]>([]);
// Check-ins de prontidão, do mais recente ao mais antigo (V3)
export const checkins = signal<CheckinLocal[]>([]);
// Treinos concluídos (lembrete de backup no Início, 9.9)
export const totalTreinos = signal(0);
// sessaoId do último treino concluído do plano ativo (rotação, 6.3)
export const ultimaSessaoConcluida = signal<string | null>(null);

export const semanaAtual = computed(() =>
  planoAtivo.value ? semanaDoBloco(planoAtivo.value, hoje.value) : null,
);
// Cartão Cardio do Início: "X de Y nesta semana" (9.3)
export const progressoCardio = computed(() =>
  progressoDaSemana(planoAtivo.value?.cardio ?? [], cardios.value, hoje.value),
);
export const lembreteBackup = computed(() =>
  precisaLembrete(preferencias.value.ultimoBackup, totalTreinos.value, hoje.value),
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
  const [p, todos, c, h, t, pref, cs, n] = await Promise.all([
    lerPlanoAtivo(db),
    listarPlanos(db),
    lerConfigs(db),
    chavesComHistorico(db),
    treinoEmAndamento(db),
    lerPreferencias(db),
    listarCardio(db),
    db.treinos.where('status').equals('concluido').count(),
  ]);
  checkins.value = await listarCheckins(db);
  [pesos.value, bios.value, fitas.value] = await Promise.all([
    listarPesos(db),
    listarBio(db),
    listarFita(db),
  ]);
  const daSemana = await db.treinos
    .where('data')
    .aboveOrEqual(inicioDaSemana(hoje.value))
    .filter((t) => t.status === 'concluido')
    .primaryKeys();
  const seriesSemana = daSemana.length
    ? await db.series
        .where('treinoId')
        .anyOf(daSemana)
        .filter((s) => !s.aquecimento)
        .count()
    : 0;
  semanaResumo.value = { treinos: daSemana.length, series: seriesSemana };
  planoAtivo.value = p;
  planos.value = todos;
  configs.value = c;
  chavesHistorico.value = h;
  treinoAberto.value = t;
  preferencias.value = pref;
  cardios.value = cs;
  totalTreinos.value = n;
  ultimaSessaoConcluida.value = p ? ((await ultimoConcluido(db, p.id))?.sessaoId ?? null) : null;
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

// `aoCarregar` roda antes de a UI aparecer (ex.: retomar o treino em andamento)
export async function iniciarEstado(usuarioId: string, aoCarregar?: () => Promise<void>): Promise<void> {
  db = new RepzDb(`repz-${usuarioId}`);
  try {
    await db.open();
    await recarregar();
    await aoCarregar?.();
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
