import { describe, expect, it } from 'vitest';
import { sugerir } from '../../../src/dominio/progressao/motor';
import { preencher } from '../../../src/dominio/treino/preenchimento';
import { comTreinoAtual } from '../../../src/dominio/treino/resumo';

const supino = { reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 } };
const hoje = '2026-11-07';
const topo = [{ data: '2026-11-06', series: [10, 10, 10].map((reps) => ({ kg: 80, reps, rir: 2 })) }];
const dentro = [{ data: '2026-11-06', series: [9, 8, 7].map((reps) => ({ kg: 80, reps, rir: 2 })) }];

describe('pré-preenchimento (7.6)', () => {
  it('1ª série: carga sugerida e o mínimo da faixa quando a carga subiu', () => {
    const sug = sugerir(topo, supino, { hoje });
    expect(preencher(sug, [], supino)).toEqual({ kg: 82.5, reps: 6 });
  });

  it('manter: reps do último treino, série a série', () => {
    const sug = sugerir(dentro, supino, { hoje });
    expect(preencher(sug, [], supino)).toEqual({ kg: 80, reps: 9 });
    expect(preencher(sug, [{ kg: 80, reps: 9 }], supino)).toEqual({ kg: 80, reps: 8 });
    // série extra: repete a anterior
    const tres = [9, 8, 7].map((reps) => ({ kg: 80, reps }));
    expect(preencher(sug, tres, supino)).toEqual({ kg: 80, reps: 7 });
  });

  it('depois da 1ª série vale a carga que o usuário usou', () => {
    const sug = sugerir(topo, supino, { hoje });
    expect(preencher(sug, [{ kg: 85, reps: 5 }], supino).kg).toBe(85);
  });

  it('sem histórico: sem carga; reps no mínimo, depois as da série anterior', () => {
    const sug = sugerir([], supino, { hoje });
    expect(preencher(sug, [], supino)).toEqual({ kg: null, reps: 6 });
    expect(preencher(sug, [{ kg: 40, reps: 9 }], supino)).toEqual({ kg: 40, reps: 9 });
  });

  it('por tempo: carga do último treino e os segundos de antes', () => {
    const prancha = { reps: { min: 30, max: 45 }, rir: { min: 1, max: 2 }, porTempo: true };
    const ultimo = { data: '2026-11-06', series: [40, 35].map((reps) => ({ kg: 0, reps, rir: null })) };
    const sug = sugerir([ultimo], prancha, { hoje });
    expect(preencher(sug, [], prancha, ultimo)).toEqual({ kg: 0, reps: 40 });
    expect(preencher(sug, [], prancha)).toEqual({ kg: 0, reps: 40 });
  });

  it('por tempo na primeira vez: 0 kg (peso do corpo) e o mínimo da faixa', () => {
    const prancha = { reps: { min: 30, max: 45 }, rir: { min: 1, max: 2 }, porTempo: true };
    const sug = sugerir([], prancha, { hoje });
    expect(preencher(sug, [], prancha)).toEqual({ kg: 0, reps: 30 });
  });
});

describe('treino seguinte depois de uma sugestão ↑ (7.6)', () => {
  it('todas as séries com a carga nova e as reps no mínimo da faixa', () => {
    // treino de hoje no topo da faixa → no próximo, 82,5 kg × 6 em todas as séries
    const hist = comTreinoAtual(
      [],
      '2026-11-07',
      [10, 10, 10].map((reps) => ({ kg: 80, reps, rir: 2 })),
    );
    const sug = sugerir(hist, supino, { hoje: '2026-11-10' });
    expect(sug.acao).toBe('aumentar');
    const feitas: { kg: number; reps: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const p = preencher(sug, feitas, supino);
      expect(p).toEqual({ kg: 82.5, reps: 6 });
      feitas.push({ kg: p.kg!, reps: p.reps });
    }
  });
});
