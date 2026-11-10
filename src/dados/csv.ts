// Planilhas CSV para abrir direto no Excel em pt-BR (BRIEFING 10): UTF-8 com BOM, separador ';',
// vírgula decimal, aspas quando a célula tem ';', aspas ou quebra de linha, linhas com CRLF.
// Só entram treinos não descartados (D6: o descarte fica no banco, fora dos dados do usuário).

import { formatarDecimal } from '../dominio/numeros';
import { faseDaSemana } from '../dominio/periodizacao/prescricao';
import type { RepzDb } from './db';
import { indiceDeExercicios } from './historico-repo';
import type { CardioRealizado, Plano, SerieRealizada, Treino } from './tipos';

// U+FEFF: o Excel só reconhece UTF-8 (acentos) com a marca no início do arquivo
export const BOM = String.fromCharCode(0xfeff);

export const CABECALHO_SERIES = [
  'data',
  'sessao',
  'exercicio',
  'variante',
  'serie',
  'kg',
  'reps',
  'rir',
  'aquecimento',
  'semana_bloco',
  'fase',
  'plano',
] as const;

export const CABECALHO_CARDIO = ['data', 'tipo', 'minutos', 'fc_media', 'distancia_km', 'esforco'] as const;

export type Celula = string | number | boolean | null;

export function celula(v: Celula): string {
  if (v == null) return '';
  if (typeof v === 'number') return formatarDecimal(v);
  if (typeof v === 'boolean') return v ? 'sim' : 'não';
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function montarCsv(cabecalho: readonly string[], linhas: readonly Celula[][]): string {
  return BOM + [cabecalho.join(';'), ...linhas.map((l) => l.map(celula).join(';'))].join('\r\n') + '\r\n';
}

// Semana usada na prescrição do treino (a do estado salvo segue a D1); senão, a do bloco
const semanaDoTreino = (t: Treino) => t.estadoUI?.semana ?? t.semanaBloco;

function numeroDaFase(plano: Plano | undefined, semana: number | null): number | null {
  const fase = plano ? faseDaSemana(plano, semana) : null;
  return fase ? plano!.bloco!.fases.indexOf(fase) + 1 : null;
}

// Uma linha por série (aquecimento incluído e marcado), em ordem cronológica
export function linhasSeries(
  treinos: readonly Treino[],
  series: readonly SerieRealizada[],
  planos: readonly Plano[],
): Celula[][] {
  const porId = new Map(treinos.filter((t) => t.status !== 'descartado').map((t) => [t.id, t]));
  const planoPorId = new Map(planos.map((p) => [p.id, p]));
  const indice = indiceDeExercicios(planos);
  return series
    .filter((s) => porId.has(s.treinoId))
    .sort(
      (a, b) =>
        porId.get(a.treinoId)!.inicio.localeCompare(porId.get(b.treinoId)!.inicio) ||
        a.feitaEm.localeCompare(b.feitaEm),
    )
    .map((s) => {
      const t = porId.get(s.treinoId)!;
      const plano = planoPorId.get(t.planoId);
      return [
        t.data,
        t.sessaoNome,
        indice.get(s.exercicioPrescritoId)?.ex.nome ?? s.variante,
        s.variante,
        s.ordem,
        s.kg,
        s.reps,
        s.rir,
        s.aquecimento,
        t.semanaBloco,
        numeroDaFase(plano, semanaDoTreino(t)),
        plano?.nome ?? null,
      ];
    });
}

export function linhasCardio(cardio: readonly CardioRealizado[]): Celula[][] {
  return [...cardio]
    .sort((a, b) => a.data.localeCompare(b.data) || a.feitoEm.localeCompare(b.feitoEm))
    .map((c) => [c.data, c.tipo, c.minutos, c.fcMedia, c.distanciaKm, c.esforco]);
}

export async function csvSeries(db: RepzDb): Promise<string> {
  const [treinos, series, planos] = await Promise.all([
    db.treinos.toArray(),
    db.series.toArray(),
    db.planos.toArray(),
  ]);
  return montarCsv(CABECALHO_SERIES, linhasSeries(treinos, series, planos));
}

export async function csvCardio(db: RepzDb): Promise<string> {
  return montarCsv(CABECALHO_CARDIO, linhasCardio(await db.cardio.toArray()));
}
