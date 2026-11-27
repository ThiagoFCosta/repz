// Check-in de prontidão (BRIEFING-v2 7.3): um por dia, chave = data.

import type { ISODate } from '../../dominio/datas';
import type { RepzDb } from '../db';
import type { CheckinLocal } from '../tipos';

export async function salvarCheckin(db: RepzDb, c: CheckinLocal): Promise<void> {
  await db.checkins.put(c);
}

export async function checkinDoDia(db: RepzDb, data: ISODate): Promise<CheckinLocal | null> {
  return (await db.checkins.get(data)) ?? null;
}

// Os mais recentes primeiro
export async function listarCheckins(db: RepzDb, limite = 60): Promise<CheckinLocal[]> {
  return db.checkins.orderBy('data').reverse().limit(limite).toArray();
}
