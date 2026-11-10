// Descanso (BRIEFING 9.5): o tempo restante sai de `fimEm`, então fica certo depois de bloquear a tela.

import { formatarDecimal } from '../../../dominio/numeros';
import { rodada, totalSeries } from '../../../dominio/treino/biset';
import type { Etapa } from '../../../dominio/treino/maquina';
import { despachar, preenchimentoDoItem, type TreinoAtivo } from '../../../app/controlador-treino';
import { Botao, Etiqueta } from '../../componentes/basicos';
import { useRelogio } from '../../componentes/relogio';
import { mmss } from './formatos';

export function Descanso({ a, etapa }: { a: TreinoAtivo; etapa: Extract<Etapa, { tipo: 'descanso' }> }) {
  const agora = useRelogio(250);
  const restante = Math.max(0, Math.ceil((etapa.fimEm - agora) / 1000));
  const e = a.estado;
  const prox = etapa.proximo;
  const ex = a.itens[prox]!.ex;
  const pre = preenchimentoDoItem(a, prox);
  const porTempo = a.itens[prox]!.presc.porTempo;
  const grupo = e.itens[prox]?.grupo;
  const r = grupo != null ? rodada(e, prox) : null;
  const pct = etapa.duracao ? Math.min(100, (restante / etapa.duracao) * 100) : 0;

  return (
    <div class="descanso">
      <p class="cartao-titulo">Descanso</p>
      <div class="cronometro numero" role="timer" aria-label="Descanso restante">
        {mmss(restante)}
      </div>
      <div class="barra barra-descanso" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>

      <div class="cartao a-seguir">
        <p class="cartao-titulo">A seguir</p>
        <p class="a-seguir-nome">
          {grupo != null && <Etiqueta tipo="ss">SS{grupo}</Etiqueta>} {ex.nome}
        </p>
        <p class="muted numero">
          {r ? `Rodada ${r.atual} de ${r.total} · ` : ''}série {(e.feitas[prox] ?? 0) + 1} de{' '}
          {totalSeries(e, prox)}
          {pre.kg != null && (!porTempo || pre.kg > 0) && <> · {formatarDecimal(pre.kg)} kg</>}
          {` × ${pre.reps}${porTempo ? ' s' : ''}`}
        </p>
      </div>

      <p class="muted pequeno">Mantenha a tela ligada para ouvir o bipe e sentir a vibração no fim.</p>

      <div class="rodape-acao">
        <div class="descanso-acoes">
          <Botao
            variante="secundario"
            aria-label="−15 s: menos 15 segundos"
            onClick={() => void despachar({ tipo: 'AJUSTAR_DESCANSO', segundos: -15 })}
          >
            −15 s
          </Botao>
          <Botao aria-label="Pular descanso" onClick={() => void despachar({ tipo: 'PULAR_DESCANSO' })}>
            Pular
          </Botao>
          <Botao
            variante="secundario"
            aria-label="+15 s: mais 15 segundos"
            onClick={() => void despachar({ tipo: 'AJUSTAR_DESCANSO', segundos: 15 })}
          >
            +15 s
          </Botao>
        </div>
      </div>
    </div>
  );
}
