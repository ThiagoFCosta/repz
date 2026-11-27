// Registro de cardio (BRIEFING 9.7): em qualquer dia, com ou sem treino de força.
// Sem id, registra um novo; com id (vindo da visão Treinos), edita ou exclui.

import { useState } from 'react';
import {
  avaliar,
  metaSemanal,
  prescricaoDoRegistro,
  cardioPorSemana,
  tiposParaRegistro,
  type Comparacao,
} from '../../../dominio/cardio';
import { agoraISO, ehDataValida, dataBR } from '../../../dominio/datas';
import { formatarDecimal, lerDecimal } from '../../../dominio/numeros';
import type { CardioPrescrito } from '../../../dominio/tipos';
import { novoId } from '../../../dados/db';
import type { CardioRealizado } from '../../../dados/tipos';
import { cardios, hoje, mostrarAviso, planoAtivo } from '../../../app/estado';
import { apagarCardio, gravarCardio } from '../../../app/historico';
import { navegar } from '../../../app/roteador';
import { Botao, Cabecalho, Cartao } from '../../componentes/basicos';
import { Folha } from '../../componentes/Folha';
import { faixaTxt } from '../plano/formatos';

const OUTRO = 'Outro';
const ESFORCOS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const inteiro = (t: string, min: number, max: number) =>
  /^\d+$/.test(t.trim()) && +t >= min && +t <= max ? +t : null;
const vazio = (t: string) => !t.trim();

export const COMPARACAO_TXT: Record<Comparacao, string> = {
  abaixo: 'abaixo da meta',
  dentro: 'dentro da meta',
  acima: 'acima da meta',
};

// "30-40 min · FC 115-135 · z2 · 2x por semana"
export function metaTxt(p: CardioPrescrito): string {
  const partes = [`${faixaTxt(p.minutos)} min`];
  if (p.fc) partes.push(`FC ${faixaTxt(p.fc)}`);
  if (p.intensidade) partes.push(p.intensidade);
  const m = metaSemanal(p.frequencia);
  partes.push(m == null ? p.frequencia || 'sem frequência' : m === 7 ? 'todo dia' : `${m}x por semana`);
  return partes.join(' · ');
}

function Comparacoes({
  presc,
  minutos,
  fc,
}: {
  presc: CardioPrescrito;
  minutos: number | null;
  fc: number | null;
}) {
  const a = minutos == null ? null : avaliar({ minutos, fcMedia: fc }, presc);
  return (
    <dl className="meta" aria-label="Comparação com a meta">
      <div>
        <dt>Meta do plano</dt>
        <dd>{metaTxt(presc)}</dd>
      </div>
      {a && (
        <div>
          <dt>Resultado</dt>
          <dd>
            <span className={`comparacao comparacao-${a.duracao}`}>
              {a.duracao === 'dentro' ? '✓' : '!'} Duração {COMPARACAO_TXT[a.duracao]}
            </span>
            {a.fc && (
              <span className={`comparacao comparacao-${a.fc}`}>
                {a.fc === 'dentro' ? '✓' : '!'} FC {COMPARACAO_TXT[a.fc]}
              </span>
            )}
          </dd>
        </div>
      )}
    </dl>
  );
}

function Campo({
  id,
  rotulo,
  valor,
  aoMudar,
  modo,
  erro,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  modo: 'numeric' | 'decimal';
  erro: boolean;
}) {
  return (
    <div>
      <label className="rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        className="campo numero"
        inputMode={modo}
        autoComplete="off"
        aria-invalid={erro || undefined}
        value={valor}
        onChange={(e) => aoMudar(e.currentTarget.value)}
      />
    </div>
  );
}

// Histórico (BRIEFING-v2 7.2): minutos, sessões e FC média nas últimas 8 semanas
function HistoricoSemanal() {
  const semanas = cardioPorSemana(cardios.value, hoje.value, 8).reverse();
  if (!cardios.value.length) return null;
  return (
    <section className="cardio-historico" aria-label="Cardio por semana">
      <h2 className="cartao-titulo">Últimas semanas</h2>
      <ul className="lista-semanas">
        {semanas.map((s) => (
          <li key={s.inicio} className={s.sessoes ? '' : 'muted'}>
            <span className="numero">{dataBR(s.inicio, true)}</span>
            <span className="numero">{s.minutos} min</span>
            <span>
              {s.sessoes} {s.sessoes === 1 ? 'sessão' : 'sessões'}
            </span>
            <span className="numero">{s.fcMedia != null ? `FC ${s.fcMedia}` : '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TelaCardio({ id }: { id?: string }) {
  const existente = id ? cardios.value.find((c) => c.id === id) : undefined;
  const prescritos = planoAtivo.value?.cardio ?? [];
  const tipos = [...tiposParaRegistro(prescritos), OUTRO];
  const ultimo = cardios.value[0]?.tipo;
  // Bicicleta é o padrão (BRIEFING-v2 7.2); depois, o último tipo registrado
  const bike = tipos.find((t) => /bic|bike/i.test(t));
  const inicial = existente?.tipo ?? (ultimo && tipos.includes(ultimo) ? ultimo : (bike ?? tipos[0]!));
  const ehDoPlano = tipos.includes(inicial);

  const [tipo, setTipo] = useState(ehDoPlano ? inicial : OUTRO);
  const [outro, setOutro] = useState(ehDoPlano ? '' : inicial);
  const [minutos, setMinutos] = useState(existente ? String(existente.minutos) : '');
  const [fc, setFc] = useState(existente?.fcMedia != null ? String(existente.fcMedia) : '');
  const [dist, setDist] = useState(
    existente?.distanciaKm != null ? formatarDecimal(existente.distanciaKm) : '',
  );
  const [esforco, setEsforco] = useState<number | null>(existente?.esforco ?? null);
  const [kcal, setKcal] = useState(existente?.kcalRelogio != null ? String(existente.kcalRelogio) : '');
  const [nota, setNota] = useState(existente?.nota ?? '');
  const [data, setData] = useState(existente?.data ?? hoje.value);
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const voltar = id ? 'historico/treinos' : '';

  if (id && !existente)
    return (
      <section>
        <Cabecalho titulo="Cardio" voltar={`/${voltar}`} />
        <Cartao>Este registro não existe mais.</Cartao>
      </section>
    );

  const nomeTipo = tipo === OUTRO ? outro.trim() || OUTRO : tipo;
  const min = inteiro(minutos, 1, 600);
  const fcVal = vazio(fc) ? null : inteiro(fc, 30, 250);
  const distVal = vazio(dist) ? null : lerDecimal(dist);
  const kcalVal = vazio(kcal) ? null : inteiro(kcal, 1, 5000);
  const dataOk = ehDataValida(data) && data <= hoje.value;
  const erros = {
    minutos: !vazio(minutos) && min == null,
    fc: !vazio(fc) && fcVal == null,
    dist: !vazio(dist) && distVal == null,
    kcal: !vazio(kcal) && kcalVal == null,
  };
  const valido = min != null && !erros.fc && !erros.dist && !erros.kcal && dataOk;
  const presc = prescricaoDoRegistro(prescritos, { tipo: nomeTipo, minutos: min });

  const salvar = async () => {
    if (!valido) return;
    setOcupado(true);
    const c: CardioRealizado = {
      id: existente?.id ?? novoId(),
      data,
      tipo: nomeTipo,
      minutos: min,
      fcMedia: fcVal,
      distanciaKm: distVal,
      esforco,
      feitoEm: existente?.feitoEm ?? agoraISO(new Date()),
      kcalRelogio: kcalVal,
      nota: nota.trim() || null,
      origem: existente?.origem ?? 'manual',
    };
    try {
      await gravarCardio(c);
      mostrarAviso(existente ? 'Cardio salvo' : 'Cardio registrado');
      navegar(voltar);
    } finally {
      setOcupado(false);
    }
  };

  const excluir = async () => {
    setOcupado(true);
    await apagarCardio(existente!.id);
    mostrarAviso('Cardio excluído');
    navegar(voltar);
  };

  return (
    <section className="cardio">
      <Cabecalho titulo={existente ? 'Editar cardio' : 'Cardio'} voltar={`/${voltar}`} />

      <div className="chips" role="group" aria-label="Tipo">
        {tipos.map((t) => (
          <button key={t} type="button" className="chip" aria-pressed={tipo === t} onClick={() => setTipo(t)}>
            {t}
          </button>
        ))}
      </div>
      {tipo === OUTRO && (
        <>
          <label className="rotulo" htmlFor="cardio-outro">
            Qual?
          </label>
          <input
            id="cardio-outro"
            className="campo"
            autoComplete="off"
            placeholder="Corrida, caminhada…"
            value={outro}
            onChange={(e) => setOutro(e.currentTarget.value)}
          />
        </>
      )}

      <div className="campos-cardio">
        <Campo
          id="cardio-minutos"
          rotulo="Duração (min)"
          valor={minutos}
          aoMudar={setMinutos}
          modo="numeric"
          erro={erros.minutos}
        />
        <Campo
          id="cardio-fc"
          rotulo="FC média (bpm)"
          valor={fc}
          aoMudar={setFc}
          modo="numeric"
          erro={erros.fc}
        />
        <Campo
          id="cardio-distancia"
          rotulo="Distância (km)"
          valor={dist}
          aoMudar={setDist}
          modo="decimal"
          erro={erros.dist}
        />
        <Campo
          id="cardio-kcal"
          rotulo="kcal do relógio"
          valor={kcal}
          aoMudar={setKcal}
          modo="numeric"
          erro={erros.kcal}
        />
        <div>
          <label className="rotulo" htmlFor="cardio-data">
            Data
          </label>
          <input
            id="cardio-data"
            className="campo"
            type="date"
            max={hoje.value}
            aria-invalid={!dataOk || undefined}
            value={data}
            onChange={(e) => setData(e.currentTarget.value)}
          />
        </div>
      </div>

      <span className="rotulo" id="rotulo-esforco">
        Esforço (0 a 10, opcional)
      </span>
      <div className="esforco" role="group" aria-labelledby="rotulo-esforco">
        {ESFORCOS.map((e) => (
          <button
            key={e}
            type="button"
            className="rir-botao numero"
            aria-pressed={esforco === e}
            onClick={() => setEsforco(esforco === e ? null : e)}
          >
            {e}
          </button>
        ))}
      </div>

      <label className="rotulo" htmlFor="cardio-nota">
        Nota (opcional)
      </label>
      <input
        id="cardio-nota"
        className="campo"
        autoComplete="off"
        maxLength={200}
        value={nota}
        onChange={(e) => setNota(e.currentTarget.value)}
      />

      {presc ? (
        <Comparacoes presc={presc} minutos={min} fc={fcVal} />
      ) : (
        <p className="muted pequeno">O plano ativo não tem meta de cardio.</p>
      )}

      <div className="rodape-acao pilha">
        <Botao bloco disabled={!valido || ocupado} onClick={() => void salvar()}>
          {existente ? 'Salvar' : 'Registrar cardio'}
        </Botao>
        {existente && (
          <Botao bloco variante="perigo" disabled={ocupado} onClick={() => setConfirmar(true)}>
            Excluir
          </Botao>
        )}
      </div>

      {!existente && <HistoricoSemanal />}

      {confirmar && (
        <Folha titulo="Excluir cardio?" aoFechar={() => setConfirmar(false)}>
          <p>
            {nomeTipo}, {existente!.minutos} min. Não dá para desfazer.
          </p>
          <div className="acoes-lado">
            <Botao variante="secundario" onClick={() => setConfirmar(false)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" disabled={ocupado} onClick={() => void excluir()}>
              Excluir cardio
            </Botao>
          </div>
        </Folha>
      )}
    </section>
  );
}
