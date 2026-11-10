# BRIEFING — App de Treino (PWA offline)

> **Para o Claude Code.** Este documento descreve o app inteiro: produto, regras de negócio, formato de importação, algoritmos, telas, dados, stack, qualidade e entrega. Ele foi escrito depois de uma fase de descoberta com os dois usuários. A proposta visual foi **aprovada** (`docs/Proposta - App de Treino.pdf`).
>
> O kit que acompanha este arquivo tem uma **implementação de referência já testada** do parser e do motor de sugestão de carga (`referencia/`), além de fixtures reais (`fixtures/`). Use esse código como especificação executável: porte para a stack escolhida e mantenha os testes passando.

---

## 0. Como trabalhar com este documento

1. **Leia o documento inteiro antes de qualquer código**, incluindo a seção 18 (decisões em aberto).
2. **Fase 0 — arquitetura e plano (sem código de produto):**
   - Escreva `docs/ARCHITECTURE.md`: stack final com justificativa, estrutura de pastas, módulos e responsabilidades, modelo de dados (tipos e stores), máquina de estados do treino, estratégia offline/PWA, estratégia de testes, riscos e mitigações.
   - Escreva `docs/PLAN.md`: marcos (sugestão na seção 17), tarefas de cada marco, critérios de aceite e ordem de execução.
   - Liste as perguntas da seção 18 que ainda bloqueiam alguma decisão.
   - **Pare e peça aprovação do Thiago** antes de começar o Marco 1.
3. **Implementação:** um marco por vez. Cada marco termina com testes passando, app rodando localmente, um resumo do que foi feito e commits pequenos e descritivos.
4. **Conflitos:** se algo aqui for contraditório, inviável ou claramente pior que uma alternativa, **pergunte antes de desviar**. Não invente requisitos.
5. **Prioridade quando houver dúvida:** não perder dados > funcionar offline na academia > poucos toques por série > visual.

---

## 1. Contexto e objetivo

Thiago e Raul treinam musculação. Cada um gera o plano de treino com a própria IA, em PDF. Os dois querem um app de celular para **registrar o treino durante a sessão** (carga, repetições e RIR de cada série), acompanhar a evolução e **receber sugestões de carga** baseadas nos registros anteriores.

**O input do app é o PDF do plano.** O PDF pode ter qualquer layout, mas termina com um **anexo padronizado (formato TREINO v1)**, que é o que o app lê. O formato e o prompt que cada um cola na sua IA já estão definidos (seção 5 e `docs/contrato-treino-v1.txt`).

### Usuários

| | Thiago | Raul |
|---|---|---|
| Plano atual | PPL rotativo (Push/Pull/Legs), 4-5x/semana | PPL + Upper/Lower, 5x/semana (seg-sex) |
| Uso | celular próprio, na academia | celular próprio, na academia |
| Perfil técnico | analista de produto, programa em Python | — |

Cada um usa o app **no próprio celular**. Não existe conta nem compartilhamento: cada aparelho tem só os dados do seu dono.

---

## 2. Princípios e restrições (não negociáveis)

1. **PWA mobile-first**, instalável na tela inicial (Android e iOS). Não é app de loja.
2. **100% offline depois da primeira carga.** Nenhuma chamada de rede em tempo de execução: fontes, pdf.js e o worker vão no bundle e no cache.
3. **Dados só no aparelho** (IndexedDB). Sem backend, sem login, sem analytics, sem telemetria, sem CDN em tempo de execução.
4. **Exportação local:** PDF, CSV e backup JSON gerados no aparelho e compartilhados pelo menu nativo.
5. **Carga em kg.** Decimais com vírgula na interface (`82,5`) e ponto no armazenamento.
6. **Interface em português do Brasil.**
7. **Tema escuro**, sóbrio, alto contraste, botões grandes, uso com uma mão (seção 12).
8. **Hospedagem estática gratuita** (sugestão: GitHub Pages). O servidor só entrega arquivos.
9. **O usuário sempre manda:** toda sugestão do app pode ser ignorada ou editada.

---

## 3. Escopo

### v1 (este projeto)
- Importar plano via PDF (ou texto colado) → validar → revisar → salvar.
- Treino do dia: sessão sugerida pela rotação (pode trocar), registro série a série, bi-sets, cronômetro de descanso.
- Periodização por blocos e fases (RIR e séries variam por semana).
- **Sugestão de carga: aumentar, manter ou reduzir**, com motivo, mais alertas (estagnação, queda de desempenho).
- Cardio: registro e meta semanal.
- Histórico por exercício e variante, com gráfico.
- Exportar PDF e CSV, backup e restauração em JSON.
- Configurações: semana atual ajustável, salto de carga por exercício, marcação de exercício "foco".

### Fora do escopo (v2+)
Volume semanal por grupo muscular, medidas corporais e peso, integração com relógio (Galaxy Watch e outros), sincronização entre aparelhos, múltiplos perfis no mesmo aparelho, notificações agendadas, i18n.

---

## 4. Glossário

| Termo | Significado |
|---|---|
| **Plano** | Conjunto de sessões importado de um PDF. Só um plano fica ativo por vez |
| **Sessão (template)** | Treino do plano: "Push", "Pull"… A ordem no anexo define a rotação |
| **Exercício prescrito** | Linha `EX`/`SS` do plano: séries, faixa de reps, descanso, flags |
| **Variante** | Opção de execução (`Supino reto [barra / maquina]`). Cada variante tem histórico próprio |
| **Chave do exercício** | Nome normalizado da variante (sem acento, minúsculas, sem pontuação). Liga o histórico entre planos |
| **Treino (realizado)** | Execução de uma sessão numa data |
| **Série realizada** | kg, reps, RIR e horário |
| **RIR** | Repetições em reserva (quantas reps ainda dariam antes da falha) |
| **Bi-set (SS)** | Dois ou mais exercícios alternados sem descanso entre eles; o descanso vem no fim da rodada |
| **Bloco / Fase** | Periodização: bloco de N semanas dividido em fases com RIR e séries próprios |
| **Deload** | Semana de volume reduzido |
| **e1RM** | 1RM estimado: `kg × (1 + (reps + RIR) / 30)` (Epley com RIR) |
| **Salto (incremento)** | Menor aumento de carga possível no equipamento (barra 2,5 kg; halter 2 kg; máquina conforme a placa) |

---

## 5. Formato de importação TREINO v1

O PDF tem um corpo livre e, no final, um anexo em texto simples entre marcadores. **O app lê apenas o anexo.** O prompt que define o formato para as IAs está em `docs/contrato-treino-v1.txt`, e a implementação de referência em `referencia/parser/parser.js`.

### 5.1 Estrutura

```
#TREINO-INICIO v1
PLANO: Hipertrofia natural 5x | Raul | 2026-10-30
PROGRESSAO: dupla | rir 1-3 | carga +2-5% | estagnado 3

BLOCO: 12
FASE: 1-4 | rir 2-3
FASE: 5-8 | rir 1-2 | series +1 foco
FASE: 9-11 | rir 1-2 | rir_iso 0-1
FASE: 12 | deload | volume 50%

SESSAO: Push | seg
EX: Supino inclinado com halteres | 3 | 6-10 | 120-180s
EX: Supino reto [barra / maquina] | 3 | 6-10 | 120-180s
SS1: Elevacao lateral | 4 | 12-20 | 60-90s | iso
SS1: Triceps na corda | 3 | 10-15 | - | iso

SESSAO: Pernas | qua
EX: Stiff | 3 | 8-10 | 120s | rir 3
EX: Prancha | 3 | 30-45s | 60s | iso

CARDIO: [Bicicleta / Remo] | 2x | 30-40min | z2 | fc 115-135
TOTAL: 2 sessoes | 6 exercicios
#TREINO-FIM
```

O plano completo do Raul está em `fixtures/raul.treino.txt`: 5 sessões, 30 exercícios.

### 5.2 Linhas

| Chave | Campos (separador `\|`) | Obrigatória | Notas |
|---|---|---|---|
| `#TREINO-INICIO v1` | — | sim | Marca o início. A versão vem depois de `v` |
| `PLANO:` | nome \| pessoa \| AAAA-MM-DD | sim | |
| `PROGRESSAO:` | tipo \| `rir A-B` \| `carga +X-Y%` \| `estagnado N` | não | Padrões: `dupla`, RIR 1-3, +2-5%, 3 semanas |
| `BLOCO:` | semanas | não | Ativa a periodização |
| `FASE:` | semanas (`1-4` ou `12`) \| tokens | se houver BLOCO | Tokens: `rir A-B`, `rir_iso A-B`, `series +N foco\|iso\|todos`, `deload`, `volume P%` |
| `SESSAO:` | nome \| dia (`seg`…`dom`) opcional | sim (≥1) | A ordem das sessões define a rotação |
| `EX:` | nome \| séries \| reps \| descanso \| tokens | — | Exercício normal |
| `SS<n>:` | igual a `EX` | — | Bi-set: mesmo `n` na mesma sessão = mesmo grupo |
| `CARDIO:` | tipo \| frequência \| duração \| tokens | não | Duração em `min`. Tokens: intensidade livre (`z2`, `leve`), `fc A-B` |
| `TOTAL:` | `N sessoes \| M exercicios` | recomendada | Conferência de integridade |
| `# ...` | comentário | — | Ignorado |
| `#TREINO-FIM` | — | sim | Marca o fim |

**Campos dos exercícios:**
- **séries:** inteiro de 1 a 10.
- **reps:** `8-12`, `10` ou `30-45s` (por tempo, isometria).
- **descanso:** `90s` ou `120-180s`; `-` quando não houver (comum nas linhas `SS` que não são a última do grupo). O parser também aceita `2min`/`2-3min` e converte para segundos.
- **tokens opcionais:** `rir N` ou `rir A-B` (RIR fixo do exercício), `iso` (isolador), `foco` (prioritário). Token desconhecido gera aviso e é ignorado.
- **variantes:** `[a / b]` em qualquer parte do nome. `Supino reto [barra / maquina]` vira `Supino reto barra` e `Supino reto maquina`; `[Barra fixa / Puxada]` vira `Barra fixa` e `Puxada`. O app pergunta qual variante foi feita e mantém um histórico para cada uma.

### 5.3 Regras de leitura (tolerância)

1. **Normalização da linha** (sem remover acentos): NFC, hífens e travessões tipográficos (`–`, `—`, `−`) viram `-`, espaços especiais viram espaço comum, `｜`/`│` viram `|`, espaços repetidos são colapsados.
2. **As palavras-chave casam sem acento e sem diferença de maiúsculas** (`SESSÃO` = `SESSAO`).
3. **O nome exibido mantém os acentos** ("Elevação lateral"). A **chave do exercício** remove acentos e pontuação.
4. **Junção de linhas quebradas:** uma linha sem chave reconhecida é anexada à anterior se (a) começar com `|`, ou (b) a anterior ainda não tiver o mínimo de campos do seu tipo (`EX`/`SS`: 4; `FASE`: 2; `CARDIO`: 3; `TOTAL`: 2). Caso contrário, é ignorada com aviso (cabeçalhos e rodapés de página caem aqui).
5. Cercas de markdown (```) e texto fora dos marcadores são ignorados.
6. **Bi-sets:** o descanso informado em qualquer linha do grupo vale para o grupo inteiro. Grupo com um exercício só gera aviso.

### 5.4 Validação

**Erros** bloqueiam a importação e apontam o número da linha dentro do bloco:
- marcador `#TREINO-INICIO` ou `#TREINO-FIM` ausente (mensagens específicas para cada caso);
- `EX`/`SS` com menos de 4 campos, séries inválidas, reps inválidas, descanso inválido;
- exercício antes de qualquer `SESSAO`; `FASE` antes de `BLOCO`; semanas de fase inválidas;
- semana coberta por mais de uma `FASE`;
- nenhuma sessão, ou sessão sem exercícios;
- `TOTAL` diferente do que foi lido (sessões ou exercícios).

**Avisos** não bloqueiam e aparecem na tela de importação: linha ignorada, token desconhecido, bi-set de um exercício só, exercício sem descanso, semana sem fase (usa o RIR padrão), ausência de `TOTAL`, versão do formato diferente de 1.

### 5.5 Extração de texto do PDF

- Use **pdf.js** (`pdfjs-dist`), com o worker empacotado localmente (nada de CDN).
- Remonte as linhas agrupando os itens de texto pela coordenada Y (tolerância de ~2,5 pt), ordenando por X e inserindo espaço quando houver distância horizontal entre os itens. A referência está em `referencia/parser/extrair-pdf.js`.
- **PDF sem texto** (escaneado ou imagem): mensagem clara sugerindo colar o anexo como texto. OCR está fora do escopo.
- **Entrada alternativa:** campo para colar o texto do anexo, que passa pelo mesmo parser.

### 5.6 Implementação de referência (testada)

- `referencia/parser/parser.js`: `parse(texto) → { plano, rascunho, erros, avisos }`, `prescricao(plano, ex, semana)`, `chaveExercicio(nome)`.
- `referencia/parser/extrair-pdf.js`: `textoDoPdf(pdfjs, bytes)`.
- Resultados já verificados:

| Fixture / caso | Resultado esperado |
|---|---|
| `fixtures/raul-com-anexo-ok.pdf` | importa: 5 sessões, 30 exercícios, 0 erros, 2 avisos (rodapé do Chrome) |
| `fixtures/raul-com-anexo-estresse.pdf` (fonte grande, linha quebrada, acentos, travessão `–`) | importa; a linha quebrada é rejuntada; os nomes ficam com acento |
| `fixtures/plano-original-raul.pdf` (sem anexo) | bloqueia: "Marcador #TREINO-INICIO não encontrado" |
| bloco sem `#TREINO-FIM` | bloqueia |
| um exercício removido | bloqueia: "TOTAL diz 30 exercícios, mas foram lidos 29" |
| `Hip thrust` com 3 campos | bloqueia, linha 47 |
| reps `oito a doze` | bloqueia, linha 29 |
| `FASE: 4-8` sobrepondo `1-4` | bloqueia: "Semana 4 aparece em mais de uma FASE" |
| bloco colado com cercas markdown | importa |

Rode com `cd referencia && npm i && node teste/rodar.mjs ../fixtures/raul-com-anexo-ok.pdf`, `node teste/erros.mjs` e `node teste/progressao.mjs`.

**Porte essas funções para a stack escolhida (TypeScript tipado) e transforme esses casos em testes automatizados.**

---

## 6. Periodização e semana atual

### 6.1 Semana do bloco
- Na revisão do plano, o usuário define a **data de início do bloco** (padrão: próxima segunda-feira).
- `semana = floor((hoje − início) / 7) + 1 + ajusteManual`, limitada a `[1, BLOCO.semanas]`.
- Em "Plano e dados", o usuário ajusta a semana com `−`/`+` (perdeu ou repetiu uma semana). Guarde o ajuste como deslocamento.
- Plano sem `BLOCO`: não há semana nem fase; vale o RIR da `PROGRESSAO`.
- Depois da última semana do bloco: mostre o aviso "Bloco concluído" com o botão "Importar novo plano". O app continua funcionando com a última fase, sem deload.

### 6.2 Prescrição efetiva de um exercício numa semana
```
fase   = fase que contém a semana (ou nenhuma)
séries = séries do exercício
  + fase.series.delta, se o alvo da fase se aplica ("todos"; "foco" e ex.foco; "iso" e ex.iso)
  × fase.volume, se < 1 (deload), arredondando para cima, mínimo 1
RIR    = ex.rir (fixo)
      ?? (ex.iso && fase.rir_iso)
      ?? fase.rir
      ?? PROGRESSAO.rir
reps e descanso = os do exercício
```
Referência: `prescricao()` em `parser.js`. Valores verificados no plano do Raul: na semana 1, RIR 2-3 para todos; na semana 10, RIR 0-1 nos isoladores e 1-2 nos compostos; na semana 12, séries pela metade (3 → 2, 4 → 2); o Stiff mantém RIR 3 fixo em todas as semanas.

**A flag `foco` pode ser ligada e desligada no app** (o plano do Raul diz "pontos fracos" sem dizer quais). Guarde-a por chave de exercício nas configurações; ela tem prioridade sobre o que veio do plano.

### 6.3 Rotação de sessões
- **Próxima sessão sugerida:** a seguinte, na ordem do plano, à última sessão **concluída** desse plano (circular). Sem histórico, a primeira.
- O usuário pode **trocar a sessão** antes de iniciar.
- O dia da semana (`| seg`) é só informativo na v1. Mostre "planejado para segunda", mas a rotação manda.

---

## 7. Motor de sugestão de carga

Requisito explícito dos usuários: **sugerir aumentar, manter ou reduzir a carga com base nos registros anteriores.** A referência testada está em `referencia/parser/progressao.js`, com 16 cenários em `referencia/teste/progressao.mjs`.

### 7.1 Entradas
- **Histórico** do exercício **na mesma variante** (chave), em ordem cronológica: `[{data, series:[{kg, reps, rir}]}]`. **Séries de aquecimento ficam de fora.**
- **Prescrição da semana atual** (seção 6.2): faixa de reps, RIR alvo, por tempo ou não, e se a fase é deload.
- **Salto do equipamento:** configurável por exercício. Padrão: 2 kg se o nome contém "halter"; senão, 2,5 kg.
- **Data de hoje.**

### 7.2 Resumo de cada treino
- **Carga de trabalho** = maior carga usada nas séries do treino. Só as séries nessa carga entram na análise.
- **RIR ausente** = ponto médio do RIR alvo.
- **e1RM do treino** = **maior** `kg × (1 + (reps + RIR)/30)` entre as séries na carga de trabalho. Use a melhor série, e não a média, porque as séries seguintes carregam fadiga acumulada.
- **Carga para uma meta:** `cargaPara(e1, reps, rir) = e1 / (1 + (reps + rir)/30)`.

### 7.3 Regras (avaliadas nesta ordem; a primeira que casar decide)

| # | Situação | Ação | Cálculo |
|---|---|---|---|
| 0 | Sem histórico | calibrar | Texto: "escolha uma carga para ~(min+1)-(max−1) reps no RIR alvo" |
| 0b | Exercício por tempo | aumentar/manter | Bateu o máximo de segundos em todas as séries → "aumente a dificuldade"; senão "+5 s por série" |
| 1 | ≥ 21 dias desde o último treino do exercício | **reduzir** | `min(arredonda(carga × 0,90), carga − salto)` |
| 2 | Fase atual é deload | manter | Mesma carga; o volume já cai pela periodização |
| 3 | Os 2 últimos treinos com e1RM ≤ 95% do melhor dos 3 anteriores a eles | **reduzir** + alerta | `min(arredonda(carga × 0,95), carga − salto)`; alerta para conferir sono, alimentação e estresse e, se persistir, antecipar o deload |
| 4 | 1ª série abaixo do mínimo da faixa **ou** pelo menos metade das séries abaixo | **reduzir** | `min(arredondaParaBaixo(cargaPara(e1, repsMin, rirMeio)), carga − salto)` |
| 5 | **Todas** as séries ≥ máximo da faixa **e** nenhuma série com RIR < (RIR mín − 1) | **aumentar** | Teto de +5%, ou +7,5% se sobrou muito (todas com ≥ máx+2 reps ou RIR ≥ RIR máx + 2). `c = arredondaParaBaixo(carga × (1+teto))`; se `c ≤ carga`, `c = carga + salto`, e o texto avisa "menor salto possível" quando passar do teto |
| 6 | Pelo menos metade das séries com RIR < (RIR mín − 1) | manter, ou **reduzir** se repetir | No 1º treino assim: manter, com "pare mais longe da falha". Se o treino anterior, na mesma carga, também foi assim: `carga − salto` |
| 7 | Dentro da faixa | manter | Texto "busque +1 rep por série". Se o e1RM ficou ≥ 5% abaixo do melhor dos 3 anteriores: alerta "queda isolada não muda a carga; se repetir, o app sugere reduzir" |

**Alerta paralelo (não muda a carga):** estagnação. Se há ≥ 3 treinos numa janela de 3 semanas, a janela cobre ≥ 2 semanas, e o melhor e1RM da janela (fora o primeiro treino dela) é ≤ 101% do melhor anterior → "3 semanas sem progredir: troque a variação ou revise sono e calorias". O número de semanas vem de `PROGRESSAO.estagnado`.

**Parâmetros** (deixe-os num único objeto de configuração, com nomes claros):

```
pausaDias 21 · reducaoPausa 10% · quedaLimite 5% · quedaSessoes 2 · reducaoQueda 5%
aumentoMin 2% · aumentoMax 5% · aumentoFolga 7,5% · toleranciaRir 1 · estagnadoSemanas 3
```

### 7.4 Por que essas regras (para não "otimizar" por engano)
- **O RIR anotado erra ~1 rep em média** (meta-análise, Halperin et al., *Sports Med* 2022) e erra mais em séries longas (>12 reps). Daí a tolerância de 1 rep e a regra de **não reduzir por um único treino ruim**.
- **A força se mantém bem por algumas semanas sem treino** (Bosquet et al., *Scand J Med Sci Sports* 2013; revisões de Mujika). Por isso a redução por pausa só começa em 3 semanas. O −10% é margem prática, não um número de estudo.
- **Autorregular a carga por RIR rendeu ganhos de força semelhantes à prescrição fixa** (Hickmott et al., *Sports Med Open* 2022). O valor do motor é prático: tirar a dúvida da carga e evitar erros grandes. **Não acrescente regras "inteligentes" sem pedir.**

### 7.5 Cenários de referência (viram testes)

Prescrição de supino: 6-10 reps, RIR 1-2. Desenvolvimento: 8-12, RIR 1-2. Hoje = 2026-11-07.

| Cenário | Entrada (último treino) | Saída esperada |
|---|---|---|
| Topo da faixa, barra | 80 × 10·10·10, RIR 2·1·1 | ↑ 82,5 kg (+3,1%) |
| Topo, halteres | 26 × 10·10·10 | ↑ 28 kg (menor salto: 2 kg) |
| Topo com folga | 80 × 13·12·12, RIR 3·2·2 | ↑ 85 kg (+6,3%) |
| Dentro da faixa | 82,5 × 8·7·7 | = 82,5 kg |
| Carga alta demais | 85 × 5·4·4, RIR 1·0·0 | ↓ 80 kg |
| Halteres abaixo da faixa | 22 × 7·6·5 (faixa 8-12) | ↓ 20 kg |
| Queda pontual | 3 treinos bons e depois 80 × 8·7·7 | = 80 kg + alerta de queda isolada |
| Queda em 2 treinos | 80 × 7·7·6 e depois 80 × 7·6·6 | ↓ 75 kg + alerta de recuperação |
| Perto da falha, 1× (alvo RIR 2-3) | 80 × 9·8·8, RIR 0·0·0 | = 80 kg, "pare mais longe da falha" |
| Perto da falha, 2× | dois treinos assim | ↓ 77,5 kg |
| Pausa de 25 dias | último treino em 13/10 | ↓ 72,5 kg |
| Deload | qualquer | = mesma carga |
| Estagnado | 4 treinos semanais sem melhora | = + alerta de estagnação |
| Isolador, fase RIR 0-1 | 10 × 20·20·19·20 | = 10 kg |
| Máquina, salto de 5 kg | 45 × 15·15·15 (faixa 10-15) | ↑ 50 kg (menor salto) |
| Sem histórico | — | calibrar |

### 7.6 Como a sugestão aparece
- **Fim do treino:** um cartão por exercício com ícone (↑ verde, = neutro, ↓ laranja, ! amarelo), nome, as reps feitas e o motivo em uma linha.
- **Próximo treino do exercício:** a carga sugerida vem **pré-preenchida** em todas as séries. As reps vêm das do último treino, ou do mínimo da faixa quando a carga subiu.
- O usuário pode digitar outra carga. Registre se a sugestão foi aceita (útil para calibrar no futuro, sem uso na v1).

---

## 8. Modelo de dados (IndexedDB)

Proposta inicial: refine em `ARCHITECTURE.md`. Use uma lib leve (ex.: Dexie) e **migrações versionadas desde o primeiro dia**.

```ts
type ISODate = string;        // 'AAAA-MM-DD' (data local, America/Sao_Paulo)
type ISODateTime = string;    // ISO 8601 com offset

interface Plano {
  id: string;                 // uuid
  nome: string; autor: string; dataPlano: ISODate | null;
  importadoEm: ISODateTime;
  ativo: boolean;             // apenas 1 ativo
  inicioBloco: ISODate | null;
  ajusteSemana: number;       // deslocamento manual
  progressao: { tipo: string; rir: Faixa; carga: Faixa; estagnado: number };
  bloco: { semanas: number; fases: Fase[] } | null;
  sessoes: SessaoTemplate[];  // em ordem (rotação)
  cardio: CardioPrescrito[];
  textoOriginal: string;      // bloco TREINO bruto (auditoria/reimportação)
  arquivoNome?: string;
}
interface Faixa { min: number; max: number }
interface Fase { de: number; ate: number; rir: Faixa | null; rirIso: Faixa | null;
                 deload: boolean; volume: number; series: { delta: number; alvo: 'todos'|'foco'|'iso' } | null }
interface SessaoTemplate { id: string; nome: string; dia: number | null; itens: ExercicioPrescrito[] }
interface ExercicioPrescrito {
  id: string; nome: string;            // nome base exibido
  variantes: string[]; chaves: string[];  // paralelos
  series: number; reps: Faixa; porTempo: boolean;
  descanso: Faixa | null;              // segundos
  rir: Faixa | null; iso: boolean; foco: boolean; grupo: number | null; // SSn
}
interface CardioPrescrito { tipos: string[]; frequencia: string; minutos: Faixa; fc: Faixa | null; intensidade: string | null }

interface Treino {
  id: string; planoId: string; sessaoId: string; sessaoNome: string;
  data: ISODate; inicio: ISODateTime; fim: ISODateTime | null;
  semanaBloco: number | null; status: 'em_andamento' | 'concluido' | 'descartado';
  estadoUI?: unknown;                  // para retomar o treino após fechar o app
}
interface SerieRealizada {
  id: string; treinoId: string; exercicioPrescritoId: string;
  chave: string; variante: string;     // chave da variante feita
  ordem: number; kg: number; reps: number; rir: number | null;
  aquecimento: boolean; feitaEm: ISODateTime;
  sugestaoKg: number | null;           // o que o app sugeriu
}
interface CardioRealizado { id: string; data: ISODate; tipo: string; minutos: number;
  fcMedia: number | null; distanciaKm: number | null; esforco: number | null; feitoEm: ISODateTime }
interface ConfigExercicio { chave: string; incrementoKg: number | null; foco: boolean | null; apelidoDe?: string }
interface Preferencias { somDescanso: boolean; vibrar: boolean; manterTelaLigada: boolean; ultimoBackup: ISODateTime | null }
```

**Índices importantes:** `SerieRealizada` por `[chave+feitaEm]` e por `treinoId`; `Treino` por `data` e `status`.

**Identidade entre planos:** o histórico é ligado pela **chave da variante**. Na tela de revisão de um plano novo, mostre quais exercícios **já têm histórico** e quais são **novos**. Para os novos, sugira vínculo com chaves existentes parecidas (similaridade simples, ex.: Jaro-Winkler ou trigramas ≥ 0,85) e deixe o usuário **vincular** ("Supino reto c/ barra" = "Supino reto barra"). Isso grava `apelidoDe` em `ConfigExercicio`.

---

## 9. Telas e comportamento

Navegação com três abas: **Treino · Histórico · Plano**. Os mockups aprovados estão em `docs/Proposta - App de Treino.pdf`, páginas 5 a 7. Siga o conteúdo e o fluxo; o layout pode melhorar.

### 9.1 Importar plano (aba Plano)
- Botões **"Selecionar PDF"** (input file `accept="application/pdf"`) e **"Colar texto"**.
- Checklist de progresso: texto lido · anexo encontrado · N sessões / M exercícios · TOTAL confere · periodização (N semanas, K fases) · avisos (expansíveis).
- Com erro: cartão vermelho com a linha e a mensagem, e o texto "Peça à sua IA para corrigir o anexo". **Não salva nada.**
- Sem erros: botão "Revisar plano".

### 9.2 Revisar plano
- Nome, autor, **data de início do bloco** (date picker, padrão próxima segunda), duração.
- Acordeão de sessões: exercícios com séries × reps; variantes em destaque; bi-sets com etiqueta `SS1`; marcação de exercício novo ou com histórico, e a opção de vincular (seção 8).
- "Salvar" → torna o plano **ativo**. O plano anterior fica inativo, e o histórico continua.
- Se houver treino em andamento, peça para concluir ou descartar antes de trocar o plano.

### 9.3 Início (aba Treino)
- Saudação simples (sem nome, já que não há conta; ou o nome do campo `PLANO` → pessoa).
- Pílula **"Semana X de N · Fase K · RIR a-b"** (some se não houver bloco; mostra "Deload" na semana de deload).
- Cartão **Próximo treino:** nome da sessão, nº de exercícios, duração estimada (soma de séries × (tempo médio da série + descanso)), primeiros exercícios, **Iniciar treino**, **Trocar sessão**.
- Cartão **Cardio:** "X de Y nesta semana" (pela frequência do plano), botão Registrar.
- **Treino em andamento:** se houver um aberto, o cartão principal vira **"Continuar treino"**.
- Estado vazio (sem plano): chamada para importar.

### 9.4 Registro da série (núcleo do app)
- Topo: sessão, progresso "2 de 6", barra de progresso e tempo decorrido.
- Nome do exercício e **chips de variante** (obrigatório escolher se houver mais de uma; padrão = a última usada).
- Caixa **Meta da semana:** séries × reps · RIR alvo · descanso (já com a periodização).
- **Última vez:** data e `kg × reps · reps · reps` da mesma variante.
- Tabela de séries: nº · kg · reps · RIR · ✓. As séries concluídas ficam esmaecidas e **editáveis com um toque**.
- Série atual com campos **pré-preenchidos** (sugestão de carga e reps). Teclado numérico (`inputmode="decimal"` para kg e `numeric` para reps e RIR). Para o RIR, botões 0-1-2-3-4+ são mais rápidos que digitar.
- Atalhos **−salto / +salto** (o salto do exercício) e **−1 / +1 rep**.
- Botão grande **"Concluir série N"** → grava a série e inicia o descanso.
- Ações secundárias (menu): **adicionar série**, **série de aquecimento** (marcada e fora dos cálculos), **pular exercício**, **ir para outro exercício**, **nota no exercício**.
- **Meta: registrar uma série com no máximo 2 toques quando a sugestão está certa.**

### 9.5 Bi-set e descanso
- Bi-set: mostra o par/trio com a rodada atual ("Rodada 2 de 4"). Depois de concluir a série de um, o app **vai direto ao próximo do grupo, sem descanso**. O cronômetro só começa **no fim da rodada**.
- **Grupos com número de séries diferente:** um exercício que acabou sai das rodadas seguintes. Ex.: elevação 4 séries + tríceps 3 → na rodada 4, só a elevação.
- **Cronômetro de descanso:**
  - Baseado em **timestamp de fim**, não em contagem com `setInterval`, para sobreviver ao app em segundo plano e à tela bloqueada.
  - Duração padrão = **máximo** da faixa de descanso do plano. Botões −15 s, +15 s e Pular.
  - Mostra "A seguir: exercício, série e carga".
  - No fim: vibração (`navigator.vibrate`, onde existir) **e** som curto (Web Audio, gerado no app, sem arquivo externo).
  - Durante o treino, **Screen Wake Lock** para manter a tela ligada (configurável).
  - **Limitação conhecida:** no iOS não há API de vibração e os timers podem pausar em segundo plano. Com Wake Lock e som, funciona com a tela ligada. Ao voltar ao app, o cronômetro mostra o tempo certo graças ao timestamp. Documente isso para o usuário.

### 9.6 Fim do treino
- Resumo: duração, nº de séries, volume total (kg × reps), recordes (melhor e1RM ou melhor carga × reps de cada variante).
- Lista **"Para o próximo treino"** com as sugestões (seção 7.6).
- Botões: **Cardio** e **Fechar**.
- Treino aberto há mais de 4 horas: pergunte ao abrir o app se deve encerrar.

### 9.7 Cardio
- Chips de tipo (os do plano + "Outro"), duração (min), FC média (bpm, opcional), distância (km, opcional), esforço 0-10 (opcional), data (padrão hoje).
- Comparação com a meta do plano: dentro ou fora da duração e da faixa de FC.
- Disponível em qualquer dia, inclusive sem treino de força.

### 9.8 Histórico
- Seletor de exercício e variante (busca por nome). Lista também os exercícios fora do plano ativo.
- KPIs: **1RM estimado** atual e variação em 8 semanas; **melhor série** (carga × reps e data).
- **Gráfico:** melhor e1RM por semana (linha). Marque as semanas de deload. SVG próprio ou uma lib pequena; nada pesado.
- Lista de treinos: data, `kg × reps·reps·reps`. Toque abre o treino completo.
- Visão "Treinos": lista cronológica dos treinos e do cardio, com detalhes e opção de editar ou excluir (com confirmação).

### 9.9 Plano e dados (aba Plano)
- Plano ativo: nome, data de importação, início do bloco, **semana atual com −/+**.
- Lista de exercícios com **salto (kg)** e **foco** editáveis.
- **Importar novo plano.** Planos anteriores ficam listados, somente leitura.
- **Exportar:** Histórico em PDF · Planilha CSV · **Backup completo (.json)**.
- **Restaurar backup:** substituir tudo ou mesclar sem duplicar (por id), com confirmação.
- Aviso de backup: se o último foi há mais de 30 dias, mostre um lembrete discreto no Início.
- Texto fixo: "Seus dados ficam só neste celular. Sem conta, sem internet, sem nuvem."

---

## 10. Exportação e backup

- **CSV de séries** (UTF-8 com BOM, separador `;`, decimal com vírgula, para abrir direto no Excel em pt-BR):
  `data;sessao;exercicio;variante;serie;kg;reps;rir;aquecimento;semana_bloco;fase;plano`
- **CSV de cardio:** `data;tipo;minutos;fc_media;distancia_km;esforco`
- **PDF do histórico:** gerado no aparelho (ex.: jsPDF, ou uma página de impressão estilizada com `window.print()`; escolha e justifique). Conteúdo: período, resumo por exercício (melhor série, e1RM inicial → atual), tabela de treinos e cardio.
- **Backup JSON:** `{ app: 'app-treino', versaoSchema, exportadoEm, planos, treinos, series, cardio, configExercicios, preferencias }`. A restauração valida `app` e `versaoSchema` e aplica migrações.
- **Compartilhar:** Web Share API com arquivos (`navigator.canShare({files})`). Se não houver suporte, faça o download. O nome do arquivo leva a data: `treino-backup-2026-11-09.json`.

---

## 11. PWA, offline e segurança dos dados

- **Service worker** (ex.: `vite-plugin-pwa`/Workbox) com precache de todo o app, incluindo o worker do pdf.js, as fontes e os ícones.
- **Manifest:** nome "App de Treino" (provisório, ver seção 18), `display: standalone`, `orientation: portrait`, cores do tema escuro, ícones 192/512 e maskable.
- **Atualização:** nunca recarregue sozinho. Com versão nova, mostre "Atualização disponível" e aplique só fora de um treino em andamento.
- **Persistência:** chame `navigator.storage.persist()` na primeira execução e mostre o status em "Plano e dados".
- **iOS/Safari:** um site **não instalado** pode ter o armazenamento apagado após dias sem uso. **Oriente a instalar na tela inicial** com uma tela de boas-vindas que explica como fazer no Android e no iOS. Os lembretes de backup são a rede de segurança.
- **Nunca perder dados:** cada série é gravada **no momento em que é concluída** (não só no fim do treino). O estado do treino em andamento é persistido para retomar depois de fechar o app ou o celular reiniciar.
- **Migrações de schema** testadas, com fixture de cada versão.
- **Privacidade:** nenhuma requisição externa. Teste automatizado que falha se o bundle tiver URLs `http(s)://` de terceiros em código de execução.

---

## 12. Design

Tema escuro (mesmos tokens dos mockups aprovados):

| Token | Valor | Uso |
|---|---|---|
| `bg` | `#0d1117` | fundo |
| `surface` | `#161b22` | cartões |
| `border` | `#262c36` / `#30363d` | bordas |
| `text` | `#e6edf3` | texto principal |
| `muted` | `#8b949e` / `#7d8590` | secundário |
| `primary` | `#2ea043` (texto/realce `#58d68d`) | ação principal, concluído, ↑ |
| `info` | `#58a6ff` | links, variantes |
| `ss` | `#b392f0` | etiqueta de bi-set |
| `warn` | `#e3b341` | alertas, ! |
| `down` | `#f0883e` | sugestão ↓ |
| `error` | `#f85149` | erros |

- **Fonte:** Inter, auto-hospedada (woff2 no bundle).
- **Toque:** alvos ≥ 44 px; ação principal sempre no terço inferior da tela; nada essencial depende de gesto oculto.
- **Números grandes** nos campos de kg, reps e no cronômetro, com dígitos tabulares.
- **Acessibilidade:** contraste AA, labels nos inputs, foco visível, `prefers-reduced-motion` respeitado.
- Sem dependência de biblioteca de UI pesada. Componentes próprios e simples.

---

## 13. Stack recomendada

> Sugestão. Você pode propor outra em `ARCHITECTURE.md`, desde que justifique e respeite a seção 2.

| Camada | Recomendação | Motivo |
|---|---|---|
| Build | **Vite** | rápido, PWA plugin maduro |
| Linguagem | **TypeScript** (strict) | modelo de dados e regras críticas |
| UI | **Preact** + hooks (ou React) | leve, ecossistema conhecido |
| Estado | stores simples (signals ou Zustand) | evitar boilerplate |
| Persistência | **Dexie** (IndexedDB) | migrações e índices fáceis |
| PDF | **pdfjs-dist** (worker local) | já validado no protótipo |
| PWA | **vite-plugin-pwa** (Workbox) | precache e update prompt |
| Gráfico | SVG próprio ou **uPlot** | leve |
| Testes unitários | **Vitest** | parser, periodização, motor de carga, migrações, CSV |
| Testes E2E | **Playwright** (viewport mobile, offline) | fluxos principais |
| Lint/format | ESLint + Prettier | — |
| Deploy | **GitHub Pages** via GitHub Actions | gratuito e estático |

**Organização sugerida** (detalhe no `ARCHITECTURE.md`):
```
src/
  dominio/      # puro, sem UI: formato (parser), periodizacao, progressao (motor de carga), rotacao, e1rm
  dados/        # Dexie: schema, migrações, repositórios, backup/restore, export CSV/PDF
  pdf/          # extração de texto (pdf.js)
  app/          # estado global, roteamento, máquina de estados do treino
  ui/           # telas e componentes
  estilo/       # tokens e CSS
tests/          # unit + e2e + fixtures (copiar fixtures/ do kit)
```
**A camada `dominio/` não pode depender de UI nem de IndexedDB**: funções puras, 100% testadas.

**Idioma do código:** termos de domínio em português, consistentes com o formato (`sessao`, `serie`, `prescricao`), como na referência. Termos técnicos genéricos podem ficar em inglês. Comentários em português.

---

## 14. Máquina de estados do treino

Descreva e implemente explicitamente (ex.: reducer ou XState-lite):

```
Ocioso → (iniciar sessão) → Exercicio(i)
Exercicio(i): escolherVariante → RegistrandoSerie(i, s)
RegistrandoSerie → concluir →
   se bi-set e há próximo no grupo com séries restantes → RegistrandoSerie(próximo do grupo)
   senão → Descanso(fim = agora + descanso)
Descanso → (fim | pular) →
   se exercício (ou grupo) tem séries restantes → RegistrandoSerie
   senão se há próximo exercício → Exercicio(i+1)
   senão → Resumo
Qualquer estado → (pular exercício | ir para exercício j | editar série | adicionar série)
Resumo → (fechar) → Ocioso   [treino.status = concluido]
Treino aberto pode ser descartado (confirmação) → status = descartado
```
O estado é persistido a cada transição (`Treino.estadoUI`).

---

## 15. Qualidade e testes

- **Unitários (obrigatórios):** todos os casos das seções 5.6 e 7.5, mais periodização (6.2), rotação (6.3), semana do bloco (6.1), bi-set com séries desiguais, CSV (BOM, vírgula decimal), backup → restauração → mesmo estado, migrações.
- **E2E (Playwright, viewport 390×844, modo offline após a 1ª carga):**
  1. Importar `fixtures/raul-com-anexo-ok.pdf` → revisar → salvar.
  2. Importar PDF sem anexo → ver o erro.
  3. Fazer um treino Push completo com bi-set, fechar a aba no meio, reabrir e continuar.
  4. Ver a sugestão ↑ no fim e a carga pré-preenchida no treino seguinte.
  5. Registrar cardio; exportar CSV; fazer backup, limpar os dados e restaurar.
- **Performance:** a primeira tela interativa em < 2 s num Android médio, com cache; JS inicial < 200 KB gzip, **sem contar o pdf.js** (carregar sob demanda só na importação).
- **Revisão em dispositivo real** (Android e iPhone) antes do "pronto" de cada marco com UI.

---

## 16. Deploy e instalação

- Repositório no GitHub (nome a confirmar). GitHub Actions: lint → testes → build → deploy no GitHub Pages. Configure o `base` do Vite para o caminho do repositório.
- `README.md` com: como rodar, testar e publicar; **como instalar no Android** (Chrome → "Instalar app") **e no iPhone** (Safari → Compartilhar → "Adicionar à Tela de Início"); onde fica o contrato da IA; como fazer backup.
- O link é o mesmo para os dois usuários. Os dados não se misturam, porque cada um fica no próprio celular.

---

## 17. Plano de marcos (sugestão — refine em `PLAN.md`)

| Marco | Entrega | Critério de aceite |
|---|---|---|
| **M0 · Base** | Projeto Vite+TS, lint, Vitest, Playwright, PWA "hello", deploy no Pages, tokens de design | App abre offline depois da 1ª visita; CI verde; URL pública funcionando |
| **M1 · Formato** | `dominio/formato` (parser), `pdf/` (extração), testes da seção 5.6 | Todos os casos da tabela 5.6 passam como testes |
| **M2 · Dados e plano** | Schema Dexie e migrações, telas Importar e Revisar, plano ativo, vínculo de exercícios, semana do bloco | Importar o PDF do Raul pelo app no celular; recarregar e o plano continua lá |
| **M3 · Treino** | Início, Registro da série, bi-set, descanso (timestamp, som, vibração, wake lock), máquina de estados, retomar treino | Push completo no celular com no máximo 2 toques por série quando a sugestão está certa; fechar e reabrir no meio sem perder nada |
| **M4 · Inteligência** | Periodização aplicada, motor de carga, tela de fim, pré-preenchimento, alertas | Todos os cenários da seção 7.5 como testes; sugestão visível no fim e aplicada no treino seguinte |
| **M5 · Cardio e histórico** | Cardio, Histórico com gráfico, lista de treinos e edição | Gráfico de e1RM correto com os dados de teste |
| **M6 · Dados** | CSV, PDF, backup e restauração, lembrete de backup, `storage.persist` | Backup → limpar → restaurar com resultado idêntico; CSV abre certo no Excel |
| **M7 · Polimento** | Onboarding de instalação, update prompt, acessibilidade, performance, README, testes em dispositivo | Checklist da seção 15 completo; Thiago e Raul instalam e fazem um treino real |

Depois de cada marco: demonstração curta (o que testar no celular) e lista de pendências.

---

## 18. Decisões em aberto (pergunte ao Thiago na Fase 0)

1. **Celulares:** Thiago e Raul usam Android ou iPhone? Isso define a prioridade dos testes e a experiência do cronômetro (seção 9.5).
2. **Nome do app** e do repositório no GitHub. A conta GitHub já existe?
3. **Saudação na tela inicial:** usar o nome do campo `PLANO` (pessoa) ou um campo de nome na configuração?
4. **Duração padrão do descanso:** usar o máximo da faixa (recomendado) ou o mínimo?
5. **Exportação em PDF:** é necessária na v1 ou o CSV basta? Isso afeta a dependência de jsPDF.
6. **Plano do Thiago:** ele ainda vai gerar o PDF com anexo na IA dele. Até lá, use as fixtures do Raul.

---

## 19. Definição de pronto (v1)

- [ ] Os dois usuários instalaram o app e fizeram ao menos um treino real completo, offline.
- [ ] O PDF de cada IA (Thiago e Raul) importa sem erro.
- [ ] Testes unitários e E2E verdes no CI; deploy automático funcionando.
- [ ] Nenhuma requisição de rede após a instalação (verificado).
- [ ] Backup e restauração verificados num celular real.
- [ ] README com instalação, backup e contrato da IA.

---

## Anexos do kit

| Caminho | O que é |
|---|---|
| `docs/Proposta - App de Treino.pdf` | Proposta **aprovada**: fluxogramas, 9 telas, regras e escopo |
| `docs/contrato-treino-v1.txt` | Prompt que cada usuário cola na própria IA (fonte do formato) |
| `referencia/parser/parser.js` | Parser TREINO v1 + `prescricao()` (JS, testado) |
| `referencia/parser/extrair-pdf.js` | Extração de texto por linhas com pdf.js |
| `referencia/parser/progressao.js` | Motor de sugestão de carga (testado) |
| `referencia/teste/*.mjs` | Scripts de verificação (parser em PDF/texto, casos de erro, 16 cenários de carga) |
| `fixtures/raul.treino.txt` | Plano do Raul no formato (5 sessões, 30 exercícios) |
| `fixtures/raul-com-anexo-ok.pdf` | PDF real do Raul + anexo (caso feliz) |
| `fixtures/raul-com-anexo-estresse.pdf` | Mesmo plano com fonte grande, quebra de linha, acentos e travessões |
| `fixtures/plano-original-raul.pdf` | PDF original, sem anexo (caso de erro) |

A referência é **especificação**, não código de produção: porte para TypeScript, organize nos módulos do `ARCHITECTURE.md` e mantenha o comportamento coberto por testes.
