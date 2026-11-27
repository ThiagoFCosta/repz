import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '../core/cx';
import './Radio.css';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: ReactNode;
  name?: string;
  value?: string;
  /** Estado de erro (borda vermelha). Adição do projeto. */
  invalid?: boolean;
  onChange?: (value: string, e: ChangeEvent<HTMLInputElement>) => void;
}

export function Radio({ label, name, value = '', checked, defaultChecked, invalid = false, onChange, disabled = false, className, style, ...rest }: RadioProps) {
  return (
    <label className={cx('pr-radio', disabled && 'pr-radio--disabled', invalid && 'pr-radio--error', className)} style={style}>
      <input type="radio" name={name} value={value} checked={checked} defaultChecked={defaultChecked} disabled={disabled} aria-invalid={invalid || undefined}
        onChange={(e) => onChange?.(value, e)} {...rest} />
      <span className="pr-radio__dot" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
