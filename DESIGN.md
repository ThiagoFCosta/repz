---
version: alpha
name: Prisma
# Repz (v2): este é o design system do Prisma, copiado (docs/v2/ARCHITECTURE.md, seção 6). Mudou token aqui,
# mude também em design-system/tokens/ no mesmo commit. Acréscimos do Repz marcados com "Repz:".
description: >-
  Design system do app Finanças Pessoais (PWA, pt-BR, BRL). Duas cores de marca — lime #9FE870 (energia,
  confirmação, IA) e forest #062F28 (todo o texto e as ações principais) — sobre cinzas neutros, quase sem
  sombra, cards brancos de raio 16 e ações em pílula. Tema claro e escuro seguindo o sistema.
colors:
  # Marca
  lime-50: "#F1FCEC"
  lime-100: "#E4F8D6"
  lime-200: "#CBF2B0"
  lime-300: "#B4EC8C"
  lime-400: "#9FE870"
  lime-500: "#8BDB57"
  lime-600: "#6CC23A"
  lime-700: "#3F8A1F"
  lime-800: "#2E6617"
  forest-50: "#F3F7F2"
  forest-100: "#ECF4E8"
  forest-200: "#D3E2DA"
  forest-300: "#A9C2B8"
  forest-400: "#6F8F86"
  forest-500: "#3C665E"
  forest-600: "#1D4F46"
  forest-700: "#103F37"
  forest-800: "#0B372F"
  forest-900: "#062F28"
  # Neutros (cinzas verdadeiros)
  gray-0: "#FFFFFF"
  gray-25: "#FAFAFA"
  gray-50: "#F5F5F5"
  gray-100: "#F0F0F0"
  gray-150: "#EBEBEB"
  gray-200: "#E5E5E5"
  gray-250: "#DCDCDC"
  gray-300: "#CFCFCF"
  gray-400: "#A4A4A4"
  gray-500: "#7B7B7B"
  gray-600: "#6B6B6B"
  gray-700: "#4A4A4A"
  gray-800: "#2B2B2B"
  gray-900: "#141414"
  # Status
  red-50: "#FDECEE"
  red-100: "#FBD7DB"
  red-500: "#F43440"
  red-600: "#E0222F"
  red-700: "#B4141F"
  amber-50: "#FEF5E4"
  amber-100: "#FDE7BF"
  amber-500: "#F2A516"
  amber-700: "#8F5A00"
  orange-50: "#FFF1E6"
  orange-600: "#C25A0A"
  orange-700: "#9A4706"
  # Semânticas — tema claro (padrão)
  primary: "{colors.forest-900}"
  secondary: "{colors.lime-400}"
  bg-page: "{colors.gray-50}"
  bg-shell: "{colors.gray-100}"
  surface-card: "{colors.gray-0}"
  surface-muted: "{colors.gray-100}"
  surface-sunken: "#F4F4F4"
  surface-brand: "{colors.lime-400}"
  surface-brand-soft: "{colors.lime-50}"
  surface-inverse: "{colors.forest-900}"
  surface-success: "{colors.lime-50}"
  surface-danger: "{colors.red-50}"
  surface-warning: "{colors.amber-50}"
  surface-owe: "{colors.orange-50}"
  border-default: "{colors.gray-150}"
  border-strong: "{colors.gray-200}"
  text-primary: "{colors.forest-900}"
  text-secondary: "{colors.gray-600}"
  text-tertiary: "{colors.gray-500}"
  text-on-brand: "{colors.forest-900}"
  text-on-inverse: "{colors.gray-0}"
  text-negative: "{colors.red-600}"
  # Repz: texto de erro sobre o fundo da página (AA)
  text-danger-strong: "{colors.red-700}"
  text-success: "{colors.lime-700}"
  # Repz: texto de sucesso em tamanho pequeno (AA sobre branco)
  text-success-strong: "{colors.lime-800}"
  text-danger: "{colors.red-600}"
  text-warning: "{colors.amber-700}"
  text-owe: "{colors.orange-700}"
  text-owed: "{colors.lime-700}"
  chart-1: "{colors.forest-900}"
  chart-2: "{colors.lime-400}"
  chart-3: "{colors.forest-100}"
  chart-4: "{colors.gray-500}"
  chart-5: "{colors.gray-200}"
  gauge-1: "{colors.red-500}"
  gauge-2: "{colors.orange-600}"
  gauge-3: "{colors.amber-500}"
  gauge-4: "{colors.lime-400}"
  gauge-5: "{colors.lime-700}"
  # Semânticas — tema escuro
  dark-bg-page: "#0B1210"
  dark-bg-shell: "#0F1715"
  dark-surface-card: "#151E1B"
  dark-surface-muted: "#1E2926"
  dark-surface-sunken: "#101816"
  dark-surface-inverse: "#E6EFEA"
  dark-border-default: "#24302C"
  dark-border-strong: "#2E3B37"
  dark-text-primary: "#EEF4F0"
  dark-text-secondary: "#A7B4AF"
  dark-text-tertiary: "#8A9893"
  dark-text-negative: "#FF7A84"
  dark-text-danger-strong: "#FF7A84"
  dark-text-success: "{colors.lime-400}"
  dark-text-success-strong: "{colors.lime-400}"
  dark-text-warning: "#F5BE5B"
  dark-text-owe: "#FFA45C"
  dark-text-owed: "{colors.lime-400}"
  dark-surface-owe: "#F27A1A29"
  dark-chart-1: "#DCE8E2"
  dark-chart-3: "#2C5047"
  dark-gauge-1: "#FF7A84"
  dark-gauge-2: "#FFA45C"
  dark-gauge-3: "#F5BE5B"
  dark-gauge-4: "{colors.lime-400}"
  dark-gauge-5: "{colors.lime-600}"
typography:
  display:
    fontFamily: Urbanist
    fontSize: 56px
    fontWeight: 400
    lineHeight: 1.1
  h1:
    fontFamily: Urbanist
    fontSize: 34px
    fontWeight: 600
    lineHeight: 1.1
  h2:
    fontFamily: Urbanist
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
  h3:
    fontFamily: Urbanist
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.25
  card-title:
    fontFamily: Urbanist
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: Urbanist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
  body-sm:
    fontFamily: Urbanist
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  body-long:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: Urbanist
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: Urbanist
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1
  overline:
    fontFamily: Urbanist
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.06em
  amount-xl:
    fontFamily: Urbanist
    fontSize: 34px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.01em
  amount-lg:
    fontFamily: Urbanist
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.1
  amount-md:
    fontFamily: Urbanist
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.2
  mono:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 10px
  xl: 12px
  2xl: 16px
  3xl: 20px
  4xl: 28px
  pill: 999px
  badge: 6px
  icon-button: 8px
  control: 10px
  tile: 12px
  card: 16px
  dialog: 20px
spacing:
  "0-5": 2px
  "1": 4px
  "1-5": 6px
  "2": 8px
  "2-5": 10px
  "3": 12px
  "3-5": 14px
  "4": 16px
  "5": 20px
  "6": 24px
  "7": 28px
  "8": 32px
  "10": 40px
  "12": 48px
  "16": 64px
  "20": 80px
  card-padding: 16px
  grid-gap: 12px
  page-padding: 16px
  page-padding-mobile: 12px
  control-sm: 32px
  control-md: 40px
  control-lg: 48px
  touch-target: 44px
  sidebar: 256px
  topbar: 72px
  topbar-mobile: 60px
components:
  button-primary:
    backgroundColor: "{colors.forest-900}"
    textColor: "{colors.gray-0}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    height: 40px
    padding: 0 18px
  button-primary-hover:
    backgroundColor: "{colors.forest-700}"
    textColor: "{colors.gray-0}"
  button-brand:
    backgroundColor: "{colors.lime-400}"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.pill}"
    height: 40px
  button-brand-hover:
    backgroundColor: "{colors.lime-500}"
    textColor: "{colors.forest-900}"
  button-secondary:
    backgroundColor: "{colors.gray-0}"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.pill}"
    height: 40px
  button-danger:
    backgroundColor: "{colors.red-600}"
    textColor: "{colors.gray-0}"
    rounded: "{rounded.pill}"
  icon-button-outline:
    backgroundColor: "{colors.gray-0}"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.icon-button}"
    size: 36px
  input:
    backgroundColor: "{colors.gray-0}"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.control}"
    height: 40px
    padding: 0 12px
  input-filled:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.control}"
  badge-success:
    backgroundColor: "{colors.lime-50}"
    textColor: "{colors.lime-700}"
    rounded: "{rounded.badge}"
    height: 24px
  badge-danger:
    backgroundColor: "{colors.red-50}"
    textColor: "{colors.red-600}"
    rounded: "{rounded.badge}"
  badge-warning:
    backgroundColor: "{colors.amber-50}"
    textColor: "{colors.amber-700}"
    rounded: "{rounded.badge}"
  badge-owe:
    backgroundColor: "{colors.orange-50}"
    textColor: "{colors.orange-700}"
    rounded: "{rounded.badge}"
  card:
    backgroundColor: "{colors.gray-0}"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.card}"
    padding: 16px
  card-dark:
    backgroundColor: "{colors.dark-surface-card}"
    textColor: "{colors.dark-text-primary}"
    rounded: "{rounded.card}"
  balance-card:
    backgroundColor: "{colors.lime-400}"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.card}"
  stat-tile:
    backgroundColor: "{colors.gray-0}"
    textColor: "{colors.forest-900}"
    typography: "{typography.amount-lg}"
    rounded: "{rounded.tile}"
    padding: 14px
  dialog:
    backgroundColor: "{colors.gray-0}"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.dialog}"
    padding: 24px
  tooltip:
    backgroundColor: "{colors.forest-900}"
    textColor: "{colors.gray-0}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
  sidebar:
    backgroundColor: "{colors.gray-100}"
    textColor: "{colors.gray-600}"
    width: 256px
  nav-item-active:
    backgroundColor: "{colors.gray-0}"
    textColor: "{colors.forest-900}"
    rounded: "{rounded.md}"
    height: 40px
---

# Prisma — contrato visual

Este arquivo é o **contrato visual e a fonte da verdade dos tokens** do projeto. A implementação vive em
`design-system/` (tokens CSS em `design-system/tokens/`, componentes em `design-system/components/`, mapa em
`design-system/README.md`). Se um valor mudar, mude aqui **e** no token CSS correspondente, no mesmo commit.
O nome "Prisma" é o nome do design system (veio do export do Claude Design); o produto é o app Finanças Pessoais.

## Overview

App pessoal de finanças, calmo, competente e encorajador. Um produto responsivo único: desktop com sidebar
fixa, que se reorganiza num celular de 360 px (menu em gaveta, cards empilhados, tabelas como lista, diálogos
como bottom sheet) sem perder funcionalidade. Os números são o herói: valores grandes em Urbanist semibold,
`R$ 20.670`, deltas `+1,78%` em pt-BR. Voz em "você"; só o assistente fala em primeira pessoa. Sem emoji.
Títulos e botões em sentence case; rótulos de seção da sidebar em CAIXA ALTA.

## Colors

- **Lime `#9FE870`** — acento da marca: confirmação, IA, card herói de saldo, série 2 dos gráficos, foco.
- **Forest `#062F28`** — tinta da marca: todo o texto, botões primários, série 1 dos gráficos.
- Todo o resto é **cinza verdadeiro**. Nunca introduzir azuis ou roxos.
- Status em tons suaves com texto AA: sucesso lime-50/lime-700, erro red-50/red-600, aviso amber-50/amber-700.
- Domínio financeiro (docs/04): negativos em vermelho com sinal de menos verdadeiro (`−R$ 150,00`);
  positivos em tinta (não verde); **"Me deve" em verde (`text-owed`) e "Eu devo" em laranja (`text-owe`)**.
- Superfícies: página `#F5F5F5`, shell `#F0F0F0` separado por linhas de 1px `#E5E5E5`, cards brancos.
- **Tema escuro** (tokens `dark-*`): neutros esverdeados (`#0B1210` página, `#151E1B` card), texto `#EEF4F0`,
  lime continua lime; a superfície "inversa" (botão primário, tooltip) fica clara `#E6EFEA` com texto forest.
  Segue `prefers-color-scheme`; `data-theme="light|dark"` força numa subárvore.
- **Medidor** (`Gauge`, investidômetro): `gauge-1..5` vão de vermelho (muito endividado) a laranja, âmbar, lime e
  verde-escuro (mega investidor); no escuro, os mesmos tons clareados. Só a faixa do valor fica opaca.
- Na UI, consuma **sempre** a camada semântica (`--text-primary`, `--surface-card`, `--chart-1`…). Rampas
  (`--lime-400`…) só para arte que não muda com o tema (cartões, card de saldo, orbe).

## Typography

- **Urbanist** em todo o produto (geométrica, "a" de um andar). Manchetes misturam pesos na mesma linha
  ("Suas finanças, **simplificadas.**").
- **Plus Jakarta Sans** para texto longo (explicações, termos, notas).
- **Space Grotesk** para números de cartão, IDs e teclas.
- Papéis: `display` 56, `h1` 34, `h2` 22, `h3` 18, `card-title` 18 em negrito (700, para o título do card se destacar do
  conteúdo; decidido em 28/10/2026), `body` 14, `caption` 12; valores
  `amount-xl/lg/md` em semibold. Fontes servidas localmente (`design-system/fonts/`, woff2 variável).

## Layout

- Base de 4 px com meios-passos 2/6/10/14 para dados densos. Cards com padding 16, grid gap 12.
- Sidebar 256, top bar 72 (60 no celular). Grid de 12 colunas guiado por **container queries**, não pela
  viewport: ≥1120 três por linha, ≥760 dois, abaixo disso uma coluna; KPIs viram rolagem horizontal; tabelas
  viram lista abaixo de 520; diálogos viram bottom sheet abaixo de 560.
- Mobile first: tudo funciona em 360 px; alvos de toque ≥ 44 px (`touch-target`).

## Elevation & Depth

Quase plano. Branco sobre `#F5F5F5` faz o trabalho; cards **sem sombra e sem borda**. Sombras só no que
flutua (popover, tooltip, toast, diálogo) — curtas, tingidas de forest, alfa baixo. Item ativo da navegação
usa `shadow-xs`. Botões lime de confirmação em largura total têm borda inferior interna (`shadow-raised`).
Overlay: forest a 32% + blur de 6 px. Foco: anel lime de 3 px (`shadow-focus`).

## Shapes

Badges 6, icon buttons 8, inputs/selects 10, tiles 12, cards 16, diálogos 20, moldura de app 28. Ações
principais são **pílulas**; ações compactas de toolbar (Exportar, Baixar) são retângulos de raio 8.

## Components

A biblioteca tem 41 componentes em sete grupos — core (Avatar, Badge, Button, Chip, Icon, IconButton, Kbd,
Logo), forms (Checkbox, Input, MonthPicker, Radio, Select, Switch), navigation (AppShell, BottomNav, Breadcrumb, Sidebar, NavItem,
Tabs, TopBar), data (AreaChart, BarChart, Card, DataTable, Delta, DonutChart, Gauge, Legend, ProgressBar, StatTile),
feedback (Dialog, Toast, Tooltip), finance (BalanceCard, CreditCard, CurrencySelect, PaymentCardItem) e ai
(AIComposer, AIOrb, ChatMessage, PromptCard). Uso de cada um: `design-system/guidelines/componentes.md`.
Todos os estados (padrão, hover, active, focus, disabled, loading, erro, vazio, selecionado) e os dois temas
estão na rota `/design-system`.

- Movimento calmo: 140–320 ms, `cubic-bezier(.2,0,0,1)`; sem bounce; gráficos crescem em 600 ms; respeita
  `prefers-reduced-motion`. Pressionar: `scale(.98)` em botões, `.94` em icon buttons.
- Hover escurece um degrau de cinza; lime → `#8BDB57`; forest → `#103F37`.
- Ícones Lucide de traço 1.6–2, 20 px na navegação, 15–18 px inline. Nenhum emoji, nenhuma fonte de ícones.

## Do's and Don'ts

- **Faça:** importe componentes de `@ds`; use tokens (`var(--…)` no CSS, utilitários mapeados no Tailwind
  como `bg-card`, `text-secondary`, `rounded-card`, `p-4`); um único `primary` por card; um BalanceCard por
  tela; estados vazio, carregando e erro em toda lista; toast com "Desfazer" depois de salvar.
- **Não faça:** cor hex, `px`, fonte ou raio escritos à mão no código do app (o lint de aderência acusa);
  cards com borda colorida à esquerda; gradientes agressivos; logo sobre lime, recolorido ou com sombra;
  azuis/roxos; emoji; verde para valores positivos comuns.
