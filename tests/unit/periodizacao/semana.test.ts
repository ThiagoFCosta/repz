import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/dominio/formato/parser';
import { rotuloSemana, semanaDoBloco, type PlanoComBloco } from '../../../src/dominio/periodizacao/semana';

const raul = parse(
  fs.readFileSync(new URL('../../fixtures/raul.treino.txt', import.meta.url), 'utf8'),
).plano!;
// Bloco começa em 10/11/2026 (terça)
const plano = (ajusteSemana = 0, inicioBloco: string | null = '2026-11-10'): PlanoComBloco => ({
  ...raul,
  inicioBloco,
  ajusteSemana,
});

describe('semanaDoBloco (6.1)', () => {
  it('primeiro dia é a semana 1', () => {
    expect(semanaDoBloco(plano(), '2026-11-10')).toMatchObject({
      semana: 1,
      numeroFase: 1,
      concluido: false,
    });
  });

  it('dia 6 ainda é a semana 1; dia 7 é a semana 2', () => {
    expect(semanaDoBloco(plano(), '2026-11-16').semana).toBe(1);
    expect(semanaDoBloco(plano(), '2026-11-17').semana).toBe(2);
  });

  it('semana 6 cai na fase 2', () => {
    const s = semanaDoBloco(plano(), '2026-12-15');
    expect(s).toMatchObject({ semana: 6, semanaPrescricao: 6, numeroFase: 2, totalSemanas: 12 });
  });

  it('antes do início: semana 1 e marcado', () => {
    expect(semanaDoBloco(plano(), '2026-11-05')).toMatchObject({ semana: 1, antesDoInicio: true });
  });

  it('ajuste manual desloca a semana', () => {
    expect(semanaDoBloco(plano(1), '2026-11-10').semana).toBe(2);
    expect(semanaDoBloco(plano(-1), '2026-11-24').semana).toBe(2);
    expect(semanaDoBloco(plano(-3), '2026-11-24').semana).toBe(1);
  });

  it('semana 12 é o deload', () => {
    const s = semanaDoBloco(plano(), '2027-01-26');
    expect(s.semana).toBe(12);
    expect(s.fase?.deload).toBe(true);
    expect(s.concluido).toBe(false);
  });

  it('D1: depois da última semana, bloco concluído e prescrição pela última fase sem deload', () => {
    const s = semanaDoBloco(plano(), '2027-02-02'); // semana 13
    expect(s).toMatchObject({ semana: 12, semanaPrescricao: 11, numeroFase: 3, concluido: true });
    expect(s.fase?.deload).toBe(false);
  });

  it('sem data de início ou sem BLOCO: sem semana', () => {
    expect(semanaDoBloco(plano(0, null), '2026-11-10')).toMatchObject({ semana: null, totalSemanas: 12 });
    expect(semanaDoBloco({ ...plano(), bloco: null }, '2026-11-10')).toMatchObject({
      semana: null,
      totalSemanas: null,
      fase: null,
    });
  });
});

describe('rotuloSemana (pílula do Início)', () => {
  const rotulo = (hoje: string, p = plano()) => rotuloSemana(p, semanaDoBloco(p, hoje));

  it('semana normal', () => {
    expect(rotulo('2026-11-10')).toBe('Semana 1 de 12 · Fase 1 · RIR 2-3');
    expect(rotulo('2026-12-15')).toBe('Semana 6 de 12 · Fase 2 · RIR 1-2');
  });

  it('deload', () => {
    expect(rotulo('2027-01-26')).toBe('Semana 12 de 12 · Deload');
  });

  it('bloco concluído', () => {
    expect(rotulo('2027-02-02')).toBe('Bloco concluído');
  });

  it('sem bloco não mostra pílula', () => {
    expect(rotulo('2026-11-10', { ...plano(), bloco: null })).toBeNull();
  });

  it('semana sem fase usa o RIR da PROGRESSAO', () => {
    const p = { ...plano(), bloco: { semanas: 4, fases: [] } };
    expect(rotulo('2026-11-10', p)).toBe('Semana 1 de 4 · RIR 1-3');
  });
});
