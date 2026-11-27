import { useId, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from '../core/Icon';
import { Kbd } from '../core/Kbd';
import { cx } from '../core/cx';
import './Input.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  trailing?: ReactNode;
  /** Teclas de atalho, ex.: ["⌘","F"] */
  kbd?: string | string[];
  size?: 'sm' | 'md' | 'lg';
  /** "outline" branco + borda; "filled" cinza para busca dentro de card */
  variant?: 'outline' | 'filled';
  /** Spinner no fim do campo (busca/validação assíncrona). Adição do projeto. */
  loading?: boolean;
  inputStyle?: CSSProperties;
}

export function Input({ label, hint, error, leadingIcon, trailingIcon, trailing, kbd, size = 'md', variant = 'outline', loading = false, disabled = false, id, className, style, inputStyle, ...rest }: InputProps) {
  const autoId = useId();
  const fid = id ?? autoId;
  const iconSize = size === 'sm' ? 15 : 18;
  const field = (
    <div className={cx('pr-input', size !== 'md' && `pr-input--${size}`, variant === 'filled' && 'pr-input--filled', error && 'pr-input--error', disabled && 'pr-input--disabled', !label && className)} style={label ? undefined : style}>
      {leadingIcon ? <span className="pr-input__icon"><Icon name={leadingIcon} size={iconSize} /></span> : null}
      <input id={fid} disabled={disabled} aria-invalid={!!error || undefined} aria-busy={loading || undefined} aria-describedby={hint || error ? `${fid}-hint` : undefined} style={inputStyle} {...rest} />
      {kbd ? <span className="pr-input__kbd" aria-hidden="true">{([] as string[]).concat(kbd).map((k) => <Kbd key={k}>{k}</Kbd>)}</span> : null}
      {loading ? <span className="pr-input__spin" aria-hidden="true" /> : null}
      {trailing}
      {trailingIcon ? <span className="pr-input__icon"><Icon name={trailingIcon} size={iconSize} /></span> : null}
    </div>
  );
  if (!label && !hint && !error) return field;
  return (
    <div className={cx('pr-field', className)} style={style}>
      {label ? <label className="pr-field__label" htmlFor={fid}>{label}</label> : null}
      {field}
      {error || hint ? <span id={`${fid}-hint`} className={cx('pr-field__hint', error && 'pr-field__hint--error')}>{error || hint}</span> : null}
    </div>
  );
}
