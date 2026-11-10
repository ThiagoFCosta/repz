import { describe, expect, it } from 'vitest';
import {
  ESTADO_OCIOSO,
  reduzir,
  retomar,
  type EstadoTreino,
  type Evento,
  type ItemTreino,
} from '../../../src/dominio/treino/maquina';
import { rodada } from '../../../src/dominio/treino/biset';

// Push do Raul na semana 1: supino inclinado, supino reto [barra / maquina], desenvolvimento,
// SS1 elevação lateral (4) + tríceps na corda (3), tríceps [francês / testa]
const PUSH: ItemTreino[] = [
  { grupo: null, descanso: 180 },
  { grupo: null, descanso: 180 },
  { grupo: null, descanso: 120 },
  { grupo: 1, descanso: 90 },
  { grupo: 1, descanso: 90 },
  { grupo: null, descanso: 90 },
];
const ALVO = [3, 3, 3, 4, 3, 3];
const T0 = 1_700_000_000_000;
const D = { kg: 20, reps: 10, rir: 2 };

function iniciar(itens = PUSH, alvo = ALVO, variante: (number | null)[] = itens.map(() => 0)) {
  return reduzir(ESTADO_OCIOSO, { tipo: 'INICIAR', itens, alvo, variante, semana: 1 }, T0).estado;
}

// Aplica uma sequência de eventos e acumula os efeitos
function rodar(e: EstadoTreino, eventos: Evento[], agora = T0) {
  const efeitos = [];
  for (const ev of eventos) {
    const t = reduzir(e, ev, agora);
    e = t.estado;
    efeitos.push(...t.efeitos);
  }
  return { estado: e, efeitos };
}

const concluir: Evento = { tipo: 'CONCLUIR_SERIE', dados: D };
const pular: Evento = { tipo: 'PULAR_DESCANSO' };

describe('INICIAR', () => {
  it('vai para o primeiro item, com contadores zerados', () => {
    const e = iniciar();
    expect(e.etapa).toEqual({ tipo: 'registrando', item: 0 });
    expect(e.feitas).toEqual([0, 0, 0, 0, 0, 0]);
    expect(e.semana).toBe(1);
  });

  it('só a partir de ocioso', () => {
    const e = iniciar();
    expect(reduzir(e, { tipo: 'INICIAR', itens: [], alvo: [], variante: [], semana: null }, T0).estado).toBe(
      e,
    );
  });

  it('sessão sem séries vai direto ao resumo', () => {
    expect(iniciar([{ grupo: null, descanso: 60 }], [0]).etapa).toEqual({ tipo: 'resumo' });
  });
});

describe('CONCLUIR_SERIE', () => {
  it('grava a série e inicia o descanso do item', () => {
    const t = reduzir(iniciar(), concluir, T0);
    expect(t.estado.feitas[0]).toBe(1);
    expect(t.estado.etapa).toEqual({ tipo: 'descanso', fimEm: T0 + 180_000, duracao: 180, proximo: 0 });
    expect(t.efeitos).toEqual([
      { tipo: 'gravarSerie', item: 0, variante: 0, ordem: 1, aquecimento: false, dados: D },
      { tipo: 'iniciarDescanso', fimEm: T0 + 180_000 },
    ]);
  });

  it('última série do item descansa e segue para o próximo item', () => {
    const { estado } = rodar(iniciar(), [concluir, pular, concluir, pular, concluir]);
    expect(estado.etapa).toMatchObject({ tipo: 'descanso', proximo: 1 });
    expect(reduzir(estado, pular, T0).estado.etapa).toEqual({ tipo: 'registrando', item: 1 });
  });

  it('sem variante escolhida (D3) não grava nada', () => {
    const e = iniciar(PUSH, ALVO, [0, null, 0, 0, 0, 0]);
    const noSupino = reduzir(e, { tipo: 'IR_PARA', item: 1 }, T0).estado;
    expect(reduzir(noSupino, concluir, T0)).toEqual({ estado: noSupino, efeitos: [] });
    const escolhido = reduzir(noSupino, { tipo: 'ESCOLHER_VARIANTE', item: 1, variante: 1 }, T0).estado;
    expect(escolhido.variante[1]).toBe(1);
    expect(reduzir(escolhido, concluir, T0).efeitos[0]).toMatchObject({ item: 1, variante: 1 });
  });

  it('item sem descanso vai direto ao próximo', () => {
    const e = iniciar(
      [
        { grupo: null, descanso: 0 },
        { grupo: null, descanso: 60 },
      ],
      [1, 1],
    );
    const t = reduzir(e, concluir, T0);
    expect(t.estado.etapa).toEqual({ tipo: 'registrando', item: 1 });
    expect(t.efeitos.map((x) => x.tipo)).toEqual(['gravarSerie']);
  });

  it('última série do treino vai ao resumo, sem descanso', () => {
    const e = iniciar([{ grupo: null, descanso: 60 }], [1]);
    const t = reduzir(e, concluir, T0);
    expect(t.estado.etapa).toEqual({ tipo: 'resumo' });
    expect(t.efeitos.map((x) => x.tipo)).toEqual(['gravarSerie']);
  });

  it('em exercício já concluído vira série extra', () => {
    const e = iniciar(
      [
        { grupo: null, descanso: 60 },
        { grupo: null, descanso: 60 },
      ],
      [1, 1],
    );
    const { estado } = rodar(e, [concluir, pular, { tipo: 'IR_PARA', item: 0 }, concluir]);
    expect(estado.feitas[0]).toBe(2);
    expect(estado.extras[0]).toBe(1);
    expect(estado.etapa).toMatchObject({ tipo: 'descanso', proximo: 1 });
  });

  it('fora de registrando é ignorado', () => {
    const e = reduzir(iniciar(), concluir, T0).estado;
    expect(reduzir(e, concluir, T0).estado).toBe(e);
  });
});

describe('bi-set 4 + 3 (elevação lateral + tríceps na corda)', () => {
  it('rodadas 1-3 alternam, rodada 4 só elevação, 4 descansos', () => {
    let e = reduzir(iniciar(), { tipo: 'IR_PARA', item: 3 }, T0).estado;
    const caminho: string[] = [];
    let descansos = 0;
    while (e.etapa.tipo === 'registrando' && e.etapa.item >= 3 && e.etapa.item <= 4) {
      const item = e.etapa.item;
      caminho.push(`${rodada(e, item).atual}:${item === 3 ? 'E' : 'T'}`);
      const t = reduzir(e, concluir, T0);
      e = t.estado;
      if (e.etapa.tipo === 'descanso') {
        descansos++;
        expect(e.etapa.duracao).toBe(90);
        e = reduzir(e, pular, T0).estado;
      }
    }
    expect(caminho).toEqual(['1:E', '1:T', '2:E', '2:T', '3:E', '3:T', '4:E']);
    expect(descansos).toBe(4);
    expect(e.feitas.slice(3, 5)).toEqual([4, 3]);
    // depois do grupo, o próximo item fora dele (o primeiro pendente depois, senão antes)
    expect(e.etapa).toEqual({ tipo: 'registrando', item: 5 });
  });

  it('entre os membros da rodada não há descanso', () => {
    const e = reduzir(iniciar(), { tipo: 'IR_PARA', item: 3 }, T0).estado;
    const t = reduzir(e, concluir, T0);
    expect(t.estado.etapa).toEqual({ tipo: 'registrando', item: 4 });
    expect(t.efeitos.map((x) => x.tipo)).toEqual(['gravarSerie']);
  });

  it('rodada mostra "2 de 4"', () => {
    const { estado } = rodar(reduzir(iniciar(), { tipo: 'IR_PARA', item: 3 }, T0).estado, [
      concluir,
      concluir,
      pular,
    ]);
    expect(estado.etapa).toEqual({ tipo: 'registrando', item: 3 });
    expect(rodada(estado, 3)).toEqual({ atual: 2, total: 4 });
  });
});

describe('descanso', () => {
  const emDescanso = () => reduzir(iniciar(), concluir, T0).estado;

  it('FIM_DESCANSO só vale depois do fim (tolerância de 1 s)', () => {
    const e = emDescanso();
    expect(reduzir(e, { tipo: 'FIM_DESCANSO' }, T0 + 100_000).estado).toBe(e);
    const t = reduzir(e, { tipo: 'FIM_DESCANSO' }, T0 + 179_500);
    expect(t.estado.etapa).toEqual({ tipo: 'registrando', item: 0 });
    expect(t.efeitos).toEqual([]);
  });

  it('PULAR_DESCANSO cancela o cronômetro', () => {
    const t = reduzir(emDescanso(), pular, T0 + 5000);
    expect(t.estado.etapa).toEqual({ tipo: 'registrando', item: 0 });
    expect(t.efeitos).toEqual([{ tipo: 'cancelarDescanso' }]);
  });

  it('±15 s move o fim e reagenda; nunca antes de agora', () => {
    const e = emDescanso();
    const mais = reduzir(e, { tipo: 'AJUSTAR_DESCANSO', segundos: 15 }, T0);
    expect(mais.estado.etapa).toMatchObject({ fimEm: T0 + 195_000, duracao: 195 });
    expect(mais.efeitos).toEqual([{ tipo: 'iniciarDescanso', fimEm: T0 + 195_000 }]);
    const menos = reduzir(e, { tipo: 'AJUSTAR_DESCANSO', segundos: -15 }, T0 + 10_000);
    expect(menos.estado.etapa).toMatchObject({ fimEm: T0 + 165_000, duracao: 165 });
    const acabou = reduzir(e, { tipo: 'AJUSTAR_DESCANSO', segundos: -15 }, T0 + 170_000);
    expect(acabou.estado.etapa).toEqual({ tipo: 'registrando', item: 0 });
    expect(acabou.efeitos).toEqual([{ tipo: 'cancelarDescanso' }]);
  });

  it('eventos de descanso fora do descanso são ignorados', () => {
    const e = iniciar();
    for (const ev of [
      pular,
      { tipo: 'FIM_DESCANSO' },
      { tipo: 'AJUSTAR_DESCANSO', segundos: 15 },
    ] as Evento[])
      expect(reduzir(e, ev, T0).estado).toBe(e);
  });

  it('próximo concluído durante o descanso (ir para + concluir) segue para o pendente', () => {
    const e = iniciar(
      [
        { grupo: null, descanso: 60 },
        { grupo: null, descanso: 60 },
      ],
      [2, 1],
    );
    // descanso com próximo = 0; o item 0 é pulado "por fora" do fluxo
    const d = reduzir(e, concluir, T0).estado;
    const pulado: EstadoTreino = { ...d, pulados: [0] };
    expect(reduzir(pulado, pular, T0).estado.etapa).toEqual({ tipo: 'registrando', item: 1 });
  });

  it('retomar com descanso vencido vai para a série seguinte', () => {
    const e = emDescanso();
    expect(retomar(e, T0 + 60_000)).toBe(e);
    expect(retomar(e, T0 + 200_000).etapa).toEqual({ tipo: 'registrando', item: 0 });
    const r = iniciar();
    expect(retomar(r, T0)).toBe(r);
  });
});

describe('aquecimento, variante e edição', () => {
  it('aquecimento grava com ordem 0 e não conta', () => {
    const t = reduzir(iniciar(), { tipo: 'AQUECIMENTO', dados: D }, T0);
    expect(t.estado.feitas[0]).toBe(0);
    expect(t.estado.etapa).toEqual({ tipo: 'registrando', item: 0 });
    expect(t.efeitos).toEqual([
      { tipo: 'gravarSerie', item: 0, variante: 0, ordem: 0, aquecimento: true, dados: D },
    ]);
  });

  it('aquecimento exige registrando e variante', () => {
    const d = reduzir(iniciar(), concluir, T0).estado;
    expect(reduzir(d, { tipo: 'AQUECIMENTO', dados: D }, T0).estado).toBe(d);
    const semVar = iniciar(
      PUSH,
      ALVO,
      PUSH.map(() => null),
    );
    expect(reduzir(semVar, { tipo: 'AQUECIMENTO', dados: D }, T0).efeitos).toEqual([]);
  });

  it('escolher variante só com treino ativo', () => {
    expect(reduzir(ESTADO_OCIOSO, { tipo: 'ESCOLHER_VARIANTE', item: 0, variante: 1 }, T0).estado).toBe(
      ESTADO_OCIOSO,
    );
  });

  it('editar série emite o efeito sem mudar o estado (inclusive no resumo)', () => {
    const e = iniciar();
    const t = reduzir(e, { tipo: 'EDITAR_SERIE', id: 's1', dados: D }, T0);
    expect(t).toEqual({ estado: e, efeitos: [{ tipo: 'editarSerie', id: 's1', dados: D }] });
    const resumo = reduzir(e, { tipo: 'FINALIZAR' }, T0).estado;
    expect(reduzir(resumo, { tipo: 'EDITAR_SERIE', id: 's1', dados: D }, T0).efeitos).toHaveLength(1);
    expect(reduzir(ESTADO_OCIOSO, { tipo: 'EDITAR_SERIE', id: 's1', dados: D }, T0).efeitos).toEqual([]);
  });
});

describe('pular, ir para e adicionar série', () => {
  it('pular o exercício atual vai ao próximo pendente', () => {
    const t = reduzir(iniciar(), { tipo: 'PULAR_EXERCICIO', item: 0 }, T0);
    expect(t.estado.pulados).toEqual([0]);
    expect(t.estado.etapa).toEqual({ tipo: 'registrando', item: 1 });
  });

  it('pular durante o descanso cancela o cronômetro', () => {
    const { estado } = rodar(iniciar(), [concluir, pular, concluir, pular, concluir]);
    const t = reduzir(estado, { tipo: 'PULAR_EXERCICIO', item: 1 }, T0);
    expect(t.estado.etapa).toEqual({ tipo: 'registrando', item: 2 });
    expect(t.efeitos).toEqual([{ tipo: 'cancelarDescanso' }]);
  });

  it('pular outro exercício não muda a etapa; pular de novo ou concluído é ignorado', () => {
    const e = iniciar();
    const t = reduzir(e, { tipo: 'PULAR_EXERCICIO', item: 5 }, T0);
    expect(t.estado.etapa).toEqual(e.etapa);
    expect(reduzir(t.estado, { tipo: 'PULAR_EXERCICIO', item: 5 }, T0).estado).toBe(t.estado);
  });

  it('pular um membro do bi-set segue com o outro membro', () => {
    const e = reduzir(iniciar(), { tipo: 'IR_PARA', item: 3 }, T0).estado;
    const t = reduzir(e, { tipo: 'PULAR_EXERCICIO', item: 3 }, T0);
    expect(t.estado.etapa).toEqual({ tipo: 'registrando', item: 4 });
    // tríceps sozinho: cada série tem descanso
    expect(reduzir(t.estado, concluir, T0).estado.etapa).toMatchObject({ tipo: 'descanso', proximo: 4 });
  });

  it('pular o último pendente vai ao resumo', () => {
    const e = iniciar([{ grupo: null, descanso: 60 }], [2]);
    expect(reduzir(e, { tipo: 'PULAR_EXERCICIO', item: 0 }, T0).estado.etapa).toEqual({ tipo: 'resumo' });
  });

  it('ir para outro exercício (cancela descanso e "despula")', () => {
    const d = reduzir(reduzir(iniciar(), { tipo: 'PULAR_EXERCICIO', item: 4 }, T0).estado, concluir, T0);
    const t = reduzir(d.estado, { tipo: 'IR_PARA', item: 4 }, T0);
    expect(t.estado.etapa).toEqual({ tipo: 'registrando', item: 4 });
    expect(t.estado.pulados).toEqual([]);
    expect(t.efeitos).toEqual([{ tipo: 'cancelarDescanso' }]);
    expect(reduzir(t.estado, { tipo: 'IR_PARA', item: 9 }, T0).estado).toBe(t.estado);
  });

  it('depois de "ir para", o próximo pendente pode estar antes', () => {
    const e = iniciar(
      [
        { grupo: null, descanso: 60 },
        { grupo: null, descanso: 60 },
      ],
      [1, 1],
    );
    const { estado } = rodar(e, [{ tipo: 'IR_PARA', item: 1 }, concluir]);
    expect(estado.etapa).toMatchObject({ tipo: 'descanso', proximo: 0 });
  });

  it('adicionar série aumenta o total do item', () => {
    const e = iniciar([{ grupo: null, descanso: 60 }], [1]);
    const mais = reduzir(e, { tipo: 'ADICIONAR_SERIE', item: 0 }, T0).estado;
    expect(mais.extras).toEqual([1]);
    expect(reduzir(mais, concluir, T0).estado.etapa).toMatchObject({ tipo: 'descanso', proximo: 0 });
    expect(reduzir(ESTADO_OCIOSO, { tipo: 'ADICIONAR_SERIE', item: 0 }, T0).estado).toBe(ESTADO_OCIOSO);
  });
});

describe('fim do treino', () => {
  it('FINALIZAR → resumo; RETOMAR volta ao primeiro pendente; FECHAR conclui', () => {
    const d = reduzir(iniciar(), concluir, T0).estado;
    const f = reduzir(d, { tipo: 'FINALIZAR' }, T0);
    expect(f.estado.etapa).toEqual({ tipo: 'resumo' });
    expect(f.efeitos).toEqual([{ tipo: 'cancelarDescanso' }]);
    expect(reduzir(f.estado, { tipo: 'RETOMAR' }, T0).estado.etapa).toEqual({ tipo: 'registrando', item: 0 });
    const fechado = reduzir(f.estado, { tipo: 'FECHAR' }, T0);
    expect(fechado.estado.etapa).toEqual({ tipo: 'ocioso' });
    expect(fechado.efeitos).toEqual([{ tipo: 'concluirTreino' }]);
  });

  it('FECHAR e RETOMAR só no resumo; FINALIZAR só ativo', () => {
    const e = iniciar();
    expect(reduzir(e, { tipo: 'FECHAR' }, T0).estado).toBe(e);
    expect(reduzir(e, { tipo: 'RETOMAR' }, T0).estado).toBe(e);
    expect(reduzir(ESTADO_OCIOSO, { tipo: 'FINALIZAR' }, T0).estado).toBe(ESTADO_OCIOSO);
  });

  it('DESCARTAR de qualquer etapa ativa', () => {
    const d = reduzir(iniciar(), concluir, T0).estado;
    const t = reduzir(d, { tipo: 'DESCARTAR' }, T0);
    expect(t.estado.etapa).toEqual({ tipo: 'ocioso' });
    expect(t.efeitos).toEqual([{ tipo: 'cancelarDescanso' }, { tipo: 'descartarTreino' }]);
    expect(reduzir(ESTADO_OCIOSO, { tipo: 'DESCARTAR' }, T0).efeitos).toEqual([]);
  });
});
