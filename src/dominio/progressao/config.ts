// Parâmetros do motor de carga (BRIEFING 7.3). Um único objeto, com os nomes da seção.

export interface ConfigProgressao {
  pausaDias: number; // ≥ 3 semanas sem o exercício → volta mais leve
  reducaoPausa: number; // −10% no retorno
  quedaLimite: number; // e1RM ≥ 5% abaixo da referência...
  quedaSessoes: number; // ...em 2 treinos seguidos → reduz
  reducaoQueda: number; // −5%
  aumentoMin: number; // +2% a +5% (regra do plano)
  aumentoMax: number;
  aumentoFolga: number; // topo com folga grande (2+ reps ou RIR acima do alvo)
  toleranciaRir: number; // o RIR anotado erra ~1 rep: tolerância de 1
  estagnadoSemanas: number; // vem de PROGRESSAO.estagnado
}

export const CONFIG_PROGRESSAO: Readonly<ConfigProgressao> = {
  pausaDias: 21,
  reducaoPausa: 0.1,
  quedaLimite: 0.05,
  quedaSessoes: 2,
  reducaoQueda: 0.05,
  aumentoMin: 0.02,
  aumentoMax: 0.05,
  aumentoFolga: 0.075,
  toleranciaRir: 1,
  estagnadoSemanas: 3,
};
