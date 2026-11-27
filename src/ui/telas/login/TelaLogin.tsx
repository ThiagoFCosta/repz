// Login (D37): e-mail e senha; o cadastro é fechado (o Thiago convida pelo painel do Supabase).

import { useState, type FormEvent } from 'react';
import { Button, Card, Input, Logo } from '@ds';
import { entrar, esqueciSenha } from '../../../app/sessao';

export function TelaLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      await entrar(email, senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível entrar agora. Tente de novo.');
      setOcupado(false);
    }
  };
  const recuperar = async () => {
    setErro(null);
    setAviso(null);
    try {
      await esqueciSenha(email);
      setAviso('Se o e-mail tiver conta, chega um link para criar uma senha nova.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar agora.');
    }
  };

  return (
    <main className="login">
      <Logo size={40} />
      <h1>Entrar</h1>
      <p className="muted">Seus treinos ficam salvos no celular e na sua conta.</p>
      <Card>
        <form className="pilha" onSubmit={(e) => void enviar(e)}>
          <Input
            label="E-mail"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.currentTarget.value)}
            required
          />
          {erro && (
            <p className="login-erro" role="alert">
              {erro}
            </p>
          )}
          {aviso && <p role="status">{aviso}</p>}
          <Button type="submit" block size="lg" loading={ocupado} disabled={ocupado}>
            Entrar
          </Button>
          <Button type="button" variant="ghost" block onClick={() => void recuperar()}>
            Esqueci a senha
          </Button>
        </form>
      </Card>
      <p className="muted pequeno">O acesso é por convite. Peça o seu a quem administra o Repz.</p>
    </main>
  );
}
