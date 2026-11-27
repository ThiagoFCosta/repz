// Primeira senha (link do convite) ou senha nova (link de "esqueci a senha")

import { useState, type FormEvent } from 'react';
import { Button, Card, Input, Logo } from '@ds';
import { definirSenha, usuarioAtual } from '../../../app/sessao';

export function TelaDefinirSenha() {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      await definirSenha(senha, confirmacao);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar agora. Tente de novo.');
      setOcupado(false);
    }
  };

  return (
    <main className="login">
      <Logo size={40} />
      <h1>Crie a sua senha</h1>
      <p className="muted">{usuarioAtual.value?.email}</p>
      <Card>
        <form className="pilha" onSubmit={(e) => void enviar(e)}>
          <input
            type="email"
            hidden
            readOnly
            autoComplete="username"
            value={usuarioAtual.value?.email ?? ''}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="new-password"
            hint="Pelo menos 8 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.currentTarget.value)}
            required
          />
          <Input
            label="Repita a senha"
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.currentTarget.value)}
            required
          />
          {erro && (
            <p className="login-erro" role="alert">
              {erro}
            </p>
          )}
          <Button type="submit" block size="lg" loading={ocupado} disabled={ocupado}>
            Salvar e entrar
          </Button>
        </form>
      </Card>
    </main>
  );
}
