// Tela Importar plano (BRIEFING 9.1): PDF ou texto colado → checklist → erro ou "Revisar plano".

import { useRef, useState } from 'preact/hooks';
import type { ResultadoParse } from '../../../dominio/formato/parser';
import { importacao, importarPdf, importarTexto, limparImportacao } from '../../../app/importacao';
import { navegar } from '../../../app/roteador';
import { Botao, Cabecalho, Cartao, ItemChecklist } from '../../componentes/basicos';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function Checklist({ r, origem }: { r: ResultadoParse; origem: 'pdf' | 'texto' }) {
  const semMarcador = r.erros.some((e) => e.msg.startsWith('Marcador #TREINO'));
  const p = r.rascunho;
  const nEx = p.sessoes.reduce((a, s) => a + s.itens.length, 0);
  const totalErrado = r.erros.some((e) => e.msg.startsWith('TOTAL diz'));
  const semTotal = r.avisos.some((a) => a.msg.startsWith('Sem linha TOTAL'));
  return (
    <ul class="checklist">
      <ItemChecklist estado="ok">
        {origem === 'pdf' ? 'Texto lido no celular, sem internet' : 'Texto recebido'}
      </ItemChecklist>
      <ItemChecklist estado={semMarcador ? 'erro' : 'ok'}>
        {semMarcador ? 'Anexo TREINO v1 não encontrado' : 'Anexo TREINO v1 encontrado'}
      </ItemChecklist>
      {!semMarcador && (
        <>
          <ItemChecklist estado={nEx ? 'ok' : 'erro'}>
            {plural(p.sessoes.length, 'sessão', 'sessões')} · {plural(nEx, 'exercício', 'exercícios')}
          </ItemChecklist>
          <ItemChecklist estado={totalErrado ? 'erro' : semTotal ? 'aviso' : 'ok'}>
            {totalErrado ? 'TOTAL não confere' : semTotal ? 'Sem linha TOTAL para conferir' : 'TOTAL confere'}
          </ItemChecklist>
          {p.bloco && (
            <ItemChecklist estado="ok">
              Periodização: {plural(p.bloco.semanas, 'semana', 'semanas')},{' '}
              {plural(p.bloco.fases.length, 'fase', 'fases')}
            </ItemChecklist>
          )}
          {r.avisos.length > 0 && (
            <ItemChecklist estado="aviso">
              <details class="avisos">
                <summary>{plural(r.avisos.length, 'aviso', 'avisos')}</summary>
                <ul>
                  {r.avisos.map((a, i) => (
                    <li key={i}>
                      {a.linha > 0 && <strong>Linha {a.linha}: </strong>}
                      {a.msg}
                    </li>
                  ))}
                </ul>
              </details>
            </ItemChecklist>
          )}
        </>
      )}
    </ul>
  );
}

function CartaoErro({ r }: { r: ResultadoParse }) {
  return (
    <Cartao class="cartao-erro" titulo="Algo está errado no anexo">
      <ul class="lista-erros">
        {r.erros.map((e, i) => (
          <li key={i}>
            {e.linha > 0 && <strong>Linha {e.linha}: </strong>}
            {e.msg}
            {e.texto && <code class="linha-codigo">{e.texto}</code>}
          </li>
        ))}
      </ul>
      <p>Peça à sua IA para corrigir o anexo e gere o PDF de novo. Nada foi salvo.</p>
    </Cartao>
  );
}

export function TelaImportar({ voltar }: { voltar?: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [colando, setColando] = useState(false);
  const [texto, setTexto] = useState('');
  const imp = importacao.value;
  const r = imp?.resultado;

  const escolherArquivo = (e: Event) => {
    const arq = (e.currentTarget as HTMLInputElement).files?.[0];
    (e.currentTarget as HTMLInputElement).value = '';
    if (arq) {
      setColando(false);
      void importarPdf(arq);
    }
  };

  return (
    <section>
      <Cabecalho titulo="Importar plano" voltar={voltar} />
      <p class="muted">
        Selecione o PDF que a sua IA gerou. O app lê só o anexo final (de #TREINO-INICIO a #TREINO-FIM), tudo
        no celular.
      </p>

      <div class="acoes-lado">
        <Botao onClick={() => entrada.current?.click()} disabled={imp?.etapa === 'lendo'}>
          Selecionar PDF
        </Botao>
        <Botao variante="secundario" onClick={() => (setColando(!colando), limparImportacao())}>
          Colar texto
        </Botao>
      </div>
      <input
        ref={entrada}
        type="file"
        accept="application/pdf,.pdf"
        class="oculto"
        aria-label="Arquivo PDF do plano"
        onChange={escolherArquivo}
      />

      {colando && (
        <Cartao>
          <label class="rotulo" for="texto-anexo">
            Cole o anexo do plano
          </label>
          <textarea
            id="texto-anexo"
            class="campo-texto"
            rows={10}
            spellcheck={false}
            placeholder={'#TREINO-INICIO v1\nPLANO: …\n…\n#TREINO-FIM'}
            value={texto}
            onInput={(e) => setTexto(e.currentTarget.value)}
          />
          <Botao bloco disabled={!texto.trim()} onClick={() => importarTexto(texto)}>
            Ler texto
          </Botao>
        </Cartao>
      )}

      {imp && (
        <Cartao>
          <p class="arquivo-nome">{imp.arquivoNome ?? 'Texto colado'}</p>
          {imp.etapa === 'lendo' && (
            <ul class="checklist">
              <ItemChecklist estado="pendente">Lendo o PDF…</ItemChecklist>
            </ul>
          )}
          {imp.erroLeitura && (
            <ul class="checklist">
              <ItemChecklist estado="erro">{imp.erroLeitura}</ItemChecklist>
            </ul>
          )}
          {r && <Checklist r={r} origem={imp.origem} />}
        </Cartao>
      )}

      {r && r.erros.length > 0 && <CartaoErro r={r} />}

      {r?.plano && (
        <div class="rodape-acao">
          <Botao bloco onClick={() => navegar('plano/revisar')}>
            Revisar plano
          </Botao>
        </div>
      )}
    </section>
  );
}
