// uuid v5 (RFC 4122, SHA-1) puro, sem crypto global: ids determinísticos para linhas que dois aparelhos podem
// criar "iguais" offline (config de exercício por chave, preferências, check-in por data), ARCHITECTURE 8.5.

// Namespace do Repz (o mesmo de scripts/gerar-seeds.mjs; não mude)
export const NAMESPACE_REPZ = '6f1c2b0e-8a4d-5c3e-9b7a-2d4e6f8a1c3b';

function sha1(bytes: Uint8Array): Uint8Array {
  const ml = bytes.length * 8;
  const comPad = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  comPad.set(bytes);
  comPad[bytes.length] = 0x80;
  const dv = new DataView(comPad.buffer);
  dv.setUint32(comPad.length - 4, ml >>> 0);
  dv.setUint32(comPad.length - 8, Math.floor(ml / 2 ** 32));
  let h0 = 0x67452301,
    h1 = 0xefcdab89,
    h2 = 0x98badcfe,
    h3 = 0x10325476,
    h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  for (let off = 0; off < comPad.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!, 1);
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4;
    for (let i = 0; i < 80; i++) {
      const [f, k] =
        i < 20
          ? [(b & c) | (~b & d), 0x5a827999]
          : i < 40
            ? [b ^ c ^ d, 0x6ed9eba1]
            : i < 60
              ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc]
              : [b ^ c ^ d, 0xca62c1d6];
      const t = (rotl(a, 5) + f + e + k + w[i]!) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30) >>> 0;
      b = a;
      a = t;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const ov = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => ov.setUint32(i * 4, h));
  return out;
}

const hexParaBytes = (hex: string) => Uint8Array.from(hex.match(/../g)!.map((b) => parseInt(b, 16)));

export function uuidv5(nome: string, namespace = NAMESPACE_REPZ): string {
  const ns = hexParaBytes(namespace.replace(/-/g, ''));
  const txt = new TextEncoder().encode(nome);
  const entrada = new Uint8Array(ns.length + txt.length);
  entrada.set(ns);
  entrada.set(txt, ns.length);
  const h = sha1(entrada);
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = Array.from(h.subarray(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
