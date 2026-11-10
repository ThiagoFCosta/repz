// Início (aba Treino). No M2: estado vazio, pílula da semana e o plano ativo. O treino do dia chega no M3.

import { NOMES_DIAS } from '../../../dominio/datas';
import { pilulaSemana, planoAtivo, semanaAtual } from '../../../app/estado';
import { navegar } from '../../../app/roteador';
import { Botao, Cartao, Pilula } from '../../componentes/basicos';

function saudacao(): string {
  const h = new Date().getHours();
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function TelaInicio() {
  const plano = planoAtivo.value;
  if (!plano) {
    return (
      <section>
        <h1>{saudacao()}</h1>
        <Cartao titulo="Comece pelo seu plano">
          <p>Importe o PDF do plano que a sua IA gerou. O app lê o anexo TREINO v1 e monta os treinos.</p>
          <Botao bloco onClick={() => navegar('plano/importar')}>
            Importar plano
          </Botao>
        </Cartao>
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

      <Cartao titulo="Plano ativo">
        <h2 class="plano-nome">{plano.nome}</h2>
        <ul class="lista-simples">
          {plano.sessoes.map((s) => (
            <li key={s.id}>
              {s.nome} <span class="muted pequeno">· {s.itens.length} exercícios</span>
              {s.dia != null && <span class="muted pequeno"> · {NOMES_DIAS[s.dia]}</span>}
            </li>
          ))}
        </ul>
        <p class="muted pequeno">O registro do treino chega na próxima etapa do app.</p>
      </Cartao>
    </section>
  );
}
