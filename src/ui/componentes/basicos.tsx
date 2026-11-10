import type { ComponentChildren, JSX } from 'preact';

type Variante = 'primario' | 'secundario' | 'texto' | 'perigo';

export function Botao({
  variante = 'primario',
  bloco = false,
  class: classe = '',
  ...props
}: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; bloco?: boolean }) {
  return (
    <button
      type="button"
      class={`botao botao-${variante}${bloco ? ' botao-bloco' : ''} ${classe}`}
      {...props}
    />
  );
}

export function Cartao({
  children,
  class: classe = '',
  titulo,
}: {
  children: ComponentChildren;
  class?: string;
  titulo?: string;
}) {
  return (
    <section class={`cartao ${classe}`}>
      {titulo && <h2 class="cartao-titulo">{titulo}</h2>}
      {children}
    </section>
  );
}

export function Pilula({
  children,
  tom = 'neutro',
}: {
  children: ComponentChildren;
  tom?: 'neutro' | 'aviso' | 'ok';
}) {
  return <span class={`pilula pilula-${tom}`}>{children}</span>;
}

export function Etiqueta({
  children,
  tipo,
}: {
  children: ComponentChildren;
  tipo: 'ss' | 'variante' | 'novo' | 'historico';
}) {
  return <span class={`etiqueta etiqueta-${tipo}`}>{children}</span>;
}

export type EstadoItem = 'ok' | 'aviso' | 'erro' | 'pendente';
const ICONES: Record<EstadoItem, string> = { ok: '✓', aviso: '!', erro: '✕', pendente: '…' };

export function ItemChecklist({ estado, children }: { estado: EstadoItem; children: ComponentChildren }) {
  return (
    <li class={`checklist-item checklist-${estado}`}>
      <span class="checklist-icone" aria-hidden="true">
        {ICONES[estado]}
      </span>
      <span>{children}</span>
    </li>
  );
}

export function Cabecalho({ titulo, voltar }: { titulo: string; voltar?: string }) {
  return (
    <header class="cabecalho">
      {voltar && (
        <a class="cabecalho-voltar" href={voltar} aria-label="Voltar">
          ‹
        </a>
      )}
      <h1>{titulo}</h1>
    </header>
  );
}
