// Controlador do treino (ARCHITECTURE 4.8 e 7.4): evento da UI → reducer → uma transação Dexie
// (série + Treino.estadoUI) → efeitos (descanso, som, vibração, wake lock).
// A UI nunca escreve no banco durante o treino sem passar por aqui.

import { computed, signal } from '@preact/signals';
import { agoraISO, hojeLocal } from '../dominio/datas';
import { prescricao, type Prescricao } from '../dominio/periodizacao/prescricao';
import { incrementoPadrao } from '../dominio/progressao/incremento';
import { sugerir, type Sugestao } from '../dominio/progressao/motor';
import { proximaSessao } from '../dominio/rotacao';
import { duracaoEstimada } from '../dominio/treino/estimativa';
import {
  ESTADO_OCIOSO,
  reduzir,
  retomar,
  type Efeito,
  type EstadoTreino,
  type Evento,
} from '../dominio/treino/maquina';
import { preencher, type Preenchimento } from '../dominio/treino/preenchimento';
import { novoId } from '../dados/db';
import { historicoDaChave, treinosConcluidos, type HistoricoVariante } from '../dados/historico-repo';
import { criarTreino, persistirTransicao, seriesDoTreino, type Transicao } from '../dados/repos/treinos';
import type { ExercicioPrescrito, Plano, SerieRealizada, SessaoTemplate, Treino } from '../dados/tipos';
import { agendarDescanso, cancelarDescanso, prepararAudio } from './descanso';
import {
  configs,
  db,
  hoje,
  planoAtivo,
  preferencias,
  recarregar,
  semanaAtual,
  treinoAberto,
  ultimaSessaoConcluida,
} from './estado';
import { navegar } from './roteador';
import { manterTelaLigada } from './wake-lock';

export interface ItemContexto {
  ex: ExercicioPrescrito;
  presc: Prescricao;
  incremento: number[]; // por variante
  historico: HistoricoVariante[]; // por variante
}

export interface TreinoAtivo {
  treino: Treino;
  estado: EstadoTreino;
  series: SerieRealizada[]; // deste treino, em ordem
  sessao: SessaoTemplate;
  itens: ItemContexto[];
}

export const treinoAtivo = signal<TreinoAtivo | null>(null);
export const erroTreino = signal<string | null>(null);

// Sessão escolhida em "Trocar sessão"; sem escolha, vale a rotação
export const sessaoEscolhida = signal<string | null>(null);
export const sessaoSugerida = computed(() => {
  const p = planoAtivo.value;
  if (!p) return null;
  return p.sessoes[proximaSessao(p.sessoes, ultimaSessaoConcluida.value)] ?? null;
});
export const proximaSessaoTreino = computed(
  () => planoAtivo.value?.sessoes.find((s) => s.id === sessaoEscolhida.value) ?? sessaoSugerida.value,
);

// Foco efetivo: a configuração do usuário tem prioridade sobre o plano (6.2)
export function focoEfetivo(ex: ExercicioPrescrito): boolean {
  return ex.chaves.map((k) => configs.value.get(k)?.foco).find((f) => f != null) ?? ex.foco;
}

export function prescricaoDaSemana(plano: Plano, ex: ExercicioPrescrito, semana: number | null): Prescricao {
  return prescricao(plano, ex, semana, focoEfetivo(ex));
}

async function montarContexto(
  plano: Plano,
  sessao: SessaoTemplate,
  semana: number | null,
): Promise<ItemContexto[]> {
  const concluidos = await treinosConcluidos(db);
  return Promise.all(
    sessao.itens.map(async (ex) => ({
      ex,
      presc: prescricaoDaSemana(plano, ex, semana),
      incremento: ex.chaves.map(
        (k, v) => configs.value.get(k)?.incrementoKg ?? incrementoPadrao(ex.variantes[v]!),
      ),
      historico: await Promise.all(ex.chaves.map((k) => historicoDaChave(db, configs.value, k, concluidos))),
    })),
  );
}

// Variante padrão (D3): a última usada; com uma só, ela; sem histórico em nenhuma, o usuário escolhe
function varianteInicial(ctx: ItemContexto): number | null {
  if (ctx.ex.variantes.length === 1) return 0;
  let melhor: number | null = null;
  ctx.historico.forEach((h, v) => {
    if (h.ultimaEm && (melhor == null || h.ultimaEm > ctx.historico[melhor]!.ultimaEm!)) melhor = v;
  });
  return melhor;
}

// ---- Sugestão e pré-preenchimento ----

export function sugestaoDoItem(
  a: TreinoAtivo,
  item: number,
  variante = a.estado.variante[item] ?? 0,
): Sugestao {
  const ctx = a.itens[item]!;
  return sugerir(ctx.historico[variante]?.treinos ?? [], ctx.presc, {
    hoje: hoje.value,
    incremento: ctx.incremento[variante],
    nome: ctx.ex.variantes[variante],
    config: { estagnadoSemanas: planoAtivo.value?.progressao.estagnado ?? 3 },
  });
}

// Séries de trabalho deste treino no item (na variante, se informada)
export function seriesDoItem(a: TreinoAtivo, item: number, variante?: number): SerieRealizada[] {
  const ex = a.itens[item]!.ex;
  const chave = variante == null ? null : ex.chaves[variante];
  return a.series.filter(
    (s) => s.exercicioPrescritoId === ex.id && !s.aquecimento && (chave == null || s.chave === chave),
  );
}

export function preenchimentoDoItem(a: TreinoAtivo, item: number): Preenchimento & { sugestao: Sugestao } {
  const v = a.estado.variante[item] ?? 0;
  const ctx = a.itens[item]!;
  const sugestao = sugestaoDoItem(a, item, v);
  const p = preencher(sugestao, seriesDoItem(a, item, v), ctx.presc.reps, ctx.historico[v]?.treinos.at(-1));
  return { ...p, sugestao };
}

// ---- Eventos ----

function serieDoEfeito(
  a: TreinoAtivo,
  ef: Extract<Efeito, { tipo: 'gravarSerie' }>,
  agora: Date,
): SerieRealizada {
  const ex = a.itens[ef.item]!.ex;
  const sugestaoKg = ef.aquecimento ? null : sugestaoDoItem(a, ef.item, ef.variante).carga;
  return {
    id: novoId(),
    treinoId: a.treino.id,
    exercicioPrescritoId: ex.id,
    chave: ex.chaves[ef.variante]!,
    variante: ex.variantes[ef.variante]!,
    ordem: ef.ordem,
    kg: ef.dados.kg,
    reps: ef.dados.reps,
    rir: ef.dados.rir,
    aquecimento: ef.aquecimento,
    feitaEm: agoraISO(agora),
    sugestaoKg,
    sugestaoAceita: sugestaoKg == null ? null : ef.dados.kg === sugestaoKg,
  };
}

function aplicarAgendamento(estado: EstadoTreino): void {
  if (estado.etapa.tipo !== 'descanso') return;
  agendarDescanso(
    estado.etapa.fimEm,
    { som: preferencias.value.somDescanso, vibrar: preferencias.value.vibrar },
    () => void despachar({ tipo: 'FIM_DESCANSO' }),
  );
}

async function processar(ev: Evento): Promise<void> {
  const a = treinoAtivo.value;
  if (!a) return;
  const agora = new Date();
  const { estado, efeitos } = reduzir(a.estado, ev, agora.getTime());
  if (estado === a.estado && efeitos.length === 0) return;

  const t: Transicao = {
    novas: [],
    edicoes: [],
    treino: { estadoUI: estado, atualizadoEm: agoraISO(agora) },
  };
  for (const ef of efeitos) {
    if (ef.tipo === 'gravarSerie') t.novas.push(serieDoEfeito(a, ef, agora));
    else if (ef.tipo === 'editarSerie') t.edicoes.push({ id: ef.id, dados: ef.dados });
    else if (ef.tipo === 'concluirTreino')
      Object.assign(t.treino, { status: 'concluido', fim: agoraISO(agora) });
    else if (ef.tipo === 'descartarTreino')
      Object.assign(t.treino, { status: 'descartado', fim: agoraISO(agora) });
  }

  try {
    await persistirTransicao(db, a.treino.id, t);
  } catch (e) {
    console.error(e);
    erroTreino.value = 'Não foi possível gravar. Nada foi perdido: tente de novo.';
    return;
  }
  erroTreino.value = null;

  // Depois de gravado: atualiza a tela e executa os efeitos
  const editadas = new Map(t.edicoes.map((e) => [e.id, e.dados]));
  const series = [
    ...a.series.map((s) => (editadas.has(s.id) ? { ...s, ...editadas.get(s.id) } : s)),
    ...t.novas,
  ];
  treinoAtivo.value = { ...a, estado, series, treino: { ...a.treino, ...t.treino } };

  for (const ef of efeitos) {
    if (ef.tipo === 'iniciarDescanso') aplicarAgendamento(estado);
    else if (ef.tipo === 'cancelarDescanso') cancelarDescanso();
  }
  if (efeitos.some((ef) => ef.tipo === 'concluirTreino' || ef.tipo === 'descartarTreino'))
    await encerrarSessao();
  else if (estado.etapa.tipo === 'resumo') manterTelaLigada(false);
  else if (a.estado.etapa.tipo === 'resumo') manterTelaLigada(preferencias.value.manterTelaLigada);
}

// Fila: dois toques rápidos não processam eventos em paralelo
let fila: Promise<void> = Promise.resolve();
export function despachar(ev: Evento): Promise<void> {
  // gesto do usuário: libera o áudio para o bipe do descanso (exigência do navegador)
  if (ev.tipo === 'CONCLUIR_SERIE') prepararAudio();
  fila = fila.then(() => processar(ev)).catch((e) => console.error(e));
  return fila;
}

async function encerrarSessao(): Promise<void> {
  cancelarDescanso();
  manterTelaLigada(false);
  treinoAtivo.value = null;
  sessaoEscolhida.value = null;
  await recarregar();
  navegar('treino');
}

// ---- Início, retomada e encerramento ----

export async function iniciarTreino(sessaoId: string): Promise<void> {
  const plano = planoAtivo.value;
  const sessao = plano?.sessoes.find((s) => s.id === sessaoId);
  if (!plano || !sessao || treinoAtivo.value) return;
  const semana = semanaAtual.value?.semanaPrescricao ?? null;
  const itens = await montarContexto(plano, sessao, semana);
  const agora = new Date();
  const { estado } = reduzir(
    ESTADO_OCIOSO,
    {
      tipo: 'INICIAR',
      itens: itens.map((c) => ({ grupo: c.ex.grupo, descanso: c.presc.descanso?.max ?? 0 })),
      alvo: itens.map((c) => c.presc.series),
      variante: itens.map(varianteInicial),
      semana,
    },
    agora.getTime(),
  );
  const treino: Treino = {
    id: novoId(),
    planoId: plano.id,
    sessaoId: sessao.id,
    sessaoNome: sessao.nome,
    data: hojeLocal(agora),
    inicio: agoraISO(agora),
    fim: null,
    semanaBloco: semanaAtual.value?.semana ?? null,
    status: 'em_andamento',
    estadoUI: estado,
    notas: {},
    atualizadoEm: agoraISO(agora),
  };
  await criarTreino(db, treino);
  treinoAberto.value = treino;
  treinoAtivo.value = { treino, estado, series: [], sessao, itens };
  manterTelaLigada(preferencias.value.manterTelaLigada);
  navegar('treino/agora');
}

// Ao abrir o app: carrega o treino em andamento; descanso vencido vai direto à próxima série
export async function restaurarTreino(): Promise<void> {
  const t = treinoAberto.value;
  if (!t?.estadoUI) return;
  const plano = planoAtivo.value?.id === t.planoId ? planoAtivo.value : null;
  const sessao = plano?.sessoes.find((s) => s.id === t.sessaoId);
  if (!plano || !sessao || sessao.itens.length !== t.estadoUI.itens.length) {
    erroTreino.value = 'O treino aberto não corresponde ao plano ativo. Encerre-o no Início.';
    return;
  }
  const agora = Date.now();
  const estado = retomar(t.estadoUI, agora);
  if (estado !== t.estadoUI)
    await persistirTransicao(db, t.id, { novas: [], edicoes: [], treino: { estadoUI: estado } });
  const [series, itens] = await Promise.all([
    seriesDoTreino(db, t.id),
    montarContexto(plano, sessao, estado.semana),
  ]);
  treinoAtivo.value = { treino: { ...t, estadoUI: estado }, estado, series, sessao, itens };
  aplicarAgendamento(estado);
  if (estado.etapa.tipo !== 'resumo') manterTelaLigada(preferencias.value.manterTelaLigada);
}

// Treino esquecido aberto (> 4 h): conclui com o fim na última atividade; sem séries, descarta
export async function encerrarTreinoAberto(): Promise<void> {
  const t = treinoAberto.value;
  if (!t) return;
  const temSeries = (await seriesDoTreino(db, t.id)).some((s) => !s.aquecimento);
  await persistirTransicao(db, t.id, {
    novas: [],
    edicoes: [],
    treino: {
      status: temSeries ? 'concluido' : 'descartado',
      fim: t.atualizadoEm,
      estadoUI: t.estadoUI ? { ...t.estadoUI, etapa: { tipo: 'ocioso' } } : null,
    },
  });
  erroTreino.value = null;
  await encerrarSessao();
}

export async function salvarNota(item: number, texto: string): Promise<void> {
  const a = treinoAtivo.value;
  if (!a) return;
  const notas = { ...a.treino.notas, [a.itens[item]!.ex.id]: texto.trim() };
  if (!texto.trim()) delete notas[a.itens[item]!.ex.id];
  await persistirTransicao(db, a.treino.id, { novas: [], edicoes: [], treino: { notas } });
  treinoAtivo.value = { ...a, treino: { ...a.treino, notas } };
}

export const HORAS_TREINO_ESQUECIDO = 4;
export function treinoEsquecido(t: Treino, agora: number): boolean {
  return agora - Date.parse(t.atualizadoEm) > HORAS_TREINO_ESQUECIDO * 3_600_000;
}

// Duração estimada de uma sessão na semana atual (cartão Próximo treino)
export function duracaoDaSessao(plano: Plano, sessao: SessaoTemplate): number {
  const semana = semanaAtual.value?.semanaPrescricao ?? null;
  return duracaoEstimada(
    sessao.itens.map((ex) => ({ ...ex, series: prescricaoDaSemana(plano, ex, semana).series })),
  );
}
