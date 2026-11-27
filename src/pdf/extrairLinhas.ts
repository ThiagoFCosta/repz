// Extração do PDF preservando as colunas (BRIEFING-v2 10.1): igual a extrair.ts, mas um espaço horizontal grande
// entre dois trechos da mesma linha vira TAB (o NutriDiet põe o alimento e a quantidade em colunas).
// Porte de referencia/dieta/extrair-linhas.js.

import { carregarPdfJs, PdfIlegivel, PdfSemTexto, type ItemTexto, type PdfJs } from './extrair';

export interface LinhaPdf {
  pagina: number;
  texto: string;
  x: number; // posição do 1º trecho
}

const TOLERANCIA_Y = 2.5;
const ESPACO_X = 1.5;
const COLUNA_X = 12; // pt: acima disso, é outra coluna (TAB)

const ehItemTexto = (it: unknown): it is ItemTexto =>
  typeof it === 'object' && it !== null && 'str' in it && 'transform' in it;

export function linhasComColunas(itens: ItemTexto[], pagina: number): LinhaPdf[] {
  const porLinha: { y: number; partes: { x: number; w: number; s: string }[] }[] = [];
  for (const it of itens) {
    if (!it.str || !it.str.trim()) continue;
    const x = it.transform[4] ?? 0;
    const y = it.transform[5] ?? 0;
    let l = porLinha.find((q) => Math.abs(q.y - y) < TOLERANCIA_Y);
    if (!l) porLinha.push((l = { y, partes: [] }));
    l.partes.push({ x, w: it.width, s: it.str });
  }
  porLinha.sort((a, b) => b.y - a.y);
  return porLinha.map((l) => {
    l.partes.sort((a, b) => a.x - b.x);
    let t = '';
    let fim: number | null = null;
    for (const pt of l.partes) {
      const gap = fim == null ? 0 : pt.x - fim;
      if (fim != null)
        t += gap > COLUNA_X ? '\t' : gap > ESPACO_X && !t.endsWith(' ') && !pt.s.startsWith(' ') ? ' ' : '';
      t += pt.s;
      fim = pt.x + pt.w;
    }
    return { pagina, texto: t.replace(/[  ]+/g, ' ').trim(), x: l.partes[0]!.x };
  });
}

export async function linhasDoPdf(pdfjs: PdfJs, dados: Uint8Array): Promise<LinhaPdf[]> {
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: dados, useSystemFonts: true, isEvalSupported: false }).promise;
  } catch (e) {
    throw new PdfIlegivel(e);
  }
  try {
    const out: LinhaPdf[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const { items } = await (await doc.getPage(p)).getTextContent();
      out.push(...linhasComColunas(items.filter(ehItemTexto), p));
    }
    if (!out.some((l) => l.texto)) throw new PdfSemTexto();
    return out;
  } finally {
    await doc.destroy();
  }
}

export async function extrairLinhasPdf(arquivo: Blob): Promise<LinhaPdf[]> {
  return linhasDoPdf(await carregarPdfJs(), new Uint8Array(await arquivo.arrayBuffer()));
}
