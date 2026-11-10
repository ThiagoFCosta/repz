// Backup completo em JSON e restauração (BRIEFING 10, ARCHITECTURE 5.4).
// O backup leva tudo o que o usuário criou: planos, treinos (inclusive descartados, D6), séries,
// cardio, configuração por exercício, preferências e o plano ativo. A proteção do armazenamento
// (meta.persistencia) é do aparelho e não viaja.
// Restaurar é bloqueado com treino em andamento (D21); mesclar só acrescenta, nunca apaga (D22).

import { diasEntre, type ISODate, type ISODateTime } from '../dominio/datas';
import { VERSAO_SCHEMA, type RepzDb } from './db';
import { gravarMeta, lerMeta, lerPreferencias } from './repos/meta';
import {
  PREFERENCIAS_PADRAO,
  type CardioRealizado,
  type ConfigExercicio,
  type Plano,
  type Preferencias,
  type SerieRealizada,
  type Treino,
} from './tipos';

export const APP_BACKUP = 'app-treino';

export interface Backup {
  app: typeof APP_BACKUP;
  versaoSchema: number;
  exportadoEm: ISODateTime;
  planoAtivoId: string | null;
  planos: Plano[];
  treinos: Treino[];
  series: SerieRealizada[];
  cardio: CardioRealizado[];
  configExercicios: ConfigExercicio[];
  preferencias: Preferencias;
}

export class BackupInvalidoError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'BackupInvalidoError';
  }
}

export class RestauracaoBloqueadaError extends Error {
  constructor() {
    super('Há um treino em andamento. Conclua ou descarte o treino antes de restaurar um backup.');
    this.name = 'RestauracaoBloqueadaError';
  }
}

const tabelas = (db: RepzDb) => [db.planos, db.treinos, db.series, db.cardio, db.configExercicios, db.meta];

// O backup já sai com `ultimoBackup = exportadoEm`: restaurá-lo devolve o estado de logo depois
// da exportação. O banco só registra o backup depois de o arquivo ser salvo (marcarBackup).
export async function gerarBackup(db: RepzDb, exportadoEm: ISODateTime): Promise<Backup> {
  return db.transaction('r', tabelas(db), async () => {
    const [planoAtivoId, preferencias, planos, treinos, series, cardio, configExercicios] = await Promise.all(
      [
        lerMeta(db, 'planoAtivoId'),
        lerPreferencias(db),
        db.planos.toArray(),
        db.treinos.toArray(),
        db.series.toArray(),
        db.cardio.toArray(),
        db.configExercicios.toArray(),
      ],
    );
    return {
      app: APP_BACKUP,
      versaoSchema: VERSAO_SCHEMA,
      exportadoEm,
      planoAtivoId,
      planos,
      treinos,
      series,
      cardio,
      configExercicios,
      preferencias: { ...preferencias, ultimoBackup: exportadoEm },
    };
  });
}

export async function marcarBackup(db: RepzDb, em: ISODateTime): Promise<void> {
  await db.transaction('rw', db.meta, async () => {
    await gravarMeta(db, 'preferencias', { ...(await lerPreferencias(db)), ultimoBackup: em });
  });
}

// ---- Leitura e migração (puras) ----

type Json = Record<string, unknown>;

// Migração do backup da versão n para n + 1, as mesmas regras do db.version(n + 1).upgrade().
// Vazio enquanto o schema estiver na v1.
const MIGRACOES: Record<number, (b: Json) => Json> = {};

const ehObjeto = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);

const LISTAS = {
  planos: ['id', 'planos'],
  treinos: ['id', 'treinos'],
  series: ['id', 'séries'],
  cardio: ['id', 'cardio'],
  configExercicios: ['chave', 'configurações de exercício'],
} as const;

/**
 * Valida e leva um backup lido de JSON até a versão atual do schema, sem tocar no banco.
 * Recusa arquivo de outro app, sem versão ou de versão futura, e listas malformadas.
 */
export function migrarBackup(json: unknown): Backup {
  if (!ehObjeto(json) || json.app !== APP_BACKUP)
    throw new BackupInvalidoError('Este arquivo não é um backup do REPZ.');
  const versao = json.versaoSchema;
  if (typeof versao !== 'number' || !Number.isInteger(versao) || versao < 1)
    throw new BackupInvalidoError('O backup não informa uma versão válida dos dados.');
  if (versao > VERSAO_SCHEMA)
    throw new BackupInvalidoError(
      `Este backup foi feito numa versão mais nova do REPZ (dados v${versao}; este app lê até a v${VERSAO_SCHEMA}). Atualize o app e tente de novo.`,
    );

  let b: Json = json;
  for (let v = versao; v < VERSAO_SCHEMA; v++) b = MIGRACOES[v]!(b);

  for (const [lista, [chave, nome]] of Object.entries(LISTAS)) {
    const itens = b[lista];
    if (!Array.isArray(itens) || !itens.every((x) => ehObjeto(x) && typeof x[chave] === 'string'))
      throw new BackupInvalidoError(`Backup incompleto ou corrompido: a lista de ${nome} não pôde ser lida.`);
  }
  if (typeof b.exportadoEm !== 'string')
    throw new BackupInvalidoError('Backup incompleto ou corrompido: falta a data da exportação.');

  const planos = b.planos as Plano[];
  const ativo = typeof b.planoAtivoId === 'string' ? b.planoAtivoId : null;
  return {
    app: APP_BACKUP,
    versaoSchema: VERSAO_SCHEMA,
    exportadoEm: b.exportadoEm,
    // sem plano ativo informado (ou apontando para um que não veio), usa o importado por último
    planoAtivoId: planos.some((p) => p.id === ativo)
      ? ativo
      : ([...planos].sort((x, y) => y.importadoEm.localeCompare(x.importadoEm))[0]?.id ?? null),
    planos,
    treinos: b.treinos as Treino[],
    series: b.series as SerieRealizada[],
    cardio: b.cardio as CardioRealizado[],
    configExercicios: b.configExercicios as ConfigExercicio[],
    preferencias: { ...PREFERENCIAS_PADRAO, ...(ehObjeto(b.preferencias) ? b.preferencias : {}) },
  };
}

export interface ResumoBackup {
  exportadoEm: ISODateTime;
  planoAtivo: string | null; // nome
  planos: number;
  treinos: number; // não descartados
  series: number;
  cardio: number;
  periodo: { de: ISODate; ate: ISODate } | null; // treinos e cardio
}

export function resumirBackup(b: Backup): ResumoBackup {
  const treinos = b.treinos.filter((t) => t.status !== 'descartado');
  const validos = new Set(treinos.map((t) => t.id));
  const datas = [...treinos.map((t) => t.data), ...b.cardio.map((c) => c.data)].sort();
  return {
    exportadoEm: b.exportadoEm,
    planoAtivo: b.planos.find((p) => p.id === b.planoAtivoId)?.nome ?? null,
    planos: b.planos.length,
    treinos: treinos.length,
    series: b.series.filter((s) => validos.has(s.treinoId)).length,
    cardio: b.cardio.length,
    periodo: datas.length ? { de: datas[0]!, ate: datas.at(-1)! } : null,
  };
}

// ---- Restauração ----

export type ModoRestauracao = 'substituir' | 'mesclar';

export interface Perdas {
  treinos: number; // treinos deste aparelho (não descartados) que não estão no backup
  cardio: number;
}

// O que "Substituir tudo" apagaria sem ter cópia no backup (mostrado na confirmação)
export async function perdasAoSubstituir(db: RepzDb, b: Backup): Promise<Perdas> {
  const noBackupT = new Set(b.treinos.map((t) => t.id));
  const noBackupC = new Set(b.cardio.map((c) => c.id));
  const [treinos, cardio] = await Promise.all([db.treinos.toArray(), db.cardio.toCollection().primaryKeys()]);
  return {
    treinos: treinos.filter((t) => t.status !== 'descartado' && !noBackupT.has(t.id)).length,
    cardio: cardio.filter((id) => !noBackupC.has(id)).length,
  };
}

export interface Acrescimos {
  planos: number;
  treinos: number;
  series: number;
  cardio: number;
}

async function semTreinoAberto(db: RepzDb): Promise<void> {
  if (await db.treinos.where('status').equals('em_andamento').count()) throw new RestauracaoBloqueadaError();
}

// Substituir tudo: o banco fica igual ao do backup, numa transação (ou tudo, ou nada)
async function substituir(db: RepzDb, b: Backup): Promise<Acrescimos> {
  await db.transaction('rw', tabelas(db), async () => {
    await semTreinoAberto(db);
    await Promise.all([
      db.planos.clear(),
      db.treinos.clear(),
      db.series.clear(),
      db.cardio.clear(),
      db.configExercicios.clear(),
      db.meta.bulkDelete(['planoAtivoId', 'preferencias']),
    ]);
    await db.planos.bulkAdd(b.planos);
    await db.treinos.bulkAdd(b.treinos);
    await db.series.bulkAdd(b.series);
    await db.cardio.bulkAdd(b.cardio);
    await db.configExercicios.bulkAdd(b.configExercicios);
    if (b.planoAtivoId) await gravarMeta(db, 'planoAtivoId', b.planoAtivoId);
    await gravarMeta(db, 'preferencias', b.preferencias);
  });
  return {
    planos: b.planos.length,
    treinos: b.treinos.length,
    series: b.series.length,
    cardio: b.cardio.length,
  };
}

async function faltam<T>(
  tabela: { toCollection(): { primaryKeys(): PromiseLike<string[]> } },
  itens: readonly T[],
  chave: (x: T) => string,
): Promise<T[]> {
  const existentes = new Set(await tabela.toCollection().primaryKeys());
  return itens.filter((x) => !existentes.has(chave(x)));
}

// Mesclar: acrescenta o que não existe aqui (por id; configuração por chave). O que já existe
// neste aparelho prevalece, inclusive preferências e plano ativo (o do backup só vale se não houver).
async function mesclar(db: RepzDb, b: Backup): Promise<Acrescimos> {
  return db.transaction('rw', tabelas(db), async () => {
    await semTreinoAberto(db);
    const planos = await faltam(db.planos, b.planos, (p) => p.id);
    const treinos = await faltam(db.treinos, b.treinos, (t) => t.id);
    const series = await faltam(db.series, b.series, (s) => s.id);
    const cardio = await faltam(db.cardio, b.cardio, (c) => c.id);
    const configs = await faltam(db.configExercicios, b.configExercicios, (c) => c.chave);
    await db.planos.bulkAdd(planos);
    await db.treinos.bulkAdd(treinos);
    await db.series.bulkAdd(series);
    await db.cardio.bulkAdd(cardio);
    await db.configExercicios.bulkAdd(configs);
    if (!(await lerMeta(db, 'planoAtivoId')) && b.planoAtivoId)
      await gravarMeta(db, 'planoAtivoId', b.planoAtivoId);
    return { planos: planos.length, treinos: treinos.length, series: series.length, cardio: cardio.length };
  });
}

export function restaurarBackup(db: RepzDb, b: Backup, modo: ModoRestauracao): Promise<Acrescimos> {
  return modo === 'substituir' ? substituir(db, b) : mesclar(db, b);
}

// ---- Lembrete no Início (9.9) ----

export const DIAS_LEMBRETE_BACKUP = 30;

// Último backup há mais de 30 dias, ou nunca feito com pelo menos 1 treino concluído
export function precisaLembrete(ultimoBackup: ISODateTime | null, treinos: number, hoje: ISODate): boolean {
  if (!ultimoBackup) return treinos > 0;
  return diasEntre(ultimoBackup.slice(0, 10), hoje) > DIAS_LEMBRETE_BACKUP;
}
