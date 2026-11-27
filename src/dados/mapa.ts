// Registro local (tipos da v1, camelCase) ↔ linha do Postgres (snake_case), ARCHITECTURE 7.3 e 8.
// Horários do servidor voltam no formato local da v1 (com o fuso do aparelho), para as comparações de texto e o
// "hoje" da v1 continuarem iguais.

import { agoraISO } from '../dominio/datas';
import { uuidv5 } from '../dominio/sync/uuid';
import type { LinhaRemota } from '../remoto/tipos';
import {
  PREFERENCIAS_PADRAO,
  type CardioRealizado,
  type BioLocal,
  type CheckinLocal,
  type FitaLocal,
  type PesoLocal,
  type RegistroSugestao,
  type ConfigExercicio,
  type Plano,
  type Preferencias,
  type SerieRealizada,
  type Treino,
} from './tipos';

export type StoreSync =
  | 'planos'
  | 'treinos'
  | 'series'
  | 'cardio'
  | 'configExercicios'
  | 'meta'
  | 'checkins'
  | 'sugestoes'
  | 'pesos'
  | 'bio'
  | 'fita';

// Tabela remota de cada store (em meta, só as preferências viram linha; o plano ativo é planos_treino.ativo)
export const TABELA_DA_STORE: Record<StoreSync, string> = {
  planos: 'planos_treino',
  treinos: 'treinos',
  series: 'series',
  cardio: 'cardio',
  configExercicios: 'config_exercicio',
  meta: 'preferencias',
  checkins: 'checkins',
  sugestoes: 'sugestoes',
  pesos: 'medicoes_peso',
  bio: 'medicoes_bio',
  fita: 'medicoes_fita',
};

export const idConfig = (usuarioId: string, chave: string) =>
  uuidv5(`${usuarioId}|config_exercicio|${chave}`);
export const idPreferencias = (usuarioId: string) => uuidv5(`${usuarioId}|preferencias`);
export const idCheckin = (usuarioId: string, data: string) => uuidv5(`${usuarioId}|checkins|${data}`);

// id da linha remota de um registro local (config é por chave; preferências, uma por usuário)
export function idRemoto(store: StoreSync, idLocal: string, usuarioId: string): string {
  if (store === 'configExercicios') return idConfig(usuarioId, idLocal);
  if (store === 'meta') return idPreferencias(usuarioId);
  if (store === 'checkins') return idCheckin(usuarioId, idLocal);
  return idLocal;
}

const local = (iso: unknown) => (typeof iso === 'string' && iso ? agoraISO(new Date(iso)) : null);
const num = (v: unknown) => (v == null ? null : Number(v));
const txt = (v: unknown) => (v == null ? null : String(v));

export function paraRemoto(store: StoreSync, r: unknown, usuarioId: string, em: string): LinhaRemota {
  const base = { atualizado_em: em, excluido_em: null };
  switch (store) {
    case 'planos': {
      const p = r as Plano;
      return {
        ...base,
        id: p.id,
        nome: p.nome,
        autor: p.autor,
        data_plano: p.dataPlano,
        importado_em: p.importadoEm,
        inicio_bloco: p.inicioBloco,
        ajuste_semana: p.ajusteSemana,
        texto_original: p.textoOriginal,
        arquivo_nome: p.arquivoNome,
        estrutura: {
          progressao: p.progressao,
          bloco: p.bloco,
          sessoes: p.sessoes,
          cardio: p.cardio,
          avisosImportacao: p.avisosImportacao,
        },
      };
    }
    case 'treinos': {
      const t = r as Treino;
      return {
        ...base,
        id: t.id,
        plano_id: t.planoId,
        sessao_id: t.sessaoId,
        sessao_nome: t.sessaoNome,
        data: t.data,
        inicio: t.inicio,
        fim: t.fim,
        semana_bloco: t.semanaBloco,
        status: t.status,
        estado_ui: t.estadoUI,
        notas: t.notas,
        ultima_atividade: t.atualizadoEm,
      };
    }
    case 'series': {
      const s = r as SerieRealizada;
      return {
        ...base,
        id: s.id,
        treino_id: s.treinoId,
        exercicio_prescrito_id: s.exercicioPrescritoId,
        chave: s.chave,
        variante: s.variante,
        ordem: s.ordem,
        kg: s.kg,
        reps: s.reps,
        rir: s.rir,
        aquecimento: s.aquecimento,
        feita_em: s.feitaEm,
        sugestao_kg: s.sugestaoKg,
        sugestao_aceita: s.sugestaoAceita,
      };
    }
    case 'cardio': {
      const c = r as CardioRealizado;
      return {
        ...base,
        id: c.id,
        tipo: c.tipo,
        data: c.data,
        minutos: c.minutos,
        fc_media: c.fcMedia,
        distancia_km: c.distanciaKm,
        esforco: c.esforco,
        feito_em: c.feitoEm,
        kcal_relogio: c.kcalRelogio ?? null,
        nota: c.nota ?? null,
        origem: c.origem ?? 'manual',
      };
    }
    case 'sugestoes': {
      const g = r as RegistroSugestao;
      return {
        ...base,
        id: g.id,
        criado_em: g.criadoEm,
        treino_id: g.treinoId,
        exercicio_prescrito_id: g.exercicioPrescritoId,
        chave: g.chave,
        variante: g.variante,
        versao_motor: g.versaoMotor,
        versao_parametros: g.versaoParametros,
        regra: g.regra,
        entradas: g.entradas,
        prontidao: g.prontidao,
        acao: g.acao,
        carga: g.carga,
        motivo: g.motivo,
        alertas: g.alertas,
        carga_usada: g.cargaUsada,
        desfecho: g.desfecho,
        resultado: g.resultado,
      };
    }
    case 'pesos': {
      const m = r as PesoLocal;
      return {
        ...base,
        id: m.id,
        data: m.data,
        hora: m.hora,
        kg: m.kg,
        condicao: m.condicao,
        origem: m.origem,
      };
    }
    case 'bio': {
      const m = r as BioLocal;
      return {
        ...base,
        id: m.id,
        data: m.data,
        gordura_pct: m.gorduraPct,
        massa_gorda_kg: m.massaGordaKg,
        musculo_esq_kg: m.musculoEsqKg,
        agua_pct: m.aguaPct,
        origem: m.origem,
      };
    }
    case 'fita': {
      const m = r as FitaLocal;
      return { ...base, id: m.id, data: m.data, local: m.local, cm: m.cm };
    }
    case 'checkins': {
      const c = r as CheckinLocal;
      return {
        ...base,
        id: idCheckin(usuarioId, c.data),
        data: c.data,
        sono_horas: c.sonoHoras,
        disposicao: c.disposicao,
        pulado: c.pulado,
        origem: c.origem,
      };
    }
    case 'configExercicios': {
      const c = r as ConfigExercicio;
      return {
        ...base,
        id: idConfig(usuarioId, c.chave),
        chave: c.chave,
        incremento_kg: c.incrementoKg,
        foco: c.foco,
        apelido_de: c.apelidoDe,
      };
    }
    case 'meta': {
      const p = r as Preferencias;
      return {
        ...base,
        id: idPreferencias(usuarioId),
        nome_exibicao: p.nomeExibicao,
        som_descanso: p.somDescanso,
        vibrar: p.vibrar,
        manter_tela_ligada: p.manterTelaLigada,
        ultimo_backup: p.ultimoBackup,
      };
    }
  }
}

export interface RegistroLocal {
  store: StoreSync;
  id: string; // chave primária local
  registro: unknown;
}

// Linha do servidor → registro local. Preferências viram a meta 'preferencias'.
export function doRemoto(tabela: string, l: LinhaRemota): RegistroLocal | null {
  switch (tabela) {
    case 'planos_treino': {
      const e = (l.estrutura ?? {}) as Partial<Plano>;
      const p: Plano = {
        id: l.id,
        nome: String(l.nome),
        autor: String(l.autor ?? ''),
        dataPlano: txt(l.data_plano),
        importadoEm: local(l.importado_em)!,
        inicioBloco: txt(l.inicio_bloco),
        ajusteSemana: Number(l.ajuste_semana ?? 0),
        progressao: e.progressao!,
        bloco: e.bloco ?? null,
        sessoes: e.sessoes ?? [],
        cardio: e.cardio ?? [],
        textoOriginal: String(l.texto_original ?? ''),
        arquivoNome: txt(l.arquivo_nome),
        avisosImportacao: e.avisosImportacao ?? [],
      };
      return { store: 'planos', id: p.id, registro: p };
    }
    case 'treinos': {
      const t: Treino = {
        id: l.id,
        planoId: String(l.plano_id),
        sessaoId: String(l.sessao_id),
        sessaoNome: String(l.sessao_nome),
        data: String(l.data),
        inicio: local(l.inicio)!,
        fim: local(l.fim),
        semanaBloco: num(l.semana_bloco),
        status: l.status as Treino['status'],
        estadoUI: (l.estado_ui as Treino['estadoUI']) ?? null,
        notas: (l.notas as Treino['notas']) ?? {},
        atualizadoEm: local(l.ultima_atividade ?? l.atualizado_em)!,
      };
      return { store: 'treinos', id: t.id, registro: t };
    }
    case 'series': {
      const s: SerieRealizada = {
        id: l.id,
        treinoId: String(l.treino_id),
        exercicioPrescritoId: String(l.exercicio_prescrito_id),
        chave: String(l.chave),
        variante: String(l.variante),
        ordem: Number(l.ordem),
        kg: Number(l.kg),
        reps: Number(l.reps),
        rir: num(l.rir),
        aquecimento: Boolean(l.aquecimento),
        feitaEm: local(l.feita_em)!,
        sugestaoKg: num(l.sugestao_kg),
        sugestaoAceita: (l.sugestao_aceita as boolean | null) ?? null,
      };
      return { store: 'series', id: s.id, registro: s };
    }
    case 'cardio': {
      const c: CardioRealizado = {
        id: l.id,
        tipo: String(l.tipo),
        data: String(l.data),
        minutos: Number(l.minutos),
        fcMedia: num(l.fc_media),
        distanciaKm: num(l.distancia_km),
        esforco: num(l.esforco),
        feitoEm: local(l.feito_em)!,
        kcalRelogio: num(l.kcal_relogio),
        nota: txt(l.nota),
        origem: l.origem === 'print' ? 'print' : 'manual',
      };
      return { store: 'cardio', id: c.id, registro: c };
    }
    case 'sugestoes': {
      const g: RegistroSugestao = {
        id: l.id,
        treinoId: String(l.treino_id),
        exercicioPrescritoId: String(l.exercicio_prescrito_id),
        chave: String(l.chave),
        variante: String(l.variante),
        versaoMotor: String(l.versao_motor),
        versaoParametros: Number(l.versao_parametros),
        regra: String(l.regra),
        entradas: l.entradas as RegistroSugestao['entradas'],
        prontidao: (l.prontidao as RegistroSugestao['prontidao']) ?? null,
        acao: l.acao as RegistroSugestao['acao'],
        carga: num(l.carga),
        motivo: String(l.motivo),
        alertas: (l.alertas as string[] | null) ?? [],
        cargaUsada: num(l.carga_usada),
        desfecho: (l.desfecho as RegistroSugestao['desfecho']) ?? null,
        resultado: (l.resultado as RegistroSugestao['resultado']) ?? null,
        criadoEm: local(l.criado_em)!,
      };
      return { store: 'sugestoes', id: g.id, registro: g };
    }
    case 'medicoes_peso': {
      const m: PesoLocal = {
        id: l.id,
        data: String(l.data),
        hora: l.hora ? String(l.hora).slice(0, 5) : null,
        kg: Number(l.kg),
        condicao: l.condicao === 'jejum' ? 'jejum' : 'outra',
        origem: l.origem === 'print' ? 'print' : 'manual',
      };
      return { store: 'pesos', id: m.id, registro: m };
    }
    case 'medicoes_bio': {
      const m: BioLocal = {
        id: l.id,
        data: String(l.data),
        gorduraPct: num(l.gordura_pct),
        massaGordaKg: num(l.massa_gorda_kg),
        musculoEsqKg: num(l.musculo_esq_kg),
        aguaPct: num(l.agua_pct),
        origem: l.origem === 'print' ? 'print' : l.origem === 'manual' ? 'manual' : 'relogio',
      };
      return { store: 'bio', id: m.id, registro: m };
    }
    case 'medicoes_fita': {
      const m: FitaLocal = { id: l.id, data: String(l.data), local: String(l.local), cm: Number(l.cm) };
      return { store: 'fita', id: m.id, registro: m };
    }
    case 'checkins': {
      const c: CheckinLocal = {
        data: String(l.data),
        sonoHoras: num(l.sono_horas),
        disposicao: num(l.disposicao),
        pulado: Boolean(l.pulado),
        origem: l.origem === 'print' ? 'print' : 'manual',
      };
      return { store: 'checkins', id: c.data, registro: c };
    }
    case 'config_exercicio': {
      const c: ConfigExercicio = {
        chave: String(l.chave),
        incrementoKg: num(l.incremento_kg),
        foco: (l.foco as boolean | null) ?? null,
        apelidoDe: txt(l.apelido_de),
      };
      return { store: 'configExercicios', id: c.chave, registro: c };
    }
    case 'preferencias': {
      const p: Preferencias = {
        ...PREFERENCIAS_PADRAO,
        nomeExibicao: txt(l.nome_exibicao),
        somDescanso: Boolean(l.som_descanso ?? true),
        vibrar: Boolean(l.vibrar ?? true),
        manterTelaLigada: Boolean(l.manter_tela_ligada ?? true),
        ultimoBackup: local(l.ultimo_backup),
      };
      return { store: 'meta', id: 'preferencias', registro: { chave: 'preferencias', valor: p } };
    }
  }
  return null;
}
