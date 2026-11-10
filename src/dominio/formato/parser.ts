// Parser do formato TREINO v1 (BRIEFING seção 5). Porte de referencia/parser/parser.js:
// mesmas regras e mesmas mensagens, que os testes comparam como texto.

import type {
  AlvoSeries,
  CardioPrescrito,
  ExercicioImportado,
  Faixa,
  Mensagem,
  PlanoImportado,
  SessaoImportada,
} from '../tipos';
import { chaveExercicio, normalizar, semAcento } from './normalizar';

export interface ResultadoParse {
  plano: PlanoImportado | null; // null quando há erro
  rascunho: PlanoImportado; // sempre presente, para a tela mostrar o que foi lido
  erros: Mensagem[];
  avisos: Mensagem[];
  textoBloco: string; // bloco entre os marcadores (inclusive), para auditoria e reimportação
}

const INICIO = /#TREINO-INICIO\s*v?(\d+)?/i;
const FIM = /#TREINO-FIM/i;
const RE_CHAVE = /^(PLANO|PROGRESSAO|BLOCO|FASE|SESSAO|EX|SS(\d+)|CARDIO|TOTAL)\s*:\s*(.*)$/;
type Chave = 'PLANO' | 'PROGRESSAO' | 'BLOCO' | 'FASE' | 'SESSAO' | 'EX' | 'SS' | 'CARDIO' | 'TOTAL';
// Mínimo de campos de cada tipo; abaixo disso, a linha seguinte sem chave é anexada (5.3, regra 4)
const CAMPOS_MIN: Partial<Record<Chave, number>> = { EX: 4, SS: 4, PLANO: 1, FASE: 2, CARDIO: 3, TOTAL: 2 };
const ALVOS: readonly string[] = ['todos', 'foco', 'iso'];
const DIAS: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };

interface FaixaUnidade extends Faixa {
  unidade: 's' | '';
}

// "8-12" | "10" | "30-45s" | "120-180s" | "2-3min" → minutos viram segundos
function faixa(txt: string, sufixo = ''): FaixaUnidade | null {
  const m = txt
    .replace(/\s/g, '')
    .toLowerCase()
    .match(/^(\d+(?:[.,]\d+)?)(?:-(\d+(?:[.,]\d+)?))?(s|seg|min)?$/);
  if (!m) return null;
  const n = (x: string) => parseFloat(x.replace(',', '.'));
  let min = n(m[1]!);
  let max = m[2] != null ? n(m[2]) : min;
  const un = m[3] || sufixo;
  if (un === 'min') {
    min *= 60;
    max *= 60;
  }
  return { min, max, unidade: un ? 's' : '' };
}

function faixaSimples(txt: string): Faixa | null {
  const m = txt.match(/^(\d+)(?:-(\d+))?$/);
  return m ? { min: +m[1]!, max: m[2] ? +m[2] : +m[1]! } : null;
}

// "Supino reto [barra / maquina]" → base "Supino reto", opções ["Supino reto barra", "Supino reto maquina"]
function variantes(nome: string): { base: string; opcoes: string[] } {
  const m = nome.match(/^(.*?)\[(.+?)\](.*)$/);
  if (!m) return { base: nome, opcoes: [nome] };
  const [, antes, meio, depois] = m as unknown as [string, string, string, string];
  const opcoes = meio.split('/').map((o) => `${antes}${o.trim()}${depois}`.replace(/\s+/g, ' ').trim());
  return { base: nome.replace(/\s*\[.+?\]\s*/, ' ').trim() || opcoes.join(' / '), opcoes };
}

interface Extras {
  flags: string[];
  rir?: Faixa | null;
  rirIso?: Faixa | null;
  fc?: Faixa | null;
  volume?: number;
  series?: { delta: number; alvo: string };
  carga?: Faixa;
  estagnado?: number;
}

// Tokens opcionais: "rir 3", "iso", "foco", "fc 115-135", "z2", "deload", "volume 50%", "series +1 foco"…
function extras(campos: string[]): Extras {
  const r: Extras = { flags: [] };
  const num = (x: string) => parseFloat(x.replace(',', '.'));
  for (const c of campos) {
    const t = semAcento(c).toLowerCase().trim();
    let m: RegExpMatchArray | null;
    if ((m = t.match(/^rir_iso\s+(\d+(?:-\d+)?)$/))) r.rirIso = faixaSimples(m[1]!);
    else if ((m = t.match(/^rir\s+(\d+(?:-\d+)?)$/))) r.rir = faixaSimples(m[1]!);
    else if ((m = t.match(/^fc\s+(\d+(?:-\d+)?)$/))) r.fc = faixaSimples(m[1]!);
    else if ((m = t.match(/^volume\s+(\d+)\s*%$/))) r.volume = +m[1]! / 100;
    else if ((m = t.match(/^series\s+([+-]\d+)(?:\s+(\w+))?$/)))
      r.series = { delta: +m[1]!, alvo: m[2] || 'todos' };
    else if ((m = t.match(/^carga\s+\+?(\d+(?:[.,]\d+)?)(?:-(\d+(?:[.,]\d+)?))?\s*%$/)))
      r.carga = { min: num(m[1]!), max: num(m[2] || m[1]!) };
    else if ((m = t.match(/^estagnado\s+(\d+)$/))) r.estagnado = +m[1]!;
    else if (t) r.flags.push(t);
  }
  return r;
}

function casarChave(txt: string): RegExpMatchArray | null {
  const i = txt.indexOf(':');
  if (i < 0) return null;
  return (semAcento(txt.slice(0, i)).toUpperCase().replace(/\s+/g, '') + txt.slice(i)).match(RE_CHAVE);
}

const tipoDaChave = (m: RegExpMatchArray): Chave => (m[2] ? 'SS' : (m[1] as Chave));

interface Linha {
  n: number;
  txt: string;
  solta?: boolean;
}

// Junta linhas quebradas pelo PDF: uma linha sem chave é anexada à anterior
// apenas se começar com "|" ou se a anterior ainda não tem o mínimo de campos.
function juntarLinhas(brutas: Linha[]): Linha[] {
  const out: Linha[] = [];
  for (const { n, txt } of brutas) {
    if (casarChave(txt) || txt.startsWith('#')) {
      out.push({ n, txt });
      continue;
    }
    const ant = out[out.length - 1];
    if (ant) {
      const ma = casarChave(ant.txt);
      const min = ma ? CAMPOS_MIN[tipoDaChave(ma)] : undefined;
      if (txt.startsWith('|') || (min && ant.txt.split('|').length < min)) {
        ant.txt = `${ant.txt} ${txt}`;
        continue;
      }
    }
    out.push({ n, txt, solta: true });
  }
  return out;
}

type Bloco = { erro: string } | { versao: number; linhas: Linha[]; texto: string };

export function extrairBloco(texto: string): Bloco {
  const linhas = texto.split(/\r?\n/).map(normalizar);
  const i = linhas.findIndex((l) => INICIO.test(l));
  if (i < 0)
    return {
      erro: 'Marcador #TREINO-INICIO não encontrado. O PDF precisa ter o anexo no formato TREINO v1.',
    };
  const j = linhas.findIndex((l, k) => k > i && FIM.test(l));
  if (j < 0) return { erro: 'Marcador #TREINO-FIM não encontrado: o bloco pode ter sido cortado.' };
  const versao = +(linhas[i]!.match(INICIO)![1] || 1);
  const corpo = linhas
    .slice(i + 1, j)
    .map((txt, k) => ({ n: k + 1, txt }))
    .filter((l) => l.txt);
  return { versao, linhas: corpo, texto: linhas.slice(i, j + 1).join('\n') };
}

function planoVazio(): PlanoImportado {
  return {
    versaoFormato: 1,
    nome: '',
    autor: '',
    data: null,
    progressao: { tipo: 'dupla', rir: { min: 1, max: 3 }, carga: { min: 2, max: 5 }, estagnado: 3 },
    bloco: null,
    sessoes: [],
    cardio: [],
  };
}

export function parse(texto: string): ResultadoParse {
  const erros: Mensagem[] = [];
  const avisos: Mensagem[] = [];
  const plano = planoVazio();
  const bloco = extrairBloco(texto);
  if ('erro' in bloco)
    return { plano: null, rascunho: plano, erros: [{ linha: 0, msg: bloco.erro }], avisos, textoBloco: '' };
  if (bloco.versao !== 1)
    avisos.push({ linha: 0, msg: `Versão ${bloco.versao} do formato; este app lê a v1.` });

  let sessao: SessaoImportada | null = null;
  let total: { sessoes: number | null; exercicios: number | null } | null = null;

  for (const { n, txt, solta } of juntarLinhas(bloco.linhas)) {
    if (txt.startsWith('#')) continue; // comentário
    if (solta) {
      avisos.push({ linha: n, msg: `Linha ignorada (sem chave reconhecida): "${txt.slice(0, 60)}"` });
      continue;
    }
    const m = casarChave(txt)!;
    const chave = tipoDaChave(m);
    const campos = m[3]!.split('|').map((c) => c.trim());
    const err = (msg: string) => erros.push({ linha: n, msg, texto: txt });

    switch (chave) {
      case 'PLANO':
        plano.nome = campos[0] ?? '';
        plano.autor = campos[1] ?? '';
        plano.data = campos[2] || null;
        break;

      case 'PROGRESSAO': {
        const x = extras(campos.slice(1));
        plano.progressao = {
          tipo: campos[0]!.toLowerCase() || 'dupla',
          rir: x.rir || plano.progressao.rir,
          carga: x.carga || plano.progressao.carga,
          estagnado: x.estagnado || plano.progressao.estagnado,
        };
        break;
      }

      case 'BLOCO': {
        const s = parseInt(campos[0]!, 10);
        if (!s) err('BLOCO precisa do número de semanas, ex.: "BLOCO: 12"');
        else plano.bloco = { semanas: s, fases: [] };
        break;
      }

      case 'FASE': {
        if (!plano.bloco) {
          err('FASE apareceu antes de BLOCO');
          break;
        }
        const sem = faixaSimples(campos[0]!.replace(/\s/g, ''));
        if (!sem) {
          err(`Semanas inválidas na FASE: "${campos[0]}" (use "1-4" ou "12")`);
          break;
        }
        const x = extras(campos.slice(1));
        let series: { delta: number; alvo: AlvoSeries } | null = null;
        if (x.series && ALVOS.includes(x.series.alvo))
          series = { delta: x.series.delta, alvo: x.series.alvo as AlvoSeries };
        else if (x.series)
          avisos.push({ linha: n, msg: `Marcação desconhecida ignorada: series ${x.series.alvo}` });
        const desconhecidas = x.flags.filter((f) => f !== 'deload');
        if (desconhecidas.length)
          avisos.push({ linha: n, msg: `Marcação desconhecida ignorada: ${desconhecidas.join(', ')}` });
        plano.bloco.fases.push({
          de: sem.min,
          ate: sem.max,
          rir: x.rir || null,
          rirIso: x.rirIso || null,
          deload: x.flags.includes('deload'),
          volume: x.volume ?? 1,
          series,
        });
        break;
      }

      case 'SESSAO': {
        const dia = campos[1] ? DIAS[semAcento(campos[1]).toLowerCase().slice(0, 3)] : undefined;
        sessao = { nome: campos[0] ?? '', dia: dia ?? null, itens: [] };
        if (!campos[0]) err('SESSAO sem nome');
        plano.sessoes.push(sessao);
        break;
      }

      case 'EX':
      case 'SS': {
        if (!sessao) {
          err('Exercício antes de qualquer SESSAO');
          break;
        }
        if (campos.length < 4) {
          err(`Faltam campos: esperado "nome | séries | reps | descanso", veio ${campos.length}`);
          break;
        }
        const [nome, s, r, d, ...resto] = campos as [string, string, string, string, ...string[]];
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
        const ex: ExercicioImportado = {
          nome: v.base,
          variantes: v.opcoes,
          chaves: v.opcoes.map(chaveExercicio),
          series,
          reps: { min: reps.min, max: reps.max },
          porTempo: reps.unidade === 's',
          descanso: desc ? { min: desc.min, max: desc.max } : null,
          rir: x.rir || null,
          iso: x.flags.includes('iso'),
          foco: x.flags.includes('foco'),
          grupo: chave === 'SS' ? +m[2]! : null,
        };
        const desconhecidas = x.flags.filter((f) => f !== 'iso' && f !== 'foco');
        if (desconhecidas.length)
          avisos.push({ linha: n, msg: `Marcação desconhecida ignorada: ${desconhecidas.join(', ')}` });
        sessao.itens.push(ex);
        break;
      }

      case 'CARDIO': {
        const [tipo = '', freq = '', dur = '', ...resto] = campos;
        const duracao = faixa(dur, 'min');
        if (!duracao) {
          err(`Duração do cardio inválida: "${dur}" (use "30-40min")`);
          break;
        }
        const x = extras(resto);
        const cardio: CardioPrescrito = {
          tipos: variantes(tipo).opcoes,
          frequencia: freq,
          minutos: { min: duracao.min / 60, max: duracao.max / 60 },
          fc: x.fc || null,
          intensidade: x.flags.join(' ') || null,
        };
        plano.cardio.push(cardio);
        break;
      }

      case 'TOTAL': {
        const tt = semAcento(campos.join(' '));
        const s = tt.match(/(\d+)\s*sess/i);
        const e = tt.match(/(\d+)\s*exerc/i);
        total = { sessoes: s ? +s[1]! : null, exercicios: e ? +e[1]! : null };
        break;
      }
    }
  }

  validarFinal(plano, total, erros, avisos);
  return { plano: erros.length ? null : plano, rascunho: plano, erros, avisos, textoBloco: bloco.texto };
}

function validarFinal(
  plano: PlanoImportado,
  total: { sessoes: number | null; exercicios: number | null } | null,
  erros: Mensagem[],
  avisos: Mensagem[],
): void {
  if (!plano.sessoes.length) erros.push({ linha: 0, msg: 'Nenhuma SESSAO encontrada' });
  for (const s of plano.sessoes) {
    if (!s.itens.length) erros.push({ linha: 0, msg: `Sessão "${s.nome}" sem exercícios` });
    // Bi-sets: o descanso informado em qualquer linha vale para o grupo; grupo de 1 é aviso
    const grupos = new Map<number, ExercicioImportado[]>();
    for (const e of s.itens) if (e.grupo != null) grupos.set(e.grupo, [...(grupos.get(e.grupo) ?? []), e]);
    for (const [g, itens] of grupos) {
      if (itens.length < 2) avisos.push({ linha: 0, msg: `"${s.nome}": SS${g} tem só 1 exercício` });
      const d = itens.find((e) => e.descanso)?.descanso ?? null;
      for (const e of itens) e.descanso = d;
    }
    for (const e of s.itens)
      if (!e.descanso && e.grupo == null) avisos.push({ linha: 0, msg: `"${e.nome}" sem descanso definido` });
  }
  if (plano.bloco) {
    const cobertas = new Set<number>();
    for (const f of plano.bloco.fases)
      for (let w = f.de; w <= f.ate; w++) {
        if (cobertas.has(w)) erros.push({ linha: 0, msg: `Semana ${w} aparece em mais de uma FASE` });
        cobertas.add(w);
      }
    for (let w = 1; w <= plano.bloco.semanas; w++)
      if (!cobertas.has(w))
        avisos.push({ linha: 0, msg: `Semana ${w} não pertence a nenhuma FASE (usa o RIR padrão)` });
  }
  const nEx = plano.sessoes.reduce((a, s) => a + s.itens.length, 0);
  if (!total)
    avisos.push({ linha: 0, msg: 'Sem linha TOTAL: não dá para conferir se algo se perdeu na leitura' });
  else {
    if (total.sessoes != null && total.sessoes !== plano.sessoes.length)
      erros.push({
        linha: 0,
        msg: `TOTAL diz ${total.sessoes} sessões, mas foram lidas ${plano.sessoes.length}`,
      });
    if (total.exercicios != null && total.exercicios !== nEx)
      erros.push({ linha: 0, msg: `TOTAL diz ${total.exercicios} exercícios, mas foram lidos ${nEx}` });
  }
}
