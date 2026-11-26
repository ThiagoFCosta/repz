# ARCHITECTURE v2 — Repz: treino, corpo, dieta e coach

> Fase 0 da v2. Refina o `BRIEFING-v2.md` (seções 3 a 14). A v1 continua descrita em `docs/ARCHITECTURE.md` e vale para tudo o que este documento não muda.
> As decisões novas estão numeradas a partir de **D32** (a v1 parou na D31) e reunidas em `docs/v2/DECISOES.md`. Aqui elas aparecem como **[D32]**.
> Material lido para escrever este documento: `BRIEFING-v2.md`, `BRIEFING.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md`, o mockup aprovado, os protótipos de `referencia/dieta/` (rodados com o PDF real) e o repositório do Prisma (`Finanças/Projeto_App_Financas`, inclusive a função `agente-mcp`, as migrações e os testes de RLS).

---

## 1. Visão geral

```
                         ┌──────────────────────── celular (PWA React) ────────────────────────┐
 PDF treino / NutriDiet  │  ui/ (React + @ds)  ──►  app/ (stores, controlador do treino, sync)  │
 texto colado            │        │                        │                 │                  │
                         │        ▼                        ▼                 ▼                  │
                         │  dominio/ (TS puro) ◄──  dados/ (Dexie: cache + outbox)  ──►  remoto/ │
                         └──────────────────────────────────────────────────────────────┬──────┘
                                                                                          │ HTTPS (supabase-js,
                                                                                          │ token do usuário)
 Claude (celular/PC) ──MCP + OAuth 2.1──► Edge Function agente-mcp ──token do usuário──► Supabase Postgres (RLS)
                                           └── importa o MESMO dominio/ (Deno)              Auth · migrações · seeds
```

- **Fonte da verdade:** o Postgres do Supabase. **Fonte de leitura do app:** o Dexie (cópia local por usuário). Toda escrita do app vai primeiro ao Dexie e à fila de envio (seção 8).
- **Duas portas para o banco, uma só regra:** o app (via sync) e o agente (via Edge Function) usam o mesmo `dominio/` para validar, calcular e montar linhas. Nenhuma conta é feita fora do domínio.
- **Sem servidor próprio e sem chave de serviço em produção:** o navegador e a Edge Function falam com o Postgres com o token do próprio usuário; o RLS vale para os dois.

---

## 2. Stack final

| Camada | Escolha | Observação |
|---|---|---|
| UI | **React 18.3** + TypeScript strict (`noUncheckedIndexedAccess`, como na v1) + **Vite 8** | mesma versão do Prisma (18.3.1), para o design system copiado funcionar sem ajuste |
| Estilo | **Tailwind v4** (`@tailwindcss/vite`) + `design-system/` do Prisma (`@ds`) | seção 6 |
| Roteamento | **React Router 7** (`createBrowserRouter`, rotas com `lazy`) | sai o hash router da v1; a Netlify faz o fallback de SPA **[D33]** |
| Estado local | **Dexie 4** (já existe) + `dexie-react-hooks` (`useLiveQuery`) | a UI lê do Dexie e re-renderiza quando ele muda |
| Estado da sessão de treino | store mínima própria (`useSyncExternalStore`) no lugar de `@preact/signals` | o reducer do treino continua puro em `dominio/` **[D34]** |
| Estado do servidor | **TanStack Query 5** | só para o que é online por natureza: rascunhos, códigos de compartilhamento, perfil remoto, estado da sync **[D34]** |
| Dados remotos | **@supabase/supabase-js 2**, carregado **depois** da 1ª tela | mantém o JS inicial ≤ 200 KB **[D45]** |
| PDF | pdfjs-dist 4.10.x sob demanda (como na v1); jsPDF sob demanda | a extração ganha a variante "com colunas" da dieta |
| PWA | vite-plugin-pwa (`generateSW`, `prompt`) | sem `runtimeCaching` para o Supabase: o offline é o Dexie, não o cache HTTP |
| Testes | Vitest, Playwright (Chromium 390×844), testes de RLS contra o projeto real (padrão Prisma) | seção 14 |
| Hospedagem | **Netlify** (site estático; deploy só quando o Thiago pedir) + **Supabase** (projeto novo, `sa-east-1`) | seção 13 |
| Conector | Edge Function **`agente-mcp`** (Deno) com `@modelcontextprotocol/server`, `@supabase/server`, `zod` (mesmas versões do Prisma) | seção 11 |

---

## 3. Estrutura de pastas

```
App_Treino/
  BRIEFING.md · BRIEFING-v2.md · README.md · AGENTS.md · CLAUDE.md · DESIGN.md    # DESIGN.md e AGENTS.md vêm do Prisma (adaptados)
  netlify.toml                                                                        # headers do Prisma + CSP com o Supabase
  docs/  ARCHITECTURE.md · PLAN.md · VALIDACAO.md (v1)
         v2/ ARCHITECTURE.md · PLAN.md · DECISOES.md · VALIDACAO.md (por marco)
         Repz - Mockup identidade Prisma.pdf
  referencia/            # v1 (parser) e dieta/ (protótipos da v2); fora do build e do lint
  dados-reais/           # NO .gitignore: PDF do NutriDiet, backups, prints
  design-system/         # copiado do Prisma; marca trocada para Repz
  supabase/
    config.toml
    migrations/          # AAAAMMDDhhmmss_vN_assunto.sql
    seeds/               # gerados por script: referencias.sql, alimentos.sql (TACO + rótulos)
    functions/agente-mcp/  index.ts · deno.json
  scripts/               # gerar-icones, verificar-dist (v1) + gerar-seeds, anonimizar-nutridiet, backup, restaurar-backup, manter-ativo
  src/
    dominio/             # PURO, importável pelo app e pela Edge Function (seção 4)
      (v1) formato/ periodizacao/ progressao/ treino/ rotacao historico cardio similaridade datas numeros tipos
      prontidao/         # check-in, prontidão baixa (7.3)
      motor/             # motor v2: moduladores P1-P5, snapshot, ids de regra, parâmetros versionados (8.1-8.3)
      auditoria/         # métricas e teste retroativo (8.4)
      corpo/             # média 7 d, tendência 4 sem, bioimpedância (9)
      dieta/             # parser NutriDiet, vinculação, totais, substituições, tipo de dia de hoje (10)
      agente/            # prévias, validação de rascunhos, montagem de linhas, contexto (13) — sem I/O
      referencias.ts     # semente da tabela `referencias` (fonte única; o SQL é gerado dela)
      sync/              # regras puras da sync: ordem das tabelas, LWW, mescla de pull
    pdf/                 # extrair.ts (v1) + extrairLinhas.ts (colunas por TAB, dieta)
    dados/               # Dexie por usuário: schema, repositórios, outbox, backup/CSV/PDF (v1)
    remoto/              # interface Remoto + SupabaseRemoto + MemoriaRemoto (testes/E2E)
    app/                 # stores, controlador do treino, sincronizador, sessão de auth, PWA, wake lock, descanso
    ui/                  # React: layout (AppShell, BottomNav, menu ☰), telas/, componentes específicos do Repz
  tests/
    unit/ dados/ pdf/ e2e/ (v1, continuam)
    unit/{prontidao,motor,auditoria,corpo,dieta,agente,sync}/   # novos
    rls/                 # contra o projeto real; pulados sem .env.local
    agente/              # ferramentas do conector com banco falso; travas; grafo de imports da função
    fixtures/            # + nutridiet-anonimizado.linhas.json, backup-v1 do Thiago anonimizado, históricos sintéticos
```

---

## 4. Camadas e o domínio compartilhado

### 4.1 Regra de dependência (lint, como na v1)

| Camada | Pode importar | Não pode importar |
|---|---|---|
| `dominio/` | só `dominio/` | DOM, Dexie, Supabase, React, `fs`, `Date.now()` implícito, `crypto` global |
| `pdf/` | `pdfjs-dist` | o resto |
| `dados/` | `dominio/`, Dexie | `remoto/`, `app/`, `ui/` |
| `remoto/` | `dominio/`, supabase-js | `dados/`, `app/`, `ui/` |
| `app/` | `dominio/`, `dados/`, `remoto/`, `pdf/` | `ui/` |
| `ui/` | tudo acima + `@ds` | `design-system/components/**` direto |
| `supabase/functions/agente-mcp` | `dominio/`, pacotes `npm:` fixados | `dados/`, `remoto/`, `app/`, `ui/` |

`dominio/` continua sem relógio: `hoje`/`agora` (e agora o **fuso**) chegam por parâmetro. Os ids (uuid) também chegam de fora (`gerarId` injetado), para os testes serem determinísticos e o Deno não depender de `crypto.randomUUID` do navegador.

### 4.2 Como o Deno importa o domínio **[D35]**

Igual ao Prisma, que já faz isso em produção: **import relativo direto**, sem cópia nem pacote.

```ts
// supabase/functions/agente-mcp/index.ts
import { sugerirV2 } from '../../../src/dominio/motor/sugerir.ts';
```

- O Deno exige a extensão no import. Os imports **dentro de `src/dominio/`** passam a ter `.ts` (`'../datas.ts'`), com `allowImportingTsExtensions` no `tsconfig` (o projeto já é `noEmit`). Vite e Vitest aceitam. É uma troca mecânica, sem mudar comportamento (os 274 testes da v1 provam).
- Uma regra de lint (`import-x/extensions: always` restrita a `src/dominio/**`) impede que um import sem extensão volte.
- Teste `tests/agente/grafo.test.ts`: percorre o grafo de imports da função e falha se algo fora de `src/dominio/` (ou um `npm:` fora da lista fixa) for alcançado.
- O `supabase functions deploy` empacota os arquivos alcançados pelo grafo. Plano B, se um dia recusar arquivos fora de `supabase/functions/`: script `agente:sync` que copia `src/dominio` para `supabase/functions/_dominio` antes do deploy (o Prisma documentou o mesmo plano B).

---

## 5. Migração Preact → React

### 5.1 Estratégia **[D36]**

Troca **de uma vez, dentro do marco V1**, numa sequência de commits pequenos, com os E2E da v1 como oráculo. Não há convivência Preact + React (dobraria o bundle e o trabalho).

1. `dominio/`, `pdf/` e a maior parte de `dados/` **não mudam** (só a extensão `.ts` dos imports do domínio).
2. `app/`: `estado.ts` (signals) vira stores com `useSyncExternalStore`; `controlador-treino.ts`, `descanso.ts`, `wake-lock.ts` e `pwa.ts` perdem a dependência de signals e passam a notificar inscritos. A lógica e os efeitos ficam iguais.
3. `ui/`: cada tela é reescrita em React com os componentes do `@ds`, **mantendo os nomes acessíveis** (rótulos, `aria-label`, textos de botão) usados pelos E2E. Onde o mockup muda um texto ou a navegação, o E2E muda junto e o motivo vai para `DECISOES.md`.
4. O hash router sai; as rotas viram caminhos (`/treino`, `/historico`, `/plano`). Os E2E que fazem `goto('#/…')` trocam a URL **[D33]**.
5. A v1 continua publicada no GitHub Pages, congelada na tag `v1.0`, até os dois usuários migrarem (seção 8.8). O workflow deixa de publicar a `main` no Pages **[D32]**.

### 5.2 Mapa das telas v1 → v2

| v1 | v2 |
|---|---|
| Aba Treino (Início, Registro, Descanso, Fim) | **Início** (card lime "Treino de hoje") e **Treino** (botão central) |
| Aba Histórico (exercício, Treinos) | menu ☰ → **Histórico** (mais cardio) |
| Aba Plano (Importar, Revisar, Plano e dados) | menu ☰ → **Plano de treino**; dados, backup e preferências → **Configurações** |
| Cardio (`#/treino/cardio`) | ação **Registrar cardio** no Início e no Treino; menu ☰ → **Cardio** |
| — | **Corpo**, **Dieta**, **Coach**, **Referências**, **Perfil**, login |

---

## 6. Design system

- **Cópia** de `design-system/` e `DESIGN.md` do Prisma, com o lint de aderência (`design-system/lint/adherence.js`) e o alias `@ds`. Troca só da **marca**: nome "Repz" e um logo provisório no `Logo` (o `logo-mark.png` do Prisma sai). Paleta lime/forest, fontes Urbanist, Plus Jakarta Sans e Space Grotesk e todos os tokens ficam.
- A Inter e os `tokens.css`/`componentes.css` da v1 saem. O contraste AA da D28 é reconferido com os tokens do Prisma (o E2E de axe continua).
- **Tema:** segue o sistema (`prefers-color-scheme`), como no Prisma, com o `theme-dark.css` dele. Preferência opcional "claro/escuro/sistema" em `preferencias.tema`.
- **Componentes novos do Repz** (fora do `@ds`, em `ui/componentes/`, só com tokens): seletor de RIR, campo de carga com ±salto, cartão de sugestão ↑ = ↓ !, cronômetro de descanso, folha de check-in, selo "Offline · salvo no celular". Cores das sugestões: ↑ `surface-brand`/lime, = cinza, ↓ `text-owe`/`surface-owe`, ! `warning`. Nunca azul ou roxo (o azul das variantes e o roxo dos bi-sets da v1 também saem).
- **Ícones:** Lucide do `@ds` (113 SVGs). Ícone de treino na barra inferior: o "activity" do mockup.
- **Galeria** `/design-system` (como no Prisma), só no build de desenvolvimento.

---

## 7. Supabase

### 7.1 Projeto e Auth **[D37]**

- Projeto novo `repz`, região `sa-east-1`, na conta do Thiago (o Prisma continua no dele). O plano gratuito permite **2 projetos ativos**: com o Prisma, o Repz ocupa o segundo.
- **Auth: e-mail + senha, cadastro fechado.** "Allow new users to sign up" desligado; o Thiago convida pelo painel (Authentication → Invite user), o convidado define a senha pelo link. Sem login social. Recuperação de senha pelo e-mail. O SMTP do Brevo do Prisma pode ser reaproveitado se o SMTP padrão (limite de poucos e-mails por hora) atrapalhar; com 2 usuários, não deve.
- A sessão (refresh token) fica no `localStorage` do supabase-js. **Offline, o app funciona com a última sessão conhecida** e só renova o token quando volta a rede. Se o refresh token expirar, o app pede login de novo **sem apagar nada local** (a fila de envio fica esperando o mesmo usuário).
- **Mais de uma conta no mesmo aparelho:** um banco Dexie por usuário (`repz-<user_id>`). "Sair" com envios pendentes avisa e oferece esperar a sincronização.

### 7.2 Convenções do esquema

Toda tabela de dados do usuário tem:

```sql
id            uuid primary key,                 -- gerado no cliente (uuid v7: ordena por tempo)
user_id       uuid not null default auth.uid() references auth.users on delete cascade,
criado_em     timestamptz not null,             -- relógio do cliente
atualizado_em timestamptz not null,             -- relógio do cliente; base do last-write-wins
excluido_em   timestamptz null,                 -- soft delete (propaga pela sync)
servidor_em   timestamptz not null default now()-- relógio do SERVIDOR, gravado por trigger em todo insert/update; cursor do pull
```

- Trigger `lww` (BEFORE UPDATE): se `new.atualizado_em < old.atualizado_em`, a escrita é **ignorada** (devolve `old`). Isso faz o last-write-wins no próprio banco, inclusive contra escritas do agente.
- Trigger `carimbar_servidor` (BEFORE INSERT/UPDATE): `servidor_em = clock_timestamp()`.
- RLS em **todas** as tabelas, no padrão do Prisma (`revoke all` de `anon`; políticas separadas de select/insert/update; **sem delete**: apagar é `excluido_em`):
  ```sql
  create policy dono on public.<t> for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  create policy agente_trava on public.<t> as restrictive for all to authenticated
    using ((select public.cliente_oauth_permitido())) with check ((select public.cliente_oauth_permitido()));
  ```
- Índices: `(user_id, servidor_em)` em todas (pull) e os de consulta de cada tabela.
- Migrações versionadas (`npm run db:push`), tipos gerados (`npm run db:tipos`), como no Prisma. Sem Supabase local (dispensa Docker).

### 7.3 Tabelas

O banco guarda **fatos**. Os derivados (médias, tendências, totais, substituições, sugestões futuras) saem do domínio; a exceção é o log de sugestões, que é histórico.

| Grupo | Tabela | Colunas principais (além das da 7.2) | Observação |
|---|---|---|---|
| Perfil | `perfis` | nome, nascimento, altura_cm, sexo, objetivo, fuso (`America/Sao_Paulo`), tem_relogio | 1 linha por usuário; `id = user_id` |
| | `preferencias` | nao_come (text[]), som_descanso, vibrar, manter_tela_ligada, tema, lembrete_medidas_dias, tolerancias_subst (jsonb) | 1 linha por usuário |
| Treino | `planos_treino` | nome, autor, data_plano, importado_em, ativo, inicio_bloco, ajuste_semana, texto_original, arquivo_nome, **estrutura jsonb** (progressão, bloco, sessões com itens, cardio, avisos de importação), origem (`app`/`agente`/`compartilhado`) | **[D38]** plano como documento; índice único parcial `(user_id) where ativo and excluido_em is null` |
| | `config_exercicio` | chave, incremento_kg, foco, apelido_de | `unique (user_id, chave)`; id determinístico (uuid v5 de user+chave) para não duplicar offline |
| Execução | `treinos` | plano_id, sessao_id, sessao_nome, data, inicio, fim, semana_bloco, status, estado_ui jsonb, notas jsonb, checkin_id | o treino em andamento também sincroniza (é o backup dele) |
| | `series` | treino_id, exercicio_prescrito_id, chave, variante, ordem, kg, reps, rir, aquecimento, feita_em, sugestao_id | `sugestao_kg`/`sugestao_aceita` da v1 migram para o log (`sugestoes`) |
| | `cardio` | tipo, data, inicio, minutos, distancia_km, fc_media, kcal_relogio, esforco, nota, origem (`manual`/`print`) | |
| Prontidão | `checkins` | data, sono_horas (passo 0,5), disposicao (1-5, opcional), origem (`manual`/`print`), pulado | `unique (user_id, data)` com id v5 |
| Motor | `parametros_motor` | versao (int), parametros jsonb, ativo, motivo, aprovado_em, rascunho_id | índice único parcial de ativo; a versão 1 é semeada no 1º login com o `CONFIG_PROGRESSAO` |
| | `sugestoes` | treino_id, exercicio_prescrito_id, chave, variante, versao_motor, versao_parametros, regra, entradas jsonb, prontidao jsonb, acao, carga, motivo, alertas; depois: carga_usada, desfecho (`aceita`/`editada`/`ignorada`), resultado jsonb | **[D39]** uma linha por exercício por treino |
| Corpo | `medicoes_peso` | data, hora, kg (1 casa), condicao (`jejum`/`outra`), origem | |
| | `medicoes_bio` | data, gordura_pct, massa_gorda_kg, musculo_esq_kg, agua_pct, origem (`relogio`) | |
| | `medicoes_fita` | data, local (texto livre configurável), cm | |
| Dieta | `alimentos` | user_id **nulo** = base global (TACO/rótulo); nome, fonte, kcal, p, c, g, fibra por 100 g, grupo_substituicao, base_id | **[D40]** global somente leitura; o usuário edita criando uma cópia sua (`base_id`) |
| | `alimentos_alias` | texto_normalizado, alimento_id | o vínculo confirmado é reaproveitado nas próximas importações |
| | `planos_alimentares` | origem (`nutridiet`/`agente`/`manual`), data_consulta, profissional, ativo, arquivo_nome, **estrutura jsonb** (tipos de dia → refeições → itens com texto original, alimento_id, gramas, medida caseira; notas; substituições do nutricionista; vínculo tipo de dia ↔ sessões) | **[D38]** documento, como o plano de treino |
| Agente | `rascunhos` | tipo, conteudo jsonb, previa text, avisos jsonb, expira_em (30 min), confirmado_em, descartado_em, resultado jsonb, origem (`agente`/`app`) | online apenas (não vai para o Dexie) |
| | `avisos` | tipo, texto, link, lido_em, chave_dedupe | `unique (user_id, chave_dedupe) where lido_em is null` (sem duplicar não lidos) |
| | `comentarios_agente` | alvo (`treino`/`semana`/`bloco`), alvo_id/periodo, texto, versao, substitui_id | versões guardadas |
| | `execucoes_rotina` | rotina, executada_em, resumo | |
| | `auditorias` | periodo, versao_parametros, metricas jsonb | |
| | `agente_clientes` | client_id, nome, autorizado_em, revogado_em | clientes OAuth aprovados **por cada usuário** **[D41]** |
| Compartilhamento | `compartilhamentos_plano` | plano_id, codigo, expira_em (7 dias), usado_por, usado_em | leitura só do dono; o resgate é por RPC |
| Ciência | `referencias` | chave (pk), citacao, doi_url, nivel (`forte`/`moderada`/`limitada`/`pratica`), resumo, sustenta text[] | **global, somente leitura** (sem `user_id`), semeada de `dominio/referencias.ts` |

### 7.4 Funções no banco (RPC, `security definer`, `search_path = ''`)

| Função | O que faz |
|---|---|
| `cliente_oauth_permitido()`, `via_conector()` | iguais às do Prisma, sem a exigência de admin: token de app passa; token do conector só se o `client_id` estiver aprovado **pelo próprio usuário** |
| `gerar_codigo_plano(plano_id)` | cria o código curto (8 caracteres, base32 sem ambíguos), válido por 7 dias, de uso único |
| `resgatar_plano(codigo)` | valida (existe, não expirou, não usado, não é do próprio usuário), copia o documento do plano para a conta de quem chamou com **ids novos**, `inicio_bloco` nulo, `ativo = false`, `origem = 'compartilhado'`; não copia histórico, foco, saltos nem config |
| `confirmar_rascunho_reservar(id)` | marca `confirmado_em` só se ainda pendente e não expirado (um "sim" repetido não grava duas vezes) |
| `excluir_conta()` | apaga todos os dados do usuário e a conta (padrão `fase9d_excluir_conta` do Prisma) |

### 7.5 Edge Functions

Só a `agente-mcp` (seção 11). Leve: só o Thiago e o irmão usam, e só pelo Claude.

---

## 8. Sincronização offline

### 8.1 Princípios
1. **A escrita local nunca espera a rede.** Registrar série, check-in, cardio ou peso grava no Dexie numa transação e coloca a operação na fila; a tela segue.
2. **IDs no cliente** (uuid v7), então criar treino e séries offline não gera conflito.
3. **Idempotência:** o envio é `upsert` por `id`; reenviar a mesma linha não duplica.
4. **Nada é apagado de verdade pela sync:** exclusão = `excluido_em`.

### 8.2 Dexie v2 (por usuário)
- As stores da v1 (`planos`, `treinos`, `series`, `cardio`, `configExercicios`, `meta`) ganham `atualizadoEm`, `excluidoEm`, `servidorEm` e `sync` (`'ok' | 'pendente'`), mais as stores novas (checkins, sugestoes, parametros, medições, planos alimentares, alimentos usados, avisos, comentários, referências).
- Store **`outbox`**: `{ seq (auto), tabela, id, linha, enfileiradoEm, tentativas, ultimoErro }`. A linha guardada é o **estado completo** da linha no momento (não um diff), então só a última versão de cada `(tabela, id)` precisa subir: ao enfileirar, uma entrada pendente anterior da mesma linha é substituída.
- Toda escrita de repositório faz, na mesma transação Dexie: grava a linha (`sync = 'pendente'`, `atualizadoEm = agora`) **e** a entrada da outbox. Ou entra tudo, ou nada (como a transação série + `estadoUI` da v1).

### 8.3 Envio (push)
- O `sincronizador` (em `app/`) roda: ao abrir o app, ao voltar a rede (`online`), ao voltar ao primeiro plano, depois de cada escrita (com espera de 2 s para agrupar) e a cada 60 s enquanto houver pendência.
- Envia em lotes por tabela, **na ordem das dependências** (`dominio/sync/ordem.ts`: planos → config → checkins → treinos → sugestões → séries → cardio → corpo → dieta), com `upsert(..., { onConflict: 'id' })`.
- Sucesso: remove da outbox e marca a linha `sync = 'ok'` **se** `atualizadoEm` não mudou nesse meio-tempo.
- Erro de rede: mantém, tenta depois (espera exponencial até 5 min). Erro de validação/RLS (4xx): marca `ultimoErro`, para de tentar aquela entrada e mostra em Configurações → Sincronização ("1 registro não sincronizou: …", com "Tentar de novo" e "Exportar"). Nunca descarta sozinho.
- Durante o treino, a sync roda em segundo plano e **nunca bloqueia** a tela.

### 8.4 Recebimento (pull)
- Por tabela, `select * where servidor_em > cursor order by servidor_em limit 1000` (pagina até acabar); o cursor de cada tabela fica no `meta` local.
- Mescla (`dominio/sync/mesclar.ts`, puro): se a linha local está `pendente` e tem `atualizadoEm` maior, a local vence (vai subir); senão, a remota substitui a local. Soft delete chega como `excluidoEm` e some das telas.
- Quando roda: ao abrir o app, depois de cada envio, ao voltar a rede, e quando o usuário puxa para atualizar no Início. **Sem Realtime** (custo e bateria; 1 aparelho por pessoa).
- O que o agente grava (plano confirmado, aviso, comentário, peso de um print) chega por esse pull.

### 8.5 Conflitos
- **Last-write-wins por linha** pelo `atualizado_em` do cliente, aplicado no banco pelo trigger `lww` (7.2) e no Dexie pela mescla (8.4).
- Caso de dois aparelhos (ex.: celular e PC): edições em linhas **diferentes** nunca conflitam (cada série é uma linha). Na **mesma** linha vence a última edição pelo relógio do aparelho; um relógio muito adiantado poderia vencer indevidamente, risco aceito (R6). Treino em andamento em dois aparelhos ao mesmo tempo não é suportado: o 2º aparelho mostra "Treino em andamento em outro aparelho" quando recebe um `em_andamento` mais recente.
- `config_exercicio` e `checkins` usam id determinístico (uuid v5 de `user_id` + chave/data): dois aparelhos criando "o mesmo" registro geram o mesmo id, e não duas linhas.

### 8.6 Treino em andamento
- 100% local até concluir, como na v1: cada evento grava série + `estado_ui` numa transação Dexie e enfileira. A sync sobe o que der, quando der (isso também protege contra perder o celular no meio do treino).
- As sugestões do dia são calculadas **no aparelho** com o que está no Dexie (motor, prontidão, parâmetros ativos), então nada no treino depende de rede.

### 8.7 Indicador
- Selo discreto "Offline · salvo no celular" (mockup, tela 2) quando `navigator.onLine` é falso **ou** há pendências há mais de 1 min.
- Configurações → Sincronização: pendências, última sincronização, erros e "Sincronizar agora".

### 8.8 Migração da v1 **[D42]**
- A v1 está em `thiagofcosta.github.io/repz`; a v2 estará num domínio da Netlify. **São origens diferentes: o IndexedDB da v1 não é visível pela v2.** O caminho é o backup JSON que a v1 já gera.
- No 1º login, sem dados na conta, a v2 oferece "Trazer seus dados da v1": seleciona o `treino-backup-AAAA-MM-DD.json` → `migrarBackup()` (v1, puro) → `deV1ParaV2()` (puro: cria `user_id`, carimbos, sugestões a partir de `sugestaoKg/sugestaoAceita`, `config_exercicio` com ids v5) → grava no Dexie e enfileira tudo.
- A v1 fica no ar (congelada) até os dois confirmarem que os dados chegaram. Só então o repositório pode virar privado (D43).

---

## 9. Onde roda cada cálculo **[D44]**

Tudo é função pura em `dominio/`; a coluna diz **quem chama**.

| Cálculo | Módulo | App (offline) | Edge Function |
|---|---|---|---|
| Parser TREINO v1, prescrição, semana do bloco, rotação | `formato/`, `periodizacao/`, `rotacao` | importar, treino | `preparar_plano_treino`, `contexto` |
| Motor de carga v1 (16 cenários) + moduladores P1-P4 | `progressao/`, `motor/` | pré-carga e "Para o próximo" | `sugestoes`, `teste_retroativo` |
| Prontidão (sono < 6 h, < média 14 d − 1,5 h, disposição ≤ 2) | `prontidao/` | check-in | `prontidao`, `contexto` |
| Log de sugestão (snapshot e desfecho) | `motor/snapshot.ts` | ao pré-carregar e ao concluir o treino | — |
| Validação de parâmetros (limites rígidos) | `motor/parametros.ts` | Coach (aprovar) | `preparar_parametros_motor` |
| Auditoria (7 métricas) e teste retroativo | `auditoria/` | Coach (exibe) | `auditoria_motor`, `teste_retroativo` |
| Média de 7 dias, tendência de 4 semanas, P5 (perda > 0,7 %/sem por 2 sem) | `corpo/` | Corpo, Início | `corpo`, revisão semanal |
| Parser NutriDiet, vinculação (alias + Jaro-Winkler) | `dieta/parser.ts`, `dieta/vincular.ts` | importar dieta | `preparar_plano_alimentar` (valida o JSON) |
| Totais por tipo de dia, substituições, tipo de dia de hoje | `dieta/` | Dieta → Hoje | `dieta_vigente` |
| e1RM por semana, recordes, KPIs (v1) | `historico` | Histórico | `historico_exercicio` |
| Prévias e linhas dos rascunhos | `agente/` | confirmar no app | `preparar_*`, `confirmar` |

**Substituições não são gravadas [D40]:** com 6 a 9 candidatos por grupo, o cálculo é instantâneo; elas são calculadas na revisão da importação (para o usuário conferir) e na tela, a partir dos alimentos em cache. Assim nunca ficam desatualizadas quando a base ou o `nao_come` mudam.

---

## 10. Módulos novos do domínio

### 10.1 Motor v2 (`dominio/motor/`)
- **O motor da v1 não é reescrito.** `sugerirV2(entrada)` monta a entrada da v1 e chama o mesmo `sugerir()`. As regras P2 e P3 precisam olhar dentro da regra 3 e da regra 4; elas entram como **opção** de `sugerir()` (`opts.prontidaoPorTreino`), e **sem essa opção o comportamento é byte a byte o da v1** (teste: os 16 cenários rodando pelo `sugerirV2` sem check-in dão o mesmo resultado).
- P1 é aplicada depois: se a prontidão do dia é baixa e a ação é `aumentar`, vira `manter` com a carga anterior e o motivo "Prontidão baixa hoje: mantenha a carga". P4 só acrescenta um alerta. P5 não está no motor: é um alerta do coach (`corpo/`).
- Toda saída ganha `regra` (`'0' | '0b' | '1' … '7' | 'P1' | 'P3'`), `versaoMotor` (`'2.0.0'`) e `versaoParametros`.
- `ParametrosMotor` = os da v1 (`pausaDias`, `reducaoPausa`, `quedaLimite`, …) + os novos (`sonoMinimoH` 6, `sonoAbaixoMediaH` 1,5, `disposicaoBaixa` 2, `descansoMinimoH` 48, `perdaPesoSemanalPct` 0,7). `validarParametros()` aplica os limites rígidos (ex.: `toleranciaRir` 0,5-2; `pausaDias` 14-35; `aumentoMax` 2-10 %) e recusa fora deles.

### 10.2 Log de sugestões **[D39]**
- **Quando nasce:** ao montar a sessão do treino, uma linha por exercício (a sugestão que pré-carrega a 1ª série), com o snapshot das entradas. O cartão "Para o próximo" do fim **não** gera linha: ele é uma prévia, e a sugestão real é recalculada no treino seguinte com a prontidão daquele dia.
- **Quando fecha:** ao concluir o treino, `fecharSugestao()` preenche `carga_usada` (carga de trabalho), `desfecho` (`aceita` se todas as séries de trabalho usaram a carga sugerida; `editada` se não; `ignorada` se o exercício foi pulado) e `resultado` (reps e RIR contra a faixa e o alvo).
- `series.sugestao_id` liga cada série à sugestão do exercício naquele treino.

### 10.3 Corpo (`dominio/corpo/`)
- Média de 7 dias: média das pesagens dos 7 dias corridos até a data (com mais de uma no dia, vale a primeira; em jejum tem prioridade).
- Tendência de 4 semanas: regressão linear (mínimos quadrados) das pesagens dos últimos 28 dias → kg/semana e % do peso/semana; exige ≥ 6 pesagens em ≥ 2 semanas, senão "dados insuficientes".
- Bioimpedância: série com tendência; o músculo esquelético é exibido com destaque menor e o aviso de precisão (`galaxybia2025`).

### 10.4 Dieta (`dominio/dieta/`)
- `parseNutriDiet(linhas)`: porte tipado de `referencia/dieta/nutridiet.js`, recebendo as linhas já extraídas (`pdf/extrairLinhas.ts`, porte de `extrair-linhas.js`). Resultado conferido com o PDF real nesta Fase 0: **4 tipos de dia, 26 refeições, 91 itens, 4 notas (3 textos distintos: "Beber 3L de água" aparece em dois dias) e 2 avisos**. O briefing fala em 3 notas; a fixture vai fixar 4.
- `vincular(item, alias, base)`: alias salvo → Jaro-Winkler (o `similaridade.ts` da v1) sobre o nome normalizado → candidato com nota; abaixo de 0,85 fica "sem vínculo" para a revisão.
- `totais(tipoDeDia, alimentos)`, `substituir(item, alimento, candidatos, nao_come, tolerancias)`: porte de `substituicoes.js`, com os grupos e tolerâncias como dados (`GRUPOS`) e o `nao_come` vindo das preferências. Os casos da seção 10.3 do briefing viram testes.
- `tipoDeDiaDeHoje(plano, treinoPlanejadoOuFeito, vinculos)`.

### 10.5 Referências (`dominio/referencias.ts`)
- Lista tipada (chave, citação, DOI, nível, resumo, regras que sustenta). As 7 da semente do briefing entram **só depois de conferidas na fonte** (PubMed/DOI) no marco V4; o que for convenção sem estudo (−10 % após pausa, 0,7 %/semana) fica como `pratica`.
- `scripts/gerar-seeds.mjs` gera `supabase/seeds/referencias.sql` desse arquivo; um teste garante que o SQL está em dia. O app também tem a lista embutida (funciona offline).

---

## 11. Conector MCP (`agente-mcp`)

### 11.1 Base: a função do Prisma
A `supabase/functions/agente-mcp/index.ts` do Prisma (465 linhas) é o modelo: `pipeline([withOAuthProtectedResource, withSupabase({ auth: 'user' })])`, `McpServer` + `createMcpHandler`, ferramentas com `zod` e anotações (`readOnlyHint` etc.), portão com limite de 60 chamadas/min, rascunho com reserva antes de executar, logs sem dados. **Diferenças no Repz [D41]:**

| | Prisma | Repz |
|---|---|---|
| Quem usa | só o admin | **cada usuário, para a própria conta** (o Thiago agora; o irmão se quiser) |
| Cifragem | chave do agente (`AGENTE_SEGREDO`) abre a chave mestra | **sem cifragem no cliente** (D43): não há chave do agente nem segredo |
| Trava | token com `client_id` só passa se for do admin e de cliente aprovado | token com `client_id` só passa se o cliente foi aprovado **pelo dono do token** |

### 11.2 Autorização
- **OAuth 2.1 Server do Supabase** (beta, disponível no plano gratuito, conferido pelo Prisma em 15/11/2026), com chave JWT assimétrica. Descoberta em `…/functions/v1/agente-mcp/oauth-protected-resource` pelo `WWW-Authenticate` do 401. Deploy com `--no-verify-jwt`.
- Tela de consentimento no Repz em `/oauth/consentir` (fora do shell, carregada à parte): mostra o cliente ("Claude"), o que ele poderá fazer, Permitir/Negar; só aceita retorno do Claude (`https://claude.ai/api/mcp/auth_callback` ou `claude.com`).
- Configurações → **Agente do Claude**: clientes autorizados e "Revogar".
- O isolamento entre usuários **é o RLS**: a função só tem o token do usuário que conectou. O agente do Thiago não tem como ler os dados do irmão, nem que tente (teste em `tests/rls/conector.test.ts`).

### 11.3 Ferramentas
Leitura (`readOnlyHint`): `contexto` (sempre primeiro), `treinos`, `historico_exercicio`, `sugestoes`, `prontidao`, `cardio`, `corpo`, `dieta_vigente`, `auditoria_motor`, `teste_retroativo`, `referencias`, `exportar_dados` (paginado, 500 linhas), `avisos_pendentes`.
Gravação em dois passos: `preparar_plano_treino` (texto TREINO v1 → mesmo parser), `preparar_plano_alimentar` (JSON validado por `zod` + domínio), `preparar_registro` (peso, bio, fita, cardio, sono; usado para prints), `preparar_parametros_motor` (uma mudança por vez, com o teste retroativo anexado), `confirmar`, `descartar`.
Só texto, sem confirmação: `registrar_aviso` (dedupe de não lidos), `gravar_comentario` (com versões), `registrar_execucao`.

- `preparar_*` devolve `rascunho_id`, a prévia em uma linha, `avisos` (ex.: "já existe peso em 26/11") e `pendencias` (com pendência, não há rascunho). Vale 30 min.
- `confirmar` reserva o rascunho (RPC), monta as linhas com `dominio/agente/` e grava com `origem = 'agente'`. Se uma linha falhar no meio, marca as já gravadas como excluídas.
- **Confirmar pelo app** (aviso "Plano novo para revisar"): o app lê o rascunho (online), mostra a mesma prévia na tela de revisão e, no "Confirmar", reserva o rascunho e grava pelo caminho normal (Dexie + outbox), com as linhas montadas pela **mesma** função do domínio.
- Instruções do servidor em pt-BR, no padrão do Prisma: `contexto` primeiro; nada gravado sem "sim"; contas só pelas ferramentas; citar referências pela chave; não prescrever medicação nem suplementação clínica; na dieta, lembrar que não substitui o nutricionista.

### 11.4 Rotinas agendadas
Tarefas agendadas no Claude, criadas pelo Thiago (o app não agenda nada): revisão semanal (domingo à noite), auditoria do motor (fim de bloco ou mensal, até 1 proposta), lembrete de medidas. Cada uma termina com `registrar_execucao`, visível no Coach.

---

## 12. Segurança e privacidade

- RLS em todas as tabelas + `agente_trava`; `revoke all` de `anon`; sem `delete` (soft delete). Teste de RLS com dois usuários reais de teste: A não lê, não insere com o `user_id` de B, não altera linha de B, nem pelo conector.
- **Nenhuma chave de serviço no cliente.** O app recusa uma chave `sb_secret_…` em `VITE_SUPABASE_ANON_KEY` (como o Prisma). A chave secreta só em `.env.local` (scripts) e nos Secrets do GitHub (backup).
- **CSP** (`netlify.toml` + `<meta>`): `connect-src 'self' https://<projeto>.supabase.co`. O teste de privacidade da v1 (`verificar-dist.mjs`) passa a permitir **só** a URL do projeto Supabase **[D46]**.
- **Sem cifragem no cliente [D43]:** os dados de saúde ficam legíveis para quem administra o projeto Supabase (o Thiago, pelo painel). A proteção é o RLS entre usuários, a conta do Supabase com 2FA e o repositório sem dados. O irmão precisa saber disso antes de entrar. (O Prisma cifra porque guarda finanças de amigos; aqui seria o triplo de complexidade no conector e no pull, sem ganho entre dois irmãos.)
- **Repositório:** nenhum dado real no git (`dados-reais/` no `.gitignore` já nesta Fase 0); fixtures anonimizadas geradas por `scripts/anonimizar-nutridiet.mjs`, que roda só na máquina do Thiago. Recomendação: tornar privado depois da migração da v1 (D47).
- Logs da Edge Function sem valores, nomes, ou conteúdo de rascunho.
- Excluir a conta apaga tudo (RPC + Auth). Export dos dados do usuário pelo app (JSON + CSV, os formatos da v1 ampliados).

---

## 13. Hospedagem, custo e operação

| Serviço | Uso | Para não pagar |
|---|---|---|
| Netlify (Free) | site estático, `netlify.toml` com os headers do Prisma, fallback `/* → /index.html` | Deploy Previews e Branch deploys desligados; **deploy só quando o Thiago pedir** (cada um consome créditos) |
| Supabase (Free) | Postgres, Auth, OAuth Server, 1 Edge Function | 2º projeto ativo da conta; sem Storage (prints ficam no Claude), sem Realtime; < 50 MB previstos |
| GitHub Actions | CI (lint, tipos, unit, build, E2E com remoto em memória) + **keep-alive diário** + backup diário cifrado (padrão Prisma) | ~2 min/dia; cabe nos 2.000 min/mês de repo privado |

- **Pausa do Supabase após 7 dias sem uso:** o keep-alive diário evita; se pausar, o app continua funcionando offline e a fila sobe quando o projeto for reativado.
- `scripts/backup.ts` e `scripts/restaurar-backup.ts` copiados do Prisma (dump das tabelas do Repz, cifrado, guardado como artefato do Actions).

---

## 14. Estratégia de testes

| Nível | O que cobre | Onde roda |
|---|---|---|
| Domínio (Vitest) | **tudo da v1 continua** (274 testes); prontidão; P1-P5 e combinações com as regras da v1; **"sem check-in = v1"** nos 16 cenários; snapshot e desfecho; limites de parâmetros; 7 métricas de auditoria e teste retroativo com históricos sintéticos; média e tendência de peso (valores calculados à mão); parser NutriDiet (fixture anonimizada: 4/26/91/4/2), vinculação, totais (±1 kcal dos da seção 10.2), substituições (todos os casos da 10.3), exclusões; regras da sync (ordem, LWW, mescla); prévias do agente; cobertura ≥ 95 % em `dominio/` | CI |
| Dados (Vitest + fake-indexeddb) | v1 continua; outbox atômica com a escrita; substituição da entrada pendente; mescla do pull; import do backup v1 → v2 | CI |
| Sync com remoto falso | `MemoriaRemoto` que simula o Postgres (upsert, trigger LWW, cursor): offline → online sem perda nem duplicidade; reenvio idempotente; conflito de dois aparelhos; erro 4xx não trava a fila | CI |
| RLS (Vitest, projeto real) | A × B em todas as tabelas; `referencias` e alimentos globais só leitura; `resgatar_plano`; trava do conector | local / CI com secrets; pulado sem `.env.local` |
| Conector | ferramentas com banco falso (como `tests/agente` do Prisma); grafo de imports; todas as tabelas com `agente_trava` | CI |
| E2E (Playwright) | **os E2E da v1 no app React** (com login simulado e `MemoriaRemoto` via `VITE_REMOTO=memoria`); novos: treino completo offline → reconectar → dados no remoto; importar NutriDiet → revisar → substituições; check-in com sono baixo → sem aumento; compartilhar plano entre duas contas | CI |
| E2E real (`npm run e2e:supabase`) | os 4 fluxos novos contra o projeto real com as contas de teste | local, antes de fechar marco |
| Privacidade e bundle | `verificar-dist.mjs` (só o Supabase liberado); JS inicial ≤ 200 KB gzip; Início interativo < 2 s com CPU 4× | CI |
| Manual | roteiro no celular por marco (`docs/v2/VALIDACAO.md`) | Thiago e irmão |

---

## 15. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Perder dados na troca v1 → v2 (origens diferentes) | import do backup v1 no 1º login; v1 no ar até confirmar; repo privado só depois (D42, D47) |
| R2 | Sync perde ou duplica séries | outbox na mesma transação; upsert idempotente; ids no cliente; E2E offline → online; nada é descartado sozinho |
| R3 | Supabase pausa ou fica fora | o app é offline-first; keep-alive diário; a fila espera |
| R4 | Refresh token expira offline (viagem longa) | sessão continua local; pede login só para sincronizar; nada local é apagado |
| R5 | Bundle passa de 200 KB com React + Router + Query + supabase-js + Dexie | rotas `lazy`; supabase-js carregado depois da 1ª tela; medido no CI (D45) |
| R6 | Relógio do aparelho errado distorce o LWW | uso de 1 aparelho por pessoa; `servidor_em` para o pull; aviso se o relógio divergir > 5 min do servidor |
| R7 | OAuth Server do Supabase está em beta | o Prisma já usa; se mudar, o conector para mas o app não depende dele |
| R8 | Edge Function recusar imports de fora de `supabase/functions/` | plano B `agente:sync` (cópia gerada) |
| R9 | PDF do NutriDiet mudar de layout | parser tolerante + revisão obrigatória; plano alimentar também pelo agente (JSON) |
| R10 | Vinculação errada de alimento distorce totais e substituições | confirmação na revisão; alias editável; aviso "rótulo genérico — confira o seu" |
| R11 | Regras novas "inteligentes" demais no motor | P1-P5 só modulam; mudança de lógica só por código e teste; mudança de valor só com aprovação e teste retroativo |
| R12 | Repositório público com dados de saúde | `dados-reais/` ignorado; fixtures anonimizadas; privado após a migração (D47) |
| R13 | Migração do design system quebrar a acessibilidade da v1 | E2E de axe e alvos ≥ 44 px continuam no CI |
| R14 | Limite de 2 projetos ativos no Supabase gratuito (hoje: `Prisma` e `Prisma-restore`) | liberar a vaga do `Prisma-restore` antes do V1 (pausar ou excluir); uma restauração do Prisma no futuro precisa de vaga livre |
