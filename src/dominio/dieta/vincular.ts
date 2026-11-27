// Vinculação NutriDiet → base de alimentos (BRIEFING-v2 10.2): alias salvo do usuário → alias padrão (nomes do
// NutriDiet conferidos no PDF real) → busca aproximada (Jaro-Winkler) → confirmação na revisão.

import { jaroWinkler, LIMITE_VINCULO } from '../similaridade.ts';
import { alimentoPorId, alimentoPorNome, BASE, normalizarNome, type Alimento } from './alimentos.ts';

// Nomes do NutriDiet já conferidos (referencia/dieta/alimentos.js). Chave normalizada → nome na base.
const ALIAS_PADRAO_BRUTO: Record<string, string> = {
  'pão de forma industrializado de qualquer marca': 'Pão de forma tradicional (genérico)',
  'ovo de galinha - frito(a)': 'Ovo, de galinha, inteiro, frito',
  'queijo mussarela': 'Queijo, mozarela',
  café: 'Café, infusão 10%',
  'banana, prata, crua': 'Banana, prata, crua',
  'castanha de caju': 'Castanha-de-caju, torrada, salgada',
  'castanha do pará': 'Castanha-do-Brasil, crua',
  'arroz (branco, polido, parboilizado, agulha, agulhinha, etc.)': 'Arroz, tipo 1, cozido',
  'filé de frango - grelhado(a)/brasa/churrasco': 'Frango, peito, sem pele, grelhado',
  alface: 'Alface, crespa, crua',
  tomate: 'Tomate, com semente, cru',
  'salada, de legumes, cozida no vapor': 'Salada, de legumes, cozida no vapor',
  'queijo minas, frescal': 'Queijo, minas, frescal',
  'peito de peru': 'Peito de peru defumado (genérico)',
  'iogurte, natural, desnatado': 'Iogurte, natural, desnatado',
  morango: 'Morango, cru',
  'whey protein': 'Whey protein (concentrado, genérico)',
  'leite de vaca desnatado': 'Leite de vaca desnatado UHT (genérico)',
  'aveia em flocos': 'Aveia, flocos, crua',
};
export const ALIAS_PADRAO: ReadonlyMap<string, string> = new Map(
  Object.entries(ALIAS_PADRAO_BRUTO).map(([k, v]) => [normalizarNome(k), v]),
);

export type OrigemVinculo = 'seu' | 'padrao' | 'aproximado';

export interface Vinculo {
  alimento: Alimento | null;
  origem: OrigemVinculo | null;
  nota: number | null; // semelhança na busca aproximada (0 a 1)
}

export function vincular(
  nomeNutri: string,
  aliasesDoUsuario: ReadonlyMap<string, string> = new Map(), // texto normalizado → id do alimento
  extras: readonly Alimento[] = [],
): Vinculo {
  const chave = normalizarNome(nomeNutri);
  const seu = aliasesDoUsuario.get(chave);
  const deSeu = seu ? alimentoPorId(seu, extras) : null;
  if (deSeu) return { alimento: deSeu, origem: 'seu', nota: null };
  const padrao = ALIAS_PADRAO.get(chave);
  const dePadrao = padrao ? alimentoPorNome(padrao) : null;
  if (dePadrao) return { alimento: dePadrao, origem: 'padrao', nota: null };
  let melhor: { a: Alimento; n: number } | null = null;
  for (const a of [...extras, ...BASE]) {
    const n = jaroWinkler(chave, normalizarNome(a.nome));
    if (!melhor || n > melhor.n) melhor = { a, n };
  }
  return melhor && melhor.n >= LIMITE_VINCULO
    ? { alimento: melhor.a, origem: 'aproximado', nota: Math.round(melhor.n * 100) / 100 }
    : { alimento: null, origem: null, nota: null };
}
