// Log de sugestões do motor (BRIEFING-v2 8.2, D39): um registro por exercício por treino.

import type { RepzDb } from '../db';
import type { RegistroSugestao } from '../tipos';

export async function salvarSugestoes(db: RepzDb, regs: RegistroSugestao[]): Promise<void> {
  if (regs.length) await db.sugestoes.bulkPut(regs);
}

export async function sugestoesDoTreino(db: RepzDb, treinoId: string): Promise<RegistroSugestao[]> {
  return db.sugestoes.where('treinoId').equals(treinoId).toArray();
}

export async function listarSugestoes(db: RepzDb): Promise<RegistroSugestao[]> {
  return db.sugestoes.toArray();
}
