import { ErroRemoto, type Remoto, type Usuario } from './tipos';

// Remoto falso para os E2E e o desenvolvimento sem rede (VITE_REMOTO=memoria). Começa logado com a conta de
// teste, para os E2E da v1 continuarem iguais; "Sair" e "Entrar" funcionam com as credenciais abaixo.
export const USUARIO_TESTE: Usuario = {
  id: '00000000-0000-4000-8000-00000000e2e0',
  email: 'teste@repz.test',
};
export const SENHA_TESTE = 'senha-de-teste';
const CHAVE = 'repz.memoria.sessao';

function lerSaiu(): boolean {
  try {
    return localStorage.getItem(CHAVE) === 'saiu';
  } catch {
    return false;
  }
}

export class MemoriaRemoto implements Remoto {
  async sessao() {
    return lerSaiu() ? null : USUARIO_TESTE;
  }
  async entrar(email: string, senha: string) {
    if (email.trim().toLowerCase() !== USUARIO_TESTE.email || senha !== SENHA_TESTE)
      throw new ErroRemoto('E-mail ou senha incorretos.');
    localStorage.removeItem(CHAVE);
    return USUARIO_TESTE;
  }
  async sair() {
    localStorage.setItem(CHAVE, 'saiu');
  }
  async esqueciSenha() {}
}
