// Base de alimentos: TACO 4ª ed. (NEPA/UNICAMP, reprodução permitida com citação) + itens de rótulo genérico.
import fs from 'node:fs';
const n = (v) => (typeof v === 'number' ? v : v === 'Tr' ? 0 : null); // "Tr" = traços; "*"/"NA" = sem dado
export const TACO = JSON.parse(fs.readFileSync(new URL('./taco.json', import.meta.url))).map((t) => ({
  id: `taco:${t.id}`, nome: t.description, fonte: 'TACO 4ª ed.',
  kcal: n(t.energy_kcal), p: n(t.protein_g), c: n(t.carbohydrate_g), g: n(t.lipid_g), fibra: n(t.fiber_g),
}));
// Itens que não existem na TACO ou estão sem dado nela: valores de rótulo genérico, editáveis no app.
export const ROTULO = [
  { id: 'rot:whey', nome: 'Whey protein (concentrado, genérico)', fonte: 'rótulo genérico', kcal: 400, p: 80, c: 10, g: 6.7 },
  { id: 'rot:peru', nome: 'Peito de peru defumado (genérico)', fonte: 'rótulo genérico', kcal: 100, p: 17, c: 4, g: 1.7 },
  { id: 'rot:paoforma', nome: 'Pão de forma tradicional (genérico)', fonte: 'rótulo genérico', kcal: 260, p: 8.4, c: 48, g: 3.4 },
  { id: 'rot:leitedesn', nome: 'Leite de vaca desnatado UHT (genérico)', fonte: 'rótulo genérico', kcal: 33, p: 3.1, c: 4.7, g: 0.2 },
];
export const BASE = [...TACO, ...ROTULO];
export const porNome = (nome) => BASE.find((a) => a.nome === nome);

// Vínculo NutriDiet → base. Na v2, isto vira: alias salvo + busca aproximada + confirmação na revisão.
export const ALIAS = {
  'pão de forma industrializado de qualquer marca': 'Pão de forma tradicional (genérico)',
  'ovo de galinha - frito(a)': 'Ovo, de galinha, inteiro, frito',
  'queijo mussarela': 'Queijo, mozarela',
  'café': 'Café, infusão 10%',
  'banana, prata, crua': 'Banana, prata, crua',
  'castanha de caju': 'Castanha-de-caju, torrada, salgada',
  'castanha do pará': 'Castanha-do-Brasil, crua',
  'arroz (branco, polido, parboilizado, agulha, agulhinha, etc.)': 'Arroz, tipo 1, cozido',
  'filé de frango - grelhado(a)/brasa/churrasco': 'Frango, peito, sem pele, grelhado',
  'alface': 'Alface, crespa, crua',
  'tomate': 'Tomate, com semente, cru',
  'salada, de legumes, cozida no vapor': 'Salada, de legumes, cozida no vapor',
  'queijo minas, frescal': 'Queijo, minas, frescal',
  'peito de peru': 'Peito de peru defumado (genérico)',
  'iogurte, natural, desnatado': 'Iogurte, natural, desnatado',
  'morango': 'Morango, cru',
  'whey protein': 'Whey protein (concentrado, genérico)',
  'leite de vaca desnatado': 'Leite de vaca desnatado UHT (genérico)',
  'aveia em flocos': 'Aveia, flocos, crua',
};
export const vincular = (nomeNutri) => porNome(ALIAS[nomeNutri.toLowerCase().trim()]) || null;
