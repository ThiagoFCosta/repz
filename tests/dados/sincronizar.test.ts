import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { RepzDb } from '../../src/dados/db';
import { idConfig } from '../../src/dados/mapa';
import { excluirCardio, salvarCardio } from '../../src/dados/repos/cardio';
import { definirIncremento, lerConfigs } from '../../src/dados/repos/config';
import { alterarPreferencias, gravarMeta, lerMeta, lerPreferencias } from '../../src/dados/repos/meta';
import { criarTreino, persistirTransicao, seriesDoTreino } from '../../src/dados/repos/treinos';
import { contarPendentes, limparErros, sincronizar } from '../../src/dados/sincronizar';
import type { CardioRealizado, Plano, SerieRealizada, Treino } from '../../src/dados/tipos';
import { MemoriaRemoto } from '../../src/remoto/memoria';
import { ErroRede } from '../../src/remoto/tipos';

const USUARIO = '11111111-1111-4111-8111-111111111111';
const abertos: RepzDb[] = [];
let n = 0;
async function aparelho(): Promise<RepzDb> {
  const db = new RepzDb(`sync-${++n}`);
  await db.open();
  abertos.push(db);
  return db;
}
afterEach(async () => {
  for (const db of abertos.splice(0)) {
    db.close();
    await db.delete();
  }
});

const plano: Plano = {
  id: 'p1',
  nome: 'Plano',
  autor: 'IA',
  dataPlano: null,
  importadoEm: '2026-11-20T10:00:00-03:00',
  inicioBloco: '2026-11-23',
  ajusteSemana: 0,
  progressao: {
    tipo: 'dupla',
    rir: { min: 1, max: 2 },
    carga: { min: 2, max: 5 },
    estagnado: 3,
  } as Plano['progressao'],
  bloco: null,
  sessoes: [],
  cardio: [],
  textoOriginal: 'TREINO v1',
  arquivoNome: null,
  avisosImportacao: [],
};
const treino = (id: string): Treino => ({
  id,
  planoId: 'p1',
  sessaoId: 's',
  sessaoNome: 'Push',
  data: '2026-11-27',
  inicio: '2026-11-27T19:00:00-03:00',
  fim: null,
  semanaBloco: 1,
  status: 'em_andamento',
  estadoUI: null,
  notas: {},
  atualizadoEm: '2026-11-27T19:00:00-03:00',
});
const serie = (id: string, ordem: number, reps: number): SerieRealizada => ({
  id,
  treinoId: 't1',
  exercicioPrescritoId: 'e',
  chave: 'supino',
  variante: 'Supino',
  ordem,
  kg: 80,
  reps,
  rir: 2,
  aquecimento: false,
  feitaEm: `2026-11-27T19:0${ordem}:00-03:00`,
  sugestaoKg: 80,
  sugestaoAceita: true,
});
const cardio = (id: string, minutos = 30): CardioRealizado => ({
  id,
  data: '2026-11-27',
  tipo: 'Bicicleta',
  minutos,
  fcMedia: 120,
  distanciaKm: null,
  esforco: 5,
  feitoEm: '2026-11-27T07:00:00-03:00',
});

// Um treino completo feito sem rede
async function treinoOffline(db: RepzDb) {
  await db.planos.add(plano);
  await gravarMeta(db, 'planoAtivoId', 'p1');
  await criarTreino(db, treino('t1'));
  for (const [i, reps] of [10, 9, 8].entries())
    await persistirTransicao(db, 't1', { novas: [serie(`s${i + 1}`, i + 1, reps)], edicoes: [], treino: {} });
  await persistirTransicao(db, 't1', {
    novas: [],
    edicoes: [],
    treino: { status: 'concluido', fim: '2026-11-27T19:50:00-03:00' },
  });
}

describe('sincronização (ARCHITECTURE, seção 8)', () => {
  it('treino offline: nada sobe sem rede; com rede, tudo sobe uma vez, sem duplicar', async () => {
    const remoto = new MemoriaRemoto({});
    const db = await aparelho();
    await treinoOffline(db);

    remoto.semRede = true;
    await expect(sincronizar(db, remoto, USUARIO)).rejects.toBeInstanceOf(ErroRede);
    expect((await contarPendentes(db)).pendentes).toBe(6); // plano, plano ativo, treino, 3 séries

    remoto.semRede = false;
    const r = await sincronizar(db, remoto, USUARIO);
    expect(r.recusados).toBe(0);
    expect((await contarPendentes(db)).pendentes).toBe(0);
    expect(remoto.linhas('series')).toHaveLength(3);
    expect(remoto.linhas('treinos')).toMatchObject([{ id: 't1', status: 'concluido' }]);
    expect(remoto.linhas('planos_treino')).toMatchObject([{ id: 'p1', ativo: true }]);

    // reenviar não duplica nada
    await sincronizar(db, remoto, USUARIO);
    expect(remoto.linhas('series')).toHaveLength(3);
  });

  it('aparelho novo recebe tudo do servidor: plano ativo, treino, séries em ordem, preferências e config', async () => {
    const remoto = new MemoriaRemoto({});
    const a = await aparelho();
    await treinoOffline(a);
    await alterarPreferencias(a, { vibrar: false });
    await definirIncremento(a, 'supino', 1);
    await sincronizar(a, remoto, USUARIO);
    expect(remoto.linhas('config_exercicio')).toMatchObject([
      { id: idConfig(USUARIO, 'supino'), incremento_kg: 1 },
    ]);

    const b = await aparelho();
    const r = await sincronizar(b, remoto, USUARIO);
    expect(r.recebidos).toBeGreaterThan(0);
    expect(await lerMeta(b, 'planoAtivoId')).toBe('p1');
    expect((await b.planos.get('p1'))?.inicioBloco).toBe('2026-11-23');
    expect((await seriesDoTreino(b, 't1')).map((s) => s.reps)).toEqual([10, 9, 8]);
    expect((await lerPreferencias(b)).vibrar).toBe(false);
    expect((await lerConfigs(b)).get('supino')?.incrementoKg).toBe(1);
    // o que veio do servidor não volta como pendente
    expect((await contarPendentes(b)).pendentes).toBe(0);
  });

  it('dois aparelhos editam o mesmo cardio: vale a última edição', async () => {
    const remoto = new MemoriaRemoto({});
    const a = await aparelho();
    const b = await aparelho();
    await salvarCardio(a, cardio('c1', 30));
    await sincronizar(a, remoto, USUARIO);
    await sincronizar(b, remoto, USUARIO);

    await salvarCardio(b, cardio('c1', 40)); // mais velha
    await new Promise((r) => setTimeout(r, 5));
    await salvarCardio(a, cardio('c1', 45)); // mais nova
    await sincronizar(a, remoto, USUARIO);
    await sincronizar(b, remoto, USUARIO); // a de B é mais velha: perde e recebe a de A
    expect((await b.cardio.get('c1'))?.minutos).toBe(45);
    expect(remoto.linhas('cardio')[0]?.minutos).toBe(45);
  });

  it('excluir num aparelho exclui no outro', async () => {
    const remoto = new MemoriaRemoto({});
    const a = await aparelho();
    const b = await aparelho();
    await salvarCardio(a, cardio('c1'));
    await sincronizar(a, remoto, USUARIO);
    await sincronizar(b, remoto, USUARIO);
    expect(await b.cardio.count()).toBe(1);
    await excluirCardio(a, 'c1');
    await sincronizar(a, remoto, USUARIO);
    expect(remoto.linhas('cardio')[0]?.excluido_em).toBeTruthy();
    await sincronizar(b, remoto, USUARIO);
    expect(await b.cardio.count()).toBe(0);
  });

  it('recusa do servidor não trava a fila: a ruim fica com erro, as outras sobem; "tentar de novo" reenvia', async () => {
    const remoto = new MemoriaRemoto({});
    remoto.recusar = (_t, l) => (l.id === 'c2' ? 'minutos inválidos' : null);
    const db = await aparelho();
    await salvarCardio(db, cardio('c1'));
    await salvarCardio(db, cardio('c2'));
    await salvarCardio(db, cardio('c3'));
    const r = await sincronizar(db, remoto, USUARIO);
    expect(r.recusados).toBe(1);
    expect(
      remoto
        .linhas('cardio')
        .map((l) => l.id)
        .sort(),
    ).toEqual(['c1', 'c3']);
    const { pendentes, erros } = await contarPendentes(db);
    expect(pendentes).toBe(1);
    expect(erros).toMatchObject([{ id: 'c2', erro: 'minutos inválidos' }]);

    // a marca com erro não é reenviada sozinha
    remoto.recusar = () => null;
    await sincronizar(db, remoto, USUARIO);
    expect(remoto.linhas('cardio')).toHaveLength(2);
    await limparErros(db);
    await sincronizar(db, remoto, USUARIO);
    expect(remoto.linhas('cardio')).toHaveLength(3);
  });

  it('escrita local feita enquanto o envio estava no ar continua pendente', async () => {
    const remoto = new MemoriaRemoto({});
    const db = await aparelho();
    await salvarCardio(db, cardio('c1', 30));
    const enviar = remoto.enviar.bind(remoto);
    remoto.enviar = async (t, linhas) => {
      await salvarCardio(db, cardio('c1', 35)); // o usuário editou no meio
      return enviar(t, linhas);
    };
    await sincronizar(db, remoto, USUARIO);
    expect((await contarPendentes(db)).pendentes).toBe(1);
    remoto.enviar = enviar;
    await sincronizar(db, remoto, USUARIO);
    expect(remoto.linhas('cardio')[0]?.minutos).toBe(35);
    expect((await db.cardio.get('c1'))?.minutos).toBe(35);
  });

  it('trocar o plano ativo deixa um só ativo no servidor', async () => {
    const remoto = new MemoriaRemoto({});
    const db = await aparelho();
    await db.planos.add(plano);
    await db.planos.add({ ...plano, id: 'p2', importadoEm: '2026-11-25T10:00:00-03:00' });
    await gravarMeta(db, 'planoAtivoId', 'p1');
    await sincronizar(db, remoto, USUARIO);
    await gravarMeta(db, 'planoAtivoId', 'p2');
    await sincronizar(db, remoto, USUARIO);
    const ativos = remoto.linhas('planos_treino').filter((l) => l.ativo);
    expect(ativos.map((l) => l.id)).toEqual(['p2']);
    expect(await lerMeta(db, 'planoAtivoId')).toBe('p2');
  });
});
