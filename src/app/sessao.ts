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

// Chegou pelo link do convite ou de "esqueci a senha": a sessão vem no endereço e falta criar a senha
export const definindoSenha = signal(false);
// Link vencido ou já usado: aviso na tela de login
export const avisoDoLink = signal<string | null>(null);

function lerLink(): 'senha' | 'erro' | null {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('error_code') || h.get('error')) return 'erro';
  return /^(invite|recovery|signup)$/.test(h.get('type') ?? '') ? 'senha' : null;
}

export async function iniciarSessao(): Promise<void> {
  const link = lerLink();
  if (link === 'erro') {
    avisoDoLink.value = 'Esse link venceu ou já foi usado. Use "Esqueci a senha" para receber outro.';
    history.replaceState(null, '', location.pathname);
  }
  if (link === 'senha') {
    try {
      // O supabase-js lê o token do endereço ao iniciar
      const s = await remoto.sessao();
      history.replaceState(null, '', location.pathname);
      if (s) {
        definindoSenha.value = true;
        usuarioAtual.value = s;
        return;
      }
    } catch {
      // segue para o fluxo normal
    }
    avisoDoLink.value = 'Esse link venceu ou já foi usado. Use "Esqueci a senha" para receber outro.';
  }
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

export async function definirSenha(senha: string, confirmacao: string): Promise<void> {
  if (senha.length < 8) throw new ErroRemoto('Use pelo menos 8 caracteres.');
  if (senha !== confirmacao) throw new ErroRemoto('As duas senhas não são iguais.');
  await remoto.definirSenha(senha);
  definindoSenha.value = false;
  await abrir(usuarioAtual.value!);
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
