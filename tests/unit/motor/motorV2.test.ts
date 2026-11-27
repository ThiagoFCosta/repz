import { describe, expect, it } from 'vitest';
import { mudancas, PARAMETROS_V1, validarParametros } from '../../../src/dominio/motor/parametros';
import { criarRegistro, fecharRegistro } from '../../../src/dominio/motor/snapshot';
import { sugerirV2, type EntradaMotorV2 } from '../../../src/dominio/motor/sugerir';
import { sugerir, type PrescricaoMotor, type TreinoHistorico } from '../../../src/dominio/progressao/motor';
import type { Prontidao } from '../../../src/dominio/prontidao/prontidao';

function S(
  data: string,
  kg: number,
  reps: number[],
  rir: (number | null)[],
  prontidaoBaixa = false,
): TreinoHistorico {
  const t: TreinoHistorico = { data, series: reps.map((r, i) => ({ kg, reps: r, rir: rir[i] ?? null })) };
  if (prontidaoBaixa) t.prontidaoBaixa = true;
  return t;
}
const supino: PrescricaoMotor = { reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 } };
const desenv: PrescricaoMotor = { reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 } };
const HOJE = '2026-11-07';
const baixa: Prontidao = { baixa: true, motivos: ['Dormiu 5 h, menos de 6 h'], sono: 5, mediaSono: 7.5 };
const normal: Prontidao = { baixa: false, motivos: [], sono: 8, mediaSono: 7.5 };
function v2(historico: TreinoHistorico[], presc = supino, extra: Partial<EntradaMotorV2> = {}) {
  return sugerirV2({ historico, presc, hoje: HOJE, nome: 'Supino reto barra', ...extra });
}

// Os cenários da v1 com o motor v2 sem check-in: mesma ação, carga, motivo e alertas (BRIEFING-v2 8.1)
const bons = [
  S('2026-10-20', 80, [10, 9, 9], [1, 1, 1]),
  S('2026-10-23', 80, [10, 10, 9], [1, 1, 1]),
  S('2026-10-27', 80, [10, 10, 10], [1, 1, 1]),
];
const CENARIOS: [string, TreinoHistorico[], PrescricaoMotor, string][] = [
  ['topo', [S('2026-11-04', 80, [10, 10, 10], [2, 1, 1])], supino, 'Supino reto barra'],
  ['halteres', [S('2026-11-04', 26, [10, 10, 10], [2, 2, 1])], supino, 'Supino inclinado com halteres'],
  ['folga', [S('2026-11-04', 80, [13, 12, 12], [3, 2, 2])], supino, 'Supino reto barra'],
  ['dentro', [S('2026-11-04', 82.5, [8, 7, 7], [2, 1, 1])], supino, 'Supino reto barra'],
  ['pesado', [S('2026-11-04', 85, [5, 4, 4], [1, 0, 0])], supino, 'Supino reto barra'],
  ['halteres abaixo', [S('2026-11-04', 22, [7, 6, 5], [1, 1, 1])], desenv, 'Desenvolvimento com halteres'],
  [
    'queda 2x',
    [...bons, S('2026-10-31', 80, [7, 7, 6], [1, 1, 1]), S('2026-11-04', 80, [7, 6, 6], [1, 1, 1])],
    supino,
    'Supino reto barra',
  ],
  ['pausa', [S('2026-10-13', 80, [8, 8, 8], [2, 2, 2])], supino, 'Supino reto barra'],
  [
    'deload',
    [S('2026-11-04', 80, [8, 8, 8], [2, 2, 2])],
    { ...supino, fase: { deload: true } },
    'Supino reto barra',
  ],
  ['sem histórico', [], supino, 'Supino reto barra'],
];

describe('motor v2 sem check-in = motor v1', () => {
  for (const [nome, h, presc, ex] of CENARIOS)
    it(nome, () => {
      const a = sugerir(h, presc, { hoje: HOJE, nome: ex });
      const { regra, alertasRegras, versaoMotor, versaoParametros, ...b } = sugerirV2({
        historico: h,
        presc,
        hoje: HOJE,
        nome: ex,
      });
      expect(b).toEqual(a);
      expect(regra).toBeTruthy();
      expect(alertasRegras.includes('P2')).toBe(false);
      expect(versaoMotor).toBe('2.0.0');
      expect(versaoParametros).toBe(1);
    });

  it('a regra que decidiu vem junto', () => {
    expect(v2([S('2026-11-04', 80, [10, 10, 10], [2, 1, 1])]).regra).toBe('5');
    expect(v2([S('2026-11-04', 82.5, [8, 7, 7], [2, 1, 1])]).regra).toBe('7');
    expect(v2([]).regra).toBe('0');
    expect(v2([S('2026-10-13', 80, [8, 8, 8], [2, 2, 2])]).regra).toBe('1');
  });
});

describe('P1: prontidão baixa hoje não deixa aumentar', () => {
  it('↑ vira = na carga anterior, com o motivo', () => {
    const r = v2([S('2026-11-04', 80, [10, 10, 10], [2, 1, 1])], supino, { prontidaoHoje: baixa });
    expect(r).toMatchObject({
      acao: 'manter',
      carga: 80,
      variacao: 0,
      regra: 'P1',
      repsSugeridas: [10, 10, 10],
    });
    expect(r.motivo).toBe('Prontidão baixa hoje: mantenha 80 kg. O aumento fica para um dia de sono normal.');
  });
  it('reduções continuam valendo', () => {
    expect(v2([S('2026-11-04', 85, [5, 4, 4], [1, 0, 0])], supino, { prontidaoHoje: baixa })).toMatchObject({
      acao: 'reduzir',
      regra: '4',
    });
  });
  it('com prontidão normal, aumenta como a v1', () => {
    expect(
      v2([S('2026-11-04', 80, [10, 10, 10], [2, 1, 1])], supino, { prontidaoHoje: normal }),
    ).toMatchObject({
      acao: 'aumentar',
      carga: 82.5,
      regra: '5',
    });
  });
});

describe('P2: queda em treinos com prontidão baixa não conta para a regra 3', () => {
  it('2 quedas, uma com sono ruim: não reduz, avisa', () => {
    const r = v2([
      ...bons,
      S('2026-10-31', 80, [7, 7, 6], [1, 1, 1], true),
      S('2026-11-03', 80, [7, 6, 6], [1, 1, 1]),
    ]);
    expect(r.acao).toBe('manter');
    expect(r.alertasRegras).toContain('P2');
    expect(r.alertas.some((x) => x.startsWith('Queda explicada pelo sono'))).toBe(true);
  });
  it('2 quedas com sono normal: reduz como a v1 (regra 3)', () => {
    expect(
      v2([...bons, S('2026-10-31', 80, [7, 7, 6], [1, 1, 1]), S('2026-11-03', 80, [7, 6, 6], [1, 1, 1])]),
    ).toMatchObject({ acao: 'reduzir', carga: 75, regra: '3' });
  });
});

describe('P3: abaixo da faixa num dia de prontidão baixa', () => {
  it('vira manter, com nota', () => {
    const r = v2([S('2026-11-03', 85, [5, 4, 4], [1, 0, 0], true)]);
    expect(r).toMatchObject({ acao: 'manter', carga: 85, regra: 'P3' });
    expect(r.motivo).toMatch(/num dia de prontidão baixa: mantenha 85 kg/);
  });
  it('se repetir num dia normal, reduz (regra 4)', () => {
    expect(
      v2([S('2026-10-31', 85, [5, 4, 4], [1, 0, 0], true), S('2026-11-03', 85, [5, 5, 4], [1, 0, 0])]),
    ).toMatchObject({ acao: 'reduzir', regra: '4' });
  });
});

describe('P4: menos de 48 h desde a última vez', () => {
  it('só avisa, não muda a carga', () => {
    const ontem = v2([S('2026-11-06', 80, [10, 10, 10], [2, 1, 1])]);
    expect(ontem).toMatchObject({ acao: 'aumentar', carga: 82.5, regra: '5' });
    expect(ontem.alertasRegras).toEqual(['P4']);
    expect(ontem.alertas).toContain('Pouco descanso desde a última vez neste exercício.');
    expect(v2([S('2026-11-05', 80, [10, 10, 10], [2, 1, 1])]).alertasRegras).toEqual([]);
  });
});

describe('parâmetros versionados (BRIEFING-v2 8.3)', () => {
  it('a versão 1 é válida e igual à v1 nos parâmetros antigos', () => {
    expect(validarParametros({ ...PARAMETROS_V1 })).toEqual([]);
    expect(PARAMETROS_V1).toMatchObject({
      pausaDias: 21,
      toleranciaRir: 1,
      aumentoMax: 0.05,
      sonoMinimoH: 6,
      descansoMinimoH: 48,
    });
  });
  it('limites rígidos', () => {
    expect(
      validarParametros({ ...PARAMETROS_V1, toleranciaRir: 3, pausaDias: 10, aumentoMax: 0.2 }).map(
        (e) => e.parametro,
      ),
    ).toEqual(['pausaDias', 'aumentoMax', 'toleranciaRir']);
    expect(validarParametros({ ...PARAMETROS_V1, novo: 1 })).toEqual([
      { parametro: 'novo', msg: 'parâmetro desconhecido' },
    ]);
    expect(validarParametros({ ...PARAMETROS_V1, aumentoMin: 0.05, aumentoMax: 0.03 })).toEqual([
      { parametro: 'aumentoMin', msg: 'maior que aumentoMax' },
    ]);
  });
  it('parâmetros diferentes mudam a sugestão', () => {
    const r = v2([S('2026-10-15', 80, [8, 8, 8], [2, 2, 2])], supino, {
      parametros: { ...PARAMETROS_V1, pausaDias: 28 },
      versaoParametros: 2,
    });
    expect(r).toMatchObject({ acao: 'manter', regra: '7', versaoParametros: 2 });
    expect(mudancas(PARAMETROS_V1, { ...PARAMETROS_V1, pausaDias: 28 })).toEqual(['pausaDias']);
  });
});

describe('log da sugestão (BRIEFING-v2 8.2)', () => {
  const sugestao = v2([S('2026-11-03', 80, [10, 10, 10], [2, 1, 1])]);
  const reg = criarRegistro({
    id: 'g1',
    treinoId: 't1',
    exercicioPrescritoId: 'e1',
    chave: 'supino',
    variante: 'Supino',
    sugestao,
    historico: [S('2026-11-03', 80, [10, 10, 10], [2, 1, 1])],
    presc: supino,
    incremento: 2.5,
    horasDesdeUltima: 96,
    prontidao: normal,
    criadoEm: '2026-11-07T19:00:00-03:00',
  });
  const ser = (kg: number, reps: number[], rir: number[]) =>
    reps.map((r, i) => ({ kg, reps: r, rir: rir[i]! }));

  it('snapshot completo', () => {
    expect(reg).toMatchObject({
      versaoMotor: '2.0.0',
      versaoParametros: 1,
      regra: '5',
      acao: 'aumentar',
      carga: 82.5,
      prontidao: normal,
      desfecho: null,
    });
    expect(reg.entradas).toMatchObject({
      incremento: 2.5,
      horasDesdeUltima: 96,
      historico: [{ data: '2026-11-03' }],
    });
  });
  it('aceita, editada, ignorada e o resultado contra a faixa', () => {
    expect(fecharRegistro(reg, ser(82.5, [8, 7, 7], [2, 1, 1]))).toEqual({
      cargaUsada: 82.5,
      desfecho: 'aceita',
      resultado: { reps: [8, 7, 7], rir: [2, 1, 1], naFaixa: true, abaixoDaFaixa: false, rirNoAlvo: true },
    });
    expect(fecharRegistro(reg, ser(80, [5, 5, 4], [0, 0, 0]))).toMatchObject({
      desfecho: 'editada',
      cargaUsada: 80,
      resultado: { abaixoDaFaixa: true, naFaixa: false },
    });
    expect(fecharRegistro(reg, [])).toEqual({ cargaUsada: null, desfecho: 'ignorada', resultado: null });
  });
});
