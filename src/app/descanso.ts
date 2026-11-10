// Cronômetro de descanso (ARCHITECTURE 8). A fonte da verdade é o timestamp de fim (`fimEm`),
// persistido no estado do treino; este módulo só agenda o aviso: bipe no relógio do AudioContext
// (funciona mesmo com os timers de JS estrangulados) e vibração quando o timer de JS dispara.

export interface OpcoesAviso {
  som: boolean;
  vibrar: boolean;
}

const BIPES = [0, 0.25, 0.5]; // três bipes curtos, em segundos a partir do fim
const DURACAO_BIPE = 0.15;
const FREQUENCIA = 880;
const PADRAO_VIBRACAO = [200, 100, 200];
const ATRASO_MAX_VIBRAR_MS = 3000; // voltar ao app muito depois do fim não vibra

let ctx: AudioContext | null = null;
let agendados: OscillatorNode[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let fimAtual: number | null = null;
let aoTerminar: (() => void) | null = null;
let vibrarNoFim = true;

// Cria ou retoma o AudioContext. Precisa vir de um gesto do usuário (toque em "Concluir série").
export function prepararAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null; // sem Web Audio: fica só a vibração
  }
}

function agendarBipes(fimEm: number): void {
  if (!ctx) return;
  const inicio = ctx.currentTime + Math.max(0, (fimEm - Date.now()) / 1000);
  for (const atraso of BIPES) {
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    const t = inicio + atraso;
    osc.frequency.value = FREQUENCIA;
    ganho.gain.setValueAtTime(0.0001, t);
    ganho.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + DURACAO_BIPE);
    osc.connect(ganho).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + DURACAO_BIPE + 0.02);
    agendados.push(osc);
  }
}

function pararBipes(): void {
  for (const osc of agendados) {
    try {
      osc.stop(0); // parar antes do início: o bipe nunca toca
      osc.disconnect();
    } catch {
      // já tocou
    }
  }
  agendados = [];
}

function disparar(): void {
  const fim = fimAtual;
  const cb = aoTerminar;
  // os bipes já agendados tocam sozinhos: só esquece o descanso
  clearTimeout(timer);
  agendados = [];
  fimAtual = null;
  aoTerminar = null;
  if (fim == null) return;
  if (vibrarNoFim && Date.now() - fim < ATRASO_MAX_VIBRAR_MS) navigator.vibrate?.(PADRAO_VIBRACAO);
  cb?.();
}

/** Agenda o aviso do fim do descanso. Reagendar (±15 s) substitui o anterior. */
export function agendarDescanso(fimEm: number, opcoes: OpcoesAviso, terminar: () => void): void {
  cancelarDescanso();
  fimAtual = fimEm;
  aoTerminar = terminar;
  vibrarNoFim = opcoes.vibrar;
  if (opcoes.som) agendarBipes(fimEm);
  timer = setTimeout(disparar, Math.max(0, fimEm - Date.now()));
}

export function cancelarDescanso(): void {
  clearTimeout(timer);
  pararBipes();
  fimAtual = null;
  aoTerminar = null;
}

// Ao voltar ao app (tela desbloqueada): o timer de JS pode ter sido congelado em segundo plano
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && fimAtual != null && Date.now() >= fimAtual) disparar();
  });
}
