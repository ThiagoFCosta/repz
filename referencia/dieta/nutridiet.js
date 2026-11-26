// Leitor do PDF de plano alimentar do NutriDiet (layout observado em nov/2026).
const RUIDO = [/^Personalize alguma informa/i, /^Plano Alimentar$/i, /^Nome:/i, /^Idade:/i, /^-{5,}/, /^\d{1,2}$/, /rodap[eé] personalizado/i];
const REFEICAO = /^([A-ZÀ-Ü][A-ZÀ-Ü \-\/]+?)\s*\((\d{1,2}:\d{2})\)$/;
// Nome tão longo que encosta na coluna: separa pela quantidade no fim da linha
const QTD_NO_FIM = /^(.*?[a-zà-ü,)])\s+(\d+(?:[.,]\d+)?\s+[^()\t]+\(\d+(?:[.,]\d+)?\s*(?:g|ml)\))$/i;
const QTD = /^(?:(\d+(?:[.,]\d+)?)\s+)?(.*?)\s*(?:\((\d+(?:[.,]\d+)?)\s*(g|ml)\))?$/i;

export function parseNutriDiet(linhas) {
  const avisos = [];
  const cab = {};
  for (const { texto } of linhas) {
    let m;
    if ((m = texto.match(/Nome:\s*(.+?)(?:\t|$)/))) cab.nome ??= m[1].trim();
    if ((m = texto.match(/Data da consulta:\s*(\d{2}\/\d{2}\/\d{4})/))) cab.dataConsulta ??= m[1];
    if ((m = texto.match(/Peso:\s*([\d.,]+)\s*kg/i))) cab.pesoKg ??= parseFloat(m[1].replace(',', '.'));
    if ((m = texto.match(/Altura:\s*([\d.,]+)\s*cm/i))) cab.alturaCm ??= parseFloat(m[1].replace(',', '.'));
  }
  const uteis = linhas.filter((l) => !RUIDO.some((r) => r.test(l.texto)));
  const dias = []; let dia = null, ref = null, ultimoItem = null;
  const ehRefeicao = (t) => REFEICAO.test(t);
  for (let i = 0; i < uteis.length; i++) {
    const t = uteis[i].texto;
    const m = t.match(REFEICAO);
    if (m) {
      if (!dia) { dia = { nome: 'Plano', refeicoes: [], notas: [] }; dias.push(dia); }
      ref = { nome: titulo(m[1]), horario: m[2], itens: [] }; dia.refeicoes.push(ref); ultimoItem = null; continue;
    }
    let partes = null;
    if (t.includes('\t')) partes = [t.slice(0, t.lastIndexOf('\t')).replace(/\t/g, ' ').trim(), t.slice(t.lastIndexOf('\t') + 1).trim()];
    else { const mq = t.match(QTD_NO_FIM); if (mq) partes = [mq[1].trim(), mq[2].trim()]; }
    if (partes) {
      const [nome, qtdTxt] = partes;
      if (!ref) { avisos.push(`Item fora de refeição ignorado: "${t}"`); continue; }
      const q = qtdTxt.match(QTD);
      const item = { nome, quantidade: q[1] ? parseFloat(q[1].replace(',', '.')) : null, medida: q[2] || null,
        gramas: q[3] ? parseFloat(q[3].replace(',', '.')) : null, unidade: q[4] ? q[4].toLowerCase() : null, textoOriginal: qtdTxt };
      if (item.gramas == null) avisos.push(`${dia.nome} › ${ref.nome}: "${nome}" sem gramas ("${qtdTxt}") — preencher na revisão`);
      ref.itens.push(item); ultimoItem = item; continue;
    }
    // linha sem coluna de quantidade
    const aberto = ultimoItem && (ultimoItem.nome.split('(').length > ultimoItem.nome.split(')').length);
    if (aberto) { ultimoItem.nome = `${ultimoItem.nome} ${t}`; continue; }
    const prox = uteis.slice(i + 1).find((l) => l.texto);
    if (prox && ehRefeicao(prox.texto)) { dia = { nome: t, refeicoes: [], notas: [] }; dias.push(dia); ref = null; ultimoItem = null; continue; }
    if (dia) dia.notas.push(t); else avisos.push(`Linha ignorada: "${t}"`);
  }
  // "Dias de Exercício" etc: notas que aparecem depois da última refeição pertencem ao dia
  return { cabecalho: cab, dias, avisos };
}
function titulo(s) { const t = s.toLowerCase().trim(); return t.charAt(0).toUpperCase() + t.slice(1); }
