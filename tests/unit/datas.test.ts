import { describe, expect, it } from 'vitest';
import {
  agoraISO,
  dataBR,
  diaDaSemana,
  diasEntre,
  ehDataValida,
  hojeLocal,
  proximaSegunda,
  somarDias,
} from '../../src/dominio/datas';
import { formatarDecimal, formatarKg, lerDecimal } from '../../src/dominio/numeros';

describe('datas', () => {
  it('hojeLocal usa a data local, não a UTC (23:30 em Brasília)', () => {
    // Date construído com componentes locais: no fuso do aparelho é sempre 23:30 do dia 9
    expect(hojeLocal(new Date(2026, 10, 9, 23, 30))).toBe('2026-11-09');
  });

  it('agoraISO tem offset local', () => {
    expect(agoraISO(new Date(2026, 10, 9, 19, 42, 10))).toMatch(/^2026-11-09T19:42:10[+-]\d{2}:\d{2}$/);
  });

  it('diasEntre e somarDias atravessam meses e anos', () => {
    expect(diasEntre('2026-10-13', '2026-11-07')).toBe(25);
    expect(diasEntre('2026-11-07', '2026-10-13')).toBe(-25);
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(somarDias('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('diaDaSemana', () => {
    expect(diaDaSemana('2026-11-09')).toBe(1); // segunda
    expect(diaDaSemana('2026-11-08')).toBe(0); // domingo
  });

  it('proximaSegunda é sempre depois de hoje', () => {
    expect(proximaSegunda('2026-11-08')).toBe('2026-11-09'); // domingo → amanhã
    expect(proximaSegunda('2026-11-09')).toBe('2026-11-16'); // segunda → a próxima
    expect(proximaSegunda('2026-11-10')).toBe('2026-11-16');
    expect(proximaSegunda('2026-11-14')).toBe('2026-11-16'); // sábado
  });

  it('ehDataValida', () => {
    expect(ehDataValida('2026-11-09')).toBe(true);
    expect(ehDataValida('2026-02-30')).toBe(false);
    expect(ehDataValida('09/11/2026')).toBe(false);
  });

  it('dataBR', () => {
    expect(dataBR('2026-11-10')).toBe('10/11/2026');
    expect(dataBR('2026-11-10', true)).toBe('10/11');
  });
});

describe('números com vírgula', () => {
  it('lerDecimal aceita vírgula e ponto', () => {
    expect(lerDecimal('82,5')).toBe(82.5);
    expect(lerDecimal('82.5')).toBe(82.5);
    expect(lerDecimal(' 80 ')).toBe(80);
    expect(lerDecimal('')).toBeNull();
    expect(lerDecimal('abc')).toBeNull();
    expect(lerDecimal('-2')).toBeNull();
  });

  it('formatarDecimal usa vírgula e esconde ruído', () => {
    expect(formatarDecimal(82.5)).toBe('82,5');
    expect(formatarDecimal(80)).toBe('80');
    expect(formatarDecimal(0.1 + 0.2)).toBe('0,3');
    expect(formatarKg(2.5)).toBe('2,5 kg');
  });
});
