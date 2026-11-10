// Boas-vindas com as instruções de instalação (BRIEFING 11): aparece enquanto o app roda no
// navegador e não foi dispensada; o lembrete do Início a reabre.

import {
  boasVindasDispensada,
  dispensarBoasVindas,
  ehIos,
  instalar,
  promptInstalacao,
} from '../../../app/instalacao';
import { Botao, Cartao } from '../../componentes/basicos';

function Android() {
  return (
    <Cartao titulo="Android (Chrome)">
      <ol class="passos-instalacao">
        <li>
          Toque no menu <strong aria-label="de três pontos">⋮</strong> no canto de cima.
        </li>
        <li>
          Toque em <strong>Instalar app</strong> (em alguns celulares, “Adicionar à tela inicial”).
        </li>
        <li>Abra o REPZ pelo ícone que apareceu na tela inicial.</li>
      </ol>
    </Cartao>
  );
}

function Iphone() {
  return (
    <Cartao titulo="iPhone (Safari)">
      <ol class="passos-instalacao">
        <li>Abra este link no Safari.</li>
        <li>
          Toque em <strong>Compartilhar</strong> (o quadrado com a seta para cima).
        </li>
        <li>
          Toque em <strong>Adicionar à Tela de Início</strong> e depois em <strong>Adicionar</strong>.
        </li>
        <li>Abra o REPZ pelo ícone que apareceu na tela inicial.</li>
      </ol>
    </Cartao>
  );
}

export function BoasVindas() {
  const reaberta = boasVindasDispensada.value;
  return (
    <main class="shell-conteudo boas-vindas">
      <img class="boas-vindas-icone" src={`${import.meta.env.BASE_URL}icones/icone.svg`} alt="" />
      <h1>{reaberta ? 'Instalar o REPZ' : 'Bem-vindo ao REPZ'}</h1>
      <p>
        Registre cada série, acompanhe a evolução e receba sugestões de carga. Funciona sem internet, e os
        seus dados ficam só neste celular.
      </p>
      <p class="muted">
        Instale na tela inicial: o app abre como um aplicativo, funciona offline na academia e o armazenamento
        fica protegido (no iPhone, um site não instalado pode ter os dados apagados depois de alguns dias sem
        uso).
      </p>

      {promptInstalacao.value && (
        <Botao bloco onClick={() => void instalar()}>
          Instalar app
        </Botao>
      )}

      <div class="pilha">
        {ehIos ? [<Iphone key="i" />, <Android key="a" />] : [<Android key="a" />, <Iphone key="i" />]}
      </div>

      <div class="rodape-acao">
        <Botao bloco variante="secundario" onClick={dispensarBoasVindas}>
          {reaberta ? 'Voltar' : 'Continuar no navegador'}
        </Botao>
      </div>
    </main>
  );
}
