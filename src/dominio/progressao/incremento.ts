// Salto padrão do equipamento (BRIEFING 7.1): 2 kg para halteres, 2,5 kg para o resto.
export function incrementoPadrao(nome: string): number {
  return /halter/i.test(nome) ? 2 : 2.5;
}
