// Mais → Referências (BRIEFING-v2, seção 11): cada referência com citação, link, nível de evidência e onde o app
// usa. Embutida no app: funciona offline. /referencias/<chave> destaca uma (o "Por quê?" das sugestões).

import { useEffect } from 'react';
import { Badge, Card } from '@ds';
import { rota } from '../../../app/roteador';
import { REFERENCIAS, ROTULO_NIVEL, type NivelEvidencia } from '../../../dominio/referencias';
import { Cabecalho } from '../../componentes/basicos';

const TOM: Record<NivelEvidencia, 'success' | 'neutral' | 'warning' | 'outline'> = {
  forte: 'success',
  moderada: 'neutral',
  limitada: 'warning',
  pratica: 'outline',
};

export function TelaReferencias() {
  const destaque = rota.value.caminho[0] ?? null;
  useEffect(() => {
    if (destaque) document.getElementById(`ref-${destaque}`)?.scrollIntoView({ block: 'start' });
  }, [destaque]);
  return (
    <section>
      <Cabecalho titulo="Referências" />
      <p className="muted pequeno">
        De onde vêm as regras do motor, os alertas do coach e os avisos de precisão. O que é convenção sem
        estudo direto aparece como "Convenção prática".
      </p>
      <ul className="lista-referencias">
        {REFERENCIAS.map((r) => (
          <li key={r.chave} id={`ref-${r.chave}`}>
            <Card className={destaque === r.chave ? 'referencia referencia-destaque' : 'referencia'}>
              <Badge tone={TOM[r.nivel]}>{ROTULO_NIVEL[r.nivel]}</Badge>
              <p className="referencia-resumo">{r.resumo}</p>
              <p className="referencia-citacao pequeno">
                {r.citacao}{' '}
                {r.doiUrl && (
                  <a href={r.doiUrl} target="_blank" rel="noreferrer noopener">
                    {r.doiUrl.replace('https://doi.org/', 'doi:')}
                  </a>
                )}
              </p>
              <p className="rotulo">Onde o app usa</p>
              <ul className="referencia-usos pequeno">
                {r.sustenta.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
