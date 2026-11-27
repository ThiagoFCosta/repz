// Leitor do PDF de plano alimentar do NutriDiet (BRIEFING-v2 10.1). Porte tipado de referencia/dieta/nutridiet.js,
// testado com a fixture anonimizada do PDF real (4 tipos de dia, 26 refeições, 91 itens, 4 notas, 2 avisos; D48).
// Recebe as linhas já extraídas com as colunas separadas por TAB (src/pdf/extrairLinhas.ts).

export interface ItemNutriDiet {
  nome: string;
  quantidade: number | null; // "2" de "2 fatias (50g)"
  medida: string | null; // "fatias"
  gramas: number | null; // 50 (g ou mL)
  unidade: 'g' | 'ml' | null;
  textoOriginal: string; // "2 fatias (50g)"
}

export interface RefeicaoNutriDiet {
  nome: string;
  horario: string;
  itens: ItemNutriDiet[];
}

export interface DiaNutriDiet {
  nome: string; // "Perna + Bike"
  refeicoes: RefeicaoNutriDiet[];
  notas: string[];
}

export interface CabecalhoNutriDiet {
  nome?: string;
  dataConsulta?: string; // DD/MM/AAAA
  pesoKg?: number;
  alturaCm?: number;
}

export interface ResultadoNutriDiet {
  cabecalho: CabecalhoNutriDiet;
  dias: DiaNutriDiet[];
  avisos: string[];
}

const RUIDO = [
  /^Personalize alguma informa/i,
  /^Plano Alimentar$/i,
  /^Nome:/i,
  /^Idade:/i,
  /^-{5,}/,
  /^\d{1,2}$/,
  /rodap[eé] personalizado/i,
];
const REFEICAO = /^([A-ZÀ-Ü][A-ZÀ-Ü \-/]+?)\s*\((\d{1,2}:\d{2})\)$/;
// Nome tão longo que encosta na coluna: separa pela quantidade no fim da linha
const QTD_NO_FIM = /^(.*?[a-zà-ü,)])\s+(\d+(?:[.,]\d+)?\s+[^()\t]+\(\d+(?:[.,]\d+)?\s*(?:g|ml)\))$/i;
const QTD = /^(?:(\d+(?:[.,]\d+)?)\s+)?(.*?)\s*(?:\((\d+(?:[.,]\d+)?)\s*(g|ml)\))?$/i;

const decimal = (s: string) => parseFloat(s.replace(',', '.'));
function titulo(s: string): string {
  const t = s.toLowerCase().trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function parseNutriDiet(linhas: readonly { texto: string }[]): ResultadoNutriDiet {
  const avisos: string[] = [];
  const cab: CabecalhoNutriDiet = {};
  for (const { texto } of linhas) {
    let m;
    if ((m = texto.match(/Nome:\s*(.+?)(?:\t|$)/))) cab.nome ??= m[1]!.trim();
    if ((m = texto.match(/Data da consulta:\s*(\d{2}\/\d{2}\/\d{4})/))) cab.dataConsulta ??= m[1];
    if ((m = texto.match(/Peso:\s*([\d.,]+)\s*kg/i))) cab.pesoKg ??= decimal(m[1]!);
    if ((m = texto.match(/Altura:\s*([\d.,]+)\s*cm/i))) cab.alturaCm ??= decimal(m[1]!);
  }
  const uteis = linhas.filter((l) => !RUIDO.some((r) => r.test(l.texto)));
  const dias: DiaNutriDiet[] = [];
  let dia: DiaNutriDiet | null = null;
  let ref: RefeicaoNutriDiet | null = null;
  let ultimoItem: ItemNutriDiet | null = null;

  for (let i = 0; i < uteis.length; i++) {
    const t = uteis[i]!.texto;
    const m = t.match(REFEICAO);
    if (m) {
      if (!dia) {
        dia = { nome: 'Plano', refeicoes: [], notas: [] };
        dias.push(dia);
      }
      ref = { nome: titulo(m[1]!), horario: m[2]!, itens: [] };
      dia.refeicoes.push(ref);
      ultimoItem = null;
      continue;
    }
    let partes: [string, string] | null = null;
    if (t.includes('\t'))
      partes = [
        t.slice(0, t.lastIndexOf('\t')).replace(/\t/g, ' ').trim(),
        t.slice(t.lastIndexOf('\t') + 1).trim(),
      ];
    else {
      const mq = t.match(QTD_NO_FIM);
      if (mq) partes = [mq[1]!.trim(), mq[2]!.trim()];
    }
    if (partes) {
      const [nome, qtdTxt] = partes;
      if (!ref || !dia) {
        avisos.push(`Item fora de refeição ignorado: "${t}"`);
        continue;
      }
      const q = qtdTxt.match(QTD)!;
      const item: ItemNutriDiet = {
        nome,
        quantidade: q[1] ? decimal(q[1]) : null,
        medida: q[2] || null,
        gramas: q[3] ? decimal(q[3]) : null,
        unidade: q[4] ? (q[4].toLowerCase() as 'g' | 'ml') : null,
        textoOriginal: qtdTxt,
      };
      if (item.gramas == null)
        avisos.push(`${dia.nome} › ${ref.nome}: "${nome}" sem gramas ("${qtdTxt}") — preencher na revisão`);
      ref.itens.push(item);
      ultimoItem = item;
      continue;
    }
    // Linha sem coluna de quantidade: continuação de nome com parêntese aberto, tipo de dia ou nota
    const aberto = ultimoItem && ultimoItem.nome.split('(').length > ultimoItem.nome.split(')').length;
    if (aberto) {
      ultimoItem!.nome = `${ultimoItem!.nome} ${t}`;
      continue;
    }
    const prox = uteis.slice(i + 1).find((l) => l.texto);
    if (prox && REFEICAO.test(prox.texto)) {
      dia = { nome: t, refeicoes: [], notas: [] };
      dias.push(dia);
      ref = null;
      ultimoItem = null;
      continue;
    }
    if (dia) dia.notas.push(t);
    else avisos.push(`Linha ignorada: "${t}"`);
  }
  return { cabecalho: cab, dias, avisos };
}
