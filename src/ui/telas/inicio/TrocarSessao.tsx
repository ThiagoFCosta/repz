// Trocar a sessão antes de iniciar (BRIEFING 6.3). A rotação só sugere; o dia é informativo.

import { NOMES_DIAS } from '../../../dominio/datas';
import { planoAtivo } from '../../../app/estado';
import {
  duracaoDaSessao,
  proximaSessaoTreino,
  sessaoEscolhida,
  sessaoSugerida,
} from '../../../app/controlador-treino';
import { navegar } from '../../../app/roteador';
import { Cabecalho, Etiqueta } from '../../componentes/basicos';

export function TrocarSessao() {
  const plano = planoAtivo.value;
  if (!plano) return null;
  const escolher = (id: string) => {
    sessaoEscolhida.value = id === sessaoSugerida.value?.id ? null : id;
    navegar('treino');
  };
  return (
    <section>
      <Cabecalho titulo="Trocar sessão" voltar="#/treino" />
      <ul class="lista-sessoes">
        {plano.sessoes.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              class="cartao sessao-opcao"
              aria-current={s.id === proximaSessaoTreino.value?.id ? 'true' : undefined}
              onClick={() => escolher(s.id)}
            >
              <span class="sessao-opcao-nome">
                {s.nome} {s.id === sessaoSugerida.value?.id && <Etiqueta tipo="historico">sugerida</Etiqueta>}
              </span>
              <span class="muted pequeno">
                {s.itens.length} exercícios · ~{duracaoDaSessao(plano, s)} min
                {s.dia != null && <> · planejado para {NOMES_DIAS[s.dia]}</>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
