import type { SerieRealizada } from './tipos';

// Ordem cronológica das séries. `feitaEm` tem precisão de segundos: duas séries no mesmo segundo desempatam pela
// ordem da série no exercício (docs/v2/DECISOES.md, D50); antes ficavam na ordem do id, que é aleatório.
export const porFeitaEm = (a: SerieRealizada, b: SerieRealizada): number =>
  a.feitaEm.localeCompare(b.feitaEm) || a.ordem - b.ordem;
