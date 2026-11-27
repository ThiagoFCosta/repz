import { Cabecalho, Cartao } from '../componentes/basicos';

// Telas novas da v2 que chegam nos próximos marcos (docs/v2/PLAN.md)
const TELAS: Record<string, { titulo: string; marco: string }> = {
  corpo: { titulo: 'Corpo', marco: 'Peso, medidas e bioimpedância chegam no marco V5.' },
  dieta: { titulo: 'Dieta', marco: 'O plano alimentar e as substituições chegam no marco V6.' },
  coach: { titulo: 'Coach', marco: 'Revisões, avisos e auditoria do motor chegam nos marcos V7 e V8.' },
  referencias: { titulo: 'Referências', marco: 'As referências científicas do motor chegam no marco V4.' },
  perfil: { titulo: 'Perfil', marco: 'Perfil e conta chegam com o login, ainda no marco V1.' },
};

export function EmBreve({ aba }: { aba: string }) {
  const t = TELAS[aba] ?? { titulo: 'Em breve', marco: '' };
  return (
    <section>
      <Cabecalho titulo={t.titulo} />
      <Cartao>
        <p className="muted">{t.marco}</p>
      </Cartao>
    </section>
  );
}
