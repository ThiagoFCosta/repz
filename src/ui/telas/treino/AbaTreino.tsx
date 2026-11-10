import { treinoAtivo } from '../../../app/controlador-treino';
import { rota } from '../../../app/roteador';
import { TelaCardio } from '../cardio/TelaCardio';
import { TelaInicio } from '../inicio/TelaInicio';
import { TrocarSessao } from '../inicio/TrocarSessao';
import { TelaTreino } from './TelaTreino';

// #/treino → Início · #/treino/sessao → Trocar sessão · #/treino/agora → treino em andamento
// #/treino/cardio → registrar cardio (em qualquer dia, inclusive com um treino aberto)
export function AbaTreino() {
  const sub = rota.value.caminho[0];
  if (sub === 'sessao' && !treinoAtivo.value) return <TrocarSessao />;
  if (sub === 'agora' && treinoAtivo.value) return <TelaTreino />;
  if (sub === 'cardio') return <TelaCardio />;
  return <TelaInicio />;
}
