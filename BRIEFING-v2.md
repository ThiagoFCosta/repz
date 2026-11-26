# BRIEFING v2 — Repz: treino, corpo, dieta e coach

> **Para o Claude Code.** Este documento descreve a **v2 do Repz**. A v1 (PWA offline, dados só no aparelho) já está implementada neste repositório: marcos M0–M7, ver `docs/PLAN.md`. A v2 **evolui o código existente**, não recomeça. O núcleo de domínio da v1 (formato TREINO v1, periodização, rotação, motor de carga e seus testes) continua valendo e é a base de tudo.
>
> O `BRIEFING.md` (v1) continua sendo a especificação das partes que não mudam. Quando este documento disser "como na v1, seção X", vale o que está lá.
>
> Material de apoio no kit (`repz-v2-kit/`):
> - mockup aprovado: `docs/Repz - Mockup identidade Prisma.pdf`;
> - protótipos testados da dieta: `referencia/dieta/`;
> - base TACO: `referencia/dieta/taco.json`;
> - PDF real do NutriDiet: `dados-reais/`, **nunca versionar**, ver seção 2.

---

## 0. Como trabalhar com este documento

1. Leia tudo, mais o `BRIEFING.md` (v1), o `docs/ARCHITECTURE.md` e o `docs/PLAN.md` atuais.
2. **Fase 0 da v2, sem código de produto:**
   - Escreva `docs/v2/ARCHITECTURE.md`: stack, migração Preact → React, design system, Supabase (schema, RLS, Edge Functions), sincronização offline, conector MCP, onde roda cada cálculo, estratégia de testes, riscos.
   - Escreva `docs/v2/PLAN.md`: marcos (sugestão na seção 15), tarefas, critérios de aceite e ordem.
   - Liste as decisões da seção 16 que ainda bloqueiam algo.
   - **Pare e peça aprovação do Thiago.**
3. Um marco por vez. Cada marco termina com testes verdes, um roteiro do que testar no celular e commits pequenos.
4. **Os testes da v1 não podem quebrar.** Se uma regra da v1 mudar, o teste muda junto e o motivo vai para o `docs/v2/DECISOES.md`.
5. **Prioridade quando houver dúvida:** não perder dados > registrar treino sem internet > privacidade dos dados de saúde > poucos toques por série > visual.

---

## 1. O que muda da v1 para a v2

| | v1 (implementada) | v2 (este documento) |
|---|---|---|
| Dados | Só no aparelho (IndexedDB) | **Supabase como fonte da verdade** + cópia local para treinar offline |
| Usuários | Cada um no seu celular, sem conta | **Contas** (Supabase Auth), dados isolados por usuário (RLS). Primeiros usuários: Thiago e o irmão |
| Entrada do plano | PDF com anexo TREINO v1 ou texto colado | O mesmo + **o agente (Claude) grava o plano pelo conector**, com prévia e confirmação + **compartilhar plano** entre usuários |
| Inteligência | Motor de carga no app | Motor v2 com **prontidão** (sono, disposição, descanso), **registro de cada sugestão**, **parâmetros versionados** e **auditoria contínua** pelo agente |
| Novos módulos | — | **Corpo** (peso, bioimpedância, medidas), **Dieta** (plano alimentar importado do NutriDiet, com substituições calculadas), **Cardio** (bike) de primeira classe, **Coach** (revisões, avisos, auditoria), **Referências científicas** |
| Agente | — | **Conector MCP** próprio (Supabase Edge Function), no mesmo padrão do conector do Prisma |
| UI | Preact, tema escuro próprio | **React + design system do Prisma** (tokens, fontes, componentes), com marca Repz |
| Hospedagem | GitHub Pages | **Netlify** (app) + **Supabase** (banco, auth, funções) |

**O que fica igual:** formato TREINO v1, periodização, rotação, o motor de carga da v1 (regras e 16 cenários), a máquina de estados do treino, o cronômetro por timestamp e o wake lock. A experiência de registrar uma série com 2 toques também não muda.

---

## 2. Princípios (não negociáveis)

1. **Offline-first na academia.** Registrar o treino (séries, descanso, check-in, cardio) funciona **100% sem internet**. A gravação local é imediata e a sincronização acontece quando houver conexão. A falta de sinal nunca pode travar uma série.
2. **Contas em código, nunca de cabeça.** Motor de carga, médias, tendências, déficit, totais da dieta, substituições e métricas de auditoria são **funções puras e testadas** no domínio. O agente **chama** essas funções pelo conector, nunca recalcula por conta própria. É a mesma regra do conector do Prisma.
3. **O usuário sempre confirma.** Tudo o que o agente grava (plano de treino, plano alimentar, registros extraídos de prints, mudança de parâmetro do motor) passa por **rascunho → prévia → "sim" explícito → confirmar**. Só texto de análise (avisos, comentários) dispensa confirmação.
4. **Evidência explícita.** Toda regra que usa um dado fisiológico (sono, déficit, bioimpedância, RIR) cita ao menos uma referência da tabela `referencias`, com o nível de evidência. O app tem uma tela de **Referências** (seção 11), sem destaque, acessível pelo menu.
5. **Privacidade de dados de saúde.** RLS em todas as tabelas. Cada usuário vê só os próprios dados. O conector age **apenas em nome do usuário autenticado**: o agente do Thiago **nunca** lê os dados do irmão. Nenhuma chave de serviço no cliente.
6. **Repositório público.** O `repz` hoje é público. **Nenhum dado real** (PDF do NutriDiet, backups, exports, prints) entra no git. Use uma pasta `dados-reais/` no `.gitignore`, como no Prisma, e fixtures **anonimizadas** nos testes. Avalie e recomende tornar o repositório privado na Fase 0.
7. **Custo zero.** Planos gratuitos do Netlify e do Supabase, sem cartão. **Deploy no Netlify só quando o Thiago pedir**: cada deploy consome créditos do plano gratuito (mesma regra do Prisma, ver `netlify.toml` dele).
8. **Interface em pt-BR, carga em kg, peso em kg com 1 casa, medidas em cm.**

---

## 3. Stack

| Camada | Escolha | Observação |
|---|---|---|
| UI | **React 18 + TypeScript strict + Vite** | Migrar do Preact. `dominio/` não muda |
| Estilo | **Tailwind v4 + design system do Prisma** copiado para `design-system/` | Ver seção 12 |
| Dados remotos | **Supabase** (Postgres + Auth + Edge Functions) | Mesma conta do Thiago, **projeto separado** do Prisma |
| Dados locais | **Dexie** (já existe) como cache + fila de sincronização | Seção 5 |
| Estado servidor | TanStack Query | Como no Prisma |
| Roteamento | React Router 7 | Como no Prisma |
| PWA | vite-plugin-pwa | Já existe |
| PDF | pdfjs-dist (sob demanda) | Treino e dieta |
| Testes | Vitest, Playwright, testes de RLS | Como no Prisma (`tests/rls`) |
| Hospedagem | **Netlify** (estático) | Headers de segurança iguais aos do Prisma |
| Conector | **Supabase Edge Function `agente-mcp`** (Deno) | O Prisma já usa: `https://<projeto>.supabase.co/functions/v1/agente-mcp` |

**Referências do Prisma.** O Thiago tem o repositório `financas-app` e o kit traz um zip dele.
- Copie o padrão de: `netlify.toml`, `supabase/` (migrations + RLS), `tests/rls`, `design-system/`, `DESIGN.md`, `AGENTS.md`/`CLAUDE.md`, scripts de backup e restauração.
- O **código da função `agente-mcp` não está no zip**. Peça ao Thiago que rode `supabase functions download agente-mcp` no projeto do Prisma, ou que aponte o arquivo, e use-o como referência de autenticação, protocolo MCP e padrão preparar/confirmar.

**Domínio compartilhado.** `src/dominio/` deve ser TypeScript puro (sem DOM, sem Dexie, sem Supabase), importável **pelo app e pela Edge Function**. O agente usa exatamente o mesmo motor, a mesma auditoria e as mesmas contas da dieta que o app. Defina na Fase 0 como empacotar isso para o Deno (import map, cópia gerada no build ou pacote local).

---

## 4. Modelo de dados (Supabase)

Proposta inicial. Refine em `docs/v2/ARCHITECTURE.md`.
- Toda tabela de usuário tem `id uuid` (gerado no cliente, para funcionar offline), `user_id uuid references auth.users`, `criado_em`, `atualizado_em` e `excluido_em` (soft delete), com RLS `user_id = auth.uid()`.
- O banco guarda **fatos**. Derivados (médias, tendências, sugestões futuras, totais) são calculados pelo domínio. A exceção é o **log de sugestões**, que é um fato histórico.

| Grupo | Tabelas |
|---|---|
| Perfil | `perfis` (nome, data de nascimento, altura, sexo, objetivo, unidade), `preferencias` (alimentos que não come, bipe, vibração, tela ligada, tema) |
| Treino | `planos_treino` (+ `texto_original` TREINO v1, `inicio_bloco`, `ajuste_semana`, `ativo`), `sessoes_template`, `exercicios_prescritos`, `config_exercicio` (salto, foco, apelido) — como na v1, seção 8 |
| Execução | `treinos`, `series` (kg, reps, RIR, aquecimento, `sugestao_id`), `cardio` (tipo, minutos, distância, FC média, kcal do relógio, esforço, origem) |
| Prontidão | `checkins` (data, sono em horas, disposição 1-5 opcional, origem: manual ou print) |
| Motor | `parametros_motor` (versão, JSON dos parâmetros, ativo, motivo, aprovado_em), `sugestoes` (snapshot: versão do motor, regra, entradas, contexto de prontidão, carga sugerida, ação, motivo; depois: carga usada, aceita/editada/ignorada, resultado da sessão seguinte) |
| Corpo | `medicoes_peso` (kg, data, hora, condição), `medicoes_bio` (gordura %, massa gorda, músculo esquelético, água, origem: relógio), `medicoes_fita` (local, cm) |
| Dieta | `alimentos` (base TACO + rótulos genéricos + itens do usuário; macros por 100 g; `grupo_substituicao`; `fonte`), `planos_alimentares` (origem, data da consulta, profissional, ativo), `dieta_dias` (nome do tipo de dia, ex. "Perna + Bike"; vínculo com sessões), `refeicoes`, `itens_refeicao` (texto original, alimento vinculado, gramas, medida caseira), `notas_dieta` |
| Agente | `rascunhos` (tipo, conteúdo, prévia, expira em 30 min, estado), `avisos` (tipo, texto, link, lido), `comentarios_agente` (alvo: treino/semana/bloco, texto, versões), `execucoes_rotina`, `auditorias` (período, métricas, versão avaliada) |
| Compartilhamento | `compartilhamentos_plano` (plano de origem, código, expira em, usado por) |
| Ciência | `referencias` (chave, citação, DOI/URL, nível de evidência, resumo pt-BR, regras que sustenta) — **global, somente leitura** |

---

## 5. Sincronização offline

- **Padrão outbox:** toda escrita vai primeiro para o Dexie com `sync_pendente = true` e entra numa fila. Um sincronizador envia a fila em ordem quando houver rede e marca o que foi confirmado.
- **IDs gerados no cliente** (uuid v7 ou v4), para criar treino e séries offline sem conflito.
- **Conflitos:** last-write-wins por linha, usando `atualizado_em`. Na prática, cada usuário escreve de um aparelho; documente o caso de dois aparelhos.
- **Leitura:** o app lê do Dexie, e o TanStack Query atualiza o Dexie a partir do Supabase ao abrir o app e após sincronizar.
- **Treino em andamento:** 100% local até concluir. Cada série é gravada localmente na hora (v1) e sincroniza quando der.
- **Indicador discreto:** "Offline · salvo no celular" (ver mockup) e contagem de pendências em Configurações.
- **Migração da v1:** importar o backup JSON da v1 (o formato já existe) para a conta do usuário no primeiro login.

---

## 6. Usuários, convite e compartilhamento de plano

- **Auth:** e-mail e senha ou magic link (o mesmo do Prisma, se possível). Sem login social na v2.
- **Irmão do Thiago:** treina junto, faz os mesmos exercícios, com cargas, objetivos e dados próprios. **Não tem relógio:** os cards de bioimpedância e de sono por print somem quando não há dado. Sono e peso entram manualmente.
- **Compartilhar plano:** em Plano de treino, "Compartilhar" gera um **código curto** (válido por 7 dias). O outro usuário digita o código e recebe uma **cópia independente** do plano: as mesmas sessões e as mesmas chaves de exercício, mas com início de bloco, foco, saltos e histórico próprios. Cópia, não vínculo: alterar o plano de um não altera o do outro.
- Nada de ranking ou comparação entre usuários na v2.

---

## 7. Treino, cardio e prontidão

### 7.1 Treino
Como na v1, seções 5, 6, 7, 9 e 14. Novidades:
- **Entrada do plano pelo agente:** a ferramenta `preparar_plano_treino` recebe um texto TREINO v1, roda o **mesmo parser**, grava um rascunho e devolve a prévia. O usuário confirma no chat ou no app (aviso "Plano novo para revisar"). A importação de PDF e de texto colado continua igual.
- **Escolha da semana:** sem mudança.

### 7.2 Cardio (bike)
- Ação rápida no Início e na aba Treino: **"Registrar cardio"**, com Bicicleta como padrão.
- Campos: tipo, data e hora, duração (min), distância (km, opcional), FC média (opcional), kcal do relógio (opcional), esforço 0-10 (opcional), nota.
- **Por print:** o usuário manda o print do resumo do exercício do Samsung Health para o agente, que extrai os números e chama `preparar_registro` (tipo cardio). O registro só vale depois da confirmação.
- **Histórico:** minutos por semana, sessões e FC média, com a meta do plano (`CARDIO:` do TREINO v1) quando houver.

### 7.3 Prontidão (check-in pré-treino)
- Ao tocar em **Iniciar treino**, uma folha inferior pergunta: **"Quantas horas você dormiu?"** (stepper de 0,5 h, pré-preenchido com o valor da noite anterior ou com a média) e, opcionalmente, **"Disposição"** (1-5). Precisa ser resolvida em ~2 segundos, com um botão "Pular".
- O check-in também pode chegar por print do sono do relógio, via agente.
- **Prontidão baixa** (padrões configuráveis em `parametros_motor`): sono < 6 h, **ou** sono < média dos últimos 14 dias − 1,5 h, **ou** disposição ≤ 2.
  - O limite de 6 h vem da definição de perda de sono da meta-análise de Craven et al. (2022), ver seção 11.

---

## 8. Motor de carga v2

**Base:** o motor da v1 inteiro (seção 7 do `BRIEFING.md`; código em `src/dominio/progressao`), com os 16 cenários intocados.

### 8.1 Prontidão como modulador, não como fórmula
O RIR e as reps registradas já refletem como a pessoa está no dia (autorregulação). Por isso a prontidão **não entra como fator multiplicativo na carga**. Ela muda **quais regras disparam**:

| # | Regra nova | Efeito |
|---|---|---|
| P1 | **Prontidão baixa no início do treino** | A pré-carga do dia **não aplica aumentos**: se a sugestão era ↑, usa a carga anterior. Mostra "Prontidão baixa hoje: mantenha a carga". Reduções continuam valendo |
| P2 | **Treino feito com prontidão baixa** | Não conta para a regra 3 da v1 (queda em 2 treinos seguidos): vira "queda explicada pelo sono" |
| P3 | **Abaixo da faixa (regra 4 da v1) num treino com prontidão baixa** | Vira **manter**, com nota. Só reduz se acontecer de novo num treino com prontidão normal |
| P4 | **< 48 h desde a última execução do mesmo exercício** | Só aviso: "Pouco descanso desde a última vez" |
| P5 | **Perda de peso > 0,7% do peso por semana por 2 semanas** (tendência, seção 9) | Não muda a carga. O coach recebe um alerta de risco à massa magra |

Todas as regras novas têm parâmetros em `parametros_motor` e citam referências. Os testes novos cobrem P1 a P5, combinações com as regras da v1, e a ausência de check-in (motor idêntico ao da v1).

### 8.2 Log de cada sugestão (o "espião")
Toda sugestão gera uma linha em `sugestoes` com:
- versão do motor e dos parâmetros;
- **id da regra** que disparou;
- as entradas: últimas sessões, prescrição da semana, salto, prontidão, horas desde a última execução, tendência do peso e kcal do plano do dia;
- ação, carga e motivo.

Depois que o usuário treina, completam-se:
- a carga usada e se foi **aceita, editada ou ignorada**;
- o **resultado**: reps e RIR alcançados em relação à faixa e ao alvo.

### 8.3 Parâmetros versionados
- `parametros_motor` guarda todas as versões. Só uma fica ativa por usuário.
- **Limites rígidos por parâmetro**, validados no domínio. Ex.: `toleranciaRir` 0,5 a 2; `pausaDias` 14 a 35; `aumentoMax` 2% a 10%.
- Mudança de **valor**: via rascunho → confirmação, com motivo. Mudança de **lógica**: só pelo código, com testes.

### 8.4 Auditoria
Funções puras em `src/dominio/auditoria/`, usadas pela Edge Function:

| Métrica | Definição |
|---|---|
| Acerto do ↑ | % de aumentos em que a sessão seguinte ficou na faixa de reps com RIR ≥ alvo mín − tolerância |
| Acerto do ↓ | % de reduções em que a sessão seguinte voltou à faixa |
| ↓ desnecessário | Reduções seguidas de ↑ em até 2 sessões |
| Aceite por regra | % aceita, editada e ignorada, por id de regra |
| Falso alarme de estagnação | Alertas seguidos de progresso sem mudança de variação |
| Calibração do RIR | Diferença entre o RIR anotado e o RIR inferido em séries até a falha (quando houver), por usuário |
| Efeito da prontidão | Variação média do e1RM em treinos com prontidão baixa vs. normal (mínimo de N treinos para reportar) |

- **Teste retroativo:** `testeRetroativo(historico, parametrosA, parametrosB)` reaplica o motor sessão a sessão e devolve onde as sugestões mudariam, e quanto.
- **Proposta de ajuste:** no máximo **uma mudança por vez**, com o teste retroativo anexado. Vai para `rascunhos` e aparece no Coach com "Ver teste retroativo" e "Aprovar" (mockup, tela 6).

---

## 9. Corpo

- **Peso:** registro manual (rápido, com 1 casa decimal), ou por print da balança ou do relógio, via agente. Exibe a **média móvel de 7 dias** e a **tendência de 4 semanas** (regressão linear: kg/semana e % do peso/semana).
- **Bioimpedância (opcional):** gordura %, massa gorda, músculo esquelético e água, com origem "relógio". Sempre exibida como **tendência**, com o aviso de precisão. O estudo de validação do Galaxy Watch5 encontrou boa concordância em grupo para gordura, mas erro individual grande e concordância fraca para músculo esquelético; o músculo esquelético aparece com destaque menor.
- **Medidas com fita:** cintura, abdômen, quadril, braço, coxa, peito, livres e configuráveis. Lembrete a cada 2 a 4 semanas (configurável).
- **Déficit estimado:** a tendência de peso é o indicador principal. Mostre a kcal média do plano alimentar ao lado, sem tentar calcular o TDEE com precisão falsa.
- Usuário sem relógio: as telas se adaptam (só peso e fita).

---

## 10. Dieta

> Não é diário alimentar. É o **plano alimentar vigente**, para consulta, com **substituições calculadas**.

### 10.1 Importação do PDF do NutriDiet
Protótipo testado em `referencia/dieta/` (JS), com o PDF real do Thiago (`dados-reais/`, fora do git). O que o layout tem:
- **Vários tipos de dia no mesmo PDF:** "Dias de Exercício", "Perna + Bike", "Descanso", "Superiores + Bike". Cada um tem as próprias refeições. O tipo de dia é a linha que vem logo antes de uma refeição sem ser uma refeição.
- **Refeição:** `CAFÉ DA MANHÃ (07:30)`, com nome em maiúsculas e o horário.
- **Item:** nome do alimento + coluna de quantidade, ex. `2 fatias (50g)`, `1 xícara média (130mL)`, `1.5 filés grandes (150g)`. A extração precisa preservar a separação de colunas (o protótipo usa TAB quando o espaço entre trechos passa de 12 pt).
- **Nome que encosta na coluna de quantidade** (arroz): separar pelo padrão de quantidade no fim da linha.
- **Nome quebrado em duas linhas** (`… agulhinha,` + `etc.)`): juntar quando houver parêntese aberto.
- **Itens sem gramas** (`unidade`, `unidade média`): aviso para preencher na revisão.
- **Notas** ("Beber 4L de água", "Em dias de treino de perna, incluir uma banana no pré-treino") pertencem ao tipo de dia.
- **Ruído a descartar:** cabeçalho e rodapé de página, "Personalize alguma informação aqui", números de página.
- **Sem kcal nem macros no PDF:** o app calcula pela base de alimentos.
- Cabeçalho: nome, data da consulta, peso e altura.

Resultado no PDF real: 4 tipos de dia, 26 refeições, 91 itens, 3 notas e 2 avisos (itens sem gramas). Transforme esse resultado em teste, com uma **fixture anonimizada** derivada do PDF real.

### 10.2 Base de alimentos e vinculação
- **TACO 4ª ed.** (NEPA/UNICAMP; reprodução permitida com citação da fonte) em `referencia/dieta/taco.json`, com 597 alimentos. Na TACO, "Tr" = traços = 0, e "*"/"NA" = sem dado.
- **Rótulos genéricos** para o que falta ou está sem dado na TACO: whey, peito de peru, pão de forma tradicional, leite desnatado UHT. Ficam marcados como "rótulo genérico — confira o seu" e são **editáveis por usuário**.
- **Vinculação:** alias salvo + busca aproximada (o NutriDiet usa nomes quase iguais aos da TACO) + **confirmação na tela de revisão**. Cada alias confirmado é reutilizado nas próximas importações.
- Totais estimados no PDF real (para validar o porte):

| Tipo de dia | kcal | Proteína | Carboidrato | Gordura |
|---|---|---|---|---|
| Dias de Exercício | ~2.142 | 192 g | 208 g | 61 g |
| Perna + Bike | ~1.927 | 158 g | 206 g | 52 g |
| Descanso | ~1.633 | 157 g | 135 g | 50 g |
| Superiores + Bike | ~1.779 | 155 g | 173 g | 51 g |

### 10.3 Substituições calculadas
Referência: `referencia/dieta/substituicoes.js`.
- Cada alimento pertence a um **grupo de substituição** com um **macro de referência**:

| Grupo | Referência | Exemplos de candidatos |
|---|---|---|
| Carboidrato (refeição) | carboidrato | arroz, batata inglesa, batata doce, mandioca, batata baroa, cuscuz |
| Carboidrato (café/lanche) | carboidrato | pão de forma, pão francês, pão integral, cuscuz, cream cracker |
| Proteína | proteína | frango, patinho, lombo, peru, carne moída, ovo cozido |
| Proteína (café) | proteína | ovo frito/cozido, clara, queijo minas, ricota, peito de peru |
| Queijo/frios | proteína | minas, ricota, mozarela, prato, peito de peru, presunto magro |
| Iogurte/leite | proteína | iogurte desnatado, iogurte natural, leite desnatado |
| Fruta | kcal | banana, maçã, mamão, manga, laranja, abacaxi, uva, morango, melancia |
| Oleaginosa | kcal | caju, castanha-do-Brasil, amendoim, noz |
| Livre | — | folhas, tomate, legumes no vapor, café (sem troca) |
| Suplemento | — | whey (sem troca automática) |

- **Cálculo:** `gramas = macro_ref(original) ÷ macro_ref_por_grama(candidato)`, arredondado (1 g abaixo de 20 g; 5 g acima). Mostra kcal, macros e diferença de kcal.
- **Tolerância assimétrica de kcal** (parâmetros editáveis): proteína −40%/+25%; carboidrato −25%/+15%; kcal −10%/+10%. Trocar por algo mais magro é aceitável, por algo mais calórico, pouco.
- **Exclusões do usuário:** o Thiago não come **feijão, abacate, arroz integral nem peixe**. Isso fica em `preferencias.nao_come`, editável. O irmão terá a própria lista.
- De 3 a 5 opções por item, ordenadas pela menor diferença de kcal. **São calculadas na importação** e recalculadas quando a base ou as preferências mudam.
- Resultado verificado no PDF real: arroz 125 g ↔ cuscuz 140 g / batata 295 g / batata doce 190 g / mandioca 115 g; banana 90 g ↔ maçã 160 g / mamão 220 g / manga 175 g; queijo minas 60 g ↔ prato 45 g / mozarela 45 g / ricota 85 g; frango 150 g ↔ lombo 135 g (+19%) / patinho 135 g (+24%); ovo frito 100 g ↔ queijo minas 90 g / ricota 125 g / ovo cozido 115 g.
- Se o nutricionista enviar substituições próprias, elas **têm prioridade** e aparecem primeiro, marcadas.
- **Aviso fixo na tela:** "Substituições calculadas pela TACO; não substituem a orientação do seu nutricionista."

### 10.4 Dieta no dia a dia
- **Vincular cada tipo de dia às sessões do plano de treino** na revisão (ex.: "Perna + Bike" ↔ Legs; "Descanso" ↔ dia sem treino). A tela **Dieta → Hoje** escolhe o tipo de dia pelo treino planejado (ou feito) hoje, com troca manual.
- Donut de macros do dia, refeições com horário, itens com gramas e medida caseira, e **substituições ao tocar no item**. Notas do dia no topo ("Beber 4L de água").
- **Plano feito pelo agente:** `preparar_plano_alimentar` recebe JSON estruturado (tipos de dia → refeições → itens com alimento e gramas) e segue o mesmo fluxo de revisão e confirmação.

---

## 11. Referências científicas

- A tela **Mais → Referências** (fora do Início) lista cada referência: citação, link/DOI, **nível de evidência** (forte / moderada / limitada / prática) e "onde o app usa isso".
- Toda regra do motor, todo alerta do coach e todo aviso de precisão aponta para as referências que o sustentam ("Por quê?" → abre a referência).
- Semente inicial da tabela `referencias`:

| Chave | Referência | Sustenta |
|---|---|---|
| `halperin2022` | Halperin I. et al. Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise: a Scoping Review and Exploratory Meta-analysis. *Sports Med* 2022;52:377-390. doi:10.1007/s40279-021-01559-x | Tolerância de RIR; não reduzir por 1 treino |
| `hickmott2022` | Hickmott L.M. et al. The Effect of Load and Volume Autoregulation on Muscular Strength and Hypertrophy. *Sports Med Open* 2022;8:9. doi:10.1186/s40798-021-00404-9 | Autorregulação por RIR ≈ prescrição fixa |
| `bosquet2013` | Bosquet L. et al. Effect of training cessation on muscular performance: a meta-analysis. *Scand J Med Sci Sports* 2013. doi:10.1111/sms.12047 | Redução após pausa só a partir de 3 semanas |
| `craven2022` | Craven J. et al. Effects of Acute Sleep Loss on Physical Performance: a Systematic and Meta-Analytical Review. *Sports Med* 2022. doi:10.1007/s40279-022-01706-y | Prontidão: sono ≤ 6 h; efeito maior em resistência de força; acordar mais cedo |
| `murphy2022` | Murphy C., Koehler K. Energy deficiency impairs resistance training gains in lean mass but not strength. *Scand J Med Sci Sports* 2022. doi:10.1111/sms.14075 | Déficit não reduz a expectativa de força; alerta de massa magra (~500 kcal/dia) |
| `galaxybia2025` | Wearables for health monitoring: body composition estimates of commercial smartwatch and clinical BIA device. *Front Sports Act Living* 2025;7:1644082. doi:10.3389/fspor.2025.1644082 | Bioimpedância do relógio como tendência; músculo esquelético pouco confiável |
| `taco2011` | NEPA/UNICAMP. Tabela Brasileira de Composição de Alimentos – TACO, 4ª ed., 2011 | Base de alimentos e substituições |

**Regra:** antes de adicionar uma referência, **confira a citação na fonte original** (PubMed/DOI). Não adicione nada que não tenha sido verificado, e marque como **prática** o que for convenção sem estudo (ex.: −10% após pausa, 0,7%/semana).

---

## 12. Design system e telas

- **Copie `design-system/` e `DESIGN.md` do Prisma** para o repz, mantendo tokens, fontes (Urbanist, Plus Jakarta Sans, Space Grotesk), componentes e o lint de aderência. Troque a **marca** (nome Repz e um logo próprio, provisório); a paleta lime/forest fica.
- **Tema:** segue o sistema, como no Prisma. Mostre o treino em andamento no tema escuro no mockup, mas sem forçar.
- **Mockup aprovado:** `docs/Repz - Mockup identidade Prisma.pdf`.
- **Navegação inferior:** Início · Corpo · **Treino** (botão central lime) · Dieta · Coach. Menu do topo (☰): Histórico, Cardio, Plano de treino, Plano alimentar, **Referências**, Configurações, Perfil, Sair.

| Tela | Conteúdo principal |
|---|---|
| Início | Card lime "Treino de hoje" (sessão, semana/fase, Iniciar/Trocar); insights do coach; esta semana (treinos, séries, cardio); avisos |
| Treino | Fluxo da v1 no novo design: check-in → registro da série → bi-set/descanso → fim com sugestões ↑ = ↓ ! e comentário do coach |
| Corpo | Média de peso de 7 dias como herói; gráfico de tendência; medidas e bioimpedância; "Print do relógio" |
| Dieta | Hoje (tipo de dia, donut, refeições, substituições); planos anteriores |
| Coach | Revisão semanal; auditoria do motor; propostas pendentes; histórico de comentários |
| Histórico | Por exercício e variante (v1), mais cardio |
| Referências | Lista (seção 11) |

- **Cores das sugestões:** ↑ lime; = cinza; ↓ laranja (`text-owe`/`surface-owe`); ! âmbar (`warning`). Nunca azul ou roxo.

---

## 13. Conector MCP e o agente

Edge Function `agente-mcp` no projeto Supabase do Repz, no padrão do Prisma: autenticação por usuário; instruções do servidor em pt-BR; `contexto` primeiro; nada gravado sem "sim".

**Leitura:**
- `contexto`: perfil, plano ativo, semana e fase, preferências, últimos registros, avisos;
- `treinos`: período, com séries;
- `historico_exercicio`: chave e variante, com e1RM por semana;
- `sugestoes`: log, com filtros;
- `prontidao`: check-ins;
- `cardio`;
- `corpo`: peso com média e tendência, bioimpedância, fita;
- `dieta_vigente`: com totais e substituições;
- `auditoria_motor`: métricas do período;
- `teste_retroativo`: parâmetros candidatos → diferenças;
- `exportar_dados`: linhas para análise em código;
- `avisos_pendentes`.

**Gravação com rascunho:**
- `preparar_plano_treino` (texto TREINO v1);
- `preparar_plano_alimentar` (JSON);
- `preparar_registro` (peso, bioimpedância, fita, cardio, sono; usado para prints);
- `preparar_parametros_motor`;
- `confirmar`;
- `descartar`.

**Sem confirmação (só texto):**
- `registrar_aviso`: aviso no Início, sem duplicar não lidos;
- `gravar_comentario`: treino, semana ou bloco, com versões guardadas;
- `registrar_execucao`: última rotina, visível no Coach.

**Rotinas agendadas** (tarefas agendadas no Claude, criadas pelo Thiago):
- **Revisão semanal** (domingo à noite): lê a semana, grava o comentário e os avisos.
- **Auditoria do motor** (fim de cada bloco ou mensal): métricas, teste retroativo, até 1 proposta de ajuste.
- **Lembrete de medidas** (a cada 2 a 4 semanas).

Cada rotina termina com `registrar_execucao`.

**Limites do agente:** usa só as ferramentas e os números que elas devolvem; cita referências pela chave; não prescreve medicação nem suplementação clínica; em dieta, lembra que não substitui o nutricionista.

---

## 14. Qualidade, segurança e testes

- Os testes da v1 continuam verdes. Somam-se: motor v2 (P1-P5), auditoria e teste retroativo, parser do NutriDiet (fixture anonimizada), vinculação, substituições (casos da seção 10.3), tendência de peso, sincronização (offline → online, duplicidade, conflito), **RLS** (usuário A não lê nem escreve dados de B; o conector respeita o mesmo isolamento), compartilhamento de plano.
- **E2E:**
  - treino completo offline → reconectar → dados no Supabase;
  - importar o NutriDiet → revisar → ver as substituições;
  - check-in com sono baixo → sem aumento no dia;
  - compartilhar plano entre duas contas.
- **Backup:** script de backup e restauração do Supabase (padrão do Prisma) e export dos dados do usuário pelo app (JSON/CSV). Excluir a conta apaga os dados.
- **Desempenho:** mantenha os orçamentos da v1; o pdf.js continua sob demanda.

---

## 15. Marcos sugeridos

| Marco | Entrega | Aceite |
|---|---|---|
| **V0 · Fase 0** | `docs/v2/ARCHITECTURE.md`, `docs/v2/PLAN.md`, decisões | Aprovado pelo Thiago |
| **V1 · Base** | React + design system + Tailwind; projeto Supabase; Auth; schema com RLS; Netlify; telas da v1 portadas sem mudar o comportamento | Todos os E2E da v1 passam no app React; login funciona; testes de RLS verdes |
| **V2 · Sincronização** | Outbox Dexie ↔ Supabase; indicador offline; import do backup da v1 | Treino completo offline sincroniza depois sem perda nem duplicidade |
| **V3 · Treino+** | Check-in de prontidão; cardio de primeira classe; Início novo | Check-in em ≤ 2 toques; cardio registrado em ≤ 20 s |
| **V4 · Motor v2** | P1-P5; log de sugestões; parâmetros versionados; tela de Referências | 16 cenários da v1 + novos verdes; cada sugestão com snapshot completo |
| **V5 · Corpo** | Peso, média, tendência, bioimpedância, fita; adaptação sem relógio | Tendência correta com os dados de teste |
| **V6 · Dieta** | Parser do NutriDiet, base TACO + rótulos, vinculação, substituições, tipos de dia ↔ sessões, "Hoje" | PDF real importado com 0 erros; substituições da seção 10.3 reproduzidas |
| **V7 · Conector** | `agente-mcp` com as ferramentas da seção 13; avisos e comentários no app; tela Coach | Claude conectado lê o contexto, grava um aviso e importa um plano com confirmação |
| **V8 · Auditoria** | Métricas, teste retroativo, propostas, aprovação | Proposta de ajuste ponta a ponta com teste retroativo visível |
| **V9 · Multiusuário e entrega** | Convite, compartilhar plano, irmão como 2º usuário, polimento, deploy | Dois usuários com o mesmo plano e dados isolados; checklist da v1 + v2 completo |

---

## 16. Decisões em aberto (pergunte na Fase 0)

1. **Repositório privado?** Hoje o `repz` é público, e a v2 lida com dados de saúde. Recomendo privado.
2. **Código da Edge Function `agente-mcp` do Prisma:** pedir ao Thiago (`supabase functions download agente-mcp`).
3. **Auth:** e-mail+senha ou magic link? Igual ao Prisma?
4. **Logo do Repz:** provisório gerado ou criado pelo Thiago?
5. **Vínculo tipo de dia da dieta ↔ sessão:** "Dias de Exercício" e "Superiores + Bike" parecem se sobrepor no PDF atual. Confirmar com o Thiago qual vale para quais sessões.
6. **Itens sem gramas no PDF** ("Castanha do Pará — unidade"): adotar um peso padrão por unidade (tabela de medidas caseiras) ou exigir preenchimento?
7. **O PDF do NutriDiet é de 12/05/2026 (90,8 kg).** Haverá um plano mais recente para usar como fixture principal?

---

## Anexos do kit

| Caminho | O que é |
|---|---|
| `docs/Repz - Mockup identidade Prisma.pdf` | Mockup aprovado (6 telas) |
| `referencia/dieta/extrair-linhas.js` | Extração do PDF com colunas (TAB quando o espaço > 12 pt) |
| `referencia/dieta/nutridiet.js` | Parser do NutriDiet (tipos de dia, refeições, itens, notas, avisos) |
| `referencia/dieta/alimentos.js` | Base TACO + rótulos genéricos + aliases do PDF real |
| `referencia/dieta/substituicoes.js` | Grupos, tolerâncias, exclusões e cálculo |
| `referencia/dieta/teste-*.mjs` | Scripts de verificação (`npm i` + `node teste-parse.mjs <pdf>` e `node teste-subs.mjs`) |
| `referencia/dieta/taco.json` | TACO 4ª ed. em JSON (via `isaquetdiniz/taco-api`, MIT; dados NEPA/UNICAMP, citar a fonte) |
| `dados-reais/plano-alimentar-nutridiet.pdf` | **PDF real do Thiago: não versionar.** Use para gerar a fixture anonimizada |
