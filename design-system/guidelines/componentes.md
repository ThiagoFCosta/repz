# Componentes — guia de uso

Consolidação dos `*.prompt.md` do export do Claude Design (um por componente), texto original preservado.
Diferenças no projeto: componentes agora são `.tsx` tipados em `design-system/components/<grupo>/` e importados de `@ds`;
ícones/bandeiras/orbe/logo vêm de `design-system/assets/` (não mais data URIs); props marcadas como **adição do projeto**
nos arquivos `.tsx` (ex.: `loading`, `invalid`, `disabled`, `error`) não existiam no export. Exemplos com `var(--lime-600)`
continuam válidos, mas prefira os tokens semânticos (`--icon-brand`, `--chart-1`…) que respondem ao tema escuro.

## core

### Avatar

Circular user avatar with photo or brand-toned initials fallback.

```jsx
<Avatar name="Júlia Mendes" size={40} />
<Avatar name="Júlia Mendes" src={url} ring status="online" />
```

- Initials cycle through forest/lime/mint/gray tones by name.

### Badge

Status label — transaction status (Concluído/Pendente), plan tags (Premium), card state (Ativo), percentage pills.

```jsx
<Badge tone="success">Concluído</Badge>
<Badge tone="danger">Pendente</Badge>
<Badge tone="inverse" size="sm">Ativo</Badge>
```

- Soft tints only (lime-50 / red-50) with AA text (lime-700 / red-600) — never saturated fills except `brand`/`inverse`.
- Radius 6px; `shape="pill"` for deltas.

### Button

Primary action control — forest pill for main actions, lime for brand/AI/confirm, white/secondary for neutral.

```jsx
<Button variant="primary" iconRight="arrow-up-right">Enviar</Button>
<Button variant="white" iconRight="arrow-down" iconRightColor="var(--lime-600)">Depositar</Button>
<Button variant="brand" shape="rounded" block raised size="lg">Converter</Button>
```

- `primary` forest #062F28 / white text — default CTA. `brand` lime #9FE870 / forest text — AI, "Get Plus", confirm.
- `secondary` white + 1px border; `white` borderless (on lime/gray surfaces); `soft` gray-100; `ghost` transparent.
- Sizes 32/40/48px. Press = scale(.98). Never more than one `primary` per card.

### Chip

Small pill for AI prompt suggestions and filter tokens; becomes a toggle button when onClick is set.

```jsx
<Chip icon="chart-column" onClick={ask}>Mostrar meu fluxo de caixa</Chip>
<Chip selected onClick={toggle}>Finanças</Chip>
```

- 30px tall, 12px text, 1px gray-150 border. Selected = lime-50 + lime border.

### Icon

Stroke icon (Lucide set, copied locally) — use for every glyph in Prisma UI; never emoji or unicode symbols.

```jsx
<Icon name="wallet" size={20} />
<Icon name="circle-dollar-sign" color="var(--lime-600)" />
```

- Default 20px / 1.75 stroke; nav uses 20px, inline-with-text 15–17px.
- Color inherits currentColor. Use `--icon-secondary` for passive, `--lime-600` for brand accents on white.
- `ICON_NAMES` lists every available glyph.

### IconButton

Icon-only button — card menus (outline ⋯), top-bar actions (ghost), mobile header and composer tools (white circle).

```jsx
<IconButton icon="ellipsis" label="Mais opções" variant="outline" size="sm" />
<IconButton icon="bell" label="Notificações" variant="white" shape="circle" size="lg" dot />
```

- sm 28 / md 36 / lg 44px (lg = mobile touch target).
- `outline` = white + border, radius 8: the "⋯" / "+" in card headers.
- `inverse` circle = forest; `brand` circle = lime.

### Kbd

Keyboard-shortcut keycap shown inside search fields (⌘ F).

```jsx
<Kbd>⌘</Kbd><Kbd>F</Kbd>
```

- Space Grotesk 11px, 22px square, 1px border.

### Logo

Prisma brand lockup (faceted hexagon mark + "Prisma" wordmark) — use wherever the brand appears: sidebar, login, mobile header, footers.

```jsx
<Logo size={30} />
<Logo variant="mark" size={24} />
<Logo tone="light" size={40} />
```

- Mark is a raster (assets/logo-mark.png, transparent). Keep ≥16px tall; clear space = half the mark height.
- Don't recolor, rotate, outline or place the mark on lime — use white, #F5F5F5 or forest backgrounds.
- `Sidebar` renders `<Logo />` by default.

## forms

### Checkbox

Square checkbox — table row selection and settings lists.

```jsx
<Checkbox label="Lembrar deste dispositivo" defaultChecked />
<Checkbox aria-label="Selecionar todos" indeterminate />
```

- Checked = forest fill with lime check.

### Input

Text field with optional label, icons, shortcut keycaps and validation.

```jsx
<Input leadingIcon="search" kbd={["⌘","F"]} placeholder="Buscar qualquer coisa" />
<Input label="E-mail" hint="Usaremos para recibos" type="email" />
<Input variant="filled" size="sm" placeholder="Buscar transação" trailingIcon="search" />
```

- 32/40/48px; radius 10. Focus = forest border + lime ring. Error = red border + message.

### MonthPicker

Seletor de mês global (adição do projeto, Fase 3) — fica na TopBar do app e muda o mês de todas as telas.

```jsx
<MonthPicker value={mes} onChange={setMes} current="2026-10" mode={modo} onModeChange={setModo} />
<MonthPicker size="lg" value={mes} onChange={setMes} min="2025-01" max="2027-12" />
```

- ‹ e › andam um mês (ou um ano no modo `ano`); o rótulo `out/2026` abre a grade de 12 meses com o ano em ‹ 2026 ›.
- `current` marca o mês atual com contorno lime e mostra o botão "Mês atual"; o selecionado fica em lime cheio.
- `onModeChange` mostra o seletor Mês/Ano na grade (visões anuais). `min`/`max` desabilitam o que estiver fora. `align` (start · center · end) posiciona a grade; use `end` perto da borda direita.
- Esc e clique fora fecham. Células com 44px de altura (`--touch-target`); `size="lg"` leva também as setas a 44px.
- Valores sempre `YYYY-MM`; o componente não sabe a data de hoje — quem usa passa `current`. `defaultOpen` abre a grade sem roubar o foco (galeria).

### Radio

Round single-choice control — lime fill with white inner ring when selected (matches card picker).

```jsx
<Radio name="plan" value="m" label="Mensal" defaultChecked />
```

- 20px; for card selection rows use PaymentCardItem instead.

### Select

Custom dropdown (listbox popover) — period pickers ("Este mês"), category/account filters, model picker.

```jsx
<Select size="sm" options={[{value:'m',label:'Este mês'},{value:'y',label:'Este ano'}]} />
<Select variant="ghost" align="right" options={periods} onChange={setPeriod} />
```

- Keyboard: ↑/↓, Enter, Esc. Click-outside closes.
- Options can carry an `icon` or `imageSrc` (flags).

### Switch

Binary on/off toggle for settings (notifications, card freeze). Intentional addition.

```jsx
<Switch label="Alertas de gastos incomuns" defaultChecked />
```

- On = lime track + forest thumb.

## navigation

### AppShell

Responsive admin layout — sidebar column + top bar + scrolling content; under 1024px (container width) the sidebar becomes a drawer.

```jsx
<div style={{height:'100vh'}}>
  <AppShell sidebar={<Sidebar …/>} topbar={<TopBar onMenuClick={()=>setOpen(true)} …/>} drawerOpen={open} onDrawerClose={()=>setOpen(false)}>
    …page…
  </AppShell>
</div>
```

- Uses container queries (`container-name: prisma-shell`) so it also works inside device frames.
- Give the parent an explicit height.
- `bottomNav` (adição do projeto): barra inferior mostrada só abaixo de 1024px de container (ver BottomNav).

### BottomNav

Barra inferior fixa do celular (adição do projeto, Fase 3): Início · Cartões · Lançar (+) · Terceiros · Menu.

```jsx
<AppShell sidebar={…} topbar={…} bottomNav={
  <BottomNav activeId="cartoes" onSelect={ir} items={[
    {id:'inicio',label:'Início',icon:'house'}, {id:'cartoes',label:'Cartões',icon:'credit-card'},
    {id:'lancar',label:'Lançar',icon:'plus',primary:true}, {id:'terceiros',label:'Terceiros',icon:'users'},
    {id:'menu',label:'Menu',icon:'menu'}]} />} />
```

- Fundo `surface-card` com linha `border-default` em cima; ícones de 20px; ativo em `text-primary` com indicador lime.
- O item `primary` vira o botão circular lime (`surface-brand`) elevado no centro — use em um item só.
- Cada item tem ≥ `--touch-target` de altura; respeita `env(safe-area-inset-bottom)` (iPhone).
- No `AppShell` (prop `bottomNav`) aparece só abaixo de 1024px de container, junto com a gaveta.
- `count` mostra um contador no ícone; `disabled` apaga o item.

### Breadcrumb

Page-level breadcrumb in heading scale ("Visão geral / Detalhes do saldo").

```jsx
<Breadcrumb items={[{label:'Visão geral',onClick:back},{label:'Detalhes do saldo'}]} />
```

- Ancestors gray regular, current forest semibold.

### Sidebar

Left navigation rail — brand, account switcher, sectioned nav (MENU PRINCIPAL / PREFERÊNCIAS) and promo footer.

```jsx
<Sidebar account={{name:'Júlia Mendes',subtitle:'Conta pessoal'}} activeId="dash" onSelect={go}
  sections={[{label:'Menu principal',items:[{id:'dash',label:'Painel',icon:'house'}]}]} />
```

- 256px wide, #F0F0F0. Active item = white + shadow-xs + semibold.
- Inside AppShell it becomes an off-canvas drawer under 1024px.

### Tabs

Tab switcher — underline for in-card views (Receita/Despesa, Carteira/Investimento), segmented for mobile filters.

```jsx
<Tabs block items={[{value:'in',label:'Receita',meta:'(R$ 4.800)'},{value:'out',label:'Despesa',meta:'(R$ 3.500)'}]} defaultValue="out" />
```

- Arrow keys move between tabs. Horizontal overflow scrolls on small screens.

### TopBar

Page header — title + quoted description, ⌘F search, settings/help, avatar; collapses to hamburger + circle buttons inside a narrow AppShell.

```jsx
<TopBar title="Início" subtitle="“Acompanhe suas finanças com insights de IA.”" user={{name:'Júlia Mendes'}} onMenuClick={openDrawer} />
```

- 72px desktop / 60px mobile. Responds to the `prisma-shell` container, not the viewport.
- `search={false}` esconde a busca do desktop (adição do projeto, para telas sem busca).

## data

### AreaChart

Smooth line/area chart with dashed lime crosshair and floating tooltip — wallet growth, cash flow over time.

```jsx
<AreaChart labels={months} series={[{name:'Receita',data:inc,color:'var(--lime-500)'},{name:'Despesa',data:exp,color:'var(--forest-900)',area:false}]} />
```

### BarChart

Diverging cash-flow bars — income (forest) up, expense (lime) down, hover tooltip.

```jsx
<BarChart height={240} defaultActive={5} data={[{label:'Jan',income:6000,expense:4000}, …]} />
```

- Fluid width; bars cap at 30px. Columns are focusable for keyboard users.

### Card

The dashboard widget container — white, radius 16, no shadow, with optional title row and header actions.

```jsx
<Card title="Fluxo de caixa" actions={<Select size="sm" options={periods} />}>
  <BarChart data={months} />
</Card>
```

- Flat on #F5F5F5; add `outline` when placed on white. Gap between cards: 12px.

### DataTable

Transactions table — gray header strip, sortable columns, row selection; reflows to a stacked list in narrow containers.

```jsx
<DataTable selectable rows={txns} columns={[
  {key:'name',header:'Transação',sortable:true,mobile:'primary',render:r=><TxName {...r}/>},
  {key:'date',header:'Data',mobile:'meta'},
  {key:'amount',header:'Valor',align:'right',sortable:true,mobile:'trailing'},
  {key:'status',header:'Status',mobile:'trailing',render:r=><Badge tone="success">Concluído</Badge>},
]} />
```

- Sorting is internal unless `onSortChange` is given (then you sort).
- Container query switch at 520px — keep primary + amount + status on mobile, nothing important lost.
- `mobileLabel` (adição do projeto) põe o cabeçalho antes do valor de uma coluna `meta` na lista estreita, para valores que sozinhos ficariam ambíguos (ex.: "Sua parte R$ 10,00").
- `mobileList={false}` mantém a tabela no container estreito, com rolagem horizontal (matrizes mês a mês, como o fluxo de caixa). `stickyFirstColumn` (adição do projeto) fixa a primeira coluna nessa rolagem.
- `rowTone` (adição do projeto) destaca a linha: `section` (título de seção, fundo rebaixado e fonte maior) ou `total` (negrito com linha acima). As matrizes do app usam para seções recolhíveis e totais.

### Delta

Trend pill (+1,78%) with arrow; green for good, red for bad.

```jsx
<Delta value={1.78} />
<Delta value={-2.4} invert />
```

- Uses pt-BR decimal comma by default.

### DonutChart

Segmented donut with centered total — expense breakdown by category.

```jsx
<DonutChart label="Despesa total" value="R$ 3.500" segments={[{label:'Moradia',value:60,color:'var(--chart-1)'},{label:'Investimentos',value:15,color:'var(--chart-2)'}]} />
```

- Series order: forest → lime → mint → gray.

### Gauge

Medidor em semicírculo com até 5 faixas e ponteiro (adição do projeto, Fase 6) — o investidômetro (02 §12).

```jsx
<Gauge value={0.5448} />
<Gauge value={0.92} size={160} caption="Outubro de 2026" />
<Gauge value={null} />   {/* sem dados: sem ponteiro, "Sem dados" */}
<Gauge value={null} loading />
```

- `value` de 0 a 1; as faixas padrão são as do investidômetro (≤ 22,5% · ≤ 45% · ≤ 55% · ≤ 77,5% · acima), com
  limites inclusivos e o primeiro que couber, igual à planilha. `bands` troca as faixas (até 5, cores `--gauge-1..5`).
- Só a faixa do valor fica opaca; o texto padrão é o rótulo da faixa (`label` substitui). `role="meter"` com o valor e o texto.
- Largura `size` (padrão 240) com `max-width: 100%`: cabe em 360 px.

### Legend

Chart legend with square swatches; column mode shows values right-aligned.

```jsx
<Legend items={[{label:'Receita',color:'var(--chart-1)'},{label:'Despesa',color:'var(--chart-2)'}]} />
```

### ProgressBar

Progress/score bar — the two-segment "split" bar for finance score and spending limits.

```jsx
<ProgressBar value={78} height={28} />
<ProgressBar variant="bar" value={45} label="Limite de gastos" valueLabel="45%" />
```

### StatTile

KPI tile — icon box, label, big amount and trend; sits inside a Card (bordered) or alone.

```jsx
<StatTile icon="circle-dollar-sign" label="Receita" value="R$ 14.480,24" delta={1.78} />
<StatTile variant="stack" icon="piggy-bank" iconTone="forest" label="Total poupado" value="R$ 56.000" delta={1.24} onMenu={…} />
```

- Value 22px semibold; tiles are 12px radius with 1px border.

## feedback

### Dialog

Modal dialog — centered on desktop, bottom sheet under 560px; blurred forest scrim, Esc to close.

```jsx
<Dialog open={open} onClose={close} title="Enviar dinheiro" description="Revise antes de confirmar."
  footer={<><Button variant="secondary" onClick={close}>Cancelar</Button><Button>Confirmar</Button></>}>…</Dialog>
```

### Toast

Transient notification card — confirmations, AI alerts, errors. Position it yourself (top-right desktop, top-center mobile).

```jsx
<Toast tone="success" title="Transferência enviada" description="R$ 250,00 para Marina Costa" onClose={dismiss} />
```

### Tooltip

Hover/focus hint bubble — forest by default, light variant for data.

```jsx
<Tooltip content="Exportar CSV"><IconButton icon="download" label="Exportar" /></Tooltip>
```

## finance

### BalanceCard

The lime "Saldo total" hero card — the single loudest element on a screen; one per view.

```jsx
<BalanceCard amount="R$ 20.670" currency="BRL" onAdd={…}
  secondaryAction={{label:'Depositar'}} primaryAction={{label:'Enviar'}} />
```

- Soft white ring highlights echo the glossy 3D swirl of the source art.

### CreditCard

Payment-card visual — full (balance, network, last digits) or 56×36 mini thumbnail for lists.

```jsx
<CreditCard balance="R$ 2.981" last4="1777" expiry="20/26" />
<CreditCard size="mini" tone="lime" last4="8744" />
```

- Network renders as plain text — no third-party logos.

### CurrencySelect

Flag + ISO code currency picker for exchange/convert widgets.

```jsx
<CurrencySelect defaultValue="USD" onChange={setFrom} />
```

- Flags from flag-icons (MIT), embedded as data URIs.

### PaymentCardItem

Selectable card row for "Seus cartões" — radio, mini card, name, masked number, menu.

```jsx
<PaymentCardItem name="Pessoal" last4="8744" tone="lime" selected onSelect={…} onMenu={…} />
```

- Selected = lime-50 fill + lime border. role="radio" — wrap a list in role="radiogroup".

## ai

### AIComposer

"Pergunte qualquer coisa…" prompt box — gray sunken field, wand icon, attach/mic/image tools, lime Send.

```jsx
<AIComposer onSubmit={ask} leading={<Chip>Finanças</Chip>} />
```

- Enter sends, Shift+Enter newline; auto-grows to 180px.

### AIOrb

The assistant's identity — a soft green raster orb; pulses while thinking.

```jsx
<AIOrb size={96} />
<AIOrb size={30} thinking />
```

- Raster asset embedded (assets/ai-orb.png). Never replace with an emoji or robot icon.

### ChatMessage

Conversation bubble — user (forest, right) or assistant (white + orb, left), with typing state. Intentional addition.

```jsx
<ChatMessage role="user">Quanto gastei com mercado?</ChatMessage>
<ChatMessage actions time="14:02">Você gastou R$ 1.240 em setembro…</ChatMessage>
```

### PromptCard

Example-prompt card on the assistant empty state ("Acompanhar fluxo de caixa — Saiba mais →").

```jsx
<PromptCard title="Detectar transações incomuns" description="Alertas instantâneos para cobranças suspeitas." onClick={…} />
```
