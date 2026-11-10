import { describe, expect, it } from 'vitest';
import { candidatosVinculo, jaro, jaroWinkler } from '../../src/dominio/similaridade';

describe('Jaro-Winkler', () => {
  it('valores clássicos', () => {
    expect(jaro('martha', 'marhta')).toBeCloseTo(0.944, 3);
    expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.961, 3);
    expect(jaroWinkler('dixon', 'dicksonx')).toBeCloseTo(0.813, 3);
  });

  it('bordas', () => {
    expect(jaroWinkler('abc', 'abc')).toBe(1);
    expect(jaroWinkler('', 'abc')).toBe(0);
    expect(jaroWinkler('abc', 'xyz')).toBe(0);
  });
});

describe('candidatosVinculo', () => {
  const existentes = ['supino reto barra', 'supino inclinado com halteres', 'remada curvada', 'agachamento'];

  it('sugere a chave parecida (exemplo do BRIEFING)', () => {
    const c = candidatosVinculo('supino reto c barra', existentes);
    expect(c[0]?.chave).toBe('supino reto barra');
    expect(c[0]!.semelhanca).toBeGreaterThanOrEqual(0.85);
  });

  it('ignora a própria chave e nomes diferentes', () => {
    expect(candidatosVinculo('agachamento', existentes)).toEqual([]);
    expect(candidatosVinculo('rosca direta', existentes)).toEqual([]);
  });

  it('ordena da mais parecida para a menos', () => {
    const c = candidatosVinculo('supino reto barra', [
      'supino reto barr',
      'supino reto barra livre',
      'supino reto',
    ]);
    expect(c.map((x) => x.chave)[0]).toBe('supino reto barr');
    expect(c.every((x, i) => i === 0 || c[i - 1]!.semelhanca >= x.semelhanca)).toBe(true);
  });
});
