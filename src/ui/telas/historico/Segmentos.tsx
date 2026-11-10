// Alterna entre as visões do histórico: por exercício ou a lista de treinos e cardio (9.8)

export function Segmentos({ atual }: { atual: 'ex' | 'treinos' }) {
  return (
    <nav class="segmentos" aria-label="Visão do histórico">
      <a href="#/historico" aria-current={atual === 'ex' ? 'page' : undefined}>
        Exercícios
      </a>
      <a href="#/historico/treinos" aria-current={atual === 'treinos' ? 'page' : undefined}>
        Treinos
      </a>
    </nav>
  );
}
