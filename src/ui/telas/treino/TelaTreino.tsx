// Treino em andamento: topo com progresso e tempo; o corpo segue a etapa da máquina de estados.

import { erroTreino, treinoAtivo, type TreinoAtivo } from '../../../app/controlador-treino';
import { totalSeries } from '../../../dominio/treino/biset';
import { useRelogio } from '../../componentes/relogio';
import { Descanso } from './Descanso';
import { decorrido } from './formatos';
import { Registro } from './Registro';
import { Resumo } from './Resumo';

function Topo({ a, item }: { a: TreinoAtivo; item: number | null }) {
  const agora = useRelogio(1000);
  const e = a.estado;
  const total = e.itens.reduce((s, _, i) => s + totalSeries(e, i), 0);
  const feitas = e.feitas.reduce((s, x) => s + x, 0);
  return (
    <header className="treino-topo">
      <div className="treino-topo-linha">
        <span className="treino-sessao">{a.sessao.nome}</span>
        {item != null && (
          <span className="muted numero">
            {item + 1} de {e.itens.length}
          </span>
        )}
        <span className="treino-tempo numero" aria-label="Tempo de treino">
          {decorrido(agora - Date.parse(a.treino.inicio))}
        </span>
      </div>
      <div
        className="barra"
        role="progressbar"
        aria-label="Séries concluídas"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={feitas}
      >
        <span style={{ width: `${total ? (feitas / total) * 100 : 0}%` }} />
      </div>
    </header>
  );
}

export function TelaTreino() {
  const a = treinoAtivo.value!;
  const etapa = a.estado.etapa;
  const item = etapa.tipo === 'registrando' ? etapa.item : etapa.tipo === 'descanso' ? etapa.proximo : null;
  return (
    <section className="treino">
      <Topo a={a} item={item} />
      {erroTreino.value && (
        <div className="cartao cartao-erro" role="alert">
          {erroTreino.value}
        </div>
      )}
      {etapa.tipo === 'registrando' && <Registro a={a} item={etapa.item} />}
      {etapa.tipo === 'descanso' && <Descanso a={a} etapa={etapa} />}
      {etapa.tipo === 'resumo' && <Resumo a={a} />}
    </section>
  );
}
