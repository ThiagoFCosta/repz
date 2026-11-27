// Perfil e conta. Sair não apaga o que está no celular (cada conta tem o próprio banco local).

import { useState } from 'react';
import { Avatar, Button, Card } from '@ds';
import { sair, usuarioAtual } from '../../../app/sessao';
import { Cabecalho } from '../../componentes/basicos';

export function TelaPerfil() {
  const u = usuarioAtual.value;
  const [saindo, setSaindo] = useState(false);
  if (!u) return null;
  return (
    <section>
      <Cabecalho titulo="Perfil" />
      <Card>
        <div className="perfil-conta">
          <Avatar name={u.email} size={48} />
          <div>
            <div className="perfil-email">{u.email}</div>
            <div className="muted pequeno">Conta do Repz</div>
          </div>
        </div>
      </Card>
      <div className="pilha perfil-acoes">
        <p className="muted pequeno">
          Ao sair, seus dados continuam neste celular e voltam quando você entrar de novo.
        </p>
        <Button
          variant="secondary"
          block
          loading={saindo}
          onClick={() => {
            setSaindo(true);
            void sair();
          }}
        >
          Sair
        </Button>
      </div>
    </section>
  );
}
