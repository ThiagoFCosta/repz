import { sugerir } from '../parser/progressao.js';

const S = (data, kg, reps, rir) => ({ data, series: reps.map((r, i) => ({ kg, reps: r, rir: rir[i] })) });
const supino = { reps: { min: 6, max: 10 }, rir: { min: 1, max: 2 } };   // semana 6 (fase 2)
const desenv = { reps: { min: 8, max: 12 }, rir: { min: 1, max: 2 } };
const elev = { reps: { min: 12, max: 20 }, rir: { min: 0, max: 1 } };    // isolador, semana 10

const casos = [
  ['Topo da faixa (barra)', [S('2026-10-30', 80, [10, 10, 9], [2, 1, 1]), S('2026-11-06', 80, [10, 10, 10], [2, 1, 1])], supino, { nome: 'Supino reto barra' }],
  ['Topo da faixa (halteres 26 kg)', [S('2026-11-06', 26, [10, 10, 10], [2, 2, 1])], supino, { nome: 'Supino inclinado com halteres' }],
  ['Topo com folga grande', [S('2026-11-06', 80, [13, 12, 12], [3, 2, 2])], supino, { nome: 'Supino reto barra' }],
  ['Dentro da faixa', [S('2026-11-06', 82.5, [8, 7, 7], [2, 1, 1])], supino, { nome: 'Supino reto barra' }],
  ['Pulou carga demais', [S('2026-10-30', 80, [10, 10, 10], [2, 1, 1]), S('2026-11-06', 85, [5, 4, 4], [1, 0, 0])], supino, { nome: 'Supino reto barra' }],
  ['Halteres abaixo da faixa', [S('2026-11-06', 22, [7, 6, 5], [1, 0, 0])], desenv, { nome: 'Desenvolvimento com halteres' }],
  ['Queda pontual (1 treino ruim)', [S('2026-10-16', 80, [10, 9, 9], [1, 1, 1]), S('2026-10-23', 80, [10, 10, 9], [1, 1, 1]), S('2026-10-30', 80, [10, 10, 10], [2, 1, 1]), S('2026-11-06', 80, [8, 7, 7], [1, 1, 0])], supino, { nome: 'Supino reto barra', hoje: '2026-11-07' }],
  ['Queda em 2 treinos seguidos', [S('2026-10-23', 80, [10, 10, 9], [1, 1, 1]), S('2026-10-30', 80, [10, 10, 10], [2, 1, 1]), S('2026-11-03', 80, [7, 7, 6], [1, 1, 0]), S('2026-11-06', 80, [7, 6, 6], [1, 0, 0])], supino, { nome: 'Supino reto barra', hoje: '2026-11-07' }],
  ['Muito perto da falha, 1x', [S('2026-11-06', 80, [9, 8, 8], [0, 0, 0])], { reps: { min: 6, max: 10 }, rir: { min: 2, max: 3 } }, { nome: 'Supino reto barra' }],
  ['Muito perto da falha, 2x', [S('2026-10-30', 80, [9, 8, 8], [0, 0, 0]), S('2026-11-06', 80, [9, 9, 8], [0, 0, 0])], { reps: { min: 6, max: 10 }, rir: { min: 2, max: 3 } }, { nome: 'Supino reto barra' }],
  ['Pausa de 25 dias', [S('2026-10-13', 80, [10, 10, 9], [2, 1, 1])], supino, { nome: 'Supino reto barra', hoje: '2026-11-07' }],
  ['Deload (semana 12)', [S('2026-11-06', 80, [10, 10, 10], [2, 1, 1])], { ...supino, fase: { deload: true } }, { nome: 'Supino reto barra' }],
  ['Estagnado 3 semanas', [S('2026-10-09', 22, [10, 10, 9], [1, 1, 1]), S('2026-10-16', 22, [10, 9, 9], [1, 1, 1]), S('2026-10-23', 22, [10, 10, 9], [1, 1, 1]), S('2026-10-30', 22, [10, 9, 9], [1, 1, 1])], desenv, { nome: 'Desenvolvimento com halteres', hoje: '2026-11-01' }],
  ['Isolador fase 3 (RIR 0-1)', [S('2026-11-06', 10, [20, 20, 19, 20], [1, 0, 0, 0])], elev, { nome: 'Elevacao lateral' }],
  ['Máquina com placa de 5 kg', [S('2026-11-06', 45, [15, 15, 15], [1, 1, 1])], { reps: { min: 10, max: 15 }, rir: { min: 1, max: 2 } }, { nome: 'Cadeira extensora', incremento: 5 }],
  ['Sem histórico', [], supino, { nome: 'Supino reto barra' }],
];

const ic = { aumentar: '↑', manter: '=', reduzir: '↓', calibrar: '·' };
for (const [nome, h, p, o] of casos) {
  const r = sugerir(h, p, { hoje: '2026-11-07', ...o });
  const v = r.carga != null && r.anterior ? ` (${r.anterior} → ${r.carga} kg, ${r.variacao > 0 ? '+' : ''}${r.variacao}%)` : '';
  console.log(`${ic[r.acao]} ${nome}${v}\n    ${r.motivo}${r.alertas.map((a) => `\n    ! ${a}`).join('')}`);
}
