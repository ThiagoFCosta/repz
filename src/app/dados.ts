// Exportar (PDF, CSV, backup) e restaurar backup (BRIEFING 9.9 e 10). O backup só conta como feito
// (ultimoBackup) depois de o arquivo ser compartilhado ou baixado; cancelar o compartilhamento não conta.

import { signal } from '@preact/signals';
import { agoraISO } from '../dominio/datas';
import {
  gerarBackup,
  marcarBackup,
  migrarBackup,
  perdasAoSubstituir,
  restaurarBackup,
  resumirBackup,
  type Acrescimos,
  type Backup,
  type ModoRestauracao,
  type Perdas,
  type ResumoBackup,
} from '../dados/backup';
import { entregar, arquivo, type ResultadoEntrega } from '../dados/compartilhar';
import { csvCardio, csvSeries } from '../dados/csv';
import { conteudoPdf, gerarPdf } from '../dados/pdf-export';
import { restaurarTreino, sessaoEscolhida } from './controlador-treino';
import { configs, db, hoje, mostrarAviso, planoAtivo, planos, recarregar } from './estado';

// No download, avisa onde o arquivo foi parar; o menu de compartilhar já é a confirmação
function avisarDownload(r: ResultadoEntrega, msg: string): void {
  if (r === 'baixado') mostrarAviso(msg);
}

export async function exportarBackup(): Promise<void> {
  const em = agoraISO(new Date());
  const b = await gerarBackup(db, em);
  const r = await entregar([arquivo('backup', hoje.value, JSON.stringify(b))], 'Backup do REPZ');
  if (r === 'cancelado') return;
  await marcarBackup(db, em);
  await recarregar();
  mostrarAviso(r === 'baixado' ? 'Backup salvo em Downloads.' : 'Backup feito.');
}

export async function exportarCsv(): Promise<void> {
  const [series, cardio] = await Promise.all([csvSeries(db), csvCardio(db)]);
  const r = await entregar(
    [arquivo('series', hoje.value, series), arquivo('cardio', hoje.value, cardio)],
    'Planilhas do REPZ',
  );
  avisarDownload(r, 'Planilhas salvas em Downloads.');
}

export async function exportarPdf(): Promise<void> {
  const c = await conteudoPdf(db, configs.value, planos.value, planoAtivo.value, hoje.value);
  const r = await entregar([arquivo('historico', hoje.value, await gerarPdf(c))], 'Histórico do REPZ');
  avisarDownload(r, 'PDF salvo em Downloads.');
}

// ---- Restaurar ----

export interface BackupLido {
  nomeArquivo: string;
  backup: Backup;
  resumo: ResumoBackup;
  perdas: Perdas; // o que "Substituir tudo" apagaria sem cópia no backup
}

export async function lerBackup(f: File): Promise<BackupLido> {
  let json: unknown;
  try {
    json = JSON.parse(await f.text());
  } catch {
    throw new Error('Não foi possível ler o arquivo: ele não é um backup do REPZ (.json).');
  }
  const backup = migrarBackup(json);
  return {
    nomeArquivo: f.name,
    backup,
    resumo: resumirBackup(backup),
    perdas: await perdasAoSubstituir(db, backup),
  };
}

export const restaurando = signal(false);

export async function restaurar(b: Backup, modo: ModoRestauracao): Promise<Acrescimos> {
  restaurando.value = true;
  try {
    const r = await restaurarBackup(db, b, modo);
    sessaoEscolhida.value = null;
    await recarregar();
    await restaurarTreino(); // o backup pode trazer um treino em andamento
    return r;
  } finally {
    restaurando.value = false;
  }
}
