// Máquina de estados do treino (BRIEFING 14, ARCHITECTURE 7). Reducer puro:
// (estado, evento, agora) → { estado, efeitos }. Quem grava no banco e liga timers é o controlador.

import {
  concluido,
  descansoDoGrupo,
  inicioDaRodada,
  proximoItem,
  restantes,
  seguinteNaRodada,
} from './biset';

export type Etapa =
  | { tipo: 'ocioso' }
  | { tipo: 'registrando'; item: number } // item = índice em sessao.itens
  | { tipo: 'descanso'; fimEm: number /* epoch ms */; duracao: number /* s */; proximo: number }
  | { tipo: 'resumo' };

// O que a máquina precisa saber de cada item, congelado no início do treino
export interface ItemTreino {
  grupo: number | null; // n de SSn
  descanso: number; // segundos (máximo da faixa); 0 = sem descanso
}

export interface EstadoTreino {
  versao: 1;
  etapa: Etapa;
  semana: number | null; // semana usada na prescrição (D1)
  itens: ItemTreino[];
  alvo: number[]; // séries prescritas na semana, por item
  feitas: number[]; // séries de trabalho concluídas
  extras: number[]; // séries adicionadas além da prescrição
  pulados: number[];
  variante: (number | null)[]; // índice da variante escolhida; null = ainda não escolhida (D3)
}

export interface DadosSerie {
  kg: number;
  reps: number; // segundos quando o exercício é por tempo
  rir: number | null; // 4 = "4+"
}

export type Evento =
  | {
      tipo: 'INICIAR';
      itens: ItemTreino[];
      alvo: number[];
      variante: (number | null)[];
      semana: number | null;
    }
  | { tipo: 'ESCOLHER_VARIANTE'; item: number; variante: number }
  | { tipo: 'CONCLUIR_SERIE'; dados: DadosSerie }
  | { tipo: 'AQUECIMENTO'; dados: DadosSerie }
  | { tipo: 'FIM_DESCANSO' }
  | { tipo: 'PULAR_DESCANSO' }
  | { tipo: 'AJUSTAR_DESCANSO'; segundos: number }
  | { tipo: 'PULAR_EXERCICIO'; item: number }
  | { tipo: 'IR_PARA'; item: number }
  | { tipo: 'ADICIONAR_SERIE'; item: number }
  | { tipo: 'EDITAR_SERIE'; id: string; dados: DadosSerie }
  | { tipo: 'FINALIZAR' }
  | { tipo: 'RETOMAR' }
  | { tipo: 'FECHAR' }
  | { tipo: 'DESCARTAR' };

export type Efeito =
  | {
      tipo: 'gravarSerie';
      item: number;
      variante: number;
      ordem: number; // nº da série de trabalho no exercício; 0 = aquecimento
      aquecimento: boolean;
      dados: DadosSerie;
    }
  | { tipo: 'editarSerie'; id: string; dados: DadosSerie }
  | { tipo: 'iniciarDescanso'; fimEm: number }
  | { tipo: 'cancelarDescanso' }
  | { tipo: 'concluirTreino' }
  | { tipo: 'descartarTreino' };

export interface Transicao {
  estado: EstadoTreino;
  efeitos: Efeito[];
}

// Tolerância para um timer de fim de descanso que dispare um pouco antes da hora
const TOLERANCIA_FIM_MS = 1000;

export const ESTADO_OCIOSO: EstadoTreino = {
  versao: 1,
  etapa: { tipo: 'ocioso' },
  semana: null,
  itens: [],
  alvo: [],
  feitas: [],
  extras: [],
  pulados: [],
  variante: [],
};

const ativo = (e: EstadoTreino) => e.etapa.tipo === 'registrando' || e.etapa.tipo === 'descanso';

// Primeiro item ainda pendente, ou resumo
function primeiraPendente(e: EstadoTreino): Etapa {
  const i = e.itens.findIndex((_, j) => !concluido(e, j));
  return i < 0 ? { tipo: 'resumo' } : { tipo: 'registrando', item: i };
}

// Item pendente a partir de j: o próprio, o início da rodada do grupo ou o próximo item
function destino(e: EstadoTreino, j: number): Etapa {
  if (!concluido(e, j)) return { tipo: 'registrando', item: j };
  const k = inicioDaRodada(e, j) ?? proximoItem(e, j);
  return k == null ? { tipo: 'resumo' } : { tipo: 'registrando', item: k };
}

const cancelar = (e: EstadoTreino): Efeito[] =>
  e.etapa.tipo === 'descanso' ? [{ tipo: 'cancelarDescanso' }] : [];

const com = <T>(lista: T[], i: number, valor: T) => lista.map((x, j) => (j === i ? valor : x));

function concluirSerie(e: EstadoTreino, item: number, dados: DadosSerie, agora: number): Transicao {
  const variante = e.variante[item];
  if (variante == null) return { estado: e, efeitos: [] }; // D3: escolha a variante antes
  // Série a mais num exercício já concluído (depois de "ir para") vira série extra
  const extras = restantes(e, item) <= 0 ? com(e.extras, item, (e.extras[item] ?? 0) + 1) : e.extras;
  const ordem = (e.feitas[item] ?? 0) + 1;
  const base: EstadoTreino = { ...e, extras, feitas: com(e.feitas, item, ordem) };
  const efeitos: Efeito[] = [{ tipo: 'gravarSerie', item, variante, ordem, aquecimento: false, dados }];

  // Bi-set: vai direto ao próximo do grupo, sem descanso
  const seguinte = seguinteNaRodada(base, item);
  if (seguinte != null)
    return { estado: { ...base, etapa: { tipo: 'registrando', item: seguinte } }, efeitos };

  const proximo = inicioDaRodada(base, item) ?? proximoItem(base, item);
  if (proximo == null) return { estado: { ...base, etapa: { tipo: 'resumo' } }, efeitos };
  const duracao = descansoDoGrupo(base, item);
  if (duracao <= 0) return { estado: { ...base, etapa: { tipo: 'registrando', item: proximo } }, efeitos };
  const fimEm = agora + duracao * 1000;
  return {
    estado: { ...base, etapa: { tipo: 'descanso', fimEm, duracao, proximo } },
    efeitos: [...efeitos, { tipo: 'iniciarDescanso', fimEm }],
  };
}

export function reduzir(e: EstadoTreino, ev: Evento, agora: number): Transicao {
  const igual: Transicao = { estado: e, efeitos: [] };
  const etapa = e.etapa;

  switch (ev.tipo) {
    case 'INICIAR': {
      if (etapa.tipo !== 'ocioso') return igual;
      const n = ev.itens.length;
      const novo: EstadoTreino = {
        versao: 1,
        etapa: { tipo: 'ocioso' },
        semana: ev.semana,
        itens: ev.itens,
        alvo: ev.alvo,
        feitas: Array<number>(n).fill(0),
        extras: Array<number>(n).fill(0),
        pulados: [],
        variante: ev.variante,
      };
      return { estado: { ...novo, etapa: primeiraPendente(novo) }, efeitos: [] };
    }

    case 'ESCOLHER_VARIANTE':
      if (!ativo(e)) return igual;
      return { estado: { ...e, variante: com(e.variante, ev.item, ev.variante) }, efeitos: [] };

    case 'CONCLUIR_SERIE':
      if (etapa.tipo !== 'registrando') return igual;
      return concluirSerie(e, etapa.item, ev.dados, agora);

    case 'AQUECIMENTO': {
      if (etapa.tipo !== 'registrando') return igual;
      const variante = e.variante[etapa.item];
      if (variante == null) return igual;
      return {
        estado: e,
        efeitos: [
          { tipo: 'gravarSerie', item: etapa.item, variante, ordem: 0, aquecimento: true, dados: ev.dados },
        ],
      };
    }

    case 'FIM_DESCANSO':
    case 'PULAR_DESCANSO':
      if (etapa.tipo !== 'descanso') return igual;
      if (ev.tipo === 'FIM_DESCANSO' && agora < etapa.fimEm - TOLERANCIA_FIM_MS) return igual;
      return {
        estado: { ...e, etapa: destino(e, etapa.proximo) },
        efeitos: ev.tipo === 'PULAR_DESCANSO' ? [{ tipo: 'cancelarDescanso' }] : [],
      };

    case 'AJUSTAR_DESCANSO': {
      if (etapa.tipo !== 'descanso') return igual;
      const fimEm = Math.max(agora, etapa.fimEm + ev.segundos * 1000);
      if (fimEm <= agora)
        return {
          estado: { ...e, etapa: destino(e, etapa.proximo) },
          efeitos: [{ tipo: 'cancelarDescanso' }],
        };
      const duracao = Math.max(etapa.duracao + ev.segundos, Math.ceil((fimEm - agora) / 1000));
      return {
        estado: { ...e, etapa: { ...etapa, fimEm, duracao } },
        efeitos: [{ tipo: 'iniciarDescanso', fimEm }],
      };
    }

    case 'PULAR_EXERCICIO': {
      if (!ativo(e) || concluido(e, ev.item)) return igual;
      const base = { ...e, pulados: [...e.pulados, ev.item] };
      const afetado =
        (etapa.tipo === 'registrando' && etapa.item === ev.item) ||
        (etapa.tipo === 'descanso' && etapa.proximo === ev.item);
      if (!afetado) return { estado: base, efeitos: [] };
      return { estado: { ...base, etapa: destino(base, ev.item) }, efeitos: cancelar(e) };
    }

    case 'IR_PARA':
      if (!ativo(e) || ev.item < 0 || ev.item >= e.itens.length) return igual;
      return {
        estado: {
          ...e,
          pulados: e.pulados.filter((j) => j !== ev.item),
          etapa: { tipo: 'registrando', item: ev.item },
        },
        efeitos: cancelar(e),
      };

    case 'ADICIONAR_SERIE':
      if (!ativo(e)) return igual;
      return { estado: { ...e, extras: com(e.extras, ev.item, (e.extras[ev.item] ?? 0) + 1) }, efeitos: [] };

    case 'EDITAR_SERIE':
      if (etapa.tipo === 'ocioso') return igual;
      return { estado: e, efeitos: [{ tipo: 'editarSerie', id: ev.id, dados: ev.dados }] };

    case 'FINALIZAR':
      if (!ativo(e)) return igual;
      return { estado: { ...e, etapa: { tipo: 'resumo' } }, efeitos: cancelar(e) };

    case 'RETOMAR':
      if (etapa.tipo !== 'resumo') return igual;
      return { estado: { ...e, etapa: primeiraPendente(e) }, efeitos: [] };

    case 'FECHAR':
      if (etapa.tipo !== 'resumo') return igual;
      return { estado: { ...e, etapa: { tipo: 'ocioso' } }, efeitos: [{ tipo: 'concluirTreino' }] };

    case 'DESCARTAR':
      if (etapa.tipo === 'ocioso') return igual;
      return {
        estado: { ...e, etapa: { tipo: 'ocioso' } },
        efeitos: [...cancelar(e), { tipo: 'descartarTreino' }],
      };
  }
}

// Ao reabrir o app: descanso vencido vai direto para a próxima série (ARCHITECTURE 7.4)
export function retomar(e: EstadoTreino, agora: number): EstadoTreino {
  return e.etapa.tipo === 'descanso' && e.etapa.fimEm <= agora
    ? reduzir(e, { tipo: 'FIM_DESCANSO' }, agora).estado
    : e;
}
