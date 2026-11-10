// 1RM estimado (Epley com RIR) e arredondamentos de carga ao salto do equipamento.

export { incrementoPadrao } from './incremento';

// Repetições até a falha = reps feitas + RIR
export function e1rm(kg: number, reps: number, rir: number | null): number {
  return kg * (1 + (reps + (rir ?? 0)) / 30);
}

// Carga para fazer `reps` deixando `rir` na reserva, a partir de um e1RM
export function cargaPara(e1: number, reps: number, rir: number): number {
  return e1 / (1 + (reps + rir) / 30);
}

// Uma casa decimal (esconde ruído de ponto flutuante)
export const umaCasa = (x: number) => Math.round(x * 10) / 10;

// Múltiplo do salto mais próximo, abaixo ou igual
export const arredondaParaBaixo = (kg: number, salto: number) => Math.floor(kg / salto + 1e-9) * salto;

// Múltiplo do salto mais próximo
export const arredonda = (kg: number, salto: number) => Math.round(kg / salto) * salto;
