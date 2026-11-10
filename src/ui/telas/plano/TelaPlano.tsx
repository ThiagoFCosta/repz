import { planoAtivo } from '../../../app/estado';
import { rota } from '../../../app/roteador';
import { TelaImportar } from './Importar';
import { TelaPlanoDados } from './PlanoDados';
import { TelaRevisar } from './Revisar';

// #/plano → Plano e dados (ou Importar, sem plano) · #/plano/importar · #/plano/revisar
export function TelaPlano() {
  const sub = rota.value.caminho[0];
  if (sub === 'revisar') return <TelaRevisar />;
  if (sub === 'importar' || !planoAtivo.value)
    return <TelaImportar voltar={planoAtivo.value ? '#/plano' : undefined} />;
  return <TelaPlanoDados />;
}
