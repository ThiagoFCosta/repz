import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BOM, celula, csvCardio, csvSeries, montarCsv } from '../../src/dados/csv';
import { RepzDb } from '../../src/dados/db';
import { popular } from './popular';

let db: RepzDb;
let n = 0;
beforeEach(async () => {
  db = new RepzDb(`csv-${++n}`);
  await db.open();
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const bytes = (s: string) => [...new TextEncoder().encode(s)];

describe('células', () => {
  it('vírgula decimal, sim/não, vazio para ausente', () => {
    expect(celula(82.5)).toBe('82,5');
    expect(celula(1.25)).toBe('1,25');
    expect(celula(80)).toBe('80');
    expect(celula(true)).toBe('sim');
    expect(celula(false)).toBe('não');
    expect(celula(null)).toBe('');
  });

  it('aspas só quando a célula tem ;, aspas ou quebra de linha (aspas internas dobradas)', () => {
    expect(celula('Supino reto')).toBe('Supino reto');
    expect(celula('Corrida; leve')).toBe('"Corrida; leve"');
    expect(celula('pegada "fechada"')).toBe('"pegada ""fechada"""');
    expect(celula('linha\nnova')).toBe('"linha\nnova"');
    expect(celula('vírgula, não')).toBe('vírgula, não');
  });
});

describe('arquivo', () => {
  it('UTF-8 com BOM, separador ;, CRLF', () => {
    const csv = montarCsv(['a', 'b'], [['ç', 2.5]]);
    // prettier-ignore
    expect(bytes(csv)).toEqual([
      0xef, 0xbb, 0xbf, // BOM
      0x61, 0x3b, 0x62, 0x0d, 0x0a, // a;b CR LF
      0xc3, 0xa7, 0x3b, 0x32, 0x2c, 0x35, 0x0d, 0x0a, // ç;2,5 CR LF
    ]);
    expect(BOM.charCodeAt(0)).toBe(0xfeff);
  });

  it('séries: cabeçalho exato, só treinos não descartados, ordem cronológica, aquecimento marcado', async () => {
    await popular(db);
    const csv = await csvSeries(db);
    expect(csv).toBe(
      BOM +
        [
          'data;sessao;exercicio;variante;serie;kg;reps;rir;aquecimento;semana_bloco;fase;plano',
          '2026-11-02;Push;Supino reto;Supino reto barra;1;40;10;;sim;9;3;Hipertrofia natural 5x',
          '2026-11-02;Push;Supino reto;Supino reto barra;2;80;10;2;não;9;3;Hipertrofia natural 5x',
          '2026-11-02;Push;Supino reto;Supino reto barra;3;80;9;;não;9;3;Hipertrofia natural 5x',
          '2026-11-05;Push;Supino reto;Supino reto barra;4;82,5;8;4;não;9;3;Hipertrofia natural 5x',
        ].join('\r\n') +
        '\r\n',
    );
  });

  it('cardio: cabeçalho exato, decimais com vírgula, campos opcionais vazios', async () => {
    await popular(db);
    expect(await csvCardio(db)).toBe(
      BOM +
        [
          'data;tipo;minutos;fc_media;distancia_km;esforco',
          '2026-11-03;Remo;35;128;6,25;6',
          '2026-11-04;"Outro: Corrida; leve";20,5;;;',
        ].join('\r\n') +
        '\r\n',
    );
  });

  it('sem dados: só o cabeçalho', async () => {
    expect(await csvCardio(db)).toBe(`${BOM}data;tipo;minutos;fc_media;distancia_km;esforco\r\n`);
  });
});
