// Resumo simples ao encerrar (M3). Recordes e "Para o próximo treino" chegam no M4 (BRIEFING 9.6).

import { useState } from 'preact/hooks';
import { formatarDecimal } from '../../../dominio/numeros';
import { concluido } from '../../../dominio/treino/biset';
import { despachar, type TreinoAtivo } from '../../../app/controlador-treino';
import { Botao, Cartao } from '../../componentes/basicos';
import { duracaoTxt, seriesTxt } from './formatos';

export function Resumo({ a }: { a: TreinoAtivo }) {
  const [ocupado, setOcupado] = useState(false);
  const trabalho = a.series.filter((s) => !s.aquecimento);
  const porTempo = new Set(a.itens.filter((c) => c.presc.porTempo).map((c) => c.ex.id));
  const volume = trabalho
    .filter((s) => !porTempo.has(s.exercicioPrescritoId))
    .reduce((t, s) => t + s.kg * s.reps, 0);
  const pendentes = a.estado.itens.some((_, i) => !concluido(a.estado, i));
  const fim = Date.parse(a.treino.atualizadoEm);

  const fechar = async () => {
    setOcupado(true);
    await despachar({ tipo: 'FECHAR' });
  };

  return (
    <div class="resumo">
      <h1>Treino concluído</h1>
      <div class="kpis">
        <div class="kpi">
          <span class="kpi-valor numero">{duracaoTxt(fim - Date.parse(a.treino.inicio))}</span>
          <span class="kpi-rotulo">duração</span>
        </div>
        <div class="kpi">
          <span class="kpi-valor numero">{trabalho.length}</span>
          <span class="kpi-rotulo">séries</span>
        </div>
        <div class="kpi">
          <span class="kpi-valor numero">{formatarDecimal(Math.round(volume))} kg</span>
          <span class="kpi-rotulo">volume</span>
        </div>
      </div>

      <Cartao titulo={a.sessao.nome}>
        <ul class="lista-resumo">
          {a.itens.map((c) => {
            const s = trabalho.filter((x) => x.exercicioPrescritoId === c.ex.id);
            return (
              <li key={c.ex.id}>
                <span>{s[0]?.variante ?? c.ex.nome}</span>
                <span class="muted numero pequeno">
                  {s.length ? seriesTxt(s, c.presc.porTempo) : 'não feito'}
                </span>
              </li>
            );
          })}
        </ul>
      </Cartao>

      <div class="rodape-acao pilha">
        {pendentes && (
          <Botao bloco variante="secundario" onClick={() => void despachar({ tipo: 'RETOMAR' })}>
            Voltar ao treino
          </Botao>
        )}
        <Botao bloco disabled={ocupado} onClick={() => void fechar()}>
          Fechar
        </Botao>
      </div>
    </div>
  );
}
