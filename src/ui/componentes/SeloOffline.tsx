// "Offline · salvo no celular" (mockup, tela 2): sem rede, ou com registros esperando para subir há mais de 1 min.

import { Icon } from '@ds';
import { estadoSync, mostrarSeloOffline } from '../../app/sincronizador';
import { useRelogio } from './relogio';

export function SeloOffline() {
  const agora = useRelogio(15_000);
  if (!mostrarSeloOffline(estadoSync.value, agora)) return null;
  return (
    <span className="selo-offline" role="status">
      <Icon name="refresh-cw" size={14} />
      Offline · salvo no celular
    </span>
  );
}
