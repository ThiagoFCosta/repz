// Registro da série (BRIEFING 9.4), o núcleo do app. Meta: 2 toques quando a sugestão está certa
// (RIR + Concluir, D4): carga e reps chegam pré-preenchidas.

import { useEffect, useState } from 'react';
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

export function BotoesRir({
  valor,
  aoMudar,
  rotulo,
}: {
  valor: number | null;
  aoMudar: (r: number | null) => void;
  rotulo: string;
}) {
  return (
    <div className="rir" role="group" aria-label={rotulo}>
      {RIRS.map((r) => (
        <button
          key={r}
          type="button"
          className="rir-botao numero"
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
    <div className="passo-grande">
      <label className="rotulo" htmlFor={`campo-${rotulo}`}>
        {rotulo}
      </label>
      <div className="passo-linha">
        <button
          type="button"
          className="botao botao-secundario passo-botao"
          aria-label={`${rotulo} −${passoTxt}`}
          onClick={() => somar(-passo)}
        >
          −{passoTxt}
        </button>
        <input
          id={`campo-${rotulo}`}
          className="campo campo-grande numero"
          inputMode={modo}
          autoComplete="off"
          value={valor}
          onChange={(e) => aoMudar(e.currentTarget.value)}
        />
        <button
          type="button"
          className="botao botao-secundario passo-botao"
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
        <button type="button" className="serie-feita numero" onClick={() => setEditando(true)}>
          {/* o nome acessível inclui o texto visível (WCAG 2.5.3) */}
          <span className="oculto-visual">Editar série </span>
          <span className="serie-n">{n}</span>
          <span>{formatarDecimal(s.kg)} kg</span>
          <span>
            {s.reps}
            {porTempo ? ' s' : ''}
          </span>
          <span>RIR {rirTxt(s.rir)}</span>
          <span className="serie-ok" aria-hidden="true">
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
      <BotoesRir valor={rir} aoMudar={setRir} rotulo={`RIR da série ${n}`} />
      <div className="acoes-lado">
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
        <ul className="lista-ir">
          {a.itens.map((c, j) => (
            <li key={c.ex.id}>
              <button
                type="button"
                className="item-ir"
                aria-current={j === item ? 'true' : undefined}
                onClick={acao(() => despachar({ tipo: 'IR_PARA', item: j }))}
              >
                <span>
                  {c.ex.grupo != null && <Etiqueta tipo="ss">SS{c.ex.grupo}</Etiqueta>} {c.ex.nome}
                </span>
                <span className="muted numero pequeno">
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
        <label className="oculto-visual" htmlFor="nota-ex">
          Nota no exercício
        </label>
        <textarea
          id="nota-ex"
          className="campo"
          rows={3}
          value={nota}
          onChange={(ev) => setNota(ev.currentTarget.value)}
        />
        <div className="pilha">
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
        <div className="pilha">
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
      <ul className="lista-menu">
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
          <button type="button" className="perigo" onClick={() => setTela('descartar')}>
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
    <div className="biset">
      <div>
        <Etiqueta tipo="ss">SS{g}</Etiqueta>{' '}
        <strong className="numero">
          Rodada {r.atual} de {r.total}
        </strong>
      </div>
      <ol className="biset-membros">
        {membros(e, item).map((j) => (
          <li
            key={j}
            aria-current={j === item ? 'step' : undefined}
            className={concluido(e, j) ? 'muted' : ''}
          >
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
  // Trocar a variante muda a sugestão; o que o usuário já digitou fica
  const [mexeuKg, setMexeuKg] = useState(false);
  const [mexeuReps, setMexeuReps] = useState(false);
  useEffect(() => {
    if (!mexeuKg) setKg(kg0);
    if (!mexeuReps) setReps(reps0);
  }, [kg0, reps0]);
  const semVariante = e.variante[item] == null;
  const dados = dadosValidos(kg, reps, rir);
  const n = (e.feitas[item] ?? 0) + 1;
  const extra = restantes(e, item) <= 0;
  return (
    <>
      <h2 className="serie-atual numero">
        Série {n}
        {!extra && <span className="muted"> de {totalSeries(e, item)}</span>}
        {extra && <span className="muted"> (extra)</span>}
      </h2>
      <div className="passos">
        <Passo
          rotulo="kg"
          valor={kg}
          aoMudar={(x) => {
            setMexeuKg(true);
            setKg(x);
          }}
          passo={salto}
          passoTxt={formatarDecimal(salto)}
          modo="decimal"
        />
        <Passo
          rotulo={porTempo ? 'segundos' : 'reps'}
          valor={reps}
          aoMudar={(x) => {
            setMexeuReps(true);
            setReps(x);
          }}
          passo={porTempo ? 5 : 1}
          passoTxt={porTempo ? '5' : '1'}
          modo="numeric"
        />
      </div>
      <div className="rotulo">RIR (repetições em reserva)</div>
      <BotoesRir valor={rir} aoMudar={setRir} rotulo="RIR" />

      <div className="rodape-acao">
        <div className="rodape-linha">
          <Botao
            variante="secundario"
            className="botao-mais"
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
    <div className="registro">
      <BiSet a={a} item={item} />
      <h1 className="ex-titulo">{ex.nome}</h1>

      {ex.variantes.length > 1 && (
        <div className="chips" role="group" aria-label="Variante">
          {ex.variantes.map((nome, j) => (
            <button
              key={nome}
              type="button"
              className="chip"
              aria-pressed={v === j}
              onClick={() => void despachar({ tipo: 'ESCOLHER_VARIANTE', item, variante: j })}
            >
              {nome}
            </button>
          ))}
        </div>
      )}

      <dl className="meta">
        <div>
          <dt>Meta da semana</dt>
          <dd className="numero">
            {presc.series} × {faixaTxt(presc.reps)}
            {presc.porTempo ? ' s' : ''} · RIR {faixaTxt(presc.rir)} · {descansoTxt(presc.descanso)}
            {presc.fase?.deload && <> · deload</>}
          </dd>
        </div>
        <div>
          <dt>Última vez</dt>
          <dd className="numero">
            {v == null
              ? 'escolha a variante'
              : ultimo
                ? `${dataBR(ultimo.data, true)} · ${seriesTxt(ultimo.series, presc.porTempo)}`
                : 'primeira vez nesta variante'}
          </dd>
        </div>
        {v != null && (
          <div className={`sugestao sugestao-${sug.acao}`}>
            <dt>
              <span aria-hidden="true">{ICONE_ACAO[sug.acao]}</span> Sugestão
            </dt>
            <dd>{sug.motivo}</dd>
            {sug.alertas.map((al) => (
              <dd key={al} className="alerta">
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
        <ul className="series-feitas" aria-label="Séries feitas">
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
        key={`${item}-${e.feitas[item]}-${feitasAqui.length}`}
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
