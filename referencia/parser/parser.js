// Parser do formato TREINO v1 — roda no navegador e no Node (ES module, sem dependências).
// Entrada: texto bruto (extraído do PDF ou colado). Saída: { plano, erros, avisos }.

const INICIO = /#TREINO-INICIO\s*v?(\d+)?/i;
const FIM = /#TREINO-FIM/i;
const CHAVES = ['PLANO', 'PROGRESSAO', 'BLOCO', 'FASE', 'SESSAO', 'EX', 'SS', 'CARDIO', 'TOTAL'];
const RE_CHAVE = /^(PLANO|PROGRESSAO|BLOCO|FASE|SESSAO|EX|SS(\d+)|CARDIO|TOTAL)\s*:\s*(.*)$/;
const CAMPOS_MIN = { EX: 4, SS: 4, PLANO: 1, FASE: 2, CARDIO: 3, TOTAL: 2 };

// Remove acentos e normaliza espaços/traços/símbolos que PDFs costumam trocar.
export function semAcento(s) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

// Limpa a linha mantendo os acentos (nome exibido continua "Elevação lateral").
export function normalizar(s) {
  return s
    .normalize('NFC')
    .replace(/[‐-―−]/g, '-')     // hífens e travessões → "-"
    .replace(/[  -​]/g, ' ')     // espaços especiais
    .replace(/[｜¦│]/g, '|')
    .replace(/\s+/g, ' ')
    .trim();
}

// Chave de identidade do exercício: é ela que liga o histórico entre planos diferentes.
export function chaveExercicio(nome) {
  return semAcento(normalizar(nome)).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function faixa(txt, sufixo = '') {
  // "8-12" | "10" | "30-45s" | "120-180s" | "2-3min"
  const m = txt.replace(/\s/g, '').toLowerCase().match(/^(\d+(?:[.,]\d+)?)(?:-(\d+(?:[.,]\d+)?))?(s|seg|min)?$/);
  if (!m) return null;
  const n = (x) => (x == null ? null : parseFloat(x.replace(',', '.')));
  let min = n(m[1]), max = n(m[2]) ?? min;
  const un = m[3] || sufixo;
  if (un === 'min') { min *= 60; max *= 60; }
  return { min, max, unidade: un ? 's' : '' };
}

function faixaSimples(txt) {
  const m = txt.match(/^(\d+)(?:-(\d+))?$/);
  return m ? { min: +m[1], max: m[2] ? +m[2] : +m[1] } : null;
}

// "Supino reto [barra / maquina]" → ["Supino reto barra", "Supino reto maquina"]
function variantes(nome) {
  const m = nome.match(/^(.*?)\[(.+?)\](.*)$/);
  if (!m) return { base: nome, opcoes: [nome] };
  const opcoes = m[2].split('/').map((o) => `${m[1]}${o.trim()}${m[3]}`.replace(/\s+/g, ' ').trim());
  return { base: nome.replace(/\s*\[.+?\]\s*/, ' ').trim() || opcoes.join(' / '), opcoes };
}

// Tokens extras: "rir 3", "iso", "foco", "fc 115-135", "z2", "deload", "volume 50%", "series +1 foco"
function extras(campos) {
  const r = { flags: [] };
  for (const c of campos) {
    const t = semAcento(c).toLowerCase().trim();
    let m;
    if ((m = t.match(/^rir_iso\s+(\d+(?:-\d+)?)$/))) r.rirIso = faixaSimples(m[1]);
    else if ((m = t.match(/^rir\s+(\d+(?:-\d+)?)$/))) r.rir = faixaSimples(m[1]);
    else if ((m = t.match(/^fc\s+(\d+(?:-\d+)?)$/))) r.fc = faixaSimples(m[1]);
    else if ((m = t.match(/^volume\s+(\d+)\s*%$/))) r.volume = +m[1] / 100;
    else if ((m = t.match(/^series\s+([+-]\d+)(?:\s+(\w+))?$/))) r.series = { delta: +m[1], alvo: m[2] || 'todos' };
    else if ((m = t.match(/^carga\s+\+?(\d+(?:[.,]\d+)?)(?:-(\d+(?:[.,]\d+)?))?\s*%$/)))
      r.carga = { min: parseFloat(m[1].replace(',', '.')), max: parseFloat((m[2] || m[1]).replace(',', '.')) };
    else if ((m = t.match(/^estagnado\s+(\d+)$/))) r.estagnado = +m[1];
    else if (t) r.flags.push(t);
  }
  return r;
}

const DIAS = { 'sáb': 6,  seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 0 };

// Junta linhas quebradas pelo PDF: uma linha sem chave é anexada à anterior
// apenas se começar com "|" ou se a anterior ainda não tem o mínimo de campos.
function casarChave(txt) {
  const i = txt.indexOf(':');
  if (i < 0) return null;
  const m = (semAcento(txt.slice(0, i)).toUpperCase().replace(/\s+/g, '') + txt.slice(i)).match(RE_CHAVE);
  return m;
}

function juntarLinhas(brutas) {
  const out = [];
  for (const { n, txt } of brutas) {
    const m = casarChave(txt);
    if (m || txt.startsWith('#')) { out.push({ n, txt }); continue; }
    const ant = out[out.length - 1];
    if (ant) {
      const ma = casarChave(ant.txt);
      const tipo = ma ? (ma[2] ? 'SS' : ma[1]) : null;
      const campos = ant.txt.split('|').length;
      if (txt.startsWith('|') || (tipo && CAMPOS_MIN[tipo] && campos < CAMPOS_MIN[tipo])) {
        ant.txt = `${ant.txt} ${txt}`;
        continue;
      }
    }
    out.push({ n, txt, solta: true });
  }
  return out;
}

export function extrairBloco(texto) {
  const linhas = texto.split(/\r?\n/).map(normalizar);
  const i = linhas.findIndex((l) => INICIO.test(l));
  if (i < 0) return { erro: 'Marcador #TREINO-INICIO não encontrado. O PDF precisa ter o anexo no formato TREINO v1.' };
  const j = linhas.findIndex((l, k) => k > i && FIM.test(l));
  if (j < 0) return { erro: 'Marcador #TREINO-FIM não encontrado: o bloco pode ter sido cortado.' };
  const versao = +(linhas[i].match(INICIO)[1] || 1);
  const corpo = linhas.slice(i + 1, j).map((txt, k) => ({ n: k + 1, txt })).filter((l) => l.txt);
  return { versao, linhas: corpo };
}

export function parse(texto) {
  const erros = [], avisos = [];
  const bloco = extrairBloco(texto);
  if (bloco.erro) return { plano: null, erros: [{ linha: 0, msg: bloco.erro }], avisos };
  if (bloco.versao !== 1) avisos.push({ linha: 0, msg: `Versão ${bloco.versao} do formato; este app lê a v1.` });

  const plano = {
    versaoFormato: 1, nome: '', autor: '', data: null,
    progressao: { tipo: 'dupla', rir: { min: 1, max: 3 }, carga: { min: 2, max: 5 }, estagnado: 3 },
    bloco: null, sessoes: [], cardio: [],
  };
  let sessao = null, total = null;

  for (const { n, txt, solta } of juntarLinhas(bloco.linhas)) {
    if (txt.startsWith('#')) continue; // comentário
    if (solta) { avisos.push({ linha: n, msg: `Linha ignorada (sem chave reconhecida): "${txt.slice(0, 60)}"` }); continue; }
    const m = casarChave(txt);
    const chave = m[2] ? 'SS' : m[1];
    const campos = m[3].split('|').map((c) => c.trim());
    const err = (msg) => erros.push({ linha: n, msg, texto: txt });

    switch (chave) {
      case 'PLANO':
        [plano.nome, plano.autor = '', plano.data = null] = campos;
        break;
      case 'PROGRESSAO': {
        const x = extras(campos.slice(1));
        plano.progressao = {
          tipo: campos[0].toLowerCase() || 'dupla',
          rir: x.rir || plano.progressao.rir,
          carga: x.carga || plano.progressao.carga,
          estagnado: x.estagnado || plano.progressao.estagnado,
        };
        break;
      }
      case 'BLOCO': {
        const s = parseInt(campos[0], 10);
        if (!s) err('BLOCO precisa do número de semanas, ex.: "BLOCO: 12"');
        else plano.bloco = { semanas: s, fases: [] };
        break;
      }
      case 'FASE': {
        if (!plano.bloco) { err('FASE apareceu antes de BLOCO'); break; }
        const sem = faixaSimples(campos[0].replace(/\s/g, ''));
        if (!sem) { err(`Semanas inválidas na FASE: "${campos[0]}" (use "1-4" ou "12")`); break; }
        const x = extras(campos.slice(1));
        plano.bloco.fases.push({
          de: sem.min, ate: sem.max, rir: x.rir || null, rirIso: x.rirIso || null,
          deload: x.flags.includes('deload'), volume: x.volume ?? 1, series: x.series || null,
        });
        break;
      }
      case 'SESSAO': {
        const dia = campos[1] ? DIAS[semAcento(campos[1]).toLowerCase().slice(0, 3)] : undefined;
        sessao = { nome: campos[0], dia: dia ?? null, itens: [] };
        if (!campos[0]) err('SESSAO sem nome');
        plano.sessoes.push(sessao);
        break;
      }
      case 'EX':
      case 'SS': {
        if (!sessao) { err('Exercício antes de qualquer SESSAO'); break; }
        if (campos.length < 4) { err(`Faltam campos: esperado "nome | séries | reps | descanso", veio ${campos.length}`); break; }
        const [nome, s, r, d, ...resto] = campos;
        const series = parseInt(s, 10);
        const reps = faixa(r);
        const desc = d === '-' || d === '' ? null : faixa(d, 's');
        if (!nome) err('Exercício sem nome');
        if (!series || series > 10) err(`Séries inválidas: "${s}"`);
        if (!reps) err(`Repetições inválidas: "${r}" (use "8-12", "10" ou "30-45s")`);
        if (d !== '-' && d !== '' && !desc) err(`Descanso inválido: "${d}" (use "90s" ou "120-180s")`);
        if (!nome || !series || !reps) break;
        const v = variantes(nome);
        const x = extras(resto);
        const ex = {
          nome: v.base, variantes: v.opcoes, chaves: v.opcoes.map(chaveExercicio),
          series, reps: { min: reps.min, max: reps.max }, porTempo: reps.unidade === 's',
          descanso: desc ? { min: desc.min, max: desc.max } : null,
          rir: x.rir || null, iso: x.flags.includes('iso'), foco: x.flags.includes('foco'),
          grupo: chave === 'SS' ? +m[2] : null,
        };
        const desconhecidas = x.flags.filter((f) => !['iso', 'foco'].includes(f));
        if (desconhecidas.length) avisos.push({ linha: n, msg: `Marcação desconhecida ignorada: ${desconhecidas.join(', ')}` });
        sessao.itens.push(ex);
        break;
      }
      case 'CARDIO': {
        const [tipo, freq, dur, ...resto] = campos;
        const duracao = faixa(dur || '', 'min');
        if (!duracao) { err(`Duração do cardio inválida: "${dur}" (use "30-40min")`); break; }
        const x = extras(resto);
        plano.cardio.push({
          tipos: variantes(tipo).opcoes, frequencia: freq,
          minutos: { min: duracao.min / 60, max: duracao.max / 60 },
          fc: x.fc || null, intensidade: x.flags.join(' ') || null,
        });
        break;
      }
      case 'TOTAL': {
        const tt = semAcento(campos.join(' '));
        const s = tt.match(/(\d+)\s*sess/i), e = tt.match(/(\d+)\s*exerc/i);
        total = { sessoes: s ? +s[1] : null, exercicios: e ? +e[1] : null };
        break;
      }
    }
  }

  // Pós-validação
  if (!plano.sessoes.length) erros.push({ linha: 0, msg: 'Nenhuma SESSAO encontrada' });
  for (const s of plano.sessoes) {
    if (!s.itens.length) erros.push({ linha: 0, msg: `Sessão "${s.nome}" sem exercícios` });
    // Bi-sets: descanso informado em qualquer linha vale para o grupo; grupo de 1 é aviso
    const grupos = {};
    for (const e of s.itens) if (e.grupo != null) (grupos[e.grupo] ||= []).push(e);
    for (const [g, itens] of Object.entries(grupos)) {
      if (itens.length < 2) avisos.push({ linha: 0, msg: `"${s.nome}": SS${g} tem só 1 exercício` });
      const d = itens.find((e) => e.descanso)?.descanso || null;
      itens.forEach((e) => (e.descanso = d));
    }
    for (const e of s.itens) if (!e.descanso && e.grupo == null)
      avisos.push({ linha: 0, msg: `"${e.nome}" sem descanso definido` });
  }
  if (plano.bloco) {
    const cobertas = new Set();
    for (const f of plano.bloco.fases) for (let w = f.de; w <= f.ate; w++) {
      if (cobertas.has(w)) erros.push({ linha: 0, msg: `Semana ${w} aparece em mais de uma FASE` });
      cobertas.add(w);
    }
    for (let w = 1; w <= plano.bloco.semanas; w++)
      if (!cobertas.has(w)) avisos.push({ linha: 0, msg: `Semana ${w} não pertence a nenhuma FASE (usa o RIR padrão)` });
  }
  const nEx = plano.sessoes.reduce((a, s) => a + s.itens.length, 0);
  if (!total) avisos.push({ linha: 0, msg: 'Sem linha TOTAL: não dá para conferir se algo se perdeu na leitura' });
  else {
    if (total.sessoes != null && total.sessoes !== plano.sessoes.length)
      erros.push({ linha: 0, msg: `TOTAL diz ${total.sessoes} sessões, mas foram lidas ${plano.sessoes.length}` });
    if (total.exercicios != null && total.exercicios !== nEx)
      erros.push({ linha: 0, msg: `TOTAL diz ${total.exercicios} exercícios, mas foram lidos ${nEx}` });
  }
  return { plano: erros.length ? null : plano, rascunho: plano, erros, avisos };
}

// Prescrição efetiva de um exercício numa semana do bloco (periodização aplicada).
export function prescricao(plano, ex, semana) {
  const fase = plano.bloco?.fases.find((f) => semana >= f.de && semana <= f.ate) || null;
  let series = ex.series;
  if (fase?.series && (fase.series.alvo === 'todos' || (fase.series.alvo === 'foco' && ex.foco) || (fase.series.alvo === 'iso' && ex.iso)))
    series += fase.series.delta;
  if (fase?.volume && fase.volume < 1) series = Math.max(1, Math.ceil(series * fase.volume));
  const rir = ex.rir || (ex.iso && fase?.rirIso) || fase?.rir || plano.progressao.rir;
  return { series, reps: ex.reps, rir, descanso: ex.descanso, fase };
}
