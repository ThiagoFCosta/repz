import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/dominio/formato/parser';
import { prescricao } from '../../../src/dominio/periodizacao/prescricao';
import { duracaoEstimada, TEMPO_SERIE_S } from '../../../src/dominio/treino/estimativa';
import { proximaSessao } from '../../../src/dominio/rotacao';
import {
  inicioDaRodada,
  membros,
  proximoItem,
  rodada,
  seguinteNaRodada,
} from '../../../src/dominio/treino/biset';

const plano = parse(
  fs.readFileSync(new URL('../../fixtures/raul.treino.txt', import.meta.url), 'utf8'),
).plano!;

describe('rotação (6.3)', () => {
  const sessoes = [{ id: 'push' }, { id: 'pull' }, { id: 'pernas' }];
  it('sem histórico, a primeira', () => {
    expect(proximaSessao(sessoes, null)).toBe(0);
  });
  it('a seguinte à última concluída, circular', () => {
    expect(proximaSessao(sessoes, 'push')).toBe(1);
    expect(proximaSessao(sessoes, 'pernas')).toBe(0);
  });
  it('sessão que não existe mais no plano: a primeira', () => {
    expect(proximaSessao(sessoes, 'outra')).toBe(0);
  });
  it('plano sem sessões', () => {
    expect(proximaSessao([], null)).toBe(-1);
  });
});

describe('duração estimada (9.3)', () => {
  it('item simples: séries × (execução + descanso máximo)', () => {
    // 3 × (45 + 180) = 675 s ≈ 11 min → 10
    expect(
      duracaoEstimada([
        {
          series: 3,
          reps: { min: 6, max: 10 },
          porTempo: false,
          descanso: { min: 120, max: 180 },
          grupo: null,
        },
      ]),
    ).toBe(10);
  });

  it('bi-set: descanso só por rodada; por tempo usa a duração máxima', () => {
    const ss = [
      { series: 4, reps: { min: 12, max: 20 }, porTempo: false, descanso: { min: 60, max: 90 }, grupo: 1 },
      { series: 3, reps: { min: 10, max: 15 }, porTempo: false, descanso: { min: 60, max: 90 }, grupo: 1 },
    ];
    // 7 × 45 + 4 × 90 = 675 s
    expect(duracaoEstimada(ss)).toBe(10);
    const prancha = { series: 3, reps: { min: 30, max: 45 }, porTempo: true, descanso: null, grupo: null };
    expect(duracaoEstimada([prancha])).toBe(5);
    expect(TEMPO_SERIE_S).toBe(45);
  });

  it('Push do Raul na semana 1 ≈ 50 min', () => {
    const push = plano.sessoes[0]!;
    const itens = push.itens.map((ex) => ({ ...ex, series: prescricao(plano, ex, 1).series }));
    // 19 × 45 + 2 × 3 × 180 + 3 × 120 + 4 × 90 (SS1, por rodada) + 3 × 90 = 2925 s ≈ 49 min → 50
    expect(duracaoEstimada(itens)).toBe(50);
  });
});

describe('bi-set: auxiliares', () => {
  const base = {
    itens: [
      { grupo: null, descanso: 60 },
      { grupo: 1, descanso: 90 },
      { grupo: 1, descanso: 90 },
    ],
    alvo: [2, 4, 3],
    feitas: [0, 0, 0],
    extras: [0, 0, 0],
    pulados: [] as number[],
  };

  it('membros do grupo e item avulso', () => {
    expect(membros(base, 1)).toEqual([1, 2]);
    expect(membros(base, 0)).toEqual([0]);
  });

  it('rodada, seguinte e início da rodada', () => {
    const e = { ...base, feitas: [0, 1, 0] };
    expect(rodada(e, 1)).toEqual({ atual: 1, total: 4 });
    expect(seguinteNaRodada(e, 1)).toBe(2);
    expect(seguinteNaRodada(e, 0)).toBeNull();
    const fim = { ...base, feitas: [0, 1, 1] };
    expect(seguinteNaRodada(fim, 2)).toBeNull();
    expect(inicioDaRodada(fim, 2)).toBe(1);
    const acabou = { ...base, feitas: [0, 4, 3] };
    expect(inicioDaRodada(acabou, 1)).toBeNull();
    expect(rodada(acabou, 1)).toEqual({ atual: 4, total: 4 });
    expect(proximoItem(acabou, 1)).toBe(0);
    expect(proximoItem({ ...acabou, feitas: [2, 4, 3] }, 1)).toBeNull();
  });
});
