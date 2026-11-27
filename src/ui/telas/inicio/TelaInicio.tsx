// Início (aba Treino, BRIEFING 9.3): pílula da semana, Próximo treino ou Continuar treino, Cardio.

import { useState } from 'react';
import { diasEntre, NOMES_DIAS } from '../../../dominio/datas';
import {
  hoje,
  lembreteBackup,
  mostrarAviso,
  pilulaSemana,
  planoAtivo,
  preferencias,
  progressoCardio,
  semanaAtual,
  semanaResumo,
  pesos,
  treinoAberto,
} from '../../../app/estado';
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
import { exportarBackup } from '../../../app/dados';
import {
  boasVindasAberta,
  instalar,
  mostrarLembreteInstalacao,
  promptInstalacao,
} from '../../../app/instalacao';
import { navegar } from '../../../app/roteador';
import { Botao, Cartao, Pilula } from '../../componentes/basicos';
import { decorrido } from '../treino/formatos';
import { Button, Card } from '@ds';
import { FolhaCheckin } from './FolhaCheckin';
import { mediaMovel7, tendencia } from '../../../dominio/corpo/corpo';
import { formatarDecimal } from '../../../dominio/numeros';

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
    <Cartao className={esquecido || erroTreino.value ? 'cartao-aviso' : ''} titulo="Treino em andamento">
      <h2 className="plano-nome">{t.sessaoNome}</h2>
      <p className="muted pequeno">
        começou às {t.inicio.slice(11, 16)} · {series} {series === 1 ? 'série' : 'séries'}
        {a && !esquecido && <> · {decorrido(Date.now() - Date.parse(t.inicio))}</>}
      </p>
      {erroTreino.value && <p>{erroTreino.value}</p>}
      {esquecido && !erroTreino.value && <p>Este treino está aberto há mais de 4 horas. Quer encerrar?</p>}
      <div className="pilha">
        {a && (
          <Botao bloco variante={esquecido ? 'secundario' : 'primario'} onClick={() => navegar('treino')}>
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
  const [checkin, setCheckin] = useState(false);
  if (!sessao) return null;
  const sugerida = sessao.id === sessaoSugerida.value?.id;
  // Mockup, tela 1: card lime "Treino de hoje" no lugar do saldo do Prisma
  return (
    <>
      <Card
        tone="brand"
        className="treino-hoje"
        aria-label={sugerida ? 'Treino de hoje' : 'Treino escolhido'}
      >
        <p className="treino-hoje-rotulo">{sugerida ? 'Treino de hoje' : 'Treino escolhido'}</p>
        <h2 className="treino-hoje-nome">{sessao.nome}</h2>
        <p className="treino-hoje-info">
          {pilulaSemana.value ? `${pilulaSemana.value} · ` : ''}
          {sessao.itens.length} exercícios · ~{duracaoDaSessao(plano, sessao)} min
          {sessao.dia != null && <> · planejado para {NOMES_DIAS[sessao.dia]}</>}
        </p>
        <p className="treino-hoje-lista">
          {sessao.itens
            .slice(0, 3)
            .map((ex) => ex.nome)
            .join(' · ')}
          {sessao.itens.length > 3 && ` e mais ${sessao.itens.length - 3}`}
        </p>
        <div className="treino-hoje-acoes">
          <Button variant="white" size="lg" onClick={() => navegar('treino/sessao')}>
            Trocar sessão
          </Button>
          <Button variant="primary" size="lg" iconRight="arrow-right" onClick={() => setCheckin(true)}>
            Iniciar treino
          </Button>
        </div>
        {!sugerida && (
          <Button variant="ghost" block onClick={() => (sessaoEscolhida.value = null)}>
            Voltar para a sugerida ({sessaoSugerida.value?.nome})
          </Button>
        )}
      </Card>
      {/* fora do card: a folha não herda a cor do texto sobre o lime */}
      {checkin && (
        <FolhaCheckin aoFechar={() => setCheckin(false)} aoComecar={() => iniciarTreino(sessao.id)} />
      )}
    </>
  );
}

// Mockup, tela 1: "Esta semana" — treinos e séries (semana de segunda a domingo)
function CartaoSemana() {
  const plano = planoAtivo.value;
  const s = semanaResumo.value;
  const metaTreinos = plano?.sessoes.length ?? 0;
  const peso = mediaMovel7(pesos.value, hoje.value);
  const ritmo = tendencia(pesos.value, hoje.value)?.kgSemana ?? null;
  return (
    <Card title="Esta semana" className="esta-semana">
      <div className="esta-semana-tiles">
        <div className="tile">
          <span className="tile-rotulo">Treinos</span>
          <strong className="tile-valor numero">
            {s.treinos}
            {metaTreinos > 0 && <span className="tile-meta">/{metaTreinos}</span>}
          </strong>
        </div>
        <div className="tile">
          <span className="tile-rotulo">Séries</span>
          <strong className="tile-valor numero">{s.series}</strong>
        </div>
        {peso != null && (
          <button type="button" className="tile tile-botao" onClick={() => navegar('corpo')}>
            <span className="tile-rotulo">Peso (média 7d)</span>
            <strong className="tile-valor numero">
              {formatarDecimal(peso)} <span className="tile-meta">kg</span>
            </strong>
            {ritmo != null && (
              <span className="muted pequeno">
                {ritmo > 0 ? '+' : ritmo < 0 ? '−' : ''}
                {formatarDecimal(Math.abs(ritmo))} kg/semana
              </span>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}

// "X de Y nesta semana" (semana de segunda a domingo, pela frequência do plano)
function CartaoCardio() {
  const p = progressoCardio.value;
  return (
    <Cartao titulo="Cardio">
      <p className="cardio-progresso">
        {p.meta == null ? (
          <>
            <strong className="numero">{p.total}</strong> nesta semana
            <span className="muted pequeno"> · sem meta semanal no plano</span>
          </>
        ) : (
          <>
            <strong className="numero">
              {p.feitos} de {p.meta}
            </strong>{' '}
            nesta semana {p.feitos >= p.meta && <span className="ok">✓</span>}
          </>
        )}
      </p>
      <Botao bloco variante="secundario" onClick={() => navegar('treino/cardio')}>
        Registrar cardio
      </Botao>
    </Cartao>
  );
}

// Lembrete discreto (9.9): último backup há mais de 30 dias, ou nunca feito com treino registrado
function LembreteBackup() {
  const [ocupado, setOcupado] = useState(false);
  if (!lembreteBackup.value) return null;
  const fazer = async () => {
    setOcupado(true);
    try {
      await exportarBackup();
    } catch (e) {
      console.error(e);
      mostrarAviso('Não foi possível gerar o backup.');
    } finally {
      setOcupado(false);
    }
  };
  const ultimo = preferencias.value.ultimoBackup;
  return (
    <aside className="lembrete-backup pequeno" aria-label="Lembrete de backup">
      <span className="muted">
        {ultimo
          ? `Último backup há ${diasEntre(ultimo.slice(0, 10), hoje.value)} dias.`
          : 'Você ainda não fez backup dos seus treinos.'}
      </span>
      <Botao variante="texto" disabled={ocupado} onClick={() => void fazer()}>
        Fazer backup
      </Botao>
    </aside>
  );
}

// Lembrete discreto depois de dispensar as boas-vindas, enquanto o app roda no navegador (BRIEFING 11)
function LembreteInstalacao() {
  if (!mostrarLembreteInstalacao.value) return null;
  return (
    <aside className="lembrete-instalacao pequeno" aria-label="Lembrete de instalação">
      <span className="muted">Instale o app para usar offline e proteger seus dados.</span>
      {promptInstalacao.value ? (
        <Botao variante="texto" onClick={() => void instalar()}>
          Instalar
        </Botao>
      ) : (
        <Botao variante="texto" onClick={() => (boasVindasAberta.value = true)}>
          Como instalar
        </Botao>
      )}
    </aside>
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
        <LembreteBackup />
        <LembreteInstalacao />
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
      {pilulaSemana.value && treinoAberto.value && (
        <p>
          <Pilula tom={semana?.fase?.deload ? 'aviso' : 'neutro'}>{pilulaSemana.value}</Pilula>
        </p>
      )}
      {semana?.antesDoInicio && <p className="muted pequeno">O bloco ainda não começou.</p>}

      {treinoAberto.value ? <CartaoTreinoAberto /> : <CartaoProximoTreino />}
      <CartaoSemana />
      <CartaoCardio />

      {semana?.concluido && (
        <Cartao className="cartao-aviso" titulo="Bloco concluído">
          <p>
            Você terminou as semanas do plano. Peça um plano novo à sua IA e importe aqui; o histórico
            continua.
          </p>
          <Botao variante="secundario" bloco onClick={() => navegar('plano/importar')}>
            Importar novo plano
          </Botao>
        </Cartao>
      )}
      <LembreteBackup />
      <LembreteInstalacao />
    </section>
  );
}
