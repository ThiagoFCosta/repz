// Log de cada sugestão, o "espião" (BRIEFING-v2 8.2, D39): o que o motor viu e decidiu ao montar o treino, e depois
// o que o usuário fez. É a matéria-prima da auditoria (V8).

import type { Faixa } from '../tipos.ts';
import type { PrescricaoMotor, SerieHistorico, TreinoHistorico } from '../progressao/motor.ts';
import type { Prontidao } from '../prontidao/prontidao.ts';
import type { SugestaoV2 } from './sugerir.ts';

export type Desfecho = 'aceita' | 'editada' | 'ignorada';

export interface ResultadoSugestao {
  reps: number[];
  rir: (number | null)[];
  naFaixa: boolean; // todas as séries dentro da faixa de reps
  abaixoDaFaixa: boolean; // a 1ª série ou metade delas abaixo do mínimo (como a regra 4)
  rirNoAlvo: boolean; // RIR anotado dentro do alvo, com a tolerância
}

export interface RegistroSugestao {
  id: string;
  treinoId: string;
  exercicioPrescritoId: string;
  chave: string;
  variante: string;
  versaoMotor: string;
  versaoParametros: number;
  regra: string;
  entradas: {
    historico: TreinoHistorico[]; // os últimos 4 treinos do exercício
    presc: PrescricaoMotor;
    incremento: number | null;
    horasDesdeUltima: number | null;
  };
  prontidao: Prontidao | null;
  acao: SugestaoV2['acao'];
  carga: number | null;
  motivo: string;
  alertas: string[];
  cargaUsada: number | null;
  desfecho: Desfecho | null;
  resultado: ResultadoSugestao | null;
  criadoEm: string;
}

export function criarRegistro(d: {
  id: string;
  treinoId: string;
  exercicioPrescritoId: string;
  chave: string;
  variante: string;
  sugestao: SugestaoV2;
  historico: TreinoHistorico[];
  presc: PrescricaoMotor;
  incremento: number | null;
  horasDesdeUltima: number | null;
  prontidao: Prontidao | null;
  criadoEm: string;
}): RegistroSugestao {
  const s = d.sugestao;
  return {
    id: d.id,
    treinoId: d.treinoId,
    exercicioPrescritoId: d.exercicioPrescritoId,
    chave: d.chave,
    variante: d.variante,
    versaoMotor: s.versaoMotor,
    versaoParametros: s.versaoParametros,
    regra: s.regra,
    entradas: {
      historico: d.historico.slice(-4),
      presc: {
        reps: d.presc.reps,
        rir: d.presc.rir,
        porTempo: d.presc.porTempo === true,
        fase: d.presc.fase ? { deload: d.presc.fase.deload } : null,
      },
      incremento: d.incremento,
      horasDesdeUltima: d.horasDesdeUltima,
    },
    prontidao: d.prontidao,
    acao: s.acao,
    carga: s.carga,
    motivo: s.motivo,
    alertas: [...s.alertas],
    cargaUsada: null,
    desfecho: null,
    resultado: null,
    criadoEm: d.criadoEm,
  };
}

const dentro = (x: number, f: Faixa) => x >= f.min && x <= f.max;

// Fecha o registro ao concluir o treino: séries de trabalho feitas na variante da sugestão
export function fecharRegistro(
  r: RegistroSugestao,
  series: readonly SerieHistorico[],
  toleranciaRir = 1,
): Pick<RegistroSugestao, 'cargaUsada' | 'desfecho' | 'resultado'> {
  if (!series.length) return { cargaUsada: null, desfecho: 'ignorada', resultado: null };
  const carga = Math.max(...series.map((s) => s.kg));
  const { reps: faixa, rir: alvo } = r.entradas.presc;
  const reps = series.map((s) => s.reps);
  const abaixo = reps.filter((x) => x < faixa.min).length;
  const aceita = r.carga == null ? r.acao === 'calibrar' : series.every((s) => s.kg === r.carga);
  return {
    cargaUsada: carga,
    desfecho: aceita ? 'aceita' : 'editada',
    resultado: {
      reps,
      rir: series.map((s) => s.rir),
      naFaixa: reps.every((x) => dentro(x, faixa)),
      abaixoDaFaixa: reps[0]! < faixa.min || abaixo >= Math.ceil(reps.length / 2),
      rirNoAlvo: series.every(
        (s) => s.rir == null || (s.rir >= alvo.min - toleranciaRir && s.rir <= alvo.max + toleranciaRir),
      ),
    },
  };
}
