# ARCHITECTURE — App de Treino (PWA offline)

> Fase 0. Refina as seções 8, 11, 13 e 14 do `BRIEFING.md`. Onde este documento diverge do briefing, a divergência está marcada com **[decisão]** e listada na seção 12 para aprovação.

---

## 1. Visão geral

App 100% estático, sem backend. Tudo roda no celular:

```
 PDF / texto colado
        │
   pdf/ (pdf.js, sob demanda)  ──►  texto
        │
   dominio/formato (parser)    ──►  Plano (puro, validado)
        │
   dados/ (Dexie / IndexedDB)  ◄──► app/ (estado, controlador do treino, timers)
        │                                │
   dominio/* (periodização, motor de carga, rotação, histórico) — funções puras
                                         │
                                       ui/ (Preact)
```

Regra de dependência (verificada por lint, `import/no-restricted-paths`):

| Camada | Pode importar | Não pode importar |
|---|---|---|
| `dominio/` | só `dominio/` | `dados/`, `pdf/`, `app/`, `ui/`, Dexie, Preact, `window`, `Date.now()` implícito |
| `pdf/` | `pdfjs-dist` | o resto |
| `dados/` | `dominio/`, Dexie | `app/`, `ui/` |
| `app/` | `dominio/`, `dados/`, `pdf/` | `ui/` |
| `ui/` | todas acima | — |

`dominio/` não lê o relógio: recebe `hoje`/`agora` por parâmetro. Isso torna todos os cenários com data (pausa de 25 dias, semana do bloco) testáveis sem mock.

---

## 2. Stack final

| Camada | Escolha | Justificativa |
|---|---|---|
| Build | **Vite 6** | rápido, `base` configurável para GitHub Pages, ótimo suporte a chunks sob demanda (pdf.js, jsPDF) |
| Linguagem | **TypeScript `strict`** + `noUncheckedIndexedAccess` | regras críticas (motor, parser) com tipos; índice de array pode ser `undefined` e o compilador obriga a tratar |
| UI | **Preact 10** + **@preact/signals** | ~4 KB + ~2 KB gzip; API de React conhecida; signals evitam boilerplate de store e re-render desnecessário durante o cronômetro |
| Roteamento | **hash router próprio** (~60 linhas) | GitHub Pages não faz fallback de SPA; `#/treino`, `#/historico`, `#/plano` funcionam sem 404 e sem lib |
| Persistência | **Dexie 4** | migrações versionadas, índices compostos, transações; ~25 KB gzip |
| PDF (leitura) | **pdfjs-dist 4.10.x**, worker local via `?url`, carregado com `import()` só na tela de importação | já validado na referência (4.10.38); fora do bundle inicial (requisito de 200 KB). build moderno (os dois usam Android com Chrome atualizado) |
| PDF (exportação) | **jsPDF**, `import()` sob demanda | ver seção 9.3 (PDF confirmado na v1) |
| PWA | **vite-plugin-pwa** (`generateSW`, `registerType: 'prompt'`) | precache completo e prompt de atualização controlado pelo app |
| Gráfico | **SVG próprio** (linha + marcadores de deload) | um único tipo de gráfico; ~150 linhas; zero dependência |
| Fonte | **Inter variável, subset latin**, woff2 em `src/estilo/fontes/` | auto-hospedada, precacheada; `font-variant-numeric: tabular-nums` |
| Datas | utilitários próprios (`dominio/datas.ts`) | só precisamos de data local `AAAA-MM-DD`, diferença em dias e segunda-feira seguinte; lib de datas seria peso morto |
| Testes unitários | **Vitest** + **fake-indexeddb** | domínio, migrações, backup, CSV, extração de PDF (pdf.js no Node) |
| Testes E2E | **Playwright** (Chromium, viewport 390×844: os dois usam Android) | fluxos da seção 15 com modo offline real (`context.setOffline`) |
| Lint/format | ESLint (flat config, `typescript-eslint`, regras de import) + Prettier | — |
| CI/CD | GitHub Actions: lint → typecheck → unit → build → E2E → deploy Pages | gratuito; deploy só na `main` com tudo verde |

Orçamento de bundle inicial (gzip, sem pdf.js e jsPDF): Preact+signals ~7 KB, Dexie ~25 KB, app ~40-60 KB → **~100 KB**, metade do limite. Um teste de CI (`size-limit` ou script próprio) falha se passar de 200 KB.

---

## 3. Estrutura de pastas

O projeto fica na raiz `App_Treino/`. No M0 o conteúdo do kit é reorganizado (o `.zip` fica fora do git):

```
App_Treino/
  BRIEFING.md
  README.md
  docs/
    ARCHITECTURE.md · PLAN.md
    contrato-treino-v1.txt            # movido do kit
    Proposta - App de Treino.pdf      # movido do kit
  referencia/                         # kit original, intocado; fora do build e do lint
  public/
    icones/  (192, 512, maskable, apple-touch-icon)
  src/
    main.tsx                          # bootstrap: abre DB, migra, persist(), registra SW, monta UI
    dominio/                          # PURO. 100% coberto por testes
      tipos.ts                        # Faixa, Fase, Plano (domínio), Prescricao…
      datas.ts                        # hojeLocal(agora), diasEntre, proximaSegunda, semanaISO
      numeros.ts                      # formatarKg('82,5'), lerDecimal('82,5' → 82.5), arredondamentos
      formato/
        normalizar.ts                 # normalizar, semAcento, chaveExercicio
        parser.ts                     # parse(texto) → { plano, rascunho, erros, avisos }
      periodizacao/
        semana.ts                     # semanaDoBloco(plano, hoje) → { semana, fase, concluido }
        prescricao.ts                 # prescricao(plano, ex, semana, focoOverride)
      progressao/
        config.ts                     # CONFIG_PROGRESSAO (nomes da seção 7.3)
        e1rm.ts                       # e1rm, cargaPara, incrementoPadrao
        motor.ts                      # sugerir(historico, presc, opts) → Sugestao
      rotacao.ts                      # proximaSessao(plano, treinosConcluidos)
      treino/
        maquina.ts                    # reducer puro da sessão de treino (seção 7)
        biset.ts                      # rodadas e próximo do grupo
        estimativa.ts                 # duração estimada da sessão
        resumo.ts                     # volume, recordes, treino atual no histórico, ícone do cartão
      historico.ts                    # e1RM por semana, KPIs, melhor série
      cardio.ts                       # meta semanal, dentro/fora da faixa
      similaridade.ts                 # Jaro-Winkler para sugerir vínculo de chaves
    pdf/
      extrair.ts                      # textoDoPdf(bytes) — faz import() do pdf.js e do worker
    dados/
      db.ts                           # Dexie: schema v1, migrações, abrirDb()
      migracoes/                      # uma função por versão + fixture JSON da versão anterior
      repos/
        planos.ts · treinos.ts · series.ts · cardio.ts · config.ts · meta.ts
      historico-repo.ts               # histórico por chave (resolvendo apelidos) → entrada do motor
      backup.ts                       # exportar / validar / restaurar (substituir | mesclar)
      csv.ts                          # séries e cardio (BOM, ';', vírgula)
      pdf-export.ts                   # jsPDF sob demanda
      compartilhar.ts                 # Web Share com arquivos → fallback download
    app/
      estado.ts                       # signals globais: planoAtivo, treinoAberto, preferencias, rota
      roteador.ts                     # hash router
      controlador-treino.ts           # liga maquina.ts ↔ Dexie (transação por evento)
      descanso.ts                     # cronômetro por timestamp, som (Web Audio), vibração
      wake-lock.ts                    # Screen Wake Lock com re-aquisição em visibilitychange
      pwa.ts                          # update prompt, storage.persist(), detecção de instalação
    ui/
      componentes/                    # Botao, Cartao, Chip, CampoNumero, Pilula, Acordeao, Folha (bottom sheet), Grafico…
      telas/
        boas-vindas/                  # onboarding de instalação (Android/iOS)
        inicio/  importar/  revisar/  registro/  descanso/  fim/
        cardio/  historico/  treinos/  plano-dados/
      layout/                         # AppShell com as 3 abas
    estilo/
      tokens.css · base.css · fontes/
  tests/
    unit/          # espelha src/dominio
    dados/         # Dexie com fake-indexeddb: migrações, repos, backup, CSV
    pdf/           # extração com os PDFs das fixtures (pdf.js no Node)
    e2e/           # Playwright
    fixtures/      # cópia de app-treino-kit/fixtures + JSON de backups por versão de schema
  .github/workflows/ci.yml
```

---

## 4. Módulos e responsabilidades

### 4.1 `dominio/formato` — parser TREINO v1
Porte 1:1 de `referencia/parser/parser.js`, tipado. Mantém as mesmas mensagens de erro (os testes comparam o texto). Saída:

```ts
interface ResultadoParse {
  plano: PlanoImportado | null;      // null se houver erro
  rascunho: PlanoImportado;          // sempre presente, para a tela mostrar o que foi lido
  erros: Mensagem[]; avisos: Mensagem[];
  textoBloco: string;                // bloco bruto entre os marcadores (vai para Plano.textoOriginal)
}
interface Mensagem { linha: number; msg: string; texto?: string }   // linha 0 = global
```
Correções em relação à referência (comportamento observável igual nos casos testados):
- `normalizar` com as faixas Unicode escritas por escape (`‐-―−`, `  -​`), não por caractere literal.
- `PlanoImportado` não tem ids; ids são gerados na hora de salvar (`dados/`).

### 4.2 `dominio/periodizacao`
- `semanaDoBloco(plano, hoje)` → `{ semana: number | null, fase: Fase | null, concluido: boolean, antesDoInicio: boolean }`. Fórmula da seção 6.1. Ver **[decisão D1]** sobre o que acontece depois da última semana.
- `prescricao(plano, ex, semana, foco)` → porte de `prescricao()`; `foco` é o valor efetivo (config do usuário ?? plano).

### 4.3 `dominio/progressao` — motor de carga
Porte de `progressao.js`. Diferenças:
- `hoje` é **obrigatório** (a referência usa `toISOString()`, que dá a data UTC: depois das 21 h em Brasília o "hoje" vira o dia seguinte).
- Retorno tipado:
```ts
type Acao = 'aumentar' | 'manter' | 'reduzir' | 'calibrar';
interface Sugestao { acao: Acao; carga: number | null; anterior?: number; variacao?: number;
                     motivo: string; alertas: string[]; e1rm?: number;
                     repsSugeridas: number[] | null }   // seção 7.6: reps da última vez, ou mín. da faixa se subiu
```
- `repsSugeridas` é novo (a referência não calcula), derivado da regra 7.6.

### 4.4 `dominio/rotacao`
`proximaSessao(plano, ultimoTreinoConcluido)` → próxima na ordem (circular); sem histórico, a primeira. Considera só treinos `concluido` do **mesmo plano**.

### 4.5 `dominio/treino` — máquina de estados (seção 7)

### 4.6 `dominio/historico`
- Agrupa séries (sem aquecimento) por treino → entrada do motor.
- `e1rmPorSemana(series, plano)` → pontos `{ semanaISO, e1rm, deload }` para o gráfico.
- KPIs: e1RM atual, variação em 8 semanas, melhor série.
- Recordes do treino (seção 9.6): melhor e1RM ou melhor `kg × reps` da variante, comparado com todo o histórico anterior.

### 4.7 `dados/`
Repositórios finos sobre Dexie. Toda escrita que muda o treino em andamento roda **numa transação** com a atualização de `Treino.estadoUI` (seção 7.4). `historico-repo.ts` resolve apelidos (seção 5.3) e devolve o histórico na forma que o motor espera.

### 4.8 `app/`
- `controlador-treino.ts`: recebe eventos da UI, aplica o reducer, persiste, dispara efeitos (iniciar descanso, som, vibração, wake lock). A UI nunca escreve no banco durante o treino sem passar por ele.
- `descanso.ts`: ver seção 8.
- `pwa.ts`: ver seção 9.

### 4.9 `ui/`
Componentes próprios, sem lib de UI. Telas seguem as páginas 5-7 da proposta. Cada tela lê signals e chama funções de `app/`.

---

## 5. Modelo de dados

### 5.1 Tipos persistidos (refinam a seção 8 do briefing)

```ts
type ISODate = string;      // 'AAAA-MM-DD', data local do aparelho
type ISODateTime = string;  // ISO 8601 com offset local, ex. '2026-11-09T19:42:10-03:00'

interface Plano {
  id: string;                         // uuid
  nome: string; autor: string; dataPlano: ISODate | null;
  importadoEm: ISODateTime;
  // [decisão D2] sem campo `ativo`: o plano ativo é meta.planoAtivoId
  inicioBloco: ISODate | null;
  ajusteSemana: number;
  progressao: { tipo: string; rir: Faixa; carga: Faixa; estagnado: number };
  bloco: { semanas: number; fases: Fase[] } | null;
  sessoes: SessaoTemplate[];
  cardio: CardioPrescrito[];
  textoOriginal: string;
  arquivoNome: string | null;
  avisosImportacao: Mensagem[];       // novo: para reexibir depois
}
// Faixa, Fase, SessaoTemplate, ExercicioPrescrito, CardioPrescrito: como no briefing.
// ExercicioPrescrito.id e SessaoTemplate.id: uuid gerado ao salvar.

interface Treino {
  id: string; planoId: string; sessaoId: string; sessaoNome: string;
  data: ISODate; inicio: ISODateTime; fim: ISODateTime | null;
  semanaBloco: number | null;
  status: 'em_andamento' | 'concluido' | 'descartado';
  estadoUI: EstadoTreinoPersistido | null;   // tipado (seção 7), não `unknown`
  notas: Record<string /*exercicioPrescritoId*/, string>;   // novo: "nota no exercício" (9.4)
  atualizadoEm: ISODateTime;                 // novo: detectar treino aberto > 4 h
}

interface SerieRealizada {
  id: string; treinoId: string; exercicioPrescritoId: string;
  chave: string; variante: string;   // chave e nome da variante feita (como gravada; apelidos resolvidos na leitura)
  ordem: number;                     // nº da série dentro do exercício neste treino
  kg: number; reps: number;          // reps = segundos quando o exercício é por tempo
  rir: number | null;                // 4 = "4+"
  aquecimento: boolean;
  feitaEm: ISODateTime;
  sugestaoKg: number | null;
  sugestaoAceita: boolean | null;    // novo: kg === sugestaoKg no momento do registro (7.6)
}

interface CardioRealizado { id; data; tipo; minutos; fcMedia; distanciaKm; esforco; feitoEm }  // como no briefing

interface ConfigExercicio {
  chave: string;
  incrementoKg: number | null;       // null = padrão (halter 2, senão 2,5)
  foco: boolean | null;              // null = o que veio do plano
  apelidoDe: string | null;          // esta chave é a mesma que outra (vínculo entre planos)
}

interface Preferencias {
  somDescanso: boolean; vibrar: boolean; manterTelaLigada: boolean;
  ultimoBackup: ISODateTime | null;
  nomeExibicao: string | null;       // pendente da Q3
}
```

### 5.2 Stores (Dexie, schema v1)

| Store | Chave primária | Índices | Observação |
|---|---|---|---|
| `planos` | `id` | `importadoEm` | |
| `treinos` | `id` | `data`, `status`, `[planoId+status]` | `status` indexado para achar o treino aberto rápido |
| `series` | `id` | `treinoId`, `[chave+feitaEm]` | histórico por variante em ordem cronológica |
| `cardio` | `id` | `data` | |
| `configExercicios` | `chave` | `apelidoDe` | |
| `meta` | `chave` | — | chave-valor: `planoAtivoId`, `preferencias`, `instaladoAvisado`, `persistencia` |

**[decisão D2]** `Plano.ativo: boolean` sai do modelo: IndexedDB não indexa booleanos e dois planos com `ativo: true` seriam um estado inválido possível. Um único `meta.planoAtivoId` garante "só um ativo" por construção.

### 5.3 Identidade e apelidos
- O histórico é sempre consultado por **chave canônica**: `canonica(k)` segue `apelidoDe` até a raiz (com proteção contra ciclo).
- Consulta de histórico de `k`: todas as chaves cuja canônica é igual à de `k` → `series.where('[chave+feitaEm]')` para cada uma → merge ordenado.
- Vincular/desvincular só muda `ConfigExercicio`; nenhuma série é reescrita. O vínculo é reversível.
- Na revisão de um plano novo: para cada chave sem histórico, Jaro-Winkler (sobre a chave normalizada) contra as chaves com histórico; candidatos ≥ 0,85 são sugeridos, o usuário confirma.
- Nota: a chave é por variante, não por sessão. "Elevação lateral" do Push (12-20) e do Upper (15-20) compartilham histórico; o motor usa a prescrição **da sessão atual**. É o comportamento desejado (mesmo exercício), mas fica registrado.

### 5.4 Migrações
- `db.version(n).stores(...).upgrade(fn)` do Dexie, uma função por versão em `dados/migracoes/vN.ts`.
- O backup carrega `versaoSchema`; a restauração aplica as mesmas funções de migração sobre o JSON antes de gravar (`migrarBackup(json)` puro, testável sem IndexedDB).
- Para cada versão nova, um fixture `tests/fixtures/backup-vN.json` e um teste "vN → atual".

---

## 6. Fluxos de dados principais

**Importar:** arquivo → `pdf/extrair` (lazy) → texto → `parse` → tela mostra checklist/erros → (sem erros) revisão → `salvarPlano()` em transação: grava `Plano`, define `meta.planoAtivoId`, cria `ConfigExercicio` dos vínculos. Bloqueado se houver treino `em_andamento` (seção 9.2).

**Abrir o app:** `abrirDb()` (migra) → carrega `planoAtivoId`, preferências e treino `em_andamento` → se aberto há > 4 h (por `atualizadoEm`), pergunta se encerra → rota inicial.

**Pré-preenchimento de uma série:** `historicoRepo(chaveVariante)` → `prescricao(plano, ex, semanaAtual)` → `sugerir(hist, presc, {hoje, incremento})` → kg e reps no formulário. A sugestão é **recalculada no momento do treino** com a prescrição daquele dia (a fase pode ter mudado desde o fim do treino anterior). O cartão "Para o próximo treino" no fim usa a prescrição da semana atual, que é a melhor estimativa naquele momento.

---

## 7. Máquina de estados do treino

### 7.1 Estado

```ts
type Etapa =
  | { tipo: 'ocioso' }
  | { tipo: 'registrando'; item: number }                       // item = índice em sessao.itens
  | { tipo: 'descanso'; fimEm: number /*epoch ms*/; duracao: number; proximo: number | null }
  | { tipo: 'resumo' };

interface EstadoTreino {
  etapa: Etapa;
  variante: Record<number, number>;     // item → índice da variante escolhida (padrão: última usada)
  feitas: Record<number, number>;       // item → séries de trabalho concluídas
  extras: Record<number, number>;       // item → séries adicionadas além da prescrição
  pulados: number[];
  alvo: Record<number, number>;         // item → séries prescritas na semana (congela no início)
}
```
Implementado com listas por item e os campos `versao`, `semana` e `itens` (ver D10, D11). O estado "Exercicio(i): escolherVariante" do briefing vira **parte de `registrando`**: a variante já vem escolhida (última usada) e os chips só trocam. Exercício com variantes **sem histórico em nenhuma** exige escolha antes do primeiro "Concluir" (o botão fica desabilitado com o texto "Escolha a variante"). Isso preserva a meta de 2 toques.

### 7.2 Eventos e transições

| Evento | De | Para |
|---|---|---|
| `INICIAR(sessao, semana)` | ocioso | registrando(primeiro item) |
| `ESCOLHER_VARIANTE(i, v)` | registrando | igual (recalcula sugestão) |
| `CONCLUIR_SERIE(dados)` | registrando(i) | se bi-set e há próximo do grupo nesta rodada → registrando(próximo); senão, se ainda há séries no item/grupo ou próximo item → descanso(fim = agora + descanso, proximo); senão → resumo |
| `AQUECIMENTO(dados)` | registrando(i) | igual (série gravada com `aquecimento: true`, não conta em `feitas`, sem descanso) |
| `FIM_DESCANSO` / `PULAR_DESCANSO` | descanso | registrando(proximo) ou resumo |
| `AJUSTAR_DESCANSO(±15)` | descanso | descanso(fimEm ± 15 s, mínimo agora) |
| `PULAR_EXERCICIO(i)` | qualquer ativo | registrando(próximo não concluído) ou resumo |
| `IR_PARA(j)` | qualquer ativo | registrando(j) (cancela descanso) |
| `ADICIONAR_SERIE(i)` | qualquer ativo | igual, `extras[i]++` |
| `EDITAR_SERIE(id, dados)` | qualquer | igual (só atualiza a série) |
| `FINALIZAR` | qualquer ativo | resumo (botão "Encerrar treino" no menu) |
| `FECHAR` | resumo | ocioso; `status = concluido`, `fim = agora` |
| `DESCARTAR` (com confirmação) | qualquer | ocioso; `status = descartado` (séries mantidas no banco, excluídas do histórico por `status`) |

"Próximo item" = o primeiro item após o atual que não está concluído nem pulado; se não houver, o primeiro item anterior ainda pendente (para quando o usuário usou `IR_PARA`); se não houver nenhum, resumo.

### 7.3 Bi-sets (`biset.ts`)
- Grupo = itens da sessão com o mesmo `grupo`. Séries alvo de cada um podem diferir.
- Rodada `k` de um grupo = itens com `alvo + extras ≥ k`, na ordem do plano.
- Após concluir o item `x` na rodada `k`: próximo = o seguinte do grupo, depois de `x`, com `alvo+extras ≥ k` e `feitas == k − 1`. Se não houver: fim da rodada → descanso do grupo → rodada `k+1` começando pelo primeiro item com `alvo+extras ≥ k+1`. Grupo acabou → próximo item fora do grupo.
- Teste obrigatório: elevação 4 + tríceps 3 → rodadas 1-3 alternam; rodada 4 só elevação; 4 descansos no total (um por rodada).

### 7.4 Persistência
- Cada evento que muda estado roda `db.transaction('rw', [treinos, series], …)`: grava/edita a série **e** `treino.estadoUI` + `atualizadoEm`. Ou entra tudo, ou nada.
- O reducer é puro (`(estado, evento, agora) → { estado, efeitos }`); efeitos (`gravarSerie`, `iniciarDescanso`, `tocarSom`) são executados pelo controlador. Isso deixa a máquina testável sem banco e sem timers.
- Retomar: ao abrir, `estadoUI` é carregado; se a etapa é `descanso` e `fimEm` já passou, vai direto para `registrando(proximo)`.

---

## 8. Cronômetro de descanso

- Fonte da verdade: `fimEm` (epoch ms) persistido. A tela recalcula `restante = fimEm − Date.now()` num `setInterval` de 250 ms só para desenhar, e de novo em `visibilitychange`.
- Duração padrão: máximo da faixa de descanso (pendente Q4). Bi-set: descanso do grupo, só no fim da rodada.
- **Som:** `AudioContext` criado/retomado no toque de "Concluir série" (gesto do usuário, exigido pelo iOS). O bipe é **agendado no próprio relógio de áudio** (`osc.start(ctx.currentTime + restante)`), o que funciona mesmo se o navegador estrangular os timers de JS com a tela ligada. Recalculado ao ajustar ±15 s ou pular.
- **Vibração:** `navigator.vibrate([200,100,200])` quando o timer de JS dispara, se a API existir (Android). No iOS não existe.
- **Wake Lock:** adquirido ao iniciar o treino (se `manterTelaLigada`), liberado no resumo; re-adquirido em `visibilitychange` (o sistema libera ao sair do app).
- **Limitação documentada (README + texto na tela de descanso no iOS):** com a tela bloqueada, o iOS suspende o app; não há vibração nem som. Ao voltar, o tempo exibido está certo (timestamp). No Android, vibração com tela bloqueada também não é garantida em PWA. Com a tela ligada (Wake Lock), som e vibração funcionam.

---

## 9. Estratégia offline / PWA

### 9.1 Service worker
- `vite-plugin-pwa` com `generateSW`, `registerType: 'prompt'`, `injectRegister: false` (registro manual em `app/pwa.ts`).
- `globPatterns: ['**/*.{js,mjs,css,html,woff2,png,svg,webmanifest}']` — inclui o chunk do pdf.js, o `pdf.worker.min.mjs`, o chunk do jsPDF, fontes e ícones. `maximumFileSizeToCacheInBytes` ≈ 3 MB (o worker do pdf.js tem ~1,4 MB).
- `navigateFallback: 'index.html'`. **Sem `runtimeCaching`**: nada é buscado fora do precache.
- O pdf.js é precacheado mas só é **carregado** (parse/execução) na importação: fica fora do JS inicial, mas disponível offline desde a 1ª visita.

### 9.2 Atualização
- `onNeedRefresh` → signal `atualizacaoDisponivel`. Banner "Atualização disponível · Atualizar" aparece **só se não houver treino em andamento**; durante o treino fica pendente e aparece no resumo/Início.
- Nunca `skipWaiting` automático.

### 9.3 Exportação em PDF **[decisão D5; PDF confirmado na v1]**
Recomendo **jsPDF sob demanda** em vez de `window.print()`:
- `window.print()` em PWA instalado no iOS é inconsistente e não gera um arquivo para o menu de compartilhar; no Android abre o diálogo de impressão, não o de compartilhamento.
- jsPDF gera um `Blob` → Web Share (mesmo fluxo de CSV e backup). As fontes padrão (Helvetica/WinAnsi) cobrem os acentos do português, sem embutir Inter.
- Custo: ~100 KB gzip num chunk à parte, carregado só ao exportar (não conta no orçamento inicial), precacheado.

### 9.4 Persistência e instalação
- 1ª execução: `navigator.storage.persist()`; resultado em `meta.persistencia` e exibido em "Plano e dados" ("Armazenamento protegido: sim/não").
- Tela de boas-vindas se `display-mode` não for `standalone` (e `navigator.standalone` falso no iOS): instruções de instalação para Android e iOS; pode ser dispensada, volta como lembrete discreto.
- Lembrete de backup no Início se `ultimoBackup` > 30 dias (ou nunca, com ≥ 1 treino).

### 9.5 Privacidade
- Nenhum `fetch`/XHR no código. O script `scripts/verificar-dist.mjs` (CI, depois do build) varre `dist/**/*.{js,mjs,html,css,webmanifest}` por `https?://` e falha se achar algo fora de uma lista explícita de exceções inertes (ex.: `http://www.w3.org/2000/svg`, URLs em comentários de licença do pdf.js).
- E2E: com o app carregado, bloqueia toda rede (`context.route('**', abort)` para hosts ≠ origem) e registra qualquer tentativa; o teste falha se houver uma.
- `Content-Security-Policy` por `<meta>`: `default-src 'self'; connect-src 'self'; img-src 'self' data: blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'`.

---

## 10. Estratégia de testes

| Nível | Ferramenta | O que cobre | Meta |
|---|---|---|---|
| Domínio | Vitest | parser (todos os casos 5.6 + tolerâncias 5.3), prescrição (semanas 1/6/10/12 do Raul, Stiff RIR 3 fixo), semana do bloco (6.1, ajuste, antes do início, depois do fim), rotação, motor (16 cenários da 7.5, com motivo e alertas), bi-set com séries desiguais, máquina de estados (todas as transições), histórico/e1RM por semana, cardio, similaridade, `numeros` (vírgula ↔ ponto) | cobertura de linhas ≥ 95% em `dominio/`, imposta no CI |
| PDF | Vitest + pdfjs-dist (Node) | as 3 fixtures PDF: caso feliz (5/30/0 erros/2 avisos), estresse (linha rejuntada, acentos), sem anexo (erro) | — |
| Dados | Vitest + fake-indexeddb | migrações com fixture por versão, repositórios, apelidos, transação série+estadoUI, backup → restaurar (substituir e mesclar) → mesmo estado, CSV (BOM, `;`, vírgula, cabeçalho exato) | — |
| Privacidade | `scripts/verificar-dist.mjs` sobre `dist/` | nenhuma URL de terceiros | roda após o build no CI |
| E2E | Playwright, 390×844 | os 5 fluxos da seção 15; offline após a 1ª carga (`setOffline(true)` depois do SW ativo); fechar a aba no meio do treino e reabrir | Chromium (Android) |
| Bundle | script no CI | JS inicial ≤ 200 KB gzip, sem pdf.js/jsPDF | — |
| Manual | celular real | checklist por marco com UI (PLAN.md) | antes de fechar cada marco |

Os scripts da referência viram testes com asserções (não só `console.log`). As mensagens do motor e do parser são comparadas como texto, porque são a interface com o usuário.

---

## 11. Riscos e mitigações

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R1 | iOS apaga IndexedDB de site não instalado após ~7 dias sem uso | perda de dados | onboarding de instalação; `storage.persist()`; lembrete de backup a cada 30 dias; backup em 1 toque |
| R2 | Cronômetro sem som/vibração com tela bloqueada (iOS; PWA no Android) | descanso passa do tempo | Wake Lock por padrão; som agendado no relógio de áudio; tempo correto ao voltar; limitação explicada no app e no README |
| R3 | Wake Lock em PWA instalado no iOS só funciona a partir do iOS 18.4 | tela apaga durante o treino | detectar suporte; se faltar, dica "aumente o bloqueio automático durante o treino" |
| R4 | pdf.js recente exige navegador recente (APIs como `Promise.withResolvers`) | importação falha em iPhone antigo | fixar 4.10.x; os dois usam Android com Chrome atualizado; a entrada "Colar texto" é sempre o plano B |
| R5 | IA de cada usuário gera PDF com layout que quebra a extração (colunas, fonte não embutida, texto como imagem) | importação bloqueada | parser tolerante (5.3); mensagem específica para PDF sem texto; colar texto; testar cedo com o PDF do Thiago (Q6) |
| R6 | Perder séries se o app fechar no meio do treino | perda de dados | gravação por série em transação junto com `estadoUI`; E2E fecha a aba no meio |
| R7 | Atualização do SW no meio do treino quebra estado | perda de estado | `registerType: 'prompt'`; não atualiza com treino aberto; `estadoUI` versionado junto com o schema |
| R8 | Data "hoje" errada à noite (UTC vs local) | semana errada, pausa errada, sugestão errada | `dominio` recebe `hoje` local; teste com `agora` às 23:30 −03:00 |
| R9 | Mudança de schema sem migração | dados ilegíveis | migrações desde a v1, fixture por versão, teste no CI; backup carrega `versaoSchema` |
| R10 | Vincular exercícios errado mistura históricos | sugestão ruim | vínculo só por confirmação explícita e reversível (não reescreve séries) |
| R11 | Bundle cresce (lib de UI, gráficos, datas) | 1ª tela > 2 s | orçamento de 200 KB no CI; libs pesadas só sob demanda |
| R12 | GitHub Pages servindo de subcaminho quebra SW/manifest | app não instala | `base` do Vite = `/<repo>/`; `scope` e `start_url` relativos; E2E roda contra o build com o mesmo `base` |

---

## 12. Decisões tomadas aqui que precisam de aprovação

| # | Decisão | Motivo |
|---|---|---|
| **D1** | Depois da última semana do bloco: `concluido = true`, pílula mostra "Bloco concluído", e a prescrição usa a **última fase que não é deload** (no plano do Raul, a fase 9-11). | A seção 6.1 diz para limitar a semana a `[1, N]` **e** "continuar com a última fase, sem deload". Com o limite, a semana 12 é justamente o deload; as duas regras se contradizem. |
| **D2** | `Plano.ativo` vira `meta.planoAtivoId`. | Garante um único plano ativo por construção; booleanos não são indexáveis no IndexedDB. |
| **D3** | A escolha de variante não é um estado separado: vem pré-selecionada (última usada) e só bloqueia o "Concluir" se nunca houve histórico em nenhuma variante. | Meta de 2 toques por série. Equivale ao padrão "última usada" do briefing. |
| **D4** | RIR **não** vem pré-preenchido; dá para concluir sem RIR (o motor usa o ponto médio do alvo, como já previsto em 7.2). Toques no caso ideal: RIR + Concluir = 2. | Pré-preencher o RIR incentivaria registrar sem pensar, e ele é a entrada mais sensível do motor. |
| **D5** | PDF do histórico com jsPDF sob demanda (PDF confirmado na v1). | Ver 9.3. |
| **D6** | Treino descartado mantém as séries no banco, fora do histórico. | Prioridade "não perder dados"; dá para desfazer um descarte por engano numa versão futura. |
| **D7** | Datas pelo fuso **do aparelho**, não fixo em America/Sao_Paulo. | Os dois usam o celular no Brasil; fixar o fuso exigiria lib de fuso horário (peso) sem ganho. |
| **D8** | Campos novos no modelo: `Plano.avisosImportacao`, `Treino.notas`, `Treino.atualizadoEm`, `SerieRealizada.sugestaoAceita`, `Preferencias.nomeExibicao`, `Sugestao.repsSugeridas`. | Cada um atende a um requisito do briefing que não tinha campo (notas 9.4, treino > 4 h 9.6, sugestão aceita 7.6, saudação 9.3). |
| **D9** | Testes em `tests/` espelhando `src/` (como sugerido na seção 13), não ao lado do código. | Seguir a organização do briefing. |
| **D10** (M3) | `EstadoTreino` usa listas por item (`feitas[i]`, `extras[i]`, `alvo[i]`, `variante[i]`) em vez de `Record`, e guarda `versao`, `semana` e `itens` (grupo e descanso de cada item, congelados no início). `variante[i] = null` é "ainda não escolhida" (D3). | O estado persistido fica autossuficiente: o reducer não precisa do plano, e o treino retoma igual mesmo que a config mude no meio. `versao` prepara a migração do `estadoUI` (R7). |
| **D11** (M3) | A última série do treino vai direto ao resumo, sem descanso; `Etapa.descanso.proximo` é sempre um item. Novo evento `RETOMAR` (resumo → primeiro item pendente), com o botão "Voltar ao treino" no resumo. | Descansar antes do resumo não serve para nada; `RETOMAR` desfaz um "Encerrar treino" tocado por engano sem perder nada. |
| **D12** (M3) | Pré-preenchimento: na 1ª série vale a sugestão do motor; da 2ª em diante, a carga da série anterior **deste treino** (o usuário pode ter mudado) e as reps de `repsSugeridas` daquela série. `repsSugeridas` fica limitada à faixa da prescrição quando a ação não é aumentar (ex.: 5·4·4 vira 6·6·6 depois de reduzir). | Seção 7.6 sem ambiguidade para a série 2+; pré-preencher reps abaixo da faixa depois de uma redução sugeriria repetir o erro. |
| **D13** (M3) | Treino aberto há mais de 4 h (por `atualizadoEm`): "Encerrar treino" conclui com `fim = atualizadoEm` (última atividade); sem nenhuma série de trabalho, descarta. O resumo mede a duração até a última atividade. | Um treino esquecido aberto não deve inflar a duração nem entrar na rotação sem séries. |
| **D14** (M3) | `dados/historico-repo.ts` (tarefa 2 do M4) foi antecipado na forma básica, porque o pré-preenchimento do M3 usa o motor. | O motor precisa do histórico agrupado por treino. |
| **D15** (M4) | Cartão "Para o próximo treino": ↑ e ↓ seguem a ação do motor; **!** aparece quando a carga se mantém **e** há alerta (queda isolada, estagnação); `=` sem alerta. Os alertas aparecem também como linha extra no cartão, inclusive com ↑/↓. A sugestão do cartão inclui o treino que acabou de terminar (`comTreinoAtual`), que ainda não está concluído no banco e por isso não está no histórico gravado: entra uma vez só. | A 7.6 lista os quatro ícones sem dizer quando o ! vence a seta; a seta de carga é a informação principal, e o ! sinaliza o que exige leitura quando a carga não muda. |
| **D16** (M4) | Recordes (9.6) por variante, contra todo o histórico anterior (só treinos concluídos, com apelidos): primeiro o melhor e1RM (RIR ausente = ponto médio do alvo, como no motor); se não bateu, a maior carga já usada; por tempo, a maior duração. Primeira vez na variante não é recorde. Exercício por tempo sem histórico vem com 0 kg (peso do corpo) pré-preenchido. | "melhor e1RM ou melhor carga × reps" sem critério de desempate; e o campo de kg vazio travaria o "Concluir" de uma prancha. |
| **D17** (M4) | O botão Cardio do fim conclui o treino (como Fechar) e abre `#/treino/cardio`, um aviso provisório até o M5. | A tela de cardio é do M5; o treino não pode ficar aberto. |
| **D18** (M5) | Cardio: cada registro vale para **uma linha CARDIO** do plano, a do mesmo tipo com duração mais próxima (tipo fora do plano, como "Outro: Corrida", compara com todas); antes de digitar a duração, a tela mostra a primeira linha com meta. "X de Y": Y é a soma das metas das linhas com frequência (máx. 7); X conta os registros da semana (seg-dom) cuja linha tem meta, então um cardio que cai na linha "opcional" não conta. Sem meta, o cartão mostra só o total da semana. | O plano do Raul tem duas linhas com Bicicleta (2x 30-40 min e opcional 10-15 min); contar tudo faria um giro leve de 10 min valer como sessão da meta. |
| **D19** (M5) | Histórico: o ponto da semana é o **melhor e1RM entre todas as séries de trabalho** (o motor usa só a carga de trabalho), com RIR ausente = ponto médio do alvo da prescrição daquele treino (plano em que foi feito, semana do estado salvo pela D1). A semana é de deload quando a fase daquela semana é deload. Exercício por tempo usa a maior duração. "Variação em 8 semanas": última semana contra a última semana com treino até 8 semanas antes; com menos histórico, contra a primeira ("desde dd/mm"). Melhor série = maior e1RM (empate: a mais antiga), como o recorde da D16. | A 9.8 pede "melhor e1RM por semana" sem dizer de quais séries nem como tratar RIR ausente e histórico curto. |
| **D20** (M5) | Edição no histórico: kg, reps e RIR de séries de treinos **concluídos**, e exclusão de série, treino (com as séries) e cardio, sempre com confirmação na exclusão. Excluir apaga de verdade (diferente de descartar, D6). O treino em andamento só se edita na tela do treino. Data, sessão e variante de um treino passado não são editáveis. Sem mudança de schema. | O pedido explícito de excluir, com confirmação, é a vontade do usuário; editar data/variante exigiria remontar a rotação e o vínculo de chaves, fora do escopo do M5. |
| **D21** (M6) | Restaurar backup (substituir **ou** mesclar) é bloqueado enquanto houver treino em andamento, como a importação de plano; a mensagem pede para concluir ou descartar o treino. Fazer backup durante o treino é permitido: o treino aberto vai no arquivo e volta aberto ao restaurar (o app retoma o treino). | Substituir apagaria as séries do treino aberto e deixaria o controlador em memória apontando para um treino que não existe mais; mesclar poderia criar dois treinos abertos. Prioridade: não perder dados. |
| **D22** (M6) | Mesclar acrescenta só o que falta, por `id` (configuração por `chave`). Em conflito vale o que está no aparelho (inclusive séries editadas depois do backup); preferências e plano ativo do aparelho ficam, e o plano ativo do backup só vale se o aparelho não tiver um. Mesclar nunca apaga: algo excluído no aparelho depois do backup volta (a confirmação avisa). | "Mesclar sem duplicar por id" não diz quem vence; manter o aparelho é o que não perde trabalho recente. |
| **D23** (M6) | O backup leva também `planoAtivoId`, os treinos descartados (D6) e o treino em andamento; não leva `meta.persistencia`, que é do aparelho. `ultimoBackup` só é gravado depois de o arquivo ser compartilhado ou baixado (cancelar o menu não conta), mas o JSON já sai com `ultimoBackup = exportadoEm`: restaurar devolve o estado de logo depois da exportação. `migrarBackup()` completa preferências que faltam com o padrão e, sem `planoAtivoId` válido, ativa o plano importado por último. | Sem o plano ativo o estado não volta idêntico; contar como feito um backup cancelado esconderia o lembrete sem haver cópia. |
| **D24** (M6) | Os dois modos de restauração têm duas etapas: o resumo do arquivo (data, plano ativo, treinos, séries, cardio, período) e, depois de escolher o modo, uma confirmação. Em "Substituir tudo" a confirmação diz quantos treinos e cardios do aparelho **não estão no backup** e seriam perdidos. Restaurar também aparece na tela Importar quando não há plano (celular novo). | O briefing pede confirmação; mostrar a perda concreta evita apagar sem querer o que só existe no aparelho. |
| **D25** (M6) | CSV de séries: uma linha por série, aquecimento incluído com `sim`/`não`; `serie` = número da série gravado; `rir` vazio quando não anotado (4 = "4+"); `exercicio` = nome do item do plano e `variante` = a variante feita; `semana_bloco` = semana gravada no treino; `fase` = número da fase (1, 2, …) da semana usada na prescrição (D1), vazio sem bloco; treinos em andamento entram (só os descartados ficam fora). Linhas com CRLF. "Planilha CSV" entrega os dois arquivos juntos. | O briefing fixa só o cabeçalho; CRLF e `sim`/`não` são o que o Excel pt-BR espera. |
| **D26** (M6) | PDF: resumo por exercício pela chave canônica (apelidos), com o nome da variante mais recente; "1RM est. inicial" e "atual" = melhor e1RM da primeira e da última semana com treino (mesma regra do gráfico, D19); por tempo, a maior duração. Duas colunas no lugar de "inicial → atual" porque a Helvetica padrão (WinAnsi) não tem a seta; qualquer caractere fora do Latin-1 é trocado (traço longo vira hífen, emoji vira "?"). Tabela de treinos só com os concluídos: data, sessão, exercícios, séries de trabalho, volume e duração. As dependências opcionais do jsPDF (html2canvas, canvg, dompurify, usadas só por `doc.html()`/SVG) apontam para um módulo vazio, e a URL de CDN do pdfobject sai no build; só o namespace XMP do jsPDF foi liberado no `verificar-dist`. | Fonte padrão sem embutir Inter (9.3); nenhum caminho de código aponta para fora. |
| **D27** (M6) | O Chrome do Android não compartilha `.json` pelo Web Share (os tipos aceitos não incluem JSON): o backup é **baixado** (pasta Downloads) e a mensagem diz isso; CSV e PDF abrem o menu de compartilhar. Se o compartilhamento falhar por outro motivo que não o cancelamento (ex.: o toque "expirou" enquanto o PDF era gerado), o arquivo é baixado. O "Fazer backup" do lembrete no Início gera o backup direto, sem passar por Plano e dados. | Mantém o nome `treino-backup-AAAA-MM-DD.json` pedido; backup em 1 toque (R1). |

---

## 13. Respostas da Fase 0 (09/11/2026)

| Pergunta | Resposta | Efeito |
|---|---|---|
| Q1 Celulares | Os dois usam **Android** | E2E só em Chromium; pdf.js no build moderno; Wake Lock e vibração disponíveis. A limitação do iOS fica documentada, mas não é prioridade de teste |
| Q2 Nome e repositório | App **REPZ** (nome oficial definido pelo Thiago em 09/11), descrição "REPZ · diário de treino"; repositório **`repz`**. O Thiago tem conta no GitHub | `base` do Vite = `/repz/`; URL `https://<usuario>.github.io/repz/`. O GitHub Pages não exige conta à parte: é ativado nas configurações do repositório (no plano gratuito, o repositório precisa ser público) |
| Q3 Saudação | ainda aberta (não bloqueia até o M3) | — |
| Q4 Descanso padrão | ainda aberta; uso o máximo da faixa, como recomendado | — |
| Q5 PDF na v1 | **Sim** | jsPDF sob demanda (D5) |
| Q6 Plano do Thiago | fixtures do Raul até o PDF chegar | — |
