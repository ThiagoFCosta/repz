// Base de alimentos (BRIEFING-v2 10.2): TACO 4ª ed. + rótulos genéricos, embutida (base.gerado.ts) com os mesmos
// ids da tabela `alimentos` do Supabase. "Tr" (traços) = 0; sem dado na fonte = null.

import { semAcento } from '../formato/normalizar.ts';
import { BASE_GERADA } from './base.gerado.ts';

export interface Alimento {
  id: string;
  nome: string;
  fonte: 'taco' | 'rotulo' | 'usuario';
  kcal: number | null; // por 100 g
  p: number | null;
  c: number | null;
  g: number | null;
  grupo: string | null; // grupo de substituição
}

export const BASE: readonly Alimento[] = BASE_GERADA.map(([id, nome, fonte, kcal, p, c, g, grupo]) => ({
  id,
  nome,
  fonte,
  kcal,
  p,
  c,
  g,
  grupo,
}));

const porId = new Map(BASE.map((a) => [a.id, a]));
const porNomeMapa = new Map(BASE.map((a) => [a.nome, a]));

export const alimentoPorId = (id: string, extras: readonly Alimento[] = []) =>
  extras.find((a) => a.id === id) ?? porId.get(id) ?? null;
export const alimentoPorNome = (nome: string) => porNomeMapa.get(nome) ?? null;

// Texto do NutriDiet ou da busca → chave de comparação (sem acento, minúsculas, só letras e números)
export function normalizarNome(s: string): string {
  return semAcento(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Busca simples por palavras (todas presentes), para trocar o vínculo na revisão
export function buscarAlimentos(texto: string, extras: readonly Alimento[] = [], limite = 20): Alimento[] {
  const palavras = normalizarNome(texto).split(' ').filter(Boolean);
  if (!palavras.length) return [];
  return [...extras, ...BASE]
    .filter((a) => {
      const n = normalizarNome(a.nome);
      return palavras.every((p) => n.includes(p));
    })
    .slice(0, limite);
}

export interface Nutrientes {
  kcal: number;
  p: number;
  c: number;
  g: number;
}

export function nutrientes(a: Alimento, gramas: number): Nutrientes {
  const f = gramas / 100;
  return { kcal: (a.kcal ?? 0) * f, p: (a.p ?? 0) * f, c: (a.c ?? 0) * f, g: (a.g ?? 0) * f };
}
