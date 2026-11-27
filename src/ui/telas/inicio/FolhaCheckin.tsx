// Check-in pré-treino (BRIEFING-v2 7.3): sono (passo de 0,5 h, já preenchido) e disposição opcional.
// Resolve em 2 toques: "Iniciar treino" → "Começar treino". "Pular" também começa.

import { useState } from 'react';
import { Button, IconButton } from '@ds';
import { checkinHoje, registrarCheckin, sonoInicial } from '../../../app/prontidao';
import { Folha } from '../../componentes/Folha';

const horas = (h: number) => `${String(h).replace('.', ',')} h`;

export function FolhaCheckin({
  aoFechar,
  aoComecar,
}: {
  aoFechar: () => void;
  aoComecar: () => Promise<void>;
}) {
  const [sono, setSono] = useState(sonoInicial.value);
  const [disposicao, setDisposicao] = useState<number | null>(checkinHoje.value?.disposicao ?? null);
  const [ocupado, setOcupado] = useState(false);

  const comecar = async (pular: boolean) => {
    setOcupado(true);
    try {
      await registrarCheckin(
        pular
          ? { sonoHoras: null, disposicao: null, pulado: true }
          : { sonoHoras: sono, disposicao, pulado: false },
      );
      await aoComecar();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Folha titulo="Antes de começar" aoFechar={aoFechar}>
      <div className="checkin">
        <p className="checkin-pergunta" id="pergunta-sono">
          Quantas horas você dormiu?
        </p>
        <div className="checkin-sono" role="group" aria-labelledby="pergunta-sono">
          <IconButton
            icon="minus"
            label="Menos meia hora"
            variant="white"
            shape="circle"
            size="lg"
            disabled={sono <= 0}
            onClick={() => setSono((s) => Math.max(0, s - 0.5))}
          />
          <output className="checkin-valor numero" aria-live="polite" aria-label="Horas de sono">
            {horas(sono)}
          </output>
          <IconButton
            icon="plus"
            label="Mais meia hora"
            variant="white"
            shape="circle"
            size="lg"
            disabled={sono >= 14}
            onClick={() => setSono((s) => Math.min(14, s + 0.5))}
          />
        </div>
        <p className="checkin-pergunta" id="pergunta-disposicao">
          Disposição <span className="muted">(opcional)</span>
        </p>
        <div className="checkin-disposicao" role="group" aria-labelledby="pergunta-disposicao">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="rir-botao"
              aria-pressed={disposicao === n}
              onClick={() => setDisposicao(disposicao === n ? null : n)}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="muted pequeno">1 = muito cansado · 5 = ótimo</p>
        <div className="pilha">
          <Button
            block
            size="lg"
            variant="brand"
            loading={ocupado}
            disabled={ocupado}
            onClick={() => void comecar(false)}
          >
            Começar treino
          </Button>
          <Button block variant="ghost" disabled={ocupado} onClick={() => void comecar(true)}>
            Pular
          </Button>
        </div>
      </div>
    </Folha>
  );
}
