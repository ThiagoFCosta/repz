// Configuração por exercício: salto de carga, foco e vínculo entre chaves (apelidos).

import type { RepzDb } from '../db';
import type { ConfigExercicio } from '../tipos';

export type MapaConfig = Map<string, ConfigExercicio>;

const vazia = (chave: string): ConfigExercicio => ({
  chave,
  incrementoKg: null,
  foco: null,
  apelidoDe: null,
});

export async function lerConfigs(db: RepzDb): Promise<MapaConfig> {
  return new Map((await db.configExercicios.toArray()).map((c) => [c.chave, c]));
}

async function alterar(db: RepzDb, chave: string, mudanca: Partial<ConfigExercicio>): Promise<void> {
  await db.transaction('rw', db.configExercicios, async () => {
    const atual = (await db.configExercicios.get(chave)) ?? vazia(chave);
    await db.configExercicios.put({ ...atual, ...mudanca, chave });
  });
}

export const definirIncremento = (db: RepzDb, chave: string, kg: number | null) =>
  alterar(db, chave, { incrementoKg: kg });

export const definirFoco = (db: RepzDb, chave: string, foco: boolean | null) => alterar(db, chave, { foco });

// Chave canônica: segue apelidoDe até a raiz (com proteção contra ciclo)
export function canonica(configs: MapaConfig, chave: string): string {
  const vistas = new Set<string>();
  let atual = chave;
  while (!vistas.has(atual)) {
    vistas.add(atual);
    const prox = configs.get(atual)?.apelidoDe;
    if (!prox) return atual;
    atual = prox;
  }
  return chave; // ciclo: trata como sem vínculo
}

// Todas as chaves que representam o mesmo exercício que `chave`
export function chavesEquivalentes(
  configs: MapaConfig,
  chave: string,
  conhecidas: Iterable<string>,
): string[] {
  const raiz = canonica(configs, chave);
  const todas = new Set([chave, raiz, ...conhecidas, ...configs.keys()]);
  return [...todas].filter((k) => canonica(configs, k) === raiz);
}

// "Supino reto c barra" (nova) é o mesmo que "supino reto barra" (com histórico)
export async function vincular(db: RepzDb, nova: string, existente: string): Promise<void> {
  const configs = await lerConfigs(db);
  if (canonica(configs, existente) === nova) throw new Error('Esse vínculo criaria um ciclo.');
  await alterar(db, nova, { apelidoDe: existente });
}

export const desvincular = (db: RepzDb, chave: string) => alterar(db, chave, { apelidoDe: null });
