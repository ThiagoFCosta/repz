import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/dominio/formato/parser';
import type { PlanoImportado } from '../../../src/dominio/tipos';

const RAUL = fs.readFileSync(new URL('../../fixtures/raul.treino.txt', import.meta.url), 'utf8');

// Monta um bloco mínimo válido em volta das linhas dadas
const bloco = (...linhas: string[]) =>
  ['#TREINO-INICIO v1', 'PLANO: Teste | Ana | 2026-11-01', ...linhas, '#TREINO-FIM'].join('\n');
const msgs = (l: { msg: string }[]) => l.map((m) => m.msg);
const exercicios = (p: PlanoImportado) => p.sessoes.flatMap((s) => s.itens);

describe('plano do Raul (fixture de texto)', () => {
  const r = parse(RAUL);
  const p = r.plano!;

  it('importa sem erros nem avisos', () => {
    expect(r.erros).toEqual([]);
    expect(r.avisos).toEqual([]);
    expect(p).not.toBeNull();
  });

  it('lê cabeçalho e progressão', () => {
    expect(p).toMatchObject({
      nome: 'Hipertrofia natural 5x',
      autor: 'Raul',
      data: '2026-10-30',
      versaoFormato: 1,
    });
    expect(p.progressao).toEqual({
      tipo: 'dupla',
      rir: { min: 1, max: 3 },
      carga: { min: 2, max: 5 },
      estagnado: 3,
    });
  });

  it('lê 5 sessões em ordem, com dia da semana, e 30 exercícios', () => {
    expect(p.sessoes.map((s) => [s.nome, s.dia])).toEqual([
      ['Push', 1],
      ['Pull', 2],
      ['Pernas quadriceps', 3],
      ['Upper', 4],
      ['Lower posterior', 5],
    ]);
    expect(exercicios(p)).toHaveLength(30);
  });

  it('lê o bloco de 12 semanas com 4 fases', () => {
    expect(p.bloco).toEqual({
      semanas: 12,
      fases: [
        { de: 1, ate: 4, rir: { min: 2, max: 3 }, rirIso: null, deload: false, volume: 1, series: null },
        {
          de: 5,
          ate: 8,
          rir: { min: 1, max: 2 },
          rirIso: null,
          deload: false,
          volume: 1,
          series: { delta: 1, alvo: 'foco' },
        },
        {
          de: 9,
          ate: 11,
          rir: { min: 1, max: 2 },
          rirIso: { min: 0, max: 1 },
          deload: false,
          volume: 1,
          series: null,
        },
        { de: 12, ate: 12, rir: null, rirIso: null, deload: true, volume: 0.5, series: null },
      ],
    });
  });

  it('expande variantes no meio e no início do nome', () => {
    const [, supino] = p.sessoes[0]!.itens;
    expect(supino).toMatchObject({
      nome: 'Supino reto',
      variantes: ['Supino reto barra', 'Supino reto maquina'],
      chaves: ['supino reto barra', 'supino reto maquina'],
      series: 3,
      reps: { min: 6, max: 10 },
      descanso: { min: 120, max: 180 },
    });
    const barra = p.sessoes[1]!.itens[0]!;
    expect(barra.nome).toBe('Barra fixa / Puxada');
    expect(barra.variantes).toEqual(['Barra fixa', 'Puxada']);
  });

  it('bi-set: grupo, iso e descanso do grupo propagado para a linha com "-"', () => {
    const push = p.sessoes[0]!.itens;
    expect(push[3]).toMatchObject({
      nome: 'Elevacao lateral',
      grupo: 1,
      iso: true,
      series: 4,
      descanso: { min: 60, max: 90 },
    });
    expect(push[4]).toMatchObject({
      nome: 'Triceps na corda',
      grupo: 1,
      iso: true,
      series: 3,
      descanso: { min: 60, max: 90 },
    });
    const upper = p.sessoes[3]!.itens;
    expect(upper.filter((e) => e.grupo === 2).map((e) => e.nome)).toEqual([
      'Rosca direta',
      'Triceps na corda',
    ]);
  });

  it('RIR fixo do Stiff e exercícios normais sem grupo', () => {
    const stiff = p.sessoes[2]!.itens[1]!;
    expect(stiff).toMatchObject({
      nome: 'Stiff',
      rir: { min: 3, max: 3 },
      grupo: null,
      iso: false,
      foco: false,
    });
  });

  it('lê o cardio com variantes, FC e intensidade', () => {
    expect(p.cardio).toEqual([
      {
        tipos: ['Bicicleta', 'Remo'],
        frequencia: '2x',
        minutos: { min: 30, max: 40 },
        fc: { min: 115, max: 135 },
        intensidade: 'z2',
      },
      {
        tipos: ['Bicicleta'],
        frequencia: 'opcional',
        minutos: { min: 10, max: 15 },
        fc: null,
        intensidade: 'leve',
      },
    ]);
  });

  it('guarda o bloco bruto entre os marcadores', () => {
    expect(r.textoBloco.startsWith('#TREINO-INICIO v1')).toBe(true);
    expect(r.textoBloco.endsWith('#TREINO-FIM')).toBe(true);
  });
});

// Casos da tabela 5.6 do BRIEFING (os mesmos de referencia/teste/erros.mjs)
describe('casos de erro da tabela 5.6', () => {
  it('sem #TREINO-INICIO (PDF comum) bloqueia', () => {
    const r = parse('Plano de treino...\nSupino 3x10');
    expect(r.plano).toBeNull();
    expect(r.erros).toEqual([
      {
        linha: 0,
        msg: 'Marcador #TREINO-INICIO não encontrado. O PDF precisa ter o anexo no formato TREINO v1.',
      },
    ]);
  });

  it('sem #TREINO-FIM bloqueia', () => {
    const r = parse(RAUL.replace('#TREINO-FIM', ''));
    expect(r.plano).toBeNull();
    expect(msgs(r.erros)).toEqual(['Marcador #TREINO-FIM não encontrado: o bloco pode ter sido cortado.']);
  });

  it('exercício removido: TOTAL não confere', () => {
    const r = parse(RAUL.replace(/EX: Rosca martelo.*\n/, ''));
    expect(r.plano).toBeNull();
    expect(msgs(r.erros)).toEqual(['TOTAL diz 30 exercícios, mas foram lidos 29']);
  });

  it('Hip thrust com 3 campos bloqueia na linha 47', () => {
    const r = parse(RAUL.replace('EX: Hip thrust | 3 | 8-12 | 120s', 'EX: Hip thrust | 3 | 8-12'));
    expect(r.plano).toBeNull();
    expect(r.erros[0]).toMatchObject({
      linha: 47,
      msg: 'Faltam campos: esperado "nome | séries | reps | descanso", veio 3',
    });
  });

  it('reps "oito a doze" bloqueia na linha 29', () => {
    const r = parse(RAUL.replace('Leg press | 3 | 8-12', 'Leg press | 3 | oito a doze'));
    expect(r.plano).toBeNull();
    expect(r.erros[0]).toMatchObject({
      linha: 29,
      msg: 'Repetições inválidas: "oito a doze" (use "8-12", "10" ou "30-45s")',
    });
  });

  it('FASE 4-8 sobrepondo 1-4 bloqueia', () => {
    const r = parse(RAUL.replace('FASE: 5-8', 'FASE: 4-8'));
    expect(r.plano).toBeNull();
    expect(msgs(r.erros)).toEqual(['Semana 4 aparece em mais de uma FASE']);
  });

  it('bloco colado com cercas markdown importa', () => {
    const r = parse('```\n' + RAUL + '\n```');
    expect(r.erros).toEqual([]);
    expect(exercicios(r.plano!)).toHaveLength(30);
  });
});

describe('tolerâncias de leitura (5.3)', () => {
  it('palavras-chave com acento e minúsculas', () => {
    const r = parse(bloco('Sessão: Push', 'ex: Supino | 3 | 8-12 | 90s', 'Total: 1 sessão | 1 exercício'));
    expect(r.erros).toEqual([]);
    expect(r.plano!.sessoes[0]!.itens[0]!.nome).toBe('Supino');
  });

  it('travessão, espaço não separável e barra larga', () => {
    const r = parse(
      bloco('SESSAO: Push', 'EX: Supino\u00a0reto ｜ 3 | 6–10 | 120—180s', 'TOTAL: 1 sessoes | 1 exercicios'),
    );
    expect(r.erros).toEqual([]);
    expect(r.plano!.sessoes[0]!.itens[0]).toMatchObject({
      nome: 'Supino reto',
      reps: { min: 6, max: 10 },
      descanso: { min: 120, max: 180 },
    });
  });

  it('mantém acentos no nome exibido e remove na chave', () => {
    const r = parse(
      bloco(
        'SESSAO: Pernas quadríceps',
        'EX: Elevação pélvica | 3 | 8-12 | 90s',
        'TOTAL: 1 sessoes | 1 exercicios',
      ),
    );
    const ex = r.plano!.sessoes[0]!.itens[0]!;
    expect(r.plano!.sessoes[0]!.nome).toBe('Pernas quadríceps');
    expect(ex.nome).toBe('Elevação pélvica');
    expect(ex.chaves).toEqual(['elevacao pelvica']);
  });

  it('linha quebrada que começa com "|" é rejuntada', () => {
    const r = parse(
      bloco(
        'SESSAO: Push',
        'EX: Supino inclinado com halteres no banco a 30 graus',
        '| 3 | 6-10 | 120-180s',
        'TOTAL: 1 sessoes | 1 exercicios',
      ),
    );
    expect(r.erros).toEqual([]);
    expect(r.plano!.sessoes[0]!.itens[0]).toMatchObject({
      nome: 'Supino inclinado com halteres no banco a 30 graus',
      series: 3,
    });
  });

  it('linha quebrada sem "|" é rejuntada se a anterior não tem o mínimo de campos', () => {
    const r = parse(
      bloco('SESSAO: Push', 'EX: Supino inclinado | 3 |', '6-10 | 120s', 'TOTAL: 1 sessoes | 1 exercicios'),
    );
    expect(r.erros).toEqual([]);
    expect(r.plano!.sessoes[0]!.itens[0]).toMatchObject({
      series: 3,
      reps: { min: 6, max: 10 },
      descanso: { min: 120, max: 120 },
    });
  });

  it('linha solta depois de linha completa vira aviso (rodapé de página)', () => {
    const r = parse(
      bloco(
        'SESSAO: Push',
        'EX: Supino | 3 | 8-12 | 90s',
        'file:///C:/plano.html 1/2',
        'TOTAL: 1 sessoes | 1 exercicios',
      ),
    );
    expect(r.erros).toEqual([]);
    expect(r.avisos).toEqual([
      { linha: 4, msg: 'Linha ignorada (sem chave reconhecida): "file:///C:/plano.html 1/2"' },
    ]);
  });

  it('comentários e linhas vazias são ignorados sem aviso', () => {
    const r = parse(
      bloco(
        '',
        '# comentário',
        'SESSAO: Push',
        '',
        'EX: Supino | 3 | 8-12 | 90s',
        'TOTAL: 1 sessoes | 1 exercicios',
      ),
    );
    expect(r.erros).toEqual([]);
    expect(r.avisos).toEqual([]);
  });

  it('texto fora dos marcadores é ignorado', () => {
    const r = parse(
      'Corpo do PDF\nSESSAO: Falsa\n' +
        bloco('SESSAO: Push', 'EX: Supino | 3 | 8-12 | 90s', 'TOTAL: 1 sessoes | 1 exercicios') +
        '\nRodapé',
    );
    expect(r.plano!.sessoes.map((s) => s.nome)).toEqual(['Push']);
  });

  it('descanso em minutos vira segundos', () => {
    const r = parse(
      bloco(
        'SESSAO: Push',
        'EX: A | 3 | 8-12 | 2min',
        'EX: B | 3 | 8-12 | 2-3min',
        'TOTAL: 1 sessoes | 2 exercicios',
      ),
    );
    expect(exercicios(r.plano!).map((e) => e.descanso)).toEqual([
      { min: 120, max: 120 },
      { min: 120, max: 180 },
    ]);
  });

  it('reps por tempo', () => {
    const r = parse(
      bloco('SESSAO: Core', 'EX: Prancha | 3 | 30-45s | 60s | iso', 'TOTAL: 1 sessoes | 1 exercicios'),
    );
    expect(r.plano!.sessoes[0]!.itens[0]).toMatchObject({
      porTempo: true,
      reps: { min: 30, max: 45 },
      iso: true,
    });
  });

  it('reps simples e tokens rir/foco', () => {
    const r = parse(
      bloco('SESSAO: Push', 'EX: Supino | 4 | 10 | 90s | rir 2 | foco', 'TOTAL: 1 sessoes | 1 exercicios'),
    );
    expect(r.plano!.sessoes[0]!.itens[0]).toMatchObject({
      reps: { min: 10, max: 10 },
      rir: { min: 2, max: 2 },
      foco: true,
      iso: false,
    });
  });
});

describe('avisos (5.4)', () => {
  it('token desconhecido', () => {
    const r = parse(
      bloco('SESSAO: Push', 'EX: Supino | 3 | 8-12 | 90s | pesado', 'TOTAL: 1 sessoes | 1 exercicios'),
    );
    expect(r.plano).not.toBeNull();
    expect(r.avisos).toEqual([{ linha: 3, msg: 'Marcação desconhecida ignorada: pesado' }]);
  });

  it('bi-set de um exercício só', () => {
    const r = parse(bloco('SESSAO: Push', 'SS1: Supino | 3 | 8-12 | 90s', 'TOTAL: 1 sessoes | 1 exercicios'));
    expect(msgs(r.avisos)).toEqual(['"Push": SS1 tem só 1 exercício']);
  });

  it('exercício sem descanso', () => {
    const r = parse(bloco('SESSAO: Push', 'EX: Supino | 3 | 8-12 | -', 'TOTAL: 1 sessoes | 1 exercicios'));
    expect(msgs(r.avisos)).toEqual(['"Supino" sem descanso definido']);
  });

  it('semana sem fase', () => {
    const r = parse(
      bloco(
        'BLOCO: 3',
        'FASE: 1-2 | rir 2-3',
        'SESSAO: Push',
        'EX: Supino | 3 | 8-12 | 90s',
        'TOTAL: 1 sessoes | 1 exercicios',
      ),
    );
    expect(msgs(r.avisos)).toEqual(['Semana 3 não pertence a nenhuma FASE (usa o RIR padrão)']);
  });

  it('sem linha TOTAL', () => {
    const r = parse(bloco('SESSAO: Push', 'EX: Supino | 3 | 8-12 | 90s'));
    expect(r.plano).not.toBeNull();
    expect(msgs(r.avisos)).toEqual(['Sem linha TOTAL: não dá para conferir se algo se perdeu na leitura']);
  });

  it('versão do formato diferente de 1', () => {
    const r = parse(
      bloco('SESSAO: Push', 'EX: Supino | 3 | 8-12 | 90s', 'TOTAL: 1 sessoes | 1 exercicios').replace(
        'v1',
        'v2',
      ),
    );
    expect(msgs(r.avisos)).toEqual(['Versão 2 do formato; este app lê a v1.']);
  });

  it('marcação desconhecida na FASE', () => {
    const r = parse(
      bloco(
        'BLOCO: 1',
        'FASE: 1 | rir 2-3 | leve',
        'SESSAO: Push',
        'EX: Supino | 3 | 8-12 | 90s',
        'TOTAL: 1 sessoes | 1 exercicios',
      ),
    );
    expect(r.plano).not.toBeNull();
    expect(r.avisos).toEqual([{ linha: 3, msg: 'Marcação desconhecida ignorada: leve' }]);
  });

  it('alvo de séries desconhecido na FASE', () => {
    const r = parse(
      bloco(
        'BLOCO: 1',
        'FASE: 1 | series +1 compostos',
        'SESSAO: Push',
        'EX: Supino | 3 | 8-12 | 90s',
        'TOTAL: 1 sessoes | 1 exercicios',
      ),
    );
    expect(msgs(r.avisos)).toEqual(['Marcação desconhecida ignorada: series compostos']);
    expect(r.plano!.bloco!.fases[0]!.series).toBeNull();
  });
});

describe('outros erros (5.4)', () => {
  const casos: [string, string[], string][] = [
    ['exercício antes de SESSAO', ['EX: Supino | 3 | 8-12 | 90s'], 'Exercício antes de qualquer SESSAO'],
    [
      'FASE antes de BLOCO',
      ['FASE: 1-4 | rir 2-3', 'SESSAO: A', 'EX: X | 3 | 8 | 90s'],
      'FASE apareceu antes de BLOCO',
    ],
    [
      'semanas inválidas na FASE',
      ['BLOCO: 4', 'FASE: um a quatro', 'SESSAO: A', 'EX: X | 3 | 8 | 90s'],
      'Semanas inválidas na FASE: "um a quatro" (use "1-4" ou "12")',
    ],
    [
      'BLOCO sem número',
      ['BLOCO: doze', 'SESSAO: A', 'EX: X | 3 | 8 | 90s'],
      'BLOCO precisa do número de semanas, ex.: "BLOCO: 12"',
    ],
    ['séries zero', ['SESSAO: A', 'EX: X | 0 | 8 | 90s'], 'Séries inválidas: "0"'],
    ['séries acima de 10', ['SESSAO: A', 'EX: X | 11 | 8 | 90s'], 'Séries inválidas: "11"'],
    [
      'descanso inválido',
      ['SESSAO: A', 'EX: X | 3 | 8 | dois minutos'],
      'Descanso inválido: "dois minutos" (use "90s" ou "120-180s")',
    ],
    ['nenhuma sessão', ['CARDIO: Bike | 2x | 30min'], 'Nenhuma SESSAO encontrada'],
    [
      'sessão sem exercícios',
      ['SESSAO: A', 'EX: X | 3 | 8 | 90s', 'SESSAO: Vazia'],
      'Sessão "Vazia" sem exercícios',
    ],
    [
      'TOTAL de sessões não confere',
      ['SESSAO: A', 'EX: X | 3 | 8 | 90s', 'TOTAL: 2 sessoes | 1 exercicios'],
      'TOTAL diz 2 sessões, mas foram lidas 1',
    ],
    [
      'duração do cardio inválida',
      ['SESSAO: A', 'EX: X | 3 | 8 | 90s', 'CARDIO: Bike | 2x | meia hora'],
      'Duração do cardio inválida: "meia hora" (use "30-40min")',
    ],
  ];
  it.each(casos)('%s', (_nome, linhas, esperado) => {
    const r = parse(bloco(...linhas));
    expect(r.plano).toBeNull();
    expect(msgs(r.erros)).toContain(esperado);
  });

  it('erro aponta a linha dentro do bloco e o texto', () => {
    const r = parse(bloco('SESSAO: A', 'EX: X | 3 | 8 | dois minutos'));
    expect(r.erros[0]).toEqual({
      linha: 3,
      msg: 'Descanso inválido: "dois minutos" (use "90s" ou "120-180s")',
      texto: 'EX: X | 3 | 8 | dois minutos',
    });
  });

  it('com erro, o rascunho continua disponível para a tela', () => {
    const r = parse(RAUL.replace('FASE: 5-8', 'FASE: 4-8'));
    expect(r.plano).toBeNull();
    expect(r.rascunho.sessoes).toHaveLength(5);
  });
});
