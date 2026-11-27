import { describe, expect, it } from 'vitest';
import { rotaDoCaminho } from '../../src/app/roteador';

// v2: rotas por caminho (docs/v2/DECISOES.md, D33)
describe('rotaDoCaminho', () => {
  it('lê o Início, as abas da v1 e as telas novas', () => {
    expect(rotaDoCaminho('/')).toEqual({ aba: 'inicio', caminho: [] });
    expect(rotaDoCaminho('/treino')).toEqual({ aba: 'treino', caminho: [] });
    expect(rotaDoCaminho('/historico')).toEqual({ aba: 'historico', caminho: [] });
    expect(rotaDoCaminho('/plano')).toEqual({ aba: 'plano', caminho: [] });
    expect(rotaDoCaminho('/corpo')).toEqual({ aba: 'corpo', caminho: [] });
  });

  it('lê subcaminhos e ignora parâmetros', () => {
    expect(rotaDoCaminho('/plano/revisar')).toEqual({ aba: 'plano', caminho: ['revisar'] });
    expect(rotaDoCaminho('/historico/supino%20reto/2026')).toEqual({
      aba: 'historico',
      caminho: ['supino reto', '2026'],
    });
    expect(rotaDoCaminho('/plano/importar?x=1')).toEqual({ aba: 'plano', caminho: ['importar'] });
  });

  it('cai no Início quando o caminho é vazio ou desconhecido', () => {
    expect(rotaDoCaminho('')).toEqual({ aba: 'inicio', caminho: [] });
    expect(rotaDoCaminho('/inicio')).toEqual({ aba: 'inicio', caminho: [] });
    expect(rotaDoCaminho('/qualquer/coisa')).toEqual({ aba: 'inicio', caminho: [] });
  });
});
