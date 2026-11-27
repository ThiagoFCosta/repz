# design-system — biblioteca Prisma

Biblioteca de UI do app Finanças Pessoais. Contrato visual e fonte da verdade dos tokens: [`../DESIGN.md`](../DESIGN.md).
Vitrine viva com todos os componentes, estados e os dois temas: rota **`/design-system`** (`npm run dev`).

Origem: export do Claude Design (pasta `design-system-export`, já removida), triado e portado para
React 18 + TypeScript strict + Tailwind v4. O que veio de onde está em "Origem" no fim deste arquivo.

## Mapa

| Pasta / arquivo | O que tem |
|---|---|
| `index.ts` | **API pública** — tudo que o app usa sai daqui. Alias `@ds` (vite.config.ts e tsconfig.app.json). |
| `tokens/` | Tokens em CSS custom properties. `index.css` é a entrada (fonts, colors, typography, spacing, radii, shadows, motion, theme-dark, base). `theme-dark.css` redefine só a camada semântica. `tailwind.css` mapeia os tokens para utilitários do Tailwind v4 (`bg-card`, `text-secondary`, `rounded-card`, `p-4`…) e **zera** a paleta padrão do Tailwind. |
| `fonts/` | Urbanist, Plus Jakarta Sans, Space Grotesk (woff2 variável, latin + latin-ext), carregadas por `tokens/fonts.css`. |
| `assets/` | `icons/` (113 SVGs Lucide), `flags/` (5 SVGs flag-icons), `logo-mark.png`, `ai-orb.png`. |
| `components/<grupo>/` | Componentes `.tsx` tipados com CSS co-localizado (`Nome.css`, dentro de `@layer components`). Grupos: `core`, `forms`, `navigation`, `data`, `feedback`, `finance`, `ai`. |
| `templates/` | Padrões de composição (porte do UI kit admin): `PrismaApp` (shell + rotas + diálogo + toasts) e as telas Painel, Assistente, Transações e Carteira, com `KitWidgets` e dados fictícios. Alias `@ds-templates`. |
| `guidelines/` | `fundamentos.md` (voz, conteúdo, fundamentos visuais, iconografia, logo — readme original do export) e `componentes.md` (guia de uso de cada componente). |
| `lint/` | `adherence.oxlintrc.json` (config de aderência exportada pelo Claude Design) e `adherence.js` (converte para ESLint; usado em `eslint.config.js`). |
| `reference/` | **HTMLs de referência visual** (não são componentes): `guidelines/*.html` (cards de cores, tipo, espaço, raios, sombras, marca), `components/<grupo>/*.card.html` (cards de cada grupo), `ui_kits/admin/index.html` e `ui_kits/mobile/index.html` (protótipo navegável), `thumbnail.html`. Dependências próprias: `styles.css` (aponta para `../tokens`, só tema claro) e `_ds_bundle.js` (bundle do Claude Design que esses HTMLs carregam). |

### Abrir os HTMLs de referência

```bash
npm run reference
```

Sobe um servidor estático sem dependências em `http://localhost:5174/reference/` (os kits e cards carregam `.jsx`
com Babel no navegador, que não funciona em `file://`). As páginas de `reference/guidelines/` também abrem com duplo
clique. Os kits buscam React/Babel em unpkg.com (como no export original), então precisam de internet.

## Componentes (41)

- **core** — Avatar, Badge, Button, Chip, Icon, IconButton, Kbd, Logo
- **forms** — Checkbox, Input, MonthPicker, Radio, Select, Switch
- **navigation** — AppShell, BottomNav, Breadcrumb, NavItem, Sidebar, Tabs, TopBar
- **data** — AreaChart, BarChart, Card, DataTable, Delta, DonutChart, Gauge, Legend, ProgressBar, StatTile
- **feedback** — Dialog, Toast, Tooltip
- **finance** — BalanceCard, CreditCard, CurrencySelect, PaymentCardItem
- **ai** — AIComposer, AIOrb, ChatMessage, PromptCard

## Regras

1. Telas e componentes novos do app **saem desta biblioteca**: `import { Button, Card } from '@ds'`. Nunca importe de
   `design-system/components/**` (o lint acusa).
2. **Nenhum valor de cor, fonte, espaçamento ou raio hardcoded.** Use `var(--token)` em CSS/estilos ou os utilitários
   do Tailwind mapeados em `tokens/tailwind.css`. O lint de aderência acusa hex, `px` e fontes fora do sistema em `src/`.
3. Consuma a **camada semântica** (`--text-primary`, `--surface-card`, `--chart-1`…), que responde ao tema escuro.
   Rampas (`--lime-400`, `--forest-900`…) só para arte fixa (cartões, card de saldo).
4. Toda lista tem estados vazio, carregando e erro (`DataTable` já tem `empty`, `loading` e `error`).

## Como criar um componente novo dentro do sistema

1. Verifique se dá para compor com o que existe (veja `/design-system` e `templates/`). Componente novo só se não der.
2. Crie `components/<grupo>/Nome.tsx` e, se precisar de seletores (`:hover`, `:focus-visible`, container queries),
   `Nome.css` com tudo dentro de `@layer components { … }`, classes com prefixo `pr-` no padrão BEM
   (`pr-nome`, `pr-nome--variante`, `pr-nome__parte`). Importe o CSS no `.tsx`.
3. Tipos: `export interface NomeProps extends <atributos HTML do elemento raiz>`; variantes como uniões literais;
   repasse `className`, `style` e `...rest`. Ícones com `IconName`.
4. Só tokens: nenhuma cor/fonte/raio/espaço literal — se faltar um token, crie em `tokens/` (camada semântica, com
   valor claro em `colors.css` **e** escuro nos dois blocos de `theme-dark.css`) e registre em `../DESIGN.md`.
5. Estados: hover, active, focus-visible (anel `--shadow-focus`), disabled, e quando fizer sentido loading, erro,
   vazio e selecionado. Alvos de toque ≥ `--touch-target` no celular.
6. Exporte em `index.ts`, documente em `guidelines/componentes.md` e adicione um bloco na galeria
   (`src/telas/design-system/Gallery*.tsx`) com todos os estados — `State force="hover|focus|active"` congela a
   pseudo-classe. Confira nos dois temas.
7. `npm run typecheck && npm run lint && npm run build`.

## Origem (triagem do export)

- **Canônico, portado:** `components/**/*.jsx` + `*.d.ts` (viraram `.tsx`), `*.prompt.md` (→ `guidelines/componentes.md`),
  `readme.md` (→ `guidelines/fundamentos.md`), `tokens/*.css`, `fonts/`, `assets/`, `ui_kits/admin/*.jsx` + `kit.css`
  + `data.js` (→ `templates/admin/`), `_adherence.oxlintrc.json` (→ `lint/`), `SKILL.md` (→ `.claude/skills/prisma-design/`).
- **Referência visual, movida:** `guidelines/*.html`, `components/*/*.card.html`, `ui_kits/*/index.html`,
  `ui_kits/mobile/*.jsx`, `thumbnail.html` (→ `reference/`).
- **Derivado/duplicado, não portado:** `_ds_bundle.js` (compilação dos mesmos componentes — mantido só como
  dependência de `reference/`), `iconPaths.js`/`logoData.js`/`flagData.js`/`orbData.js` (cópias em base64 dos assets;
  `iconPaths` virou `iconPaths.ts`, os demais foram trocados pelos arquivos de `assets/`), `styles.css` (→ `tokens/index.css`),
  `injectStyles.js` (substituído por CSS co-localizado).
- **Interno da ferramenta, descartado:** `_ds_manifest.json`, `.thumbnail`, `uploads/` (screenshots do Behance usados
  como fonte, `logo.png`/`logo.svg` originais — o svg embute um PNG, não é vetor).
