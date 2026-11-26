// Igual ao extrair-pdf.js do repz, mas marca colunas: espaço grande vira TAB.
export async function linhasDoPdf(pdfjs, dados) {
  const doc = await pdfjs.getDocument({ data: dados, useSystemFonts: true }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const { items } = await (await doc.getPage(p)).getTextContent();
    const linhas = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      let l = linhas.find((q) => Math.abs(q.y - y) < 2.5);
      if (!l) linhas.push((l = { y, partes: [] }));
      l.partes.push({ x, w: it.width, s: it.str });
    }
    linhas.sort((a, b) => b.y - a.y);
    for (const l of linhas) {
      l.partes.sort((a, b) => a.x - b.x);
      let t = '', fim = null;
      for (const pt of l.partes) {
        const gap = fim == null ? 0 : pt.x - fim;
        if (fim != null) t += gap > 12 ? '\t' : (gap > 1.5 && !t.endsWith(' ') && !pt.s.startsWith(' ') ? ' ' : '');
        t += pt.s; fim = pt.x + pt.w;
      }
      out.push({ pagina: p, texto: t.replace(/[  ]+/g, ' ').trim(), x: l.partes[0].x });
    }
  }
  return out;
}
