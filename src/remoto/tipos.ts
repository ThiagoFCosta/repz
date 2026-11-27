// Porta do app para o servidor (docs/v2/ARCHITECTURE.md, seção 3): SupabaseRemoto em produção e MemoriaRemoto
// nos E2E e testes (VITE_REMOTO=memoria).

export interface Usuario {
  id: string;
  email: string;
}

// Linha como está no Postgres (snake_case)
export interface LinhaRemota {
  id: string;
  atualizado_em: string;
  excluido_em?: string | null;
  servidor_em?: string;
  [coluna: string]: unknown;
}

export interface ResultadoEnvio {
  // Recusadas pelo servidor (validação, RLS): não adianta reenviar igual
  recusadas: { id: string; motivo: string }[];
}

export interface Remoto {
  // Sessão salva neste aparelho (sem rede: vale a última conhecida)
  sessao(): Promise<Usuario | null>;
  entrar(email: string, senha: string): Promise<Usuario>;
  sair(): Promise<void>;
  esqueciSenha(email: string): Promise<void>;
  // Depois do link do convite ou de "esqueci a senha": a sessão já está aberta, falta a senha
  definirSenha(senha: string): Promise<void>;

  // Sincronização (ARCHITECTURE, seção 8). Sem rede: ErroRede.
  enviar(tabela: string, linhas: LinhaRemota[]): Promise<ResultadoEnvio>;
  excluir(tabela: string, itens: { id: string; em: string }[]): Promise<void>;
  receber(tabela: string, desde: string | null, limite: number): Promise<LinhaRemota[]>;
  // Um plano ativo por usuário (índice único): desativa os outros e ativa este
  ativarPlano(id: string | null, em: string): Promise<void>;
}

// Mensagens de erro já em pt-BR, prontas para a tela
export class ErroRemoto extends Error {}
export class ErroRede extends ErroRemoto {
  constructor() {
    super('Sem conexão com o servidor.');
  }
}
