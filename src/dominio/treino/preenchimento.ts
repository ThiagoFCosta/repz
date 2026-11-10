// Pré-preenchimento da série atual (BRIEFING 7.6 e 9.4): carga sugerida e reps.
// Depois da 1ª série do exercício no treino, vale o que o usuário fez na série anterior.

import type { Sugestao, TreinoHistorico } from '../progressao/motor';
import type { Faixa } from '../tipos';

export interface Preenchimento {
  kg: number | null; // null = sem referência (calibrar): o usuário digita
  reps: number;
}

/**
 * @param sug       sugestão do motor para a variante
 * @param feitas    séries de trabalho já feitas neste treino, no exercício e na variante, em ordem
 * @param presc     faixa de reps da prescrição e se o exercício é por tempo
 * @param ultimo    último treino do exercício (por tempo: a carga vem dele)
 */
export function preencher(
  sug: Sugestao,
  feitas: readonly { kg: number; reps: number }[],
  presc: { reps: Faixa; porTempo?: boolean },
  ultimo?: TreinoHistorico,
): Preenchimento {
  const n = feitas.length;
  const anterior = feitas[n - 1];
  const reps = presc.reps;
  const doUltimo = ultimo?.series.length ? Math.max(...ultimo.series.map((s) => s.kg)) : null;
  // Por tempo sem referência: peso do corpo (0 kg), para não travar o "Concluir" num campo vazio
  const semRef = presc.porTempo ? 0 : null;
  const kg = anterior?.kg ?? sug.carga ?? (sug.acao === 'calibrar' ? semRef : (doUltimo ?? semRef));
  const r = sug.repsSugeridas?.[n] ?? anterior?.reps ?? sug.repsSugeridas?.at(-1) ?? reps.min;
  return { kg, reps: r };
}
