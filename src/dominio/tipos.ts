// Tipos do domínio, sem ids nem persistência (os ids nascem em dados/ ao salvar o plano).

export interface Faixa {
  min: number;
  max: number;
}

export type AlvoSeries = 'todos' | 'foco' | 'iso';

export interface Fase {
  de: number;
  ate: number;
  rir: Faixa | null;
  rirIso: Faixa | null;
  deload: boolean;
  volume: number; // 1 = volume normal; 0.5 = deload com metade das séries
  series: { delta: number; alvo: AlvoSeries } | null;
}

export interface Progressao {
  tipo: string;
  rir: Faixa;
  carga: Faixa; // % de aumento
  estagnado: number; // semanas
}

export interface ExercicioImportado {
  nome: string; // nome base exibido, com acentos
  variantes: string[];
  chaves: string[]; // paralelo a variantes
  series: number;
  reps: Faixa; // segundos quando porTempo
  porTempo: boolean;
  descanso: Faixa | null; // segundos
  rir: Faixa | null; // RIR fixo do exercício
  iso: boolean;
  foco: boolean;
  grupo: number | null; // n de SSn
}

export interface SessaoImportada {
  nome: string;
  dia: number | null; // 0 = domingo … 6 = sábado
  itens: ExercicioImportado[];
}

export interface CardioPrescrito {
  tipos: string[];
  frequencia: string;
  minutos: Faixa;
  fc: Faixa | null;
  intensidade: string | null;
}

export interface PlanoImportado {
  versaoFormato: number;
  nome: string;
  autor: string;
  data: string | null; // AAAA-MM-DD
  progressao: Progressao;
  bloco: { semanas: number; fases: Fase[] } | null;
  sessoes: SessaoImportada[];
  cardio: CardioPrescrito[];
}

// linha = número da linha dentro do bloco TREINO (0 = mensagem global)
export interface Mensagem {
  linha: number;
  msg: string;
  texto?: string;
}
