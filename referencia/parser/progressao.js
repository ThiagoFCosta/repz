// Motor de sugestão de carga: ↑ aumentar · = manter · ↓ reduzir · ! alerta
// Entrada: histórico do exercício (mesma variante), prescrição da semana atual e incremento do equipamento.

export const CONFIG = {
  pausaDias: 21,          // ≥ 3 semanas sem o exercício → volta mais leve
  reducaoPausa: 0.10,     // −10% no retorno
  quedaLimite: 0.05,      // e1RM ≥ 5% abaixo da referência...
  quedaSessoes: 2,        // ...em 2 sessões seguidas → reduz
  reducaoQueda: 0.05,     // −5%
  aumentoMin: 0.02,       // +2% a +5% (regra do plano)
  aumentoMax: 0.05,
  aumentoFolga: 0.075,   // topo com folga grande (2+ reps ou RIR acima do alvo)
  toleranciaRir: 1,       // RIR anotado erra ~1 rep: tolerância de 1
  estagnadoSemanas: 3,
};

const r1 = (x) => Math.round(x * 10) / 10;
const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// Repetições até a falha = reps feitas + RIR. Epley adaptado.
export function e1rm(kg, reps, rir) {
  return kg * (1 + (reps + (rir ?? 0)) / 30);
}

// Carga para fazer `reps` deixando `rir` na reserva, a partir de um e1RM.
export function cargaPara(e1, reps, rir) {
  return e1 / (1 + (reps + rir) / 30);
}

export function incrementoPadrao(nome) {
  return /halter|halteres/i.test(nome) ? 2 : 2.5;
}

const baixo = (kg, inc) => Math.floor(kg / inc + 1e-9) * inc;
const perto = (kg, inc) => Math.round(kg / inc) * inc;

function resumoSessao(s, alvoRir) {
  const rirMeio = (alvoRir.min + alvoRir.max) / 2;
  const series = s.series.map((x) => ({ ...x, rir: x.rir ?? rirMeio }));
  const cargaTopo = Math.max(...series.map((x) => x.kg));
  const topo = series.filter((x) => x.kg === cargaTopo);
  // e1RM da sessão: melhor série na carga de trabalho (as seguintes carregam fadiga acumulada)
  const e1 = Math.max(...topo.map((x) => e1rm(x.kg, x.reps, x.rir)));
  return { data: s.data, carga: cargaTopo, series: topo, e1 };
}

/**
 * @param historico  [{data:'2026-11-06', series:[{kg, reps, rir}]}] em ordem cronológica (mesma variante)
 * @param presc      {reps:{min,max}, rir:{min,max}, porTempo, fase:{deload}} — já com a periodização da semana
 * @param opts       {incremento, hoje, nome}
 */
export function sugerir(historico, presc, opts = {}) {
  const C = { ...CONFIG, ...(opts.config || {}) };
  const inc = opts.incremento ?? incrementoPadrao(opts.nome || '');
  const hoje = opts.hoje || new Date().toISOString().slice(0, 10);
  const alertas = [];

  if (!historico.length)
    return { acao: 'calibrar', carga: null, motivo: `Primeira vez: escolha uma carga para ~${presc.reps.min + 1}-${presc.reps.max - 1} reps no RIR alvo. A próxima sugestão sai daí.`, alertas };

  if (presc.porTempo) {
    const u = historico[historico.length - 1];
    const bateu = u.series.every((x) => x.reps >= presc.reps.max);
    return bateu
      ? { acao: 'aumentar', carga: null, motivo: `Bateu ${presc.reps.max}s em todas: aumente a dificuldade (carga ou variação).`, alertas }
      : { acao: 'manter', carga: null, motivo: `Busque +5 s por série até ${presc.reps.max}s.`, alertas };
  }

  const sess = historico.map((s) => resumoSessao(s, presc.rir));
  const ult = sess[sess.length - 1];
  const rirMeio = (presc.rir.min + presc.rir.max) / 2;
  const fmt = (kg) => `${String(r1(kg)).replace('.', ',')} kg`;
  const saida = (acao, carga, motivo) => ({
    acao, carga: carga == null ? null : r1(carga), anterior: ult.carga,
    variacao: carga == null ? 0 : r1(((carga - ult.carga) / ult.carga) * 100), motivo, alertas, e1rm: r1(ult.e1),
  });

  // 1) Retorno após pausa
  const pausa = dias(ult.data, hoje);
  if (pausa >= C.pausaDias) {
    const c = Math.min(perto(ult.carga * (1 - C.reducaoPausa), inc), ult.carga - inc);
    return saida('reduzir', c, `${pausa} dias sem este exercício: volte com ${fmt(c)} (−${C.reducaoPausa * 100}%) e retome a progressão.`);
  }

  // 2) Deload: mantém carga, volume já é reduzido pela periodização
  if (presc.fase?.deload)
    return saida('manter', ult.carga, `Semana de deload: mantenha ${fmt(ult.carga)} com metade das séries.`);

  // Estagnação (alerta, não muda carga sozinha)
  const janela = sess.filter((s) => dias(s.data, ult.data) <= C.estagnadoSemanas * 7);
  if (janela.length >= 3 && dias(janela[0].data, ult.data) >= (C.estagnadoSemanas - 1) * 7) {
    const anteriores = sess.slice(0, sess.length - janela.length + 1);
    const melhorAntes = Math.max(...anteriores.map((s) => s.e1));
    if (Math.max(...janela.slice(1).map((s) => s.e1)) <= melhorAntes * 1.01)
      alertas.push(`${C.estagnadoSemanas} semanas sem progredir: troque a variação ou revise sono e calorias.`);
  }

  // 3) Queda de desempenho consistente (2 sessões seguidas)
  if (sess.length >= C.quedaSessoes + 1) {
    const recentes = sess.slice(-C.quedaSessoes);
    const ref = Math.max(...sess.slice(-(C.quedaSessoes + 3), -C.quedaSessoes).map((s) => s.e1));
    if (recentes.every((s) => s.e1 <= ref * (1 - C.quedaLimite))) {
      const c = Math.min(perto(ult.carga * (1 - C.reducaoQueda), inc), ult.carga - inc);
      alertas.push('Queda em 2 treinos seguidos: confira sono, alimentação e estresse. Se persistir, antecipe o deload.');
      return saida('reduzir', c, `Desempenho ${Math.round((1 - ult.e1 / ref) * 100)}% abaixo do seu melhor recente em 2 treinos: baixe para ${fmt(c)}.`);
    }
  }

  const reps = ult.series.map((x) => x.reps);
  const abaixo = ult.series.filter((x) => x.reps < presc.reps.min).length;
  const pesadoDemais = ult.series.filter((x) => x.rir < presc.rir.min - C.toleranciaRir).length;

  // 4) Abaixo da faixa: carga alta demais para a prescrição atual
  if (reps[0] < presc.reps.min || abaixo >= Math.ceil(ult.series.length / 2)) {
    const alvo = baixo(cargaPara(ult.e1, presc.reps.min, rirMeio), inc);
    const c = Math.min(alvo, ult.carga - inc);
    return saida('reduzir', c, `${reps.join('·')} ficou abaixo da faixa (${presc.reps.min}-${presc.reps.max}): baixe para ${fmt(c)} para voltar a ${presc.reps.min}+ reps.`);
  }

  // 5) Topo da faixa em todas as séries, sem passar do esforço alvo → aumenta
  const noTopo = ult.series.every((x) => x.reps >= presc.reps.max);
  if (noTopo && !pesadoDemais) {
    const sobra = ult.series.every((x) => x.reps >= presc.reps.max + 2 || x.rir >= presc.rir.max + 2);
    const teto = sobra ? C.aumentoFolga : C.aumentoMax;
    let c = baixo(ult.carga * (1 + teto), inc);
    if (c <= ult.carga) c = ult.carga + inc;
    const extra = (c - ult.carga) / ult.carga > teto ? ` (menor salto possível: ${fmt(inc)})`
      : sobra ? ' (sobrou bastante: salto maior)' : '';
    return saida('aumentar', c, `${reps.join('·')} no topo da faixa: suba para ${fmt(c)}${extra} e volte a ${presc.reps.min}+ reps.`);
  }

  // 6) Dentro da faixa, mas bem mais perto da falha que o alvo
  if (pesadoDemais >= Math.ceil(ult.series.length / 2)) {
    const anterior = sess.length >= 2 ? sess[sess.length - 2] : null;
    const repetiu = anterior && anterior.carga === ult.carga &&
      anterior.series.filter((x) => x.rir < presc.rir.min - C.toleranciaRir).length >= Math.ceil(anterior.series.length / 2);
    if (repetiu) {
      const c = ult.carga - inc;
      return saida('reduzir', c, `2 treinos seguidos mais perto da falha que o alvo (RIR ${presc.rir.min}-${presc.rir.max}): baixe para ${fmt(c)}.`);
    }
    return saida('manter', ult.carga, `Mantenha ${fmt(ult.carga)}, mas pare mais longe da falha (RIR ${presc.rir.min}-${presc.rir.max}).`);
  }

  // 7) Dentro da faixa → mantém e busca +1 rep
  if (sess.length >= 2) {
    const ref = Math.max(...sess.slice(-4, -1).map((s) => s.e1));
    if (ult.e1 <= ref * (1 - C.quedaLimite))
      alertas.push('Treino abaixo do seu normal. Uma queda isolada não muda a carga; se repetir no próximo, o app sugere reduzir.');
  }
  return saida('manter', ult.carga, `Mantenha ${fmt(ult.carga)} e busque +1 rep por série (meta ${presc.reps.max}).`);
}
