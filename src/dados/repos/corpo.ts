// Corpo (BRIEFING-v2 9): pesagens, bioimpedância e medidas com fita.

import type { RepzDb } from '../db';
import type { BioLocal, FitaLocal, PesoLocal } from '../tipos';

export const listarPesos = (db: RepzDb) => db.pesos.orderBy('data').toArray();
export const listarBio = (db: RepzDb) => db.bio.orderBy('data').toArray();
export const listarFita = (db: RepzDb) => db.fita.orderBy('data').toArray();

export async function salvarPeso(db: RepzDb, m: PesoLocal): Promise<void> {
  await db.pesos.put(m);
}
export async function salvarBio(db: RepzDb, m: BioLocal): Promise<void> {
  await db.bio.put(m);
}
export async function salvarFita(db: RepzDb, ms: FitaLocal[]): Promise<void> {
  await db.fita.bulkPut(ms);
}
export async function excluirPeso(db: RepzDb, id: string): Promise<void> {
  await db.pesos.delete(id);
}
