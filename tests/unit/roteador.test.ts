import { describe, expect, it } from 'vitest';
import { rotaDoHash } from '../../src/app/roteador';

describe('rotaDoHash', () => {
  it('lê as três abas', () => {
    expect(rotaDoHash('#/treino')).toEqual({ aba: 'treino', caminho: [] });
    expect(rotaDoHash('#/historico')).toEqual({ aba: 'historico', caminho: [] });
    expect(rotaDoHash('#/plano')).toEqual({ aba: 'plano', caminho: [] });
  });

  it('lê subcaminhos e ignora parâmetros', () => {
    expect(rotaDoHash('#/plano/revisar')).toEqual({ aba: 'plano', caminho: ['revisar'] });
    expect(rotaDoHash('#/historico/supino%20reto/2026')).toEqual({
      aba: 'historico',
      caminho: ['supino reto', '2026'],
    });
    expect(rotaDoHash('#/plano/importar?x=1')).toEqual({ aba: 'plano', caminho: ['importar'] });
  });

  it('cai em treino quando o hash é vazio ou desconhecido', () => {
    expect(rotaDoHash('')).toEqual({ aba: 'treino', caminho: [] });
    expect(rotaDoHash('#/')).toEqual({ aba: 'treino', caminho: [] });
    expect(rotaDoHash('#/qualquer/coisa')).toEqual({ aba: 'treino', caminho: [] });
  });
});
