// Motor de sugestão de carga: ↑ aumentar · = manter · ↓ reduzir · calibrar (BRIEFING 7).
// Porte de referencia/parser/progressao.js. Diferenças: `hoje` obrigatório e `repsSugeridas` (7.6).

import { diasEntre, type ISODate } from '../datas.ts';
import { formatarKg } from '../numeros.ts';
import type { Faixa } from '../tipos.ts';
import { CONFIG_PROGRESSAO, type ConfigProgressao } from './config.ts';
import { arredonda, arredondaParaBaixo, cargaPara, e1rm, umaCasa } from './e1rm.ts';
import { incrementoPadrao } from './incremento.ts';

export interface SerieHistorico {
  kg: number;
  reps: number;
  rir: number | null;
}

// Um treino do exercício (mesma variante), sem séries de aquecimento
export interface TreinoHistorico {
  data: ISODate;
  series: SerieHistorico[];
  // v2 (BRIEFING-v2 8.1): treino feito com prontidão baixa. Ausente = normal (motor idêntico ao da v1)
  prontidaoBaixa?: boolean;
}

// Prescrição da semana atual (compatível com `Prescricao` de periodizacao/prescricao)
export interface PrescricaoMotor {
  reps: Faixa;
  rir: Faixa;
  porTempo?: boolean;
  fase?: { deload: boolean } | null;
}

export interface OpcoesMotor {
  hoje: ISODate;
  incremento?: number; // salto do equipamento; padrão pelo nome
  nome?: string;
  config?: Partial<ConfigProgressao>;
}

export type Acao = 'aumentar' | 'manter' | 'reduzir' | 'calibrar';

// Regra que decidiu a sugestão: as da v1 (0 a 7, seção 7.3) e as moduladoras da v2 (P1, P3; seção 8.1)
export type RegraMotor = '0' | '0b' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | 'P1' | 'P3';
// Regras que só acrescentaram alerta: estagnação, P2 (queda explicada pelo sono), P4 (pouco descanso)
export type AlertaMotor = 'estagnacao' | 'P2' | 'P4';

export interface SugestaoDetalhada {
  sugestao: Sugestao;
  regra: RegraMotor;
  alertasRegras: AlertaMotor[];
}

export interface Sugestao {
  acao: Acao;
  carga: number | null;
  anterior?: number;
  variacao?: number; // %
  motivo: string;
  alertas: string[];
  e1rm?: number;
  repsSugeridas: number[] | null; // por série: as do último treino, ou o mínimo da faixa quando subiu
}

interface ResumoTreino {
  data: ISODate;
  prontidaoBaixa: boolean;
  carga: number; // carga de trabalho: a maior do treino
  series: { kg: number; reps: number; rir: number }[]; // só as séries na carga de trabalho
  e1: number; // melhor série na carga de trabalho
}

function resumir(t: TreinoHistorico, alvoRir: Faixa): ResumoTreino {
  const rirMeio = (alvoRir.min + alvoRir.max) / 2;
  const series = t.series.map((x) => ({ ...x, rir: x.rir ?? rirMeio }));
  const carga = Math.max(...series.map((x) => x.kg));
  const topo = series.filter((x) => x.kg === carga);
  // As séries seguintes carregam fadiga acumulada: vale a melhor
  const e1 = Math.max(...topo.map((x) => e1rm(x.kg, x.reps, x.rir)));
  return { data: t.data, prontidaoBaixa: t.prontidaoBaixa === true, carga, series: topo, e1 };
}

const metade = (n: number) => Math.ceil(n / 2);
const limitar = (x: number, f: Faixa) => Math.min(Math.max(x, f.min), f.max);

export function sugerir(historico: TreinoHistorico[], presc: PrescricaoMotor, opts: OpcoesMotor): Sugestao {
  return sugerirDetalhado(historico, presc, opts).sugestao;
}

// Núcleo do motor: a sugestão da v1 mais a regra que decidiu. Com `prontidaoBaixa` em algum treino do histórico,
// entram as regras P2 (a queda desses treinos não conta para a regra 3) e P3 (abaixo da faixa num dia de
// prontidão baixa vira manter). Sem isso, a saída é a mesma da v1.
export function sugerirDetalhado(
  historico: TreinoHistorico[],
  presc: PrescricaoMotor,
  opts: OpcoesMotor,
): SugestaoDetalhada {
  const alertasRegras: AlertaMotor[] = [];
  let regra: RegraMotor = '0';
  const r = (sugestao: Sugestao): SugestaoDetalhada => ({ sugestao, regra, alertasRegras });
  const C = { ...CONFIG_PROGRESSAO, ...opts.config };
  const inc = opts.incremento ?? incrementoPadrao(opts.nome ?? '');
  const alertas: string[] = [];
  const validos = historico.filter((t) => t.series.length > 0);
  const u = validos[validos.length - 1];

  if (!u)
    return r({
      acao: 'calibrar',
      carga: null,
      motivo: `Primeira vez: escolha uma carga para ~${presc.reps.min + 1}-${presc.reps.max - 1} reps no RIR alvo. A próxima sugestão sai daí.`,
      alertas,
      repsSugeridas: null,
    });

  // 0b) Por tempo: a "carga" é a duração
  if (presc.porTempo) {
    regra = '0b';
    const repsSugeridas = u.series.map((x) => x.reps);
    return r(
      u.series.every((x) => x.reps >= presc.reps.max)
        ? {
            acao: 'aumentar',
            carga: null,
            motivo: `Bateu ${presc.reps.max}s em todas: aumente a dificuldade (carga ou variação).`,
            alertas,
            repsSugeridas,
          }
        : {
            acao: 'manter',
            carga: null,
            motivo: `Busque +5 s por série até ${presc.reps.max}s.`,
            alertas,
            repsSugeridas,
          },
    );
  }

  const sess = validos.map((t) => resumir(t, presc.rir));
  const ult = sess[sess.length - 1]!;
  const rirMeio = (presc.rir.min + presc.rir.max) / 2;
  const reps = ult.series.map((x) => x.reps);
  const saida = (acao: Acao, carga: number, motivo: string, id: RegraMotor): SugestaoDetalhada => {
    regra = id;
    return r({
      acao,
      carga: umaCasa(carga),
      anterior: ult.carga,
      variacao: umaCasa(((carga - ult.carga) / ult.carga) * 100),
      motivo,
      alertas,
      e1rm: umaCasa(ult.e1),
      repsSugeridas:
        acao === 'aumentar' ? reps.map(() => presc.reps.min) : reps.map((x) => limitar(x, presc.reps)),
    });
  };

  // 1) Retorno após pausa
  const pausa = diasEntre(ult.data, opts.hoje);
  if (pausa >= C.pausaDias) {
    const c = Math.min(arredonda(ult.carga * (1 - C.reducaoPausa), inc), ult.carga - inc);
    return saida(
      'reduzir',
      c,
      `${pausa} dias sem este exercício: volte com ${formatarKg(c)} (−${Math.round(C.reducaoPausa * 100)}%) e retome a progressão.`,
      '1',
    );
  }

  // 2) Deload: mantém a carga; o volume já cai pela periodização
  if (presc.fase?.deload)
    return saida(
      'manter',
      ult.carga,
      `Semana de deload: mantenha ${formatarKg(ult.carga)} com metade das séries.`,
      '2',
    );

  // Estagnação: alerta paralelo, não muda a carga
  const janela = sess.filter((s) => diasEntre(s.data, ult.data) <= C.estagnadoSemanas * 7);
  if (janela.length >= 3 && diasEntre(janela[0]!.data, ult.data) >= (C.estagnadoSemanas - 1) * 7) {
    const anteriores = sess.slice(0, sess.length - janela.length + 1);
    const melhorAntes = Math.max(...anteriores.map((s) => s.e1));
    if (Math.max(...janela.slice(1).map((s) => s.e1)) <= melhorAntes * 1.01) {
      alertas.push(
        `${C.estagnadoSemanas} semanas sem progredir: troque a variação ou revise sono e calorias.`,
      );
      alertasRegras.push('estagnacao');
    }
  }

  // 3) Queda de desempenho consistente (2 treinos seguidos)
  if (sess.length >= C.quedaSessoes + 1) {
    const recentes = sess.slice(-C.quedaSessoes);
    const ref = Math.max(...sess.slice(-(C.quedaSessoes + 3), -C.quedaSessoes).map((s) => s.e1));
    if (recentes.every((s) => s.e1 <= ref * (1 - C.quedaLimite)) && recentes.some((s) => s.prontidaoBaixa)) {
      // P2: queda em treinos com prontidão baixa não conta como queda consistente
      alertas.push(
        'Queda explicada pelo sono: treino(s) recente(s) com prontidão baixa. Se repetir com sono normal, o app sugere reduzir.',
      );
      alertasRegras.push('P2');
    } else if (recentes.every((s) => s.e1 <= ref * (1 - C.quedaLimite))) {
      const c = Math.min(arredonda(ult.carga * (1 - C.reducaoQueda), inc), ult.carga - inc);
      alertas.push(
        'Queda em 2 treinos seguidos: confira sono, alimentação e estresse. Se persistir, antecipe o deload.',
      );
      return saida(
        'reduzir',
        c,
        `Desempenho ${Math.round((1 - ult.e1 / ref) * 100)}% abaixo do seu melhor recente em 2 treinos: baixe para ${formatarKg(c)}.`,
        '3',
      );
    }
  }

  const pertoDaFalha = (s: ResumoTreino) =>
    s.series.filter((x) => x.rir < presc.rir.min - C.toleranciaRir).length;
  const abaixo = ult.series.filter((x) => x.reps < presc.reps.min).length;
  const pesadoDemais = pertoDaFalha(ult);

  // 4) Abaixo da faixa: carga alta demais para a prescrição atual
  if (reps[0]! < presc.reps.min || abaixo >= metade(ult.series.length)) {
    // P3: abaixo da faixa num treino com prontidão baixa → manter; só reduz se repetir num dia normal
    if (ult.prontidaoBaixa)
      return saida(
        'manter',
        ult.carga,
        `${reps.join('·')} ficou abaixo da faixa num dia de prontidão baixa: mantenha ${formatarKg(ult.carga)}. Se repetir num dia normal, o app sugere reduzir.`,
        'P3',
      );
    const alvo = arredondaParaBaixo(cargaPara(ult.e1, presc.reps.min, rirMeio), inc);
    const c = Math.min(alvo, ult.carga - inc);
    return saida(
      'reduzir',
      c,
      `${reps.join('·')} ficou abaixo da faixa (${presc.reps.min}-${presc.reps.max}): baixe para ${formatarKg(c)} para voltar a ${presc.reps.min}+ reps.`,
      '4',
    );
  }

  // 5) Topo da faixa em todas as séries, sem passar do esforço alvo → aumenta
  const noTopo = ult.series.every((x) => x.reps >= presc.reps.max);
  if (noTopo && !pesadoDemais) {
    const sobra = ult.series.every((x) => x.reps >= presc.reps.max + 2 || x.rir >= presc.rir.max + 2);
    const teto = sobra ? C.aumentoFolga : C.aumentoMax;
    let c = arredondaParaBaixo(ult.carga * (1 + teto), inc);
    if (c <= ult.carga) c = ult.carga + inc;
    const extra =
      (c - ult.carga) / ult.carga > teto
        ? ` (menor salto possível: ${formatarKg(inc)})`
        : sobra
          ? ' (sobrou bastante: salto maior)'
          : '';
    return saida(
      'aumentar',
      c,
      `${reps.join('·')} no topo da faixa: suba para ${formatarKg(c)}${extra} e volte a ${presc.reps.min}+ reps.`,
      '5',
    );
  }

  // 6) Dentro da faixa, mas bem mais perto da falha que o alvo
  if (pesadoDemais >= metade(ult.series.length)) {
    const anterior = sess.length >= 2 ? sess[sess.length - 2]! : null;
    const repetiu =
      anterior !== null &&
      anterior.carga === ult.carga &&
      pertoDaFalha(anterior) >= metade(anterior.series.length);
    const alvoRir = `RIR ${presc.rir.min}-${presc.rir.max}`;
    if (repetiu) {
      const c = ult.carga - inc;
      return saida(
        'reduzir',
        c,
        `2 treinos seguidos mais perto da falha que o alvo (${alvoRir}): baixe para ${formatarKg(c)}.`,
        '6',
      );
    }
    return saida(
      'manter',
      ult.carga,
      `Mantenha ${formatarKg(ult.carga)}, mas pare mais longe da falha (${alvoRir}).`,
      '6',
    );
  }

  // 7) Dentro da faixa → mantém e busca +1 rep
  if (sess.length >= 2) {
    const ref = Math.max(...sess.slice(-4, -1).map((s) => s.e1));
    if (ult.e1 <= ref * (1 - C.quedaLimite))
      alertas.push(
        'Treino abaixo do seu normal. Uma queda isolada não muda a carga; se repetir no próximo, o app sugere reduzir.',
      );
  }
  return saida(
    'manter',
    ult.carga,
    `Mantenha ${formatarKg(ult.carga)} e busque +1 rep por série (meta ${presc.reps.max}).`,
    '7',
  );
}
