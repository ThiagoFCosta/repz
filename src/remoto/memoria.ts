import {
  ErroRede,
  ErroRemoto,
  type LinhaRemota,
  type Remoto,
  type ResultadoEnvio,
  type Usuario,
} from './tipos';

// Remoto falso para os E2E, os testes e o desenvolvimento sem servidor (VITE_REMOTO=memoria). Imita o que importa
// do Postgres do Repz: upsert por id, last-write-wins por atualizado_em (trigger sync_carimbo), servidor_em
// crescente, um plano ativo por usuário. Começa logado com a conta de teste, para os E2E da v1 seguirem iguais.
// No navegador, o "banco" fica no localStorage (sobrevive a recarregar a página); offline (navigator.onLine
// falso) ele responde como sem rede.
export const USUARIO_TESTE: Usuario = {
  id: '00000000-0000-4000-8000-00000000e2e0',
  email: 'teste@repz.test',
};
export const SENHA_TESTE = 'senha-de-teste';
const CHAVE_SESSAO = 'repz.memoria.sessao';
export const CHAVE_BANCO = 'repz.memoria.banco';

type Banco = Record<string, Record<string, LinhaRemota>>;

// Só no navegador (no Node dos testes o banco fica na memória do objeto)
const temStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export class MemoriaRemoto implements Remoto {
  private banco: Banco;
  private relogio = 0;
  // Testes podem forçar "sem rede" e recusas de validação
  semRede = false;
  recusar: (tabela: string, linha: LinhaRemota) => string | null = () => null;

  constructor(inicial?: Banco) {
    this.banco = inicial ?? this.carregar();
  }

  private carregar(): Banco {
    if (!temStorage()) return {};
    try {
      return JSON.parse(localStorage.getItem(CHAVE_BANCO) ?? '{}') as Banco;
    } catch {
      return {};
    }
  }
  private salvar(): void {
    if (temStorage()) localStorage.setItem(CHAVE_BANCO, JSON.stringify(this.banco));
  }
  private rede(): void {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (this.semRede || offline) throw new ErroRede();
  }
  private agora(): string {
    this.relogio = Math.max(Date.now(), this.relogio + 1);
    return new Date(this.relogio).toISOString();
  }
  private tabela(nome: string): Record<string, LinhaRemota> {
    return (this.banco[nome] ??= {});
  }
  // Conteúdo atual (para os testes conferirem o que chegou)
  linhas(tabela: string): LinhaRemota[] {
    return Object.values(this.carregarSeNavegador()[tabela] ?? {});
  }
  private carregarSeNavegador(): Banco {
    if (temStorage()) this.banco = this.carregar();
    return this.banco;
  }

  async sessao() {
    try {
      return temStorage() && localStorage.getItem(CHAVE_SESSAO) === 'saiu' ? null : USUARIO_TESTE;
    } catch {
      return USUARIO_TESTE;
    }
  }
  async entrar(email: string, senha: string) {
    if (email.trim().toLowerCase() !== USUARIO_TESTE.email || senha !== SENHA_TESTE)
      throw new ErroRemoto('E-mail ou senha incorretos.');
    if (temStorage()) localStorage.removeItem(CHAVE_SESSAO);
    return USUARIO_TESTE;
  }
  async sair() {
    if (temStorage()) localStorage.setItem(CHAVE_SESSAO, 'saiu');
  }
  async esqueciSenha() {}
  async definirSenha() {}

  async enviar(tabela: string, linhas: LinhaRemota[]): Promise<ResultadoEnvio> {
    this.rede();
    this.carregarSeNavegador();
    const t = this.tabela(tabela);
    const recusadas: ResultadoEnvio['recusadas'] = [];
    for (const l of linhas) {
      const motivo = this.recusar(tabela, l);
      if (motivo) {
        recusadas.push({ id: l.id, motivo });
        continue;
      }
      const atual = t[l.id];
      if (atual && Date.parse(l.atualizado_em) < Date.parse(atual.atualizado_em)) {
        t[l.id] = { ...atual, servidor_em: this.agora() }; // a mais nova fica; o pull devolve a vencedora
        continue;
      }
      t[l.id] = { ativo: atual?.ativo ?? false, ...atual, ...l, servidor_em: this.agora() };
    }
    this.salvar();
    return { recusadas };
  }

  async excluir(tabela: string, itens: { id: string; em: string }[]): Promise<void> {
    this.rede();
    this.carregarSeNavegador();
    const t = this.tabela(tabela);
    for (const { id, em } of itens) {
      const atual = t[id];
      if (!atual || Date.parse(em) < Date.parse(atual.atualizado_em)) continue;
      t[id] = { ...atual, excluido_em: em, atualizado_em: em, servidor_em: this.agora() };
    }
    this.salvar();
  }

  async receber(tabela: string, desde: string | null, limite: number): Promise<LinhaRemota[]> {
    this.rede();
    this.carregarSeNavegador();
    return Object.values(this.tabela(tabela))
      .filter((l) => !desde || l.servidor_em! > desde)
      .sort((a, b) => a.servidor_em!.localeCompare(b.servidor_em!))
      .slice(0, limite)
      .map((l) => structuredClone(l));
  }

  async ativarPlano(id: string | null, em: string): Promise<void> {
    this.rede();
    this.carregarSeNavegador();
    for (const l of Object.values(this.tabela('planos_treino'))) {
      const deve = l.id === id;
      if (Boolean(l.ativo) !== deve)
        Object.assign(l, { ativo: deve, atualizado_em: em, servidor_em: this.agora() });
    }
    this.salvar();
  }
}
