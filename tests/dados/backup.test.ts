import 'fake-indexeddb/auto';
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  APP_BACKUP,
  BackupInvalidoError,
  gerarBackup,
  marcarBackup,
  migrarBackup,
  perdasAoSubstituir,
  precisaLembrete,
  RestauracaoBloqueadaError,
  restaurarBackup,
  resumirBackup,
  type Backup,
} from '../../src/dados/backup';
import { RepzDb, VERSAO_SCHEMA } from '../../src/dados/db';
import { historicoDoExercicio } from '../../src/dados/historico-repo';
import { lerConfigs } from '../../src/dados/repos/config';
import { gravarMeta, lerMeta, lerPreferencias } from '../../src/dados/repos/meta';
import { listarPlanos, planoAtivo } from '../../src/dados/repos/planos';
import { estado, popular } from './popular';

const EM = '2026-11-10T21:00:00-03:00';
// Ida e volta pelo arquivo: o que importa é o JSON, não os objetos em memória
const peloArquivo = (b: Backup): unknown => JSON.parse(JSON.stringify(b));

let db: RepzDb;
let n = 0;
const novoDb = async () => {
  const d = new RepzDb(`backup-${++n}`);
  await d.open();
  return d;
};
beforeEach(async () => {
  db = await novoDb();
});
afterEach(async () => {
  db.close();
  await db.delete();
});

async function limpar(d: RepzDb) {
  await Promise.all(d.tables.map((t) => t.clear()));
}

describe('exportar backup', () => {
  it('leva tudo, com app, versão, data e o plano ativo; ultimoBackup já é a data da exportação', async () => {
    const plano = await popular(db);
    const b = await gerarBackup(db, EM);
    expect(b).toMatchObject({
      app: 'app-treino',
      versaoSchema: VERSAO_SCHEMA,
      exportadoEm: EM,
      planoAtivoId: plano.id,
    });
    expect(b.planos).toHaveLength(1);
    expect(b.treinos.map((t) => t.id).sort()).toEqual(['t1', 't2', 'tx']); // descartado vai junto (D6)
    expect(b.series).toHaveLength(5);
    expect(b.cardio).toHaveLength(2);
    expect(b.configExercicios).toHaveLength(2);
    expect(b.preferencias).toMatchObject({ vibrar: false, nomeExibicao: 'Raul', ultimoBackup: EM });
    // o banco só registra depois de o arquivo ser salvo
    expect((await lerPreferencias(db)).ultimoBackup).toBeNull();
    await marcarBackup(db, EM);
    expect((await lerPreferencias(db)).ultimoBackup).toBe(EM);
  });
});

describe('backup → limpar → restaurar', () => {
  it('substituir tudo devolve exatamente o mesmo estado em todas as stores', async () => {
    await popular(db, { emAndamento: false });
    const b = peloArquivo(await gerarBackup(db, EM));
    await marcarBackup(db, EM);
    const antes = await estado(db);

    await limpar(db);
    expect((await estado(db)).treinos).toEqual([]);
    await restaurarBackup(db, migrarBackup(b), 'substituir');
    expect(await estado(db)).toEqual(antes);
  });

  it('restaura num aparelho novo (outro banco) igual ao original', async () => {
    await popular(db);
    const b = peloArquivo(await gerarBackup(db, EM));
    await marcarBackup(db, EM);
    const outro = await novoDb();
    await restaurarBackup(outro, migrarBackup(b), 'substituir');
    expect(await estado(outro)).toEqual(await estado(db));
    outro.close();
    await outro.delete();
  });

  it('substituir apaga o que não está no backup e conta as perdas antes', async () => {
    await popular(db);
    const b = migrarBackup(peloArquivo(await gerarBackup(db, EM)));
    await db.cardio.add({ ...b.cardio[0]!, id: 'c-novo' });
    await db.treinos.add({ ...b.treinos[0]!, id: 't-novo' });
    await db.treinos.add({ ...b.treinos[0]!, id: 't-desc', status: 'descartado' });
    expect(await perdasAoSubstituir(db, b)).toEqual({ treinos: 1, cardio: 1 });
    await restaurarBackup(db, b, 'substituir');
    expect(await db.cardio.get('c-novo')).toBeUndefined();
    expect(await db.treinos.get('t-novo')).toBeUndefined();
    expect(await perdasAoSubstituir(db, b)).toEqual({ treinos: 0, cardio: 0 });
  });

  it('mantém a proteção do armazenamento deste aparelho', async () => {
    await popular(db);
    const b = migrarBackup(peloArquivo(await gerarBackup(db, EM)));
    await gravarMeta(db, 'persistencia', 'concedida');
    await restaurarBackup(db, b, 'substituir');
    expect(await lerMeta(db, 'persistencia')).toBe('concedida');
  });

  it('com treino em andamento não restaura nada (D21)', async () => {
    await popular(db, { emAndamento: true });
    const b = migrarBackup(peloArquivo(await gerarBackup(db, EM)));
    const antes = await estado(db);
    await expect(restaurarBackup(db, b, 'substituir')).rejects.toBeInstanceOf(RestauracaoBloqueadaError);
    await expect(restaurarBackup(db, b, 'mesclar')).rejects.toBeInstanceOf(RestauracaoBloqueadaError);
    expect(await estado(db)).toEqual(antes);
  });

  it('um backup feito durante o treino traz o treino em andamento de volta', async () => {
    await popular(db, { emAndamento: true });
    const b = migrarBackup(peloArquivo(await gerarBackup(db, EM)));
    const outro = await novoDb();
    await restaurarBackup(outro, b, 'substituir');
    expect((await outro.treinos.get('ta'))?.status).toBe('em_andamento');
    outro.close();
    await outro.delete();
  });
});

describe('mesclar sem duplicar (por id)', () => {
  it('mesclar o próprio backup não muda nada', async () => {
    await popular(db);
    const b = migrarBackup(peloArquivo(await gerarBackup(db, EM)));
    const antes = await estado(db);
    expect(await restaurarBackup(db, b, 'mesclar')).toEqual({ planos: 0, treinos: 0, series: 0, cardio: 0 });
    expect(await estado(db)).toEqual(antes);
  });

  it('acrescenta só o que falta; o que existe aqui prevalece', async () => {
    const plano = await popular(db);
    const b = migrarBackup(peloArquivo(await gerarBackup(db, EM)));
    // depois do backup: um cardio excluído, uma série editada, um treino novo
    await db.cardio.delete('c1');
    await db.series.update('t1-s2', { kg: 85 });
    await db.treinos.add({ ...b.treinos[1]!, id: 't3', data: '2026-11-09' });
    await gravarMeta(db, 'preferencias', { ...b.preferencias, vibrar: true });

    const r = await restaurarBackup(db, b, 'mesclar');
    expect(r).toEqual({ planos: 0, treinos: 0, series: 0, cardio: 1 });
    expect(await db.cardio.count()).toBe(2); // c1 volta (D22)
    expect((await db.series.get('t1-s2'))?.kg).toBe(85); // a edição daqui fica
    expect(await db.treinos.count()).toBe(4);
    expect((await lerPreferencias(db)).vibrar).toBe(true);
    expect(await lerMeta(db, 'planoAtivoId')).toBe(plano.id);
  });

  it('num aparelho com outros dados, junta os dois; sem plano ativo, assume o do backup', async () => {
    await popular(db);
    const b = migrarBackup(peloArquivo(await gerarBackup(db, EM)));
    const outro = await novoDb();
    await outro.cardio.add({ ...b.cardio[0]!, id: 'c-outro' });
    const r = await restaurarBackup(outro, b, 'mesclar');
    expect(r).toEqual({ planos: 1, treinos: 3, series: 5, cardio: 2 });
    expect(await outro.cardio.count()).toBe(3);
    expect((await planoAtivo(outro))?.id).toBe(b.planoAtivoId);
    // de novo: nada duplica
    expect(await restaurarBackup(outro, b, 'mesclar')).toEqual({
      planos: 0,
      treinos: 0,
      series: 0,
      cardio: 0,
    });
    expect(await outro.series.count()).toBe(5);
    outro.close();
    await outro.delete();
  });
});

describe('validação', () => {
  const valido = () =>
    JSON.parse(fs.readFileSync(new URL('../fixtures/backup-v1.json', import.meta.url), 'utf8'));

  it('recusa JSON de outro app ou que não é backup', () => {
    for (const x of [null, [], 'texto', 42, {}, { ...valido(), app: 'outro-app' }])
      expect(() => migrarBackup(x)).toThrow(new BackupInvalidoError('Este arquivo não é um backup do REPZ.'));
  });

  it('recusa versão futura, com a mensagem para atualizar o app', () => {
    expect(() => migrarBackup({ ...valido(), versaoSchema: VERSAO_SCHEMA + 1 })).toThrow(
      `Este backup foi feito numa versão mais nova do REPZ (dados v${VERSAO_SCHEMA + 1}; este app lê até a v${VERSAO_SCHEMA}). Atualize o app e tente de novo.`,
    );
  });

  it('recusa versão ausente ou inválida', () => {
    for (const v of [undefined, 0, 1.5, '1'])
      expect(() => migrarBackup({ ...valido(), versaoSchema: v })).toThrow(
        'O backup não informa uma versão válida dos dados.',
      );
  });

  it('recusa listas faltando ou malformadas e backup sem data', () => {
    const semSeries = valido();
    delete semSeries.series;
    expect(() => migrarBackup(semSeries)).toThrow('a lista de séries não pôde ser lida');
    expect(() => migrarBackup({ ...valido(), cardio: [{ data: '2026-11-01' }] })).toThrow(
      'a lista de cardio não pôde ser lida',
    );
    expect(() => migrarBackup({ ...valido(), configExercicios: [{ chave: 3 }] })).toThrow(
      'a lista de configurações de exercício não pôde ser lida',
    );
    expect(() => migrarBackup({ ...valido(), exportadoEm: null })).toThrow('falta a data da exportação');
  });
});

describe('migração de backup (fixture v1 → atual)', () => {
  const fixture = () =>
    JSON.parse(fs.readFileSync(new URL('../fixtures/backup-v1.json', import.meta.url), 'utf8'));

  it('a fixture v1 chega à versão atual sem perder nada', () => {
    const json = fixture();
    const b = migrarBackup(json);
    expect(b.versaoSchema).toBe(VERSAO_SCHEMA);
    expect(b.app).toBe(APP_BACKUP);
    expect(b.planoAtivoId).toBe(json.planoAtivoId);
    for (const lista of ['planos', 'treinos', 'series', 'cardio', 'configExercicios'] as const)
      expect(b[lista]).toEqual(json[lista]);
    expect(b.preferencias).toEqual(json.preferencias);
  });

  it('restaurada, a fixture v1 alimenta o histórico e o motor como antes', async () => {
    await restaurarBackup(db, migrarBackup(fixture()), 'substituir');
    expect((await planoAtivo(db))?.nome).toBe('Hipertrofia natural 5x');
    const h = await historicoDoExercicio(
      db,
      await lerConfigs(db),
      await listarPlanos(db),
      'supino reto c barra',
    );
    expect(h.treinos.map((t) => [t.treinoId, t.series.length])).toEqual([
      ['t1', 2],
      ['t2', 1],
    ]);
    expect((await lerConfigs(db)).get('supino reto c barra')?.apelidoDe).toBe('supino reto barra');
  });

  it('completa campos que faltam: preferências novas e plano ativo (o mais recente)', () => {
    const json = fixture();
    delete json.planoAtivoId;
    const b = migrarBackup({ ...json, preferencias: { somDescanso: false } });
    expect(b.planoAtivoId).toBe(json.planos[0].id);
    expect(b.preferencias).toEqual({
      somDescanso: false,
      vibrar: true,
      manterTelaLigada: true,
      ultimoBackup: null,
      nomeExibicao: null,
    });
    expect(migrarBackup({ ...json, planos: [], planoAtivoId: 'sumiu' }).planoAtivoId).toBeNull();
  });

  it('resumo para a confirmação: sem descartados, com o período', () => {
    expect(resumirBackup(migrarBackup(fixture()))).toEqual({
      exportadoEm: '2026-11-10T21:00:00-03:00',
      planoAtivo: 'Hipertrofia natural 5x',
      planos: 1,
      treinos: 2,
      series: 4,
      cardio: 2,
      periodo: { de: '2026-11-02', ate: '2026-11-05' },
    });
  });
});

describe('lembrete de backup (9.9)', () => {
  it('nunca feito: só com pelo menos 1 treino', () => {
    expect(precisaLembrete(null, 0, '2026-11-10')).toBe(false);
    expect(precisaLembrete(null, 1, '2026-11-10')).toBe(true);
  });
  it('feito: depois de 30 dias', () => {
    expect(precisaLembrete('2026-10-11T22:00:00-03:00', 5, '2026-11-10')).toBe(false); // 30 dias
    expect(precisaLembrete('2026-10-10T08:00:00-03:00', 5, '2026-11-10')).toBe(true); // 31 dias
  });
});
