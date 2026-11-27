import { describe, expect, it } from 'vitest';
import {
  avaliarProntidao,
  mediaDeSono,
  sonoSugerido,
  type Checkin,
} from '../../../src/dominio/prontidao/prontidao';

const c = (
  data: string,
  sonoHoras: number | null,
  disposicao: number | null = null,
  pulado = false,
): Checkin => ({
  data,
  sonoHoras,
  disposicao,
  pulado,
});
const HOJE = '2026-11-27';
// 14 noites de 7,5 h antes de hoje
const historico = Array.from({ length: 14 }, (_, i) => c(`2026-11-${String(26 - i).padStart(2, '0')}`, 7.5));

describe('prontidão (BRIEFING-v2 7.3)', () => {
  it('sono abaixo de 6 h é prontidão baixa; exatamente 6 h não é', () => {
    expect(avaliarProntidao(c(HOJE, 5.5), historico, HOJE)).toMatchObject({
      baixa: true,
      motivos: ['Dormiu 5,5 h, menos de 6 h'],
    });
    expect(avaliarProntidao(c(HOJE, 6), historico, HOJE).baixa).toBe(false);
  });

  it('abaixo da média de 14 dias menos 1,5 h é baixa, mesmo acima de 6 h', () => {
    expect(avaliarProntidao(c(HOJE, 5.9 + 0.1), [], HOJE).baixa).toBe(false);
    expect(avaliarProntidao(c(HOJE, 6.5), historico, HOJE)).toMatchObject({
      baixa: false,
      mediaSono: 7.5,
    });
    const alto = historico.map((x) => ({ ...x, sonoHoras: 8.5 }));
    expect(avaliarProntidao(c(HOJE, 6.5), alto, HOJE).motivos).toEqual([
      'Dormiu 6,5 h, abaixo da sua média de 8,5 h',
    ]);
  });

  it('disposição até 2 é baixa; disposição ausente não conta', () => {
    expect(avaliarProntidao(c(HOJE, 8, 2), historico, HOJE).motivos).toEqual(['Disposição 2 de 5']);
    expect(avaliarProntidao(c(HOJE, 8, 3), historico, HOJE).baixa).toBe(false);
    expect(avaliarProntidao(c(HOJE, 8, null), historico, HOJE).baixa).toBe(false);
  });

  it('sem check-in ou check-in pulado: prontidão normal (motor igual ao da v1)', () => {
    expect(avaliarProntidao(null, historico, HOJE)).toMatchObject({ baixa: false, sono: null });
    expect(avaliarProntidao(c(HOJE, 4, 1, true), historico, HOJE).baixa).toBe(false);
  });

  it('média ignora hoje, noites puladas e as de mais de 14 dias', () => {
    const lista = [
      c(HOJE, 3),
      c('2026-11-26', 8),
      c('2026-11-25', null, null, true),
      c('2026-11-13', 6),
      c('2026-11-12', 1),
    ];
    expect(mediaDeSono(lista, HOJE)).toBe(7);
    expect(mediaDeSono([], HOJE)).toBeNull();
  });

  it('stepper começa na noite mais recente, senão na média, senão em 7 h, em passos de 0,5', () => {
    expect(sonoSugerido([c('2026-11-20', 6.2), c('2026-11-26', 7.3)], HOJE)).toBe(7.5);
    expect(sonoSugerido([], HOJE)).toBe(7);
  });
});
