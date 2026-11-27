// Motor de carga v2 (BRIEFING-v2 8.1): o motor da v1 inteiro e, por cima, a prontidão como MODULADOR (não como
// fator na carga). Sem check-in e sem prontidão baixa no histórico, a saída é a da v1.
//   P1 prontidão baixa hoje → nada de aumento (usa a carga anterior); reduções continuam
//   P2 queda em treinos com prontidão baixa não conta para a regra 3 (no núcleo)
//   P3 abaixo da faixa num treino com prontidão baixa → manter (no núcleo)
//   P4 menos de 48 h desde a última vez no exercício → só aviso
//   P5 perda de peso rápida → alerta do coach (dominio/corpo), não muda a carga

import { diasEntre, type ISODate } from '../datas.ts';
import { formatarKg } from '../numeros.ts';
import {
  sugerirDetalhado,
  type AlertaMotor,
  type OpcoesMotor,
  type PrescricaoMotor,
  type RegraMotor,
  type Sugestao,
  type TreinoHistorico,
} from '../progressao/motor.ts';
import type { Prontidao } from '../prontidao/prontidao.ts';
import { PARAMETROS_V1, VERSAO_MOTOR, type ParametrosMotor } from './parametros.ts';

export interface EntradaMotorV2 {
  historico: TreinoHistorico[]; // com prontidaoBaixa por treino
  presc: PrescricaoMotor;
  hoje: ISODate;
  incremento?: number;
  nome?: string;
  estagnadoSemanas?: number; // do plano (PROGRESSAO.estagnado)
  prontidaoHoje?: Prontidao | null; // null/ausente: sem check-in (P1 não se aplica)
  parametros?: ParametrosMotor;
  versaoParametros?: number;
  // P4 só faz sentido para o treino de hoje (o cartão "Para o próximo" passa false)
  avisoDescanso?: boolean;
}

export interface SugestaoV2 extends Sugestao {
  regra: RegraMotor;
  alertasRegras: AlertaMotor[];
  versaoMotor: string;
  versaoParametros: number;
}

// Mesma carga: as reps da última vez na carga de trabalho, dentro da faixa (como a v1 faz ao manter, 7.6)
function repsDaUltima(historico: TreinoHistorico[], presc: PrescricaoMotor): number[] | null {
  const u = historico.filter((t) => t.series.length).at(-1);
  if (!u) return null;
  const carga = Math.max(...u.series.map((x) => x.kg));
  return u.series
    .filter((x) => x.kg === carga)
    .map((x) => Math.min(Math.max(x.reps, presc.reps.min), presc.reps.max));
}

export function sugerirV2(e: EntradaMotorV2): SugestaoV2 {
  const p = e.parametros ?? PARAMETROS_V1;
  const opts: OpcoesMotor = {
    hoje: e.hoje,
    incremento: e.incremento,
    nome: e.nome,
    config: { ...p, estagnadoSemanas: e.estagnadoSemanas ?? p.estagnadoSemanas },
  };
  const { sugestao, regra, alertasRegras } = sugerirDetalhado(e.historico, e.presc, opts);
  let s: Sugestao = { ...sugestao, alertas: [...sugestao.alertas] };
  let r = regra;
  const extras = [...alertasRegras];

  // P1: prontidão baixa hoje → mantém a carga anterior no lugar de aumentar
  if (e.prontidaoHoje?.baixa && s.acao === 'aumentar' && s.anterior != null) {
    s = {
      ...s,
      acao: 'manter',
      carga: s.anterior,
      variacao: 0,
      motivo: `Prontidão baixa hoje: mantenha ${formatarKg(s.anterior)}. O aumento fica para um dia de sono normal.`,
      repsSugeridas: repsDaUltima(e.historico, e.presc),
    };
    r = 'P1';
  }

  // P4: pouco descanso desde a última vez neste exercício (a data do treino dá a precisão de dia)
  const ultimo = e.historico.filter((t) => t.series.length).at(-1);
  if (e.avisoDescanso !== false && ultimo && diasEntre(ultimo.data, e.hoje) * 24 < p.descansoMinimoH) {
    s.alertas.push('Pouco descanso desde a última vez neste exercício.');
    extras.push('P4');
  }

  return {
    ...s,
    regra: r,
    alertasRegras: extras,
    versaoMotor: VERSAO_MOTOR,
    versaoParametros: e.versaoParametros ?? 1,
  };
}
