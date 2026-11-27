// Configurações → Sincronização (ARCHITECTURE 8.7): pendências, última sincronização, erros e "Sincronizar agora".

import { Button, Card } from '@ds';
import { estadoSync, sincronizarAgora, tentarDeNovo } from '../../../app/sincronizador';

const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'ainda não';

export function CartaoSincronizacao() {
  const s = estadoSync.value;
  return (
    <Card title="Sincronização">
      <div className="pilha">
        <p className="sync-linha">
          {s.rodando
            ? 'Sincronizando…'
            : s.pendentes
              ? `${s.pendentes} ${s.pendentes === 1 ? 'registro esperando' : 'registros esperando'} para subir`
              : 'Tudo salvo na sua conta.'}
        </p>
        <p className="muted pequeno">
          {s.online ? 'Conectado' : 'Sem internet: o que você registrar fica no celular e sobe depois.'} ·
          última sincronização: {quando(s.ultimaEm)}
        </p>
        {s.erros.length > 0 && (
          <div className="sync-erros" role="alert">
            <p>
              {s.erros.length === 1
                ? '1 registro não sincronizou'
                : `${s.erros.length} registros não sincronizaram`}
              : {s.erros[0]!.erro}
            </p>
            <Button variant="secondary" size="sm" onClick={() => void tentarDeNovo()}>
              Tentar de novo
            </Button>
          </div>
        )}
        <Button variant="secondary" block loading={s.rodando} onClick={() => void sincronizarAgora()}>
          Sincronizar agora
        </Button>
      </div>
    </Card>
  );
}
