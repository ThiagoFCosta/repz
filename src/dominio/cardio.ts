// Cardio (BRIEFING 9.3 e 9.7): meta semanal pela frequência do plano e comparação do registro
// com a duração e a faixa de FC prescritas.

import { inicioDaSemana, somarDias, type ISODate } from './datas.ts';
import { semAcento } from './formato/normalizar.ts';
import type { CardioPrescrito, Faixa } from './tipos.ts';

// '2x' → 2 · '3 x' → 3 · 'diario' / 'diário' → 7 · 'opcional' (ou qualquer outra coisa) → null (sem meta)
export function metaSemanal(frequencia: string): number | null {
  const f = semAcento(frequencia).toLowerCase().trim();
  if (/^diari|^todo/.test(f)) return 7;
  const n = f.match(/^(\d+)\s*x/);
  return n && +n[1]! > 0 ? Math.min(+n[1]!, 7) : null;
}

export interface RegistroCardio {
  data: ISODate;
  tipo: string;
  minutos: number;
  fcMedia: number | null;
}

const igual = (a: string, b: string) =>
  semAcento(a).toLowerCase().trim() === semAcento(b).toLowerCase().trim();

// Tipos do plano, sem repetição, na ordem em que aparecem (chips da tela, 9.7)
export function tiposDoPlano(cardio: readonly CardioPrescrito[]): string[] {
  const tipos: string[] = [];
  for (const c of cardio) for (const t of c.tipos) if (!tipos.some((x) => igual(x, t))) tipos.push(t);
  return tipos;
}

const distancia = (x: number, f: Faixa) => (x < f.min ? f.min - x : x > f.max ? x - f.max : 0);

/**
 * Linha CARDIO do plano que vale para o registro (D18): entre as do mesmo tipo (ou todas, se o tipo
 * não está no plano), a de duração mais próxima; no empate, a primeira. Sem duração ainda (tela),
 * a primeira com meta semanal. Sem linhas, null.
 */
export function prescricaoDoRegistro(
  cardio: readonly CardioPrescrito[],
  r: { tipo: string; minutos: number | null },
): CardioPrescrito | null {
  const doTipo = cardio.filter((c) => c.tipos.some((t) => igual(t, r.tipo)));
  const candidatas = doTipo.length ? doTipo : cardio;
  const minutos = r.minutos;
  if (minutos == null)
    return candidatas.find((c) => metaSemanal(c.frequencia) != null) ?? candidatas[0] ?? null;
  return candidatas.reduce<CardioPrescrito | null>(
    (a, c) => (!a || distancia(minutos, c.minutos) < distancia(minutos, a.minutos) ? c : a),
    null,
  );
}

export type Comparacao = 'abaixo' | 'dentro' | 'acima';

const comparar = (x: number, f: Faixa): Comparacao => (x < f.min ? 'abaixo' : x > f.max ? 'acima' : 'dentro');

export interface Avaliacao {
  duracao: Comparacao;
  fc: Comparacao | null; // null sem faixa de FC no plano ou sem FC registrada
}

export function avaliar(r: Pick<RegistroCardio, 'minutos' | 'fcMedia'>, presc: CardioPrescrito): Avaliacao {
  return {
    duracao: comparar(r.minutos, presc.minutos),
    fc: presc.fc && r.fcMedia != null ? comparar(r.fcMedia, presc.fc) : null,
  };
}

export interface ProgressoSemana {
  feitos: number; // registros da semana que contam para a meta
  meta: number | null; // soma das metas das linhas com frequência; null se todas são opcionais
  total: number; // todos os registros da semana
  de: ISODate; // segunda
  ate: ISODate; // domingo
}

// "X de Y nesta semana" (9.3), semana de segunda a domingo. Conta para a meta o registro cuja
// linha do plano (prescricaoDoRegistro) tem frequência; um cardio "opcional" não conta.
export function progressoDaSemana(
  cardio: readonly CardioPrescrito[],
  registros: readonly RegistroCardio[],
  hoje: ISODate,
): ProgressoSemana {
  const de = inicioDaSemana(hoje);
  const ate = somarDias(de, 6);
  const daSemana = registros.filter((r) => r.data >= de && r.data <= ate);
  const metas = cardio.map((c) => metaSemanal(c.frequencia)).filter((m): m is number => m != null);
  const feitos = daSemana.filter((r) => {
    const p = prescricaoDoRegistro(cardio, r);
    return p != null && metaSemanal(p.frequencia) != null;
  }).length;
  return {
    feitos,
    meta: metas.length
      ? Math.min(
          metas.reduce((a, b) => a + b, 0),
          7,
        )
      : null,
    total: daSemana.length,
    de,
    ate,
  };
}

// ---- Histórico semanal (BRIEFING-v2 7.2): minutos, sessões e FC média por semana (segunda a domingo) ----

export interface SemanaCardio {
  inicio: ISODate; // segunda-feira
  minutos: number;
  sessoes: number;
  fcMedia: number | null; // média das sessões com FC, ponderada pela duração
}

export function cardioPorSemana(
  registros: readonly RegistroCardio[],
  hoje: ISODate,
  semanas = 8,
): SemanaCardio[] {
  const atual = inicioDaSemana(hoje);
  const lista: SemanaCardio[] = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const inicio = somarDias(atual, -7 * i);
    const fim = somarDias(inicio, 6);
    const daSemana = registros.filter((r) => r.data >= inicio && r.data <= fim);
    const comFc = daSemana.filter((r) => r.fcMedia != null);
    const minFc = comFc.reduce((s, r) => s + r.minutos, 0);
    lista.push({
      inicio,
      minutos: daSemana.reduce((s, r) => s + r.minutos, 0),
      sessoes: daSemana.length,
      fcMedia: minFc ? Math.round(comFc.reduce((s, r) => s + r.fcMedia! * r.minutos, 0) / minFc) : null,
    });
  }
  return lista;
}

// Tipos para os chips: os do plano e, se o plano não tiver bicicleta, "Bicicleta" (o padrão, BRIEFING-v2 7.2)
export function tiposParaRegistro(cardio: readonly CardioPrescrito[]): string[] {
  const doPlano = tiposDoPlano(cardio);
  return doPlano.some((t) => /bic|bike/i.test(semAcento(t))) ? doPlano : [...doPlano, 'Bicicleta'];
}
