import { describe, expect, it } from 'vitest';
import {
  melhorPorSemana,
  melhorSerie,
  variacao8Semanas,
  type TreinoDoExercicio,
} from '../../src/dominio/historico';

const t = (
  data: string,
  series: [kg: number, reps: number, rir: number | null][],
  deload = false,
): TreinoDoExercicio => ({
  treinoId: data,
  data,
  deload,
  rirPadrao: 1.5,
  series: series.map(([kg, reps, rir]) => ({ kg, reps, rir })),
});

// e1RM = kg × (1 + (reps + RIR) / 30), calculado à mão ao lado de cada série
const supino = [
  t('2026-09-08', [
    [80, 10, 2], // 80 × 1,4 = 112
    [80, 9, 2], // 80 × 1,3667 = 109,3
  ]),
  t('2026-09-11', [[82.5, 8, 2]]), // 82,5 × 1,3333 = 110 → a semana fica com 112
  t('2026-09-15', [[85, 8, 1]]), // 85 × 1,3 = 110,5
  t('2026-09-22', [[60, 10, null]], true), // deload, RIR não anotado = 1,5: 60 × 1,3833 = 83
  t('2026-09-28', [
    [100, 5, 0], // 100 × 1,1667 = 116,7
    [85, 10, 2], // 85 × 1,4 = 119
  ]),
  t('2026-11-09', [[90, 8, 2]]), // 90 × 1,3333 = 120
];

describe('e1RM por semana (gráfico do Histórico, 9.8)', () => {
  it('melhor e1RM de cada semana (segunda a domingo), com o deload marcado', () => {
    expect(melhorPorSemana(supino, false)).toEqual([
      { semana: '2026-09-07', valor: 112, deload: false },
      { semana: '2026-09-14', valor: 110.5, deload: false },
      { semana: '2026-09-21', valor: 83, deload: true },
      { semana: '2026-09-28', valor: 119, deload: false },
      { semana: '2026-11-09', valor: 120, deload: false },
    ]);
  });

  it('ordem de entrada não importa; treino sem séries não gera ponto; deload de um treino marca a semana', () => {
    const pontos = melhorPorSemana(
      [t('2026-09-10', [[80, 8, 2]], true), t('2026-09-12', []), t('2026-09-08', [[80, 10, 2]])],
      false,
    );
    expect(pontos).toEqual([{ semana: '2026-09-07', valor: 112, deload: true }]);
    expect(melhorPorSemana([], false)).toEqual([]);
  });

  it('exercício por tempo: maior duração da semana', () => {
    expect(
      melhorPorSemana(
        [
          t('2026-09-08', [
            [0, 45, null],
            [0, 50, null],
          ]),
          t('2026-09-15', [[10, 40, 2]]),
        ],
        true,
      ),
    ).toEqual([
      { semana: '2026-09-07', valor: 50, deload: false },
      { semana: '2026-09-14', valor: 40, deload: false },
    ]);
  });
});

describe('KPIs', () => {
  it('variação em 8 semanas: última semana contra a última até 8 semanas antes', () => {
    // 09/11 − 8 semanas = 14/09 → referência 110,5; 120 − 110,5 = 9,5 (8,6%)
    expect(variacao8Semanas(melhorPorSemana(supino, false))).toEqual({
      atual: 120,
      referencia: 110.5,
      desde: '2026-09-14',
      delta: 9.5,
      pct: 8.6,
      completa: true,
    });
  });

  it('com menos de 8 semanas, compara com a primeira; um ponto só não tem variação', () => {
    const pontos = melhorPorSemana(supino.slice(0, 5), false);
    // 119 − 112 = 7 (6,3%)
    expect(variacao8Semanas(pontos)).toEqual({
      atual: 119,
      referencia: 112,
      desde: '2026-09-07',
      delta: 7,
      pct: 6.3,
      completa: false,
    });
    expect(variacao8Semanas(pontos.slice(0, 1))).toBeNull();
    expect(variacao8Semanas([])).toBeNull();
    expect(variacao8Semanas([{ semana: '2026-09-07', valor: 0, deload: false }, ...pontos])?.pct).toBe(0);
  });

  it('melhor série: maior e1RM, com a data; no empate, a mais antiga', () => {
    expect(melhorSerie(supino, false)).toEqual({
      kg: 90,
      reps: 8,
      rir: 2,
      data: '2026-11-09',
      treinoId: '2026-11-09',
      valor: 120,
    });
    expect(melhorSerie([t('2026-09-08', [[80, 10, 2]]), t('2026-09-15', [[80, 10, 2]])], false)?.data).toBe(
      '2026-09-08',
    );
    expect(melhorSerie([], false)).toBeNull();
    expect(melhorSerie([t('2026-09-08', [[0, 60, null]])], true)?.valor).toBe(60);
  });
});
