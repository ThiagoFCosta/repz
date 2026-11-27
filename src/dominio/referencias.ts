// Referências científicas (BRIEFING-v2, seção 11). Fonte única: o app embute esta lista (funciona offline) e
// scripts/gerar-seeds.mjs gera a semente da tabela `referencias` a partir dela.
// Conferidas na fonte (Crossref/DOI, título, autores, revista, volume e resumo) em 27/11/2026. O que é convenção
// sem estudo direto fica como `pratica` (regra do briefing: nada entra sem conferir).

export type NivelEvidencia = 'forte' | 'moderada' | 'limitada' | 'pratica';

export interface Referencia {
  chave: string;
  citacao: string;
  doiUrl: string | null;
  nivel: NivelEvidencia;
  resumo: string; // pt-BR, o que o estudo mostra
  sustenta: string[]; // onde o app usa isso
}

export const REFERENCIAS: readonly Referencia[] = [
  {
    chave: 'halperin2022',
    citacao:
      'Halperin I, Malleron T, Har-Nir I, et al. Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise: A Scoping Review and Exploratory Meta-analysis. Sports Med. 2022;52:377-390.',
    doiUrl: 'https://doi.org/10.1007/s40279-021-01559-x',
    nivel: 'moderada',
    resumo:
      'Quem treina erra, em média, por volta de 1 repetição ao estimar quantas faltam para a falha, e erra mais em séries longas.',
    sustenta: [
      'Tolerância de 1 no RIR anotado (regras 5 e 6)',
      'Não reduzir a carga por um único treino ruim (regras 3 e 7)',
      'Abaixo da faixa num dia de prontidão baixa vira manter (P3)',
    ],
  },
  {
    chave: 'hickmott2022',
    citacao:
      'Hickmott LM, Chilibeck PD, Shaw KA, et al. The Effect of Load and Volume Autoregulation on Muscular Strength and Hypertrophy: A Systematic Review and Meta-Analysis. Sports Med Open. 2022;8:9.',
    doiUrl: 'https://doi.org/10.1186/s40798-021-00404-9',
    nivel: 'moderada',
    resumo:
      'Ajustar a carga pelo esforço percebido (RIR/RPE) rendeu ganhos de força e hipertrofia semelhantes aos da prescrição fixa.',
    sustenta: ['Motor de carga autorregulado por reps e RIR (regras 4 a 7)'],
  },
  {
    chave: 'bosquet2013',
    citacao:
      'Bosquet L, Berryman N, Dupuy O, et al. Effect of training cessation on muscular performance: a meta-analysis. Scand J Med Sci Sports. 2013;23(3).',
    doiUrl: 'https://doi.org/10.1111/sms.12047',
    nivel: 'forte',
    resumo:
      'Parar de treinar reduz força e potência, e a perda cresce com a duração da pausa (relação dose-resposta, 103 estudos).',
    sustenta: ['Reduzir a carga na volta de uma pausa longa (regra 1)'],
  },
  {
    chave: 'craven2022',
    citacao:
      'Craven J, McCartney D, Desbrow B, et al. Effects of Acute Sleep Loss on Physical Performance: A Systematic and Meta-Analytical Review. Sports Med. 2022;52:2669-2690.',
    doiUrl: 'https://doi.org/10.1007/s40279-022-01706-y',
    nivel: 'forte',
    resumo:
      'Dormir 6 h ou menos piora o desempenho físico no dia seguinte, com efeitos em força e resistência de força (69 publicações).',
    sustenta: [
      'Prontidão baixa com sono abaixo de 6 h (check-in)',
      'Nada de aumento num dia de prontidão baixa (P1)',
      'Queda num dia de sono ruim não conta como queda consistente (P2)',
    ],
  },
  {
    chave: 'murphy2022',
    citacao:
      'Murphy C, Koehler K. Energy deficiency impairs resistance training gains in lean mass but not strength: A meta-analysis and meta-regression. Scand J Med Sci Sports. 2022;32(1):125-137.',
    doiUrl: 'https://doi.org/10.1111/sms.14075',
    nivel: 'moderada',
    resumo:
      'Treinar em déficit calórico atrapalha o ganho de massa magra, mas não o de força; um déficit de ~500 kcal/dia já impediu o ganho de massa magra.',
    sustenta: [
      'O déficit não muda a expectativa de força do motor',
      'Alerta do coach de risco à massa magra com perda de peso rápida (P5)',
    ],
  },
  {
    chave: 'galaxybia2025',
    citacao:
      'Carrier B, Melvin AC, Outwin JR, et al. Wearables for health monitoring: body composition estimates of commercial smartwatch and clinical bioelectrical impedance device. Front Sports Act Living. 2025;7:1644082.',
    doiUrl: 'https://doi.org/10.3389/fspor.2025.1644082',
    nivel: 'limitada',
    resumo:
      'Em 108 pessoas ativas, o Galaxy Watch5 acompanhou bem o percentual de gordura do DXA no grupo, mas com erro individual grande, e foi fraco para músculo esquelético.',
    sustenta: [
      'Bioimpedância do relógio mostrada como tendência, com aviso de precisão',
      'Músculo esquelético com destaque menor',
    ],
  },
  {
    chave: 'taco2011',
    citacao:
      'NEPA/UNICAMP. Tabela Brasileira de Composição de Alimentos – TACO. 4ª ed. Campinas: NEPA-UNICAMP; 2011.',
    doiUrl: null,
    nivel: 'forte',
    resumo:
      'Tabela oficial de composição de alimentos brasileiros (597 alimentos), com reprodução permitida citando a fonte.',
    sustenta: ['Base de alimentos, totais do plano alimentar e substituições'],
  },
  {
    chave: 'convencao-pausa',
    citacao: 'Convenção prática do Repz (sem estudo direto).',
    doiUrl: null,
    nivel: 'pratica',
    resumo:
      'A redução só começa a partir de 3 semanas sem o exercício e é de 10%: números escolhidos para ficar do lado seguro, não tirados de um estudo.',
    sustenta: ['Regra 1: pausa de 21 dias e −10%'],
  },
  {
    chave: 'convencao-descanso',
    citacao: 'Convenção prática do Repz (sem estudo direto).',
    doiUrl: null,
    nivel: 'pratica',
    resumo: 'Menos de 48 h entre duas sessões do mesmo exercício gera só um aviso; não muda a carga.',
    sustenta: ['P4: pouco descanso desde a última vez'],
  },
  {
    chave: 'convencao-perda-peso',
    citacao: 'Convenção prática do Repz (sem estudo direto).',
    doiUrl: null,
    nivel: 'pratica',
    resumo:
      'Perder mais de 0,7% do peso por semana, duas semanas seguidas, é tratado como ritmo rápido o bastante para o coach alertar.',
    sustenta: ['P5: alerta de risco à massa magra'],
  },
];

// Quais referências sustentam cada regra do motor (o "Por quê?" da sugestão)
export const REFERENCIAS_DA_REGRA: Readonly<Record<string, string[]>> = {
  '1': ['bosquet2013', 'convencao-pausa'],
  '3': ['halperin2022'],
  '4': ['hickmott2022'],
  '5': ['hickmott2022', 'halperin2022'],
  '6': ['halperin2022'],
  '7': ['halperin2022'],
  P1: ['craven2022'],
  P2: ['craven2022'],
  P3: ['craven2022', 'halperin2022'],
  P4: ['convencao-descanso'],
  P5: ['murphy2022', 'convencao-perda-peso'],
};

export const referencia = (chave: string) => REFERENCIAS.find((r) => r.chave === chave) ?? null;

export const ROTULO_NIVEL: Readonly<Record<NivelEvidencia, string>> = {
  forte: 'Evidência forte',
  moderada: 'Evidência moderada',
  limitada: 'Evidência limitada',
  pratica: 'Convenção prática',
};
