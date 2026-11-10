import { rota } from '../app/roteador';
import { AppShell } from './layout/AppShell';
import { TelaHistorico, TelaPlano, TelaTreino } from './telas/Telas';

const TELAS = { treino: TelaTreino, historico: TelaHistorico, plano: TelaPlano };

export function App() {
  const Tela = TELAS[rota.value];
  return (
    <AppShell>
      <Tela />
    </AppShell>
  );
}
