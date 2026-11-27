// Sessão do usuário (ARCHITECTURE 7.1): o app abre direto do banco local de quem entrou por último, sem esperar a
// rede; o supabase-js confere a sessão em segundo plano. Sair não apaga os dados locais.

import { ErroRemoto, remoto, type Usuario } from '../remoto';
import { restaurarTreino } from './controlador-treino';
import { iniciarEstado } from './estado';
import { iniciarSincronizador } from './sincronizador';
import { signal } from './sinal';

const CHAVE = 'repz.usuario';

// undefined = ainda verificando; null = ninguém logado (tela de login)
export const usuarioAtual = signal<Usuario | null | undefined>(undefined);

function lerMarca(): Usuario | null {
  try {
    const u = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Usuario | null;
    return u?.id ? u : null;
  } catch {
    return null;
  }
}
function gravarMarca(u: Usuario | null): void {
  try {
    if (u) localStorage.setItem(CHAVE, JSON.stringify(u));
    else localStorage.removeItem(CHAVE);
  } catch {
    // sem localStorage o app só confere a sessão pela rede a cada abertura
  }
}

async function abrir(u: Usuario): Promise<void> {
  gravarMarca(u);
  usuarioAtual.value = u;
  await iniciarEstado(u.id, restaurarTreino);
  iniciarSincronizador(u.id);
}

export async function iniciarSessao(): Promise<void> {
  const marca = lerMarca();
  if (marca) {
    await abrir(marca);
    // Confere em segundo plano: sem sessão salva (saiu em outro lugar), volta para o login
    void remoto
      .sessao()
      .then((s) => {
        if (s === null) void sair();
      })
      .catch(() => {});
    return;
  }
  try {
    const s = await remoto.sessao();
    if (s) await abrir(s);
    else usuarioAtual.value = null;
  } catch {
    usuarioAtual.value = null;
  }
}

export async function entrar(email: string, senha: string): Promise<void> {
  const u = await remoto.entrar(email, senha);
  await abrir(u);
}

export async function esqueciSenha(email: string): Promise<void> {
  if (!email.trim()) throw new ErroRemoto('Digite o seu e-mail.');
  await remoto.esqueciSenha(email);
}

// Os dados ficam no aparelho (repz-<user_id>); o app recarrega e mostra o login
export async function sair(): Promise<void> {
  try {
    await remoto.sair();
  } finally {
    gravarMarca(null);
    location.assign('/');
  }
}
