// Gráfico da tendência de peso (mockup, tela 4): pesagens do dia (pontos lime) e média de 7 dias (linha forest).
// SVG próprio, só com tokens (cores pelas classes em v2.css).

import { formatarDecimal } from '../../../dominio/numeros';
import type { ISODate } from '../../../dominio/datas';

const L = 320;
const A = 140;
const M = 8;

export function GraficoPeso({
  serie,
}: {
  serie: { data: ISODate; kg: number | null; media: number | null }[];
}) {
  const valores = serie.flatMap((p) => [p.kg, p.media]).filter((x): x is number => x != null);
  if (valores.length < 2) return <p className="muted pequeno">O gráfico aparece a partir de 2 pesagens.</p>;
  const min = Math.min(...valores) - 0.3;
  const max = Math.max(...valores) + 0.3;
  const x = (i: number) => M + (i * (L - 2 * M)) / (serie.length - 1);
  const y = (v: number) => M + ((max - v) * (A - 2 * M)) / (max - min);
  const linha = serie
    .map((p, i) => (p.media == null ? null : `${x(i).toFixed(1)},${y(p.media).toFixed(1)}`))
    .filter(Boolean)
    .join(' ');
  const ultima = [...serie].reverse().find((p) => p.media != null);
  return (
    <figure className="grafico-peso">
      <svg
        viewBox={`0 0 ${L} ${A}`}
        role="img"
        aria-label={`Peso nas últimas 4 semanas: de ${formatarDecimal(Math.min(...valores))} a ${formatarDecimal(Math.max(...valores))} kg${ultima ? `; média de 7 dias hoje ${formatarDecimal(ultima.media!)} kg` : ''}`}
      >
        <polyline className="grafico-peso-media" points={linha} fill="none" />
        {serie.map((p, i) =>
          p.kg == null ? null : (
            <circle key={p.data} className="grafico-peso-ponto" cx={x(i)} cy={y(p.kg)} r={3} />
          ),
        )}
      </svg>
      <figcaption className="grafico-peso-legenda pequeno">
        <span className="legenda-ponto" aria-hidden="true" /> pesagem diária
        <span className="legenda-linha" aria-hidden="true" /> média de 7 dias
      </figcaption>
    </figure>
  );
}
