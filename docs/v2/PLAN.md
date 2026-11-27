# PLAN v2 — Repz

> Fase 0 da v2. Refina a seção 15 do `BRIEFING-v2.md`. Arquitetura em `docs/v2/ARCHITECTURE.md`; decisões em `docs/v2/DECISOES.md`.
> Cada marco termina com: testes verdes (os 274 da v1 inclusive), app rodando localmente, roteiro do que testar no celular (`docs/v2/VALIDACAO.md`), pendências e commits pequenos (`tipo(escopo): descrição`).
> **Deploy na Netlify só quando o Thiago pedir.** Migrações no Supabase do Repz podem ser aplicadas por mim (`db:push`) depois que o projeto existir.

## Ordem e dependências

```
V0 Fase 0 ─► V1 Base ─► V2 Sync ─► V3 Treino+ ─► V4 Motor v2 ─┬─► V7 Conector ─► V8 Auditoria ─► V9 Multiusuário e entrega
                                     │                         │
                                     └──► V5 Corpo ────────────┤
                                     └──► V6 Dieta ────────────┘
```

- **V1 e V2 vêm primeiro e juntos garantem a prioridade nº 1** (não perder dados): sem eles, nenhum dado novo deveria entrar.
- **V5 (Corpo) e V6 (Dieta) só dependem do V2** e podem andar em paralelo ao V3/V4, cada um numa sessão própria, como foi feito na v1 (M3-M7). O domínio da dieta (parser, vinculação, substituições) não depende de nada e pode começar já no V1.
- **V7 (Conector) depende de V4, V5 e V6**, porque as ferramentas expõem os três. **Um conector único e completo, entregue de uma vez no V7** (resposta N4 do Thiago, 26/11/2026): nada de versão mínima antes.
- **V8 depende do V4 (log de sugestões) com algumas semanas de uso real**: auditoria sem histórico não diz nada.

---

## V0 · Fase 0 (este documento)

- [x] `BRIEFING-v2.md`, `referencia/dieta/` e o mockup no repositório; `dados-reais/` no `.gitignore` (o PDF real está na pasta, fora do git).
- [x] Protótipo da dieta rodado com o PDF real: 4 tipos de dia, 26 refeições, 91 itens, 2 avisos, totais da seção 10.2 conferidos; 4 notas, não 3 (D48).
- [x] Código da `agente-mcp` do Prisma localizado (`Finanças/Projeto_App_Financas/supabase/functions/agente-mcp/index.ts`): **a decisão 16.2 não precisa mais de ação do Thiago**.
- [x] `docs/v2/ARCHITECTURE.md`, `docs/v2/PLAN.md`, `docs/v2/DECISOES.md` (D32-D48).
- [x] **Aprovado pelo Thiago em 26/11/2026**, com as recomendações abaixo.

---

## V1 · Base

**Tarefas**
1. Tag `v1.0`; workflow deixa de publicar a `main` no Pages (D32).
2. Imports do `src/dominio/` com `.ts`, `allowImportingTsExtensions`, regra de lint (D35). Os 274 testes continuam verdes.
3. React 18.3 + `@vitejs/plugin-react` + React Router 7 (D33) + TanStack Query + `dexie-react-hooks`; sai Preact/signals (D34). ESLint com `react-hooks`.
4. `design-system/` e `DESIGN.md` copiados do Prisma, marca Repz com logo provisório, alias `@ds`, Tailwind v4, lint de aderência, galeria `/design-system` só em dev. Sai a Inter.
5. AppShell do mockup: topo (☰, logo, busca, avisos, avatar), barra inferior Início · Corpo · **Treino** · Dieta · Coach, menu ☰ (Histórico, Cardio, Plano de treino, Plano alimentar, Referências, Configurações, Perfil, Sair). Telas novas como "em breve".
6. **Telas da v1 portadas sem mudar comportamento:** Início, Registro, Descanso/bi-set, Fim, Cardio, Histórico/Treinos, Importar/Revisar, Plano de treino, Configurações (dados, backup, CSV, PDF, preferências), boas-vindas de instalação, aviso de atualização.
7. Projeto Supabase `repz` (`sa-east-1`) ligado à CLI; Auth e-mail + senha com cadastro fechado (D37); `supabase/config.toml`; migração `v1_esquema` com **todas** as tabelas da ARCHITECTURE 7.3, convenções da 7.2 (triggers `lww` e `carimbar_servidor`), RLS, `agente_trava` e as RPCs da 7.4; seeds de `referencias` (só as conferidas) e `alimentos` (TACO + rótulos) gerados por script; tipos gerados.
8. Login, "esqueci a senha", Perfil, Sair (com aviso de pendências); Dexie por usuário (`repz-<user_id>`, ainda sem sync).
9. `remoto/` com a interface `Remoto`, `SupabaseRemoto` e `MemoriaRemoto`; modo de teste `VITE_REMOTO=memoria` com login simulado para os E2E.
10. `netlify.toml` (headers do Prisma, CSP com o Supabase, fallback de SPA); `verificar-dist.mjs` com a exceção do Supabase (D46); orçamento de bundle (D45).
11. Testes de RLS (`tests/rls/`) com dois usuários de teste; `.env.example`.
12. CI: lint → typecheck → unit → build → privacidade/bundle → E2E (remoto em memória); keep-alive diário do Supabase.

**Feito no V1 (26-27/11/2026)**
- Projeto Supabase `repz` (`ltyhmmqdkenhntalegrt`, São Paulo); o `Prisma-restore` foi pausado para liberar a vaga.
- v1 congelada no Pages (tag `v1.0`, D32); imports do domínio com `.ts` (D35).
- Preact → React 18.3 (D34, D36); bug de ordem das séries no mesmo segundo corrigido (D50).
- Design system do Prisma, moldura do mockup, React Router 7 por caminhos (D33); logo provisório (16.4).
- Esquema completo com RLS, base TACO, RPCs; cadastro fechado (D37); login, Perfil, Sair; banco local por usuário.
- `remoto/` (Supabase sob demanda e memória para os E2E); CSP e teste de privacidade só com o Supabase (D46, D49).
- `netlify.toml` (sem deploy) e keep-alive diário (`.github/workflows/diario.yml`, secrets já configurados).
- Ficam para depois, sem bloquear o V1: Configurações separadas de "Plano e dados" (V2, junto com a tela de
  sincronização), galeria `/design-system` (quando houver componente próprio), TanStack Query (entra no V2/V7 com
  os dados online) e a semente de `referencias` (V4, depois de conferir cada citação).

**Aceite**
- [x] Todos os E2E da v1 passam no app React (21/21, com o novo de login; só a navegação mudou, D36).
- [x] Login e "Sair" funcionam contra o projeto real (conferido no navegador com a conta de teste; o E2E usa o remoto em memória).
- [x] Testes de RLS verdes: 11 testes contra o projeto real (A × B em todas as tabelas, sem delete, base global e referências só leitura, last-write-wins, compartilhar plano).
- [x] Axe sem violações; JS inicial 151 KB gzip (limite 200); Início < 2 s com CPU 4× (E2E de desempenho).
- [ ] Revisão no celular (`docs/v2/VALIDACAO.md`, V1): depende do deploy na Netlify e da conta do Thiago.

---

## V2 · Sincronização

**Tarefas**
1. Dexie v2: carimbos (`atualizadoEm`, `excluidoEm`, `servidorEm`, `sync`) e store `outbox`; todos os repositórios gravam linha + outbox na mesma transação.
2. `dominio/sync/`: ordem das tabelas, mescla LWW, ids v5 para `config_exercicio` e `checkins`.
3. `app/sincronizador.ts`: push em lotes por ordem de dependência, pull por `servidor_em`, gatilhos (abrir, `online`, primeiro plano, após escrita, a cada 60 s com pendência), espera exponencial, erros 4xx parados e visíveis.
4. Selo "Offline · salvo no celular"; Configurações → Sincronização (pendências, última sync, erros, "Sincronizar agora").
5. Import do backup da v1 no 1º login (D42), com resumo e confirmação.
6. Treino em andamento em outro aparelho: aviso.
7. Testes: outbox atômica; reenvio idempotente; offline → online sem perda nem duplicidade (com `MemoriaRemoto`); conflito de dois aparelhos; 4xx não trava a fila; backup v1 do Thiago (anonimizado) → v2; E2E "treino completo offline → reconectar → dados no remoto"; o mesmo E2E contra o projeto real (`e2e:supabase`).

**Aceite**
- [ ] Treino completo offline sincroniza depois **sem perda nem duplicidade** (E2E nos dois remotos).
- [ ] Desinstalar o app, instalar de novo e entrar: tudo volta do Supabase.
- [ ] Thiago e irmão importam o backup da v1 na v2 e conferem histórico e sugestões (no celular). Depois disso, D47 (repo privado) pode ser executada.

---

## V3 · Treino+

**Tarefas**
1. `dominio/prontidao/`: média de sono de 14 dias, prontidão baixa (sono < 6 h, < média − 1,5 h, disposição ≤ 2), parâmetros vindos de `parametros_motor`.
2. Folha de check-in ao tocar **Iniciar treino**: stepper de 0,5 h pré-preenchido (noite anterior ou média), disposição 1-5 opcional, "Pular"; grava `checkins` (id v5 por data).
3. Cardio de primeira classe: "Registrar cardio" no Início e no Treino (Bicicleta padrão), campos novos (hora, kcal do relógio, nota); histórico de cardio (minutos/semana, sessões, FC média) com a meta do `CARDIO:`.
4. **Início novo** do mockup: card lime "Treino de hoje" (sessão, semana/fase/RIR, nº de exercícios, duração, Trocar/Iniciar), "Esta semana" (treinos, séries, cardio), avisos (lista vazia até o V7), insights (placeholder até o V4/V5).
5. Testes: prontidão (bordas 6 h, média com < 14 noites, disposição ausente); E2E check-in em ≤ 2 toques (Iniciar → Começar) e "Pular"; E2E cardio.

**Aceite**
- [ ] Check-in resolvido em ≤ 2 toques; cardio registrado em ≤ 20 s (cronometrado no E2E e no celular).
- [ ] Início igual ao mockup (tela 1) nos dois temas, no celular.

---

## V4 · Motor v2 e Referências

**Tarefas**
1. `dominio/motor/`: `sugerirV2` sobre o `sugerir` da v1; P1-P4; ids de regra; `versaoMotor`; opção `prontidaoPorTreino` no motor da v1 sem mudar o comportamento padrão.
2. Parâmetros versionados: `parametros_motor` v1 semeada no 1º login; `validarParametros()` com limites rígidos; troca de versão só por rascunho (o fluxo de aprovação no app entra no V8).
3. Log de sugestões (D39): criar ao montar a sessão, fechar ao concluir; `series.sugestao_id`; migração dos campos da v1.
4. P5 em `dominio/corpo/` (a regra fica pronta aqui; o alerta aparece quando o V5 tiver peso).
5. UI: "Prontidão baixa hoje: mantenha a carga" no registro; "Pouco descanso desde a última vez"; "Por quê?" em cada sugestão abrindo a referência.
6. `dominio/referencias.ts`: as 7 referências **conferidas na fonte** (PubMed/DOI), com nível; seed gerado; tela Mais → **Referências** (funciona offline).
7. Testes: os 16 cenários da v1 inalterados **e** rodando pelo `sugerirV2` sem check-in; P1-P5 isolados e combinados (P1 + regra 5; P2 + regra 3; P3 + regra 4 com e sem repetição em prontidão normal); snapshot completo; desfecho; limites; E2E "check-in com sono baixo → sem aumento no dia".

**Aceite**
- [ ] 16 cenários da v1 + os novos verdes.
- [ ] Cada sugestão gravada com snapshot completo (versões, regra, entradas, prontidão, ação, carga, motivo) e fechada ao concluir o treino.

---

## V5 · Corpo

**Tarefas**
1. `dominio/corpo/`: média de 7 dias, tendência de 4 semanas (regressão, kg/sem e %/sem, "dados insuficientes"), série da bioimpedância, P5.
2. Tela **Corpo** (mockup, tela 4): herói com a média, gráfico de tendência (pesagens + média; `AreaChart` do `@ds` ou SVG da v1), composição e medidas, aviso de precisão da bioimpedância.
3. Registrar peso (1 casa, teclado numérico, ≤ 3 toques), bioimpedância, medidas com fita (locais configuráveis); lembrete de medidas a cada 2-4 semanas.
4. Adaptação sem relógio: sem dado de bio/sono por print, os cards somem (`perfis.tem_relogio` + ausência de dado).
5. Insight "Peso (média 7d)" no Início.
6. Testes: média e tendência com valores calculados à mão; bordas (pesagens duplicadas no dia, buracos); P5 disparando só com 2 semanas seguidas.

**Aceite**
- [ ] Tendência correta com os dados de teste.
- [ ] Irmão (sem relógio) vê só peso e fita.

---

## V6 · Dieta

**Tarefas**
1. `pdf/extrairLinhas.ts` (colunas por TAB, porte de `extrair-linhas.js`) e `dominio/dieta/parser.ts` (porte tipado de `nutridiet.js`).
2. `scripts/anonimizar-nutridiet.mjs` (roda só na máquina do Thiago, lê `dados-reais/`): gera `tests/fixtures/nutridiet-anonimizado.linhas.json` com nome, data, peso e altura trocados. Mais um PDF sintético no mesmo layout (gerado com jsPDF) para testar a extração no CI.
3. Base: seed TACO 4ª ed. (597 alimentos; "Tr" = 0, "*"/"NA" = sem dado) + rótulos genéricos ("rótulo genérico — confira o seu"); cópia editável por usuário (D40); citação da fonte na tela e em Referências (`taco2011`).
4. Vinculação: alias salvo → Jaro-Winkler → confirmação na revisão; aliases reaproveitados.
5. Substituições: grupos e tolerâncias como dados, `nao_come` nas preferências (Thiago: feijão, abacate, arroz integral, peixe), 3-5 opções por item, substituições do nutricionista primeiro e marcadas, aviso fixo.
6. Revisão da importação: cabeçalho, tipos de dia, refeições, itens com vínculo, itens sem gramas (decisão 16.6), notas, **vínculo tipo de dia ↔ sessões** (decisão 16.5).
7. Telas **Dieta → Hoje** (mockup, tela 5: donut, refeições com horário, itens com gramas e medida caseira, substituições ao tocar, notas no topo) e planos anteriores; menu ☰ → Plano alimentar.
8. Testes: parser com a fixture (4 dias, 26 refeições, 91 itens, 4 notas, 2 avisos — D48); extração com o PDF sintético; totais da seção 10.2 (±1 kcal); todos os casos de substituição da 10.3; exclusões; E2E "importar NutriDiet → revisar → ver substituições".

**Aceite**
- [ ] PDF real importado com 0 erros (no celular, pelo Thiago).
- [ ] Substituições da seção 10.3 reproduzidas nos testes.

---

## V7 · Conector

**Tarefas**
1. Ativar o OAuth 2.1 Server no projeto (chave JWT assimétrica); `agente_clientes`; tela `/oauth/consentir`; Configurações → Agente do Claude (clientes, revogar).
2. `supabase/functions/agente-mcp/index.ts` no padrão do Prisma (D35, D41): portão (60/min), instruções em pt-BR, ferramentas de leitura, `preparar_*`/`confirmar`/`descartar` com reserva, textos sem confirmação.
3. `dominio/agente/`: prévias em uma linha, validação, montagem de linhas, contexto.
4. App: avisos no Início (lidos/não lidos), comentário do coach no fim do treino (chega depois, com internet), aviso "Plano novo para revisar" com confirmação no app, tela **Coach** (revisão semanal, comentários, execuções das rotinas; auditoria e propostas como "em breve" até o V8).
5. Testes: ferramentas com banco falso; grafo de imports; todas as tabelas com `agente_trava`; RLS do conector (token do Thiago não lê o irmão); confirmar duas vezes grava uma vez; rascunho expirado.
6. Roteiro para o Thiago conectar o Claude e criar as rotinas agendadas (revisão semanal, lembrete de medidas).

**Aceite**
- [ ] Claude conectado lê o `contexto`, grava um aviso e importa um plano de treino com prévia e "sim".
- [ ] Um peso extraído de print entra só depois da confirmação.

---

## V8 · Auditoria

**Tarefas**
1. `dominio/auditoria/`: as 7 métricas (mínimo de N treinos para "efeito da prontidão") e `testeRetroativo(historico, parametrosA, parametrosB)`.
2. Ferramentas `auditoria_motor`, `teste_retroativo`, `preparar_parametros_motor` (uma mudança por vez, com o teste anexado).
3. Coach: card de auditoria (mockup, tela 6), proposta com "Ver teste retroativo" e "Aprovar" (cria a nova versão ativa com motivo e `aprovado_em`), histórico de versões; rotina de auditoria.
4. Testes: métricas com históricos sintéticos calculados à mão; teste retroativo idêntico com parâmetros iguais; aprovação troca a versão ativa e as sugestões seguintes usam a nova.

**Aceite**
- [ ] Proposta de ajuste ponta a ponta (agente propõe → teste retroativo visível → Aprovar → nova versão em uso).

---

## V9 · Multiusuário e entrega

**Tarefas**
1. Convite do irmão (painel), primeiro acesso, perfil sem relógio, lista `nao_come` própria.
2. Compartilhar plano: gerar código (7 dias, uso único), resgatar, cópia independente (`resgatar_plano`).
3. Export dos dados do usuário (JSON + CSV); excluir conta; backup e restauração do Supabase (`scripts/backup.ts`, `restaurar-backup.ts`, cifrado no Actions).
4. Polimento: acessibilidade, desempenho, textos; README da v2; `docs/v2/VALIDACAO.md` completo.
5. Deploy na Netlify **quando o Thiago pedir**; Site URL e Redirect URLs no Supabase.
6. Testes: E2E "compartilhar plano entre duas contas" (memória e real); RLS do resgate; backup → restaurar.

**Aceite**
- [ ] Dois usuários com o mesmo plano e dados isolados.
- [ ] Checklist da v1 (`docs/VALIDACAO.md`) + da v2 completos no celular.

---

## Decisões da seção 16 do briefing

| # | Tema | Situação | Bloqueia | Recomendação |
|---|---|---|---|---|
| 16.1 | Repositório privado | **aprovada** | executar no fim do V2 | Privado, só depois da migração da v1 (D47): no GitHub gratuito, privado derruba o Pages e a v1 com os dados de vocês |
| 16.2 | Código da `agente-mcp` do Prisma | **resolvida** | — | Achei no seu computador (`Finanças/Projeto_App_Financas/supabase/functions/agente-mcp`); nada a fazer |
| 16.3 | Auth | **aprovada** | — | E-mail + senha com cadastro fechado e convite (D37), como o Prisma |
| 16.4 | Logo | **aprovada** | — | Provisório gerado no V1; troca quando o Thiago quiser |
| 16.5 | Tipo de dia ↔ sessão | **aprovada** | — | Vale: Legs ↔ "Perna + Bike"; Push/Pull/Upper ↔ "Superiores + Bike" quando houver bike no dia, senão "Dias de Exercício"; sem treino ↔ "Descanso". Editável na revisão |
| 16.6 | Itens sem gramas | **aprovada** | — | Tabela pequena de medidas caseiras com peso padrão (ex.: castanha-do-pará ≈ 4 g/unidade, banana prata média ≈ 90 g), **pré-preenchida e editável** na revisão, marcada "peso estimado" |
| 16.7 | PDF mais recente | sem plano novo informado | não bloqueia | A fixture usa o de 12/05/2026; se vier um plano novo, ele entra em `dados-reais/` antes do V6 |

## Perguntas novas desta Fase 0

| # | Pergunta | Resposta (26/11/2026) |
|---|---|---|
| N1 | Não cifrar no cliente (D43)? | **De acordo.** O irmão é avisado de que o dono do projeto vê os dados pelo painel |
| N2 | Há outro projeto ativo no Supabase além do Prisma? | Sim: **`Prisma-restore`** (ensaio de restauração do Prisma, 29/10). Os 2 projetos ativos do plano gratuito estão ocupados: **liberar uma vaga bloqueia a criação do projeto `repz` no V1** (pausar ou excluir o `Prisma-restore`, a decidir) |
| N3 | Congelar a v1 no Pages (D32)? | **De acordo** |
| N4 | Conector mínimo antes? | **Não: um conector único e completo no V7** |

## Roteiro de entrega por marco

Como na v1: (1) o que mudou, em 3-5 linhas; (2) o que testar no celular, passo a passo; (3) pendências e riscos; (4) perguntas.
