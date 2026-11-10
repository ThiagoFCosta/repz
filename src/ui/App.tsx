import { carregado, erroFatal } from '../app/estado';
import { rota } from '../app/roteador';
import { Cartao } from './componentes/basicos';
import { AppShell } from './layout/AppShell';
import { AbaTreino } from './telas/treino/AbaTreino';
import { TelaPlano } from './telas/plano/TelaPlano';
import { TelaHistorico } from './telas/historico/TelaHistorico';

const TELAS = { treino: AbaTreino, historico: TelaHistorico, plano: TelaPlano };

export function App() {
  if (erroFatal.value)
    return (
      <main class="shell-conteudo">
        <Cartao class="cartao-erro">{erroFatal.value}</Cartao>
      </main>
    );
  if (!carregado.value) return null;
  const Tela = TELAS[rota.value.aba];
  return (
    <AppShell>
      <Tela />
    </AppShell>
  );
}
