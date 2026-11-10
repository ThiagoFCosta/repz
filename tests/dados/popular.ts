// Banco de teste com um pouco de tudo: plano do Raul, treinos (concluído, descartado, em andamento),
// séries com aquecimento, cardio, configuração por exercício e preferências.

import fs from 'node:fs';
import { parse } from '../../src/dominio/formato/parser';
import type { RepzDb } from '../../src/dados/db';
import { definirIncremento, vincular } from '../../src/dados/repos/config';
import { gravarMeta } from '../../src/dados/repos/meta';
import { salvarPlano } from '../../src/dados/repos/planos';
import { PREFERENCIAS_PADRAO, type Plano, type SerieRealizada, type Treino } from '../../src/dados/tipos';

const texto = fs.readFileSync(new URL('../fixtures/raul.treino.txt', import.meta.url), 'utf8');
const r = parse(texto);

export async function popular(db: RepzDb, opcoes: { emAndamento?: boolean } = {}): Promise<Plano> {
  const plano = await salvarPlano(db, {
    importado: r.plano!,
    inicioBloco: '2026-09-07',
    textoOriginal: r.textoBloco,
    arquivoNome: 'plano-raul.pdf',
    avisos: [],
    vinculos: {},
    importadoEm: '2026-09-01T20:00:00-03:00',
  });
  const push = plano.sessoes[0]!;
  const supino = push.itens[1]!; // Supino reto [barra / maquina]
  const treino = (id: string, data: string, semana: number, extra: Partial<Treino> = {}): Treino => ({
    id,
    planoId: plano.id,
    sessaoId: push.id,
    sessaoNome: push.nome,
    data,
    inicio: `${data}T19:00:00-03:00`,
    fim: `${data}T20:05:00-03:00`,
    semanaBloco: semana,
    status: 'concluido',
    estadoUI: null,
    notas: {},
    atualizadoEm: `${data}T20:05:00-03:00`,
    ...extra,
  });
  let n = 0;
  const serie = (
    treinoId: string,
    data: string,
    kg: number,
    reps: number,
    rir: number | null,
    extra: Partial<SerieRealizada> = {},
  ): SerieRealizada => ({
    id: `${treinoId}-s${++n}`,
    treinoId,
    exercicioPrescritoId: supino.id,
    chave: supino.chaves[0]!,
    variante: supino.variantes[0]!,
    ordem: n,
    kg,
    reps,
    rir,
    aquecimento: false,
    feitaEm: `${data}T19:${String(10 + n).padStart(2, '0')}:00-03:00`,
    sugestaoKg: null,
    sugestaoAceita: null,
    ...extra,
  });
  await db.treinos.bulkAdd([
    treino('t1', '2026-11-02', 9, { notas: { [supino.id]: 'pegada; "fechada"' } }),
    treino('t2', '2026-11-05', 9),
    treino('tx', '2026-11-06', 9, { status: 'descartado' }),
    ...(opcoes.emAndamento ? [treino('ta', '2026-11-09', 10, { status: 'em_andamento', fim: null })] : []),
  ]);
  await db.series.bulkAdd([
    serie('t1', '2026-11-02', 40, 10, null, { aquecimento: true }),
    serie('t1', '2026-11-02', 80, 10, 2, { sugestaoKg: 80, sugestaoAceita: true }),
    serie('t1', '2026-11-02', 80, 9, null),
    serie('t2', '2026-11-05', 82.5, 8, 4),
    serie('tx', '2026-11-06', 200, 10, 2),
  ]);
  await db.cardio.bulkAdd([
    {
      id: 'c1',
      data: '2026-11-03',
      tipo: 'Remo',
      minutos: 35,
      fcMedia: 128,
      distanciaKm: 6.25,
      esforco: 6,
      feitoEm: '2026-11-03T07:30:00-03:00',
    },
    {
      id: 'c2',
      data: '2026-11-04',
      tipo: 'Outro: Corrida; leve',
      minutos: 20.5,
      fcMedia: null,
      distanciaKm: null,
      esforco: null,
      feitoEm: '2026-11-04T07:30:00-03:00',
    },
  ]);
  await definirIncremento(db, supino.chaves[0]!, 1.25);
  await vincular(db, 'supino reto c barra', supino.chaves[0]!);
  await gravarMeta(db, 'preferencias', { ...PREFERENCIAS_PADRAO, vibrar: false, nomeExibicao: 'Raul' });
  return plano;
}

// Conteúdo de todas as stores, para comparar estados
export async function estado(db: RepzDb) {
  return {
    planos: await db.planos.toArray(),
    treinos: await db.treinos.toArray(),
    series: await db.series.toArray(),
    cardio: await db.cardio.toArray(),
    configExercicios: await db.configExercicios.toArray(),
    meta: await db.meta.toArray(),
  };
}
