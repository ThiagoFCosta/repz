import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REFERENCIAS, REFERENCIAS_DA_REGRA, referencia } from '../../src/dominio/referencias';

describe('referências (BRIEFING-v2, seção 11)', () => {
  it('chaves únicas, nível válido e DOI (quando há) no formato https://doi.org/…', () => {
    const chaves = REFERENCIAS.map((r) => r.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
    for (const r of REFERENCIAS) {
      expect(['forte', 'moderada', 'limitada', 'pratica']).toContain(r.nivel);
      if (r.doiUrl) expect(r.doiUrl.startsWith('https://doi.org/10.')).toBe(true);
      expect(r.sustenta.length).toBeGreaterThan(0);
    }
  });

  it('as 7 da semente do briefing estão lá; convenção sem estudo é "prática"', () => {
    for (const k of [
      'halperin2022',
      'hickmott2022',
      'bosquet2013',
      'craven2022',
      'murphy2022',
      'galaxybia2025',
      'taco2011',
    ])
      expect(referencia(k)).not.toBeNull();
    const convencoes = REFERENCIAS.filter((r) => r.chave.startsWith('convencao-'));
    expect(convencoes.length).toBeGreaterThan(0);
    expect(convencoes.every((r) => r.nivel === 'pratica')).toBe(true);
  });

  it('toda regra aponta para referências que existem', () => {
    for (const chaves of Object.values(REFERENCIAS_DA_REGRA))
      for (const k of chaves) expect(referencia(k)).not.toBeNull();
  });

  it('a semente SQL está em dia com a lista (rode node scripts/gerar-referencias.mjs)', () => {
    const sql = readFileSync('supabase/migrations/20261127140000_v4_referencias.sql', 'utf8');
    for (const r of REFERENCIAS) expect(sql).toContain(`('${r.chave}', '${r.citacao.replaceAll("'", "''")}'`);
    expect(sql.split('\n').filter((l) => l.startsWith("('")).length).toBe(REFERENCIAS.length);
  });
});
