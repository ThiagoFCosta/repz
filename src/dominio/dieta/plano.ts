// Plano alimentar vigente (BRIEFING-v2 10): o documento guardado (D38), montado a partir do NutriDiet ou do agente,
// os totais por tipo de dia, o peso estimado de itens sem gramas (decisão 16.6) e o tipo de dia de hoje (16.5).

import { normalizarNome, alimentoPorId, nutrientes, type Alimento } from './alimentos.ts';
import type { DiaNutriDiet, ResultadoNutriDiet } from './parser.ts';
import { vincular, type OrigemVinculo } from './vincular.ts';

export interface ItemPlano {
  nome: string; // texto do nutricionista
  quantidade: number | null;
  medida: string | null;
  textoOriginal: string; // "2 fatias (50g)"
  gramas: number | null;
  gramasEstimadas: boolean; // sem gramas no PDF: peso padrão por unidade (16.6), editável
  alimentoId: string | null;
  vinculo: OrigemVinculo | null;
  doNutricionista?: { alimentoId: string; gramas: number }[]; // substituições próprias do nutricionista
}

export interface RefeicaoPlano {
  nome: string;
  horario: string;
  itens: ItemPlano[];
}

export interface TipoDia {
  id: string;
  nome: string; // "Perna + Bike"
  refeicoes: RefeicaoPlano[];
  notas: string[];
  sessoes: string[]; // nomes das sessões do plano de treino que usam este tipo de dia
  descanso: boolean; // vale para os dias sem treino
}

export interface EstruturaPlanoAlimentar {
  dias: TipoDia[];
  cabecalho: { pesoKg?: number; alturaCm?: number };
}

// ---- Itens sem gramas (decisão 16.6): peso padrão por unidade, marcado "peso estimado" e editável ----
const UNIDADES: [RegExp, number][] = [
  [/castanha.*(para|brasil)/, 4],
  [/castanha.*caju/, 3],
  [/banana/, 90],
  [/maca\b|maca /, 130],
  [/ovo/, 50],
  [/pao frances/, 50],
  [/morango/, 12],
  [/laranja/, 150],
  [/tangerina|mexerica/, 120],
];
export function gramasPorUnidade(nome: string): number | null {
  const n = normalizarNome(nome);
  return UNIDADES.find(([re]) => re.test(n))?.[1] ?? null;
}

// ---- Tipo de dia ↔ sessões do treino (decisão 16.5), sugestão editável na revisão ----
export function sugerirVinculoDias(
  dias: readonly { nome: string }[],
  sessoes: readonly string[],
): { sessoes: string[]; descanso: boolean }[] {
  const n = (s: string) => normalizarNome(s);
  const perna = sessoes.filter((s) => /leg|perna|inferior/.test(n(s)));
  const usados = new Set<string>();
  const saida = dias.map((d) => {
    const nd = n(d.nome);
    if (/descanso|off|folga/.test(nd)) return { sessoes: [], descanso: true };
    if (/perna|inferior/.test(nd)) {
      perna.forEach((s) => usados.add(s));
      return { sessoes: [...perna], descanso: false };
    }
    return { sessoes: [], descanso: false };
  });
  // "Superiores + Bike" e "Dias de Exercício" dividem o resto: superiores ganha as sessões que não são de perna;
  // "Dias de Exercício" fica com o que sobrar (o Thiago ajusta na revisão)
  const resto = sessoes.filter((s) => !usados.has(s));
  const iSup = dias.findIndex((d) => /superior/.test(n(d.nome)));
  const iExe = dias.findIndex((d) => /exercicio|treino/.test(n(d.nome)));
  if (iSup >= 0) saida[iSup]!.sessoes = [...resto];
  else if (iExe >= 0) saida[iExe]!.sessoes = [...resto];
  return saida;
}

// Monta o documento a partir do NutriDiet, já com os vínculos sugeridos
export function montarDoNutriDiet(
  r: ResultadoNutriDiet,
  opts: {
    gerarId: () => string;
    sessoes?: readonly string[];
    aliases?: ReadonlyMap<string, string>;
    extras?: readonly Alimento[];
  },
): EstruturaPlanoAlimentar {
  const vinculos = sugerirVinculoDias(r.dias, opts.sessoes ?? []);
  return {
    cabecalho: { pesoKg: r.cabecalho.pesoKg, alturaCm: r.cabecalho.alturaCm },
    dias: r.dias.map((d: DiaNutriDiet, i) => ({
      id: opts.gerarId(),
      nome: d.nome,
      notas: d.notas,
      sessoes: vinculos[i]!.sessoes,
      descanso: vinculos[i]!.descanso,
      refeicoes: d.refeicoes.map((ref) => ({
        nome: ref.nome,
        horario: ref.horario,
        itens: ref.itens.map((it) => {
          const v = vincular(it.nome, opts.aliases, opts.extras);
          const porUnidade = it.gramas == null ? gramasPorUnidade(it.nome) : null;
          return {
            nome: it.nome,
            quantidade: it.quantidade,
            medida: it.medida,
            textoOriginal: it.textoOriginal,
            gramas: it.gramas ?? (porUnidade != null ? porUnidade * (it.quantidade ?? 1) : null),
            gramasEstimadas: it.gramas == null && porUnidade != null,
            alimentoId: v.alimento?.id ?? null,
            vinculo: v.origem,
          };
        }),
      })),
    })),
  };
}

export interface Totais {
  kcal: number;
  p: number;
  c: number;
  g: number;
  semVinculo: number; // itens que ficaram fora da conta (sem alimento ou sem gramas)
}

export function totaisDaRefeicao(ref: RefeicaoPlano, extras: readonly Alimento[] = []): Totais {
  const t: Totais = { kcal: 0, p: 0, c: 0, g: 0, semVinculo: 0 };
  for (const it of ref.itens) {
    const a = it.alimentoId ? alimentoPorId(it.alimentoId, extras) : null;
    if (!a || it.gramas == null) {
      t.semVinculo++;
      continue;
    }
    const n = nutrientes(a, it.gramas);
    t.kcal += n.kcal;
    t.p += n.p;
    t.c += n.c;
    t.g += n.g;
  }
  return t;
}

export function totaisDoDia(dia: TipoDia, extras: readonly Alimento[] = []): Totais {
  const t = dia.refeicoes.map((r) => totaisDaRefeicao(r, extras));
  return {
    kcal: Math.round(t.reduce((s, x) => s + x.kcal, 0)),
    p: Math.round(t.reduce((s, x) => s + x.p, 0)),
    c: Math.round(t.reduce((s, x) => s + x.c, 0)),
    g: Math.round(t.reduce((s, x) => s + x.g, 0)),
    semVinculo: t.reduce((s, x) => s + x.semVinculo, 0),
  };
}

// Média simples de kcal dos tipos de dia (ao lado da tendência de peso, BRIEFING-v2 9)
export function kcalMedia(e: EstruturaPlanoAlimentar, extras: readonly Alimento[] = []): number | null {
  if (!e.dias.length) return null;
  return Math.round(e.dias.reduce((s, d) => s + totaisDoDia(d, extras).kcal, 0) / e.dias.length);
}

// Tipo de dia de hoje (BRIEFING-v2 10.4): pela sessão feita ou planejada hoje; sem treino, o de descanso
export function tipoDeDiaDeHoje(e: EstruturaPlanoAlimentar, sessaoDeHoje: string | null): TipoDia | null {
  if (!e.dias.length) return null;
  if (sessaoDeHoje) {
    const n = normalizarNome(sessaoDeHoje);
    const d = e.dias.find((x) => x.sessoes.some((s) => normalizarNome(s) === n));
    if (d) return d;
    return e.dias.find((x) => !x.descanso) ?? e.dias[0]!;
  }
  return e.dias.find((x) => x.descanso) ?? e.dias[0]!;
}
