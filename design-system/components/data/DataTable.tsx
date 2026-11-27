import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '../core/Icon';
import { Checkbox } from '../forms/Checkbox';
import { cx } from '../core/cx';
import './DataTable.css';

export type SortState = { key: string; dir: 'asc' | 'desc' };
type Sortable = string | number | boolean | Date | null | undefined;

export interface DataColumn<T> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  sortable?: boolean;
  sortValue?: (row: T) => Sortable;
  render?: (row: T) => ReactNode;
  /** Papel no layout de lista estreito (container < 520px) */
  mobile?: 'primary' | 'meta' | 'trailing' | 'hidden';
  /** No layout de lista, mostra o cabeçalho antes do valor da coluna meta ("Sua parte R$ 10,00"). Adição do projeto. */
  mobileLabel?: boolean;
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey?: keyof T | ((row: T) => string);
  selectable?: boolean;
  selected?: string[];
  onSelectionChange?: (keys: string[]) => void;
  sort?: SortState | null;
  onSortChange?: (s: SortState) => void;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  /** Estado carregando: linhas-esqueleto. Adição do projeto (docs/04: vazio, carregando e erro em toda lista). */
  loading?: boolean;
  /** Estado de erro: mensagem + ação opcional. Adição do projeto. */
  error?: ReactNode;
  dense?: boolean;
  /** `false`: a tabela continua tabela no container estreito (rolagem horizontal), para matrizes mês a mês. */
  mobileList?: boolean;
  /** Fixa a primeira coluna na rolagem horizontal (rótulos das matrizes). Adição do projeto. */
  stickyFirstColumn?: boolean;
  /** Destaque da linha: `section` (título de seção, fundo rebaixado) ou `total` (negrito com linha acima). Adição do projeto. */
  rowTone?: (row: T) => 'section' | 'total' | undefined;
  className?: string;
  style?: CSSProperties;
}

const valueOf = (r: unknown, key: string) => (r as Record<string, unknown>)[key];

/** Tabela ordenável e selecionável; vira lista abaixo de 520px de container. */
export function DataTable<T>({ columns = [], rows = [], rowKey = 'id' as keyof T, selectable = false, selected, onSelectionChange, sort, onSortChange, onRowClick, empty = 'Nenhum resultado encontrado.', loading = false, error, dense = false, mobileList = true, stickyFirstColumn = false, rowTone, className, style }: DataTableProps<T>) {
  const [innerSort, setInnerSort] = useState<SortState | null>(sort ?? null);
  const s = sort !== undefined ? sort : innerSort;
  const [innerSel, setInnerSel] = useState<string[]>([]);
  const sel = selected !== undefined ? selected : innerSel;
  const setSel = (v: string[]) => { if (selected === undefined) setInnerSel(v); onSelectionChange?.(v); };
  const keyOf = (r: T, i: number) => (typeof rowKey === 'function' ? rowKey(r) : String(r[rowKey] ?? i));

  const sorted = useMemo(() => {
    if (!s || onSortChange) return rows;
    const col = columns.find((c) => c.key === s.key);
    const get = (r: T) => (col?.sortValue ? col.sortValue(r) : (valueOf(r, s.key) as Sortable));
    return [...rows].sort((a, b) => { const x = get(a) ?? '', y = get(b) ?? ''; return (x > y ? 1 : x < y ? -1 : 0) * (s.dir === 'desc' ? -1 : 1); });
  }, [rows, s, columns, onSortChange]);

  const toggleSort = (key: string) => {
    const next: SortState = s && s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' };
    if (sort === undefined) setInnerSort(next);
    onSortChange?.(next);
  };
  const allKeys = sorted.map(keyOf);
  const allOn = allKeys.length > 0 && allKeys.every((k) => sel.includes(k));
  const someOn = !allOn && allKeys.some((k) => sel.includes(k));
  const toggleRow = (k: string) => setSel(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]);

  const cell = (col: DataColumn<T>, row: T): ReactNode => (col.render ? col.render(row) : (valueOf(row, col.key) as ReactNode));
  const primary = columns.find((c) => c.mobile === 'primary') ?? columns[0];
  const trailing = columns.filter((c) => c.mobile === 'trailing');
  const meta = columns.filter((c) => c.mobile === 'meta');
  const colCount = columns.length + (selectable ? 1 : 0);

  const status = error ? (
    <div className="pr-dt__error" role="alert"><Icon name="triangle-alert" size={20} />{error}</div>
  ) : !loading && sorted.length === 0 ? <div className="pr-dt__empty">{empty}</div> : null;

  return (
    <div className={cx('pr-dt', dense && 'pr-dt--dense', onRowClick && 'pr-dt--click', !mobileList && 'pr-dt--sem-lista', stickyFirstColumn && 'pr-dt--fixa', className)} style={style} aria-busy={loading || undefined}>
      <div className="pr-dt__scroll">
        <table>
          <thead>
            <tr>
              {selectable ? <th style={{ width: 36 }}><Checkbox aria-label="Selecionar todos" checked={allOn} indeterminate={someOn} disabled={loading || !!error} onChange={() => setSel(allOn ? [] : allKeys)} /></th> : null}
              {columns.map((c) => (
                <th key={c.key} style={{ textAlign: c.align ?? 'left', width: c.width }} aria-sort={s && s.key === c.key ? (s.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortable ? (
                    <button type="button" className={cx('pr-dt__sort', s?.key === c.key && 'pr-dt__sort--on')} onClick={() => toggleSort(c.key)}>
                      {c.header}<Icon name={s && s.key === c.key ? (s.dir === 'asc' ? 'chevron-up' : 'chevron-down') : 'arrow-up-down'} size={11} strokeWidth={2} />
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }, (_, i) => (
              <tr key={`sk${i}`}>{Array.from({ length: colCount }, (_, j) => <td key={j}><div className="pr-dt__skel" style={{ width: `${50 + ((i + j) % 3) * 20}%` }} /></td>)}</tr>
            )) : error ? null : sorted.map((r, i) => {
              const k = keyOf(r, i);
              return (
                <tr key={k} className={rowTone?.(r) ? `pr-dt__row--${rowTone(r)}` : undefined} aria-selected={selectable ? sel.includes(k) : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                  {selectable ? <td onClick={(e) => e.stopPropagation()}><Checkbox aria-label="Selecionar linha" checked={sel.includes(k)} onChange={() => toggleRow(k)} /></td> : null}
                  {columns.map((c) => <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>{cell(c, r)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
        {status}
      </div>
      {mobileList ? (
        <ul className="pr-dt__list">
          {loading ? Array.from({ length: 4 }, (_, i) => (
            <li key={`sk${i}`} className="pr-dt__li"><div className="pr-dt__li-main"><div className="pr-dt__skel" style={{ width: '60%' }} /><div className="pr-dt__skel" style={{ width: '35%' }} /></div></li>
          )) : error ? null : sorted.map((r, i) => {
            const k = keyOf(r, i);
            return (
              <li key={k} className={cx('pr-dt__li', rowTone?.(r) && `pr-dt__row--${rowTone(r)}`)} aria-selected={selectable ? sel.includes(k) : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {selectable ? <span onClick={(e) => e.stopPropagation()}><Checkbox aria-label="Selecionar" checked={sel.includes(k)} onChange={() => toggleRow(k)} /></span> : null}
                <div className="pr-dt__li-main">
                  {cell(primary!, r)}
                  {meta.length ? <div className="pr-dt__li-meta">{meta.map((c) => <span key={c.key}>{c.mobileLabel ? <>{c.header} </> : null}{cell(c, r)}</span>)}</div> : null}
                </div>
                {trailing.length ? <div className="pr-dt__li-end">{trailing.map((c) => <span key={c.key}>{cell(c, r)}</span>)}</div> : null}
              </li>
            );
          })}
          {status ? <li>{status}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
