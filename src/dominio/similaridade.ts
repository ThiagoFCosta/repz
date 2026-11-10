// Similaridade de nomes para sugerir vínculo entre exercícios de planos diferentes (BRIEFING seção 8).

export function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const janela = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const casouA = new Array<boolean>(a.length).fill(false);
  const casouB = new Array<boolean>(b.length).fill(false);
  let casados = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - janela); j <= Math.min(b.length - 1, i + janela); j++) {
      if (casouB[j] || a[i] !== b[j]) continue;
      casouA[i] = casouB[j] = true;
      casados++;
      break;
    }
  }
  if (!casados) return 0;
  let k = 0;
  let trocas = 0;
  for (let i = 0; i < a.length; i++) {
    if (!casouA[i]) continue;
    while (!casouB[k]) k++;
    if (a[i] !== b[k]) trocas++;
    k++;
  }
  return (casados / a.length + casados / b.length + (casados - trocas / 2) / casados) / 3;
}

export function jaroWinkler(a: string, b: string): number {
  const j = jaro(a, b);
  let prefixo = 0;
  while (prefixo < 4 && prefixo < a.length && a[prefixo] === b[prefixo]) prefixo++;
  return j + prefixo * 0.1 * (1 - j);
}

export const LIMITE_VINCULO = 0.85;

export interface Candidato {
  chave: string;
  semelhanca: number;
}

// Para uma chave nova, as chaves existentes parecidas, da mais parecida para a menos
export function candidatosVinculo(
  nova: string,
  existentes: Iterable<string>,
  limite = LIMITE_VINCULO,
): Candidato[] {
  const out: Candidato[] = [];
  for (const chave of existentes) {
    if (chave === nova) continue;
    const semelhanca = jaroWinkler(nova, chave);
    if (semelhanca >= limite) out.push({ chave, semelhanca });
  }
  return out.sort((x, y) => y.semelhanca - x.semelhanca);
}
