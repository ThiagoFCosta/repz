import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RepzDb } from '../../src/dados/db';
import { excluirCardio, salvarCardio } from '../../src/dados/repos/cardio';
import { alterarPreferencias, gravarMeta } from '../../src/dados/repos/meta';
import { criarTreino, excluirTreino, persistirTransicao } from '../../src/dados/repos/treinos';
import { marcarTransacaoDoServidor } from '../../src/dados/sincronia';
import type { CardioRealizado, SerieRealizada, Treino } from '../../src/dados/tipos';

let db: RepzDb;
let n = 0;
beforeEach(async () => {
  db = new RepzDb(`sincronia-${++n}`);
  await db.open();
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const cardio = (id: string): CardioRealizado => ({
  id,
  data: '2026-11-27',
  tipo: 'Bicicleta',
  minutos: 30,
  fcMedia: null,
  distanciaKm: null,
  esforco: null,
  feitoEm: '2026-11-27T07:00:00-03:00',
});
const treino = (id: string, status: Treino['status'] = 'em_andamento'): Treino => ({
  id,
  planoId: 'p',
  sessaoId: 's',
  sessaoNome: 'Push',
  data: '2026-11-27',
  inicio: '2026-11-27T19:00:00-03:00',
  fim: null,
  semanaBloco: 1,
  status,
  estadoUI: null,
  notas: {},
  atualizadoEm: '2026-11-27T19:00:00-03:00',
});
const serie = (id: string, treinoId: string): SerieRealizada => ({
  id,
  treinoId,
  exercicioPrescritoId: 'e',
  chave: 'supino',
  variante: 'Supino',
  ordem: 1,
  kg: 80,
  reps: 8,
  rir: 2,
  aquecimento: false,
  feitaEm: '2026-11-27T19:05:00-03:00',
  sugestaoKg: null,
  sugestaoAceita: null,
});
const marcas = () => db.sincronia.toArray();

// docs/v2/ARCHITECTURE.md 8.2: toda escrita marca o registro na mesma transação
describe('marca de sincronização', () => {
  it('gravar marca como pendente; excluir marca como excluído', async () => {
    await salvarCardio(db, cardio('c1'));
    expect(await marcas()).toMatchObject([{ chave: 'cardio|c1', pendente: 1, excluido: false }]);
    await excluirCardio(db, 'c1');
    expect(await marcas()).toMatchObject([{ chave: 'cardio|c1', pendente: 1, excluido: true }]);
  });

  it('cada nova escrita tem horário maior que a anterior', async () => {
    await salvarCardio(db, cardio('c1'));
    const a = (await db.sincronia.get('cardio|c1'))!.modificadoEm;
    await salvarCardio(db, cardio('c1'));
    expect((await db.sincronia.get('cardio|c1'))!.modificadoEm > a).toBe(true);
  });

  it('falha no meio da transação não deixa nem a série nem a marca', async () => {
    await criarTreino(db, treino('t1'));
    await expect(
      persistirTransicao(db, 't1', {
        novas: [serie('s1', 't1')],
        edicoes: [{ id: 'nao-existe', dados: { kg: 1, reps: 1, rir: null } }],
        treino: {},
      }),
    ).rejects.toThrow();
    expect(await db.series.count()).toBe(0);
    expect(await db.sincronia.get('series|s1')).toBeUndefined();
  });

  it('excluir o treino marca o treino e as séries dele', async () => {
    await criarTreino(db, treino('t1'));
    await persistirTransicao(db, 't1', {
      novas: [serie('s1', 't1'), serie('s2', 't1')],
      edicoes: [],
      treino: { status: 'concluido' },
    });
    await excluirTreino(db, 't1');
    const excluidas = (await marcas())
      .filter((m) => m.excluido)
      .map((m) => m.chave)
      .sort();
    expect(excluidas).toEqual(['series|s1', 'series|s2', 'treinos|t1']);
  });

  it('limpar a tabela (restaurar "substituir") marca tudo o que saiu', async () => {
    await salvarCardio(db, cardio('c1'));
    await salvarCardio(db, cardio('c2'));
    await db.cardio.clear();
    expect((await marcas()).every((m) => m.excluido)).toBe(true);
    expect(await db.sincronia.count()).toBe(2);
  });

  it('em meta, só preferências e plano ativo sobem', async () => {
    await gravarMeta(db, 'persistencia', 'concedida');
    expect(await db.sincronia.count()).toBe(0);
    await alterarPreferencias(db, { vibrar: false });
    await gravarMeta(db, 'planoAtivoId', 'p1');
    expect((await marcas()).map((m) => m.chave).sort()).toEqual(['meta|planoAtivoId', 'meta|preferencias']);
  });

  it('o que vem do servidor não gera marca', async () => {
    await db.transaction('rw', db.cardio, async (tx) => {
      marcarTransacaoDoServidor(tx.idbtrans);
      await db.cardio.put(cardio('c9'));
    });
    expect(await db.cardio.count()).toBe(1);
    expect(await db.sincronia.count()).toBe(0);
  });
});
