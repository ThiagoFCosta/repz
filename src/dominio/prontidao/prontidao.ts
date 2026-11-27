// Prontidão do dia (BRIEFING-v2 7.3): check-in pré-treino com sono e disposição. Não entra como fator na carga;
// só decide quais regras do motor disparam (V4, regras P1-P3).
// O limite de 6 h vem da definição de perda de sono da meta-análise de Craven et al. (2022) — referência craven2022.

import { diasEntre, type ISODate } from '../datas.ts';

export interface Checkin {
  data: ISODate;
  sonoHoras: number | null;
  disposicao: number | null; // 1-5, opcional
  pulado: boolean;
}

export interface ParametrosProntidao {
  sonoMinimoH: number; // abaixo disso, prontidão baixa
  sonoAbaixoMediaH: number; // abaixo da média de 14 dias menos isso, prontidão baixa
  disposicaoBaixa: number; // disposição até este valor, prontidão baixa
  janelaMediaDias: number;
}

export const PRONTIDAO_PADRAO: ParametrosProntidao = {
  sonoMinimoH: 6,
  sonoAbaixoMediaH: 1.5,
  disposicaoBaixa: 2,
  janelaMediaDias: 14,
};

export interface Prontidao {
  baixa: boolean;
  motivos: string[];
  sono: number | null;
  mediaSono: number | null;
}

const umaCasa = (x: number) => Math.round(x * 10) / 10;
const horas = (h: number) => `${String(umaCasa(h)).replace('.', ',')} h`;

// Média do sono nos `janela` dias anteriores a `hoje` (o próprio dia fica de fora); null sem nenhuma noite
export function mediaDeSono(
  checkins: readonly Checkin[],
  hoje: ISODate,
  janela = PRONTIDAO_PADRAO.janelaMediaDias,
): number | null {
  const noites = checkins.filter((c) => {
    const d = diasEntre(c.data, hoje);
    return !c.pulado && c.sonoHoras != null && d >= 1 && d <= janela;
  });
  if (!noites.length) return null;
  return umaCasa(noites.reduce((s, c) => s + c.sonoHoras!, 0) / noites.length);
}

// Valor inicial do stepper: a noite mais recente registrada; senão a média; senão 7 h
export function sonoSugerido(checkins: readonly Checkin[], hoje: ISODate): number {
  const anteriores = checkins
    .filter((c) => !c.pulado && c.sonoHoras != null && c.data < hoje)
    .sort((a, b) => b.data.localeCompare(a.data));
  const v = anteriores[0]?.sonoHoras ?? mediaDeSono(checkins, hoje) ?? 7;
  return Math.round(v * 2) / 2;
}

export function avaliarProntidao(
  hojeCheckin: Checkin | null,
  checkins: readonly Checkin[],
  hoje: ISODate,
  p: ParametrosProntidao = PRONTIDAO_PADRAO,
): Prontidao {
  const media = mediaDeSono(checkins, hoje, p.janelaMediaDias);
  const sono = hojeCheckin && !hojeCheckin.pulado ? hojeCheckin.sonoHoras : null;
  const motivos: string[] = [];
  if (sono != null && sono < p.sonoMinimoH)
    motivos.push(`Dormiu ${horas(sono)}, menos de ${horas(p.sonoMinimoH)}`);
  else if (sono != null && media != null && sono < media - p.sonoAbaixoMediaH)
    motivos.push(`Dormiu ${horas(sono)}, abaixo da sua média de ${horas(media)}`);
  const disp = hojeCheckin && !hojeCheckin.pulado ? hojeCheckin.disposicao : null;
  if (disp != null && disp <= p.disposicaoBaixa) motivos.push(`Disposição ${disp} de 5`);
  return { baixa: motivos.length > 0, motivos, sono, mediaSono: media };
}
