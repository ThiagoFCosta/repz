// Tela Plano e dados (BRIEFING 9.9): plano ativo, exercícios, exportar e restaurar backup.

import { useState } from 'preact/hooks';
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
    <label class="campo-salto">
      <span class="oculto-visual">Salto de carga de {nome} em kg</span>
      <input
        class="campo campo-numero numero"
        inputMode="decimal"
        placeholder={formatarDecimal(incrementoPadrao(nome))}
        value={txt}
        onInput={(e) => setTxt(e.currentTarget.value)}
        onBlur={() => void confirmar()}
      />
      <span class="muted pequeno">kg</span>
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
        <details class="acordeao" key={s.id}>
          <summary>
            <span>{s.nome}</span>
            <span class="muted numero">{s.itens.length}</span>
          </summary>
          <ul class="lista-ex">
            {s.itens.map((ex) => (
              <li key={ex.id} class="ex-config">
                <div class="ex-revisao-topo">
                  <span class="ex-nome">
                    {ex.grupo != null && <Etiqueta tipo="ss">SS{ex.grupo}</Etiqueta>} {ex.nome}
                  </span>
                  <span class="ex-series numero">{seriesReps(ex.series, ex.reps, ex.porTempo)}</span>
                </div>
                {!ex.porTempo &&
                  ex.variantes.map((v, i) => (
                    <div class="ex-config-linha" key={v}>
                      <span class="pequeno">{ex.variantes.length > 1 ? v : 'Salto de carga'}</span>
                      <CampoSalto chave={ex.chaves[i]!} nome={v} />
                    </div>
                  ))}
                <label class="ex-config-linha">
                  <span class="pequeno">Foco (ponto fraco)</span>
                  <input
                    type="checkbox"
                    class="interruptor"
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
        <h2 class="plano-nome">{plano.nome || 'Plano sem nome'}</h2>
        <p class="muted pequeno">
          {plano.autor && <>{plano.autor} · </>}importado em {dataBR(plano.importadoEm.slice(0, 10))}
          {plano.arquivoNome && <> · {plano.arquivoNome}</>}
        </p>
        {plano.bloco && plano.inicioBloco && semana && (
          <>
            <label class="rotulo" for="inicio-bloco">
              Início do bloco
            </label>
            <input
              id="inicio-bloco"
              class="campo"
              type="date"
              value={plano.inicioBloco}
              onChange={(e) => void mudarInicio(e.currentTarget.value)}
            />
            <div class="semana-ajuste">
              <div>
                <div class="rotulo">Semana atual</div>
                {pilulaSemana.value && <Pilula>{pilulaSemana.value}</Pilula>}
              </div>
              <div class="passo">
                <Botao
                  variante="secundario"
                  aria-label="Semana anterior"
                  disabled={semana.semana === 1}
                  onClick={() => void mudarSemana(-1)}
                >
                  −
                </Botao>
                <span class="passo-valor numero">{semana.semana}</span>
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
            <p class="muted pequeno">
              {semana.antesDoInicio
                ? `O bloco começa em ${dataBR(plano.inicioBloco, true)}.`
                : 'Ajuste se perdeu ou repetiu uma semana.'}
            </p>
          </>
        )}
      </Cartao>

      <h2 class="secao">Exercícios</h2>
      <p class="muted pequeno">
        Salto de carga: o menor aumento possível no equipamento. Foco: recebe as séries extras das fases com
        "series +N foco".
      </p>
      <ListaExercicios plano={plano} />

      <div class="pilha">
        <Botao variante="secundario" bloco onClick={() => navegar('plano/importar')}>
          Importar novo plano
        </Botao>
      </div>

      {anteriores.length > 0 && (
        <Cartao titulo="Planos anteriores">
          <ul class="lista-simples">
            {anteriores.map((p) => (
              <li key={p.id}>
                {p.nome}{' '}
                <span class="muted pequeno">· importado em {dataBR(p.importadoEm.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Cartao titulo="Seus dados">
        <p>Seus dados ficam só neste celular. Sem conta, sem internet, sem nuvem.</p>
        <p class="muted pequeno">{TEXTO_PERSISTENCIA[persistencia.value]}</p>
        <p class="muted pequeno">
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
