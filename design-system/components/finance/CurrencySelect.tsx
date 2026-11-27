import type { CSSProperties } from 'react';
import { Select } from '../forms/Select';
import br from '../../assets/flags/br.svg';
import us from '../../assets/flags/us.svg';
import eu from '../../assets/flags/eu.svg';
import gb from '../../assets/flags/gb.svg';
import jp from '../../assets/flags/jp.svg';

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'JPY';

/** Bandeiras (flag-icons, MIT) — servidas de assets/flags em vez do base64 do export. */
export const CURRENCY_FLAGS: Record<CurrencyCode, string> = { BRL: br, USD: us, EUR: eu, GBP: gb, JPY: jp };
const NAMES: Record<CurrencyCode, string> = { BRL: 'Real', USD: 'Dólar americano', GBP: 'Libra esterlina', EUR: 'Euro', JPY: 'Iene' };

export interface CurrencySelectProps {
  value?: CurrencyCode;
  defaultValue?: CurrencyCode;
  onChange?: (code: CurrencyCode) => void;
  currencies?: CurrencyCode[];
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'ghost' | 'filled';
  align?: 'left' | 'right';
  showName?: boolean;
  block?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
}

export function CurrencySelect({ value, defaultValue, onChange, currencies = ['BRL', 'USD', 'EUR', 'GBP', 'JPY'], size = 'lg', variant = 'outline', align, showName = false, block = false, disabled, style }: CurrencySelectProps) {
  const options = currencies.map((c) => ({ value: c, label: showName ? `${c} · ${NAMES[c]}` : c, imageSrc: CURRENCY_FLAGS[c] }));
  return (
    <Select options={options} value={value} defaultValue={defaultValue ?? currencies[0]} onChange={(v) => onChange?.(v as CurrencyCode)}
      size={size} variant={variant} align={align} block={block} disabled={disabled} label="Moeda" renderValue={(o) => (o ? o.value : '')} style={style} />
  );
}
