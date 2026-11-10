// Banco IndexedDB (Dexie). Cada versão de schema fica declarada aqui, com a migração em migracoes/.

import Dexie, { type EntityTable } from 'dexie';
import type { CardioRealizado, ConfigExercicio, Meta, Plano, SerieRealizada, Treino } from './tipos';

export const NOME_DB = 'repz';

export class RepzDb extends Dexie {
  planos!: EntityTable<Plano, 'id'>;
  treinos!: EntityTable<Treino, 'id'>;
  series!: EntityTable<SerieRealizada, 'id'>;
  cardio!: EntityTable<CardioRealizado, 'id'>;
  configExercicios!: EntityTable<ConfigExercicio, 'chave'>;
  meta!: EntityTable<Meta, 'chave'>;

  constructor(nome = NOME_DB) {
    super(nome);
    // v1 (M2). Ao mudar o schema: nova db.version(n) com .upgrade(), migração em migracoes/vN.ts,
    // fixture tests/fixtures/backup-v(n-1).json e teste de migração.
    this.version(1).stores({
      planos: 'id, importadoEm',
      treinos: 'id, data, status, [planoId+status]',
      series: 'id, treinoId, [chave+feitaEm]',
      cardio: 'id, data',
      configExercicios: 'chave, apelidoDe',
      meta: 'chave',
    });
  }
}

export const VERSAO_SCHEMA = 1;

export function novoId(): string {
  return crypto.randomUUID();
}
