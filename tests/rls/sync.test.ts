/**
 * Sincronização contra o projeto Supabase real (V2): confere o mapeamento local ↔ colunas, o RLS e os triggers
 * (last-write-wins, servidor_em). Usa a conta de teste A; pulado sem .env.local.
 */
import 'fake-indexeddb/auto';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { afterAll, describe, expect, it } from 'vitest';
import { RepzDb } from '../../src/dados/db';
import { salvarCardio } from '../../src/dados/repos/cardio';
import { gravarMeta, lerMeta } from '../../src/dados/repos/meta';
import { criarTreino, persistirTransicao, seriesDoTreino } from '../../src/dados/repos/treinos';
import { contarPendentes, sincronizar } from '../../src/dados/sincronizar';
import type { Plano } from '../../src/dados/tipos';
import { SupabaseRemoto } from '../../src/remoto/supabase';

const env = loadEnv('test', process.cwd(), '');
const configurado = Boolean(
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY && env.RLS_A_EMAIL && env.RLS_A_SENHA,
);

describe.skipIf(!configurado)('sincronização com o Supabase real', () => {
  const bancos: RepzDb[] = [];
  afterAll(async () => {
    for (const b of bancos) {
      b.close();
      await b.delete();
    }
  });

  it('treino feito num aparelho chega inteiro em outro', async () => {
    const cliente = createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const { data, error } = await cliente.auth.signInWithPassword({
      email: env.RLS_A_EMAIL!,
      password: env.RLS_A_SENHA!,
    });
    if (error) throw error;
    const usuario = data.user.id;
    const remoto = new SupabaseRemoto(async () => cliente);

    const [idPlano, idTreino, idCardio] = [randomUUID(), randomUUID(), randomUUID()];
    const a = new RepzDb(`real-a-${idPlano}`);
    bancos.push(a);
    const plano: Plano = {
      id: idPlano,
      nome: 'Plano sync real',
      autor: 'teste',
      dataPlano: null,
      importadoEm: '2026-11-27T10:00:00-03:00',
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
      textoOriginal: '',
      arquivoNome: null,
      avisosImportacao: [],
    };
    await a.planos.add(plano);
    await gravarMeta(a, 'planoAtivoId', idPlano);
    await criarTreino(a, {
      id: idTreino,
      planoId: idPlano,
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
    const ids = [randomUUID(), randomUUID()];
    await persistirTransicao(a, idTreino, {
      novas: ids.map((id, i) => ({
        id,
        treinoId: idTreino,
        exercicioPrescritoId: 'e',
        chave: 'supino',
        variante: 'Supino',
        ordem: i + 1,
        kg: 82.5,
        reps: 10 - i,
        rir: 2,
        aquecimento: false,
        feitaEm: '2026-11-27T19:05:00-03:00',
        sugestaoKg: 82.5,
        sugestaoAceita: true,
      })),
      edicoes: [],
      treino: { status: 'concluido', fim: '2026-11-27T19:50:00-03:00' },
    });
    await salvarCardio(a, {
      id: idCardio,
      data: '2026-11-27',
      tipo: 'Bicicleta',
      minutos: 30,
      fcMedia: 120,
      distanciaKm: 8.5,
      esforco: 6,
      feitoEm: '2026-11-27T07:00:00-03:00',
    });

    const r = await sincronizar(a, remoto, usuario);
    expect(r.recusados).toBe(0);
    expect((await contarPendentes(a)).pendentes).toBe(0);

    const b = new RepzDb(`real-b-${idPlano}`);
    bancos.push(b);
    await sincronizar(b, remoto, usuario);
    expect(await lerMeta(b, 'planoAtivoId')).toBe(idPlano);
    expect((await b.treinos.get(idTreino))?.status).toBe('concluido');
    expect((await seriesDoTreino(b, idTreino)).map((s) => [s.kg, s.reps])).toEqual([
      [82.5, 10],
      [82.5, 9],
    ]);
    expect(await b.cardio.get(idCardio)).toMatchObject({ minutos: 30, distanciaKm: 8.5, esforco: 6 });
    expect((await contarPendentes(b)).pendentes).toBe(0);

    // limpeza: o plano de teste deixa de ser o ativo e sai (soft delete)
    await remoto.ativarPlano(null, new Date().toISOString());
    await remoto.excluir('planos_treino', [{ id: idPlano, em: new Date().toISOString() }]);
  }, 120_000);
});
