// Destino do botão Cardio do fim do treino. O registro de cardio chega no M5 (BRIEFING 9.7).

import { Botao, Cabecalho, Cartao } from '../../componentes/basicos';
import { navegar } from '../../../app/roteador';

export function CardioProvisorio() {
  return (
    <section>
      <Cabecalho titulo="Cardio" voltar="#/treino" />
      <Cartao>
        <p>O registro de cardio chega na próxima versão do app.</p>
        <p class="muted pequeno">O treino de força já foi salvo.</p>
      </Cartao>
      <div class="pilha">
        <Botao bloco onClick={() => navegar('treino')}>
          Voltar ao início
        </Botao>
      </div>
    </section>
  );
}
