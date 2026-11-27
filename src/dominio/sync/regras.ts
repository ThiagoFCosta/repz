// Regras puras da sincronização (ARCHITECTURE 8.3-8.5).

// Ordem de envio: quem é referenciado sobe antes de quem referencia
export const ORDEM_ENVIO = [
  'planos_treino',
  'config_exercicio',
  'checkins',
  'treinos',
  'sugestoes',
  'series',
  'cardio',
  'preferencias',
] as const;
export type TabelaRemota = (typeof ORDEM_ENVIO)[number];

// Last-write-wins por linha. A versão local só vence se estiver pendente e for mais nova que a do servidor.
export function venceLocal(localPendenteEm: string | null, remotoAtualizadoEm: string): boolean {
  return localPendenteEm != null && Date.parse(localPendenteEm) > Date.parse(remotoAtualizadoEm);
}

// Espera exponencial entre tentativas depois de erro de rede: 5 s, 10 s, 20 s… até 5 min
export function esperaMs(tentativas: number): number {
  return Math.min(5_000 * 2 ** Math.max(0, tentativas - 1), 300_000);
}
