import type { RepzDb } from '../db';
import { PREFERENCIAS_PADRAO, type MetaValores, type Preferencias } from '../tipos';

const PADRAO: MetaValores = {
  planoAtivoId: null,
  preferencias: PREFERENCIAS_PADRAO,
  persistencia: 'indisponivel',
};

export async function lerMeta<K extends keyof MetaValores>(db: RepzDb, chave: K): Promise<MetaValores[K]> {
  const linha = await db.meta.get(chave);
  return linha ? (linha.valor as MetaValores[K]) : PADRAO[chave];
}

export async function gravarMeta<K extends keyof MetaValores>(
  db: RepzDb,
  chave: K,
  valor: MetaValores[K],
): Promise<void> {
  await db.meta.put({ chave, valor });
}

export async function lerPreferencias(db: RepzDb): Promise<Preferencias> {
  return { ...PREFERENCIAS_PADRAO, ...(await lerMeta(db, 'preferencias')) };
}
