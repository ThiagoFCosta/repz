// Normalização de texto vindo de PDF ou colado de chat (BRIEFING 5.3).

// Remove acentos (usado para casar palavras-chave e gerar a chave do exercício).
export function semAcento(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

// Limpa a linha mantendo os acentos: o nome exibido continua "Elevação lateral".
export function normalizar(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[\u2010-\u2015\u2212]/g, '-') // hífens, travessões e sinal de menos
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ') // espaços especiais
    .replace(/[\uff5c\u00a6\u2502]/g, '|') // ｜ ¦ │
    .replace(/\s+/g, ' ')
    .trim();
}

// Chave de identidade do exercício: é ela que liga o histórico entre planos diferentes.
export function chaveExercicio(nome: string): string {
  return semAcento(normalizar(nome))
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
