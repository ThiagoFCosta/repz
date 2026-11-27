// "Por quê?" de uma sugestão do motor (BRIEFING-v2, seções 2.4 e 11): abre a referência que sustenta a regra.

import { Link } from 'react-router';
import { REFERENCIAS_DA_REGRA } from '../../dominio/referencias';

export function PorQue({ regra }: { regra: string | undefined }) {
  const chave = regra ? REFERENCIAS_DA_REGRA[regra]?.[0] : undefined;
  if (!chave) return null;
  return (
    <Link className="por-que pequeno" to={`/referencias/${chave}`}>
      Por quê?
    </Link>
  );
}
