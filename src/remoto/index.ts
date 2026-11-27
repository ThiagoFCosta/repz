import { MemoriaRemoto } from './memoria';
import { SupabaseRemoto } from './supabase';
import type { Remoto } from './tipos';

export type { Remoto, Usuario } from './tipos';
export { ErroRemoto } from './tipos';

// VITE_REMOTO=memoria: E2E e desenvolvimento sem servidor
export const remoto: Remoto =
  import.meta.env.VITE_REMOTO === 'memoria' ? new MemoriaRemoto() : new SupabaseRemoto();
