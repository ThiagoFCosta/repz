import { useEffect, useId, useRef, useState, type HTMLAttributes } from 'react';
import { cx } from '../core/cx';
import { Icon } from '../core/Icon';
import './MonthPicker.css';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export type MonthPickerMode = 'mes' | 'ano';

const partes = (mes: string): [number, number] => [Number(mes.slice(0, 4)), Number(mes.slice(5, 7))];
const montar = (ano: number, m: number) => `${ano}-${String(m).padStart(2, '0')}`;
const somar = (mes: string, n: number) => {
  const [a, m] = partes(mes);
  const i = a * 12 + (m - 1) + n;
  return montar(Math.floor(i / 12), (i % 12) + 1);
};

/** Seletor de mês global (adição do projeto): ‹ out/2026 › com grade de meses; modo "ano" para as visões anuais. */
export interface MonthPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Mês selecionado, `YYYY-MM`. No modo "ano" vale o ano dele. */
  value: string;
  onChange: (mes: string) => void;
  mode?: MonthPickerMode;
  /** Mostra o seletor Mês/Ano na grade quando informado. */
  onModeChange?: (mode: MonthPickerMode) => void;
  /** Mês atual (`YYYY-MM`): marcado na grade e alvo do botão "Mês atual". */
  current?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  /** md (botões de 32) ou lg (alvo de toque de 44). */
  size?: 'md' | 'lg';
  /** Alinhamento da grade em relação ao seletor (padrão center). Use end perto da borda direita da tela. */
  align?: 'start' | 'center' | 'end';
  /** Começa com a grade aberta, sem roubar o foco (galeria/documentação). */
  defaultOpen?: boolean;
}

export function MonthPicker({ value, onChange, mode = 'mes', onModeChange, current, min, max, disabled = false, size = 'md', align = 'center', defaultOpen = false, className, ...rest }: MonthPickerProps) {
  const [aberto, setAberto] = useState(defaultOpen);
  const focar = useRef(false);
  const [anoGrade, setAnoGrade] = useState(() => partes(value)[0]);
  const raiz = useRef<HTMLDivElement>(null);
  const idGrade = useId();
  const [ano, mes] = partes(value);

  const fora = (m: string) => (min !== undefined && m < min) || (max !== undefined && m > max);
  /** Ano sem nenhum mês dentro de [min, max]. */
  const anoFora = (a: number) => (min !== undefined && montar(a, 12) < min) || (max !== undefined && montar(a, 1) > max);
  /** Leva o mês para dentro de [min, max]. */
  const limitar = (m: string) => (min !== undefined && m < min ? min : max !== undefined && m > max ? max : m);

  const anterior = mode === 'ano' ? somar(value, -12) : somar(value, -1);
  const proximo = mode === 'ano' ? somar(value, 12) : somar(value, 1);
  const semAnterior = mode === 'ano' ? anoFora(ano - 1) : fora(anterior);
  const semProximo = mode === 'ano' ? anoFora(ano + 1) : fora(proximo);

  useEffect(() => {
    if (!aberto) return;
    const clique = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', clique);
    document.addEventListener('keydown', tecla);
    if (focar.current) raiz.current?.querySelector<HTMLButtonElement>('.pr-mp__cell[aria-selected="true"]:not(:disabled), .pr-mp__cell:not(:disabled)')?.focus();
    return () => { document.removeEventListener('mousedown', clique); document.removeEventListener('keydown', tecla); };
  }, [aberto]);

  const abrir = () => { focar.current = true; setAnoGrade(ano); setAberto((a) => !a); };
  const escolher = (m: string) => { onChange(limitar(m)); setAberto(false); };
  const rotulo = mode === 'ano' ? String(ano) : `${MESES[mes - 1]}/${ano}`;
  const extenso = mode === 'ano' ? `ano de ${ano}` : `${MESES_EXTENSO[mes - 1]} de ${ano}`;

  return (
    <div ref={raiz} className={cx('pr-mp', `pr-mp--${size}`, className)} {...rest}>
      <button type="button" className="pr-mp__step" aria-label={mode === 'ano' ? 'Ano anterior' : 'Mês anterior'} disabled={disabled || semAnterior} onClick={() => onChange(limitar(anterior))}>
        <Icon name="chevron-left" size={18} />
      </button>
      <button type="button" className="pr-mp__label" aria-haspopup="dialog" aria-expanded={aberto} aria-controls={aberto ? idGrade : undefined} aria-label={`${extenso}, escolher`} disabled={disabled} onClick={abrir}>
        {rotulo}
        <Icon name="chevron-down" size={14} />
      </button>
      <button type="button" className="pr-mp__step" aria-label={mode === 'ano' ? 'Próximo ano' : 'Próximo mês'} disabled={disabled || semProximo} onClick={() => onChange(limitar(proximo))}>
        <Icon name="chevron-right" size={18} />
      </button>

      {aberto ? (
        <div id={idGrade} role="dialog" aria-label={mode === 'ano' ? 'Escolher ano' : 'Escolher mês'} className={cx('pr-mp__pop', `pr-mp__pop--${align}`)}>
          <div className="pr-mp__head">
            <button type="button" className="pr-mp__step" aria-label="Ano anterior" disabled={anoFora(anoGrade - 1)} onClick={() => setAnoGrade(anoGrade - 1)}><Icon name="chevron-left" size={16} /></button>
            <span className="pr-mp__year">{anoGrade}</span>
            <button type="button" className="pr-mp__step" aria-label="Próximo ano" disabled={anoFora(anoGrade + 1)} onClick={() => setAnoGrade(anoGrade + 1)}><Icon name="chevron-right" size={16} /></button>
          </div>
          {mode === 'mes' ? (
            <div className="pr-mp__grid" role="listbox" aria-label={`Meses de ${anoGrade}`}>
              {MESES.map((nome, i) => {
                const m = montar(anoGrade, i + 1);
                return (
                  <button key={m} type="button" role="option" className={cx('pr-mp__cell', m === current && 'pr-mp__cell--current')} aria-selected={m === value} aria-label={`${MESES_EXTENSO[i]} de ${anoGrade}`} disabled={fora(m)} onClick={() => escolher(m)}>
                    {nome}
                  </button>
                );
              })}
            </div>
          ) : (
            <button type="button" className="pr-mp__cell pr-mp__cell--wide" aria-selected={anoGrade === ano} onClick={() => escolher(montar(anoGrade, mes))}>Ver {anoGrade}</button>
          )}
          {onModeChange || (current && !fora(current)) ? (
            <div className="pr-mp__foot">
              {onModeChange ? (
                <div className="pr-mp__modes" role="group" aria-label="Período">
                  {(['mes', 'ano'] as const).map((m) => (
                    <button key={m} type="button" className="pr-mp__mode" aria-pressed={mode === m} onClick={() => onModeChange(m)}>{m === 'mes' ? 'Mês' : 'Ano'}</button>
                  ))}
                </div>
              ) : <span />}
              {current && !fora(current) ? <button type="button" className="pr-mp__today" onClick={() => escolher(current)}>{mode === 'ano' ? 'Ano atual' : 'Mês atual'}</button> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
