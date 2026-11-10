import { describe, expect, it } from 'vitest';
import {
  avaliar,
  metaSemanal,
  prescricaoDoRegistro,
  progressoDaSemana,
  tiposDoPlano,
} from '../../src/dominio/cardio';
import { inicioDaSemana } from '../../src/dominio/datas';
import type { CardioPrescrito } from '../../src/dominio/tipos';

// As duas linhas CARDIO do plano do Raul
const z2: CardioPrescrito = {
  tipos: ['Bicicleta', 'Remo'],
  frequencia: '2x',
  minutos: { min: 30, max: 40 },
  fc: { min: 115, max: 135 },
  intensidade: 'z2',
};
const leve: CardioPrescrito = {
  tipos: ['Bicicleta'],
  frequencia: 'opcional',
  minutos: { min: 10, max: 15 },
  fc: null,
  intensidade: 'leve',
};
const raul = [z2, leve];
const reg = (data: string, tipo: string, minutos: number, fcMedia: number | null = null) => ({
  data,
  tipo,
  minutos,
  fcMedia,
});

describe('meta semanal pela frequência do plano', () => {
  it.each([
    ['2x', 2],
    ['3 x', 3],
    ['3X', 3],
    ['diario', 7],
    ['Diário', 7],
    ['todo dia', 7],
    ['10x', 7],
    ['opcional', null],
    ['0x', null],
    ['', null],
  ])('%s → %s', (f, meta) => expect(metaSemanal(f)).toBe(meta));
});

describe('semana de segunda a domingo', () => {
  it('segunda é o início; domingo pertence à semana que começou na segunda anterior', () => {
    expect(inicioDaSemana('2026-11-09')).toBe('2026-11-09'); // segunda
    expect(inicioDaSemana('2026-11-12')).toBe('2026-11-09');
    expect(inicioDaSemana('2026-11-15')).toBe('2026-11-09'); // domingo
    expect(inicioDaSemana('2026-11-16')).toBe('2026-11-16');
    expect(inicioDaSemana('2027-01-01')).toBe('2026-12-28'); // virada do ano
  });
});

describe('tipos e linha do plano de cada registro', () => {
  it('tipos sem repetição, na ordem do plano (sem acento/maiúscula contando como igual)', () => {
    expect(tiposDoPlano(raul)).toEqual(['Bicicleta', 'Remo']);
    expect(tiposDoPlano([...raul, { ...leve, tipos: ['bicicleta', 'Caminhada'] }])).toEqual([
      'Bicicleta',
      'Remo',
      'Caminhada',
    ]);
    expect(tiposDoPlano([])).toEqual([]);
  });

  it('do mesmo tipo, a de duração mais próxima; tipo fora do plano compara com todas', () => {
    expect(prescricaoDoRegistro(raul, { tipo: 'Bicicleta', minutos: 35 })).toBe(z2);
    expect(prescricaoDoRegistro(raul, { tipo: 'bicicleta', minutos: 12 })).toBe(leve);
    expect(prescricaoDoRegistro(raul, { tipo: 'Bicicleta', minutos: 22 })).toBe(leve); // 7 de 15, 8 de 30
    expect(prescricaoDoRegistro(raul, { tipo: 'Remo', minutos: 12 })).toBe(z2); // só a z2 tem remo
    expect(prescricaoDoRegistro(raul, { tipo: 'Corrida', minutos: 50 })).toBe(z2);
    expect(prescricaoDoRegistro([], { tipo: 'Corrida', minutos: 50 })).toBeNull();
  });

  it('sem duração ainda (tela vazia): a primeira linha com meta; só opcionais, a primeira', () => {
    expect(prescricaoDoRegistro([leve, z2], { tipo: 'Bicicleta', minutos: null })).toBe(z2);
    expect(prescricaoDoRegistro([leve], { tipo: 'Corrida', minutos: null })).toBe(leve);
    expect(prescricaoDoRegistro([], { tipo: 'Corrida', minutos: null })).toBeNull();
  });
});

describe('comparação com a meta (9.7)', () => {
  it('duração e FC: abaixo, dentro e acima (limites inclusos)', () => {
    expect(avaliar({ minutos: 30, fcMedia: 115 }, z2)).toEqual({ duracao: 'dentro', fc: 'dentro' });
    expect(avaliar({ minutos: 40, fcMedia: 135 }, z2)).toEqual({ duracao: 'dentro', fc: 'dentro' });
    expect(avaliar({ minutos: 25, fcMedia: 140 }, z2)).toEqual({ duracao: 'abaixo', fc: 'acima' });
    expect(avaliar({ minutos: 45, fcMedia: 110 }, z2)).toEqual({ duracao: 'acima', fc: 'abaixo' });
  });

  it('sem FC registrada ou sem faixa no plano, a FC não é comparada', () => {
    expect(avaliar({ minutos: 35, fcMedia: null }, z2).fc).toBeNull();
    expect(avaliar({ minutos: 12, fcMedia: 120 }, leve)).toEqual({ duracao: 'dentro', fc: null });
  });
});

describe('X de Y nesta semana (9.3)', () => {
  const registros = [
    reg('2026-11-08', 'Bicicleta', 35), // domingo da semana anterior
    reg('2026-11-09', 'Bicicleta', 35), // conta (2x)
    reg('2026-11-10', 'Bicicleta', 12), // opcional: não conta
    reg('2026-11-12', 'Remo', 25), // abaixo da duração, mas é cardio da meta: conta
    reg('2026-11-15', 'Corrida', 30), // fora do plano, mais perto da linha 2x: conta
    reg('2026-11-16', 'Remo', 35), // semana seguinte
  ];

  it('conta só a semana de segunda a domingo e só os registros da linha com frequência', () => {
    expect(progressoDaSemana(raul, registros, '2026-11-12')).toEqual({
      feitos: 3,
      meta: 2,
      total: 4,
      de: '2026-11-09',
      ate: '2026-11-15',
    });
    expect(progressoDaSemana(raul, registros, '2026-11-15').feitos).toBe(3); // domingo
    expect(progressoDaSemana(raul, registros, '2026-11-16')).toMatchObject({ feitos: 1, total: 1 });
  });

  it('metas somadas (no máximo 7); só opcional ou sem plano: sem meta', () => {
    expect(progressoDaSemana([z2, { ...z2, frequencia: '3x' }], [], '2026-11-12').meta).toBe(5);
    expect(progressoDaSemana([z2, { ...z2, frequencia: 'diario' }], [], '2026-11-12').meta).toBe(7);
    expect(progressoDaSemana([leve], registros, '2026-11-12')).toMatchObject({
      feitos: 0,
      meta: null,
      total: 4,
    });
    expect(progressoDaSemana([], registros, '2026-11-12')).toMatchObject({ feitos: 0, meta: null, total: 4 });
  });
});
