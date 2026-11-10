import { describe, expect, it } from 'vitest';
import { chaveExercicio, normalizar, semAcento } from '../../../src/dominio/formato/normalizar';

describe('normalizar', () => {
  it('troca hífens e travessões tipográficos por "-"', () => {
    expect(normalizar('6–10 ‒ 8—12 −3 ‐ ―')).toBe('6-10 - 8-12 -3 - -');
  });

  it('troca espaços especiais por espaço comum e colapsa repetidos', () => {
    expect(normalizar('Supino reto  barra |​ x')).toBe('Supino reto barra | x');
  });

  it('troca barras verticais alternativas por "|"', () => {
    expect(normalizar('a ｜ b ¦ c │ d')).toBe('a | b | c | d');
  });

  it('mantém os acentos e compõe em NFC', () => {
    expect(normalizar('Elevação lateral')).toBe('Elevação lateral');
  });

  it('apara as pontas', () => {
    expect(normalizar('  EX: x  ')).toBe('EX: x');
  });
});

describe('semAcento', () => {
  it('remove acentos e cedilha', () => {
    expect(semAcento('SESSÃO Elevação Panturrilha em pé')).toBe('SESSAO Elevacao Panturrilha em pe');
  });
});

describe('chaveExercicio', () => {
  it('sem acento, minúsculas e sem pontuação', () => {
    expect(chaveExercicio('Elevação lateral')).toBe('elevacao lateral');
    expect(chaveExercicio('Supino reto c/ barra')).toBe('supino reto c barra');
    expect(chaveExercicio('  Tríceps   na corda (V) ')).toBe('triceps na corda v');
  });

  it('nomes com e sem acento geram a mesma chave', () => {
    expect(chaveExercicio('Pernas quadríceps')).toBe(chaveExercicio('Pernas quadriceps'));
  });
});
