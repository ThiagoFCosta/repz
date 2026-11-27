// Banco IndexedDB (Dexie). Cada versão de schema fica declarada aqui, com a migração em migracoes/.

import Dexie, { type EntityTable } from 'dexie';
import { middlewareSincronia, chaveMarca, type MarcaSincronia } from './sincronia';

// Stores que existiam na v2 do Dexie (a migração v1 → v2 marca o que já havia nelas)
const STORES_V2 = ['planos', 'treinos', 'series', 'cardio', 'configExercicios', 'meta'];
import type {
  CardioRealizado,
  CheckinLocal,
  ConfigExercicio,
  Meta,
  Plano,
  RegistroSugestao,
  SerieRealizada,
  Treino,
} from './tipos';

export const NOME_DB = 'repz';

export class RepzDb extends Dexie {
  planos!: EntityTable<Plano, 'id'>;
  treinos!: EntityTable<Treino, 'id'>;
  series!: EntityTable<SerieRealizada, 'id'>;
  cardio!: EntityTable<CardioRealizado, 'id'>;
  configExercicios!: EntityTable<ConfigExercicio, 'chave'>;
  meta!: EntityTable<Meta, 'chave'>;
  sincronia!: EntityTable<MarcaSincronia, 'chave'>;
  checkins!: EntityTable<CheckinLocal, 'data'>;
  sugestoes!: EntityTable<RegistroSugestao, 'id'>;

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
    // v2 (V2 · sincronização): marca de cada registro que precisa subir para o Supabase (src/dados/sincronia.ts).
    // O que já existia no aparelho fica pendente: sobe na 1ª sincronização.
    this.version(2)
      .stores({ sincronia: 'chave, pendente, store' })
      .upgrade(async (tx) => {
        const agora = new Date().toISOString();
        const marcas: MarcaSincronia[] = [];
        for (const store of STORES_V2) {
          const ids = (await tx.table(store).toCollection().primaryKeys()) as string[];
          for (const id of ids)
            if (store !== 'meta' || id === 'preferencias' || id === 'planoAtivoId')
              marcas.push({
                chave: chaveMarca(store, id),
                store,
                id,
                pendente: 1,
                excluido: false,
                modificadoEm: agora,
              });
        }
        await tx.table('sincronia').bulkPut(marcas);
      });
    // v3 (V3 · check-in de prontidão): um por dia, chave = data
    this.version(3).stores({ checkins: 'data' });
    // v4 (V4 · motor v2): log de cada sugestão (BRIEFING-v2 8.2, D39)
    this.version(4).stores({ sugestoes: 'id, treinoId' });
    this.use(middlewareSincronia);
  }
}

// Versão do formato dos dados de treino (backup). A store `sincronia` (Dexie v2) não entra no backup.
export const VERSAO_SCHEMA = 1;

export function novoId(): string {
  return crypto.randomUUID();
}
