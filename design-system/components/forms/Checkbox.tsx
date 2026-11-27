import { useEffect, useRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { ICON_PATHS } from '../core/iconPaths';
import { cx } from '../core/cx';
import './Checkbox.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: ReactNode;
  indeterminate?: boolean;
  /** Estado de erro (borda vermelha). Adição do projeto. */
  invalid?: boolean;
  onChange?: (checked: boolean, e: ChangeEvent<HTMLInputElement>) => void;
}

export function Checkbox({ label, checked, defaultChecked, indeterminate = false, invalid = false, onChange, disabled = false, className, style, ...rest }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  const path = indeterminate ? ICON_PATHS.minus : ICON_PATHS.check;
  return (
    <label className={cx('pr-check', disabled && 'pr-check--disabled', invalid && 'pr-check--error', className)} style={style}>
      <input ref={ref} type="checkbox" checked={checked} defaultChecked={defaultChecked} disabled={disabled} aria-invalid={invalid || undefined}
        onChange={(e) => onChange?.(e.target.checked, e)} {...rest} />
      <span className="pr-check__box" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: path }} />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
