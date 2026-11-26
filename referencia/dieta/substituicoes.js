// Substituições calculadas: equivalência pelo macro de referência do grupo, base TACO.
import { porNome } from './alimentos.js';

export const GRUPOS = {
  carb_refeicao: { ref: 'c', rotulo: 'Carboidrato (refeição)', candidatos: ['Arroz, tipo 1, cozido', 'Batata, inglesa, cozida', 'Batata, doce, cozida', 'Mandioca, cozida', 'Batata, baroa, cozida', 'Cuscuz, de milho, cozido com sal'] },
  carb_lanche:   { ref: 'c', rotulo: 'Carboidrato (café/lanche)', candidatos: ['Pão de forma tradicional (genérico)', 'Pão, trigo, francês', 'Pão, trigo, forma, integral', 'Cuscuz, de milho, cozido com sal', 'Biscoito, salgado, cream cracker', 'Batata, doce, cozida'] },
  proteina:      { ref: 'p', rotulo: 'Proteína', candidatos: ['Frango, peito, sem pele, grelhado', 'Carne, bovina, patinho, sem gordura, grelhado', 'Porco, lombo, assado', 'Peru, congelado, assado', 'Carne, bovina, acém, moído, cozido', 'Ovo, de galinha, inteiro, cozido/10minutos'] },
  proteina_cafe: { ref: 'p', rotulo: 'Proteína (café)', candidatos: ['Ovo, de galinha, inteiro, frito', 'Ovo, de galinha, inteiro, cozido/10minutos', 'Ovo, de galinha, clara, cozida/10minutos', 'Queijo, minas, frescal', 'Queijo, ricota', 'Peito de peru defumado (genérico)'] },
  queijo_frios:  { ref: 'p', rotulo: 'Queijo/frios', candidatos: ['Queijo, minas, frescal', 'Queijo, ricota', 'Queijo, mozarela', 'Queijo, prato', 'Peito de peru defumado (genérico)', 'Presunto, sem capa de gordura'] },
  lacteo:        { ref: 'p', rotulo: 'Iogurte/leite', candidatos: ['Iogurte, natural, desnatado', 'Iogurte, natural', 'Leite de vaca desnatado UHT (genérico)'] },
  fruta:         { ref: 'kcal', rotulo: 'Fruta', candidatos: ['Banana, prata, crua', 'Maçã, Fuji, com casca, crua', 'Mamão, Papaia, cru', 'Manga, Tommy Atkins, crua', 'Laranja, pêra, crua', 'Abacaxi, cru', 'Uva, Itália, crua', 'Morango, cru', 'Melancia, crua'] },
  gordura:       { ref: 'kcal', rotulo: 'Oleaginosa', candidatos: ['Castanha-de-caju, torrada, salgada', 'Castanha-do-Brasil, crua', 'Amendoim, torrado, salgado', 'Noz, crua'] },
  livre:         { ref: null, rotulo: 'À vontade / sem troca' },
  suplemento:    { ref: null, rotulo: 'Suplemento (sem troca automática)' },
};
// Grupo de cada alimento base (na v2: coluna `grupo` na tabela de alimentos; editável).
export const GRUPO_DE = {
  'Arroz, tipo 1, cozido': 'carb_refeicao', 'Pão de forma tradicional (genérico)': 'carb_lanche', 'Aveia, flocos, crua': 'carb_lanche',
  'Frango, peito, sem pele, grelhado': 'proteina', 'Ovo, de galinha, inteiro, frito': 'proteina_cafe', 'Peito de peru defumado (genérico)': 'queijo_frios',
  'Queijo, mozarela': 'queijo_frios', 'Queijo, minas, frescal': 'queijo_frios', 'Iogurte, natural, desnatado': 'lacteo', 'Leite de vaca desnatado UHT (genérico)': 'lacteo',
  'Banana, prata, crua': 'fruta', 'Morango, cru': 'fruta', 'Castanha-de-caju, torrada, salgada': 'gordura', 'Castanha-do-Brasil, crua': 'gordura',
  'Alface, crespa, crua': 'livre', 'Tomate, com semente, cru': 'livre', 'Salada, de legumes, cozida no vapor': 'livre', 'Café, infusão 10%': 'livre',
  'Whey protein (concentrado, genérico)': 'suplemento',
};
export const NAO_COME = [/feij[aã]o/i, /abacate/i, /arroz, integral/i, /peixe|atum|sardinha|salm[aã]o|til[aá]pia|merluza|pescada/i];

export const nutrientes = (a, gramas) => ({ kcal: a.kcal * gramas / 100, p: a.p * gramas / 100, c: a.c * gramas / 100, g: a.g * gramas / 100 });
const arred = (g) => (g < 20 ? Math.round(g) : Math.round(g / 5) * 5);

// Tolerância de kcal assimétrica: trocar por algo mais magro é aceitável; mais calórico, pouco.
export const TOLERANCIA = { p: { menos: 0.40, mais: 0.25 }, c: { menos: 0.25, mais: 0.15 }, kcal: { menos: 0.10, mais: 0.10 } };
export function substituir(alimento, gramas, { max = 5, naoCome = NAO_COME } = {}) {
  const grupo = GRUPOS[GRUPO_DE[alimento.nome]];
  if (!grupo || !grupo.ref) return { grupo: grupo?.rotulo ?? 'sem grupo', opcoes: [] };
  const orig = nutrientes(alimento, gramas);
  const alvo = orig[grupo.ref];
  const opcoes = [];
  for (const nome of grupo.candidatos) {
    if (nome === alimento.nome || naoCome.some((r) => r.test(nome))) continue;
    const cand = porNome(nome);
    if (!cand || !cand[grupo.ref]) continue;
    const g = arred(alvo / cand[grupo.ref] * 100);
    if (!g) continue;
    const n = nutrientes(cand, g);
    const dk = (n.kcal - orig.kcal) / orig.kcal;
    const tol = TOLERANCIA[grupo.ref];
    if (dk < -tol.menos || dk > tol.mais) continue;
    opcoes.push({ nome, gramas: g, kcal: Math.round(n.kcal), p: +n.p.toFixed(1), c: +n.c.toFixed(1), g: +n.g.toFixed(1), difKcal: Math.round(dk * 100) });
  }
  opcoes.sort((a, b) => Math.abs(a.difKcal) - Math.abs(b.difKcal));
  return { grupo: grupo.rotulo, referencia: grupo.ref, original: { kcal: Math.round(orig.kcal), p: +orig.p.toFixed(1), c: +orig.c.toFixed(1), g: +orig.g.toFixed(1) }, opcoes: opcoes.slice(0, max) };
}
