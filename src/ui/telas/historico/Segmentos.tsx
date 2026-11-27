import { Link } from 'react-router';
// Alterna entre as visões do histórico: por exercício ou a lista de treinos e cardio (9.8)

export function Segmentos({ atual }: { atual: 'ex' | 'treinos' }) {
  return (
    <nav className="segmentos" aria-label="Visão do histórico">
      <Link to="/historico" aria-current={atual === 'ex' ? 'page' : undefined}>
        Exercícios
      </Link>
      <Link to="/historico/treinos" aria-current={atual === 'treinos' ? 'page' : undefined}>
        Treinos
      </Link>
    </nav>
  );
}
