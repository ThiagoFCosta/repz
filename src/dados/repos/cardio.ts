// Cardio realizado (BRIEFING 9.7). Independe do treino de força.

import type { RepzDb } from '../db';
import type { CardioRealizado } from '../tipos';

// Do mais recente ao mais antigo
export async function listarCardio(db: RepzDb): Promise<CardioRealizado[]> {
  const todos = await db.cardio.toArray();
  return todos.sort((a, b) => b.data.localeCompare(a.data) || b.feitoEm.localeCompare(a.feitoEm));
}

export async function salvarCardio(db: RepzDb, c: CardioRealizado): Promise<void> {
  await db.cardio.put(c);
}

export async function excluirCardio(db: RepzDb, id: string): Promise<void> {
  await db.cardio.delete(id);
}
