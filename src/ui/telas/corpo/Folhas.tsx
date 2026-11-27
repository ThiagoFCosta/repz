// Registros do Corpo (BRIEFING-v2 9): peso (1 casa, poucos toques), medidas com fita e bioimpedância.

import { useState } from 'react';
import { Button } from '@ds';
import { db, hoje, mostrarAviso, recarregar } from '../../../app/estado';
import { LOCAIS_FITA } from '../../../dominio/corpo/corpo';
import { ehDataValida } from '../../../dominio/datas';
import { lerDecimal } from '../../../dominio/numeros';
import { novoId } from '../../../dados/db';
import { salvarBio, salvarFita, salvarPeso } from '../../../dados/repos/corpo';
import { Folha } from '../../componentes/Folha';

const vazio = (s: string) => s.trim() === '';
const numero = (s: string, min: number, max: number) => {
  const v = lerDecimal(s);
  return v != null && v >= min && v <= max ? Math.round(v * 10) / 10 : null;
};
const horaAgora = () => new Date().toTimeString().slice(0, 5);

function Campo({
  id,
  rotulo,
  valor,
  aoMudar,
  erro,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  erro?: boolean;
}) {
  return (
    <div>
      <label className="rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        className="campo numero"
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={erro || undefined}
        value={valor}
        onChange={(e) => aoMudar(e.currentTarget.value)}
      />
    </div>
  );
}

export function FolhaPeso({ aoFechar }: { aoFechar: () => void }) {
  const [kg, setKg] = useState('');
  const [data, setData] = useState(hoje.value);
  const [jejum, setJejum] = useState(new Date().getHours() < 11);
  const [ocupado, setOcupado] = useState(false);
  const valor = numero(kg, 20, 400);
  const ok = valor != null && ehDataValida(data) && data <= hoje.value;
  const salvar = async () => {
    if (!ok) return;
    setOcupado(true);
    await salvarPeso(db, {
      id: novoId(),
      data,
      hora: data === hoje.value ? horaAgora() : null,
      kg: valor!,
      condicao: jejum ? 'jejum' : 'outra',
      origem: 'manual',
    });
    await recarregar();
    mostrarAviso('Peso registrado');
    aoFechar();
  };
  return (
    <Folha titulo="Registrar peso" aoFechar={aoFechar}>
      <div className="pilha">
        <Campo
          id="peso-kg"
          rotulo="Peso (kg)"
          valor={kg}
          aoMudar={setKg}
          erro={!vazio(kg) && valor == null}
        />
        <div>
          <label className="rotulo" htmlFor="peso-data">
            Data
          </label>
          <input
            id="peso-data"
            className="campo"
            type="date"
            max={hoje.value}
            value={data}
            onChange={(e) => setData(e.currentTarget.value)}
          />
        </div>
        <label className="linha-opcao">
          <input type="checkbox" checked={jejum} onChange={(e) => setJejum(e.currentTarget.checked)} />
          Em jejum (ao acordar)
        </label>
        <Button block size="lg" disabled={!ok || ocupado} loading={ocupado} onClick={() => void salvar()}>
          Salvar peso
        </Button>
      </div>
    </Folha>
  );
}

export function FolhaMedidas({ aoFechar }: { aoFechar: () => void }) {
  const [cm, setCm] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const preenchidos = LOCAIS_FITA.filter((l) => !vazio(cm[l] ?? ''));
  const valores = preenchidos.map((l) => ({ local: l, v: numero(cm[l]!, 5, 300) }));
  const ok = valores.length > 0 && valores.every((x) => x.v != null);
  const salvar = async () => {
    if (!ok) return;
    setOcupado(true);
    await salvarFita(
      db,
      valores.map((x) => ({ id: novoId(), data: hoje.value, local: x.local, cm: x.v! })),
    );
    await recarregar();
    mostrarAviso('Medidas registradas');
    aoFechar();
  };
  return (
    <Folha titulo="Medidas com fita" aoFechar={aoFechar}>
      <div className="pilha">
        <p className="muted pequeno">Preencha só o que mediu hoje, em centímetros.</p>
        <div className="campos-medidas">
          {LOCAIS_FITA.map((l) => (
            <Campo
              key={l}
              id={`fita-${l}`}
              rotulo={`${l} (cm)`}
              valor={cm[l] ?? ''}
              aoMudar={(v) => setCm({ ...cm, [l]: v })}
              erro={!vazio(cm[l] ?? '') && numero(cm[l]!, 5, 300) == null}
            />
          ))}
        </div>
        <Button block size="lg" disabled={!ok || ocupado} loading={ocupado} onClick={() => void salvar()}>
          Salvar medidas
        </Button>
      </div>
    </Folha>
  );
}

export function FolhaBio({ aoFechar }: { aoFechar: () => void }) {
  const [v, setV] = useState({ gordura: '', massa: '', musculo: '', agua: '' });
  const [ocupado, setOcupado] = useState(false);
  const campos = {
    gordura: vazio(v.gordura) ? null : numero(v.gordura, 1, 80),
    massa: vazio(v.massa) ? null : numero(v.massa, 0, 300),
    musculo: vazio(v.musculo) ? null : numero(v.musculo, 0, 300),
    agua: vazio(v.agua) ? null : numero(v.agua, 1, 99),
  };
  const erros = {
    gordura: !vazio(v.gordura) && campos.gordura == null,
    massa: !vazio(v.massa) && campos.massa == null,
    musculo: !vazio(v.musculo) && campos.musculo == null,
    agua: !vazio(v.agua) && campos.agua == null,
  };
  const algum = Object.values(campos).some((x) => x != null);
  const ok = algum && !Object.values(erros).some(Boolean);
  const salvar = async () => {
    if (!ok) return;
    setOcupado(true);
    await salvarBio(db, {
      id: novoId(),
      data: hoje.value,
      gorduraPct: campos.gordura,
      massaGordaKg: campos.massa,
      musculoEsqKg: campos.musculo,
      aguaPct: campos.agua,
      origem: 'relogio',
    });
    await recarregar();
    mostrarAviso('Bioimpedância registrada');
    aoFechar();
  };
  return (
    <Folha titulo="Bioimpedância do relógio" aoFechar={aoFechar}>
      <div className="pilha">
        <div className="campos-medidas">
          <Campo
            id="bio-gordura"
            rotulo="Gordura (%)"
            valor={v.gordura}
            aoMudar={(x) => setV({ ...v, gordura: x })}
            erro={erros.gordura}
          />
          <Campo
            id="bio-massa"
            rotulo="Massa gorda (kg)"
            valor={v.massa}
            aoMudar={(x) => setV({ ...v, massa: x })}
            erro={erros.massa}
          />
          <Campo
            id="bio-musculo"
            rotulo="Músculo esquelético (kg)"
            valor={v.musculo}
            aoMudar={(x) => setV({ ...v, musculo: x })}
            erro={erros.musculo}
          />
          <Campo
            id="bio-agua"
            rotulo="Água (%)"
            valor={v.agua}
            aoMudar={(x) => setV({ ...v, agua: x })}
            erro={erros.agua}
          />
        </div>
        <p className="muted pequeno">
          Também dá para mandar o print do relógio para o Claude (conector, marco V7).
        </p>
        <Button block size="lg" disabled={!ok || ocupado} loading={ocupado} onClick={() => void salvar()}>
          Salvar
        </Button>
      </div>
    </Folha>
  );
}
