# PLAN — App de Treino

> Fase 0. Refina a seção 17 do `BRIEFING.md`. Arquitetura em `docs/ARCHITECTURE.md`.
> Cada marco termina com: testes verdes no CI, app rodando localmente, resumo do que foi feito, roteiro do que testar no celular, lista de pendências e commits pequenos (`tipo(escopo): descrição`, ex. `feat(formato): porta parser TREINO v1`).

## Ordem e dependências

```
M0 Base ─► M1 Formato ─► M2 Dados e plano ─► M3 Treino ─► M4 Inteligência ─► M5 Cardio e histórico ─► M6 Dados ─► M7 Polimento
                                     │                         ▲
                                     └── motor de carga (M4.1) pode ser portado em paralelo a M2/M3: é puro
```

Recomendo seguir a ordem, com uma exceção: portar o motor de carga e seus 16 testes (M4.1) logo depois do M1, porque é puro e de baixo risco, e o M3 já pode pré-preencher a carga com ele.

Em todos os marcos com UI: revisão em Android (Chrome, app instalado) nos celulares do Thiago e do Raul.

---

## M0 · Base

**Tarefas**
1. Organizar o repositório: mover `app-treino-kit/docs/*` → `docs/`, `app-treino-kit/referencia` → `referencia/`, `app-treino-kit/fixtures` → `tests/fixtures/`; `.gitignore` com `node_modules`, `dist`, `*.zip`.
2. `git init`, repositório `repz` no GitHub, branch `main` protegida pelo CI.
3. Vite + Preact + TypeScript strict; `base` = `/<repo>/`.
4. ESLint (flat) + Prettier + regra de dependência entre camadas (`dominio/` não importa UI/DB).
5. Vitest (com cobertura) e Playwright (projeto `mobile-chromium` 390×844).
6. `vite-plugin-pwa`: manifest (nome "REPZ", standalone, portrait, cores do tema, ícones 192/512/maskable/apple-touch), precache, registro manual com prompt.
7. Tokens de design (`tokens.css`), Inter woff2 local, `AppShell` com as 3 abas vazias e hash router.
8. CSP por `<meta>`; teste de privacidade sobre `dist/`; checagem de orçamento de bundle.
9. GitHub Actions: lint → typecheck → unit → build → privacidade/bundle → E2E → deploy no Pages (só na `main`).

**Aceite**
- [ ] URL pública do Pages abre o app com as 3 abas.
- [ ] E2E: 1ª visita online → `setOffline(true)` → recarregar → app abre.
- [ ] Teste de privacidade e de orçamento rodando no CI; CI verde.
- [ ] Instala na tela inicial no Android e no iPhone (manual).

---

## M1 · Formato

**Tarefas**
1. `dominio/formato/normalizar.ts`: `normalizar`, `semAcento`, `chaveExercicio` (faixas Unicode por escape).
2. `dominio/formato/parser.ts`: porte tipado de `parse()` com as mesmas mensagens; retorna também `textoBloco`.
3. `dominio/periodizacao/prescricao.ts`: porte de `prescricao()` com `foco` efetivo por parâmetro.
4. `pdf/extrair.ts`: porte de `textoDoPdf`, com `import()` dinâmico do pdf.js e do worker local (`?url`); erro específico para PDF sem texto ("Este PDF não tem texto selecionável…").
5. Testes:
   - Todos os casos da tabela 5.6 (PDFs e variações de texto), com a mensagem exata e o número da linha.
   - Tolerâncias 5.3: `SESSÃO` com acento, travessão `–`, espaço não separável, `｜`, linha quebrada iniciada por `|`, linha quebrada por falta de campos, rodapé ignorado, cercas markdown, comentários.
   - Avisos 5.4: token desconhecido, SS de um exercício, exercício sem descanso, semana sem fase, sem `TOTAL`, versão ≠ 1.
   - Variantes: `[a / b]` no meio e no início do nome; chaves sem acento.
   - Prescrição do plano do Raul nas semanas 1, 6, 10 e 12 (seção 6.2), incluindo Stiff RIR 3 fixo e `series +1 foco` com foco ligado/desligado.
   - Descanso `2min`/`2-3min` → segundos.

**Aceite**
- [x] Todos os casos da tabela 5.6 passam como testes automatizados.
- [x] Cobertura de `dominio/formato` e `periodizacao/prescricao` ≥ 95% (100% das linhas).
- [x] pdf.js não aparece no chunk inicial (build experimental: chunk sob demanda de 97 KB gzip; inicial continua 10 KB). A verificação definitiva roda no M2, quando a tela de importação passa a usá-lo.

---

## M2 · Dados e plano

**Tarefas**
1. `dados/db.ts`: schema v1 (stores e índices da ARCHITECTURE 5.2), `abrirDb()`, estrutura de migrações e `migrarBackup()` puro.
2. Repositórios: planos (salvar com ids, ativar), meta, config de exercício (apelidos com `canonica()`), treinos/séries (só leitura neste marco).
3. `dominio/periodizacao/semana.ts`: semana do bloco (6.1) com ajuste, antes do início e "bloco concluído" (D1); `dominio/datas.ts` com `hojeLocal`, `proximaSegunda`.
4. `dominio/similaridade.ts`: Jaro-Winkler; sugestões ≥ 0,85.
5. Tela **Importar**: Selecionar PDF, Colar texto, checklist de progresso, avisos expansíveis, cartão de erro com a linha e "Peça à sua IA para corrigir o anexo".
6. Tela **Revisar**: nome, autor, data de início (padrão: próxima segunda), duração; acordeão de sessões com variantes (azul), `SS1` (roxo), marca "novo"/"com histórico", vincular com sugestão.
7. Salvar → plano ativo; anterior fica na lista "Planos anteriores" (somente leitura). Bloqueio se houver treino em andamento (preparado para o M3).
8. Tela **Plano e dados** (parcial): plano ativo, data de importação, início do bloco, semana atual com −/+, lista de exercícios com salto e foco editáveis, status de `storage.persist()`, texto fixo de privacidade.
9. Início: estado vazio (sem plano) com chamada para importar; pílula "Semana X de N · Fase K · RIR a-b" / "Deload" / "Bloco concluído".
10. Testes: migração v1 (abrir banco vazio), salvar/ativar plano, apelidos (ciclo, desfazer), semana do bloco (todas as bordas, `agora` às 23:30), similaridade, E2E 1 e 2 (importar PDF do Raul; PDF sem anexo).

**Aceite**
- [ ] Importar o PDF do Raul pelo app **no celular**; recarregar e o plano continua lá. (Verificado no navegador com viewport de celular e no E2E; falta o aparelho real.)
- [x] E2E 1 e 2 verdes (mais: importar PDF offline, colar texto com erro, ajuste de semana).
- [x] Mudar a semana com −/+ altera a pílula.

---

## M3 · Treino

**Tarefas**
1. `dominio/rotacao.ts` (6.3) e `dominio/treino/estimativa.ts` (duração estimada).
2. `dominio/treino/biset.ts` e `dominio/treino/maquina.ts` (reducer puro, eventos da ARCHITECTURE 7.2).
3. `app/controlador-treino.ts`: evento → reducer → transação (série + `estadoUI`) → efeitos.
4. `app/descanso.ts`: timestamp, ±15 s, pular, som agendado no `AudioContext`, vibração; `app/wake-lock.ts`.
5. Tela **Início**: Próximo treino (sessão, nº de exercícios, duração, primeiros exercícios, Iniciar, Trocar sessão com "planejado para segunda"), Continuar treino, pergunta de treino aberto > 4 h.
6. Tela **Registro**: topo com progresso e tempo, chips de variante, Meta da semana, Última vez, tabela de séries (concluídas esmaecidas, edição com um toque), campos grandes pré-preenchidos (última carga/reps por enquanto; o motor entra no M4, ou já aqui se o M4.1 foi antecipado), RIR por botões 0-1-2-3-4+, atalhos ±salto e ±1 rep, "Concluir série N" no terço inferior, menu (adicionar série, aquecimento, pular, ir para, nota, encerrar, descartar).
7. Tela **Descanso/Bi-set**: "Rodada 2 de 4", cronômetro grande, −15/+15/Pular, "A seguir: …".
8. Retomar treino ao reabrir o app (inclusive com descanso vencido).
9. Testes: rotação, estimativa, bi-set 4+3, todas as transições do reducer, transação série+estado (falha no meio não grava metade), E2E 3 (Push completo com bi-set, fechar a aba no meio, reabrir, continuar).

**Aceite**
- [ ] Push completo no celular com no máximo 2 toques por série quando a carga e as reps sugeridas estão certas (RIR + Concluir).
- [ ] Fechar o app (e reiniciar o celular) no meio do treino e continuar sem perder nenhuma série.
- [ ] Cronômetro mostra o tempo certo depois de bloquear e desbloquear a tela.
- [ ] E2E 3 verde.

---

## M4 · Inteligência

**Tarefas**
1. (M4.1, pode ser antecipado) `dominio/progressao/*`: porte do motor com `hoje` obrigatório, `CONFIG_PROGRESSAO` com os nomes da 7.3, `repsSugeridas`.
2. `dados/historico-repo.ts`: histórico por chave canônica, sem aquecimento, só treinos concluídos (e o atual até o momento, para não contar duas vezes), agrupado por treino.
3. Periodização aplicada no treino: séries alvo da semana, RIR alvo, deload; `foco` do usuário sobrepõe o do plano.
4. Pré-preenchimento: carga sugerida em todas as séries, reps da última vez ou mínimo da faixa quando subiu; `sugestaoKg`/`sugestaoAceita` gravados.
5. Tela **Fim do treino**: duração, nº de séries, volume, recordes; "Para o próximo treino" com cartões ↑ = ↓ ! (cores do design), motivo em uma linha; botões Cardio e Fechar.
6. Exercício por tempo: campo "segundos" no lugar de reps; regras 0b.
7. Testes: os 16 cenários da 7.5 com ação, carga, motivo e alertas exatos; `hoje` à noite; histórico com apelido; pré-preenchimento após ↑ usa o mínimo da faixa; E2E 4.

**Aceite**
- [ ] Todos os cenários da seção 7.5 como testes.
- [ ] Sugestão visível no fim e aplicada (pré-preenchida) no treino seguinte do exercício.
- [ ] E2E 4 verde.

---

## M5 · Cardio e histórico

**Tarefas**
1. `dominio/cardio.ts`: meta semanal pela frequência do plano (`2x` → 2; `diario` → 7; `opcional` → sem meta), dentro/fora da duração e da FC.
2. Tela **Cardio**: chips de tipo (do plano + Outro), duração, FC média, distância, esforço 0-10, data; comparação com a meta; disponível sem treino de força.
3. Cartão de cardio no Início: "X de Y nesta semana" (semana seg-dom), Registrar.
4. `dominio/historico.ts`: e1RM por semana, variação em 8 semanas, melhor série.
5. Tela **Histórico**: seletor com busca (inclui exercícios fora do plano ativo), KPIs, gráfico SVG com deload marcado, lista de treinos do exercício; toque abre o treino.
6. Visão **Treinos**: lista cronológica de treinos e cardio; detalhe; editar e excluir com confirmação.
7. Testes: meta de cardio, e1RM por semana com dados de teste (valores calculados à mão), edição/exclusão refletindo no histórico e no motor.

**Aceite**
- [ ] Gráfico de e1RM correto com os dados de teste (comparado com valores calculados).
- [ ] Editar uma série antiga muda o gráfico e a próxima sugestão.

---

## M6 · Dados

**Tarefas**
1. `dados/csv.ts`: séries e cardio com os cabeçalhos exatos da seção 10, UTF-8 com BOM, `;`, vírgula decimal, aspas quando preciso.
2. `dados/backup.ts`: exportar `{ app, versaoSchema, exportadoEm, … }`; validar `app` e `versaoSchema`; migrar; restaurar **substituir tudo** ou **mesclar por id**, com confirmação; atualiza `ultimoBackup`.
3. `dados/pdf-export.ts` : período, resumo por exercício (melhor série, e1RM inicial → atual), tabela de treinos e de cardio.
4. `dados/compartilhar.ts`: Web Share com arquivos; fallback download; nomes `treino-backup-AAAA-MM-DD.json`, `treino-series-…csv`, `treino-cardio-…csv`, `treino-historico-…pdf`.
5. Lembrete de backup no Início (> 30 dias).
6. Testes: CSV byte a byte (BOM, separadores, decimal), backup → limpar → restaurar = mesmo estado (comparação profunda de todas as stores), mesclar sem duplicar, rejeitar JSON de outro app/versão futura, migração de backup antigo; E2E 5.

**Aceite**
- [ ] Backup → limpar dados → restaurar com resultado idêntico (teste automatizado e no celular).
- [ ] CSV abre certo no Excel em pt-BR (acentos, colunas, decimais).
- [ ] E2E 5 verde.

---

## M7 · Polimento

**Tarefas**
1. Onboarding de instalação (Android e iOS) e lembrete quando não instalado.
2. Prompt de atualização respeitando treino em andamento.
3. Acessibilidade: contraste AA verificado, labels, foco visível, `prefers-reduced-motion`, alvos ≥ 44 px (teste automatizado com axe no Playwright).
4. Performance: 1ª tela interativa < 2 s num Android médio com cache (medição com Lighthouse/CPU throttling no CI e no aparelho); JS inicial < 200 KB gzip.
5. README: rodar, testar, publicar; instalar no Android e no iPhone; backup; onde está o contrato da IA; limitações do cronômetro no iOS.
6. Importar o PDF do Thiago (Q6) e corrigir o que aparecer.
7. Rodada de uso real: Thiago e Raul instalam e fazem um treino completo offline; triagem das pendências.

**Aceite**
- [ ] Checklist da seção 15 completo.
- [ ] Definição de pronto da seção 19 completa.

---

## Roteiro de demonstração por marco (modelo)

Ao fechar cada marco eu entrego:
1. **O que mudou** (3-5 linhas).
2. **O que testar no celular**, passo a passo, com o link do Pages.
3. **Pendências e riscos** descobertos.
4. **Perguntas** que surgiram (se houver).
