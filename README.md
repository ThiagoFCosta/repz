# REPZ · diário de treino

App de celular (PWA) para registrar o treino de musculação série a série (carga, reps e RIR), seguir a periodização do plano e receber sugestões de carga: **aumentar, manter ou reduzir**, com o motivo.
Funciona **offline**, sem conta e sem nuvem: os dados ficam só no seu celular.

**Link:** https://thiagofcosta.github.io/repz/

- Briefing do produto: [`BRIEFING.md`](BRIEFING.md)
- Arquitetura e decisões: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Plano de marcos: [`docs/PLAN.md`](docs/PLAN.md)
- Roteiro de validação no celular: [`docs/VALIDACAO.md`](docs/VALIDACAO.md)

## Como usar

### 1. Gere o plano com a sua IA

O app lê um **anexo padronizado (formato TREINO v1)** no fim do PDF do plano. Cole o texto de [`docs/contrato-treino-v1.txt`](docs/contrato-treino-v1.txt) nas **instruções permanentes** da sua IA (ChatGPT: "Personalizar"; Claude: instruções do projeto; Gemini: "Gems"). A partir daí, todo plano que ela gerar termina com o anexo entre `#TREINO-INICIO` e `#TREINO-FIM`. O resto do PDF pode ter qualquer formato.

Se o PDF não tiver texto selecionável (escaneado), copie o anexo e use **Plano → Colar texto**.

### 2. Instale no celular

- **Android (Chrome):** abra o link → **Instalar app** na tela de boas-vindas (ou menu ⋮ → **Instalar app**).
- **iPhone (Safari):** abra o link → botão Compartilhar → **Adicionar à Tela de Início**.

Instale antes de usar. No iPhone, um site **não instalado** pode ter os dados apagados depois de alguns dias sem uso. Depois da primeira abertura, o app funciona sem internet.

### 3. Importe e treine

**Plano → Selecionar PDF** → confira a checklist → **Revisar plano** (defina a data de início do bloco) → **Salvar**. Na aba **Treino**, o app sugere a próxima sessão da rotação; durante o treino, cada série é gravada na hora em que você conclui.

### Backup e restauração

Os dados não saem do celular, então o backup é sua rede de segurança (o app lembra a cada 30 dias).

- **Plano → Exportar → Backup completo (.json).** No Android, o arquivo vai para a pasta **Downloads** (o Chrome não compartilha `.json` pelo menu). Guarde uma cópia fora do celular (Drive, e-mail).
- **Plano → Restaurar backup:** escolha o arquivo, veja o resumo e escolha **Substituir tudo** (celular novo) ou **Mesclar** (junta sem duplicar). Não dá para restaurar com um treino em andamento.
- **Exportar → Planilha CSV** (abre direto no Excel em português) e **Histórico em PDF**.

### Limitações conhecidas

- **Cronômetro de descanso com a tela bloqueada:** o tempo exibido está sempre certo ao voltar ao app (é calculado pela hora de término), mas o bipe e a vibração dependem do sistema. Com a tela ligada, funcionam; por isso o app mantém a tela acesa durante o treino (pode desligar em Plano). No **iPhone** não há vibração em apps web e o som pode não tocar com a tela bloqueada.
- Sem sincronização entre aparelhos: para trocar de celular, use backup e restauração.

### Privacidade

Sem conta, sem servidor, sem analytics. O app não faz nenhuma requisição de rede depois de carregado: fontes, leitor de PDF e gerador de PDF vão junto com o app. O CI falha se o build tiver qualquer URL de terceiros em código executável (`scripts/verificar-dist.mjs`).

---

## Desenvolvimento

Requer Node 24. Stack: Vite, Preact + signals, TypeScript strict, Dexie (IndexedDB), pdf.js e jsPDF sob demanda, vite-plugin-pwa (Workbox).

```bash
npm install
npm run dev          # http://localhost:5173/repz/
```

### Testar

```bash
npm test                 # unitários (Vitest)
npm run test:cobertura   # com cobertura (mínimo de 95% em src/dominio)
npm run lint             # ESLint + Prettier
npm run typecheck        # TypeScript
npm run build && npm run check:dist   # build + privacidade (sem URLs externas) + orçamento de JS inicial (200 KB gzip)
npm run test:e2e         # Playwright em viewport de celular: fluxos, offline, acessibilidade (axe), desempenho
```

Na primeira vez: `npx playwright install chromium`.

Implementação de referência do parser e do motor de carga (especificação executável, fora do build):

```bash
cd referencia && npm i
node teste/rodar.mjs ../tests/fixtures/raul-com-anexo-ok.pdf
node teste/erros.mjs
node teste/progressao.mjs
```

### Publicar (GitHub Pages)

Cada push na `main` roda lint → typecheck → testes → build → verificação do build → E2E e publica no GitHub Pages pelo GitHub Actions (`.github/workflows/ci.yml`). O Pages é ativado no repositório em **Settings → Pages → Source: GitHub Actions**; no plano gratuito o repositório precisa ser público (os dados de treino nunca saem do celular).

Se o nome do repositório mudar, ajuste `BASE` em `vite.config.ts`, a `baseURL` em `playwright.config.ts` e o `base` em `scripts/verificar-dist.mjs`.

### Organização

```
src/dominio/   regras puras: parser TREINO v1, periodização, motor de carga, rotação, máquina de estados do treino
src/dados/     Dexie: schema e migrações, repositórios, backup, CSV, PDF
src/pdf/       extração de texto com pdf.js
src/app/       estado global (signals), roteador, controlador do treino, cronômetro, PWA
src/ui/        telas e componentes (Preact)
tests/         unitários, dados, PDF, E2E e fixtures
```
