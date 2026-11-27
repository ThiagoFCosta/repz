-- Repz v2 · marco V2 (sincronização): campos da v1 que precisam ir para o servidor (docs/v2/DECISOES.md, D51).
-- treinos.ultima_atividade: o `atualizadoEm` da v1 (última atividade do treino, D13), que não é o atualizado_em
--   do last-write-wins.
-- series.sugestao_kg / sugestao_aceita: o que a v1 já grava por série; o log completo de sugestões é do V4 (D39).
alter table public.treinos add column ultima_atividade timestamptz null;
alter table public.series add column sugestao_kg numeric(6, 2) null;
alter table public.series add column sugestao_aceita boolean null;
