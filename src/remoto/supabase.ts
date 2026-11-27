import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ErroRede,
  ErroRemoto,
  type LinhaRemota,
  type Remoto,
  type ResultadoEnvio,
  type Usuario,
} from './tipos';

// O supabase-js só é carregado quando o app precisa falar com o servidor (D45): o Início abre do Dexie.
let cliente: Promise<SupabaseClient> | null = null;
function obter(): Promise<SupabaseClient> {
  cliente ??= import('@supabase/supabase-js').then(({ createClient }) => {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!url || !chave) throw new ErroRemoto('O app está sem a configuração do servidor.');
    // Uma chave secreta no build daria acesso total ao banco: recusa (ARCHITECTURE, seção 12)
    if (chave.startsWith('sb_secret_')) throw new ErroRemoto('Configuração insegura: chave secreta no app.');
    return createClient(url, chave, { auth: { persistSession: true, autoRefreshToken: true } });
  });
  return cliente;
}

const usuario = (u: { id: string; email?: string } | null | undefined): Usuario | null =>
  u ? { id: u.id, email: u.email ?? '' } : null;

function traduzir(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme o seu e-mail pelo link que chegou e tente de novo.';
  if (/failed to fetch|network/i.test(msg))
    return 'Sem conexão com o servidor. Tente de novo quando houver internet.';
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  return 'Não foi possível entrar agora. Tente de novo.';
}

export class SupabaseRemoto implements Remoto {
  // Os testes contra o projeto real passam um cliente já logado
  constructor(private readonly cliente: () => Promise<SupabaseClient> = obter) {}

  async sessao() {
    const sb = await this.cliente();
    // getSession lê o que está salvo no aparelho; não depende de rede
    const { data } = await sb.auth.getSession();
    return usuario(data.session?.user);
  }
  async entrar(email: string, senha: string) {
    const sb = await this.cliente();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) throw new ErroRemoto(traduzir(error.message));
    return usuario(data.user)!;
  }
  async sair() {
    const sb = await this.cliente();
    await sb.auth.signOut({ scope: 'local' });
  }
  async esqueciSenha(email: string) {
    const sb = await this.cliente();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin });
    if (error) throw new ErroRemoto(traduzir(error.message));
  }
  async definirSenha(senha: string) {
    const sb = await this.cliente();
    const { error } = await sb.auth.updateUser({ password: senha });
    if (!error) return;
    if (/different from the old/i.test(error.message))
      throw new ErroRemoto('Use uma senha diferente da anterior.');
    if (/at least|weak|short/i.test(error.message)) throw new ErroRemoto('Use pelo menos 8 caracteres.');
    throw new ErroRemoto(traduzir(error.message));
  }

  // ---- Sincronização (ARCHITECTURE, seção 8) ----

  async enviar(tabela: string, linhas: LinhaRemota[]): Promise<ResultadoEnvio> {
    if (!linhas.length) return { recusadas: [] };
    const sb = await this.cliente();
    const { error } = await sb.from(tabela).upsert(linhas, { onConflict: 'id' });
    if (!error) return { recusadas: [] };
    if (ehRede(error)) throw new ErroRede();
    // Recusa no lote: reenvia uma a uma para isolar a(s) ruim(ns) e deixar as boas subirem
    const recusadas: ResultadoEnvio['recusadas'] = [];
    for (const l of linhas) {
      const r = await sb.from(tabela).upsert([l], { onConflict: 'id' });
      if (r.error && ehRede(r.error)) throw new ErroRede();
      if (r.error) recusadas.push({ id: l.id, motivo: r.error.message });
    }
    return { recusadas };
  }

  async excluir(tabela: string, itens: { id: string; em: string }[]): Promise<void> {
    const sb = await this.cliente();
    for (const { id, em } of itens) {
      const { error } = await sb.from(tabela).update({ excluido_em: em, atualizado_em: em }).eq('id', id);
      if (error && ehRede(error)) throw new ErroRede();
    }
  }

  async receber(tabela: string, desde: string | null, limite: number): Promise<LinhaRemota[]> {
    const sb = await this.cliente();
    let q = sb.from(tabela).select('*');
    if (desde) q = q.gt('servidor_em', desde);
    const { data, error } = await q.order('servidor_em').limit(limite);
    if (error) throw ehRede(error) ? new ErroRede() : new ErroRemoto(error.message);
    return (data ?? []) as LinhaRemota[];
  }

  async ativarPlano(id: string | null, em: string): Promise<void> {
    const sb = await this.cliente();
    let q = sb.from('planos_treino').update({ ativo: false, atualizado_em: em }).eq('ativo', true);
    if (id) q = q.neq('id', id);
    const a = await q;
    if (a.error) throw ehRede(a.error) ? new ErroRede() : new ErroRemoto(a.error.message);
    if (!id) return;
    const b = await sb.from('planos_treino').update({ ativo: true, atualizado_em: em }).eq('id', id);
    if (b.error) throw ehRede(b.error) ? new ErroRede() : new ErroRemoto(b.error.message);
  }
}

// Falha de rede (fetch rejeitado), não recusa do servidor
function ehRede(e: { message?: string; code?: string }): boolean {
  return !e.code && /fetch|network|load failed|timeout/i.test(e.message ?? '');
}
