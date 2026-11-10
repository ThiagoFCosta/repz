// Datas locais do aparelho (D7). O domínio nunca lê o relógio: recebe `agora` por parâmetro.

export type ISODate = string; // 'AAAA-MM-DD'
export type ISODateTime = string; // ISO 8601 com offset local

const dois = (n: number) => String(n).padStart(2, '0');

export function hojeLocal(agora: Date): ISODate {
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}

// '2026-11-09T19:42:10-03:00'
export function agoraISO(agora: Date): ISODateTime {
  const off = -agora.getTimezoneOffset();
  const sinal = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return (
    `${hojeLocal(agora)}T${dois(agora.getHours())}:${dois(agora.getMinutes())}:${dois(agora.getSeconds())}` +
    `${sinal}${dois(Math.floor(abs / 60))}:${dois(abs % 60)}`
  );
}

// Datas sem hora são tratadas em UTC só para contar dias (sem efeito de horário de verão)
const emDias = (d: ISODate) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;

export function diasEntre(de: ISODate, ate: ISODate): number {
  return Math.round(emDias(ate) - emDias(de));
}

export function somarDias(d: ISODate, n: number): ISODate {
  const x = new Date((emDias(d) + n) * 86_400_000);
  return `${x.getUTCFullYear()}-${dois(x.getUTCMonth() + 1)}-${dois(x.getUTCDate())}`;
}

// 0 = domingo … 6 = sábado
export function diaDaSemana(d: ISODate): number {
  return new Date(emDias(d) * 86_400_000).getUTCDay();
}

// Próxima segunda-feira estritamente depois de hoje (padrão do início do bloco, 6.1)
export function proximaSegunda(hoje: ISODate): ISODate {
  const dia = diaDaSemana(hoje);
  return somarDias(hoje, (8 - dia) % 7 || 7);
}

export function ehDataValida(d: string): d is ISODate {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && somarDias(d, 0) === d;
}

// '2026-11-10' → '10/11/2026'; com curta = true → '10/11'
export function dataBR(d: ISODate, curta = false): string {
  const [a, m, dd] = d.split('-');
  return curta ? `${dd}/${m}` : `${dd}/${m}/${a}`;
}

export const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;
