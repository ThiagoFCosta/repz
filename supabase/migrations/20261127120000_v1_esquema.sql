-- Repz v2 · marco V1: esquema completo (docs/v2/ARCHITECTURE.md, seção 7).
-- Convenções de toda tabela de dados do usuário (7.2):
--   id uuid gerado no cliente (offline), user_id = auth.uid(), criado_em/atualizado_em do relógio do cliente,
--   excluido_em (soft delete: ninguém apaga linha pela API), servidor_em (relógio do servidor; cursor do pull).
-- O banco guarda fatos; médias, tendências, totais e substituições saem de src/dominio (D44).

-- ---------------------------------------------------------------------------------------------------------
-- Funções comuns
-- ---------------------------------------------------------------------------------------------------------

-- Last-write-wins por linha (8.5) + carimbo do servidor (8.4). Numa atualização mais velha que a do banco, a
-- linha do banco fica, mas o servidor_em anda: o pull devolve a versão vencedora para quem enviou a velha.
create function public.sync_carimbo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'user_id não muda';
    end if;
    if new.atualizado_em < old.atualizado_em then
      old.servidor_em := clock_timestamp();
      return old;
    end if;
  end if;
  new.servidor_em := clock_timestamp();
  return new;
end;
$$;

-- O token veio do servidor OAuth (conector do Claude) e não de uma sessão do app? (padrão do Prisma)
create function public.via_conector()
returns boolean
language sql
stable
set search_path = ''
as $$
  select (auth.jwt() ->> 'client_id') is not null;
$$;
revoke all on function public.via_conector() from public, anon;
grant execute on function public.via_conector() to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------------------------------------

create table public.perfis (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null default '',
  nascimento date null,
  altura_cm numeric(5, 1) null check (altura_cm between 80 and 250),
  sexo text null check (sexo in ('m', 'f', 'outro')),
  objetivo text null,
  fuso text not null default 'America/Sao_Paulo',
  tem_relogio boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now(),
  unique (user_id)
);

create table public.preferencias (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome_exibicao text null,
  nao_come text[] not null default '{}',
  som_descanso boolean not null default true,
  vibrar boolean not null default true,
  manter_tela_ligada boolean not null default true,
  tema text not null default 'sistema' check (tema in ('sistema', 'claro', 'escuro')),
  lembrete_medidas_dias integer not null default 21 check (lembrete_medidas_dias between 14 and 28),
  tolerancias_subst jsonb null,
  ultimo_backup timestamptz null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now(),
  unique (user_id)
);

-- Plano de treino como documento (D38): sessões, itens, bloco, progressão e cardio em `estrutura`.
create table public.planos_treino (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  autor text not null default '',
  data_plano date null,
  importado_em timestamptz not null,
  ativo boolean not null default false,
  inicio_bloco date null,
  ajuste_semana integer not null default 0,
  texto_original text not null default '',
  arquivo_nome text null,
  estrutura jsonb not null,
  origem text not null default 'app' check (origem in ('app', 'agente', 'compartilhado', 'v1')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);
create unique index planos_treino_um_ativo on public.planos_treino (user_id) where ativo and excluido_em is null;

create table public.config_exercicio (
  id uuid primary key, -- uuid v5 de user_id + chave (8.5)
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chave text not null,
  incremento_kg numeric(5, 2) null check (incremento_kg > 0),
  foco boolean null,
  apelido_de text null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now(),
  unique (user_id, chave)
);

create table public.checkins (
  id uuid primary key, -- uuid v5 de user_id + data
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data date not null,
  sono_horas numeric(3, 1) null check (sono_horas between 0 and 24),
  disposicao smallint null check (disposicao between 1 and 5),
  origem text not null default 'manual' check (origem in ('manual', 'print')),
  pulado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now(),
  unique (user_id, data)
);

create table public.treinos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plano_id uuid not null references public.planos_treino (id),
  sessao_id text not null,
  sessao_nome text not null,
  data date not null,
  inicio timestamptz not null,
  fim timestamptz null,
  semana_bloco integer null,
  status text not null check (status in ('em_andamento', 'concluido', 'descartado')),
  estado_ui jsonb null,
  notas jsonb not null default '{}',
  checkin_id uuid null references public.checkins (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);
create index treinos_user_data on public.treinos (user_id, data);

-- Log de sugestões do motor (D39): uma linha por exercício por treino
create table public.sugestoes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  treino_id uuid not null references public.treinos (id),
  exercicio_prescrito_id text not null,
  chave text not null,
  variante text not null,
  versao_motor text not null,
  versao_parametros integer not null,
  regra text not null,
  entradas jsonb not null,
  prontidao jsonb null,
  acao text not null check (acao in ('aumentar', 'manter', 'reduzir', 'calibrar')),
  carga numeric(6, 2) null,
  motivo text not null,
  alertas text[] not null default '{}',
  carga_usada numeric(6, 2) null,
  desfecho text null check (desfecho in ('aceita', 'editada', 'ignorada')),
  resultado jsonb null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);

create table public.series (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  treino_id uuid not null references public.treinos (id),
  exercicio_prescrito_id text not null,
  chave text not null,
  variante text not null,
  ordem integer not null,
  kg numeric(6, 2) not null check (kg >= 0),
  reps integer not null check (reps >= 0), -- segundos quando o exercício é por tempo
  rir smallint null check (rir between 0 and 4), -- 4 = "4+"
  aquecimento boolean not null default false,
  feita_em timestamptz not null,
  sugestao_id uuid null references public.sugestoes (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);
create index series_user_chave on public.series (user_id, chave, feita_em);
create index series_treino on public.series (treino_id);

create table public.cardio (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null,
  data date not null,
  inicio timestamptz null,
  minutos numeric(5, 1) not null check (minutos > 0),
  distancia_km numeric(6, 2) null check (distancia_km >= 0),
  fc_media integer null check (fc_media between 30 and 240),
  kcal_relogio integer null check (kcal_relogio >= 0),
  esforco smallint null check (esforco between 0 and 10),
  nota text null,
  origem text not null default 'manual' check (origem in ('manual', 'print', 'v1')),
  feito_em timestamptz not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);

create table public.parametros_motor (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  versao integer not null check (versao >= 1),
  parametros jsonb not null,
  ativo boolean not null default false,
  motivo text not null default '',
  aprovado_em timestamptz null,
  rascunho_id uuid null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now(),
  unique (user_id, versao)
);
create unique index parametros_motor_um_ativo on public.parametros_motor (user_id) where ativo and excluido_em is null;

create table public.medicoes_peso (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data date not null,
  hora time null,
  kg numeric(5, 1) not null check (kg between 20 and 400),
  condicao text not null default 'outra' check (condicao in ('jejum', 'outra')),
  origem text not null default 'manual' check (origem in ('manual', 'print')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);

create table public.medicoes_bio (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data date not null,
  gordura_pct numeric(4, 1) null check (gordura_pct between 1 and 80),
  massa_gorda_kg numeric(5, 1) null check (massa_gorda_kg >= 0),
  musculo_esq_kg numeric(5, 1) null check (musculo_esq_kg >= 0),
  agua_pct numeric(4, 1) null check (agua_pct between 1 and 99),
  origem text not null default 'relogio' check (origem in ('relogio', 'print', 'manual')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);

create table public.medicoes_fita (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data date not null,
  local text not null,
  cm numeric(5, 1) not null check (cm between 5 and 300),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);

-- Base de alimentos (D40): user_id nulo = base global (TACO 4ª ed. + rótulos genéricos), só leitura;
-- o usuário edita criando uma cópia sua (base_id). Valores por 100 g; nulo = sem dado na fonte.
create table public.alimentos (
  id uuid primary key,
  user_id uuid null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  fonte text not null check (fonte in ('taco', 'rotulo', 'usuario')),
  categoria text null,
  kcal numeric(7, 2) null,
  p numeric(6, 2) null,
  c numeric(6, 2) null,
  g numeric(6, 2) null,
  fibra numeric(6, 2) null,
  grupo_substituicao text null,
  base_id uuid null references public.alimentos (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);
create index alimentos_global on public.alimentos (nome) where user_id is null;

create table public.alimentos_alias (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto_normalizado text not null,
  alimento_id uuid not null references public.alimentos (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now(),
  unique (user_id, texto_normalizado)
);

-- Plano alimentar como documento (D38): tipos de dia → refeições → itens; notas; vínculos com as sessões
create table public.planos_alimentares (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  origem text not null check (origem in ('nutridiet', 'agente', 'manual')),
  data_consulta date null,
  profissional text null,
  ativo boolean not null default false,
  arquivo_nome text null,
  estrutura jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);
create unique index planos_alimentares_um_ativo on public.planos_alimentares (user_id) where ativo and excluido_em is null;

-- Agente (seção 13). Rascunhos são online: não vão para o Dexie.
create table public.rascunhos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null,
  conteudo jsonb not null,
  previa text not null,
  avisos jsonb not null default '[]',
  expira_em timestamptz not null default now() + interval '30 minutes',
  confirmado_em timestamptz null,
  descartado_em timestamptz null,
  resultado jsonb null,
  origem text not null default 'agente' check (origem in ('agente', 'app')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);
create index rascunhos_user on public.rascunhos (user_id, criado_em desc);

create table public.avisos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null,
  texto text not null,
  link text null,
  lido_em timestamptz null,
  chave_dedupe text null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);
create unique index avisos_sem_duplicar on public.avisos (user_id, chave_dedupe)
  where lido_em is null and excluido_em is null and chave_dedupe is not null;

create table public.comentarios_agente (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  alvo text not null check (alvo in ('treino', 'semana', 'bloco')),
  alvo_id text not null,
  texto text not null,
  versao integer not null default 1,
  substitui_id uuid null references public.comentarios_agente (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);

create table public.execucoes_rotina (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rotina text not null,
  executada_em timestamptz not null,
  resumo text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);

create table public.auditorias (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  periodo text not null,
  versao_parametros integer not null,
  metricas jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);

-- Clientes OAuth do conector aprovados por cada usuário, para a própria conta (D41)
create table public.agente_clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id text not null,
  nome text not null default '',
  autorizado_em timestamptz not null default now(),
  revogado_em timestamptz null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);
create unique index agente_clientes_ativo on public.agente_clientes (user_id, client_id) where revogado_em is null;

-- Compartilhar plano (seção 6): código curto de uso único, 7 dias; o resgate é pela RPC resgatar_plano
create table public.compartilhamentos_plano (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plano_id uuid not null references public.planos_treino (id),
  codigo text not null unique,
  expira_em timestamptz not null default now() + interval '7 days',
  usado_por uuid null references auth.users (id) on delete set null,
  usado_em timestamptz null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz null,
  servidor_em timestamptz not null default now()
);

-- Referências científicas (seção 11): global e somente leitura; semeada de src/dominio/referencias.ts (V4)
create table public.referencias (
  chave text primary key,
  citacao text not null,
  doi_url text null,
  nivel text not null check (nivel in ('forte', 'moderada', 'limitada', 'pratica')),
  resumo text not null,
  sustenta text[] not null default '{}'
);

-- ---------------------------------------------------------------------------------------------------------
-- Conector: trava das sessões OAuth (padrão do Prisma, sem a exigência de admin)
-- ---------------------------------------------------------------------------------------------------------

-- Sessão do app: sempre true. Token do conector: só se o cliente foi aprovado pelo dono do token e não foi revogado.
create function public.cliente_oauth_permitido()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (auth.jwt() ->> 'client_id') is null then true
    else exists (
      select 1 from public.agente_clientes c
      where c.user_id = auth.uid() and c.client_id = (auth.jwt() ->> 'client_id') and c.revogado_em is null
    )
  end;
$$;
revoke all on function public.cliente_oauth_permitido() from public, anon;
grant execute on function public.cliente_oauth_permitido() to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- RLS, permissões e triggers em todas as tabelas com user_id
-- ---------------------------------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'perfis', 'preferencias', 'planos_treino', 'config_exercicio', 'checkins', 'treinos', 'sugestoes', 'series',
    'cardio', 'parametros_motor', 'medicoes_peso', 'medicoes_bio', 'medicoes_fita', 'alimentos_alias',
    'planos_alimentares', 'rascunhos', 'avisos', 'comentarios_agente', 'execucoes_rotina', 'auditorias',
    'agente_clientes', 'compartilhamentos_plano'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    -- sem delete: apagar é excluido_em (soft delete, propaga pela sync)
    execute format('grant select, insert, update on table public.%I to authenticated', t);
    execute format('create policy dono_le on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy dono_insere on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy dono_altera on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t);
    execute format(
      'create policy agente_trava on public.%I as restrictive for all to authenticated using ((select public.cliente_oauth_permitido())) with check ((select public.cliente_oauth_permitido()))',
      t);
    execute format('create trigger sync_carimbo before insert or update on public.%I for each row execute function public.sync_carimbo()', t);
    execute format('create index %I on public.%I (user_id, servidor_em)', t || '_pull', t);
  end loop;
end;
$$;

-- Alimentos: a base global é legível por todos e não é gravável; o usuário lê e grava só as suas linhas
alter table public.alimentos enable row level security;
revoke all on table public.alimentos from anon, authenticated;
grant select, insert, update on table public.alimentos to authenticated;
create policy le_global_ou_dono on public.alimentos for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy dono_insere on public.alimentos for insert to authenticated with check (user_id = (select auth.uid()));
create policy dono_altera on public.alimentos for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy agente_trava on public.alimentos as restrictive for all to authenticated
  using ((select public.cliente_oauth_permitido())) with check ((select public.cliente_oauth_permitido()));
create trigger sync_carimbo before insert or update on public.alimentos for each row execute function public.sync_carimbo();
create index alimentos_pull on public.alimentos (user_id, servidor_em);

-- Referências: só leitura para quem está logado
alter table public.referencias enable row level security;
revoke all on table public.referencias from anon, authenticated;
grant select on table public.referencias to authenticated;
create policy todos_leem on public.referencias for select to authenticated using (true);
create policy agente_trava on public.referencias as restrictive for all to authenticated
  using ((select public.cliente_oauth_permitido())) with check ((select public.cliente_oauth_permitido()));

-- Pelo conector, a lista de clientes aprovados é só leitura (como no Prisma)
create policy agente_so_le on public.agente_clientes as restrictive for insert to authenticated
  with check (not (select public.via_conector()));
create policy agente_so_le_altera on public.agente_clientes as restrictive for update to authenticated
  using (not (select public.via_conector())) with check (not (select public.via_conector()));

-- ---------------------------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------------------------

-- Código curto para compartilhar um plano: 8 caracteres sem ambíguos (sem 0/O, 1/I/L), 7 dias, uso único
create function public.gerar_codigo_plano(p_plano uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  cod text;
  i integer;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.';
  end if;
  if not exists (
    select 1 from public.planos_treino where id = p_plano and user_id = auth.uid() and excluido_em is null
  ) then
    raise exception 'Plano não encontrado.';
  end if;
  loop
    cod := '';
    for i in 1..8 loop
      cod := cod || substr(alfabeto, 1 + floor(random() * length(alfabeto))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.compartilhamentos_plano where codigo = cod);
  end loop;
  insert into public.compartilhamentos_plano (user_id, plano_id, codigo) values (auth.uid(), p_plano, cod);
  return cod;
end;
$$;
revoke all on function public.gerar_codigo_plano(uuid) from public, anon;
grant execute on function public.gerar_codigo_plano(uuid) to authenticated;

-- Resgata um código: cópia independente do plano na conta de quem chamou (sem histórico, foco, saltos nem
-- config), inativa e sem início de bloco. Devolve o id do plano novo.
create function public.resgatar_plano(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  comp public.compartilhamentos_plano%rowtype;
  origem public.planos_treino%rowtype;
  novo uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.';
  end if;
  if public.via_conector() then
    raise exception 'Indisponível pelo conector.';
  end if;
  select * into comp from public.compartilhamentos_plano
    where codigo = upper(trim(p_codigo)) and excluido_em is null
    for update;
  if not found or comp.expira_em < now() or comp.usado_por is not null then
    raise exception 'Código inválido ou expirado.';
  end if;
  if comp.user_id = auth.uid() then
    raise exception 'Este código é seu: mande para outra pessoa.';
  end if;
  select * into origem from public.planos_treino where id = comp.plano_id and excluido_em is null;
  if not found then
    raise exception 'O plano compartilhado não existe mais.';
  end if;
  insert into public.planos_treino (
    id, user_id, nome, autor, data_plano, importado_em, ativo, inicio_bloco, ajuste_semana, texto_original,
    arquivo_nome, estrutura, origem
  ) values (
    novo, auth.uid(), origem.nome, origem.autor, origem.data_plano, now(), false, null, 0, origem.texto_original,
    origem.arquivo_nome, origem.estrutura, 'compartilhado'
  );
  update public.compartilhamentos_plano set usado_por = auth.uid(), usado_em = now(), atualizado_em = now()
    where id = comp.id;
  return novo;
end;
$$;
revoke all on function public.resgatar_plano(text) from public, anon;
grant execute on function public.resgatar_plano(text) to authenticated;

-- Reserva um rascunho antes de gravar: um "sim" repetido não grava duas vezes (padrão do Prisma)
create function public.reservar_rascunho(p_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with r as (
    update public.rascunhos set confirmado_em = now(), atualizado_em = now()
    where id = p_id and user_id = auth.uid() and confirmado_em is null and descartado_em is null and expira_em > now()
    returning id
  )
  select exists (select 1 from r);
$$;
revoke all on function public.reservar_rascunho(uuid) from public, anon;
grant execute on function public.reservar_rascunho(uuid) to authenticated;

-- Excluir a conta apaga todos os dados (on delete cascade a partir de auth.users)
create function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.';
  end if;
  if public.via_conector() then
    raise exception 'Indisponível pelo conector.';
  end if;
  delete from public.compartilhamentos_plano where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
