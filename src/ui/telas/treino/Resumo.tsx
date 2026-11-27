// Fim do treino (BRIEFING 9.6): duração, séries, volume, recordes e "Para o próximo treino" (7.6).

import { useState } from 'react';
import { formatarDecimal } from '../../../dominio/numeros';
import { concluido } from '../../../dominio/treino/biset';
import { tipoCartao, volume, type Recorde } from '../../../dominio/treino/resumo';
import {
  cartoesDoFim,
  despachar,
  type CartaoProximo,
  type TreinoAtivo,
} from '../../../app/controlador-treino';
import { navegar } from '../../../app/roteador';
import { atualizacaoDisponivel } from '../../../app/pwa';
import { Botao } from '../../componentes/basicos';
import { duracaoTxt, ICONE_CARTAO, seriesTxt } from './formatos';

function recordeTxt(r: Recorde): string {
  if (r.tipo === 'tempo') return `Recorde: ${r.valor} s (antes ${r.anterior} s)`;
  const serie = `${formatarDecimal(r.serie.kg)} × ${r.serie.reps}`;
  return r.tipo === 'e1rm'
    ? `Recorde: 1RM estimado ${formatarDecimal(r.valor)} kg (${serie})`
    : `Recorde de carga: ${serie} (antes ${formatarDecimal(r.anterior)} kg)`;
}

function CartaoSugestao({ a, c }: { a: TreinoAtivo; c: CartaoProximo }) {
  const ctx = a.itens[c.item]!;
  const tipo = tipoCartao(c.sugestao);
  const nome = ctx.ex.variantes[c.variante]!;
  return (
    <li className={`proximo proximo-${tipo}`} aria-label={nome}>
      <span className="proximo-icone" aria-hidden="true">
        {ICONE_CARTAO[tipo]}
      </span>
      <div className="proximo-corpo">
        <div className="proximo-nome">{nome}</div>
        <div className="muted numero pequeno">{seriesTxt(c.series, ctx.presc.porTempo)}</div>
        <div className="proximo-motivo">{c.sugestao.motivo}</div>
        {c.sugestao.alertas.map((al) => (
          <div key={al} className="proximo-aviso pequeno">
            ! {al}
          </div>
        ))}
      </div>
    </li>
  );
}

export function Resumo({ a }: { a: TreinoAtivo }) {
  const [ocupado, setOcupado] = useState(false);
  const porTempo = new Set(a.itens.filter((c) => c.presc.porTempo).map((c) => c.ex.id));
  const trabalho = a.series.filter((s) => !s.aquecimento);
  const vol = volume(trabalho.map((s) => ({ ...s, porTempo: porTempo.has(s.exercicioPrescritoId) })));
  const pendentes = a.estado.itens.some((_, i) => !concluido(a.estado, i));
  const fim = Date.parse(a.treino.atualizadoEm);
  const cartoes = cartoesDoFim(a);
  const recordes = cartoes.filter((c) => c.recorde);
  const naoFeitos = a.itens.filter((c) => !trabalho.some((s) => s.exercicioPrescritoId === c.ex.id));

  // Fechar conclui o treino; Cardio conclui e abre o registro de cardio
  const fechar = async (depois?: string) => {
    setOcupado(true);
    await despachar({ tipo: 'FECHAR' });
    if (depois) navegar(depois);
  };

  return (
    <div className="resumo">
      <h1>Treino concluído</h1>
      {/* A atualização espera o fim do treino (BRIEFING 11): o banner aparece no Início */}
      {atualizacaoDisponivel.value && (
        <p className="aviso-atualizacao pequeno" role="status">
          Atualização disponível. Ela fica no Início depois que você fechar o treino.
        </p>
      )}
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-valor numero">{duracaoTxt(fim - Date.parse(a.treino.inicio))}</span>
          <span className="kpi-rotulo">duração</span>
        </div>
        <div className="kpi">
          <span className="kpi-valor numero">{trabalho.length}</span>
          <span className="kpi-rotulo">séries</span>
        </div>
        <div className="kpi">
          <span className="kpi-valor numero">{formatarDecimal(Math.round(vol))} kg</span>
          <span className="kpi-rotulo">volume</span>
        </div>
      </div>

      {recordes.length > 0 && (
        <section className="cartao recordes" aria-labelledby="titulo-recordes">
          <h2 id="titulo-recordes" className="cartao-titulo">
            Recordes
          </h2>
          <ul className="lista-resumo">
            {recordes.map((c) => (
              <li key={`${c.item}-${c.variante}`}>
                <span>{a.itens[c.item]!.ex.variantes[c.variante]}</span>
                <span className="recorde numero pequeno">{recordeTxt(c.recorde!)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-proximo">
        <h2 id="titulo-proximo" className="secao">
          Para o próximo treino
        </h2>
        {cartoes.length ? (
          <ul className="lista-proximo" aria-label="Para o próximo treino">
            {cartoes.map((c) => (
              <CartaoSugestao key={`${c.item}-${c.variante}`} a={a} c={c} />
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhuma série registrada.</p>
        )}
        {naoFeitos.length > 0 && (
          <p className="muted pequeno">Não feitos: {naoFeitos.map((c) => c.ex.nome).join(', ')}.</p>
        )}
      </section>

      <div className="rodape-acao pilha">
        {pendentes && (
          <Botao bloco variante="secundario" onClick={() => void despachar({ tipo: 'RETOMAR' })}>
            Voltar ao treino
          </Botao>
        )}
        <div className="acoes-lado">
          <Botao variante="secundario" disabled={ocupado} onClick={() => void fechar('treino/cardio')}>
            Cardio
          </Botao>
          <Botao disabled={ocupado} onClick={() => void fechar()}>
            Fechar
          </Botao>
        </div>
      </div>
    </div>
  );
}
