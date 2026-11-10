import 'fake-indexeddb/auto';
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse } from '../../src/dominio/formato/parser';
import { melhorPorSemana } from '../../src/dominio/historico';
import { prescricao } from '../../src/dominio/periodizacao/prescricao';
import { sugerir } from '../../src/dominio/progressao/motor';
import { RepzDb } from '../../src/dados/db';
import {
  exerciciosComHistorico,
  historicoDaChave,
  historicoDoExercicio,
  treinosConcluidos,
} from '../../src/dados/historico-repo';
import { excluirCardio, listarCardio, salvarCardio } from '../../src/dados/repos/cardio';
import { lerConfigs, vincular } from '../../src/dados/repos/config';
import { salvarPlano } from '../../src/dados/repos/planos';
import {
  editarSerieSalva,
  excluirSerie,
  excluirTreino,
  listarTreinosConcluidos,
} from '../../src/dados/repos/treinos';
import type { Plano, SerieRealizada, Treino } from '../../src/dados/tipos';

const texto = fs.readFileSync(new URL('../fixtures/raul.treino.txt', import.meta.url), 'utf8');
const r = parse(texto);

let db: RepzDb;
let n = 0;
let plano: Plano;
beforeEach(async () => {
  db = new RepzDb(`historico-${++n}`);
  await db.open();
  // bloco começando em 07/09: semana 12 (deload) = 23 a 29/11
  plano = await salvarPlano(db, {
    importado: r.plano!,
    inicioBloco: '2026-09-07',
    textoOriginal: r.textoBloco,
    arquivoNome: null,
    avisos: [],
    vinculos: {},
    importadoEm: '2026-09-01T20:00:00-03:00',
  });
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const supino = () => plano.sessoes[0]!.itens[1]!; // Supino reto [barra / maquina]

const treino = (id: string, data: string, semana: number | null, extra: Partial<Treino> = {}): Treino => ({
  id,
  planoId: plano.id,
  sessaoId: plano.sessoes[0]!.id,
  sessaoNome: 'Push',
  data,
  inicio: `${data}T19:00:00-03:00`,
  fim: `${data}T20:00:00-03:00`,
  semanaBloco: semana,
  status: 'concluido',
  estadoUI: null,
  notas: {},
  atualizadoEm: `${data}T20:00:00-03:00`,
  ...extra,
});

let ordem = 0;
const serie = (
  treinoId: string,
  data: string,
  kg: number,
  reps: number,
  rir: number | null,
  extra: Partial<SerieRealizada> = {},
): SerieRealizada => ({
  id: `${treinoId}-${++ordem}`,
  treinoId,
  exercicioPrescritoId: supino().id,
  chave: 'supino reto barra',
  variante: 'Supino reto barra',
  ordem,
  kg,
  reps,
  rir,
  aquecimento: false,
  feitaEm: `${data}T19:${String(10 + ordem).padStart(2, '0')}:00-03:00`,
  sugestaoKg: null,
  sugestaoAceita: null,
  ...extra,
});

async function popular() {
  await db.treinos.bulkAdd([
    treino('a', '2026-11-02', 9),
    treino('b', '2026-11-05', 9),
    treino('c', '2026-11-23', 12), // deload
    treino('x', '2026-11-24', 12, { status: 'descartado' }),
  ]);
  await db.series.bulkAdd([
    serie('a', '2026-11-02', 40, 10, null, { aquecimento: true }),
    serie('a', '2026-11-02', 80, 10, 2), // 112
    serie('a', '2026-11-02', 80, 9, null), // RIR padrão da semana 9 (fase 9-11, rir 1-2): 1,5 → 80 × 1,35 = 108
    serie('b', '2026-11-05', 82.5, 8, null, {
      chave: 'supino reto c barra',
      variante: 'Supino reto c barra',
    }), // 82,5 × (1 + 9,5/30) = 108,6
    serie('c', '2026-11-23', 60, 10, null), // deload: RIR do plano 1-3 → 2: 60 × 1,4 = 84
    serie('x', '2026-11-24', 200, 10, 2),
  ]);
  await vincular(db, 'supino reto c barra', 'supino reto barra');
}

describe('histórico do exercício (9.8)', () => {
  it('treinos concluídos com apelidos, sem aquecimento; deload e RIR padrão pela prescrição do dia', async () => {
    await popular();
    const h = await historicoDoExercicio(db, await lerConfigs(db), [plano], 'supino reto c barra');
    expect(h.porTempo).toBe(false);
    expect(h.treinos.map((t) => [t.treinoId, t.deload, t.rirPadrao, t.sessaoNome])).toEqual([
      ['a', false, 1.5, 'Push'],
      ['b', false, 1.5, 'Push'],
      ['c', true, 2, 'Push'],
    ]);
    expect(melhorPorSemana(h.treinos, h.porTempo)).toEqual([
      { semana: '2026-11-02', valor: 112, deload: false },
      { semana: '2026-11-23', valor: 84, deload: true },
    ]);
  });

  it('a semana do estado salvo (D1) vale mais que a do bloco; exercício de plano desconhecido usa a progressão', async () => {
    await db.treinos.bulkAdd([
      treino('a', '2026-11-02', 12, { estadoUI: { semana: 11 } as Treino['estadoUI'] }),
      treino('b', '2026-11-05', null, { planoId: 'sumiu' }),
    ]);
    await db.series.bulkAdd([
      serie('a', '2026-11-02', 80, 10, 2),
      serie('b', '2026-11-05', 80, 10, 2, { exercicioPrescritoId: 'sumiu' }),
    ]);
    const h = await historicoDoExercicio(db, new Map(), [plano], 'supino reto barra');
    expect(h.treinos.map((t) => [t.deload, t.rirPadrao])).toEqual([
      [false, 1.5],
      [false, 1.5], // sem o plano: rir 1-2 padrão
    ]);
  });

  it('lista os exercícios com histórico, os do plano ativo primeiro', async () => {
    await popular();
    await db.treinos.add(treino('d', '2026-11-06', 9));
    await db.series.add(
      serie('d', '2026-11-06', 30, 10, 2, { chave: 'abdominal roda', variante: 'Abdominal roda' }),
    );
    const lista = await exerciciosComHistorico(db, await lerConfigs(db), plano);
    expect(lista.map((e) => [e.chave, e.nome, e.noPlanoAtivo])).toEqual([
      ['supino reto barra', 'Supino reto barra', true], // nome da série mais recente (23/11),
      ['abdominal roda', 'Abdominal roda', false],
    ]);
    expect(await exerciciosComHistorico(db, new Map(), null)).toHaveLength(3);
  });
});

describe('editar e excluir refletem no histórico e no motor', () => {
  const sugestao = async () => {
    const h = await historicoDaChave(
      db,
      await lerConfigs(db),
      'supino reto barra',
      await treinosConcluidos(db),
    );
    return sugerir(h.treinos, prescricao(plano, supino(), 9), { hoje: '2026-11-09' });
  };
  const grafico = async () =>
    melhorPorSemana(
      (await historicoDoExercicio(db, await lerConfigs(db), [plano], 'supino reto barra')).treinos,
      false,
    );

  beforeEach(async () => {
    await db.treinos.bulkAdd([treino('a', '2026-11-02', 9), treino('b', '2026-11-05', 9)]);
    await db.series.bulkAdd([
      serie('a', '2026-11-02', 80, 8, 2, { id: 'a1' }),
      serie('b', '2026-11-05', 80, 8, 2, { id: 'b1' }),
      serie('b', '2026-11-05', 80, 8, 2, { id: 'b2' }),
    ]);
  });

  it('editar a série muda o ponto do gráfico e a próxima sugestão', async () => {
    expect((await sugestao()).acao).toBe('manter'); // 8 reps, faixa 6-10
    expect((await grafico()).at(-1)?.valor).toBe(106.7); // 80 × (1 + 10/30)

    await editarSerieSalva(db, 'b1', { kg: 80, reps: 10, rir: 2 });
    await editarSerieSalva(db, 'b2', { kg: 80, reps: 10, rir: 2 });
    expect((await grafico()).at(-1)?.valor).toBe(112);
    expect(await sugestao()).toMatchObject({ acao: 'aumentar', carga: 82.5 });
    await expect(editarSerieSalva(db, 'nao-existe', { kg: 1, reps: 1, rir: null })).rejects.toThrow(
      'não encontrada',
    );
  });

  it('excluir série ou treino tira do gráfico e do motor', async () => {
    await excluirSerie(db, 'a1');
    expect(await grafico()).toEqual([{ semana: '2026-11-02', valor: 106.7, deload: false }]);

    await excluirTreino(db, 'b');
    expect(await db.series.where('treinoId').equals('b').count()).toBe(0);
    expect(await grafico()).toEqual([]);
    expect((await sugestao()).acao).toBe('calibrar');
    expect((await listarTreinosConcluidos(db)).map((t) => t.id)).toEqual(['a']); // sem séries, mas continua
  });

  it('não exclui o treino em andamento', async () => {
    await db.treinos.add(treino('c', '2026-11-09', 9, { status: 'em_andamento', fim: null }));
    await expect(excluirTreino(db, 'c')).rejects.toThrow('em andamento');
    expect(await db.treinos.get('c')).toBeDefined();
  });

  it('treinos concluídos do mais recente ao mais antigo', async () => {
    expect((await listarTreinosConcluidos(db)).map((t) => t.id)).toEqual(['b', 'a']);
  });
});

describe('cardio', () => {
  const cardio = (id: string, data: string, feitoEm = `${data}T07:00:00-03:00`) => ({
    id,
    data,
    tipo: 'Bicicleta',
    minutos: 35,
    fcMedia: 125,
    distanciaKm: null,
    esforco: 5,
    feitoEm,
  });

  it('salva, edita, lista do mais recente ao mais antigo e exclui', async () => {
    await salvarCardio(db, cardio('a', '2026-11-03'));
    await salvarCardio(db, cardio('b', '2026-11-05'));
    await salvarCardio(db, cardio('c', '2026-11-05', '2026-11-05T18:00:00-03:00'));
    await salvarCardio(db, { ...cardio('a', '2026-11-03'), minutos: 40 });
    expect((await listarCardio(db)).map((c) => c.id)).toEqual(['c', 'b', 'a']);
    expect((await listarCardio(db)).at(-1)?.minutos).toBe(40);
    await excluirCardio(db, 'b');
    expect((await listarCardio(db)).map((c) => c.id)).toEqual(['c', 'a']);
  });
});
