// Exportar e restaurar backup (BRIEFING 9.9 e 10), na tela Plano e dados e, sem plano, em Importar.

import { useRef, useState } from 'preact/hooks';
import { dataBR } from '../../../dominio/datas';
import type { ModoRestauracao } from '../../../dados/backup';
import {
  exportarBackup,
  exportarCsv,
  exportarPdf,
  lerBackup,
  restaurando,
  restaurar,
  type BackupLido,
} from '../../../app/dados';
import { mostrarAviso, treinoAberto } from '../../../app/estado';
import { navegar } from '../../../app/roteador';
import { Botao, Cartao } from '../../componentes/basicos';
import { Folha } from '../../componentes/Folha';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

const mensagem = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function CartaoExportar() {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const executar = async (qual: string, acao: () => Promise<void>) => {
    setOcupado(qual);
    try {
      await acao();
    } catch (e) {
      console.error(e);
      mostrarAviso(`Não foi possível exportar: ${mensagem(e)}`);
    } finally {
      setOcupado(null);
    }
  };
  return (
    <Cartao titulo="Exportar">
      <div class="pilha pilha-justa">
        <Botao
          variante="secundario"
          bloco
          disabled={!!ocupado}
          onClick={() => void executar('pdf', exportarPdf)}
        >
          {ocupado === 'pdf' ? 'Gerando PDF…' : 'Histórico em PDF'}
        </Botao>
        <Botao
          variante="secundario"
          bloco
          disabled={!!ocupado}
          onClick={() => void executar('csv', exportarCsv)}
        >
          Planilha CSV
        </Botao>
        <Botao bloco disabled={!!ocupado} onClick={() => void executar('backup', exportarBackup)}>
          Backup completo (.json)
        </Botao>
      </div>
      <p class="muted pequeno">
        O backup guarda tudo: planos, treinos, cardio e ajustes. Guarde o arquivo fora do celular (e-mail,
        Drive) para trocar de aparelho ou recuperar os dados.
      </p>
    </Cartao>
  );
}

const hora = (iso: string) => `${dataBR(iso.slice(0, 10))} às ${iso.slice(11, 16)}`;

function FolhaRestaurar({ lido, aoFechar }: { lido: BackupLido; aoFechar: () => void }) {
  const [etapa, setEtapa] = useState<'escolher' | ModoRestauracao>('escolher');
  const [erro, setErro] = useState<string | null>(null);
  const { resumo: r, perdas } = lido;
  const perdeAlgo = perdas.treinos + perdas.cardio > 0;

  const confirmar = async (modo: ModoRestauracao) => {
    setErro(null);
    try {
      const a = await restaurar(lido.backup, modo);
      aoFechar();
      mostrarAviso(
        modo === 'substituir'
          ? 'Backup restaurado.'
          : `Dados mesclados: ${plural(a.treinos, 'treino novo', 'treinos novos')}, ${plural(a.cardio, 'cardio novo', 'cardios novos')}.`,
      );
      navegar('treino');
    } catch (e) {
      console.error(e);
      setErro(mensagem(e));
    }
  };

  return (
    <Folha titulo="Restaurar backup" aoFechar={aoFechar}>
      <p class="arquivo-nome">{lido.nomeArquivo}</p>
      <ul class="lista-simples pequeno" aria-label="Conteúdo do backup">
        <li>Feito em {hora(r.exportadoEm)}</li>
        {r.planoAtivo && <li>Plano ativo: {r.planoAtivo}</li>}
        <li>
          {plural(r.treinos, 'treino', 'treinos')} ({plural(r.series, 'série', 'séries')}) ·{' '}
          {plural(r.cardio, 'cardio', 'cardios')} · {plural(r.planos, 'plano', 'planos')}
        </li>
        {r.periodo && (
          <li>
            De {dataBR(r.periodo.de)} a {dataBR(r.periodo.ate)}
          </li>
        )}
      </ul>

      {treinoAberto.value ? (
        <p class="erro-texto">
          Há um treino em andamento. Conclua ou descarte o treino antes de restaurar um backup.
        </p>
      ) : etapa === 'escolher' ? (
        <div class="pilha">
          <Botao variante="secundario" bloco onClick={() => setEtapa('mesclar')}>
            Mesclar com os dados deste celular
          </Botao>
          <Botao variante="perigo" bloco onClick={() => setEtapa('substituir')}>
            Substituir tudo
          </Botao>
        </div>
      ) : etapa === 'mesclar' ? (
        <>
          <p>
            Acrescenta o que está no backup e falta neste celular. Nada daqui é apagado nem alterado; itens
            excluídos aqui depois do backup voltam.
          </p>
          <div class="pilha">
            <Botao bloco disabled={restaurando.value} onClick={() => void confirmar('mesclar')}>
              Mesclar dados
            </Botao>
            <Botao variante="texto" bloco onClick={() => setEtapa('escolher')}>
              Voltar
            </Botao>
          </div>
        </>
      ) : (
        <>
          <p>Apaga os dados deste celular e deixa tudo igual ao backup.</p>
          {perdeAlgo ? (
            <p class="erro-texto">
              {plural(perdas.treinos, 'treino', 'treinos')} e {plural(perdas.cardio, 'cardio', 'cardios')}{' '}
              deste celular não estão no backup e serão perdidos. Se quiser guardá-los, faça um backup antes
              ou escolha Mesclar.
            </p>
          ) : (
            <p class="muted pequeno">Tudo o que está neste celular também está no backup.</p>
          )}
          <div class="pilha">
            <Botao
              variante="perigo"
              bloco
              disabled={restaurando.value}
              onClick={() => void confirmar('substituir')}
            >
              Apagar e substituir tudo
            </Botao>
            <Botao variante="texto" bloco onClick={() => setEtapa('escolher')}>
              Voltar
            </Botao>
          </div>
        </>
      )}
      {erro && <p class="erro-texto">{erro}</p>}
    </Folha>
  );
}

export function CartaoRestaurar({ titulo = 'Restaurar backup' }: { titulo?: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [lido, setLido] = useState<BackupLido | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const escolher = async (e: Event) => {
    const el = e.currentTarget as HTMLInputElement;
    const f = el.files?.[0];
    el.value = '';
    if (!f) return;
    setErro(null);
    try {
      setLido(await lerBackup(f));
    } catch (err) {
      setErro(mensagem(err));
    }
  };

  return (
    <Cartao titulo={titulo} class={erro ? 'cartao-erro' : ''}>
      <p class="muted pequeno">
        Escolha um arquivo treino-backup-….json. Antes de gravar, o app mostra o que tem nele.
      </p>
      <Botao variante="secundario" bloco onClick={() => entrada.current?.click()}>
        Escolher arquivo de backup
      </Botao>
      <input
        ref={entrada}
        type="file"
        accept=".json,application/json"
        class="oculto"
        aria-label="Arquivo de backup"
        onChange={(e) => void escolher(e)}
      />
      {erro && <p>{erro}</p>}
      {lido && <FolhaRestaurar lido={lido} aoFechar={() => setLido(null)} />}
    </Cartao>
  );
}
