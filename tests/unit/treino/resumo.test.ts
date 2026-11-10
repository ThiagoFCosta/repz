import { describe, expect, it } from 'vitest';
import { sugerir } from '../../../src/dominio/progressao/motor';
import { comTreinoAtual, recorde, tipoCartao, volume } from '../../../src/dominio/treino/resumo';

const supino = { reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 }, porTempo: false };
const series = (kg: number, reps: number[], rir: number | null = 2) =>
  reps.map((r) => ({ kg, reps: r, rir }));
const antes = [
  { data: '2026-11-01', series: series(80, [8, 8, 7]) },
  { data: '2026-11-04', series: series(80, [9, 8, 8]) },
];

describe('volume do treino', () => {
  it('soma kg × reps; exercício por tempo não entra', () => {
    expect(
      volume([
        { kg: 80, reps: 10, porTempo: false },
        { kg: 80, reps: 8, porTempo: false },
        { kg: 10, reps: 45, porTempo: true },
      ]),
    ).toBe(1440);
    expect(volume([])).toBe(0);
  });
});

describe('treino atual no histórico do motor', () => {
  it('entra uma vez, no fim; sem séries, o histórico fica igual', () => {
    const h = comTreinoAtual(antes, '2026-11-07', series(80, [10, 10, 10]));
    expect(h).toHaveLength(3);
    expect(h.at(-1)).toEqual({ data: '2026-11-07', series: series(80, [10, 10, 10]) });
    expect(comTreinoAtual(antes, '2026-11-07', [])).toEqual(antes);
    expect(antes).toHaveLength(2); // não altera a entrada
  });

  it('o cartão do fim usa o treino de hoje: topo da faixa → ↑ 82,5 kg', () => {
    const sug = sugerir(comTreinoAtual(antes, '2026-11-07', series(80, [10, 10, 10])), supino, {
      hoje: '2026-11-07',
    });
    expect(sug).toMatchObject({ acao: 'aumentar', carga: 82.5, repsSugeridas: [6, 6, 6] });
  });
});

describe('recordes (9.6)', () => {
  it('melhor e1RM da variante', () => {
    // 80 × 10 RIR 2 → 80 × (1 + 12/30) = 112; antes o melhor era 80 × 9 RIR 2 = 109,3
    expect(recorde(series(80, [10, 9, 9]), antes, supino)).toEqual({
      tipo: 'e1rm',
      valor: 112,
      anterior: 109.3,
      serie: { kg: 80, reps: 10 },
    });
  });

  it('RIR não anotado usa o ponto médio do alvo', () => {
    // 80 × 10 RIR 1,5 → 110,7 > 109,3
    expect(recorde(series(80, [10], null), antes, supino)).toMatchObject({ tipo: 'e1rm', valor: 110.7 });
  });

  it('maior carga sem bater o e1RM', () => {
    // 85 × 5 RIR 0 → 99,2 (abaixo de 109,3), mas 85 kg nunca tinha sido usado
    expect(recorde([...series(80, [6]), ...series(85, [5, 4], 0)], antes, supino)).toEqual({
      tipo: 'carga',
      valor: 85,
      anterior: 80,
      serie: { kg: 85, reps: 5 },
    });
  });

  it('sem recorde: igual ou pior que antes; primeira vez na variante; nada feito', () => {
    expect(recorde(series(80, [9, 8, 8]), antes, supino)).toBeNull();
    expect(recorde(series(80, [10, 10, 10]), [], supino)).toBeNull();
    expect(recorde([], antes, supino)).toBeNull();
  });

  it('por tempo: maior duração', () => {
    const prancha = { rir: { min: 1, max: 2 }, porTempo: true };
    const ant = [{ data: '2026-11-01', series: [40, 35].map((reps) => ({ kg: 0, reps, rir: null })) }];
    const hoje = (r: number[]) => r.map((reps) => ({ kg: 0, reps, rir: null }));
    expect(recorde(hoje([45, 40]), ant, prancha)).toEqual({ tipo: 'tempo', valor: 45, anterior: 40 });
    expect(recorde(hoje([40, 40]), ant, prancha)).toBeNull();
  });
});

describe('ícone do cartão "Para o próximo treino" (7.6)', () => {
  it('↑ = ↓ pela ação; ! quando mantém com alerta', () => {
    expect(tipoCartao({ acao: 'aumentar', alertas: [] })).toBe('aumentar');
    expect(tipoCartao({ acao: 'reduzir', alertas: ['queda'] })).toBe('reduzir');
    expect(tipoCartao({ acao: 'manter', alertas: [] })).toBe('manter');
    expect(tipoCartao({ acao: 'manter', alertas: ['estagnado'] })).toBe('alerta');
    expect(tipoCartao({ acao: 'calibrar', alertas: [] })).toBe('manter');
  });
});
