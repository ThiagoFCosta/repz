// Parâmetros versionados do motor (BRIEFING-v2 8.3): os da v1 (BRIEFING 7.3) mais os da prontidão e do corpo.
// Mudança de VALOR: por rascunho → confirmação, com motivo e teste retroativo (V8). Mudança de LÓGICA: só no código.

import { CONFIG_PROGRESSAO, type ConfigProgressao } from '../progressao/config.ts';
import { PRONTIDAO_PADRAO, type ParametrosProntidao } from '../prontidao/prontidao.ts';

export const VERSAO_MOTOR = '2.0.0';

export interface ParametrosMotor extends ConfigProgressao, ParametrosProntidao {
  descansoMinimoH: number; // P4: menos que isso desde a última vez no exercício → aviso
  perdaPesoSemanalPct: number; // P5: perda acima disso por semana, 2 semanas seguidas → alerta do coach
}

// Versão 1: exatamente os valores da v1 + os padrões do BRIEFING-v2
export const PARAMETROS_V1: Readonly<ParametrosMotor> = {
  ...CONFIG_PROGRESSAO,
  ...PRONTIDAO_PADRAO,
  descansoMinimoH: 48,
  perdaPesoSemanalPct: 0.7,
};

// Limites rígidos por parâmetro (BRIEFING-v2 8.3): nenhuma versão sai deles
export const LIMITES: Readonly<Record<keyof ParametrosMotor, { min: number; max: number }>> = {
  pausaDias: { min: 14, max: 35 },
  reducaoPausa: { min: 0.05, max: 0.2 },
  quedaLimite: { min: 0.03, max: 0.1 },
  quedaSessoes: { min: 2, max: 3 },
  reducaoQueda: { min: 0.025, max: 0.1 },
  aumentoMin: { min: 0.01, max: 0.05 },
  aumentoMax: { min: 0.02, max: 0.1 },
  aumentoFolga: { min: 0.05, max: 0.125 },
  toleranciaRir: { min: 0.5, max: 2 },
  estagnadoSemanas: { min: 2, max: 6 },
  sonoMinimoH: { min: 5, max: 7 },
  sonoAbaixoMediaH: { min: 1, max: 3 },
  disposicaoBaixa: { min: 1, max: 3 },
  janelaMediaDias: { min: 7, max: 28 },
  descansoMinimoH: { min: 24, max: 72 },
  perdaPesoSemanalPct: { min: 0.5, max: 1.5 },
};

export interface ErroParametro {
  parametro: string;
  msg: string;
}

export function validarParametros(p: Record<string, unknown>): ErroParametro[] {
  const erros: ErroParametro[] = [];
  for (const [nome, lim] of Object.entries(LIMITES)) {
    const v = p[nome];
    if (typeof v !== 'number' || !Number.isFinite(v))
      erros.push({ parametro: nome, msg: 'falta ou não é número' });
    else if (v < lim.min || v > lim.max)
      erros.push({ parametro: nome, msg: `fora do limite (${lim.min} a ${lim.max})` });
  }
  for (const nome of Object.keys(p))
    if (!(nome in LIMITES)) erros.push({ parametro: nome, msg: 'parâmetro desconhecido' });
  if (typeof p.aumentoMin === 'number' && typeof p.aumentoMax === 'number' && p.aumentoMin > p.aumentoMax)
    erros.push({ parametro: 'aumentoMin', msg: 'maior que aumentoMax' });
  return erros;
}

// Diferença entre duas versões (para a proposta de ajuste: no máximo uma mudança por vez)
export function mudancas(a: ParametrosMotor, b: ParametrosMotor): (keyof ParametrosMotor)[] {
  return (Object.keys(LIMITES) as (keyof ParametrosMotor)[]).filter((k) => a[k] !== b[k]);
}
