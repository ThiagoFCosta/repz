import { describe, expect, it } from 'vitest';
import {
  alertaPerdaRapida,
  mediaMovel7,
  porDia,
  precisaMedir,
  resumoFita,
  serieDoPeso,
  tendencia,
  tendenciaBio,
  type Pesagem,
} from '../../src/dominio/corpo/corpo';
import { somarDias } from '../../src/dominio/datas';

const HOJE = '2026-11-27';
const p = (
  data: string,
  kg: number,
  condicao: Pesagem['condicao'] = 'jejum',
  hora: string | null = '07:00',
): Pesagem => ({
  data,
  hora,
  kg,
  condicao,
});
const dia = (n: number) => somarDias(HOJE, n);

describe('peso (BRIEFING-v2 9)', () => {
  it('uma pesagem por dia: jejum primeiro, depois a mais cedo', () => {
    const r = porDia([
      p(HOJE, 85, 'outra', '06:00'),
      p(HOJE, 84, 'jejum', '08:00'),
      p(dia(-1), 84.5, 'outra', '21:00'),
      p(dia(-1), 84.7, 'outra', '07:00'),
    ]);
    expect(r.map((x) => x.kg)).toEqual([84.7, 84]);
  });

  it('média móvel de 7 dias corridos, com 1 casa', () => {
    expect(mediaMovel7([p(dia(-7), 99), p(dia(-6), 80), p(dia(-3), 81), p(HOJE, 82.5)], HOJE)).toBe(81.2); // (80+81+82,5)/3
    expect(mediaMovel7([p(dia(-8), 80)], HOJE)).toBeNull();
  });

  it('tendência por regressão linear: −0,1 kg/dia → −0,7 kg/semana', () => {
    const ps = Array.from({ length: 8 }, (_, i) => p(dia(i - 7), 84 - 0.1 * i));
    // média 83,65 → −0,7 / 83,65 = −0,84 %/semana; reta em 27 dias = −2,7 kg
    expect(tendencia(ps, HOJE)).toEqual({ kgSemana: -0.7, pctSemana: -0.84, kgPeriodo: -2.7, pesagens: 8 });
  });

  it('dados insuficientes: menos de 6 pesagens ou menos de 7 dias de intervalo', () => {
    expect(
      tendencia(
        Array.from({ length: 5 }, (_, i) => p(dia(-i * 3), 80)),
        HOJE,
      ),
    ).toBeNull();
    expect(
      tendencia(
        Array.from({ length: 6 }, (_, i) => p(dia(-i), 80)),
        HOJE,
      ),
    ).toBeNull();
    expect(
      tendencia(
        Array.from({ length: 6 }, (_, i) => p(dia(-i * 2), 80)),
        HOJE,
      )?.kgSemana,
    ).toBe(0);
  });

  it('P5: perda acima de 0,7%/semana nas 2 últimas semanas gera alerta; numa só, não', () => {
    const semanas = (a: number, b: number, c: number) => [
      ...[-20, -17, -14].map((d) => p(dia(d), a)),
      ...[-13, -10, -7].map((d) => p(dia(d), b)),
      ...[-6, -3, 0].map((d) => p(dia(d), c)),
    ];
    // 90 → 89 (1,1%) → 88 (1,1%)
    expect(alertaPerdaRapida(semanas(90, 89, 88), HOJE)).toMatch(
      /^Perda de 1,1% e 1,1% do peso nas 2 últimas semanas/,
    );
    // 90 → 89,5 (0,6%) → 88,5 (1,1%): só uma semana rápida
    expect(alertaPerdaRapida(semanas(90, 89.5, 88.5), HOJE)).toBeNull();
    expect(alertaPerdaRapida([p(HOJE, 80)], HOJE)).toBeNull();
  });

  it('série do gráfico com a pesagem do dia e a média', () => {
    const s = serieDoPeso([p(dia(-1), 80), p(HOJE, 82)], HOJE, 3);
    expect(s).toEqual([
      { data: dia(-2), kg: null, media: null },
      { data: dia(-1), kg: 80, media: 80 },
      { data: HOJE, kg: 82, media: 81 },
    ]);
  });
});

describe('bioimpedância e fita', () => {
  it('bioimpedância como tendência: média das 3 últimas contra as 3 anteriores', () => {
    const bio = [25, 25, 24.5, 24, 24, 23.5].map((g, i) => ({
      data: dia(i - 6),
      gorduraPct: g,
      massaGordaKg: null,
      musculoEsqKg: null,
      aguaPct: null,
    }));
    expect(tendenciaBio(bio, 'gorduraPct')).toEqual({ atual: 23.5, variacao: -1 });
    expect(tendenciaBio(bio, 'musculoEsqKg')).toBeNull();
  });

  it('última medida de cada local com a variação, na ordem padrão', () => {
    const r = resumoFita([
      { data: dia(-14), local: 'Braço', cm: 36.1 },
      { data: dia(-14), local: 'Cintura', cm: 91 },
      { data: HOJE, local: 'Cintura', cm: 89.5 },
      { data: HOJE, local: 'Panturrilha', cm: 38 },
    ]);
    expect(r).toEqual([
      { local: 'Cintura', cm: 89.5, data: HOJE, variacao: -1.5 },
      { local: 'Braço', cm: 36.1, data: dia(-14), variacao: null },
      { local: 'Panturrilha', cm: 38, data: HOJE, variacao: null },
    ]);
  });

  it('lembrete de medidas: nunca mediu, ou a última há 21 dias ou mais', () => {
    expect(precisaMedir([], HOJE)).toBe(true);
    expect(precisaMedir([{ data: dia(-20), local: 'Cintura', cm: 90 }], HOJE)).toBe(false);
    expect(precisaMedir([{ data: dia(-21), local: 'Cintura', cm: 90 }], HOJE)).toBe(true);
    expect(precisaMedir([{ data: dia(-15), local: 'Cintura', cm: 90 }], HOJE, 14)).toBe(true);
  });
});
