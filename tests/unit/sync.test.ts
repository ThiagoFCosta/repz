import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperaMs, venceLocal } from '../../src/dominio/sync/regras';
import { NAMESPACE_REPZ, uuidv5 } from '../../src/dominio/sync/uuid';

// Referência: uuid v5 com o sha1 do Node (o mesmo de scripts/gerar-seeds.mjs)
function referencia(nome: string) {
  const ns = Buffer.from(NAMESPACE_REPZ.replace(/-/g, ''), 'hex');
  const h = createHash('sha1')
    .update(Buffer.concat([ns, Buffer.from(nome, 'utf8')]))
    .digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

describe('uuidv5', () => {
  it('bate com o sha1 do Node, inclusive com acentos e textos longos', () => {
    for (const nome of ['taco:1', 'a', '', 'usuário|supino inclinado com halteres', 'x'.repeat(200)])
      expect(uuidv5(nome)).toBe(referencia(nome));
  });
  it('o seed da TACO usa os mesmos ids', () => {
    expect(uuidv5('taco:1')).toBe('a215a217-2e06-543b-8828-ec50778bd114');
  });
});

describe('regras da sync', () => {
  it('local só vence pendente e mais novo', () => {
    expect(venceLocal(null, '2026-11-27T10:00:00Z')).toBe(false);
    expect(venceLocal('2026-11-27T10:00:01Z', '2026-11-27T10:00:00Z')).toBe(true);
    expect(venceLocal('2026-11-27T09:59:59Z', '2026-11-27T10:00:00Z')).toBe(false);
    expect(venceLocal('2026-11-27T10:00:00Z', '2026-11-27T10:00:00Z')).toBe(false);
  });
  it('espera exponencial com teto de 5 min', () => {
    expect([1, 2, 3, 10].map(esperaMs)).toEqual([5_000, 10_000, 20_000, 300_000]);
  });
});
