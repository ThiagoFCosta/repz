// Corpo (mockup, tela 4; BRIEFING-v2 9): média de 7 dias como herói, tendência de 4 semanas, medidas com fita e
// bioimpedância separadas, aviso de precisão. Sem relógio (sem bioimpedância), só peso e fita.

import { useState } from 'react';
import { Link } from 'react-router';
import { Button, Card } from '@ds';
import { bios, fitas, hoje, pesos } from '../../../app/estado';
import {
  alertaPerdaRapida,
  mediaMovel7,
  precisaMedir,
  resumoFita,
  serieDoPeso,
  tendencia,
  tendenciaBio,
} from '../../../dominio/corpo/corpo';
import { dataBR } from '../../../dominio/datas';
import { formatarDecimal } from '../../../dominio/numeros';
import { Cabecalho } from '../../componentes/basicos';
import { FolhaBio, FolhaMedidas, FolhaPeso } from './Folhas';
import { GraficoPeso } from './GraficoPeso';

const sinal = (x: number) => (x > 0 ? `+${formatarDecimal(x)}` : formatarDecimal(x).replace('-', '−'));

type Folha = null | 'peso' | 'medidas' | 'bio';
// Lembrete de medidas: a cada 3 semanas (o briefing pede 2 a 4; a escolha nas preferências fica para depois)
const LEMBRETE_MEDIDAS_DIAS = 21;

export function TelaCorpo() {
  const [folha, setFolha] = useState<Folha>(null);
  const h = hoje.value;
  const media = mediaMovel7(pesos.value, h);
  const t = tendencia(pesos.value, h);
  const p5 = alertaPerdaRapida(pesos.value, h);
  const fita = resumoFita(fitas.value);
  const medir = precisaMedir(fitas.value, h, LEMBRETE_MEDIDAS_DIAS);
  const gordura = tendenciaBio(bios.value, 'gorduraPct');
  const massaGorda = tendenciaBio(bios.value, 'massaGordaKg');
  const musculo = tendenciaBio(bios.value, 'musculoEsqKg');
  const temBio = gordura || massaGorda || musculo;

  return (
    <section className="corpo">
      <Cabecalho titulo="Corpo" />

      <Card tone="brand" className="corpo-heroi" aria-label="Peso, média de 7 dias">
        <p className="corpo-heroi-rotulo">Peso · média de 7 dias</p>
        {media != null ? (
          <p className="corpo-heroi-valor numero">
            {formatarDecimal(media)} <span>kg</span>
          </p>
        ) : (
          <p className="corpo-heroi-vazio">Registre seu peso para ver a média.</p>
        )}
        <p className="corpo-heroi-info">
          {t
            ? `${sinal(t.kgPeriodo)} kg em 4 semanas · ritmo de ${sinal(t.kgSemana)} kg/semana`
            : 'A tendência aparece com 6 pesagens em pelo menos uma semana.'}
        </p>
        <div className="corpo-heroi-acoes">
          <Button variant="white" size="lg" onClick={() => setFolha('medidas')}>
            Medidas
          </Button>
          <Button variant="primary" size="lg" onClick={() => setFolha('peso')}>
            Registrar peso
          </Button>
        </div>
      </Card>

      {p5 && (
        <Card className="corpo-alerta" aria-label="Alerta do coach">
          <p>
            <strong>! </strong>
            {p5}{' '}
            <Link className="por-que pequeno" to="/referencias/murphy2022">
              Por quê?
            </Link>
          </p>
        </Card>
      )}

      <Card title="Tendência" subtitle="4 semanas">
        <GraficoPeso serie={serieDoPeso(pesos.value, h, 28)} />
      </Card>

      <Card
        title="Composição e medidas"
        actions={
          <Button variant="secondary" size="sm" iconLeft="plus" onClick={() => setFolha('medidas')}>
            Medidas
          </Button>
        }
      >
        {medir && (
          <p className="corpo-lembrete pequeno" role="status">
            {fita.length
              ? 'Faz tempo desde as últimas medidas com fita.'
              : 'Meça cintura, braço e coxa para acompanhar.'}{' '}
            <button type="button" className="link-botao" onClick={() => setFolha('medidas')}>
              Medir agora
            </button>
          </p>
        )}
        <div className="corpo-tiles">
          {fita.map((f) => (
            <div key={f.local} className="tile">
              <span className="tile-rotulo">{f.local} · fita</span>
              <strong className="tile-valor numero">
                {formatarDecimal(f.cm)} <span className="tile-meta">cm</span>
              </strong>
              <span className="muted pequeno">
                {f.variacao != null ? `${sinal(f.variacao)} cm · ` : ''}
                {dataBR(f.data, true)}
              </span>
            </div>
          ))}
          {gordura && (
            <div className="tile">
              <span className="tile-rotulo">Gordura · relógio</span>
              <strong className="tile-valor numero">
                {formatarDecimal(gordura.atual)} <span className="tile-meta">%</span>
              </strong>
              <span className="muted pequeno">{tendenciaTexto(gordura.variacao)}</span>
            </div>
          )}
          {massaGorda && (
            <div className="tile">
              <span className="tile-rotulo">Massa gorda · relógio</span>
              <strong className="tile-valor numero">
                {formatarDecimal(massaGorda.atual)} <span className="tile-meta">kg</span>
              </strong>
              <span className="muted pequeno">{tendenciaTexto(massaGorda.variacao)}</span>
            </div>
          )}
          {musculo && (
            <div className="tile tile-discreto">
              <span className="tile-rotulo">Músculo esquelético · relógio</span>
              <strong className="numero">{formatarDecimal(musculo.atual)} kg</strong>
              <span className="muted pequeno">pouco confiável no relógio</span>
            </div>
          )}
        </div>
        {temBio && (
          <p className="muted pequeno corpo-aviso">
            Bioimpedância do relógio: use como tendência. Em grupo acompanha a gordura, mas erra bastante para
            cada pessoa e pouco serve para músculo.{' '}
            <Link className="por-que" to="/referencias/galaxybia2025">
              Por quê?
            </Link>
          </p>
        )}
        <Button variant="ghost" block onClick={() => setFolha('bio')}>
          Registrar bioimpedância
        </Button>
      </Card>

      {folha === 'peso' && <FolhaPeso aoFechar={() => setFolha(null)} />}
      {folha === 'medidas' && <FolhaMedidas aoFechar={() => setFolha(null)} />}
      {folha === 'bio' && <FolhaBio aoFechar={() => setFolha(null)} />}
    </section>
  );
}

function tendenciaTexto(v: number | null): string {
  if (v == null) return 'tendência aparece com mais medições';
  if (v === 0) return 'tendência estável';
  return v < 0 ? 'tendência ↓' : 'tendência ↑';
}
