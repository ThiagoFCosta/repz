// Visão Treinos (BRIEFING 9.8): lista cronológica de treinos e cardio; treino completo com
// edição e exclusão de séries; exclusão do treino com confirmação.

import { useEffect, useState } from 'preact/hooks';
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
    <a href={`#/historico/cardio/${c.id}`}>
      <span class="lista-treinos-data numero">{dataBR(c.data, true)}</span>
      <span class="lista-treinos-corpo">
        <span>
          <span class="etiqueta etiqueta-cardio">Cardio</span> {c.tipo}
        </span>
        <span class="muted pequeno numero">
          {detalhes.join(' · ')}
          {a && (
            <span class={`comparacao-curta comparacao-${a.duracao}`}>
              {' '}
              · {a.duracao === 'dentro' ? '✓' : '!'} {COMPARACAO_TXT[a.duracao]}
            </span>
          )}
        </span>
      </span>
      <span class="lista-treinos-seta" aria-hidden="true">
        ›
      </span>
    </a>
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
        <ul class="lista-treinos" aria-label="Treinos e cardio">
          {itens.map((i) =>
            i.tipo === 'treino' ? (
              <li key={i.t.id}>
                <a href={`#/historico/treino/${i.t.id}`}>
                  <span class="lista-treinos-data numero">{dataBR(i.t.data, true)}</span>
                  <span class="lista-treinos-corpo">
                    <span>{i.t.sessaoNome}</span>
                    <span class="muted pequeno numero">
                      {i.t.inicio.slice(11, 16)}
                      {i.t.fim && ` · ${duracaoTxt(Date.parse(i.t.fim) - Date.parse(i.t.inicio))}`}
                    </span>
                  </span>
                  <span class="lista-treinos-seta" aria-hidden="true">
                    ›
                  </span>
                </a>
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
          class={`serie-feita numero${s.aquecimento ? ' serie-aquecimento' : ''}`}
          aria-label={`Editar ${rotulo}`}
          onClick={() => setEditando(true)}
        >
          <span class="serie-n">{n}</span>
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
    <li class="serie-edicao">
      <div class="serie-edicao-campos">
        <label>
          <span class="rotulo">kg</span>
          <input
            class="campo numero"
            inputMode="decimal"
            value={kg}
            onInput={(e) => setKg(e.currentTarget.value)}
          />
        </label>
        <label>
          <span class="rotulo">{porTempo ? 'segundos' : 'reps'}</span>
          <input
            class="campo numero"
            inputMode="numeric"
            value={reps}
            onInput={(e) => setReps(e.currentTarget.value)}
          />
        </label>
      </div>
      {!s.aquecimento && <BotoesRir valor={rir} aoMudar={setRir} rotulo={`RIR da ${rotulo}`} />}
      <div class="acoes-lado">
        <Botao variante="secundario" onClick={() => setEditando(false)}>
          Cancelar
        </Botao>
        <Botao disabled={k == null || r == null || ocupado} onClick={() => void salvar()}>
          Salvar {rotulo}
        </Botao>
      </div>
      <Botao variante="texto" class="botao-excluir-serie" onClick={() => aoExcluir(s)}>
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
        <Cabecalho titulo="Treino" voltar="#/historico/treinos" />
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
      <Cabecalho titulo={t.sessaoNome} voltar="#/historico/treinos" />
      <p class="muted">
        {diaTxt(t.data)} · {t.inicio.slice(11, 16)}
        {t.semanaBloco != null && ` · semana ${t.semanaBloco}`}
      </p>
      <div class="kpis">
        <div class="kpi">
          <span class="kpi-valor numero">
            {t.fim ? duracaoTxt(Date.parse(t.fim) - Date.parse(t.inicio)) : '–'}
          </span>
          <span class="kpi-rotulo">duração</span>
        </div>
        <div class="kpi">
          <span class="kpi-valor numero">{trabalho.length}</span>
          <span class="kpi-rotulo">séries</span>
        </div>
        <div class="kpi">
          <span class="kpi-valor numero">{formatarDecimal(Math.round(vol))} kg</span>
          <span class="kpi-rotulo">volume</span>
        </div>
      </div>
      <p class="muted pequeno">
        Toque numa série para corrigir. A correção vale para o gráfico e as próximas sugestões.
      </p>

      {[...grupos.entries()].map(([k, ss]) => {
        let nAq = 0;
        let nTr = 0;
        const exId = ss[0]!.exercicioPrescritoId;
        return (
          <section key={k} class="cartao" aria-label={ss[0]!.variante}>
            <h2 class="cartao-titulo">{ss[0]!.variante}</h2>
            {nota(exId) && <p class="pequeno">Nota: {nota(exId)}</p>}
            <ul class="series-feitas">
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
      {!series.length && <p class="muted">Este treino ficou sem séries.</p>}

      <div class="pilha">
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
          <div class="acoes-lado">
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
