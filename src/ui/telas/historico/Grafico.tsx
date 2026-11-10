// Gráfico de linha em SVG próprio (BRIEFING 9.8): melhor e1RM (ou duração) por semana, com as
// semanas de deload marcadas por uma faixa e um ponto vazado. Tocar num ponto mostra o valor.

import { useState } from 'preact/hooks';
import { dataBR, diasEntre } from '../../../dominio/datas';
import type { PontoSemana } from '../../../dominio/historico';
import { formatarDecimal } from '../../../dominio/numeros';

const L = 340;
const A = 180;
const M = { esq: 40, dir: 12, topo: 12, base: 24 };

// Três marcas "redondas" no eixo y que cobrem o intervalo
function marcas(min: number, max: number): number[] {
  const passo = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].find((p) => (max - min) / p <= 3) ?? 200;
  const ini = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const r: number[] = [];
  for (let v = ini; v <= fim + 1e-9; v += passo) r.push(v);
  return r;
}

export function Grafico({
  pontos,
  unidade,
  titulo,
}: {
  pontos: PontoSemana[];
  unidade: string;
  titulo: string;
}) {
  const [sel, setSel] = useState<number | null>(null);
  if (!pontos.length) return null;

  const valores = pontos.map((p) => p.valor);
  const lo = Math.min(...valores);
  const hi = Math.max(...valores);
  // valor único: o ponto fica no meio
  const ys = lo === hi ? marcas(lo - 1, hi + 1) : marcas(lo, hi);
  const yMin = ys[0]!;
  const yMax = ys.at(-1)!;
  const dias = diasEntre(pontos[0]!.semana, pontos.at(-1)!.semana);
  const largura = L - M.esq - M.dir;
  const x = (p: PontoSemana) =>
    dias ? M.esq + (diasEntre(pontos[0]!.semana, p.semana) / dias) * largura : M.esq + largura / 2;
  const y = (v: number) => M.topo + (1 - (v - yMin) / (yMax - yMin)) * (A - M.topo - M.base);
  const semanaPx = dias ? Math.max((7 / dias) * largura, 8) : 24;
  const deloads = pontos.filter((p) => p.deload).length;
  const fmt = (v: number) => `${formatarDecimal(v)} ${unidade}`;
  const resumo =
    `${titulo}: ${pontos.length} ${pontos.length === 1 ? 'semana' : 'semanas'}, ` +
    `de ${fmt(pontos[0]!.valor)} em ${dataBR(pontos[0]!.semana, true)} ` +
    `a ${fmt(pontos.at(-1)!.valor)} em ${dataBR(pontos.at(-1)!.semana, true)}` +
    (deloads ? `; ${deloads} ${deloads === 1 ? 'semana' : 'semanas'} de deload` : '');
  const p = sel == null ? null : pontos[sel];

  return (
    <figure class="grafico">
      <p class="grafico-leitura numero" aria-live="polite">
        {p ? (
          <>
            Semana de {dataBR(p.semana, true)}: <strong>{fmt(p.valor)}</strong>
            {p.deload && <span class="grafico-deload-txt"> · deload</span>}
          </>
        ) : (
          <span class="muted">Toque num ponto para ver o valor</span>
        )}
      </p>
      <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label={resumo}>
        {pontos.map(
          (q) =>
            q.deload && (
              <rect
                key={`d${q.semana}`}
                class="grafico-faixa-deload"
                x={x(q) - semanaPx / 2}
                y={M.topo}
                width={semanaPx}
                height={A - M.topo - M.base}
              />
            ),
        )}
        {ys.map((v) => (
          <g key={v}>
            <line class="grafico-grade" x1={M.esq} x2={L - M.dir} y1={y(v)} y2={y(v)} />
            <text class="grafico-eixo" x={M.esq - 6} y={y(v) + 4} text-anchor="end">
              {formatarDecimal(v)}
            </text>
          </g>
        ))}
        <text class="grafico-eixo" x={M.esq} y={A - 6} text-anchor="start">
          {dataBR(pontos[0]!.semana, true)}
        </text>
        {pontos.length > 1 && (
          <text class="grafico-eixo" x={L - M.dir} y={A - 6} text-anchor="end">
            {dataBR(pontos.at(-1)!.semana, true)}
          </text>
        )}
        <polyline class="grafico-linha" points={pontos.map((q) => `${x(q)},${y(q.valor)}`).join(' ')} />
        {pontos.map((q, i) => (
          <g key={q.semana} class="grafico-alvo" onClick={() => setSel(sel === i ? null : i)}>
            {/* alvo de toque maior que o ponto */}
            <circle cx={x(q)} cy={y(q.valor)} r={14} fill="transparent" />
            <circle
              class={`grafico-ponto${q.deload ? ' grafico-ponto-deload' : ''}${sel === i ? ' grafico-ponto-sel' : ''}`}
              cx={x(q)}
              cy={y(q.valor)}
              r={sel === i ? 6 : 4.5}
            />
          </g>
        ))}
      </svg>
      {deloads > 0 && (
        <figcaption class="grafico-legenda pequeno">
          <span class="grafico-legenda-deload" aria-hidden="true" /> semana de deload
        </figcaption>
      )}
    </figure>
  );
}
