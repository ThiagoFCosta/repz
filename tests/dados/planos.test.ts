import 'fake-indexeddb/auto';
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse } from '../../src/dominio/formato/parser';
import { RepzDb } from '../../src/dados/db';
import {
  ajustarSemana,
  definirInicioBloco,
  listarPlanos,
  planoAtivo,
  salvarPlano,
  TreinoEmAndamentoError,
  type DadosSalvarPlano,
} from '../../src/dados/repos/planos';
import {
  canonica,
  chavesEquivalentes,
  definirFoco,
  definirIncremento,
  desvincular,
  lerConfigs,
  vincular,
} from '../../src/dados/repos/config';
import { chavesComHistorico, treinoEmAndamento } from '../../src/dados/repos/treinos';
import { lerMeta, lerPreferencias } from '../../src/dados/repos/meta';
import type { SerieRealizada, Treino } from '../../src/dados/tipos';

const texto = fs.readFileSync(new URL('../fixtures/raul.treino.txt', import.meta.url), 'utf8');
const r = parse(texto);

let db: RepzDb;
let n = 0;
beforeEach(async () => {
  db = new RepzDb(`teste-${++n}`);
  await db.open();
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const dados = (extra: Partial<DadosSalvarPlano> = {}): DadosSalvarPlano => ({
  importado: r.plano!,
  inicioBloco: '2026-11-16',
  textoOriginal: r.textoBloco,
  arquivoNome: 'plano.pdf',
  avisos: r.avisos,
  vinculos: {},
  importadoEm: '2026-11-09T20:00:00-03:00',
  ...extra,
});

const treino = (status: Treino['status'], id = 't1'): Treino => ({
  id,
  planoId: 'p',
  sessaoId: 's',
  sessaoNome: 'Push',
  data: '2026-11-09',
  inicio: '2026-11-09T19:00:00-03:00',
  fim: null,
  semanaBloco: 1,
  status,
  estadoUI: null,
  notas: {},
  atualizadoEm: '2026-11-09T19:00:00-03:00',
});

const serie = (chave: string, treinoId = 't1', aquecimento = false): SerieRealizada => ({
  id: crypto.randomUUID(),
  treinoId,
  exercicioPrescritoId: 'e',
  chave,
  variante: chave,
  ordem: 1,
  kg: 80,
  reps: 10,
  rir: 2,
  aquecimento,
  feitaEm: '2026-11-09T19:10:00-03:00',
  sugestaoKg: null,
  sugestaoAceita: null,
});

describe('banco vazio (schema v1)', () => {
  it('abre sem plano ativo e com preferências padrão', async () => {
    expect(await planoAtivo(db)).toBeNull();
    expect(await lerMeta(db, 'persistencia')).toBe('indisponivel');
    expect(await lerPreferencias(db)).toMatchObject({
      somDescanso: true,
      vibrar: true,
      manterTelaLigada: true,
    });
    expect(db.verno).toBe(1);
  });
});

describe('salvar e ativar plano', () => {
  it('gera ids, guarda o texto original e ativa', async () => {
    const p = await salvarPlano(db, dados());
    const ativo = await planoAtivo(db);
    expect(ativo?.id).toBe(p.id);
    expect(ativo?.sessoes).toHaveLength(5);
    const ids = ativo!.sessoes.flatMap((s) => [s.id, ...s.itens.map((e) => e.id)]);
    expect(new Set(ids).size).toBe(35);
    expect(ativo).toMatchObject({
      nome: 'Hipertrofia natural 5x',
      inicioBloco: '2026-11-16',
      ajusteSemana: 0,
      arquivoNome: 'plano.pdf',
    });
    expect(ativo!.textoOriginal).toContain('#TREINO-INICIO v1');
  });

  it('plano novo vira o ativo; o anterior continua listado', async () => {
    const a = await salvarPlano(db, dados());
    const b = await salvarPlano(db, dados({ importadoEm: '2026-11-10T08:00:00-03:00' }));
    expect((await planoAtivo(db))?.id).toBe(b.id);
    expect((await listarPlanos(db)).map((p) => p.id)).toEqual([b.id, a.id]);
  });

  it('plano sem BLOCO não guarda data de início', async () => {
    const p = await salvarPlano(db, dados({ importado: { ...r.plano!, bloco: null } }));
    expect(p.inicioBloco).toBeNull();
  });

  it('com treino em andamento, não troca o plano e não grava nada', async () => {
    await db.treinos.add(treino('em_andamento'));
    await expect(salvarPlano(db, dados())).rejects.toBeInstanceOf(TreinoEmAndamentoError);
    expect(await db.planos.count()).toBe(0);
    expect(await planoAtivo(db)).toBeNull();
  });

  it('grava os vínculos escolhidos na revisão', async () => {
    await salvarPlano(db, dados({ vinculos: { 'supino reto c barra': 'supino reto barra' } }));
    const configs = await lerConfigs(db);
    expect(canonica(configs, 'supino reto c barra')).toBe('supino reto barra');
  });

  it('ajusta a semana e a data de início', async () => {
    const p = await salvarPlano(db, dados());
    await ajustarSemana(db, p.id, 1);
    await ajustarSemana(db, p.id, 1);
    await ajustarSemana(db, p.id, -1);
    expect((await planoAtivo(db))?.ajusteSemana).toBe(1);
    await definirInicioBloco(db, p.id, '2026-11-23');
    expect(await planoAtivo(db)).toMatchObject({ inicioBloco: '2026-11-23', ajusteSemana: 0 });
  });
});

describe('configuração por exercício', () => {
  it('salto e foco por chave', async () => {
    await definirIncremento(db, 'cadeira extensora', 5);
    await definirFoco(db, 'cadeira extensora', true);
    await definirFoco(db, 'stiff', false);
    const c = await lerConfigs(db);
    expect(c.get('cadeira extensora')).toEqual({
      chave: 'cadeira extensora',
      incrementoKg: 5,
      foco: true,
      apelidoDe: null,
    });
    expect(c.get('stiff')?.incrementoKg).toBeNull();
  });

  it('vincular, encadear, desvincular e recusar ciclo', async () => {
    await vincular(db, 'b', 'a');
    await vincular(db, 'c', 'b');
    let c = await lerConfigs(db);
    expect(canonica(c, 'c')).toBe('a');
    expect(chavesEquivalentes(c, 'a', ['x']).sort()).toEqual(['a', 'b', 'c']);
    await expect(vincular(db, 'a', 'c')).rejects.toThrow('ciclo');
    await desvincular(db, 'b');
    c = await lerConfigs(db);
    expect(canonica(c, 'c')).toBe('b');
    expect(canonica(c, 'b')).toBe('b');
  });

  it('ciclo gravado por fora é tratado como sem vínculo', () => {
    const c = new Map([
      ['a', { chave: 'a', incrementoKg: null, foco: null, apelidoDe: 'b' }],
      ['b', { chave: 'b', incrementoKg: null, foco: null, apelidoDe: 'a' }],
    ]);
    expect(canonica(c, 'a')).toBe('a');
  });
});

describe('treinos e histórico', () => {
  it('acha o treino em andamento', async () => {
    expect(await treinoEmAndamento(db)).toBeNull();
    await db.treinos.add(treino('concluido', 't0'));
    await db.treinos.add(treino('em_andamento', 't1'));
    expect((await treinoEmAndamento(db))?.id).toBe('t1');
  });

  it('chaves com histórico ignoram aquecimento e treinos descartados', async () => {
    await db.treinos.bulkAdd([treino('concluido', 't1'), treino('descartado', 't2')]);
    await db.series.bulkAdd([
      serie('supino reto barra'),
      serie('crucifixo', 't1', true),
      serie('remada curvada', 't2'),
    ]);
    expect(await chavesComHistorico(db)).toEqual(new Map([['supino reto barra', 'supino reto barra']]));
  });
});
