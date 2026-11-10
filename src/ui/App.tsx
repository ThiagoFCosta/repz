import { carregado, erroFatal } from '../app/estado';
import { rota } from '../app/roteador';
import { mostrarBoasVindas } from '../app/instalacao';
import { Cartao } from './componentes/basicos';
import { AppShell } from './layout/AppShell';
import { AbaTreino } from './telas/treino/AbaTreino';
import { TelaPlano } from './telas/plano/TelaPlano';
import { TelaHistorico } from './telas/historico/TelaHistorico';
import { BoasVindas } from './telas/boas-vindas/BoasVindas';

const TELAS = { treino: AbaTreino, historico: TelaHistorico, plano: TelaPlano };

export function App() {
  if (erroFatal.value)
    return (
      <main class="shell-conteudo">
        <Cartao class="cartao-erro">{erroFatal.value}</Cartao>
      </main>
    );
  if (!carregado.value) return null;
  // Fora do app instalado, até ser dispensada (BRIEFING 11)
  if (mostrarBoasVindas.value) return <BoasVindas />;
  const Tela = TELAS[rota.value.aba];
  return (
    <AppShell>
      <Tela />
    </AppShell>
  );
}
