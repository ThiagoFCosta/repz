// Periodização aplicada no treino (M4.3): semana do bloco → prescrição → motor, como no controlador.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hojeLocal } from '../../../src/dominio/datas';
import { parse } from '../../../src/dominio/formato/parser';
import { prescricao } from '../../../src/dominio/periodizacao/prescricao';
import { semanaDoBloco } from '../../../src/dominio/periodizacao/semana';
import { sugerir } from '../../../src/dominio/progressao/motor';

const raul = parse(
  fs.readFileSync(new URL('../../fixtures/raul.treino.txt', import.meta.url), 'utf8'),
).plano!;
const plano = { ...raul, inicioBloco: '2026-11-10', ajusteSemana: 0 };
const supinoIncl = raul.sessoes[0]!.itens[0]!; // 3 × 6-10
const elevacao = raul.sessoes[0]!.itens[3]!; // iso, 4 × 12-20

// O que o controlador faz ao iniciar um treino
function noTreino(ex: typeof supinoIncl, hoje: string, foco = ex.foco) {
  return prescricao(plano, ex, semanaDoBloco(plano, hoje).semanaPrescricao, foco);
}

const ultimo = (data: string) => [{ data, series: [10, 10, 10].map((reps) => ({ kg: 24, reps, rir: 2 })) }];

describe('periodização aplicada no treino', () => {
  it('séries e RIR alvo da semana', () => {
    expect(noTreino(supinoIncl, '2026-11-10')).toMatchObject({ series: 3, rir: { min: 2, max: 3 } });
    expect(noTreino(elevacao, '2027-01-12')).toMatchObject({ series: 4, rir: { min: 0, max: 1 } }); // sem. 10
  });

  it('o foco do usuário vale mais que o do plano (fase 5-8: +1 série foco)', () => {
    expect(noTreino(supinoIncl, '2026-12-15').series).toBe(3); // semana 6
    expect(noTreino(supinoIncl, '2026-12-15', true).series).toBe(4);
    expect(noTreino({ ...supinoIncl, foco: true }, '2026-12-15', false).series).toBe(3);
  });

  it('deload: séries pela metade e o motor mantém a carga, mesmo no topo da faixa', () => {
    const presc = noTreino(supinoIncl, '2027-01-26'); // semana 12
    expect(presc.series).toBe(2);
    const sug = sugerir(ultimo('2027-01-22'), presc, { hoje: '2027-01-26' });
    expect(sug).toMatchObject({ acao: 'manter', carga: 24 });
  });

  it('depois do bloco (D1): última fase sem deload, e a progressão volta a subir', () => {
    const presc = noTreino(supinoIncl, '2027-02-02'); // semana 13
    expect(presc).toMatchObject({ series: 3, rir: { min: 1, max: 2 } });
    expect(presc.fase?.deload).toBe(false);
    const sug = sugerir(ultimo('2027-01-29'), presc, { hoje: '2027-02-02', nome: supinoIncl.nome });
    expect(sug).toMatchObject({ acao: 'aumentar', carga: 26 });
  });

  it('hoje à noite: 23:30 de segunda ainda é a semana que começou na terça anterior', () => {
    // 16/11 (segunda) às 23:30: em UTC já seria terça 17/11, que abriria a semana 2
    const hoje = hojeLocal(new Date(2026, 10, 16, 23, 30));
    expect(hoje).toBe('2026-11-16');
    expect(semanaDoBloco(plano, hoje).semana).toBe(1);
    // e a pausa do motor conta pela mesma data local: 21 dias exatos → reduz
    const sug = sugerir(ultimo('2026-10-26'), noTreino(supinoIncl, hoje), { hoje });
    expect(sug.acao).toBe('reduzir');
  });
});
