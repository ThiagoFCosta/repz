// Check-in de prontidão do dia (BRIEFING-v2 7.3): grava e expõe a prontidão de hoje para o motor (V4).

import { avaliarProntidao, sonoSugerido, type Prontidao } from '../dominio/prontidao/prontidao';
import { salvarCheckin } from '../dados/repos/checkins';
import type { CheckinLocal } from '../dados/tipos';
import { checkins, db, hoje } from './estado';
import { computed } from './sinal';

export const checkinHoje = computed(() => checkins.value.find((c) => c.data === hoje.value) ?? null);

export const prontidaoHoje = computed<Prontidao>(() =>
  avaliarProntidao(checkinHoje.value, checkins.value, hoje.value),
);

export const sonoInicial = computed(
  () => checkinHoje.value?.sonoHoras ?? sonoSugerido(checkins.value, hoje.value),
);

export async function registrarCheckin(
  dados: Pick<CheckinLocal, 'sonoHoras' | 'disposicao' | 'pulado'>,
): Promise<void> {
  const c: CheckinLocal = { data: hoje.value, origem: 'manual', ...dados };
  await salvarCheckin(db, c);
  checkins.value = [c, ...checkins.value.filter((x) => x.data !== c.data)];
}
