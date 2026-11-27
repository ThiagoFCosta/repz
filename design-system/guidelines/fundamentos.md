<!-- Original: design-system-export/readme.md (export do Claude Design). Texto preservado; só o "Index" foi
     atualizado para o layout novo. Tokens normativos: DESIGN.md na raiz. Mapa da biblioteca: design-system/README.md. -->
# Prisma Design System

Prisma is an **AI-powered personal-finance admin dashboard**: income, expenses, savings, cards, currency exchange and an AI assistant ("Prisma IA") in one calm, green interface. It ships as **one responsive product** — full desktop admin with sidebar, collapsing to a complete mobile experience (drawer nav, stacked cards, list-style tables, bottom-sheet dialogs) without dropping features.

## Sources
- `uploads/behance_ai_finance_01…08.png` — a Behance case study of a finance dashboard concept ("Fynix", 2025): dashboard, AI assistant, transactions, wallet, mobile and landing screens; typography (Space Grotesk / Urbanist / Plus Jakarta Sans) and color swatches (#9FE870, #062F28, #7B7B7B, #FFFFFF).
- `uploads/logo.png` — Prisma's logo (faceted hexagon, lime → teal → forest), supplied by the user. Background removed → `assets/logo-mark.png`; embedded in the `Logo` component.
- No codebase or Figma for **Prisma** was supplied. The visual language (colors, spacing, components, layouts) was measured from the case-study screenshots (pixel-sampled) and rebranded to Prisma. The Fynix bird mark was **not** reused.
- UI copy is written in **pt-BR** with BRL currency (the brief was written in Portuguese).

## Index (layout do projeto)
- `tokens/index.css` — entrada (imports) → `fonts, colors, typography, spacing, radii, shadows, motion, theme-dark, base`; `tokens/tailwind.css` — ponte para o Tailwind v4
- `fonts/` — Urbanist, Plus Jakarta Sans, Space Grotesk (woff2, latin + latin-ext, from Google Fonts)
- `assets/icons/` — 113 Lucide SVGs · `assets/flags/` — 5 flag-icons SVGs · `assets/ai-orb.png` — AI orb raster (cropped from source) · `assets/logo-mark.png` — Prisma mark (transparent PNG)
- `components/` — componentes React/TS (ver lista) · `index.ts` — API pública (`@ds`)
- `templates/admin/` — porte do ui kit admin (Painel, Prisma IA, Transações, Carteira)
- `reference/` — HTMLs de referência visual: `guidelines/*.html` (cards de fundamentos), `components/*/*.card.html`, `ui_kits/admin|mobile/index.html`, `thumbnail.html`
- `guidelines/` — este arquivo e `componentes.md` · skill do Claude: `.claude/skills/prisma-design/SKILL.md`

## Components
No app: `import { … } from '@ds'`. (Nos HTMLs de referência: `window.PrismaDesignSystem_226d43`, de `reference/_ds_bundle.js`.)
- **core/** Logo, Icon, Button, IconButton, Badge, Chip, Avatar, Kbd
- **forms/** Input, Select, Checkbox, Radio, Switch
- **navigation/** AppShell, Sidebar (+ NavItem), TopBar, Tabs, Breadcrumb
- **data/** Card, StatTile, Delta, ProgressBar, Legend, DataTable, BarChart, AreaChart, DonutChart
- **feedback/** Dialog, Toast, Tooltip
- **finance/** BalanceCard, CreditCard, PaymentCardItem, CurrencySelect
- **ai/** AIOrb, AIComposer, PromptCard, ChatMessage

**Intentional additions** (not visible in source, needed for a working product): Switch (settings), Dialog/Toast (send/deposit flows, confirmations), ChatMessage (assistant conversation state), Tooltip, AppShell drawer behaviour.

## Content fundamentals
- **Voice:** calm, competent, encouraging. Short declaratives about the user's money: "Acompanhe suas finanças com facilidade." Never alarmist, even for alerts ("Gasto incomum detectado").
- **Person:** speak to the user as **você**; the product speaks as itself, rarely "eu" — only the assistant uses first person ("Como posso ajudar?", "Encontrei 1 cobrança suspeita").
- **Page descriptions are quoted.** Signature quirk of the source: the top-bar subtitle sits in curly quotes — “Veja, acompanhe e gerencie todas as despesas com facilidade.” Promo copy too (“Assine o Prisma Plus…”).
- **Casing:** sentence case for titles and buttons ("Transações recentes", "Fazer upgrade"); section labels in the sidebar are UPPERCASE small caps-style ("MENU PRINCIPAL").
- **Numbers lead.** Amounts are the hero: `R$ 20.670`, deltas as `+1,78%` (pt-BR decimal comma, thousand dot). Negative amounts use a true minus `−R$ 150,00` in red; positive `+R$ 500,00` in ink, not green.
- **Verbs on buttons:** Enviar, Depositar, Converter, Baixar, Continuar, Saiba mais →. Arrow glyphs come from icons, not text.
- **No emoji.** Ever. Unicode only for keycaps (⌘) and separators (·, –).

## Visual foundations
- **Color:** two-brand-color system — **Lime #9FE870** (energy, AI, confirm, hero balance card, chart series 2) and **Forest #062F28** (all text, primary buttons, chart series 1). Everything else is true grey. Status uses soft tints (lime-50/red-50) with AA-safe text (lime-700/red-600 — darker than the source's lime-on-lime, which fails contrast). Never introduce blues/purples.
- **Surfaces:** page `#F5F5F5`, shell (sidebar + top bar) `#F0F0F0` separated by 1px `#E5E5E5` hairlines, cards pure white. Inner tiles inside cards get a 1px `#EBEBEB` ring; inputs/composers sit on sunken `#F4F4F4`.
- **Type:** Urbanist everywhere in product (geometric, single-storey a). Headlines mix weights — light + semibold in the same line ("Suas finanças, **simplificadas.**"). Plus Jakarta Sans for long-form; Space Grotesk for card numbers, IDs, keycaps.
- **Spacing:** 4px base with half-steps (2/6/10/14) for dense data. Cards pad 16px, grid gap 12px, sidebar 256px, top bar 72px (60 mobile).
- **Corner radii:** badges 6, icon buttons 8, inputs/selects 10, tiles 12, cards 16, dialogs 20, device/app frame 28. Primary actions are **pills**; compact toolbar actions (Exportar, Baixar, Obter Plus) are 8px rounded rects.
- **Cards:** white, radius 16, **no shadow, no border** on the grey page; title row 16px semibold + right-aligned actions (outline "⋯" icon button, small Select). Never colored left-border cards.
- **Elevation:** almost flat. Shadows only for floating things (popovers, tooltips, toasts, dialogs) — short, forest-tinted, low alpha. Active nav item gets `shadow-xs`. Full-width lime confirm buttons get an inset bottom edge (`--shadow-raised`).
- **Backgrounds & imagery:** no full-bleed photos in product. The only "imagery" is (1) the lime balance card with soft white ring highlights echoing a glossy 3D swirl, and (2) the blurred green **AI orb** raster. Imagery vibe: fresh green, soft-focus, light.
- **Gradients:** only subtle — area-chart fills (lime → transparent), ring highlights on the balance card. No aggressive gradient backgrounds.
- **Transparency & blur:** overlay scrim is forest at 32% + 6px backdrop blur. Nothing else is translucent.
- **Motion:** calm, 140–320ms, `cubic-bezier(.2,0,0,1)` / out-expo; fades and 4–8px rises; drawer slides; no bounce. Charts grow 600ms. Respects reduced motion.
- **Hover:** surfaces darken one grey step (white → `#FAFAFA`/`#F5F5F5`); lime → `#8BDB57`; forest → `#103F37`. Prompt cards tint lime-50. **Press:** scale(.98) on buttons, .94 on icon buttons. **Focus:** 3px lime ring (`--shadow-focus`).
- **Layout rules:** fixed sidebar + top bar; content scrolls. 12-col grid driven by **container queries** (not viewport) so screens reflow identically in a browser or inside a phone frame: ≥1120 3-up rows, ≥760 2-up, below that single column, KPI tiles become a horizontal snap-scroll, tables become lists (`DataTable` at <520px), dialogs become bottom sheets (<560px).
- **Charts:** forest bars up / lime bars down for cash flow; smooth lines with dashed lime crosshair; donuts with thick segments and 3px gaps; tooltips are white cards with a hairline ring.

## Iconography
- **Set:** Lucide (outline, round caps/joins), rendered at **1.6–2px stroke**, 20px in nav, 15–18px inline. 113 glyphs copied from `lucide-static@0.460.0` into `assets/icons/` and embedded in the `Icon` component (`components/core/iconPaths.ts`).
- **Substitution flag:** the source's exact icon set is unknown; Lucide is the closest match in weight and style. Swap in the real set if one exists.
- Icons sit **bare** in nav, inside **white circles** in mobile headers and composer tools, inside **bordered 32px rounded squares** in KPI tiles, inside **lime circles** in transaction rows.
- Card-network marks (VISA/MC) are rendered as **plain text tags** — no third-party logos. Flags come from flag-icons (MIT), embedded in `CurrencySelect`.
- No emoji, no icon font, no unicode-as-icon (except ⌘ in keycaps).

## Logo
- **Mark:** a faceted hexagon / prism — light lime top-left fading through sage and teal to deep forest at the base, split by white facet lines. It literalizes the name and its gradient spans the brand palette.
- **Lockup:** mark + "Prisma" in Urbanist Bold, gap = 0.3× mark height (`<Logo />`). Mark alone (`variant="mark"`) for favicons, avatars, small spaces.
- **Backgrounds:** white, `#F5F5F5`/`#F0F0F0`, or forest `#062F28` (wordmark white). Never on lime — the top facet disappears.
- **Don't** recolor, outline, rotate, add shadows or stretch the mark. Minimum height 16px.
- Currently a raster (353×348 PNG). Supply a vector SVG (paths, not an embedded image) for crisp large sizes.

## Fonts
Urbanist, Plus Jakarta Sans and Space Grotesk are the families named in the source; files were pulled from Google Fonts (variable woff2). If Prisma licenses different cuts, replace files in `fonts/` and keep the family names.
