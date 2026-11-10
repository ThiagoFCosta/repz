// Registro de cardio (BRIEFING 9.7): em qualquer dia, com ou sem treino de força.
// Sem id, registra um novo; com id (vindo da visão Treinos), edita ou exclui.

import { useState } from 'preact/hooks';
import {
  avaliar,
  metaSemanal,
  prescricaoDoRegistro,
  tiposDoPlano,
  type Comparacao,
} from '../../../dominio/cardio';
import { agoraISO, ehDataValida } from '../../../dominio/datas';
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
    <dl class="meta" aria-label="Comparação com a meta">
      <div>
        <dt>Meta do plano</dt>
        <dd>{metaTxt(presc)}</dd>
      </div>
      {a && (
        <div>
          <dt>Resultado</dt>
          <dd>
            <span class={`comparacao comparacao-${a.duracao}`}>
              {a.duracao === 'dentro' ? '✓' : '!'} Duração {COMPARACAO_TXT[a.duracao]}
            </span>
            {a.fc && (
              <span class={`comparacao comparacao-${a.fc}`}>
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
      <label class="rotulo" for={id}>
        {rotulo}
      </label>
      <input
        id={id}
        class="campo numero"
        inputMode={modo}
        autoComplete="off"
        aria-invalid={erro || undefined}
        value={valor}
        onInput={(e) => aoMudar(e.currentTarget.value)}
      />
    </div>
  );
}

export function TelaCardio({ id }: { id?: string }) {
  const existente = id ? cardios.value.find((c) => c.id === id) : undefined;
  const prescritos = planoAtivo.value?.cardio ?? [];
  const tipos = [...tiposDoPlano(prescritos), OUTRO];
  const ultimo = cardios.value[0]?.tipo;
  const inicial = existente?.tipo ?? (ultimo && tipos.includes(ultimo) ? ultimo : tipos[0]!);
  const ehDoPlano = tipos.includes(inicial);

  const [tipo, setTipo] = useState(ehDoPlano ? inicial : OUTRO);
  const [outro, setOutro] = useState(ehDoPlano ? '' : inicial);
  const [minutos, setMinutos] = useState(existente ? String(existente.minutos) : '');
  const [fc, setFc] = useState(existente?.fcMedia != null ? String(existente.fcMedia) : '');
  const [dist, setDist] = useState(
    existente?.distanciaKm != null ? formatarDecimal(existente.distanciaKm) : '',
  );
  const [esforco, setEsforco] = useState<number | null>(existente?.esforco ?? null);
  const [data, setData] = useState(existente?.data ?? hoje.value);
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const voltar = id ? '#/historico/treinos' : '#/treino';

  if (id && !existente)
    return (
      <section>
        <Cabecalho titulo="Cardio" voltar={voltar} />
        <Cartao>Este registro não existe mais.</Cartao>
      </section>
    );

  const nomeTipo = tipo === OUTRO ? outro.trim() || OUTRO : tipo;
  const min = inteiro(minutos, 1, 600);
  const fcVal = vazio(fc) ? null : inteiro(fc, 30, 250);
  const distVal = vazio(dist) ? null : lerDecimal(dist);
  const dataOk = ehDataValida(data) && data <= hoje.value;
  const erros = {
    minutos: !vazio(minutos) && min == null,
    fc: !vazio(fc) && fcVal == null,
    dist: !vazio(dist) && distVal == null,
  };
  const valido = min != null && !erros.fc && !erros.dist && dataOk;
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
    <section class="cardio">
      <Cabecalho titulo={existente ? 'Editar cardio' : 'Cardio'} voltar={voltar} />

      <div class="chips" role="group" aria-label="Tipo">
        {tipos.map((t) => (
          <button key={t} type="button" class="chip" aria-pressed={tipo === t} onClick={() => setTipo(t)}>
            {t}
          </button>
        ))}
      </div>
      {tipo === OUTRO && (
        <>
          <label class="rotulo" for="cardio-outro">
            Qual?
          </label>
          <input
            id="cardio-outro"
            class="campo"
            autoComplete="off"
            placeholder="Corrida, caminhada…"
            value={outro}
            onInput={(e) => setOutro(e.currentTarget.value)}
          />
        </>
      )}

      <div class="campos-cardio">
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
        <div>
          <label class="rotulo" for="cardio-data">
            Data
          </label>
          <input
            id="cardio-data"
            class="campo"
            type="date"
            max={hoje.value}
            aria-invalid={!dataOk || undefined}
            value={data}
            onInput={(e) => setData(e.currentTarget.value)}
          />
        </div>
      </div>

      <span class="rotulo" id="rotulo-esforco">
        Esforço (0 a 10, opcional)
      </span>
      <div class="esforco" role="group" aria-labelledby="rotulo-esforco">
        {ESFORCOS.map((e) => (
          <button
            key={e}
            type="button"
            class="rir-botao numero"
            aria-pressed={esforco === e}
            onClick={() => setEsforco(esforco === e ? null : e)}
          >
            {e}
          </button>
        ))}
      </div>

      {presc ? (
        <Comparacoes presc={presc} minutos={min} fc={fcVal} />
      ) : (
        <p class="muted pequeno">O plano ativo não tem meta de cardio.</p>
      )}

      <div class="rodape-acao pilha">
        <Botao bloco disabled={!valido || ocupado} onClick={() => void salvar()}>
          {existente ? 'Salvar' : 'Registrar cardio'}
        </Botao>
        {existente && (
          <Botao bloco variante="perigo" disabled={ocupado} onClick={() => setConfirmar(true)}>
            Excluir
          </Botao>
        )}
      </div>

      {confirmar && (
        <Folha titulo="Excluir cardio?" aoFechar={() => setConfirmar(false)}>
          <p>
            {nomeTipo}, {existente!.minutos} min. Não dá para desfazer.
          </p>
          <div class="acoes-lado">
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
