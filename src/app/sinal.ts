// Sinais mínimos para o React (docs/v2/DECISOES.md, D34): substituem o @preact/signals da v1 com a mesma API
// (`signal`, `computed`, `.value`). Toda escrita incrementa uma versão global; a raiz do app assina essa versão
// com useSyncExternalStore e redesenha. O app é pequeno, então redesenhar a partir da raiz custa pouco, e o
// controlador do treino e as telas da v1 continuam iguais.

import { useSyncExternalStore } from 'react';

let versao = 0;
const inscritos = new Set<() => void>();

function avisar(): void {
  versao++;
  for (const f of inscritos) f();
}

export interface Signal<T> {
  value: T;
  peek(): T;
}

export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
}

export function signal<T>(inicial: T): Signal<T> {
  let atual = inicial;
  return {
    get value() {
      return atual;
    },
    set value(novo: T) {
      if (Object.is(novo, atual)) return;
      atual = novo;
      avisar();
    },
    peek: () => atual,
  };
}

// Recalcula só quando algum sinal mudou desde a última leitura
export function computed<T>(calcular: () => T): ReadonlySignal<T> {
  let lidoEm = -1;
  let cache: T;
  const ler = () => {
    if (lidoEm !== versao) {
      cache = calcular();
      lidoEm = versao;
    }
    return cache;
  };
  return {
    get value() {
      return ler();
    },
    peek: ler,
  };
}

export function inscrever(f: () => void): () => void {
  inscritos.add(f);
  return () => inscritos.delete(f);
}

// Usado na raiz: qualquer sinal alterado redesenha a árvore
export function useSinais(): number {
  return useSyncExternalStore(inscrever, () => versao);
}
