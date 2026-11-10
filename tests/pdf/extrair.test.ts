import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
// No Node usamos o build "legacy" do pdf.js, como a referência; no navegador o app usa o moderno.
import * as pdfjsNode from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parse } from '../../src/dominio/formato/parser';
import { linhasDaPagina, PdfIlegivel, PdfSemTexto, textoDoPdf, type PdfJs } from '../../src/pdf/extrair';

const pdfjs = pdfjsNode as unknown as PdfJs;
const fixture = (nome: string) =>
  new Uint8Array(fs.readFileSync(new URL(`../fixtures/${nome}`, import.meta.url)));
const lerPdf = async (nome: string) => parse(await textoDoPdf(pdfjs, fixture(nome)));
const todos = (r: Awaited<ReturnType<typeof lerPdf>>) => r.rascunho.sessoes.flatMap((s) => s.itens);

// Tabela 5.6 do BRIEFING
describe('PDFs das fixtures', () => {
  it('raul-com-anexo-ok.pdf: 5 sessões, 30 exercícios, 0 erros, 2 avisos (rodapé do Chrome)', async () => {
    const r = await lerPdf('raul-com-anexo-ok.pdf');
    expect(r.erros).toEqual([]);
    expect(r.plano!.sessoes).toHaveLength(5);
    expect(todos(r)).toHaveLength(30);
    expect(r.avisos).toHaveLength(2);
    expect(r.avisos.every((a) => a.msg.startsWith('Linha ignorada'))).toBe(true);
  });

  it('raul-com-anexo-estresse.pdf: importa, rejunta a linha quebrada e mantém os acentos', async () => {
    const r = await lerPdf('raul-com-anexo-estresse.pdf');
    expect(r.erros).toEqual([]);
    expect(todos(r)).toHaveLength(30);
    expect(r.plano!.sessoes[0]!.itens[0]).toMatchObject({
      nome: 'Supino inclinado com halteres no banco a 30 graus com pegada neutra e controle total',
      series: 3,
      reps: { min: 6, max: 10 },
      descanso: { min: 120, max: 180 },
    });
    expect(r.plano!.sessoes[2]!.nome).toBe('Pernas quadríceps');
    expect(todos(r).filter((e) => e.nome === 'Elevação lateral')).toHaveLength(2);
    expect(todos(r).find((e) => e.nome === 'Elevação lateral')!.chaves).toEqual(['elevacao lateral']);
  });

  it('plano-original-raul.pdf (sem anexo): bloqueia', async () => {
    const r = await lerPdf('plano-original-raul.pdf');
    expect(r.plano).toBeNull();
    expect(r.erros[0]!.msg).toBe(
      'Marcador #TREINO-INICIO não encontrado. O PDF precisa ter o anexo no formato TREINO v1.',
    );
  });

  it('arquivo que não é PDF: erro claro', async () => {
    await expect(textoDoPdf(pdfjs, new TextEncoder().encode('isto não é um pdf'))).rejects.toBeInstanceOf(
      PdfIlegivel,
    );
  });
});

describe('PDF sem texto (escaneado)', () => {
  it('sugere colar o texto', async () => {
    const pagina = {
      getTextContent: async () => ({ items: [{ str: '', transform: [1, 0, 0, 1, 0, 0], width: 0 }] }),
    };
    let destruido = false;
    const falso: PdfJs = {
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 2,
          getPage: async () => pagina,
          destroy: async () => void (destruido = true),
        }),
      }),
    };
    const erro = await textoDoPdf(falso, new Uint8Array()).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(PdfSemTexto);
    expect((erro as Error).message).toContain('Colar texto');
    expect(destruido).toBe(true);
  });
});

describe('linhasDaPagina', () => {
  const item = (str: string, x: number, y: number, width = str.length * 5) => ({
    str,
    transform: [1, 0, 0, 1, x, y],
    width,
  });

  it('agrupa por Y com tolerância, ordena por X e de cima para baixo', () => {
    expect(
      linhasDaPagina([
        item('| 3 | 6-10', 105, 700.4),
        item('EX: Supino', 50, 701),
        item('SESSAO: Push', 50, 720),
      ]),
    ).toEqual(['SESSAO: Push', 'EX: Supino | 3 | 6-10']);
  });

  it('não insere espaço entre itens colados', () => {
    expect(linhasDaPagina([item('Eleva', 50, 700, 25), item('ção', 75, 700)])).toEqual(['Elevação']);
  });

  it('ignora itens vazios', () => {
    expect(linhasDaPagina([item('', 10, 10), item('x', 10, 10)])).toEqual(['x']);
  });
});
