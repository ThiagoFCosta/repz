// Planos: salvar o plano importado (com ids), ativar e ajustar a semana do bloco.

import type { ISODate } from '../../dominio/datas';
import type { Mensagem, PlanoImportado } from '../../dominio/tipos';
import { novoId, type RepzDb } from '../db';
import type { Plano } from '../tipos';
import { canonica, lerConfigs } from './config';
import { gravarMeta, lerMeta } from './meta';

export class TreinoEmAndamentoError extends Error {
  constructor() {
    super('Há um treino em andamento. Conclua ou descarte o treino antes de trocar o plano.');
    this.name = 'TreinoEmAndamentoError';
  }
}

export interface DadosSalvarPlano {
  importado: PlanoImportado;
  inicioBloco: ISODate | null;
  textoOriginal: string;
  arquivoNome: string | null;
  avisos: Mensagem[];
  vinculos: Record<string, string>; // chave nova → chave existente
  importadoEm: string;
}

export function montarPlano(d: DadosSalvarPlano): Plano {
  const p = d.importado;
  return {
    id: novoId(),
    nome: p.nome,
    autor: p.autor,
    dataPlano: p.data,
    importadoEm: d.importadoEm,
    inicioBloco: p.bloco ? d.inicioBloco : null,
    ajusteSemana: 0,
    progressao: p.progressao,
    bloco: p.bloco,
    sessoes: p.sessoes.map((s) => ({
      ...s,
      id: novoId(),
      itens: s.itens.map((e) => ({ ...e, id: novoId() })),
    })),
    cardio: p.cardio,
    textoOriginal: d.textoOriginal,
    arquivoNome: d.arquivoNome,
    avisosImportacao: d.avisos,
  };
}

// Salva e ativa o plano numa transação; o anterior fica inativo e o histórico continua.
export async function salvarPlano(db: RepzDb, d: DadosSalvarPlano): Promise<Plano> {
  const plano = montarPlano(d);
  await db.transaction('rw', [db.planos, db.meta, db.treinos, db.configExercicios], async () => {
    if (await db.treinos.where('status').equals('em_andamento').count()) throw new TreinoEmAndamentoError();
    const configs = await lerConfigs(db);
    for (const [nova, existente] of Object.entries(d.vinculos)) {
      if (canonica(configs, existente) === nova) continue; // evita ciclo
      const atual = configs.get(nova) ?? { chave: nova, incrementoKg: null, foco: null, apelidoDe: null };
      await db.configExercicios.put({ ...atual, apelidoDe: existente });
    }
    await db.planos.add(plano);
    await gravarMeta(db, 'planoAtivoId', plano.id);
  });
  return plano;
}

export async function planoAtivo(db: RepzDb): Promise<Plano | null> {
  const id = await lerMeta(db, 'planoAtivoId');
  return id ? ((await db.planos.get(id)) ?? null) : null;
}

// Do mais recente para o mais antigo
export async function listarPlanos(db: RepzDb): Promise<Plano[]> {
  return db.planos.orderBy('importadoEm').reverse().toArray();
}

export async function ajustarSemana(db: RepzDb, id: string, delta: number): Promise<void> {
  await db.planos
    .where('id')
    .equals(id)
    .modify((p) => {
      p.ajusteSemana += delta;
    });
}

export async function definirInicioBloco(db: RepzDb, id: string, inicio: ISODate): Promise<void> {
  // Mudar a data zera o ajuste manual: a semana passa a sair só da data
  await db.planos.update(id, { inicioBloco: inicio, ajusteSemana: 0 });
}
