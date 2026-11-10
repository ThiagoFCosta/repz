// Semana atual do bloco (BRIEFING 6.1) e o rótulo da pílula do Início (9.3).

import { diasEntre, type ISODate } from '../datas';
import type { Fase, Faixa, PlanoImportado } from '../tipos';
import { faseDaSemana } from './prescricao';

export interface PlanoComBloco extends Pick<PlanoImportado, 'bloco' | 'progressao'> {
  inicioBloco: ISODate | null;
  ajusteSemana: number;
}

export interface SemanaAtual {
  semana: number | null; // limitada a [1, N]; null sem BLOCO ou sem data de início
  semanaPrescricao: number | null; // semana usada para calcular a prescrição (ver D1)
  totalSemanas: number | null;
  fase: Fase | null;
  numeroFase: number | null; // 1-based, na ordem do plano
  antesDoInicio: boolean;
  concluido: boolean; // passou da última semana do bloco
}

const SEM_BLOCO: SemanaAtual = {
  semana: null,
  semanaPrescricao: null,
  totalSemanas: null,
  fase: null,
  numeroFase: null,
  antesDoInicio: false,
  concluido: false,
};

export function semanaDoBloco(plano: PlanoComBloco, hoje: ISODate): SemanaAtual {
  const bloco = plano.bloco;
  if (!bloco || !plano.inicioBloco) return { ...SEM_BLOCO, totalSemanas: bloco?.semanas ?? null };
  const dias = diasEntre(plano.inicioBloco, hoje);
  const bruta = Math.floor(dias / 7) + 1 + plano.ajusteSemana;
  const semana = Math.min(Math.max(bruta, 1), bloco.semanas);
  const concluido = bruta > bloco.semanas;
  // D1: depois do bloco, continua com a última fase que não é deload
  const ultimaNormal = [...bloco.fases].reverse().find((f) => !f.deload) ?? null;
  const semanaPrescricao = concluido && ultimaNormal ? ultimaNormal.ate : semana;
  const fase = faseDaSemana(plano, semanaPrescricao);
  return {
    semana,
    semanaPrescricao,
    totalSemanas: bloco.semanas,
    fase,
    numeroFase: fase ? bloco.fases.indexOf(fase) + 1 : null,
    antesDoInicio: bruta < 1,
    concluido,
  };
}

const faixaTxt = (f: Faixa) => (f.min === f.max ? `${f.min}` : `${f.min}-${f.max}`);

// "Semana 6 de 12 · Fase 2 · RIR 1-2" | "Semana 12 de 12 · Deload" | "Bloco concluído" | null (sem bloco)
export function rotuloSemana(plano: PlanoComBloco, s: SemanaAtual): string | null {
  if (s.semana == null || s.totalSemanas == null) return null;
  if (s.concluido) return 'Bloco concluído';
  const partes = [`Semana ${s.semana} de ${s.totalSemanas}`];
  if (s.fase?.deload) partes.push('Deload');
  else {
    if (s.numeroFase) partes.push(`Fase ${s.numeroFase}`);
    partes.push(`RIR ${faixaTxt(s.fase?.rir ?? plano.progressao.rir)}`);
  }
  return partes.join(' · ');
}
