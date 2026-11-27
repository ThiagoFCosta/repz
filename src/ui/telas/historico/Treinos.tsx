import { Link } from 'react-router';
// Visão Treinos (BRIEFING 9.8): lista cronológica de treinos e cardio; treino completo com
// edição e exclusão de séries; exclusão do treino com confirmação.

import { useEffect, useState } from 'react';
import { avaliar, prescricaoDoRegistro } from '../../../dominio/cardio';
import { dataBR, diaDaSemana, NOMES_DIAS } from '../../../dominio/datas';
import { formatarDecimal, lerDecimal } from '../../../dominio/numeros';
import { volume } from '../../../dominio/treino/resumo';
import type { CardioRealizado, SerieRealizada, Treino } from '../../../dados/tipos';
import { cardios, configs, mostrarAviso, planoAtivo } from '../../../app/estado';
import {
  carregarTreino,
  editarSerie,
  excluirSerie,
  excluirTreino,
  listarTreinos,
  type TreinoCompleto,
} from '../../../app/historico';
import { navegar } from '../../../app/roteador';
import { Botao, Cabecalho, Cartao } from '../../componentes/basicos';
import { Folha } from '../../componentes/Folha';
import { COMPARACAO_TXT } from '../cardio/TelaCardio';
import { BotoesRir } from '../treino/Registro';
import { duracaoTxt, rirTxt } from '../treino/formatos';
import { Segmentos } from './Segmentos';

const diaTxt = (d: string) => `${NOMES_DIAS[diaDaSemana(d)]}, ${dataBR(d, true)}`;

type Item =
  { tipo: 'treino'; t: Treino; quando: string } | { tipo: 'cardio'; c: CardioRealizado; quando: string };

function LinhaCardio({ c }: { c: CardioRealizado }) {
  const presc = prescricaoDoRegistro(planoAtivo.value?.cardio ?? [], c);
  const a = presc ? avaliar(c, presc) : null;
  const detalhes = [
    `${c.minutos} min`,
    c.fcMedia != null && `FC ${c.fcMedia}`,
    c.distanciaKm != null && `${formatarDecimal(c.distanciaKm)} km`,
    c.esforco != null && `esforço ${c.esforco}`,
  ].filter(Boolean);
  return (
    <Link to={`/historico/cardio/${c.id}`}>
      <span className="lista-treinos-data numero">{dataBR(c.data, true)}</span>
      <span className="lista-treinos-corpo">
        <span>
          <span className="etiqueta etiqueta-cardio">Cardio</span> {c.tipo}
        </span>
        <span className="muted pequeno numero">
          {detalhes.join(' · ')}
          {a && (
            <span className={`comparacao-curta comparacao-${a.duracao}`}>
              {' '}
              · {a.duracao === 'dentro' ? '✓' : '!'} {COMPARACAO_TXT[a.duracao]}
            </span>
          )}
        </span>
      </span>
      <span className="lista-treinos-seta" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

export function VisaoTreinos() {
  const [treinos, setTreinos] = useState<Treino[] | null>(null);
  useEffect(() => {
    void listarTreinos().then(setTreinos);
  }, [configs.value]); // recarregar() troca configs: sinal de que algo foi gravado

  if (!treinos) return null;
  const itens: Item[] = [
    ...treinos.map((t): Item => ({ tipo: 'treino', t, quando: t.inicio })),
    ...cardios.value.map((c): Item => ({ tipo: 'cardio', c, quando: `${c.data}T${c.feitoEm.slice(11)}` })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <section>
      <h1>Histórico</h1>
      <Segmentos atual="treinos" />
      {itens.length ? (
        <ul className="lista-treinos" aria-label="Treinos e cardio">
          {itens.map((i) =>
            i.tipo === 'treino' ? (
              <li key={i.t.id}>
                <Link to={`/historico/treino/${i.t.id}`}>
                  <span className="lista-treinos-data numero">{dataBR(i.t.data, true)}</span>
                  <span className="lista-treinos-corpo">
                    <span>{i.t.sessaoNome}</span>
                    <span className="muted pequeno numero">
                      {i.t.inicio.slice(11, 16)}
                      {i.t.fim && ` · ${duracaoTxt(Date.parse(i.t.fim) - Date.parse(i.t.inicio))}`}
                    </span>
                  </span>
                  <span className="lista-treinos-seta" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ) : (
              <li key={i.c.id}>
                <LinhaCardio c={i.c} />
              </li>
            ),
          )}
        </ul>
      ) : (
        <Cartao>
          <p>Nenhum treino ou cardio registrado ainda.</p>
        </Cartao>
      )}
    </section>
  );
}

const lerReps = (t: string) => (/^\d+$/.test(t.trim()) && +t > 0 ? +t : null);

function LinhaSerie({
  s,
  n,
  porTempo,
  aoExcluir,
}: {
  s: SerieRealizada;
  n: string;
  porTempo: boolean;
  aoExcluir: (s: SerieRealizada) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [kg, setKg] = useState(formatarDecimal(s.kg));
  const [reps, setReps] = useState(String(s.reps));
  const [rir, setRir] = useState(s.rir);
  const [ocupado, setOcupado] = useState(false);
  const k = lerDecimal(kg);
  const r = lerReps(reps);
  const rotulo = s.aquecimento ? `aquecimento ${n}` : `série ${n}`;

  if (!editando)
    return (
      <li>
        <button
          type="button"
          className={`serie-feita numero${s.aquecimento ? ' serie-aquecimento' : ''}`}
          onClick={() => setEditando(true)}
        >
          {/* o nome acessível inclui o texto visível (WCAG 2.5.3) */}
          <span className="oculto-visual">Editar {s.aquecimento ? 'aquecimento' : 'série'} </span>
          <span className="serie-n">{n}</span>
          <span>{formatarDecimal(s.kg)} kg</span>
          <span>
            {s.reps}
            {porTempo ? ' s' : ''}
          </span>
          <span>{s.aquecimento ? 'aquec.' : `RIR ${rirTxt(s.rir)}`}</span>
          <span aria-hidden="true">✎</span>
        </button>
      </li>
    );

  const salvar = async () => {
    if (k == null || r == null) return;
    setOcupado(true);
    await editarSerie(s.id, { kg: k, reps: r, rir });
    mostrarAviso('Série salva');
    setEditando(false);
    setOcupado(false);
  };
  return (
    <li className="serie-edicao">
      <div className="serie-edicao-campos">
        <label>
          <span className="rotulo">kg</span>
          <input
            className="campo numero"
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.currentTarget.value)}
          />
        </label>
        <label>
          <span className="rotulo">{porTempo ? 'segundos' : 'reps'}</span>
          <input
            className="campo numero"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.currentTarget.value)}
          />
        </label>
      </div>
      {!s.aquecimento && <BotoesRir valor={rir} aoMudar={setRir} rotulo={`RIR da ${rotulo}`} />}
      <div className="acoes-lado">
        <Botao variante="secundario" onClick={() => setEditando(false)}>
          Cancelar
        </Botao>
        <Botao disabled={k == null || r == null || ocupado} onClick={() => void salvar()}>
          Salvar {rotulo}
        </Botao>
      </div>
      <Botao variante="texto" className="botao-excluir-serie" onClick={() => aoExcluir(s)}>
        Excluir {rotulo}
      </Botao>
    </li>
  );
}

type Confirmacao = null | { tipo: 'treino' } | { tipo: 'serie'; s: SerieRealizada };

export function DetalheTreino({ id }: { id: string }) {
  const [dados, setDados] = useState<TreinoCompleto | null | undefined>(undefined);
  const [confirmar, setConfirmar] = useState<Confirmacao>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    void carregarTreino(id).then(setDados);
  }, [id, configs.value]);

  if (dados === undefined) return null;
  if (!dados)
    return (
      <section>
        <Cabecalho titulo="Treino" voltar="/historico/treinos" />
        <Cartao>Este treino não existe mais.</Cartao>
      </section>
    );

  const { treino: t, series, porTempo } = dados;
  // grupos por exercício e variante, na ordem em que foram feitos
  const grupos = new Map<string, SerieRealizada[]>();
  for (const s of series) {
    const k = `${s.exercicioPrescritoId}|${s.chave}`;
    grupos.set(k, [...(grupos.get(k) ?? []), s]);
  }
  const trabalho = series.filter((s) => !s.aquecimento);
  const vol = volume(trabalho.map((s) => ({ ...s, porTempo: porTempo.has(s.exercicioPrescritoId) })));
  const nota = (exId: string) => t.notas[exId];

  const confirmarExclusao = async () => {
    if (!confirmar) return;
    setOcupado(true);
    try {
      if (confirmar.tipo === 'treino') {
        await excluirTreino(t.id);
        mostrarAviso('Treino excluído');
        navegar('historico/treinos');
      } else {
        await excluirSerie(confirmar.s.id);
        mostrarAviso('Série excluída');
      }
    } finally {
      setConfirmar(null);
      setOcupado(false);
    }
  };

  return (
    <section>
      <Cabecalho titulo={t.sessaoNome} voltar="/historico/treinos" />
      <p className="muted">
        {diaTxt(t.data)} · {t.inicio.slice(11, 16)}
        {t.semanaBloco != null && ` · semana ${t.semanaBloco}`}
      </p>
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-valor numero">
            {t.fim ? duracaoTxt(Date.parse(t.fim) - Date.parse(t.inicio)) : '–'}
          </span>
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
      <p className="muted pequeno">
        Toque numa série para corrigir. A correção vale para o gráfico e as próximas sugestões.
      </p>

      {[...grupos.entries()].map(([k, ss]) => {
        let nAq = 0;
        let nTr = 0;
        const exId = ss[0]!.exercicioPrescritoId;
        return (
          <section key={k} className="cartao" aria-label={ss[0]!.variante}>
            <h2 className="cartao-titulo">{ss[0]!.variante}</h2>
            {nota(exId) && <p className="pequeno">Nota: {nota(exId)}</p>}
            <ul className="series-feitas">
              {ss.map((s) => (
                <LinhaSerie
                  key={`${s.id}-${s.kg}-${s.reps}-${s.rir}`}
                  s={s}
                  n={s.aquecimento ? `A${++nAq}` : String(++nTr)}
                  porTempo={porTempo.has(exId)}
                  aoExcluir={(x) => setConfirmar({ tipo: 'serie', s: x })}
                />
              ))}
            </ul>
          </section>
        );
      })}
      {!series.length && <p className="muted">Este treino ficou sem séries.</p>}

      <div className="pilha">
        <Botao bloco variante="perigo" onClick={() => setConfirmar({ tipo: 'treino' })}>
          Excluir treino
        </Botao>
      </div>

      {confirmar && (
        <Folha
          titulo={confirmar.tipo === 'treino' ? 'Excluir treino?' : 'Excluir série?'}
          aoFechar={() => setConfirmar(null)}
        >
          <p>
            {confirmar.tipo === 'treino'
              ? `${t.sessaoNome} de ${dataBR(t.data)} e as ${series.length} séries dele. Não dá para desfazer.`
              : `${confirmar.s.variante}: ${formatarDecimal(confirmar.s.kg)} kg × ${confirmar.s.reps}. Não dá para desfazer.`}
          </p>
          <div className="acoes-lado">
            <Botao variante="secundario" onClick={() => setConfirmar(null)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" disabled={ocupado} onClick={() => void confirmarExclusao()}>
              {confirmar.tipo === 'treino' ? 'Excluir treino' : 'Excluir série'}
            </Botao>
          </div>
        </Folha>
      )}
    </section>
  );
}
