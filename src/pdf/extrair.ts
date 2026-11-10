// Extração de texto do PDF com pdf.js (BRIEFING 5.5). Porte de referencia/parser/extrair-pdf.js.
// O pdf.js e o worker são empacotados localmente e carregados sob demanda (fora do JS inicial).

export class PdfSemTexto extends Error {
  constructor() {
    super(
      'Este PDF não tem texto que o app consiga ler (parece escaneado ou feito de imagens). ' +
        'Use "Colar texto" e cole o anexo do plano, de #TREINO-INICIO até #TREINO-FIM.',
    );
    this.name = 'PdfSemTexto';
  }
}

export class PdfIlegivel extends Error {
  constructor(causa: unknown) {
    super('Não foi possível abrir este arquivo como PDF. Confira se é o PDF do plano ou use "Colar texto".');
    this.name = 'PdfIlegivel';
    this.cause = causa;
  }
}

// Subconjunto da API do pdf.js usado aqui (permite injetar o build do Node nos testes)
export interface ItemTexto {
  str: string;
  transform: number[];
  width: number;
}
interface PaginaPdf {
  getTextContent(): Promise<{ items: unknown[] }>;
}
interface DocumentoPdf {
  numPages: number;
  getPage(n: number): Promise<PaginaPdf>;
  destroy(): Promise<void>;
}
export interface PdfJs {
  getDocument(params: Record<string, unknown>): { promise: Promise<DocumentoPdf> };
}

const TOLERANCIA_Y = 2.5; // pt: itens com Y próximo são a mesma linha
const ESPACO_X = 1.5; // pt: distância horizontal que vira espaço

// Remonta as linhas de uma página agrupando os itens pela coordenada Y e ordenando por X.
export function linhasDaPagina(itens: ItemTexto[]): string[] {
  const porLinha: { y: number; partes: { x: number; w: number; s: string }[] }[] = [];
  for (const it of itens) {
    if (!it.str) continue;
    const x = it.transform[4] ?? 0;
    const y = it.transform[5] ?? 0;
    let l = porLinha.find((q) => Math.abs(q.y - y) < TOLERANCIA_Y);
    if (!l) porLinha.push((l = { y, partes: [] }));
    l.partes.push({ x, w: it.width, s: it.str });
  }
  porLinha.sort((a, b) => b.y - a.y);
  return porLinha.map((l) => {
    l.partes.sort((a, b) => a.x - b.x);
    let txt = '';
    let fim: number | null = null;
    for (const pt of l.partes) {
      if (fim != null && pt.x - fim > ESPACO_X && !txt.endsWith(' ') && !pt.s.startsWith(' ')) txt += ' ';
      txt += pt.s;
      fim = pt.x + pt.w;
    }
    return txt;
  });
}

const ehItemTexto = (it: unknown): it is ItemTexto =>
  typeof it === 'object' && it !== null && 'str' in it && 'transform' in it;

export async function textoDoPdf(pdfjs: PdfJs, dados: Uint8Array): Promise<string> {
  let doc: DocumentoPdf;
  try {
    doc = await pdfjs.getDocument({ data: dados, useSystemFonts: true, isEvalSupported: false }).promise;
  } catch (e) {
    throw new PdfIlegivel(e);
  }
  try {
    const linhas: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const { items } = await (await doc.getPage(p)).getTextContent();
      linhas.push(...linhasDaPagina(items.filter(ehItemTexto)));
    }
    const texto = linhas.join('\n');
    if (!texto.trim()) throw new PdfSemTexto();
    return texto;
  } finally {
    await doc.destroy();
  }
}

let carregado: Promise<PdfJs> | null = null;

// Carrega o pdf.js (build moderno) com o worker local; só na primeira importação.
export function carregarPdfJs(): Promise<PdfJs> {
  carregado ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(
    ([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs as unknown as PdfJs;
    },
  );
  return carregado;
}

export async function extrairTextoPdf(arquivo: Blob): Promise<string> {
  const pdfjs = await carregarPdfJs();
  return textoDoPdf(pdfjs, new Uint8Array(await arquivo.arrayBuffer()));
}
