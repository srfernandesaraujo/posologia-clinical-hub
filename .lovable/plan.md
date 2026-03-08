

# Plano: Simuladores de Farmacotécnica

## Análise de Mercado

A Farmacotécnica (Tecnologia Farmacêutica) é disciplina obrigatória em todos os cursos de Farmácia e extremamente carente de ferramentas digitais interativas. Os concorrentes oferecem no máximo vídeos ou PDFs — **nenhum** tem simuladores com gráficos em tempo real e manipulação de variáveis. Isso cria uma oportunidade enorme.

---

## 8 Simuladores Propostos

### 1. Estabilidade e Prazo de Validade (Cinética de Degradação)
- Simular degradação de ordem zero, primeira ordem e segunda ordem
- Manipular temperatura (Arrhenius), pH e concentração inicial
- Calcular t90 (prazo de validade) em tempo real com sliders
- Gráfico Recharts: concentração residual vs tempo sob diferentes condições
- **Diferencial**: substituir cálculos manuais de Arrhenius por visualização instantânea

### 2. Sistemas de Liberação de Fármacos (Release Profiles)
- Comparar perfis de liberação: imediata, prolongada, entérica, pulsátil e transdérmica
- Modelos cinéticos: Higuchi, Korsmeyer-Peppas, ordem zero
- Manipular espessura de revestimento, polímero, tamanho de partícula
- Gráfico: % liberada vs tempo com múltiplas curvas sobrepostas
- **Diferencial**: visualizar como cada parâmetro da formulação altera o perfil de liberação

### 3. Cálculos de Diluição e Concentração
- Diluição simples (C1V1 = C2V2) e seriada
- Conversão entre %, mg/mL, mEq/L, mmol/L, UI/mL
- Cálculos de isotonia (método do equivalente em NaCl)
- Interface: sliders + campos numéricos com resultado em tempo real
- **Diferencial**: ferramenta prática para bancada, resolve dúvidas do dia-a-dia

### 4. Reologia e Viscosidade de Semissólidos
- Simular comportamentos reológicos: newtoniano, pseudoplástico, dilatante, tixotrópico
- Manipular taxa de cisalhamento e observar viscosidade aparente
- Aplicar espessantes (carbômero, HPMC) e ver mudança no reograma
- Gráfico: tensão de cisalhamento vs taxa de cisalhamento (reograma)
- **Diferencial**: único simulador interativo de reologia farmacêutica no mercado

### 5. Equilíbrio HLB e Formulação de Emulsões
- Selecionar fase oleosa e calcular HLB requerido
- Misturar tensoativos (Span/Tween) para atingir HLB alvo (método de Griffin)
- Visualizar estabilidade: separação de fases, creaming, coalescência
- Gráfico: estabilidade vs HLB com zona ótima destacada
- **Diferencial**: tornar o sistema HLB intuitivo com feedback visual imediato

### 6. Granulometria e Distribuição de Tamanho de Partículas
- Simular peneiramento com diferentes malhas (mesh/Tyler)
- Gráficos: histograma de frequência e curva acumulativa log-normal
- Calcular D10, D50, D90 e span (dispersão)
- Manipular parâmetros de moagem e ver impacto na distribuição
- **Diferencial**: laboratório virtual de controle de qualidade de pós

### 7. Compressão de Comprimidos (Heckel e Kawakita)
- Simular processo de compressão direta e granulação úmida
- Manipular força de compressão, tamanho de grânulo e lubrificante
- Gráficos de Heckel (ln[1/(1-D)] vs P) e Kawakita (P/C vs P)
- Observar dureza, friabilidade e tempo de desintegração resultantes
- **Diferencial**: substitui equipamento de laboratório caro por simulação fiel

### 8. Tampão Farmacêutico e pH de Formulações
- Preparar sistemas tampão (fosfato, citrato, acetato, borato)
- Equação de Henderson-Hasselbalch interativa com sliders
- Calcular capacidade tamponante (β) e zona útil de tamponamento
- Simular adição de ácido/base e observar variação do pH
- **Diferencial**: essencial para formulação de injetáveis e colírios, sem concorrente interativo

---

## Padrão Técnico (idêntico aos existentes)

Cada simulador seguirá a mesma arquitetura:
- Sliders interativos + gráficos Recharts em tempo real
- 3 casos clínicos built-in + geração de casos com IA (`useSimulatorCases`)
- Integração com salas virtuais (`useVirtualRoomCase`) e modo exame (`ExamBanner`/`ExamFeedbackOverlay`)
- Desafios educativos (`SimulatorChallengeMode`) com 8-12 questões MCQ e ajuste de parâmetros
- Prompt viewer para admin (`AdminPromptViewer`)
- Categoria: **"Farmacotécnica"** no catálogo

---

## Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/simuladores/farmacotecnica/SimuladorEstabilidade.tsx` |
| Criar | `src/pages/simuladores/farmacotecnica/SimuladorLiberacaoFarmacos.tsx` |
| Criar | `src/pages/simuladores/farmacotecnica/SimuladorDiluicao.tsx` |
| Criar | `src/pages/simuladores/farmacotecnica/SimuladorReologia.tsx` |
| Criar | `src/pages/simuladores/farmacotecnica/SimuladorHLB.tsx` |
| Criar | `src/pages/simuladores/farmacotecnica/SimuladorGranulometria.tsx` |
| Criar | `src/pages/simuladores/farmacotecnica/SimuladorCompressao.tsx` |
| Criar | `src/pages/simuladores/farmacotecnica/SimuladorTampao.tsx` |
| Editar | `src/pages/Simuladores.tsx` — adicionar 8 entradas na categoria "Farmacotécnica" |
| Editar | `src/App.tsx` — registrar 16 rotas (8 diretas + 8 sala virtual) |
| Editar | `src/data/simulatorChallenges.ts` — desafios educativos |
| Editar | `src/data/nativeSystemPrompts.ts` — prompts de geração IA |

