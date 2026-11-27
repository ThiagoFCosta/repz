import { describe, expect, it } from 'vitest';
import { porFeitaEm } from '../../src/dados/ordem';
import type { SerieRealizada } from '../../src/dados/tipos';

const serie = (id: string, feitaEm: string, ordem: number) => ({ id, feitaEm, ordem }) as SerieRealizada;

// D50: feitaEm tem precisão de segundos
describe('porFeitaEm', () => {
  it('ordena pelo horário e, no mesmo segundo, pela ordem da série', () => {
    const s = [
      serie('z', '2026-11-26T19:00:05-03:00', 1),
      serie('b', '2026-11-26T19:00:01-03:00', 2),
      serie('a', '2026-11-26T19:00:01-03:00', 1),
    ];
    expect(s.sort(porFeitaEm).map((x) => x.id)).toEqual(['a', 'b', 'z']);
  });
});
