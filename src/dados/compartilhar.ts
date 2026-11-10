// Entrega dos arquivos exportados (BRIEFING 10): menu de compartilhar do sistema (Web Share com
// arquivos) quando o navegador aceita aqueles arquivos; senão, download. O Chrome do Android não
// compartilha .json, então o backup cai no download (pasta Downloads).

import type { ISODate } from '../dominio/datas';

export type TipoArquivo = 'backup' | 'series' | 'cardio' | 'historico';

const EXTENSAO: Record<TipoArquivo, string> = {
  backup: 'json',
  series: 'csv',
  cardio: 'csv',
  historico: 'pdf',
};

export const MIME: Record<TipoArquivo, string> = {
  backup: 'application/json',
  series: 'text/csv',
  cardio: 'text/csv',
  historico: 'application/pdf',
};

// treino-backup-2026-11-10.json
export function nomeArquivo(tipo: TipoArquivo, hoje: ISODate): string {
  return `treino-${tipo}-${hoje}.${EXTENSAO[tipo]}`;
}

export function arquivo(tipo: TipoArquivo, hoje: ISODate, conteudo: BlobPart): File {
  return new File([conteudo], nomeArquivo(tipo, hoje), { type: MIME[tipo] });
}

export type ResultadoEntrega = 'compartilhado' | 'baixado' | 'cancelado';

function baixar(f: File): void {
  const url = URL.createObjectURL(f);
  const a = document.createElement('a');
  a.href = url;
  a.download = f.name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function entregar(arquivos: File[], titulo: string): Promise<ResultadoEntrega> {
  if (navigator.canShare?.({ files: arquivos })) {
    try {
      await navigator.share({ files: arquivos, title: titulo });
      return 'compartilhado';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelado';
      // NotAllowedError (o toque "expirou" enquanto o arquivo era gerado) e outros: baixa
    }
  }
  arquivos.forEach(baixar);
  return 'baixado';
}
