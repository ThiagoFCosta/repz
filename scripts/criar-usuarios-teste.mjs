// Cria (uma vez) as duas contas de teste do RLS no projeto Supabase do Repz e grava as credenciais no .env.local.
// Usa a chave secreta do .env.local; e-mails no domínio reservado .test (não recebem e-mail).
import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  ['.env', '.env.local'].flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
  ),
);
if (env.RLS_A_EMAIL) {
  console.log('Contas de teste já configuradas no .env.local.');
  process.exit(0);
}
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const linhas = ['# Contas de teste do RLS (scripts/criar-usuarios-teste.mjs)'];
for (const quem of ['A', 'B']) {
  const email = `rls-${quem.toLowerCase()}@repz.test`;
  const senha = randomBytes(18).toString('base64url');
  const { error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) throw error;
  linhas.push(`RLS_${quem}_EMAIL=${email}`, `RLS_${quem}_SENHA=${senha}`);
}
appendFileSync('.env.local', linhas.join('\n') + '\n');
console.log('Criadas rls-a@repz.test e rls-b@repz.test; credenciais no .env.local.');
