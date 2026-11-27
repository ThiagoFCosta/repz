import { Link } from 'react-router';
// Aba Histórico (BRIEFING 9.8).
// /historico[/ex/<chave>] → exercício: seletor, KPIs, gráfico e treinos do exercício
// /historico/treinos → visão Treinos (força e cardio) · /historico/treino/<id> → treino completo
// /historico/cardio/<id> → editar ou excluir um cardio

import { useEffect, useState } from 'react';
import { dataBR } from '../../../dominio/datas';
import {
  melhorPorSemana,
  melhorSerie,
  variacao8Semanas,
  type TreinoDoExercicio,
} from '../../../dominio/historico';
import { formatarDecimal } from '../../../dominio/numeros';
import { semAcento } from '../../../dominio/formato/normalizar';
import type { ExercicioComHistorico, HistoricoExercicio } from '../../../dados/historico-repo';
import { cardios, configs, planoAtivo, planos } from '../../../app/estado';
import { carregarHistorico, listarExercicios } from '../../../app/historico';
import { navegar, rota } from '../../../app/roteador';
import { Cartao } from '../../componentes/basicos';
import { Folha } from '../../componentes/Folha';
import { TelaCardio } from '../cardio/TelaCardio';
import { rirTxt, seriesTxt } from '../treino/formatos';
import { DetalheTreino, VisaoTreinos } from './Treinos';
import { Grafico } from './Grafico';
import { Segmentos } from './Segmentos';

const busca = (t: string) => semAcento(t).toLowerCase().trim();

function Seletor({
  lista,
  atual,
  aoFechar,
}: {
  lista: ExercicioComHistorico[];
  atual: string;
  aoFechar: () => void;
}) {
  const [q, setQ] = useState('');
  const achados = lista.filter((e) => busca(e.nome).includes(busca(q)));
  const grupos = [
    { titulo: 'No plano ativo', itens: achados.filter((e) => e.noPlanoAtivo) },
    { titulo: 'Fora do plano ativo', itens: achados.filter((e) => !e.noPlanoAtivo) },
  ].filter((g) => g.itens.length);
  return (
    <Folha titulo="Escolher exercício" aoFechar={aoFechar}>
      <label className="oculto-visual" htmlFor="busca-exercicio">
        Buscar exercício
      </label>
      <input
        id="busca-exercicio"
        className="campo"
        type="search"
        placeholder="Buscar pelo nome"
        autoComplete="off"
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
      />
      {grupos.map((g) => (
        <section key={g.titulo}>
          <h3 className="secao">{g.titulo}</h3>
          <ul className="lista-menu">
            {g.itens.map((e) => (
              <li key={e.chave}>
                <button
                  type="button"
                  aria-current={e.chave === atual || undefined}
                  onClick={() => {
                    aoFechar();
                    navegar(`historico/ex/${encodeURIComponent(e.chave)}`);
                  }}
                >
                  {e.nome}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!achados.length && <p className="muted">Nenhum exercício com esse nome.</p>}
    </Folha>
  );
}

function Kpis({ h }: { h: HistoricoExercicio }) {
  const pontos = melhorPorSemana(h.treinos, h.porTempo);
  const v = variacao8Semanas(pontos);
  const m = melhorSerie(h.treinos, h.porTempo);
  const u = h.porTempo ? 's' : 'kg';
  const atual = pontos.at(-1);
  return (
    <div className="kpis kpis-2">
      <div className="kpi">
        <span className="kpi-valor numero">{atual ? `${formatarDecimal(atual.valor)} ${u}` : '–'}</span>
        <span className="kpi-rotulo">{h.porTempo ? 'melhor tempo atual' : '1RM estimado'}</span>
        {v && (
          <span className={`kpi-variacao numero ${v.delta > 0 ? 'sobe' : v.delta < 0 ? 'desce' : ''}`}>
            {v.delta > 0 ? '+' : v.delta < 0 ? '−' : '±'}
            {formatarDecimal(Math.abs(v.delta))} {u} ({formatarDecimal(Math.abs(v.pct))}%)
            {v.completa ? ' em 8 semanas' : ` desde ${dataBR(v.desde, true)}`}
          </span>
        )}
      </div>
      <div className="kpi">
        <span className="kpi-valor numero">
          {m ? (h.porTempo ? `${m.reps} s` : `${formatarDecimal(m.kg)} kg × ${m.reps}`) : '–'}
        </span>
        <span className="kpi-rotulo">melhor série</span>
        {m && (
          <span className="kpi-variacao numero">
            {dataBR(m.data, true)}
            {!h.porTempo && ` · RIR ${rirTxt(m.rir)}`}
          </span>
        )}
      </div>
    </div>
  );
}

function ListaTreinos({
  treinos,
  porTempo,
}: {
  treinos: (TreinoDoExercicio & { sessaoNome: string })[];
  porTempo: boolean;
}) {
  return (
    <ul className="lista-treinos" aria-label="Treinos do exercício">
      {[...treinos].reverse().map((t) => (
        <li key={t.treinoId}>
          <Link to={`/historico/treino/${t.treinoId}`}>
            <span className="lista-treinos-data numero">{dataBR(t.data, true)}</span>
            <span className="lista-treinos-corpo">
              <span className="numero">{seriesTxt(t.series, porTempo)}</span>
              <span className="muted pequeno">
                {t.sessaoNome}
                {t.deload && ' · deload'}
              </span>
            </span>
            <span className="lista-treinos-seta" aria-hidden="true">
              ›
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function VisaoExercicio({ chave }: { chave?: string }) {
  const [lista, setLista] = useState<ExercicioComHistorico[] | null>(null);
  const [h, setH] = useState<HistoricoExercicio | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  // a lista depende dos vínculos e do plano ativo; o histórico, também das edições (cardios muda junto)
  useEffect(() => {
    void listarExercicios().then(setLista);
  }, [configs.value, planoAtivo.value, planos.value]);
  // padrão: o exercício feito por último
  const atual =
    chave ??
    lista?.reduce<ExercicioComHistorico | null>((a, e) => (!a || e.ultimaEm > a.ultimaEm ? e : a), null)
      ?.chave;
  useEffect(() => {
    setH(null);
    if (atual) void carregarHistorico(atual).then(setH);
  }, [atual, configs.value, planos.value, cardios.value]);

  if (!lista) return null;
  const ex = lista.find((e) => e.chave === atual);
  return (
    <section>
      <h1>Histórico</h1>
      <Segmentos atual="ex" />
      {!lista.length ? (
        <Cartao>
          <p>Seus treinos aparecem aqui.</p>
          <p className="muted pequeno">Termine um treino para ver a evolução de cada exercício.</p>
        </Cartao>
      ) : (
        <>
          <button
            type="button"
            className="seletor"
            aria-haspopup="dialog"
            onClick={() => setEscolhendo(true)}
          >
            <span className="seletor-nome">{ex?.nome ?? 'Exercício sem histórico'}</span>
            <span className="seletor-acao">Trocar</span>
          </button>
          {h && (
            <>
              <Kpis h={h} />
              <h2 className="secao">{h.porTempo ? 'Melhor tempo por semana' : '1RM estimado por semana'}</h2>
              <Grafico
                pontos={melhorPorSemana(h.treinos, h.porTempo)}
                unidade={h.porTempo ? 's' : 'kg'}
                titulo={h.porTempo ? 'Melhor tempo por semana' : '1RM estimado por semana'}
              />
              <h2 className="secao">Treinos</h2>
              {h.treinos.length ? (
                <ListaTreinos treinos={h.treinos} porTempo={h.porTempo} />
              ) : (
                <p className="muted">Nenhum treino concluído com este exercício.</p>
              )}
            </>
          )}
        </>
      )}
      {escolhendo && lista && (
        <Seletor lista={lista} atual={atual ?? ''} aoFechar={() => setEscolhendo(false)} />
      )}
    </section>
  );
}

export function TelaHistorico() {
  const [sub, arg] = rota.value.caminho;
  if (sub === 'treinos') return <VisaoTreinos />;
  if (sub === 'treino' && arg) return <DetalheTreino id={arg} />;
  if (sub === 'cardio' && arg) return <TelaCardio id={arg} />;
  return <VisaoExercicio chave={sub === 'ex' ? arg : undefined} />;
}
