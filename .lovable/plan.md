

## Plano: Decisões Críticas nos Laboratórios Virtuais

### Problema
Nos 7 laboratórios listados, os cards 3 e 4 são puramente observacionais -- o pesquisador apenas clica um botão e vê o resultado calculado automaticamente, sem precisar interpretar dados ou tomar decisões. Não há interdependência real entre os módulos.

### Estratégia Geral
Transformar cada card observacional em um **desafio de interpretação**: o pesquisador vê os dados brutos (gráfico, tabela) e precisa **selecionar/estimar** o resultado correto entre opções. O sistema compara a resposta do pesquisador com o valor calculado internamente e registra acerto/erro no score final.

---

### Bancada por Bancada

**1. Toxicologia** (`BancadaToxicologia.tsx`)
- **M3 (Curvas)**: Após ver as curvas dose-resposta, o pesquisador deve **estimar visualmente o ED50 e LD50** a partir do gráfico (selecionar faixa de dose via Select entre opções). O sistema compara com o valor real.
- **M4 (Parâmetros)**: Pesquisador deve **classificar a toxicidade** (escolher classe Hodge & Sterner) e **decidir se o IT é seguro** antes de ver a resposta correta. Feedback com verde/vermelho.

**2. Farmacogenômica** (`BancadaFarmacogenomica.tsx`)
- **M3 (Curvas PK)**: Após ver as 4 curvas, pesquisador deve **identificar qual fenótipo tem maior risco** (toxicidade para fármaco ativo, falha terapêutica para pró-fármaco) via Select.
- **M4 (AUC)**: Pesquisador deve **recomendar ajuste de dose** para cada fenótipo (manter/reduzir/aumentar/contraindicar) via radio buttons. Sistema valida com base no tipo prodrug/drug.

**3. Estabilidade** (`BancadaEstabilidade.tsx`)
- **M3 (Degradação)**: Pesquisador deve **estimar o t90** para cada condição a partir da curva (Select com faixas) e **identificar a ordem cinética** observando o formato da curva.
- **M4 (Arrhenius)**: Pesquisador deve **estimar o prazo de validade** a 25°C e **decidir se o produto atende prazo mínimo** regulatório (24 meses ANVISA).

**4. Controle de Qualidade** (`BancadaControleQualidade.tsx`)
- **M2 (Calibração)**: Após gerar a curva, pesquisador deve **avaliar se R² atende critério** (≥0.999) e **decidir se a curva é válida** (aprovar/rejeitar/refazer).
- **M3 (Amostras)**: Pesquisador deve **identificar outliers** na tabela de réplicas e **decidir se exclui** alguma leitura antes da validação.
- **M4 (Validação)**: Pesquisador deve **emitir o laudo** (APROVADO/REPROVADO) justificando com base nos critérios ICH, antes de ver a resposta automática.

**5. Epidemiologia** (`BancadaEpidemiologia.tsx`)
- **M3 (Tabela 2×2)**: Após ver a tabela, pesquisador deve **calcular mentalmente o OR** e selecionar a faixa correta, e **interpretar a significância** (significativo ou não) antes de ver.
- **M4 (Forest Plot)**: Pesquisador deve **identificar se há confundimento** (a magnitude do OR muda >10% com ajuste?) e **concluir causalidade vs. associação**.

**6. Biotecnologia** (`BancadaBiotecnologia.tsx`)
- **M3 (SDS-PAGE)**: Pesquisador deve **interpretar o gel**: identificar em qual faixa de peso molecular está a banda-alvo e **decidir se a solubilidade é adequada** para prosseguir ou se precisa otimizar condições.
- **M4 (Curva de Expressão)**: Pesquisador deve **identificar o tempo ótimo de coleta** (ponto de inflexão expressão vs. crescimento) e **escolher a estratégia de purificação** adequada ao tag.

**7. Microbiologia** (`BancadaMicrobiologia.tsx`)
- **M3 (Antibiograma)**: Após ver a placa de Petri, pesquisador deve **classificar cada antibiótico como S/I/R** manualmente antes de ver a resposta do sistema. Comparação visual do halo com breakpoints.
- **M4 (Curva)**: Pesquisador deve **selecionar o antibiótico de escolha** para tratamento empírico e **justificar** a escolha (menor MIC sensível, espectro, etc.).

---

### Padrão de Implementação (repetido em todos)

Cada card de decisão seguirá esta estrutura:
1. **Dados brutos visíveis** (gráfico/tabela/imagem)
2. **Formulário de decisão** (Select, RadioGroup ou Badges clicáveis)
3. **Botão "Confirmar Decisão"** que trava a escolha
4. **Feedback imediato** (ícone verde/vermelho + explicação)
5. **Score atualizado** no `handleVRSubmit` com `correct: userChoice === idealAnswer`

Cada decisão errada NÃO bloqueia o avanço (filosofia pedagógica existente), mas impacta o score final.

### Interdependência
- Respostas dos cards anteriores influenciam o contexto dos cards seguintes (ex: se o pesquisador classificou errado a toxicidade no M3, o M4 mostra as consequências clínicas da classificação errada)

### Arquivos Editados
- `src/pages/lab-virtual/BancadaToxicologia.tsx`
- `src/pages/lab-virtual/BancadaFarmacogenomica.tsx`
- `src/pages/lab-virtual/BancadaEstabilidade.tsx`
- `src/pages/lab-virtual/BancadaControleQualidade.tsx`
- `src/pages/lab-virtual/BancadaEpidemiologia.tsx`
- `src/pages/lab-virtual/BancadaBiotecnologia.tsx`
- `src/pages/lab-virtual/BancadaMicrobiologia.tsx`

### Escopo
7 arquivos, ~200-300 linhas cada. Implementação em lotes de 2-3 bancadas por vez para garantir qualidade. Começando por Toxicologia + Farmacogenômica + Microbiologia, depois Estabilidade + Controle de Qualidade, e por fim Epidemiologia + Biotecnologia.

