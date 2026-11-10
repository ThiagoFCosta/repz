// Registro da série (BRIEFING 9.4), o núcleo do app. Meta: 2 toques quando a sugestão está certa
// (RIR + Concluir, D4): carga e reps chegam pré-preenchidas.

import { useState } from 'preact/hooks';
import { dataBR } from '../../../dominio/datas';
import { formatarDecimal, lerDecimal } from '../../../dominio/numeros';
import { concluido, membros, restantes, rodada, totalSeries } from '../../../dominio/treino/biset';
import type { DadosSerie } from '../../../dominio/treino/maquina';
import type { SerieRealizada } from '../../../dados/tipos';
import {
  despachar,
  preenchimentoDoItem,
  salvarNota,
  type TreinoAtivo,
} from '../../../app/controlador-treino';
import { Botao, Etiqueta } from '../../componentes/basicos';
import { Folha } from '../../componentes/Folha';
import { descansoTxt, faixaTxt } from '../plano/formatos';
import { ICONE_ACAO, rirTxt, seriesTxt } from './formatos';

const RIRS = [0, 1, 2, 3, 4];

const lerReps = (t: string) => (/^\d+$/.test(t.trim()) && +t > 0 ? +t : null);
const kgTxt = (kg: number | null) => (kg == null ? '' : formatarDecimal(kg));

function dadosValidos(kg: string, reps: string, rir: number | null): DadosSerie | null {
  const k = lerDecimal(kg);
  const r = lerReps(reps);
  return k == null || r == null ? null : { kg: k, reps: r, rir };
}

function BotoesRir({
  valor,
  aoMudar,
  rotulo,
}: {
  valor: number | null;
  aoMudar: (r: number | null) => void;
  rotulo: string;
}) {
  return (
    <div class="rir" role="group" aria-label={rotulo}>
      {RIRS.map((r) => (
        <button
          key={r}
          type="button"
          class="rir-botao numero"
          aria-pressed={valor === r}
          onClick={() => aoMudar(valor === r ? null : r)}
        >
          {rirTxt(r)}
        </button>
      ))}
    </div>
  );
}

function Passo({
  rotulo,
  valor,
  aoMudar,
  passo,
  passoTxt,
  modo,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  passo: number;
  passoTxt: string;
  modo: 'decimal' | 'numeric';
}) {
  const somar = (d: number) => {
    const atual = (modo === 'decimal' ? lerDecimal(valor) : lerReps(valor)) ?? 0;
    aoMudar(formatarDecimal(Math.max(0, Math.round((atual + d) * 100) / 100)));
  };
  return (
    <div class="passo-grande">
      <label class="rotulo" for={`campo-${rotulo}`}>
        {rotulo}
      </label>
      <div class="passo-linha">
        <button
          type="button"
          class="botao botao-secundario passo-botao"
          aria-label={`${rotulo} −${passoTxt}`}
          onClick={() => somar(-passo)}
        >
          −{passoTxt}
        </button>
        <input
          id={`campo-${rotulo}`}
          class="campo campo-grande numero"
          inputMode={modo}
          autoComplete="off"
          value={valor}
          onInput={(e) => aoMudar(e.currentTarget.value)}
        />
        <button
          type="button"
          class="botao botao-secundario passo-botao"
          aria-label={`${rotulo} +${passoTxt}`}
          onClick={() => somar(passo)}
        >
          +{passoTxt}
        </button>
      </div>
    </div>
  );
}

function LinhaSerie({ s, porTempo, n }: { s: SerieRealizada; porTempo: boolean; n: string }) {
  const [editando, setEditando] = useState(false);
  const [kg, setKg] = useState(kgTxt(s.kg));
  const [reps, setReps] = useState(String(s.reps));
  const [rir, setRir] = useState(s.rir);
  const dados = dadosValidos(kg, reps, rir);
  if (!editando)
    return (
      <li>
        <button
          type="button"
          class="serie-feita numero"
          aria-label={`Editar série ${n}`}
          onClick={() => setEditando(true)}
        >
          <span class="serie-n">{n}</span>
          <span>{formatarDecimal(s.kg)} kg</span>
          <span>
            {s.reps}
            {porTempo ? ' s' : ''}
          </span>
          <span>RIR {rirTxt(s.rir)}</span>
          <span class="serie-ok" aria-hidden="true">
            ✓
          </span>
        </button>
      </li>
    );
  const salvar = async () => {
    if (!dados) return;
    await despachar({ tipo: 'EDITAR_SERIE', id: s.id, dados });
    setEditando(false);
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
      <BotoesRir valor={rir} aoMudar={setRir} rotulo={`RIR da série ${n}`} />
      <div class="acoes-lado">
        <Botao variante="secundario" onClick={() => setEditando(false)}>
          Cancelar
        </Botao>
        <Botao disabled={!dados} onClick={() => void salvar()}>
          Salvar série {n}
        </Botao>
      </div>
    </li>
  );
}

type Menu = null | 'menu' | 'ir' | 'nota' | 'descartar';

function MenuAcoes({
  a,
  item,
  aoFechar,
  inicial,
  dadosAtuais,
}: {
  a: TreinoAtivo;
  item: number;
  aoFechar: () => void;
  inicial: Exclude<Menu, null>;
  dadosAtuais: DadosSerie | null;
}) {
  const [tela, setTela] = useState(inicial);
  const ex = a.itens[item]!.ex;
  const [nota, setNota] = useState(a.treino.notas[ex.id] ?? '');
  const e = a.estado;
  const acao = (f: () => Promise<void>) => async () => {
    aoFechar();
    await f();
  };

  if (tela === 'ir')
    return (
      <Folha titulo="Ir para exercício" aoFechar={aoFechar}>
        <ul class="lista-ir">
          {a.itens.map((c, j) => (
            <li key={c.ex.id}>
              <button
                type="button"
                class="item-ir"
                aria-current={j === item ? 'true' : undefined}
                onClick={acao(() => despachar({ tipo: 'IR_PARA', item: j }))}
              >
                <span>
                  {c.ex.grupo != null && <Etiqueta tipo="ss">SS{c.ex.grupo}</Etiqueta>} {c.ex.nome}
                </span>
                <span class="muted numero pequeno">
                  {e.pulados.includes(j) ? 'pulado' : `${e.feitas[j]}/${totalSeries(e, j)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Folha>
    );

  if (tela === 'nota')
    return (
      <Folha titulo={`Nota: ${ex.nome}`} aoFechar={aoFechar}>
        <label class="oculto-visual" for="nota-ex">
          Nota no exercício
        </label>
        <textarea
          id="nota-ex"
          class="campo"
          rows={3}
          value={nota}
          onInput={(ev) => setNota(ev.currentTarget.value)}
        />
        <div class="pilha">
          <Botao bloco onClick={acao(() => salvarNota(item, nota))}>
            Salvar nota
          </Botao>
        </div>
      </Folha>
    );

  if (tela === 'descartar')
    return (
      <Folha titulo="Descartar treino?" aoFechar={aoFechar}>
        <p>O treino sai do histórico e não conta para as sugestões. As séries ficam guardadas no aparelho.</p>
        <div class="pilha">
          <Botao bloco variante="perigo" onClick={acao(() => despachar({ tipo: 'DESCARTAR' }))}>
            Descartar treino
          </Botao>
          <Botao bloco variante="secundario" onClick={aoFechar}>
            Voltar
          </Botao>
        </div>
      </Folha>
    );

  return (
    <Folha titulo="Mais ações" aoFechar={aoFechar}>
      <ul class="lista-menu">
        <li>
          <button type="button" onClick={acao(() => despachar({ tipo: 'ADICIONAR_SERIE', item }))}>
            Adicionar série
          </button>
        </li>
        <li>
          <button
            type="button"
            disabled={!dadosAtuais || e.variante[item] == null}
            onClick={acao(() => despachar({ tipo: 'AQUECIMENTO', dados: dadosAtuais! }))}
          >
            Registrar como aquecimento
          </button>
        </li>
        <li>
          <button
            type="button"
            disabled={concluido(e, item)}
            onClick={acao(() => despachar({ tipo: 'PULAR_EXERCICIO', item }))}
          >
            Pular exercício
          </button>
        </li>
        <li>
          <button type="button" onClick={() => setTela('ir')}>
            Ir para outro exercício
          </button>
        </li>
        <li>
          <button type="button" onClick={() => setTela('nota')}>
            Nota no exercício
          </button>
        </li>
        <li>
          <button type="button" onClick={acao(() => despachar({ tipo: 'FINALIZAR' }))}>
            Encerrar treino
          </button>
        </li>
        <li>
          <button type="button" class="perigo" onClick={() => setTela('descartar')}>
            Descartar treino
          </button>
        </li>
      </ul>
    </Folha>
  );
}

function BiSet({ a, item }: { a: TreinoAtivo; item: number }) {
  const e = a.estado;
  const g = e.itens[item]?.grupo;
  if (g == null) return null;
  const r = rodada(e, item);
  return (
    <div class="biset">
      <div>
        <Etiqueta tipo="ss">SS{g}</Etiqueta>{' '}
        <strong class="numero">
          Rodada {r.atual} de {r.total}
        </strong>
      </div>
      <ol class="biset-membros">
        {membros(e, item).map((j) => (
          <li key={j} aria-current={j === item ? 'step' : undefined} class={concluido(e, j) ? 'muted' : ''}>
            {a.itens[j]!.ex.nome}
          </li>
        ))}
      </ol>
    </div>
  );
}

function FormSerie({
  a,
  item,
  kg0,
  reps0,
  porTempo,
  salto,
}: {
  a: TreinoAtivo;
  item: number;
  kg0: string;
  reps0: string;
  porTempo: boolean;
  salto: number;
}) {
  const e = a.estado;
  const [kg, setKg] = useState(kg0);
  const [reps, setReps] = useState(reps0);
  const [rir, setRir] = useState<number | null>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const semVariante = e.variante[item] == null;
  const dados = dadosValidos(kg, reps, rir);
  const n = (e.feitas[item] ?? 0) + 1;
  const extra = restantes(e, item) <= 0;
  return (
    <>
      <h2 class="serie-atual numero">
        Série {n}
        {!extra && <span class="muted"> de {totalSeries(e, item)}</span>}
        {extra && <span class="muted"> (extra)</span>}
      </h2>
      <div class="passos">
        <Passo
          rotulo="kg"
          valor={kg}
          aoMudar={setKg}
          passo={salto}
          passoTxt={formatarDecimal(salto)}
          modo="decimal"
        />
        <Passo
          rotulo={porTempo ? 'segundos' : 'reps'}
          valor={reps}
          aoMudar={setReps}
          passo={porTempo ? 5 : 1}
          passoTxt={porTempo ? '5' : '1'}
          modo="numeric"
        />
      </div>
      <div class="rotulo">RIR (repetições em reserva)</div>
      <BotoesRir valor={rir} aoMudar={setRir} rotulo="RIR" />

      <div class="rodape-acao">
        <div class="rodape-linha">
          <Botao
            variante="secundario"
            class="botao-mais"
            aria-label="Mais ações"
            onClick={() => setMenu('menu')}
          >
            ⋯
          </Botao>
          <Botao
            bloco
            disabled={!dados || semVariante}
            onClick={() => dados && void despachar({ tipo: 'CONCLUIR_SERIE', dados })}
          >
            {semVariante ? 'Escolha a variante' : `Concluir série ${n}`}
          </Botao>
        </div>
      </div>
      {menu && (
        <MenuAcoes a={a} item={item} inicial={menu} aoFechar={() => setMenu(null)} dadosAtuais={dados} />
      )}
    </>
  );
}

export function Registro({ a, item }: { a: TreinoAtivo; item: number }) {
  const ctx = a.itens[item]!;
  const { ex, presc } = ctx;
  const e = a.estado;
  const v = e.variante[item];
  const pre = preenchimentoDoItem(a, item);
  const ultimo = v == null ? undefined : ctx.historico[v]?.treinos.at(-1);
  const feitasAqui = a.series.filter((s) => s.exercicioPrescritoId === ex.id);
  const sug = pre.sugestao;
  const salto = ctx.incremento[v ?? 0] ?? 2.5;
  let nTrabalho = 0;

  return (
    <div class="registro">
      <BiSet a={a} item={item} />
      <h1 class="ex-titulo">{ex.nome}</h1>

      {ex.variantes.length > 1 && (
        <div class="chips" role="group" aria-label="Variante">
          {ex.variantes.map((nome, j) => (
            <button
              key={nome}
              type="button"
              class="chip"
              aria-pressed={v === j}
              onClick={() => void despachar({ tipo: 'ESCOLHER_VARIANTE', item, variante: j })}
            >
              {nome}
            </button>
          ))}
        </div>
      )}

      <dl class="meta">
        <div>
          <dt>Meta da semana</dt>
          <dd class="numero">
            {presc.series} × {faixaTxt(presc.reps)}
            {presc.porTempo ? ' s' : ''} · RIR {faixaTxt(presc.rir)} · {descansoTxt(presc.descanso)}
            {presc.fase?.deload && <> · deload</>}
          </dd>
        </div>
        <div>
          <dt>Última vez</dt>
          <dd class="numero">
            {v == null
              ? 'escolha a variante'
              : ultimo
                ? `${dataBR(ultimo.data, true)} · ${seriesTxt(ultimo.series, presc.porTempo)}`
                : 'primeira vez nesta variante'}
          </dd>
        </div>
        {v != null && (
          <div class={`sugestao sugestao-${sug.acao}`}>
            <dt>
              <span aria-hidden="true">{ICONE_ACAO[sug.acao]}</span> Sugestão
            </dt>
            <dd>{sug.motivo}</dd>
            {sug.alertas.map((al) => (
              <dd key={al} class="alerta">
                ! {al}
              </dd>
            ))}
          </div>
        )}
        {a.treino.notas[ex.id] && (
          <div>
            <dt>Nota</dt>
            <dd>{a.treino.notas[ex.id]}</dd>
          </div>
        )}
      </dl>

      {feitasAqui.length > 0 && (
        <ul class="series-feitas" aria-label="Séries feitas">
          {feitasAqui.map((s) => (
            <LinhaSerie
              key={`${s.id}-${s.kg}-${s.reps}-${s.rir}`}
              s={s}
              porTempo={presc.porTempo}
              n={s.aquecimento ? 'A' : String(++nTrabalho)}
            />
          ))}
        </ul>
      )}

      <FormSerie
        key={`${item}-${e.feitas[item]}-${v}-${feitasAqui.length}`}
        a={a}
        item={item}
        kg0={kgTxt(pre.kg)}
        reps0={String(pre.reps)}
        porTempo={presc.porTempo}
        salto={salto}
      />
    </div>
  );
}
