// Tela Revisar plano (BRIEFING 9.2): conferir sessões, definir início do bloco, vincular exercícios e salvar.

import { useMemo, useState } from 'react';
import { NOMES_DIAS, proximaSegunda } from '../../../dominio/datas';
import { candidatosVinculo } from '../../../dominio/similaridade';
import type { ExercicioImportado } from '../../../dominio/tipos';
import { canonica, chavesEquivalentes } from '../../../dados/repos/config';
import { chavesHistorico, configs, hoje, treinoAberto } from '../../../app/estado';
import { importacao, salvarRevisao } from '../../../app/importacao';
import { navegar } from '../../../app/roteador';
import { Botao, Cabecalho, Cartao, Etiqueta } from '../../componentes/basicos';
import { seriesReps } from './formatos';

function temHistorico(chave: string): boolean {
  const eq = chavesEquivalentes(configs.value, chave, chavesHistorico.value.keys());
  return eq.some((k) => chavesHistorico.value.has(k));
}

function LinhaExercicio({
  ex,
  vinculos,
  vincular,
}: {
  ex: ExercicioImportado;
  vinculos: Record<string, string>;
  vincular: (chave: string, alvo: string | null) => void;
}) {
  return (
    <li className="ex-revisao">
      <div className="ex-revisao-topo">
        <span className="ex-nome">
          {ex.grupo != null && <Etiqueta tipo="ss">SS{ex.grupo}</Etiqueta>} {ex.nome}
        </span>
        <span className="ex-series numero">{seriesReps(ex.series, ex.reps, ex.porTempo)}</span>
      </div>
      <ul className="ex-variantes">
        {ex.variantes.map((v, i) => {
          const chave = ex.chaves[i]!;
          const historico = temHistorico(chave);
          const vinculado = vinculos[chave];
          const candidatos = historico
            ? []
            : candidatosVinculo(
                chave,
                new Set([...chavesHistorico.value.keys()].map((k) => canonica(configs.value, k))),
              );
          return (
            <li key={chave}>
              {ex.variantes.length > 1 && <Etiqueta tipo="variante">{v}</Etiqueta>}{' '}
              {historico ? (
                <Etiqueta tipo="historico">com histórico</Etiqueta>
              ) : vinculado ? (
                <Etiqueta tipo="historico">vinculado</Etiqueta>
              ) : (
                // no primeiro plano tudo é novo: a etiqueta só ajuda quando já existe histórico
                chavesHistorico.value.size > 0 && <Etiqueta tipo="novo">novo</Etiqueta>
              )}
              {candidatos.length > 0 && (
                <label className="vinculo">
                  <span>Mesmo exercício que:</span>
                  <select
                    value={vinculado ?? ''}
                    onChange={(e) => vincular(chave, e.currentTarget.value || null)}
                  >
                    <option value="">— é um exercício novo —</option>
                    {candidatos.map((c) => (
                      <option key={c.chave} value={c.chave}>
                        {chavesHistorico.value.get(c.chave) ?? c.chave}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export function TelaRevisar() {
  const plano = importacao.value?.resultado?.plano;
  const [inicio, setInicio] = useState(() => proximaSegunda(hoje.value));
  const [vinculos, setVinculos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const nEx = useMemo(() => plano?.sessoes.reduce((a, s) => a + s.itens.length, 0) ?? 0, [plano]);

  if (!plano) {
    return (
      <section>
        <Cabecalho titulo="Revisar plano" voltar="/plano/importar" />
        <Cartao>
          <p>Nenhum plano lido para revisar.</p>
          <Botao onClick={() => navegar('plano/importar')}>Importar plano</Botao>
        </Cartao>
      </section>
    );
  }

  const vincular = (chave: string, alvo: string | null) =>
    setVinculos((v) => {
      const novo = { ...v };
      if (alvo) novo[chave] = alvo;
      else delete novo[chave];
      return novo;
    });

  const salvar = async () => {
    setSalvando(true);
    setErro(await salvarRevisao(plano.bloco ? inicio : null, vinculos));
    setSalvando(false);
    if (!importacao.value) navegar('plano');
  };

  return (
    <section>
      <Cabecalho titulo="Revisar plano" voltar="/plano/importar" />
      <Cartao>
        <h2 className="plano-nome">{plano.nome || 'Plano sem nome'}</h2>
        <p className="muted">
          {plano.autor && <>{plano.autor} · </>}
          {plano.sessoes.length} sessões · {nEx} exercícios
        </p>
        {plano.bloco ? (
          <>
            <label className="rotulo" htmlFor="inicio-bloco">
              Início do bloco
            </label>
            <input
              id="inicio-bloco"
              className="campo"
              type="date"
              value={inicio}
              onChange={(e) => e.currentTarget.value && setInicio(e.currentTarget.value)}
            />
            <p className="muted pequeno">
              Duração: {plano.bloco.semanas} semanas · {plano.bloco.fases.length} fases. A data define a
              semana do bloco.
            </p>
          </>
        ) : (
          <p className="muted pequeno">Plano sem periodização: vale o RIR da progressão.</p>
        )}
      </Cartao>

      {plano.sessoes.map((s, i) => (
        <details className="acordeao" key={i} open={i === 0}>
          <summary>
            <span>
              {s.nome}
              {s.dia != null && <span className="muted pequeno"> · {NOMES_DIAS[s.dia]}</span>}
            </span>
            <span className="muted numero">{s.itens.length}</span>
          </summary>
          <ul className="lista-ex">
            {s.itens.map((ex, j) => (
              <LinhaExercicio key={j} ex={ex} vinculos={vinculos} vincular={vincular} />
            ))}
          </ul>
        </details>
      ))}

      {plano.cardio.length > 0 && (
        <Cartao titulo="Cardio">
          <ul className="lista-simples">
            {plano.cardio.map((c, i) => (
              <li key={i}>
                {c.tipos.join(' / ')} · {c.frequencia} · {c.minutos.min}-{c.minutos.max} min
                {c.intensidade && ` · ${c.intensidade}`}
                {c.fc && ` · FC ${c.fc.min}-${c.fc.max}`}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {treinoAberto.value && (
        <Cartao className="cartao-aviso">
          Há um treino em andamento. Conclua ou descarte o treino antes de trocar o plano.
        </Cartao>
      )}
      {erro && <Cartao className="cartao-erro">{erro}</Cartao>}

      <div className="rodape-acao">
        <Botao bloco onClick={() => void salvar()} disabled={salvando || !!treinoAberto.value}>
          {salvando ? 'Salvando…' : 'Salvar e ativar plano'}
        </Botao>
      </div>
    </section>
  );
}
