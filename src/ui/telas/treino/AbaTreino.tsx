import { treinoAtivo } from '../../../app/controlador-treino';
import { rota } from '../../../app/roteador';
import { TelaInicio } from '../inicio/TelaInicio';
import { TrocarSessao } from '../inicio/TrocarSessao';
import { CardioProvisorio } from './CardioProvisorio';
import { TelaTreino } from './TelaTreino';

// #/treino → Início · #/treino/sessao → Trocar sessão · #/treino/agora → treino em andamento
// #/treino/cardio → cardio (provisório até o M5)
export function AbaTreino() {
  const sub = rota.value.caminho[0];
  if (sub === 'sessao' && !treinoAtivo.value) return <TrocarSessao />;
  if (sub === 'agora' && treinoAtivo.value) return <TelaTreino />;
  if (sub === 'cardio' && !treinoAtivo.value) return <CardioProvisorio />;
  return <TelaInicio />;
}
