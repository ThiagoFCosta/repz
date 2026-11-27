// Tela Plano e dados (BRIEFING 9.9): plano ativo, exercícios, exportar e restaurar backup.

import { useState } from 'react';
import { dataBR, ehDataValida } from '../../../dominio/datas';
import { formatarDecimal, lerDecimal } from '../../../dominio/numeros';
import { incrementoPadrao } from '../../../dominio/progressao/incremento';
import type { ExercicioPrescrito, Plano } from '../../../dados/tipos';
import { definirFoco, definirIncremento } from '../../../dados/repos/config';
import { ajustarSemana, definirInicioBloco } from '../../../dados/repos/planos';
import {
  configs,
  db,
  persistencia,
  pilulaSemana,
  planoAtivo,
  planos,
  preferencias,
  recarregar,
  semanaAtual,
} from '../../../app/estado';
import { navegar } from '../../../app/roteador';
import { Botao, Cabecalho, Cartao, Etiqueta, Pilula } from '../../componentes/basicos';
import { alterarPreferencias } from '../../../dados/repos/meta';
import type { Preferencias } from '../../../dados/tipos';
import { CartaoExportar, CartaoRestaurar } from './Dados';
import { seriesReps } from './formatos';

function CampoSalto({ chave, nome }: { chave: string; nome: string }) {
  const salvo = configs.value.get(chave)?.incrementoKg ?? null;
  const [txt, setTxt] = useState(salvo == null ? '' : formatarDecimal(salvo));
  const confirmar = async () => {
    const kg = txt.trim() ? lerDecimal(txt) : null;
    if (kg === 0 || (txt.trim() && kg == null)) {
      setTxt(salvo == null ? '' : formatarDecimal(salvo));
      return;
    }
    if (kg !== salvo) {
      await definirIncremento(db, chave, kg);
      await recarregar();
    }
  };
  return (
    <label className="campo-salto">
      <span className="oculto-visual">Salto de carga de {nome} em kg</span>
      <input
        className="campo campo-numero numero"
        inputMode="decimal"
        placeholder={formatarDecimal(incrementoPadrao(nome))}
        value={txt}
        onChange={(e) => setTxt(e.currentTarget.value)}
        onBlur={() => void confirmar()}
      />
      <span className="muted pequeno">kg</span>
    </label>
  );
}

function focoEfetivo(ex: ExercicioPrescrito): boolean {
  const doUsuario = ex.chaves.map((k) => configs.value.get(k)?.foco).find((f) => f != null);
  return doUsuario ?? ex.foco;
}

function ListaExercicios({ plano }: { plano: Plano }) {
  const alternarFoco = async (ex: ExercicioPrescrito) => {
    const novo = !focoEfetivo(ex);
    for (const k of ex.chaves) await definirFoco(db, k, novo);
    await recarregar();
  };
  return (
    <>
      {plano.sessoes.map((s) => (
        <details className="acordeao" key={s.id}>
          <summary>
            <span>{s.nome}</span>
            <span className="muted numero">{s.itens.length}</span>
          </summary>
          <ul className="lista-ex">
            {s.itens.map((ex) => (
              <li key={ex.id} className="ex-config">
                <div className="ex-revisao-topo">
                  <span className="ex-nome">
                    {ex.grupo != null && <Etiqueta tipo="ss">SS{ex.grupo}</Etiqueta>} {ex.nome}
                  </span>
                  <span className="ex-series numero">{seriesReps(ex.series, ex.reps, ex.porTempo)}</span>
                </div>
                {!ex.porTempo &&
                  ex.variantes.map((v, i) => (
                    <div className="ex-config-linha" key={v}>
                      <span className="pequeno">{ex.variantes.length > 1 ? v : 'Salto de carga'}</span>
                      <CampoSalto chave={ex.chaves[i]!} nome={v} />
                    </div>
                  ))}
                <label className="ex-config-linha">
                  <span className="pequeno">Foco (ponto fraco)</span>
                  <input
                    type="checkbox"
                    className="interruptor"
                    checked={focoEfetivo(ex)}
                    onChange={() => void alternarFoco(ex)}
                  />
                </label>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </>
  );
}

// Preferências do treino (BRIEFING 9.5: wake lock configurável; som e vibração do descanso)
const OPCOES_TREINO: { chave: 'manterTelaLigada' | 'somDescanso' | 'vibrar'; rotulo: string }[] = [
  { chave: 'manterTelaLigada', rotulo: 'Manter a tela ligada durante o treino' },
  { chave: 'somDescanso', rotulo: 'Bipe no fim do descanso' },
  { chave: 'vibrar', rotulo: 'Vibrar no fim do descanso' },
];

function CartaoPreferencias() {
  const alternar = async (chave: keyof Preferencias, valor: boolean) => {
    await alterarPreferencias(db, { [chave]: valor });
    await recarregar();
  };
  return (
    <Cartao titulo="Durante o treino">
      {OPCOES_TREINO.map((o) => (
        <label className="ex-config-linha" key={o.chave}>
          <span>{o.rotulo}</span>
          <input
            type="checkbox"
            className="interruptor"
            checked={preferencias.value[o.chave]}
            onChange={(e) => void alternar(o.chave, e.currentTarget.checked)}
          />
        </label>
      ))}
      <p className="muted pequeno">Vale a partir do próximo treino ou descanso.</p>
    </Cartao>
  );
}

const TEXTO_PERSISTENCIA = {
  concedida: 'Armazenamento protegido: o navegador não apaga os dados sozinho.',
  negada: 'Armazenamento não protegido. Instale o app na tela inicial e faça backups.',
  indisponivel: 'Não foi possível confirmar a proteção do armazenamento. Faça backups.',
};

export function TelaPlanoDados() {
  const plano = planoAtivo.value!;
  const semana = semanaAtual.value;
  const anteriores = planos.value.filter((p) => p.id !== plano.id);

  const mudarSemana = async (delta: number) => {
    await ajustarSemana(db, plano.id, delta);
    await recarregar();
  };
  const mudarInicio = async (d: string) => {
    if (!ehDataValida(d)) return;
    await definirInicioBloco(db, plano.id, d);
    await recarregar();
  };

  return (
    <section>
      <Cabecalho titulo="Plano e dados" />
      <Cartao titulo="Plano ativo">
        <h2 className="plano-nome">{plano.nome || 'Plano sem nome'}</h2>
        <p className="muted pequeno">
          {plano.autor && <>{plano.autor} · </>}importado em {dataBR(plano.importadoEm.slice(0, 10))}
          {plano.arquivoNome && <> · {plano.arquivoNome}</>}
        </p>
        {plano.bloco && plano.inicioBloco && semana && (
          <>
            <label className="rotulo" htmlFor="inicio-bloco">
              Início do bloco
            </label>
            <input
              id="inicio-bloco"
              className="campo"
              type="date"
              value={plano.inicioBloco}
              onChange={(e) => void mudarInicio(e.currentTarget.value)}
            />
            <div className="semana-ajuste">
              <div>
                <div className="rotulo">Semana atual</div>
                {pilulaSemana.value && <Pilula>{pilulaSemana.value}</Pilula>}
              </div>
              <div className="passo">
                <Botao
                  variante="secundario"
                  aria-label="Semana anterior"
                  disabled={semana.semana === 1}
                  onClick={() => void mudarSemana(-1)}
                >
                  −
                </Botao>
                <span className="passo-valor numero">{semana.semana}</span>
                <Botao
                  variante="secundario"
                  aria-label="Próxima semana"
                  disabled={semana.semana === semana.totalSemanas}
                  onClick={() => void mudarSemana(1)}
                >
                  +
                </Botao>
              </div>
            </div>
            <p className="muted pequeno">
              {semana.antesDoInicio
                ? `O bloco começa em ${dataBR(plano.inicioBloco, true)}.`
                : 'Ajuste se perdeu ou repetiu uma semana.'}
            </p>
          </>
        )}
      </Cartao>

      <h2 className="secao">Exercícios</h2>
      <p className="muted pequeno">
        Salto de carga: o menor aumento possível no equipamento. Foco: recebe as séries extras das fases com
        "series +N foco".
      </p>
      <ListaExercicios plano={plano} />

      <div className="pilha">
        <Botao variante="secundario" bloco onClick={() => navegar('plano/importar')}>
          Importar novo plano
        </Botao>
      </div>

      {anteriores.length > 0 && (
        <Cartao titulo="Planos anteriores">
          <ul className="lista-simples">
            {anteriores.map((p) => (
              <li key={p.id}>
                {p.nome}{' '}
                <span className="muted pequeno">· importado em {dataBR(p.importadoEm.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <CartaoPreferencias />

      <Cartao titulo="Seus dados">
        <p>Seus dados ficam só neste celular. Sem conta, sem internet, sem nuvem.</p>
        <p className="muted pequeno">{TEXTO_PERSISTENCIA[persistencia.value]}</p>
        <p className="muted pequeno">
          {preferencias.value.ultimoBackup
            ? `Último backup: ${dataBR(preferencias.value.ultimoBackup.slice(0, 10))}.`
            : 'Nenhum backup feito ainda.'}
        </p>
      </Cartao>
      <CartaoExportar />
      <CartaoRestaurar />
    </section>
  );
}
