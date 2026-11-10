import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as pdfjsNode from 'pdfjs-dist/legacy/build/pdf.mjs';
import { RepzDb } from '../../src/dados/db';
import { conteudoPdf, gerarPdf, latin1, textoMelhorSerie } from '../../src/dados/pdf-export';
import { lerConfigs } from '../../src/dados/repos/config';
import { listarPlanos } from '../../src/dados/repos/planos';
import type { Plano } from '../../src/dados/tipos';
import { popular } from './popular';

let db: RepzDb;
let n = 0;
let plano: Plano;
beforeEach(async () => {
  db = new RepzDb(`pdf-${++n}`);
  await db.open();
  plano = await popular(db, { emAndamento: true });
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const conteudo = async () =>
  conteudoPdf(db, await lerConfigs(db), await listarPlanos(db), plano, '2026-11-10');

async function textoDoPdf(blob: Blob): Promise<string> {
  const doc = await pdfjsNode.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const paginas: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    paginas.push(c.items.map((x) => ('str' in x ? x.str : '')).join(' '));
  }
  await doc.destroy();
  return paginas.join('\n');
}

describe('conteúdo do PDF (BRIEFING 10)', () => {
  it('período, resumo por exercício, treinos concluídos e cardio', async () => {
    const c = await conteudo();
    expect(c.periodo).toEqual({ de: '2026-11-02', ate: '2026-11-05' });
    // supino: 80 × (1 + 12/30) = 112 na semana de 02/11; 82,5 × (1 + 12/30) = 115,5 na mesma semana
    expect(c.exercicios).toEqual([
      {
        nome: 'Supino reto barra',
        porTempo: false,
        melhor: expect.objectContaining({ kg: 82.5, reps: 8, data: '2026-11-05', valor: 115.5 }),
        inicial: 115.5,
        atual: 115.5,
      },
    ]);
    expect(c.treinos).toEqual([
      { data: '2026-11-02', sessao: 'Push', exercicios: 1, series: 2, volume: 1520, minutos: 65 },
      { data: '2026-11-05', sessao: 'Push', exercicios: 1, series: 1, volume: 660, minutos: 65 },
    ]);
    expect(c.cardio.map((x) => x.id)).toEqual(['c1', 'c2']);
    expect(textoMelhorSerie(c.exercicios[0]!.melhor, false)).toBe('82,5 kg × 8 (05/11/2026)');
  });

  it('o PDF tem as seções e os acentos do português', async () => {
    const texto = await textoDoPdf(await gerarPdf(await conteudo()));
    for (const t of [
      'REPZ · Histórico de treinos',
      'Período: 02/11/2026 a 05/11/2026 · gerado em 10/11/2026',
      'Resumo por exercício',
      'Supino reto barra',
      '82,5 kg × 8 (05/11/2026)',
      '115,5 kg',
      'Sessão',
      'Séries',
      'Duração',
      '65 min',
      'Distância',
      'Esforço',
      '6,25 km',
      'Outro: Corrida; leve',
      'Página 1 de 1',
    ])
      expect(texto).toContain(t);
  });

  it('sem registros: avisa em cada seção', async () => {
    const vazio = { geradoEm: '2026-11-10', periodo: null, exercicios: [], treinos: [], cardio: [] };
    const texto = await textoDoPdf(await gerarPdf(vazio));
    expect(texto).toContain('Período: sem registros');
    expect(texto).toContain('Nenhum treino concluído.');
    expect(texto).toContain('Nenhum cardio registrado.');
  });

  it('muitas linhas: quebra de página com o cabeçalho repetido', async () => {
    const c = await conteudo();
    const muitos = { ...c, treinos: Array.from({ length: 80 }, () => c.treinos[0]!) };
    const texto = await textoDoPdf(await gerarPdf(muitos));
    expect(texto).toContain('Página 3 de 3');
    expect(texto.split('\n')[1]).toContain('Sessão');
  });

  it('troca o que a Helvetica não tem (fora do Latin-1)', () => {
    expect(latin1('Remo – leve… → ok “x” 💪 ção ×·')).toBe('Remo - leve... -> ok "x" ? ção ×·');
  });
});
