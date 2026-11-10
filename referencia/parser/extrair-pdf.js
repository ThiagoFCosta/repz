// Extrai o texto do PDF reconstruindo linhas pela posição vertical (pdf.js).
// No app, o mesmo código roda no navegador com o pdf.js embutido (offline).

export async function textoDoPdf(pdfjs, dados) {
  const doc = await pdfjs.getDocument({ data: dados, useSystemFonts: true }).promise;
  const linhas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const { items } = await pagina.getTextContent();
    const porLinha = [];
    for (const it of items) {
      if (!it.str) continue;
      const y = it.transform[5], x = it.transform[4];
      let l = porLinha.find((q) => Math.abs(q.y - y) < 2.5);
      if (!l) porLinha.push((l = { y, partes: [] }));
      l.partes.push({ x, w: it.width, s: it.str });
    }
    porLinha.sort((a, b) => b.y - a.y);
    for (const l of porLinha) {
      l.partes.sort((a, b) => a.x - b.x);
      let txt = '', fim = null;
      for (const pt of l.partes) {
        if (fim != null && pt.x - fim > 1.5 && !txt.endsWith(' ') && !pt.s.startsWith(' ')) txt += ' ';
        txt += pt.s;
        fim = pt.x + pt.w;
      }
      linhas.push(txt);
    }
  }
  return linhas.join('\n');
}
