import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'texto' | 'perigo';

export function Botao({
  variante = 'primario',
  bloco = false,
  className: classe = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; bloco?: boolean }) {
  return (
    <button
      type="button"
      className={`botao botao-${variante}${bloco ? ' botao-bloco' : ''} ${classe}`}
      {...props}
    />
  );
}

export function Cartao({
  children,
  className: classe = '',
  titulo,
}: {
  children: ReactNode;
  className?: string;
  titulo?: string;
}) {
  return (
    <section className={`cartao ${classe}`}>
      {titulo && <h2 className="cartao-titulo">{titulo}</h2>}
      {children}
    </section>
  );
}

export function Pilula({
  children,
  tom = 'neutro',
}: {
  children: ReactNode;
  tom?: 'neutro' | 'aviso' | 'ok';
}) {
  return <span className={`pilula pilula-${tom}`}>{children}</span>;
}

export function Etiqueta({
  children,
  tipo,
}: {
  children: ReactNode;
  tipo: 'ss' | 'variante' | 'novo' | 'historico';
}) {
  return <span className={`etiqueta etiqueta-${tipo}`}>{children}</span>;
}

export type EstadoItem = 'ok' | 'aviso' | 'erro' | 'pendente';
const ICONES: Record<EstadoItem, string> = { ok: '✓', aviso: '!', erro: '✕', pendente: '…' };

export function ItemChecklist({ estado, children }: { estado: EstadoItem; children: ReactNode }) {
  return (
    <li className={`checklist-item checklist-${estado}`}>
      <span className="checklist-icone" aria-hidden="true">
        {ICONES[estado]}
      </span>
      <span>{children}</span>
    </li>
  );
}

export function Cabecalho({ titulo, voltar }: { titulo: string; voltar?: string }) {
  return (
    <header className="cabecalho">
      {voltar && (
        <a className="cabecalho-voltar" href={voltar} aria-label="Voltar">
          ‹
        </a>
      )}
      <h1>{titulo}</h1>
    </header>
  );
}
