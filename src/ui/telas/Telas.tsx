// Telas provisórias do M0: cada uma é substituída no seu marco (docs/PLAN.md).

export function TelaTreino() {
  return (
    <section>
      <h1>Treino</h1>
      <div class="cartao">
        <p>Nenhum plano importado ainda.</p>
        <p class="muted">Importe o PDF do seu plano na aba Plano.</p>
      </div>
    </section>
  );
}

export function TelaHistorico() {
  return (
    <section>
      <h1>Histórico</h1>
      <div class="cartao muted">Seus treinos aparecem aqui.</div>
    </section>
  );
}

export function TelaPlano() {
  return (
    <section>
      <h1>Plano</h1>
      <div class="cartao">
        <p class="muted">Seus dados ficam só neste celular. Sem conta, sem internet, sem nuvem.</p>
      </div>
    </section>
  );
}
