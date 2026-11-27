// Corpo (BRIEFING-v2, seção 9): média de 7 dias, tendência de 4 semanas, bioimpedância como tendência, medidas com
// fita, lembrete de medidas e a regra P5 (perda de peso rápida → alerta do coach, sem mudar a carga).
// A tendência de peso é o indicador principal; não estimamos TDEE (precisão falsa).

import { diasEntre, somarDias, type ISODate } from '../datas.ts';

export interface Pesagem {
  data: ISODate;
  hora: string | null; // 'HH:MM'
  kg: number;
  condicao: 'jejum' | 'outra';
}

export interface MedicaoBio {
  data: ISODate;
  gorduraPct: number | null;
  massaGordaKg: number | null;
  musculoEsqKg: number | null;
  aguaPct: number | null;
}

export interface MedicaoFita {
  data: ISODate;
  local: string;
  cm: number;
}

const umaCasa = (x: number) => Math.round(x * 10) / 10;
const duasCasas = (x: number) => Math.round(x * 100) / 100;

// Uma pesagem por dia: em jejum tem prioridade; entre iguais, a mais cedo
export function porDia(pesagens: readonly Pesagem[]): Pesagem[] {
  const dias = new Map<ISODate, Pesagem>();
  for (const p of pesagens) {
    const atual = dias.get(p.data);
    const melhor =
      !atual ||
      (p.condicao === 'jejum' && atual.condicao !== 'jejum') ||
      (p.condicao === atual.condicao && (p.hora ?? '99:99') < (atual.hora ?? '99:99'));
    if (melhor) dias.set(p.data, p);
  }
  return [...dias.values()].sort((a, b) => a.data.localeCompare(b.data));
}

// Média das pesagens dos 7 dias corridos que terminam em `data` (uma por dia); null sem nenhuma
export function mediaMovel7(pesagens: readonly Pesagem[], data: ISODate): number | null {
  const inicio = somarDias(data, -6);
  const janela = porDia(pesagens).filter((p) => p.data >= inicio && p.data <= data);
  if (!janela.length) return null;
  return umaCasa(janela.reduce((s, p) => s + p.kg, 0) / janela.length);
}

export interface Tendencia {
  kgSemana: number; // inclinação da reta, em kg por semana (negativo = perdendo)
  pctSemana: number; // em % do peso médio por semana
  kgPeriodo: number; // variação no período pela reta (4 semanas)
  pesagens: number;
}

// Regressão linear (mínimos quadrados) das pesagens dos últimos `dias` dias. Exige ≥ 6 pesagens cobrindo ≥ 7 dias;
// senão, null ("dados insuficientes").
export function tendencia(pesagens: readonly Pesagem[], hoje: ISODate, dias = 28): Tendencia | null {
  const inicio = somarDias(hoje, -(dias - 1));
  const pts = porDia(pesagens).filter((p) => p.data >= inicio && p.data <= hoje);
  if (pts.length < 6 || diasEntre(pts[0]!.data, pts.at(-1)!.data) < 7) return null;
  const xs = pts.map((p) => diasEntre(inicio, p.data));
  const ys = pts.map((p) => p.kg);
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = ys.reduce((s, y) => s + y, 0) / ys.length;
  const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0);
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const porDiaKg = sxx ? sxy / sxx : 0;
  return {
    kgSemana: duasCasas(porDiaKg * 7),
    pctSemana: duasCasas(((porDiaKg * 7) / my) * 100),
    kgPeriodo: umaCasa(porDiaKg * (dias - 1)),
    pesagens: pts.length,
  };
}

// P5 (BRIEFING-v2 8.1): perda maior que `limitePct` do peso por semana em cada uma das 2 últimas semanas (pela média
// de 7 dias). Não muda a carga: vira alerta do coach sobre risco à massa magra (murphy2022).
export function alertaPerdaRapida(
  pesagens: readonly Pesagem[],
  hoje: ISODate,
  limitePct = 0.7,
): string | null {
  const m0 = mediaMovel7(pesagens, hoje);
  const m1 = mediaMovel7(pesagens, somarDias(hoje, -7));
  const m2 = mediaMovel7(pesagens, somarDias(hoje, -14));
  if (m0 == null || m1 == null || m2 == null) return null;
  const s1 = ((m1 - m0) / m1) * 100;
  const s2 = ((m2 - m1) / m2) * 100;
  if (s1 <= limitePct || s2 <= limitePct) return null;
  const fmt = (x: number) => String(umaCasa(x)).replace('.', ',');
  return `Perda de ${fmt(s2)}% e ${fmt(s1)}% do peso nas 2 últimas semanas, acima de ${fmt(limitePct)}% por semana: risco de perder massa magra. Vale revisar o déficit com o nutricionista.`;
}

// Bioimpedância é tendência (galaxybia2025): diferença entre a média das 3 últimas e das 3 anteriores
export function tendenciaBio(
  medicoes: readonly MedicaoBio[],
  campo: 'gorduraPct' | 'massaGordaKg' | 'musculoEsqKg' | 'aguaPct',
): { atual: number; variacao: number | null } | null {
  const xs = [...medicoes]
    .filter((m) => m[campo] != null)
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((m) => m[campo]!);
  if (!xs.length) return null;
  const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const ult = xs.slice(-3);
  const ant = xs.slice(-6, -3);
  return { atual: umaCasa(xs.at(-1)!), variacao: ant.length ? umaCasa(media(ult) - media(ant)) : null };
}

export const LOCAIS_FITA = ['Cintura', 'Abdômen', 'Quadril', 'Peito', 'Braço', 'Coxa'];

// Última medida de cada local e a variação em relação à anterior do mesmo local
export function resumoFita(
  medidas: readonly MedicaoFita[],
): { local: string; cm: number; data: ISODate; variacao: number | null }[] {
  const porLocal = new Map<string, MedicaoFita[]>();
  for (const m of [...medidas].sort((a, b) => a.data.localeCompare(b.data)))
    porLocal.set(m.local, [...(porLocal.get(m.local) ?? []), m]);
  const ordem = (l: string) => {
    const i = LOCAIS_FITA.indexOf(l);
    return i < 0 ? LOCAIS_FITA.length : i;
  };
  return [...porLocal.entries()]
    .sort(([a], [b]) => ordem(a) - ordem(b) || a.localeCompare(b))
    .map(([local, ms]) => {
      const u = ms.at(-1)!;
      const a = ms.at(-2);
      return { local, cm: u.cm, data: u.data, variacao: a ? umaCasa(u.cm - a.cm) : null };
    });
}

// Lembrete de medidas a cada 2 a 4 semanas (configurável): sem nenhuma, ou a última há `dias` ou mais
export function precisaMedir(medidas: readonly MedicaoFita[], hoje: ISODate, dias = 21): boolean {
  const ultima = medidas.reduce<ISODate | null>((m, x) => (!m || x.data > m ? x.data : m), null);
  return !ultima || diasEntre(ultima, hoje) >= dias;
}

// Série do gráfico: pesagem do dia e média de 7 dias, nos últimos `dias` dias
export function serieDoPeso(
  pesagens: readonly Pesagem[],
  hoje: ISODate,
  dias = 28,
): { data: ISODate; kg: number | null; media: number | null }[] {
  const doDia = new Map(porDia(pesagens).map((p) => [p.data, p.kg]));
  return Array.from({ length: dias }, (_, i) => {
    const data = somarDias(hoje, i - (dias - 1));
    return { data, kg: doDia.get(data) ?? null, media: mediaMovel7(pesagens, data) };
  });
}
