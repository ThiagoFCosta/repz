// Porta do app para o servidor (docs/v2/ARCHITECTURE.md, seção 3): SupabaseRemoto em produção e MemoriaRemoto
// nos E2E (VITE_REMOTO=memoria). A sincronização (V2) entra nesta mesma interface.

export interface Usuario {
  id: string;
  email: string;
}

export interface Remoto {
  // Sessão salva neste aparelho (sem rede: vale a última conhecida)
  sessao(): Promise<Usuario | null>;
  entrar(email: string, senha: string): Promise<Usuario>;
  sair(): Promise<void>;
  esqueciSenha(email: string): Promise<void>;
}

// Mensagens de erro já em pt-BR, prontas para a tela
export class ErroRemoto extends Error {}
