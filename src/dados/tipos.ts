// Tipos persistidos no IndexedDB (docs/ARCHITECTURE.md, seção 5.1).

import type { ISODate, ISODateTime } from '../dominio/datas';
import type { CardioPrescrito, ExercicioImportado, Fase, Mensagem, Progressao } from '../dominio/tipos';
import type { EstadoTreino } from '../dominio/treino/maquina';

export interface ExercicioPrescrito extends ExercicioImportado {
  id: string;
}

export interface SessaoTemplate {
  id: string;
  nome: string;
  dia: number | null;
  itens: ExercicioPrescrito[];
}

export interface Plano {
  id: string;
  nome: string;
  autor: string;
  dataPlano: ISODate | null;
  importadoEm: ISODateTime;
  inicioBloco: ISODate | null;
  ajusteSemana: number;
  progressao: Progressao;
  bloco: { semanas: number; fases: Fase[] } | null;
  sessoes: SessaoTemplate[]; // em ordem (rotação)
  cardio: CardioPrescrito[];
  textoOriginal: string;
  arquivoNome: string | null;
  avisosImportacao: Mensagem[];
}

export type StatusTreino = 'em_andamento' | 'concluido' | 'descartado';

export interface Treino {
  id: string;
  planoId: string;
  sessaoId: string;
  sessaoNome: string;
  data: ISODate;
  inicio: ISODateTime;
  fim: ISODateTime | null;
  semanaBloco: number | null;
  status: StatusTreino;
  estadoUI: EstadoTreino | null; // para retomar o treino depois de fechar o app
  notas: Record<string, string>;
  atualizadoEm: ISODateTime;
}

export interface SerieRealizada {
  id: string;
  treinoId: string;
  exercicioPrescritoId: string;
  chave: string;
  variante: string;
  ordem: number;
  kg: number;
  reps: number;
  rir: number | null;
  aquecimento: boolean;
  feitaEm: ISODateTime;
  sugestaoKg: number | null;
  sugestaoAceita: boolean | null;
}

export interface CardioRealizado {
  id: string;
  data: ISODate;
  tipo: string;
  minutos: number;
  fcMedia: number | null;
  distanciaKm: number | null;
  esforco: number | null;
  feitoEm: ISODateTime;
}

export interface ConfigExercicio {
  chave: string;
  incrementoKg: number | null; // null = padrão (halter 2 kg, senão 2,5 kg)
  foco: boolean | null; // null = o que veio do plano
  apelidoDe: string | null; // esta chave é a mesma que outra
}

export interface Preferencias {
  somDescanso: boolean;
  vibrar: boolean;
  manterTelaLigada: boolean;
  ultimoBackup: ISODateTime | null;
  nomeExibicao: string | null;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  somDescanso: true,
  vibrar: true,
  manterTelaLigada: true,
  ultimoBackup: null,
  nomeExibicao: null,
};

export type Persistencia = 'concedida' | 'negada' | 'indisponivel';

// Store chave-valor
export interface MetaValores {
  planoAtivoId: string | null;
  preferencias: Preferencias;
  persistencia: Persistencia;
}
export interface Meta<K extends keyof MetaValores = keyof MetaValores> {
  chave: K;
  valor: MetaValores[K];
}
