import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { alimentoPorNome, BASE, buscarAlimentos } from '../../src/dominio/dieta/alimentos';
import { parseNutriDiet } from '../../src/dominio/dieta/parser';
import {
  gramasPorUnidade,
  montarDoNutriDiet,
  sugerirVinculoDias,
  tipoDeDiaDeHoje,
  totaisDoDia,
  type TipoDia,
} from '../../src/dominio/dieta/plano';
import { excluido, substituir } from '../../src/dominio/dieta/substituicoes';
import { vincular } from '../../src/dominio/dieta/vincular';
import { uuidv5 } from '../../src/dominio/sync/uuid';

const linhas = JSON.parse(readFileSync('tests/fixtures/nutridiet-anonimizado.linhas.json', 'utf8')) as {
  texto: string;
}[];
const r = parseNutriDiet(linhas);
let n = 0;
const gerarId = () => `d${++n}`;
const NAO_COME_THIAGO = ['feijão', 'abacate', 'arroz integral', 'peixe'];

describe('parser do NutriDiet (BRIEFING-v2 10.1) com a fixture anonimizada', () => {
  it('4 tipos de dia, 26 refeições, 91 itens, 4 notas (D48) e 2 avisos de itens sem gramas', () => {
    expect(r.dias.map((d) => d.nome)).toEqual([
      'Dias de Exercício',
      'Perna + Bike',
      'Descanso',
      'Superiores + Bike',
    ]);
    expect(r.dias.reduce((s, d) => s + d.refeicoes.length, 0)).toBe(26);
    expect(r.dias.reduce((s, d) => s + d.refeicoes.reduce((t, f) => t + f.itens.length, 0), 0)).toBe(91);
    expect(r.dias.flatMap((d) => d.notas)).toHaveLength(4);
    expect(r.avisos).toHaveLength(2);
    expect(r.avisos.every((a) => a.includes('sem gramas'))).toBe(true);
  });

  it('cabeçalho anonimizado; refeição com horário; quantidade, medida e gramas separadas', () => {
    expect(r.cabecalho).toEqual({
      nome: 'Paciente Exemplo',
      dataConsulta: '01/01/2026',
      pesoKg: 80,
      alturaCm: 175,
    });
    const cafe = r.dias[0]!.refeicoes[0]!;
    expect(cafe).toMatchObject({ nome: 'Café da manhã', horario: '07:30' });
    expect(cafe.itens[0]).toMatchObject({
      quantidade: 2,
      medida: 'fatias',
      gramas: 50,
      unidade: 'g',
      textoOriginal: '2 fatias (50g)',
    });
  });

  it('nome encostado na coluna e nome quebrado em duas linhas (arroz)', () => {
    const almoco = r.dias[0]!.refeicoes.find((f) => f.nome === 'Almoço')!;
    expect(almoco.itens[0]).toMatchObject({
      nome: 'Arroz (branco, polido, parboilizado, agulha, agulhinha, etc.)',
      gramas: 125,
    });
  });
});

describe('base de alimentos e vinculação (10.2)', () => {
  it('597 da TACO + 4 rótulos, com os ids do seed do Supabase', () => {
    expect(BASE).toHaveLength(601);
    expect(BASE[0]!.id).toBe(uuidv5('taco:1'));
    expect(alimentoPorNome('Whey protein (concentrado, genérico)')?.fonte).toBe('rotulo');
  });

  it('todos os 91 itens do PDF real vinculam (alias padrão ou busca)', () => {
    const itens = r.dias.flatMap((d) => d.refeicoes.flatMap((f) => f.itens));
    expect(itens.filter((i) => !vincular(i.nome).alimento).map((i) => i.nome)).toEqual([]);
  });

  it('alias do usuário vence; busca aproximada acha nome quase igual; nada parecido fica sem vínculo', () => {
    const minas = alimentoPorNome('Queijo, minas, frescal')!;
    expect(vincular('Queijo mussarela', new Map([['queijo mussarela', minas.id]]))).toMatchObject({
      origem: 'seu',
      alimento: { id: minas.id },
    });
    expect(vincular('Mandioca cozida')).toMatchObject({
      origem: 'aproximado',
      alimento: { nome: 'Mandioca, cozida' },
    });
    expect(vincular('Xyzwk qwerty')).toEqual({ alimento: null, origem: null, nota: null });
    expect(buscarAlimentos('batata doce').map((a) => a.nome)).toContain('Batata, doce, cozida');
  });
});

describe('totais por tipo de dia (tabela da 10.2, ±1)', () => {
  const plano = montarDoNutriDiet(r, { gerarId });
  // A tabela do briefing deixa fora os 2 itens sem gramas; aqui eles ganham peso estimado (16.6)
  const semEstimados = (d: TipoDia): TipoDia => ({
    ...d,
    refeicoes: d.refeicoes.map((f) => ({ ...f, itens: f.itens.filter((i) => !i.gramasEstimadas) })),
  });
  const esperado: Record<string, [number, number, number, number]> = {
    'Dias de Exercício': [2142, 192, 208, 61],
    'Perna + Bike': [1927, 158, 206, 52],
    Descanso: [1633, 157, 135, 50],
    'Superiores + Bike': [1779, 155, 173, 51],
  };
  for (const [nome, [kcal, p, c, g]] of Object.entries(esperado))
    it(nome, () => {
      const t = totaisDoDia(semEstimados(plano.dias.find((d) => d.nome === nome)!));
      expect(Math.abs(t.kcal - kcal)).toBeLessThanOrEqual(1);
      expect([t.p, t.c, t.g]).toEqual([p, c, g]);
      expect(t.semVinculo).toBe(0);
    });

  it('itens sem gramas: peso padrão por unidade, marcado como estimado', () => {
    const estimados = plano.dias
      .flatMap((d) => d.refeicoes.flatMap((f) => f.itens))
      .filter((i) => i.gramasEstimadas);
    expect(estimados.map((i) => [i.nome, i.gramas])).toEqual([
      ['Castanha do Pará', 4],
      ['Banana, prata, crua', 90],
    ]);
    expect(gramasPorUnidade('Xyz')).toBeNull();
  });
});

describe('substituições (casos da 10.3, com o "não como" do Thiago)', () => {
  const sub = (nome: string, gramas: number) =>
    substituir(alimentoPorNome(nome)!, gramas, { naoCome: NAO_COME_THIAGO }).opcoes.map((o) => [
      o.alimento.nome,
      o.gramas,
    ]);

  it('arroz 125 g ↔ cuscuz 140 / batata 295 / batata doce 190 / mandioca 115', () => {
    expect(sub('Arroz, tipo 1, cozido', 125)).toEqual(
      expect.arrayContaining([
        ['Cuscuz, de milho, cozido com sal', 140],
        ['Batata, inglesa, cozida', 295],
        ['Batata, doce, cozida', 190],
        ['Mandioca, cozida', 115],
      ]),
    );
  });
  it('banana 90 g ↔ maçã 160 / mamão 220 / manga 175', () => {
    expect(sub('Banana, prata, crua', 90)).toEqual(
      expect.arrayContaining([
        ['Maçã, Fuji, com casca, crua', 160],
        ['Mamão, Papaia, cru', 220],
        ['Manga, Tommy Atkins, crua', 175],
      ]),
    );
  });
  it('queijo minas 60 g ↔ prato 45 / mozarela 45 / ricota 85', () => {
    expect(sub('Queijo, minas, frescal', 60)).toEqual(
      expect.arrayContaining([
        ['Queijo, prato', 45],
        ['Queijo, mozarela', 45],
        ['Queijo, ricota', 85],
      ]),
    );
  });
  it('frango 150 g ↔ lombo 135 (+19%) / patinho 135 (+24%)', () => {
    const r2 = substituir(alimentoPorNome('Frango, peito, sem pele, grelhado')!, 150, {
      naoCome: NAO_COME_THIAGO,
    });
    const lombo = r2.opcoes.find((o) => o.alimento.nome === 'Porco, lombo, assado')!;
    const patinho = r2.opcoes.find(
      (o) => o.alimento.nome === 'Carne, bovina, patinho, sem gordura, grelhado',
    )!;
    expect([lombo.gramas, lombo.difKcal]).toEqual([135, 19]);
    expect([patinho.gramas, patinho.difKcal]).toEqual([135, 24]);
  });
  it('ovo frito 100 g ↔ queijo minas 90 / ricota 125 / ovo cozido 115', () => {
    expect(sub('Ovo, de galinha, inteiro, frito', 100)).toEqual(
      expect.arrayContaining([
        ['Queijo, minas, frescal', 90],
        ['Queijo, ricota', 125],
        ['Ovo, de galinha, inteiro, cozido/10minutos', 115],
      ]),
    );
  });
  it('de 3 a 5 opções, ordenadas pela menor diferença de kcal; sem troca para itens livres e suplemento', () => {
    const r2 = substituir(alimentoPorNome('Banana, prata, crua')!, 90);
    expect(r2.opcoes.length).toBeLessThanOrEqual(5);
    const difs = r2.opcoes.map((o) => Math.abs(o.difKcal));
    expect(difs).toEqual([...difs].sort((a, b) => a - b));
    expect(substituir(alimentoPorNome('Alface, crespa, crua')!, 20).opcoes).toEqual([]);
    expect(substituir(alimentoPorNome('Whey protein (concentrado, genérico)')!, 30).opcoes).toEqual([]);
  });
  it('substituições do nutricionista vêm primeiro e marcadas', () => {
    const batata = alimentoPorNome('Batata, inglesa, cozida')!;
    const r2 = substituir(alimentoPorNome('Arroz, tipo 1, cozido')!, 125, {
      doNutricionista: [{ alimento: batata, gramas: 300 }],
    });
    expect(r2.opcoes[0]).toMatchObject({ gramas: 300, doNutricionista: true });
  });
  it('"não como": feijão, abacate, arroz integral e peixe (com sinônimos)', () => {
    expect(excluido('Feijão, carioca, cozido', NAO_COME_THIAGO)).toBe(true);
    expect(excluido('Arroz, integral, cozido', NAO_COME_THIAGO)).toBe(true);
    expect(excluido('Arroz, tipo 1, cozido', NAO_COME_THIAGO)).toBe(false);
    expect(excluido('Atum, conserva em óleo', NAO_COME_THIAGO)).toBe(true);
  });
});

describe('tipo de dia ↔ sessões (16.5) e Dieta → Hoje (10.4)', () => {
  const sessoes = ['Push', 'Pull', 'Legs', 'Upper'];
  const dias = [
    { nome: 'Dias de Exercício' },
    { nome: 'Perna + Bike' },
    { nome: 'Descanso' },
    { nome: 'Superiores + Bike' },
  ];
  it('perna ↔ Legs; superiores ↔ as outras; descanso ↔ dia sem treino', () => {
    expect(sugerirVinculoDias(dias, sessoes)).toEqual([
      { sessoes: [], descanso: false },
      { sessoes: ['Legs'], descanso: false },
      { sessoes: [], descanso: true },
      { sessoes: ['Push', 'Pull', 'Upper'], descanso: false },
    ]);
  });
  it('hoje: pela sessão; sem treino, o de descanso', () => {
    const e = montarDoNutriDiet(r, { gerarId, sessoes });
    expect(tipoDeDiaDeHoje(e, 'Legs')?.nome).toBe('Perna + Bike');
    expect(tipoDeDiaDeHoje(e, 'Pull')?.nome).toBe('Superiores + Bike');
    expect(tipoDeDiaDeHoje(e, null)?.nome).toBe('Descanso');
  });
});
