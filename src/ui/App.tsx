import { carregado, erroFatal } from '../app/estado';
import { useSinais } from '../app/sinal';
import { rota, type Aba } from '../app/roteador';
import type { ReactNode } from 'react';
import { mostrarBoasVindas } from '../app/instalacao';
import { Cartao } from './componentes/basicos';
import { AppShell } from './layout/AppShell';
import { AbaTreino } from './telas/treino/AbaTreino';
import { TelaPlano } from './telas/plano/TelaPlano';
import { TelaHistorico } from './telas/historico/TelaHistorico';
import { BoasVindas } from './telas/boas-vindas/BoasVindas';
import { TelaInicio } from './telas/inicio/TelaInicio';
import { EmBreve } from './telas/EmBreve';
import { TelaLogin } from './telas/login/TelaLogin';
import { TelaPerfil } from './telas/perfil/TelaPerfil';
import { TelaReferencias } from './telas/referencias/TelaReferencias';
import { TelaCorpo } from './telas/corpo/TelaCorpo';
import { usuarioAtual } from '../app/sessao';

const TELAS: Partial<Record<Aba, () => ReactNode>> = {
  inicio: TelaInicio,
  treino: AbaTreino,
  historico: TelaHistorico,
  plano: TelaPlano,
  perfil: TelaPerfil,
  referencias: TelaReferencias,
  corpo: TelaCorpo,
};

export function App() {
  // Qualquer sinal alterado redesenha a árvore (D34)
  useSinais();
  if (erroFatal.value)
    return (
      <main className="shell-conteudo">
        <Cartao className="cartao-erro">{erroFatal.value}</Cartao>
      </main>
    );
  if (usuarioAtual.value === undefined) return null;
  if (usuarioAtual.value === null) return <TelaLogin />;
  if (!carregado.value) return null;
  // Fora do app instalado, até ser dispensada (BRIEFING 11)
  if (mostrarBoasVindas.value) return <BoasVindas />;
  const aba = rota.value.aba;
  const Tela = TELAS[aba];
  return <AppShell>{Tela ? <Tela /> : <EmBreve aba={aba} />}</AppShell>;
}
