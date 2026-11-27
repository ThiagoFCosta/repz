import type { HTMLAttributes, ReactNode } from 'react';

export type CardTone = 'forest' | 'lime' | 'gray' | 'light';

// Arte dos cartões: cores fixas das rampas (o "plástico" não muda com o tema).
const TONES: Record<CardTone, { bg: string; fg: string; band: string; sub: string }> = {
  forest: { bg: 'var(--forest-900)', fg: 'var(--gray-0)', band: 'rgba(255,255,255,.16)', sub: 'var(--forest-200)' },
  lime: { bg: 'var(--lime-400)', fg: 'var(--forest-900)', band: 'rgba(6,47,40,.16)', sub: 'var(--forest-600)' },
  gray: { bg: 'var(--gray-500)', fg: 'var(--gray-0)', band: 'rgba(255,255,255,.22)', sub: 'var(--gray-100)' },
  light: { bg: 'var(--gray-100)', fg: 'var(--forest-900)', band: 'rgba(6,47,40,.08)', sub: 'var(--gray-600)' },
};

export interface CreditCardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  size?: 'full' | 'mini';
  network?: string;
  balance?: ReactNode;
  last4?: string;
  expiry?: string;
  holder?: string;
}

export function CreditCard({ tone = 'forest', size = 'full', network = 'VISA', balance, last4 = '0000', expiry, holder, style, ...rest }: CreditCardProps) {
  const t = TONES[tone];
  if (size === 'mini') {
    return (
      <span aria-label={`Cartão ${network} final ${last4}`} role="img" style={{ position: 'relative', display: 'inline-block', width: 56, height: 36, borderRadius: 5, background: `linear-gradient(180deg, transparent 52%, ${t.band} 52%, ${t.band} 70%, transparent 70%), ${t.bg}`, color: t.fg, flexShrink: 0, ...style }} {...(rest as HTMLAttributes<HTMLSpanElement>)}>
        <span style={{ position: 'absolute', top: 5, left: 6, fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 7, lineHeight: 1, letterSpacing: '.02em' }}>{network}</span>
      </span>
    );
  }
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', maxWidth: 360, aspectRatio: '1.66', minHeight: 96, padding: 14, borderRadius: 'var(--radius-xl)', background: `radial-gradient(160px 120px at 110% -10%, ${t.band}, transparent 70%), ${t.bg}`, color: t.fg, overflow: 'hidden', ...style }} {...rest}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ font: '600 var(--text-xl)/1 var(--font-sans)', letterSpacing: 'var(--tracking-snug)' }}>{balance}</span>
        <span style={{ font: '800 var(--text-md)/1 var(--font-sans)', letterSpacing: 'var(--tracking-wide)' }}>{network}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8, font: '500 var(--text-xs)/1 var(--font-mono)' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {holder ? <span style={{ fontFamily: 'var(--font-sans)', color: t.sub }}>{holder}</span> : null}
          <span>•••• {last4}</span>
        </span>
        {expiry ? <span>{expiry}</span> : null}
      </div>
    </div>
  );
}
