// Substituições calculadas (BRIEFING-v2 10.3). Porte de referencia/dieta/substituicoes.js: equivalência pelo macro
// de referência do grupo, com tolerância assimétrica de kcal (trocar por algo mais magro é aceitável; mais calórico,
// pouco), exclusões do usuário e de 3 a 5 opções ordenadas pela menor diferença de kcal. Não ficam gravadas: são
// calculadas na hora (D40). Fonte: taco2011.

import { semAcento } from '../formato/normalizar.ts';
import { alimentoPorNome, normalizarNome, nutrientes, type Alimento } from './alimentos.ts';

export type Macro = 'p' | 'c' | 'kcal';

export interface GrupoSubstituicao {
  rotulo: string;
  ref: Macro | null; // null = sem troca automática
  candidatos: string[]; // nomes na base
}

export const GRUPOS: Readonly<Record<string, GrupoSubstituicao>> = {
  carb_refeicao: {
    rotulo: 'Carboidrato (refeição)',
    ref: 'c',
    candidatos: [
      'Arroz, tipo 1, cozido',
      'Batata, inglesa, cozida',
      'Batata, doce, cozida',
      'Mandioca, cozida',
      'Batata, baroa, cozida',
      'Cuscuz, de milho, cozido com sal',
    ],
  },
  carb_lanche: {
    rotulo: 'Carboidrato (café/lanche)',
    ref: 'c',
    candidatos: [
      'Pão de forma tradicional (genérico)',
      'Pão, trigo, francês',
      'Pão, trigo, forma, integral',
      'Cuscuz, de milho, cozido com sal',
      'Biscoito, salgado, cream cracker',
      'Batata, doce, cozida',
    ],
  },
  proteina: {
    rotulo: 'Proteína',
    ref: 'p',
    candidatos: [
      'Frango, peito, sem pele, grelhado',
      'Carne, bovina, patinho, sem gordura, grelhado',
      'Porco, lombo, assado',
      'Peru, congelado, assado',
      'Carne, bovina, acém, moído, cozido',
      'Ovo, de galinha, inteiro, cozido/10minutos',
    ],
  },
  proteina_cafe: {
    rotulo: 'Proteína (café)',
    ref: 'p',
    candidatos: [
      'Ovo, de galinha, inteiro, frito',
      'Ovo, de galinha, inteiro, cozido/10minutos',
      'Ovo, de galinha, clara, cozida/10minutos',
      'Queijo, minas, frescal',
      'Queijo, ricota',
      'Peito de peru defumado (genérico)',
    ],
  },
  queijo_frios: {
    rotulo: 'Queijo/frios',
    ref: 'p',
    candidatos: [
      'Queijo, minas, frescal',
      'Queijo, ricota',
      'Queijo, mozarela',
      'Queijo, prato',
      'Peito de peru defumado (genérico)',
      'Presunto, sem capa de gordura',
    ],
  },
  lacteo: {
    rotulo: 'Iogurte/leite',
    ref: 'p',
    candidatos: ['Iogurte, natural, desnatado', 'Iogurte, natural', 'Leite de vaca desnatado UHT (genérico)'],
  },
  fruta: {
    rotulo: 'Fruta',
    ref: 'kcal',
    candidatos: [
      'Banana, prata, crua',
      'Maçã, Fuji, com casca, crua',
      'Mamão, Papaia, cru',
      'Manga, Tommy Atkins, crua',
      'Laranja, pêra, crua',
      'Abacaxi, cru',
      'Uva, Itália, crua',
      'Morango, cru',
      'Melancia, crua',
    ],
  },
  gordura: {
    rotulo: 'Oleaginosa',
    ref: 'kcal',
    candidatos: [
      'Castanha-de-caju, torrada, salgada',
      'Castanha-do-Brasil, crua',
      'Amendoim, torrado, salgado',
      'Noz, crua',
    ],
  },
  livre: { rotulo: 'À vontade / sem troca', ref: null, candidatos: [] },
  suplemento: { rotulo: 'Suplemento (sem troca automática)', ref: null, candidatos: [] },
};

export type Tolerancias = Record<Macro, { menos: number; mais: number }>;

// Parâmetros editáveis (preferencias.tolerancias_subst)
export const TOLERANCIA_PADRAO: Tolerancias = {
  p: { menos: 0.4, mais: 0.25 },
  c: { menos: 0.25, mais: 0.15 },
  kcal: { menos: 0.1, mais: 0.1 },
};

// "Não como" do usuário (preferencias.nao_come): cada termo exclui os candidatos que o contêm. "peixe" também
// exclui os peixes comuns da TACO pelo nome.
const SINONIMOS: Record<string, string[]> = {
  peixe: [
    'peixe',
    'atum',
    'sardinha',
    'salmao',
    'tilapia',
    'merluza',
    'pescada',
    'bacalhau',
    'cacao',
    'corvina',
  ],
};
export function excluido(nomeAlimento: string, naoCome: readonly string[]): boolean {
  const n = normalizarNome(nomeAlimento);
  return naoCome.some((termo) => {
    const t = semAcento(termo).toLowerCase().trim();
    if (!t) return false;
    return (SINONIMOS[t] ?? [t]).some((x) => n.includes(normalizarNome(x)));
  });
}

const arred = (g: number) => (g < 20 ? Math.round(g) : Math.round(g / 5) * 5);
const umaCasa = (x: number) => +x.toFixed(1);

export interface OpcaoSubstituicao {
  alimento: Alimento;
  gramas: number;
  kcal: number;
  p: number;
  c: number;
  g: number;
  difKcal: number; // % em relação ao original
  doNutricionista: boolean;
}

export interface ResultadoSubstituicao {
  grupo: string;
  referencia: Macro | null;
  original: { kcal: number; p: number; c: number; g: number };
  opcoes: OpcaoSubstituicao[];
}

export function substituir(
  alimento: Alimento,
  gramas: number,
  opts: {
    naoCome?: readonly string[];
    tolerancias?: Tolerancias;
    max?: number;
    doNutricionista?: { alimento: Alimento; gramas: number }[]; // têm prioridade (10.3)
  } = {},
): ResultadoSubstituicao {
  const naoCome = opts.naoCome ?? [];
  const tol = opts.tolerancias ?? TOLERANCIA_PADRAO;
  const grupo = alimento.grupo ? GRUPOS[alimento.grupo] : undefined;
  const o = nutrientes(alimento, gramas);
  const original = { kcal: Math.round(o.kcal), p: umaCasa(o.p), c: umaCasa(o.c), g: umaCasa(o.g) };
  const montar = (a: Alimento, g: number, doNutricionista: boolean): OpcaoSubstituicao => {
    const n = nutrientes(a, g);
    return {
      alimento: a,
      gramas: g,
      kcal: Math.round(n.kcal),
      p: umaCasa(n.p),
      c: umaCasa(n.c),
      g: umaCasa(n.g),
      difKcal: o.kcal ? Math.round(((n.kcal - o.kcal) / o.kcal) * 100) : 0,
      doNutricionista,
    };
  };
  const doNutri = (opts.doNutricionista ?? []).map((x) => montar(x.alimento, x.gramas, true));
  if (!grupo || !grupo.ref)
    return { grupo: grupo?.rotulo ?? 'Sem grupo', referencia: null, original, opcoes: doNutri };

  const ref = grupo.ref;
  const alvo = o[ref];
  const calculadas: OpcaoSubstituicao[] = [];
  for (const nome of grupo.candidatos) {
    if (nome === alimento.nome || excluido(nome, naoCome)) continue;
    const cand = alimentoPorNome(nome);
    const porGrama = cand?.[ref];
    if (!cand || !porGrama) continue;
    const g = arred((alvo / porGrama) * 100);
    if (!g) continue;
    const dk = (nutrientes(cand, g).kcal - o.kcal) / o.kcal;
    if (dk < -tol[ref].menos || dk > tol[ref].mais) continue;
    calculadas.push(montar(cand, g, false));
  }
  calculadas.sort((a, b) => Math.abs(a.difKcal) - Math.abs(b.difKcal));
  return {
    grupo: grupo.rotulo,
    referencia: ref,
    original,
    opcoes: [...doNutri, ...calculadas].slice(0, opts.max ?? 5),
  };
}

export const AVISO_SUBSTITUICOES =
  'Substituições calculadas pela TACO; não substituem a orientação do seu nutricionista.';
