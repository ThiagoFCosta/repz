import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RepzDb } from '../../src/dados/db';
import {
  criarTreino,
  persistirTransicao,
  seriesDoTreino,
  ultimoConcluido,
} from '../../src/dados/repos/treinos';
import { historicoDaChave, treinosConcluidos } from '../../src/dados/historico-repo';
import { vincular, lerConfigs } from '../../src/dados/repos/config';
import { ESTADO_OCIOSO, reduzir, type EstadoTreino } from '../../src/dominio/treino/maquina';
import type { SerieRealizada, Treino } from '../../src/dados/tipos';

let db: RepzDb;
let n = 0;
beforeEach(async () => {
  db = new RepzDb(`treinos-${++n}`);
  await db.open();
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const estado = (): EstadoTreino =>
  reduzir(
    ESTADO_OCIOSO,
    { tipo: 'INICIAR', itens: [{ grupo: null, descanso: 90 }], alvo: [3], variante: [0], semana: 1 },
    0,
  ).estado;

const treino = (extra: Partial<Treino> = {}): Treino => ({
  id: 't1',
  planoId: 'p',
  sessaoId: 'push',
  sessaoNome: 'Push',
  data: '2026-11-09',
  inicio: '2026-11-09T19:00:00-03:00',
  fim: null,
  semanaBloco: 1,
  status: 'em_andamento',
  estadoUI: estado(),
  notas: {},
  atualizadoEm: '2026-11-09T19:00:00-03:00',
  ...extra,
});

const serie = (extra: Partial<SerieRealizada> = {}): SerieRealizada => ({
  id: crypto.randomUUID(),
  treinoId: 't1',
  exercicioPrescritoId: 'e',
  chave: 'supino reto barra',
  variante: 'Supino reto barra',
  ordem: 1,
  kg: 80,
  reps: 10,
  rir: 2,
  aquecimento: false,
  feitaEm: '2026-11-09T19:10:00-03:00',
  sugestaoKg: 80,
  sugestaoAceita: true,
  ...extra,
});

describe('transação série + estado do treino (7.4)', () => {
  it('grava a série e o estadoUI juntos', async () => {
    await criarTreino(db, treino());
    const t = reduzir(estado(), { tipo: 'CONCLUIR_SERIE', dados: { kg: 80, reps: 10, rir: 2 } }, 0);
    await persistirTransicao(db, 't1', {
      novas: [serie()],
      edicoes: [],
      treino: { estadoUI: t.estado, atualizadoEm: '2026-11-09T19:10:00-03:00' },
    });
    expect(await seriesDoTreino(db, 't1')).toHaveLength(1);
    const salvo = await db.treinos.get('t1');
    expect(salvo?.estadoUI?.feitas).toEqual([1]);
    expect(salvo?.atualizadoEm).toBe('2026-11-09T19:10:00-03:00');
  });

  it('falha no meio não grava metade: nem a série nem o estado', async () => {
    await criarTreino(db, treino());
    const s = serie();
    await db.series.add(s);
    const t = reduzir(estado(), { tipo: 'CONCLUIR_SERIE', dados: { kg: 80, reps: 10, rir: 2 } }, 0);
    // a 2ª série repete o id da 1ª: o add falha depois de a nova série válida entrar
    await expect(
      persistirTransicao(db, 't1', {
        novas: [serie({ id: 'nova', ordem: 2 }), s],
        edicoes: [],
        treino: { estadoUI: t.estado },
      }),
    ).rejects.toThrow();
    expect(await db.series.get('nova')).toBeUndefined();
    expect((await db.treinos.get('t1'))?.estadoUI?.feitas).toEqual([0]);
  });

  it('editar série inexistente ou treino inexistente desfaz tudo', async () => {
    await criarTreino(db, treino());
    await expect(
      persistirTransicao(db, 't1', {
        novas: [serie({ id: 'x' })],
        edicoes: [{ id: 'nao-existe', dados: { kg: 1, reps: 1, rir: null } }],
        treino: {},
      }),
    ).rejects.toThrow('não encontrada');
    await expect(
      persistirTransicao(db, 'outro', { novas: [serie({ id: 'y' })], edicoes: [], treino: {} }),
    ).rejects.toThrow('não encontrado');
    expect(await db.series.count()).toBe(0);
  });

  it('edita kg, reps e RIR de uma série', async () => {
    await criarTreino(db, treino());
    const s = serie();
    await db.series.add(s);
    await persistirTransicao(db, 't1', {
      novas: [],
      edicoes: [{ id: s.id, dados: { kg: 82.5, reps: 8, rir: 1 } }],
      treino: { status: 'concluido', fim: '2026-11-09T20:00:00-03:00' },
    });
    expect(await db.series.get(s.id)).toMatchObject({ kg: 82.5, reps: 8, rir: 1 });
    expect(await db.treinos.get('t1')).toMatchObject({ status: 'concluido' });
  });

  it('só um treino em andamento por vez', async () => {
    await criarTreino(db, treino());
    await expect(criarTreino(db, treino({ id: 't2' }))).rejects.toThrow('em andamento');
  });
});

describe('rotação e histórico', () => {
  it('último concluído do plano', async () => {
    await db.treinos.bulkAdd([
      treino({ id: 'a', status: 'concluido', inicio: '2026-11-01T19:00:00-03:00', sessaoId: 'push' }),
      treino({ id: 'b', status: 'concluido', inicio: '2026-11-03T19:00:00-03:00', sessaoId: 'pull' }),
      treino({ id: 'c', status: 'descartado', inicio: '2026-11-05T19:00:00-03:00', sessaoId: 'pernas' }),
      treino({ id: 'd', status: 'concluido', planoId: 'outro', inicio: '2026-11-06T19:00:00-03:00' }),
    ]);
    expect((await ultimoConcluido(db, 'p'))?.sessaoId).toBe('pull');
    expect(await ultimoConcluido(db, 'nenhum')).toBeNull();
  });

  it('histórico agrupado por treino: sem aquecimento, só concluídos, com apelidos', async () => {
    await db.treinos.bulkAdd([
      treino({ id: 'a', status: 'concluido', data: '2026-11-01' }),
      treino({ id: 'b', status: 'concluido', data: '2026-11-03' }),
      treino({ id: 'c', status: 'descartado', data: '2026-11-05' }),
      treino({ id: 'd', status: 'em_andamento', data: '2026-11-09' }),
    ]);
    await db.series.bulkAdd([
      serie({ treinoId: 'a', kg: 40, aquecimento: true, feitaEm: '2026-11-01T19:00:00-03:00' }),
      serie({ treinoId: 'a', kg: 80, reps: 10, feitaEm: '2026-11-01T19:05:00-03:00' }),
      serie({ treinoId: 'a', kg: 80, reps: 9, feitaEm: '2026-11-01T19:08:00-03:00' }),
      serie({ treinoId: 'b', chave: 'supino reto c barra', kg: 82.5, feitaEm: '2026-11-03T19:05:00-03:00' }),
      serie({ treinoId: 'c', kg: 100, feitaEm: '2026-11-05T19:05:00-03:00' }),
      serie({ treinoId: 'd', kg: 100, feitaEm: '2026-11-09T19:05:00-03:00' }),
      serie({ treinoId: 'a', chave: 'outro', feitaEm: '2026-11-01T19:30:00-03:00' }),
    ]);
    await vincular(db, 'supino reto c barra', 'supino reto barra');
    const h = await historicoDaChave(
      db,
      await lerConfigs(db),
      'supino reto barra',
      await treinosConcluidos(db),
    );
    expect(h.treinos).toEqual([
      {
        data: '2026-11-01',
        series: [
          { kg: 80, reps: 10, rir: 2 },
          { kg: 80, reps: 9, rir: 2 },
        ],
      },
      { data: '2026-11-03', series: [{ kg: 82.5, reps: 10, rir: 2 }] },
    ]);
    expect(h.ultimaEm).toBe('2026-11-03T19:05:00-03:00');
    const vazio = await historicoDaChave(db, new Map(), 'nada', new Map());
    expect(vazio).toEqual({ treinos: [], ultimaEm: null });
  });
});
