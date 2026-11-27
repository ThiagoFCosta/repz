// Aderência ao design system para ESLint (flat config).
// Fonte: adherence.oxlintrc.json — config gerada pelo Claude Design no export (formato oxlint). Este módulo
// lê o JSON e o converte, para que um novo export possa substituir o JSON sem reescrever regras à mão.
//
// Conversões feitas aqui (ver README do design-system):
// - `no-restricted-imports`: os padrões do export ("components/core/**") só casavam com o layout do dump;
//   viram padrões do projeto — consumidores importam de `@ds`, nunca de design-system/components/**.
// - `react/forbid-elements` (lista vazia, sem efeito) e os plugins `react`/`import` não são carregados.
// - Regras de props JSX (`<Button> doesn't accept…` / `variant must be one of…`) NÃO são carregadas: a allowlist
//   gerada ignora as props HTML herdadas que os próprios .d.ts do export declaram (onClick, disabled, value…)
//   e acusaria uso correto. O contrato de props é garantido pelo TypeScript (tipos portados dos .d.ts).
//   Ficam as regras de token: hex cru, px cru e fonte fora do sistema.
import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('./adherence.oxlintrc.json', import.meta.url), 'utf8'));
const [syntaxLevel, ...allSyntaxRules] = raw.rules['no-restricted-syntax'];
const syntaxRules = allSyntaxRules.filter((r) => r.selector.startsWith('Literal'));

const PX_SELECTOR = 'Literal[value=/\\b\\d+px\\b/]';

/** Hex cru, fontes fora do DS e props inválidas — vale para todo o código (app e biblioteca). */
export const adherenceEverywhere = {
  'no-restricted-syntax': [syntaxLevel, ...syntaxRules.filter((r) => r.selector !== PX_SELECTOR)],
};

/** Regras só para consumidores (src/): também px cru e imports internos da biblioteca. */
export const adherenceConsumers = {
  'no-restricted-syntax': [syntaxLevel, ...syntaxRules],
  'no-restricted-imports': [
    raw.rules['no-restricted-imports'][0],
    {
      patterns: [
        {
          group: ['**/design-system/components/**', '**/design-system/templates/**'],
          message: "Importe componentes do design system de '@ds' (e templates de '@ds-templates'), não dos arquivos internos.",
        },
      ],
    },
  ],
};

/** Metadados do Claude Design (bloco "x-omelette"): tokens e famílias de fonte conhecidas. */
export const adherenceFontFamilies = raw['x-omelette']?.fontFamilies ?? ['Urbanist', 'Plus Jakarta Sans', 'Space Grotesk'];
