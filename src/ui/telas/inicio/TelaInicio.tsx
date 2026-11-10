// Início (aba Treino, BRIEFING 9.3): pílula da semana, Próximo treino ou Continuar treino, Cardio.

import { useState } from 'preact/hooks';
import { NOMES_DIAS } from '../../../dominio/datas';
import { pilulaSemana, planoAtivo, progressoCardio, semanaAtual, treinoAberto } from '../../../app/estado';
import {
  duracaoDaSessao,
  encerrarTreinoAberto,
  erroTreino,
  iniciarTreino,
  proximaSessaoTreino,
  sessaoEscolhida,
  sessaoSugerida,
  treinoAtivo,
  treinoEsquecido,
} from '../../../app/controlador-treino';
import { navegar } from '../../../app/roteador';
import { Botao, Cartao, Pilula } from '../../componentes/basicos';
import { decorrido } from '../treino/formatos';

function saudacao(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function CartaoTreinoAberto() {
  const t = treinoAberto.value!;
  const a = treinoAtivo.value;
  const [ocupado, setOcupado] = useState(false);
  const esquecido = treinoEsquecido(t, Date.now());
  const series = a?.series.filter((s) => !s.aquecimento).length ?? 0;
  const encerrar = async () => {
    setOcupado(true);
    await encerrarTreinoAberto();
    setOcupado(false);
  };
  return (
    <Cartao class={esquecido || erroTreino.value ? 'cartao-aviso' : ''} titulo="Treino em andamento">
      <h2 class="plano-nome">{t.sessaoNome}</h2>
      <p class="muted pequeno">
        começou às {t.inicio.slice(11, 16)} · {series} {series === 1 ? 'série' : 'séries'}
        {a && !esquecido && <> · {decorrido(Date.now() - Date.parse(t.inicio))}</>}
      </p>
      {erroTreino.value && <p>{erroTreino.value}</p>}
      {esquecido && !erroTreino.value && <p>Este treino está aberto há mais de 4 horas. Quer encerrar?</p>}
      <div class="pilha">
        {a && (
          <Botao
            bloco
            variante={esquecido ? 'secundario' : 'primario'}
            onClick={() => navegar('treino/agora')}
          >
            Continuar treino
          </Botao>
        )}
        {(esquecido || !a) && (
          <Botao
            bloco
            variante={a ? 'primario' : 'perigo'}
            disabled={ocupado}
            onClick={() => void encerrar()}
          >
            Encerrar treino
          </Botao>
        )}
      </div>
    </Cartao>
  );
}

function CartaoProximoTreino() {
  const plano = planoAtivo.value!;
  const sessao = proximaSessaoTreino.value;
  const [ocupado, setOcupado] = useState(false);
  if (!sessao) return null;
  const sugerida = sessao.id === sessaoSugerida.value?.id;
  const iniciar = async () => {
    setOcupado(true);
    try {
      await iniciarTreino(sessao.id);
    } finally {
      setOcupado(false);
    }
  };
  return (
    <Cartao titulo={sugerida ? 'Próximo treino' : 'Treino escolhido'}>
      <h2 class="plano-nome">{sessao.nome}</h2>
      <p class="muted pequeno">
        {sessao.itens.length} exercícios · ~{duracaoDaSessao(plano, sessao)} min
        {sessao.dia != null && <> · planejado para {NOMES_DIAS[sessao.dia]}</>}
      </p>
      <ul class="lista-simples pequeno">
        {sessao.itens.slice(0, 3).map((ex) => (
          <li key={ex.id}>{ex.nome}</li>
        ))}
        {sessao.itens.length > 3 && <li class="muted">e mais {sessao.itens.length - 3}</li>}
      </ul>
      <div class="pilha">
        <Botao bloco disabled={ocupado} onClick={() => void iniciar()}>
          Iniciar treino
        </Botao>
        <Botao bloco variante="secundario" onClick={() => navegar('treino/sessao')}>
          Trocar sessão
        </Botao>
        {!sugerida && (
          <Botao bloco variante="texto" onClick={() => (sessaoEscolhida.value = null)}>
            Voltar para a sugerida ({sessaoSugerida.value?.nome})
          </Botao>
        )}
      </div>
    </Cartao>
  );
}

// "X de Y nesta semana" (semana de segunda a domingo, pela frequência do plano)
function CartaoCardio() {
  const p = progressoCardio.value;
  return (
    <Cartao titulo="Cardio">
      <p class="cardio-progresso">
        {p.meta == null ? (
          <>
            <strong class="numero">{p.total}</strong> nesta semana
            <span class="muted pequeno"> · sem meta semanal no plano</span>
          </>
        ) : (
          <>
            <strong class="numero">
              {p.feitos} de {p.meta}
            </strong>{' '}
            nesta semana {p.feitos >= p.meta && <span class="ok">✓</span>}
          </>
        )}
      </p>
      <Botao bloco variante="secundario" onClick={() => navegar('treino/cardio')}>
        Registrar cardio
      </Botao>
    </Cartao>
  );
}

export function TelaInicio() {
  const plano = planoAtivo.value;
  if (!plano) {
    return (
      <section>
        <h1>{saudacao()}</h1>
        {treinoAberto.value && <CartaoTreinoAberto />}
        <Cartao titulo="Comece pelo seu plano">
          <p>Importe o PDF do plano que a sua IA gerou. O app lê o anexo TREINO v1 e monta os treinos.</p>
          <Botao bloco onClick={() => navegar('plano/importar')}>
            Importar plano
          </Botao>
        </Cartao>
        <CartaoCardio />
      </section>
    );
  }

  const semana = semanaAtual.value;
  return (
    <section>
      <h1>
        {saudacao()}
        {plano.autor && `, ${plano.autor}`}
      </h1>
      {pilulaSemana.value && (
        <p>
          <Pilula tom={semana?.fase?.deload ? 'aviso' : 'neutro'}>{pilulaSemana.value}</Pilula>
        </p>
      )}
      {semana?.antesDoInicio && <p class="muted pequeno">O bloco ainda não começou.</p>}

      {treinoAberto.value ? <CartaoTreinoAberto /> : <CartaoProximoTreino />}
      <CartaoCardio />

      {semana?.concluido && (
        <Cartao class="cartao-aviso" titulo="Bloco concluído">
          <p>
            Você terminou as semanas do plano. Peça um plano novo à sua IA e importe aqui; o histórico
            continua.
          </p>
          <Botao variante="secundario" bloco onClick={() => navegar('plano/importar')}>
            Importar novo plano
          </Botao>
        </Cartao>
      )}
    </section>
  );
}
