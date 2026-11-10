import { describe, expect, it } from 'vitest';
import { rotaDoHash } from '../../src/app/roteador';

describe('rotaDoHash', () => {
  it('lê as três abas', () => {
    expect(rotaDoHash('#/treino')).toBe('treino');
    expect(rotaDoHash('#/historico')).toBe('historico');
    expect(rotaDoHash('#/plano')).toBe('plano');
  });

  it('ignora subcaminhos e parâmetros', () => {
    expect(rotaDoHash('#/historico/supino-reto-barra')).toBe('historico');
    expect(rotaDoHash('#/plano?aba=dados')).toBe('plano');
  });

  it('cai em treino quando o hash é vazio ou desconhecido', () => {
    expect(rotaDoHash('')).toBe('treino');
    expect(rotaDoHash('#/')).toBe('treino');
    expect(rotaDoHash('#/qualquer')).toBe('treino');
  });
});
