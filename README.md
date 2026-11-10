# REPZ · diário de treino

App de celular (PWA) para registrar o treino durante a sessão e receber sugestões de carga.
Funciona **offline**, sem conta e sem nuvem: os dados ficam só no seu celular.

- Briefing do produto: [`BRIEFING.md`](BRIEFING.md)
- Arquitetura: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Plano de marcos: [`docs/PLAN.md`](docs/PLAN.md)
- Prompt para a sua IA gerar o anexo do plano: [`docs/contrato-treino-v1.txt`](docs/contrato-treino-v1.txt)

> Estado atual: **M0 · Base** (estrutura, PWA offline, CI). As funções do app chegam nos próximos marcos.

## Rodar localmente

Requer Node 24.

```bash
npm install
npm run dev          # http://localhost:5173/carga-treino/
```

## Testar

```bash
npm test             # unitários (Vitest)
npm run lint         # ESLint + Prettier
npm run typecheck    # TypeScript
npm run build && npm run check:dist   # build + privacidade (sem URLs externas) + orçamento de JS
npm run test:e2e     # Playwright em viewport de celular, inclusive offline
```

Na primeira vez: `npx playwright install chromium`.

Implementação de referência (especificação executável, fora do build):

```bash
cd referencia && npm i
node teste/rodar.mjs ../tests/fixtures/raul-com-anexo-ok.pdf
node teste/erros.mjs
node teste/progressao.mjs
```

## Publicar (GitHub Pages)

1. Crie o repositório `carga-treino` no GitHub e envie a branch `main`.
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   O GitHub Pages não tem conta separada; ele é ativado por repositório. No plano gratuito o repositório precisa ser **público** (o código fica visível; os dados de treino nunca saem do celular).
3. Cada push na `main` roda lint → testes → build → E2E e publica em `https://<seu-usuario>.github.io/carga-treino/`.

Se o nome do repositório mudar, ajuste `BASE` em `vite.config.ts`, a `baseURL` em `playwright.config.ts` e o `base` em `scripts/verificar-dist.mjs`.

## Instalar no celular

- **Android (Chrome):** abra o link → menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** abra o link → botão Compartilhar → **Adicionar à Tela de Início**.

Instale antes de usar: no iPhone, um site não instalado pode ter os dados apagados depois de alguns dias sem uso.

## Backup

Disponível a partir do M6 em **Plano → Exportar → Backup completo (.json)**.
