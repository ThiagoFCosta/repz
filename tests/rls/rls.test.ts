/**
 * RLS contra o projeto Supabase real (docs/v2/ARCHITECTURE.md 7.2 e 12; padrão do Prisma, tests/rls).
 * Roda só com .env/.env.local configurados (URL, chave pública e as contas de teste de
 * scripts/criar-usuarios-teste.mjs); senão é pulado com aviso.
 * Os ids das linhas de teste são fixos: rodar de novo regrava as mesmas linhas, sem acumular.
 */
import { createHash } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const env = loadEnv('test', process.cwd(), '');
const url = env.VITE_SUPABASE_URL;
const chave = env.VITE_SUPABASE_ANON_KEY;
const contaA = { email: env.RLS_A_EMAIL, senha: env.RLS_A_SENHA };
const contaB = { email: env.RLS_B_EMAIL, senha: env.RLS_B_SENHA };
const configurado = Boolean(url && chave && contaA.email && contaA.senha && contaB.email && contaB.senha);
if (!configurado) console.warn('[rls] pulado: configure VITE_SUPABASE_* e RLS_* (.env, .env.local).');

const novoCliente = () =>
  createClient(url!, chave!, { auth: { persistSession: false, autoRefreshToken: false } });
async function entrar(c: { email?: string; senha?: string }) {
  const cliente = novoCliente();
  const { data, error } = await cliente.auth.signInWithPassword({ email: c.email!, password: c.senha! });
  if (error) throw new Error(`login de teste falhou (${c.email}): ${error.message}`);
  return { cliente, id: data.user.id };
}

// uuid determinístico por nome (formato v5), para as linhas de teste
function idFixo(nome: string): string {
  const h = createHash('sha1').update(`repz-rls:${nome}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

const ARROZ_TACO = 'a215a217-2e06-543b-8828-ec50778bd114'; // "Arroz, integral, cozido" (seed global)
const agora = () => new Date().toISOString();

// Uma linha mínima válida por tabela de dados do usuário, na ordem das chaves estrangeiras
function linhas(dono: string): [string, Record<string, unknown>][] {
  const base = (t: string) => ({ id: idFixo(`${dono}:${t}`), atualizado_em: agora() });
  const plano = idFixo(`${dono}:planos_treino`);
  const treino = idFixo(`${dono}:treinos`);
  return [
    ['perfis', { ...base('perfis'), nome: 'Teste RLS' }],
    ['preferencias', { ...base('preferencias') }],
    ['planos_treino', { ...base('planos_treino'), nome: 'Plano RLS', importado_em: agora(), estrutura: {} }],
    ['config_exercicio', { ...base('config_exercicio'), chave: 'supino-reto' }],
    ['checkins', { ...base('checkins'), data: '2026-11-27', sono_horas: 7.5 }],
    [
      'treinos',
      {
        ...base('treinos'),
        plano_id: plano,
        sessao_id: 's1',
        sessao_nome: 'Push',
        data: '2026-11-27',
        inicio: agora(),
        status: 'concluido',
      },
    ],
    [
      'sugestoes',
      {
        ...base('sugestoes'),
        treino_id: treino,
        exercicio_prescrito_id: 'e1',
        chave: 'supino-reto',
        variante: 'Barra',
        versao_motor: '2.0.0',
        versao_parametros: 1,
        regra: '7',
        entradas: {},
        acao: 'manter',
        carga: 80,
        motivo: 'teste',
      },
    ],
    [
      'series',
      {
        ...base('series'),
        treino_id: treino,
        exercicio_prescrito_id: 'e1',
        chave: 'supino-reto',
        variante: 'Barra',
        ordem: 1,
        kg: 80,
        reps: 8,
        feita_em: agora(),
      },
    ],
    ['cardio', { ...base('cardio'), tipo: 'Bicicleta', data: '2026-11-27', minutos: 30, feito_em: agora() }],
    ['parametros_motor', { ...base('parametros_motor'), versao: 1, parametros: {} }],
    ['medicoes_peso', { ...base('medicoes_peso'), data: '2026-11-27', kg: 83.4 }],
    ['medicoes_bio', { ...base('medicoes_bio'), data: '2026-11-27', gordura_pct: 24.1 }],
    ['medicoes_fita', { ...base('medicoes_fita'), data: '2026-11-27', local: 'cintura', cm: 89.5 }],
    ['alimentos', { ...base('alimentos'), nome: 'Meu pão', fonte: 'usuario', kcal: 250 }],
    ['alimentos_alias', { ...base('alimentos_alias'), texto_normalizado: 'arroz', alimento_id: ARROZ_TACO }],
    ['planos_alimentares', { ...base('planos_alimentares'), origem: 'manual', estrutura: {} }],
    ['rascunhos', { ...base('rascunhos'), tipo: 'teste', conteudo: {}, previa: 'teste', origem: 'app' }],
    ['avisos', { ...base('avisos'), tipo: 'teste', texto: 'aviso de teste' }],
    [
      'comentarios_agente',
      { ...base('comentarios_agente'), alvo: 'semana', alvo_id: '2026-W48', texto: 'teste' },
    ],
    ['execucoes_rotina', { ...base('execucoes_rotina'), rotina: 'teste', executada_em: agora() }],
    ['auditorias', { ...base('auditorias'), periodo: '2026-11', versao_parametros: 1, metricas: {} }],
    ['agente_clientes', { ...base('agente_clientes'), client_id: 'cliente-de-teste' }],
  ];
}

describe.skipIf(!configurado)('RLS: cada usuário só vê e grava os próprios dados', () => {
  let a: SupabaseClient;
  let b: SupabaseClient;
  let idA: string;
  let idB: string;

  beforeAll(async () => {
    ({ cliente: a, id: idA } = await entrar(contaA));
    ({ cliente: b, id: idB } = await entrar(contaB));
    for (const [t, linha] of linhas('A')) {
      const { error } = await a.from(t).upsert(linha);
      if (error) throw new Error(`${t}: ${error.message}`);
    }
  }, 60_000);

  afterAll(async () => {
    await a?.auth.signOut({ scope: 'local' });
    await b?.auth.signOut({ scope: 'local' });
  });

  it('o dono lê as próprias linhas em todas as tabelas', async () => {
    for (const [t, linha] of linhas('A')) {
      const { data, error } = await a.from(t).select('id, user_id').eq('id', linha.id);
      expect(error, t).toBeNull();
      expect(data, t).toEqual([{ id: linha.id, user_id: idA }]);
    }
  });

  it('B não lê nenhuma linha de A', async () => {
    for (const [t, linha] of linhas('A')) {
      const { data, error } = await b.from(t).select('id').eq('id', linha.id);
      expect(error, t).toBeNull();
      expect(data, t).toEqual([]);
    }
  });

  it('B não altera linha de A (0 linhas afetadas)', async () => {
    for (const [t, linha] of linhas('A')) {
      const { data, error } = await b
        .from(t)
        .update({ atualizado_em: agora() })
        .eq('id', linha.id)
        .select('id');
      expect(error, t).toBeNull();
      expect(data, t).toEqual([]);
    }
  });

  it('B não grava em nome de A', async () => {
    for (const [t, linha] of linhas('B')) {
      const { error } = await b.from(t).insert({ ...linha, user_id: idA });
      expect(error, t).not.toBeNull();
    }
  });

  it('ninguém apaga linhas pela API (exclusão é excluido_em)', async () => {
    const [t, linha] = linhas('A')[0]!;
    const { error } = await a.from(t).delete().eq('id', linha.id);
    expect(error).not.toBeNull();
  });

  it('sem login não se lê nada', async () => {
    const anon = novoCliente();
    for (const t of ['perfis', 'treinos', 'series', 'alimentos', 'referencias']) {
      const { data } = await anon.from(t).select('*').limit(1);
      expect(data ?? [], t).toEqual([]);
    }
  });

  it('a base global de alimentos é legível e não é gravável', async () => {
    const { data } = await b.from('alimentos').select('id, nome').eq('id', ARROZ_TACO);
    expect(data).toEqual([{ id: ARROZ_TACO, nome: 'Arroz, integral, cozido' }]);
    const alt = await b.from('alimentos').update({ kcal: 1 }).eq('id', ARROZ_TACO).select('id');
    expect(alt.data).toEqual([]);
    const ins = await b
      .from('alimentos')
      .insert({ id: idFixo('global'), user_id: null, nome: 'x', fonte: 'taco' });
    expect(ins.error).not.toBeNull();
  });

  it('referências: leitura para quem está logado, sem escrita', async () => {
    const { error } = await a.from('referencias').select('chave').limit(1);
    expect(error).toBeNull();
    const ins = await a
      .from('referencias')
      .insert({ chave: 'x', citacao: 'x', nivel: 'pratica', resumo: 'x' });
    expect(ins.error).not.toBeNull();
  });

  it('last-write-wins: uma escrita mais velha não vence e o servidor_em anda', async () => {
    const id = idFixo('A:medicoes_peso');
    const novo = new Date().toISOString();
    await a.from('medicoes_peso').update({ kg: 83.4, atualizado_em: novo }).eq('id', id);
    const antes = (await a.from('medicoes_peso').select('kg, servidor_em').eq('id', id).single()).data!;
    const velho = new Date(Date.now() - 3_600_000).toISOString();
    await a.from('medicoes_peso').update({ kg: 99.9, atualizado_em: velho }).eq('id', id);
    const depois = (await a.from('medicoes_peso').select('kg, servidor_em').eq('id', id).single()).data!;
    expect(Number(depois.kg)).toBe(83.4);
    expect(Date.parse(depois.servidor_em)).toBeGreaterThan(Date.parse(antes.servidor_em));
  });

  it('compartilhar plano: B resgata uma cópia independente; o código vale uma vez e não serve para o dono', async () => {
    const plano = idFixo('A:planos_treino');
    const { data: codigo, error } = await a.rpc('gerar_codigo_plano', { p_plano: plano });
    expect(error).toBeNull();
    expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect((await a.rpc('resgatar_plano', { p_codigo: codigo })).error).not.toBeNull();
    const r = await b.rpc('resgatar_plano', { p_codigo: String(codigo).toLowerCase() });
    expect(r.error).toBeNull();
    const copia = (
      await b.from('planos_treino').select('nome, user_id, origem, ativo').eq('id', r.data).single()
    ).data;
    expect(copia).toEqual({ nome: 'Plano RLS', user_id: idB, origem: 'compartilhado', ativo: false });
    expect((await b.rpc('resgatar_plano', { p_codigo: codigo })).error).not.toBeNull();
    // a cópia é da conta de B: some de lá depois do teste (soft delete)
    await b.from('planos_treino').update({ excluido_em: agora(), atualizado_em: agora() }).eq('id', r.data);
  });

  it('B não gera código para o plano de A', async () => {
    const { error } = await b.rpc('gerar_codigo_plano', { p_plano: idFixo('A:planos_treino') });
    expect(error).not.toBeNull();
  });
});
