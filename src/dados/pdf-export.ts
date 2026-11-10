// Histórico em PDF (BRIEFING 10, ARCHITECTURE 9.3 / D5): período, resumo por exercício (melhor série,
// e1RM inicial → atual), tabela de treinos e de cardio. O jsPDF carrega sob demanda (import dinâmico):
// fica fora do JS inicial e entra no precache. Fonte padrão Helvetica (WinAnsi), que tem os acentos
// do português; caracteres fora do Latin-1 são trocados antes de escrever.

import { dataBR, type ISODate } from '../dominio/datas';
import { melhorPorSemana, melhorSerie, type MelhorSerie } from '../dominio/historico';
import { formatarDecimal } from '../dominio/numeros';
import { volume } from '../dominio/treino/resumo';
import type { RepzDb } from './db';
import { exerciciosComHistorico, historicoDoExercicio, indiceDeExercicios } from './historico-repo';
import type { MapaConfig } from './repos/config';
import type { CardioRealizado, Plano } from './tipos';

export interface LinhaExercicio {
  nome: string;
  porTempo: boolean;
  melhor: MelhorSerie | null;
  inicial: number | null; // e1RM (ou duração) da primeira semana com treino
  atual: number | null; // e da semana mais recente
}

export interface LinhaTreino {
  data: ISODate;
  sessao: string;
  exercicios: number;
  series: number; // de trabalho
  volume: number; // kg × reps
  minutos: number | null;
}

export interface ConteudoPdf {
  geradoEm: ISODate;
  periodo: { de: ISODate; ate: ISODate } | null;
  exercicios: LinhaExercicio[];
  treinos: LinhaTreino[]; // concluídos, em ordem cronológica
  cardio: CardioRealizado[]; // em ordem cronológica
}

export async function conteudoPdf(
  db: RepzDb,
  configs: MapaConfig,
  planos: readonly Plano[],
  planoAtivo: Plano | null,
  hoje: ISODate,
): Promise<ConteudoPdf> {
  const exercicios: LinhaExercicio[] = [];
  for (const ex of await exerciciosComHistorico(db, configs, planoAtivo)) {
    const h = await historicoDoExercicio(db, configs, planos, ex.chave);
    if (!h.treinos.length) continue; // só séries de treino em andamento
    const pontos = melhorPorSemana(h.treinos, h.porTempo);
    exercicios.push({
      nome: ex.nome,
      porTempo: h.porTempo,
      melhor: melhorSerie(h.treinos, h.porTempo),
      inicial: pontos[0]?.valor ?? null,
      atual: pontos.at(-1)?.valor ?? null,
    });
  }

  const indice = indiceDeExercicios(planos);
  const [concluidos, series, cardio] = await Promise.all([
    db.treinos.where('status').equals('concluido').toArray(),
    db.series.toArray(),
    db.cardio.toArray(),
  ]);
  const treinos = concluidos
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((t): LinhaTreino => {
      const doTreino = series
        .filter((s) => s.treinoId === t.id && !s.aquecimento)
        .map((s) => ({ ...s, porTempo: indice.get(s.exercicioPrescritoId)?.ex.porTempo ?? false }));
      return {
        data: t.data,
        sessao: t.sessaoNome,
        exercicios: new Set(doTreino.map((s) => s.exercicioPrescritoId)).size,
        series: doTreino.length,
        volume: volume(doTreino),
        minutos: t.fim ? Math.round((Date.parse(t.fim) - Date.parse(t.inicio)) / 60_000) : null,
      };
    });
  cardio.sort((a, b) => a.data.localeCompare(b.data) || a.feitoEm.localeCompare(b.feitoEm));

  const datas = [...treinos.map((t) => t.data), ...cardio.map((c) => c.data)].sort();
  return {
    geradoEm: hoje,
    periodo: datas.length ? { de: datas[0]!, ate: datas.at(-1)! } : null,
    exercicios: exercicios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    treinos,
    cardio,
  };
}

// ---- Desenho ----

const TROCAS: Record<string, string> = {
  '–': '-',
  '—': '-',
  '…': '...',
  '→': '->',
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
};

// Helvetica padrão só tem o Latin-1 (WinAnsi): troca o resto para não sair lixo no PDF
export function latin1(s: string): string {
  return [...s].map((c) => TROCAS[c] ?? (c.charCodeAt(0) <= 0xff ? c : '?')).join('');
}

const valor = (v: number | null, porTempo: boolean) =>
  v == null ? '' : porTempo ? `${formatarDecimal(v)} s` : `${formatarDecimal(v)} kg`;

export function textoMelhorSerie(m: MelhorSerie | null, porTempo: boolean): string {
  if (!m) return '';
  const serie = porTempo ? `${m.reps} s` : `${formatarDecimal(m.kg)} kg × ${m.reps}`;
  return `${serie} (${dataBR(m.data)})`;
}

const opc = (v: number | null, sufixo = '') => (v == null ? '' : `${formatarDecimal(v)}${sufixo}`);

interface Coluna {
  titulo: string;
  largura: number; // mm
  direita?: boolean;
}

type Doc = InstanceType<(typeof import('jspdf'))['jsPDF']>;

const MARGEM = 15;
const LIMITE_Y = 297 - 18;
const ALTURA_LINHA = 6;

function cortar(doc: Doc, t: string, largura: number): string {
  if (doc.getTextWidth(t) <= largura) return t;
  let s = t;
  while (s.length > 1 && doc.getTextWidth(`${s}...`) > largura) s = s.slice(0, -1);
  return `${s}...`;
}

function linha(doc: Doc, y: number, colunas: readonly Coluna[], celulas: readonly string[]): void {
  let x = MARGEM;
  colunas.forEach((c, i) => {
    const t = cortar(doc, latin1(celulas[i] ?? ''), c.largura - 2);
    if (c.direita) doc.text(t, x + c.largura - 1, y, { align: 'right' });
    else doc.text(t, x, y);
    x += c.largura;
  });
}

function cabecalhoTabela(doc: Doc, y: number, colunas: readonly Coluna[]): number {
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(90);
  linha(
    doc,
    y,
    colunas,
    colunas.map((c) => c.titulo),
  );
  const largura = colunas.reduce((t, c) => t + c.largura, 0);
  doc.setDrawColor(180).line(MARGEM, y + 2, MARGEM + largura, y + 2);
  doc.setFont('helvetica', 'normal').setTextColor(20);
  return y + ALTURA_LINHA + 1;
}

function tabela(doc: Doc, y: number, colunas: readonly Coluna[], linhas: readonly string[][]): number {
  y = cabecalhoTabela(doc, y, colunas);
  for (const l of linhas) {
    if (y > LIMITE_Y) {
      doc.addPage();
      y = cabecalhoTabela(doc, MARGEM + 5, colunas);
    }
    linha(doc, y, colunas, l);
    y += ALTURA_LINHA;
  }
  return y;
}

function secao(doc: Doc, y: number, titulo: string): number {
  if (y > LIMITE_Y - 20) {
    doc.addPage();
    y = MARGEM + 5;
  }
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(20);
  doc.text(latin1(titulo), MARGEM, y + 8);
  doc.setFont('helvetica', 'normal').setFontSize(9);
  return y + 15;
}

function vazio(doc: Doc, y: number, texto: string): number {
  doc.setTextColor(110).text(latin1(texto), MARGEM, y);
  doc.setTextColor(20);
  return y + ALTURA_LINHA;
}

export async function gerarPdf(c: ConteudoPdf): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: 'REPZ · Histórico de treinos', creator: 'REPZ' });

  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(20);
  doc.text(latin1('REPZ · Histórico de treinos'), MARGEM, MARGEM + 5);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(90);
  const periodo = c.periodo
    ? `Período: ${dataBR(c.periodo.de)} a ${dataBR(c.periodo.ate)}`
    : 'Período: sem registros';
  doc.text(latin1(`${periodo} · gerado em ${dataBR(c.geradoEm)}`), MARGEM, MARGEM + 12);
  let y = MARGEM + 14;

  y = secao(doc, y, 'Resumo por exercício');
  y = c.exercicios.length
    ? tabela(
        doc,
        y,
        [
          { titulo: 'Exercício', largura: 70 },
          { titulo: 'Melhor série', largura: 50 },
          { titulo: '1RM est. inicial', largura: 30, direita: true },
          { titulo: '1RM est. atual', largura: 30, direita: true },
        ],
        c.exercicios.map((e) => [
          e.nome,
          textoMelhorSerie(e.melhor, e.porTempo),
          valor(e.inicial, e.porTempo),
          valor(e.atual, e.porTempo),
        ]),
      )
    : vazio(doc, y, 'Nenhum exercício registrado.');
  if (c.exercicios.some((e) => e.porTempo))
    y = vazio(doc, y, 'Exercícios por tempo mostram a maior duração no lugar do 1RM estimado.');

  y = secao(doc, y, 'Treinos');
  y = c.treinos.length
    ? tabela(
        doc,
        y,
        [
          { titulo: 'Data', largura: 24 },
          { titulo: 'Sessão', largura: 60 },
          { titulo: 'Exercícios', largura: 22, direita: true },
          { titulo: 'Séries', largura: 18, direita: true },
          { titulo: 'Volume (kg)', largura: 30, direita: true },
          { titulo: 'Duração', largura: 26, direita: true },
        ],
        c.treinos.map((t) => [
          dataBR(t.data),
          t.sessao,
          String(t.exercicios),
          String(t.series),
          formatarDecimal(t.volume),
          t.minutos == null ? '' : `${t.minutos} min`,
        ]),
      )
    : vazio(doc, y, 'Nenhum treino concluído.');

  y = secao(doc, y, 'Cardio');
  if (c.cardio.length)
    tabela(
      doc,
      y,
      [
        { titulo: 'Data', largura: 24 },
        { titulo: 'Tipo', largura: 56 },
        { titulo: 'Minutos', largura: 20, direita: true },
        { titulo: 'FC média', largura: 22, direita: true },
        { titulo: 'Distância', largura: 26, direita: true },
        { titulo: 'Esforço', largura: 32, direita: true },
      ],
      c.cardio.map((x) => [
        dataBR(x.data),
        x.tipo,
        formatarDecimal(x.minutos),
        opc(x.fcMedia, ' bpm'),
        opc(x.distanciaKm, ' km'),
        opc(x.esforco, '/10'),
      ]),
    );
  else vazio(doc, y, 'Nenhum cardio registrado.');

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i).setFontSize(8).setTextColor(130);
    doc.text(latin1('REPZ · diário de treino'), MARGEM, 297 - 8);
    doc.text(`Página ${i} de ${paginas}`, 210 - MARGEM, 297 - 8, { align: 'right' });
  }
  return doc.output('blob');
}
