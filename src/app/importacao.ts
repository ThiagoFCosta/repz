// Fluxo de importação: arquivo/texto → parser → revisão → salvar (BRIEFING 9.1 e 9.2).

import { signal } from '@preact/signals';
import { agoraISO } from '../dominio/datas';
import { parse, type ResultadoParse } from '../dominio/formato/parser';
import { salvarPlano, TreinoEmAndamentoError } from '../dados/repos/planos';
import { extrairTextoPdf } from '../pdf/extrair';
import { db, mostrarAviso, recarregar } from './estado';

export interface Importacao {
  etapa: 'lendo' | 'pronto';
  origem: 'pdf' | 'texto';
  arquivoNome: string | null;
  erroLeitura: string | null; // PDF ilegível / sem texto: o parser nem rodou
  resultado: ResultadoParse | null;
}

export const importacao = signal<Importacao | null>(null);

export async function importarPdf(arquivo: File): Promise<void> {
  importacao.value = {
    etapa: 'lendo',
    origem: 'pdf',
    arquivoNome: arquivo.name,
    erroLeitura: null,
    resultado: null,
  };
  try {
    const texto = await extrairTextoPdf(arquivo);
    importacao.value = { ...importacao.value, etapa: 'pronto', resultado: parse(texto) };
  } catch (e) {
    console.error(e);
    importacao.value = {
      ...importacao.value,
      etapa: 'pronto',
      erroLeitura: e instanceof Error ? e.message : 'Não foi possível ler o PDF.',
    };
  }
}

export function importarTexto(texto: string): void {
  importacao.value = {
    etapa: 'pronto',
    origem: 'texto',
    arquivoNome: null,
    erroLeitura: null,
    resultado: parse(texto),
  };
}

export function limparImportacao(): void {
  importacao.value = null;
}

// Salva o plano revisado; devolve a mensagem de erro, se houver
export async function salvarRevisao(
  inicioBloco: string | null,
  vinculos: Record<string, string>,
): Promise<string | null> {
  const r = importacao.value?.resultado;
  if (!r?.plano) return 'Nada para salvar: importe o plano de novo.';
  try {
    await salvarPlano(db, {
      importado: r.plano,
      inicioBloco,
      textoOriginal: r.textoBloco,
      arquivoNome: importacao.value?.arquivoNome ?? null,
      avisos: r.avisos,
      vinculos,
      importadoEm: agoraISO(new Date()),
    });
  } catch (e) {
    if (e instanceof TreinoEmAndamentoError) return e.message;
    console.error(e);
    return 'Não foi possível salvar o plano. Tente de novo.';
  }
  await recarregar();
  limparImportacao();
  mostrarAviso('Plano salvo e ativo');
  return null;
}
