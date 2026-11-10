import { describe, expect, it } from 'vitest';
import {
  sugerir,
  type OpcoesMotor,
  type PrescricaoMotor,
  type TreinoHistorico,
} from '../../../src/dominio/progressao/motor';
import { cargaPara, e1rm, incrementoPadrao } from '../../../src/dominio/progressao/e1rm';
import { CONFIG_PROGRESSAO } from '../../../src/dominio/progressao/config';

// Cenários de referencia/teste/progressao.mjs e da tabela 7.5 do BRIEFING. Hoje = 2026-11-07.
const S = (data: string, kg: number, reps: number[], rir: (number | null)[]): TreinoHistorico => ({
  data,
  series: reps.map((r, i) => ({ kg, reps: r, rir: rir[i] ?? null })),
});
const supino: PrescricaoMotor = { reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 } }; // semana 6 (fase 2)
const desenv: PrescricaoMotor = { reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 } };
const elev: PrescricaoMotor = { reps: { min: 12, max: 20 }, rir: { min: 0, max: 1 } }; // isolador, semana 10
const longeAlvo: PrescricaoMotor = { reps: { min: 6, max: 10 }, rir: { min: 2, max: 3 } };
const sup = (o: Partial<OpcoesMotor> = {}): OpcoesMotor => ({
  hoje: '2026-11-07',
  nome: 'Supino reto barra',
  ...o,
});

describe('motor de carga: 16 cenários da 7.5', () => {
  it('topo da faixa, barra → ↑ 82,5 kg (+3,1%)', () => {
    const r = sugerir(
      [S('2026-10-30', 80, [10, 10, 9], [2, 1, 1]), S('2026-11-06', 80, [10, 10, 10], [2, 1, 1])],
      supino,
      sup(),
    );
    expect(r).toEqual({
      acao: 'aumentar',
      carga: 82.5,
      anterior: 80,
      variacao: 3.1,
      motivo: '10·10·10 no topo da faixa: suba para 82,5 kg e volte a 6+ reps.',
      alertas: [],
      e1rm: 112,
      repsSugeridas: [6, 6, 6],
    });
  });

  it('topo, halteres 26 kg → ↑ 28 kg (menor salto: 2 kg)', () => {
    const r = sugerir([S('2026-11-06', 26, [10, 10, 10], [2, 2, 1])], supino, {
      hoje: '2026-11-07',
      nome: 'Supino inclinado com halteres',
    });
    expect(r).toMatchObject({ acao: 'aumentar', carga: 28, anterior: 26, variacao: 7.7, alertas: [] });
    expect(r.motivo).toBe(
      '10·10·10 no topo da faixa: suba para 28 kg (menor salto possível: 2 kg) e volte a 6+ reps.',
    );
  });

  it('topo com folga → ↑ 85 kg (+6,3%)', () => {
    const r = sugerir([S('2026-11-06', 80, [13, 12, 12], [3, 2, 2])], supino, sup());
    expect(r).toMatchObject({ acao: 'aumentar', carga: 85, variacao: 6.3, alertas: [] });
    expect(r.motivo).toBe(
      '13·12·12 no topo da faixa: suba para 85 kg (sobrou bastante: salto maior) e volte a 6+ reps.',
    );
  });

  it('dentro da faixa → = 82,5 kg', () => {
    const r = sugerir([S('2026-11-06', 82.5, [8, 7, 7], [2, 1, 1])], supino, sup());
    expect(r).toMatchObject({ acao: 'manter', carga: 82.5, variacao: 0, alertas: [], e1rm: 110 });
    expect(r.motivo).toBe('Mantenha 82,5 kg e busque +1 rep por série (meta 10).');
    expect(r.repsSugeridas).toEqual([8, 7, 7]);
  });

  it('carga alta demais → ↓ 80 kg', () => {
    const r = sugerir(
      [S('2026-10-30', 80, [10, 10, 10], [2, 1, 1]), S('2026-11-06', 85, [5, 4, 4], [1, 0, 0])],
      supino,
      sup(),
    );
    expect(r).toMatchObject({ acao: 'reduzir', carga: 80, anterior: 85, variacao: -5.9, alertas: [] });
    expect(r.motivo).toBe('5·4·4 ficou abaixo da faixa (6-10): baixe para 80 kg para voltar a 6+ reps.');
    // reps abaixo da faixa são levadas ao mínimo
    expect(r.repsSugeridas).toEqual([6, 6, 6]);
  });

  it('halteres abaixo da faixa → ↓ 20 kg', () => {
    const r = sugerir([S('2026-11-06', 22, [7, 6, 5], [1, 0, 0])], desenv, {
      hoje: '2026-11-07',
      nome: 'Desenvolvimento com halteres',
    });
    expect(r).toMatchObject({ acao: 'reduzir', carga: 20, variacao: -9.1, alertas: [] });
    expect(r.motivo).toBe('7·6·5 ficou abaixo da faixa (8-12): baixe para 20 kg para voltar a 8+ reps.');
  });

  it('queda pontual → = 80 kg + alerta de queda isolada', () => {
    const r = sugerir(
      [
        S('2026-10-16', 80, [10, 9, 9], [1, 1, 1]),
        S('2026-10-23', 80, [10, 10, 9], [1, 1, 1]),
        S('2026-10-30', 80, [10, 10, 10], [2, 1, 1]),
        S('2026-11-06', 80, [8, 7, 7], [1, 1, 0]),
      ],
      supino,
      sup(),
    );
    expect(r).toMatchObject({ acao: 'manter', carga: 80 });
    expect(r.motivo).toBe('Mantenha 80 kg e busque +1 rep por série (meta 10).');
    expect(r.alertas).toEqual([
      'Treino abaixo do seu normal. Uma queda isolada não muda a carga; se repetir no próximo, o app sugere reduzir.',
    ]);
  });

  it('queda em 2 treinos → ↓ 75 kg + alerta de recuperação', () => {
    const r = sugerir(
      [
        S('2026-10-23', 80, [10, 10, 9], [1, 1, 1]),
        S('2026-10-30', 80, [10, 10, 10], [2, 1, 1]),
        S('2026-11-03', 80, [7, 7, 6], [1, 1, 0]),
        S('2026-11-06', 80, [7, 6, 6], [1, 0, 0]),
      ],
      supino,
      sup(),
    );
    expect(r).toMatchObject({ acao: 'reduzir', carga: 75, variacao: -6.2, e1rm: 101.3 });
    expect(r.motivo).toBe('Desempenho 10% abaixo do seu melhor recente em 2 treinos: baixe para 75 kg.');
    expect(r.alertas).toEqual([
      'Queda em 2 treinos seguidos: confira sono, alimentação e estresse. Se persistir, antecipe o deload.',
    ]);
  });

  it('perto da falha 1× (alvo RIR 2-3) → = 80 kg, "pare mais longe da falha"', () => {
    const r = sugerir([S('2026-11-06', 80, [9, 8, 8], [0, 0, 0])], longeAlvo, sup());
    expect(r).toMatchObject({ acao: 'manter', carga: 80, alertas: [] });
    expect(r.motivo).toBe('Mantenha 80 kg, mas pare mais longe da falha (RIR 2-3).');
  });

  it('perto da falha 2× → ↓ 77,5 kg', () => {
    const r = sugerir(
      [S('2026-10-30', 80, [9, 8, 8], [0, 0, 0]), S('2026-11-06', 80, [9, 9, 8], [0, 0, 0])],
      longeAlvo,
      sup(),
    );
    expect(r).toMatchObject({ acao: 'reduzir', carga: 77.5, variacao: -3.1, alertas: [] });
    expect(r.motivo).toBe('2 treinos seguidos mais perto da falha que o alvo (RIR 2-3): baixe para 77,5 kg.');
  });

  it('pausa de 25 dias → ↓ 72,5 kg', () => {
    const r = sugerir([S('2026-10-13', 80, [10, 10, 9], [2, 1, 1])], supino, sup());
    expect(r).toMatchObject({ acao: 'reduzir', carga: 72.5, variacao: -9.4, alertas: [] });
    expect(r.motivo).toBe('25 dias sem este exercício: volte com 72,5 kg (−10%) e retome a progressão.');
  });

  it('deload → = mesma carga', () => {
    const r = sugerir(
      [S('2026-11-06', 80, [10, 10, 10], [2, 1, 1])],
      { ...supino, fase: { deload: true } },
      sup(),
    );
    expect(r).toMatchObject({ acao: 'manter', carga: 80, alertas: [] });
    expect(r.motivo).toBe('Semana de deload: mantenha 80 kg com metade das séries.');
  });

  it('estagnado (4 treinos semanais sem melhora) → = + alerta de estagnação', () => {
    const r = sugerir(
      [
        S('2026-10-09', 22, [10, 10, 9], [1, 1, 1]),
        S('2026-10-16', 22, [10, 9, 9], [1, 1, 1]),
        S('2026-10-23', 22, [10, 10, 9], [1, 1, 1]),
        S('2026-10-30', 22, [10, 9, 9], [1, 1, 1]),
      ],
      desenv,
      { hoje: '2026-11-01', nome: 'Desenvolvimento com halteres' },
    );
    expect(r).toMatchObject({ acao: 'manter', carga: 22 });
    expect(r.motivo).toBe('Mantenha 22 kg e busque +1 rep por série (meta 12).');
    expect(r.alertas).toEqual(['3 semanas sem progredir: troque a variação ou revise sono e calorias.']);
  });

  it('isolador, fase RIR 0-1 → = 10 kg', () => {
    const r = sugerir([S('2026-11-06', 10, [20, 20, 19, 20], [1, 0, 0, 0])], elev, {
      hoje: '2026-11-07',
      nome: 'Elevacao lateral',
    });
    expect(r).toMatchObject({ acao: 'manter', carga: 10, alertas: [] });
    expect(r.motivo).toBe('Mantenha 10 kg e busque +1 rep por série (meta 20).');
    expect(r.repsSugeridas).toEqual([20, 20, 19, 20]);
  });

  it('máquina com salto de 5 kg → ↑ 50 kg (menor salto)', () => {
    const r = sugerir(
      [S('2026-11-06', 45, [15, 15, 15], [1, 1, 1])],
      { reps: { min: 10, max: 15 }, rir: { min: 1, max: 2 } },
      { hoje: '2026-11-07', nome: 'Cadeira extensora', incremento: 5 },
    );
    expect(r).toMatchObject({ acao: 'aumentar', carga: 50, variacao: 11.1 });
    expect(r.motivo).toBe(
      '15·15·15 no topo da faixa: suba para 50 kg (menor salto possível: 5 kg) e volte a 10+ reps.',
    );
    expect(r.repsSugeridas).toEqual([10, 10, 10]);
  });

  it('sem histórico → calibrar', () => {
    expect(sugerir([], supino, sup())).toEqual({
      acao: 'calibrar',
      carga: null,
      motivo: 'Primeira vez: escolha uma carga para ~7-9 reps no RIR alvo. A próxima sugestão sai daí.',
      alertas: [],
      repsSugeridas: null,
    });
  });
});

describe('motor de carga: bordas', () => {
  it('RIR ausente usa o ponto médio do alvo', () => {
    // 80 × 10 com RIR 1,5 → e1RM 80 × (1 + 11,5/30)
    const r = sugerir([S('2026-11-06', 80, [10, 10, 10], [null, null, null])], supino, sup());
    expect(r.e1rm).toBe(110.7);
    expect(r.acao).toBe('aumentar');
  });

  it('só as séries na carga de trabalho entram na análise', () => {
    const t: TreinoHistorico = {
      data: '2026-11-06',
      series: [
        { kg: 60, reps: 4, rir: 0 },
        { kg: 80, reps: 8, rir: 2 },
        { kg: 80, reps: 8, rir: 1 },
      ],
    };
    const r = sugerir([t], supino, sup());
    expect(r).toMatchObject({ acao: 'manter', carga: 80, repsSugeridas: [8, 8] });
  });

  it('treinos sem séries são ignorados', () => {
    expect(sugerir([{ data: '2026-11-06', series: [] }], supino, sup()).acao).toBe('calibrar');
  });

  it('pausa conta pela data local (hoje às 23:30 continua sendo hoje)', () => {
    const h = [S('2026-10-17', 80, [8, 8, 8], [2, 2, 2])];
    expect(sugerir(h, supino, sup({ hoje: '2026-11-06' })).acao).toBe('manter'); // 20 dias
    expect(sugerir(h, supino, sup({ hoje: '2026-11-07' })).acao).toBe('reduzir'); // 21 dias
  });

  it('semanas de estagnação vêm da configuração (PROGRESSAO.estagnado)', () => {
    const h = [
      S('2026-10-02', 22, [10, 10, 9], [1, 1, 1]),
      S('2026-10-09', 22, [10, 10, 9], [1, 1, 1]),
      S('2026-10-16', 22, [10, 9, 9], [1, 1, 1]),
      S('2026-10-23', 22, [10, 10, 9], [1, 1, 1]),
      S('2026-10-30', 22, [10, 9, 9], [1, 1, 1]),
    ];
    const r = sugerir(h, desenv, { hoje: '2026-11-01', config: { estagnadoSemanas: 4 } });
    expect(r.alertas).toEqual(['4 semanas sem progredir: troque a variação ou revise sono e calorias.']);
  });

  it('exercício por tempo: bateu o máximo → aumentar; senão +5 s', () => {
    const prancha: PrescricaoMotor = { reps: { min: 30, max: 45 }, rir: { min: 1, max: 2 }, porTempo: true };
    expect(sugerir([S('2026-11-06', 0, [45, 45, 45], [])], prancha, sup())).toMatchObject({
      acao: 'aumentar',
      carga: null,
      motivo: 'Bateu 45s em todas: aumente a dificuldade (carga ou variação).',
      repsSugeridas: [45, 45, 45],
    });
    expect(sugerir([S('2026-11-06', 0, [45, 40, 35], [])], prancha, sup())).toMatchObject({
      acao: 'manter',
      carga: null,
      motivo: 'Busque +5 s por série até 45s.',
    });
  });

  it('e1RM, carga para a meta e salto padrão', () => {
    expect(e1rm(100, 10, 2)).toBeCloseTo(140);
    expect(e1rm(100, 10, null)).toBeCloseTo(133.33, 2);
    expect(cargaPara(140, 10, 2)).toBeCloseTo(100);
    expect(incrementoPadrao('Rosca com halteres')).toBe(2);
    expect(incrementoPadrao('Supino reto barra')).toBe(2.5);
    expect(CONFIG_PROGRESSAO.pausaDias).toBe(21);
  });
});
