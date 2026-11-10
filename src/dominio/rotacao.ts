// Rotação de sessões (BRIEFING 6.3): a próxima é a seguinte, na ordem do plano, à última concluída.

/**
 * @param sessoes          sessões do plano, em ordem
 * @param ultimaConcluida  sessaoId do último treino concluído deste plano (null sem histórico)
 * @returns índice da sessão sugerida (circular); sem histórico, a primeira
 */
export function proximaSessao(sessoes: readonly { id: string }[], ultimaConcluida: string | null): number {
  if (sessoes.length === 0) return -1;
  const i = ultimaConcluida == null ? -1 : sessoes.findIndex((s) => s.id === ultimaConcluida);
  return (i + 1) % sessoes.length;
}
