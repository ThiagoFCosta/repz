import type { SupabaseClient } from '@supabase/supabase-js';
import { ErroRemoto, type Remoto, type Usuario } from './tipos';

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
  async sessao() {
    const sb = await obter();
    // getSession lê o que está salvo no aparelho; não depende de rede
    const { data } = await sb.auth.getSession();
    return usuario(data.session?.user);
  }
  async entrar(email: string, senha: string) {
    const sb = await obter();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) throw new ErroRemoto(traduzir(error.message));
    return usuario(data.user)!;
  }
  async sair() {
    const sb = await obter();
    await sb.auth.signOut({ scope: 'local' });
  }
  async esqueciSenha(email: string) {
    const sb = await obter();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin });
    if (error) throw new ErroRemoto(traduzir(error.message));
  }
}
