import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/dominio/formato/parser';
import { faseDaSemana, prescricao } from '../../../src/dominio/periodizacao/prescricao';

const plano = parse(
  fs.readFileSync(new URL('../../fixtures/raul.treino.txt', import.meta.url), 'utf8'),
).plano!;
const ex = (sessao: number, item: number) => plano.sessoes[sessao]!.itens[item]!;
const supinoIncl = ex(0, 0);
const elevacao = ex(0, 3); // SS1, iso, 4 séries
const stiff = ex(2, 1); // rir 3 fixo
const resumo = (e: typeof supinoIncl, semana: number | null, foco?: boolean) => {
  const p = prescricao(plano, e, semana, foco);
  return [p.series, p.rir.min, p.rir.max];
};

// Valores verificados no BRIEFING 6.2 e em referencia/teste/rodar.mjs
describe('prescrição do plano do Raul', () => {
  it('semana 1: RIR 2-3 para todos (Stiff mantém RIR 3)', () => {
    expect(resumo(supinoIncl, 1)).toEqual([3, 2, 3]);
    expect(resumo(elevacao, 1)).toEqual([4, 2, 3]);
    expect(resumo(stiff, 1)).toEqual([3, 3, 3]);
  });

  it('semana 6: RIR 1-2; "+1 série foco" só com foco ligado', () => {
    expect(resumo(supinoIncl, 6)).toEqual([3, 1, 2]);
    expect(resumo(elevacao, 6)).toEqual([4, 1, 2]);
    expect(resumo(elevacao, 6, true)).toEqual([5, 1, 2]);
    expect(resumo(stiff, 6, true)).toEqual([4, 3, 3]);
  });

  it('semana 10: RIR 0-1 nos isoladores e 1-2 nos compostos', () => {
    expect(resumo(supinoIncl, 10)).toEqual([3, 1, 2]);
    expect(resumo(elevacao, 10)).toEqual([4, 0, 1]);
    expect(resumo(stiff, 10)).toEqual([3, 3, 3]);
  });

  it('semana 12 (deload): séries pela metade arredondando para cima, RIR da PROGRESSAO', () => {
    expect(resumo(supinoIncl, 12)).toEqual([2, 1, 3]);
    expect(resumo(elevacao, 12)).toEqual([2, 1, 3]);
    expect(resumo(stiff, 12)).toEqual([2, 3, 3]);
    expect(prescricao(plano, supinoIncl, 12).fase?.deload).toBe(true);
  });

  it('reps, descanso e porTempo vêm do exercício', () => {
    const p = prescricao(plano, supinoIncl, 6);
    expect(p).toMatchObject({ reps: { min: 6, max: 10 }, descanso: { min: 120, max: 180 }, porTempo: false });
  });

  it('foco desligado pelo usuário vence o foco do plano', () => {
    const comFoco = { ...supinoIncl, foco: true };
    expect(resumo(comFoco, 6)).toEqual([4, 1, 2]);
    expect(resumo(comFoco, 6, false)).toEqual([3, 1, 2]);
  });
});

describe('sem fase', () => {
  it('plano sem BLOCO usa o RIR da PROGRESSAO', () => {
    const semBloco = { ...plano, bloco: null };
    expect(faseDaSemana(semBloco, 3)).toBeNull();
    expect(prescricao(semBloco, supinoIncl, null)).toMatchObject({
      series: 3,
      rir: { min: 1, max: 3 },
      fase: null,
    });
  });

  it('semana fora de qualquer fase usa o RIR da PROGRESSAO', () => {
    expect(prescricao(plano, supinoIncl, 13)).toMatchObject({
      series: 3,
      rir: { min: 1, max: 3 },
      fase: null,
    });
  });

  it('volume mínimo de 1 série', () => {
    const p = {
      ...plano,
      bloco: {
        semanas: 1,
        fases: [{ de: 1, ate: 1, rir: null, rirIso: null, deload: true, volume: 0.1, series: null }],
      },
    };
    expect(prescricao(p, { ...supinoIncl, series: 2 }, 1).series).toBe(1);
  });

  it('fase com "series +1 iso" e "series +1 todos"', () => {
    const fase = (alvo: 'iso' | 'todos') => ({
      ...plano,
      bloco: {
        semanas: 1,
        fases: [
          { de: 1, ate: 1, rir: null, rirIso: null, deload: false, volume: 1, series: { delta: 1, alvo } },
        ],
      },
    });
    expect(prescricao(fase('iso'), elevacao, 1).series).toBe(5);
    expect(prescricao(fase('iso'), supinoIncl, 1).series).toBe(3);
    expect(prescricao(fase('todos'), supinoIncl, 1).series).toBe(4);
  });
});
