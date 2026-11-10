// Números na interface usam vírgula decimal; no armazenamento, ponto (BRIEFING seção 2).

// '82,5' | '82.5' | ' 82 ' → 82.5 | 82; texto inválido ou vazio → null
export function lerDecimal(txt: string): number | null {
  const t = txt.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return parseFloat(t);
}

// 82.5 → '82,5'; 80 → '80'; arredonda a 2 casas para esconder ruído de ponto flutuante
export function formatarDecimal(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

export function formatarKg(n: number): string {
  return `${formatarDecimal(n)} kg`;
}
