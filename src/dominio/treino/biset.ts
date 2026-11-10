// Bi-sets e ordem dos itens (ARCHITECTURE 7.3). Rodada k de um grupo = membros com séries totais ≥ k.

import type { EstadoTreino } from './maquina';

type Base = Pick<EstadoTreino, 'itens' | 'alvo' | 'feitas' | 'extras' | 'pulados'>;

export const totalSeries = (e: Base, i: number) => (e.alvo[i] ?? 0) + (e.extras[i] ?? 0);
export const restantes = (e: Base, i: number) => totalSeries(e, i) - (e.feitas[i] ?? 0);

export const concluido = (e: Base, i: number) => e.pulados.includes(i) || restantes(e, i) <= 0;

// Membros do grupo do item, em ordem (só o próprio item, se não for bi-set)
export function membros(e: Base, i: number): number[] {
  const g = e.itens[i]?.grupo;
  if (g == null) return [i];
  return e.itens.flatMap((it, j) => (it.grupo === g ? [j] : []));
}

const pendentes = (e: Base, i: number) => membros(e, i).filter((j) => !concluido(e, j));

// Rodada atual do grupo (1-based) e o total de rodadas
export function rodada(e: Base, i: number): { atual: number; total: number } {
  const ms = membros(e, i);
  const total = Math.max(...ms.map((j) => totalSeries(e, j)));
  const p = pendentes(e, i);
  const atual = p.length ? Math.min(...p.map((j) => e.feitas[j] ?? 0)) + 1 : total;
  return { atual: Math.min(atual, total), total };
}

/**
 * Depois de concluir uma série do item x: o seguinte do grupo nesta rodada, sem descanso.
 * null = a rodada acabou (ou x não é bi-set).
 */
export function seguinteNaRodada(e: Base, x: number): number | null {
  if (e.itens[x]?.grupo == null) return null;
  const k = e.feitas[x] ?? 0; // rodada que x acabou de fazer
  return pendentes(e, x).find((j) => j > x && (e.feitas[j] ?? 0) === k - 1) ?? null;
}

// Primeiro do grupo a fazer na próxima rodada (o mais atrasado, na ordem do plano)
export function inicioDaRodada(e: Base, i: number): number | null {
  const p = pendentes(e, i);
  if (!p.length) return null;
  const menor = Math.min(...p.map((j) => e.feitas[j] ?? 0));
  return p.find((j) => (e.feitas[j] ?? 0) === menor)!;
}

/**
 * Próximo item fora do grupo de `atual`: o primeiro depois dele que não está concluído nem pulado;
 * se não houver, o primeiro anterior ainda pendente (quando o usuário usou "ir para"). null = acabou.
 */
export function proximoItem(e: Base, atual: number): number | null {
  const grupo = new Set(membros(e, atual));
  const livres = e.itens.map((_, j) => j).filter((j) => !grupo.has(j) && !concluido(e, j));
  return livres.find((j) => j > atual) ?? livres[0] ?? null;
}

// Descanso do grupo, em segundos (o máximo entre os membros)
export function descansoDoGrupo(e: Base, i: number): number {
  return Math.max(...membros(e, i).map((j) => e.itens[j]?.descanso ?? 0));
}
