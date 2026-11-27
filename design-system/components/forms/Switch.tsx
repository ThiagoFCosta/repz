import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '../core/cx';
import './Switch.css';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: ReactNode;
  size?: 'sm' | 'md';
  onChange?: (checked: boolean, e: ChangeEvent<HTMLInputElement>) => void;
}

export function Switch({ label, checked, defaultChecked, onChange, size = 'md', disabled = false, className, style, ...rest }: SwitchProps) {
  return (
    <label className={cx('pr-switch', size === 'sm' && 'pr-switch--sm', disabled && 'pr-switch--disabled', className)} style={style}>
      <input type="checkbox" role="switch" checked={checked} defaultChecked={defaultChecked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked, e)} {...rest} />
      <span className="pr-switch__track" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
