

# Plano: Simuladores de Química Farmacêutica

## Análise de Mercado

A Química Farmacêutica (Medicinal Chemistry) é disciplina central nos cursos de Farmácia e Química, mas quase 100% do ensino ainda depende de slides estáticos e livros. Não existe plataforma concorrente com simuladores interativos nesta área. Isso representa uma oportunidade única de posicionamento.

---

## 8 Simuladores Propostos

### 1. Relação Estrutura-Atividade (SAR Explorer)
- Selecionar um scaffold (ex: benzodiazepínico, sulfonamida, fluoroquinolona)
- Adicionar/remover substituintes (halogênios, OH, NH₂, CH₃, CF₃) em posições do anel
- Observar em tempo real: variação de potência (pIC50), lipofilia (logP), solubilidade e seletividade
- Gráfico: radar chart com propriedades + barra de potência relativa
- **Diferencial**: nenhum concorrente permite manipulação SAR interativa

### 2. Propriedades Físico-Químicas e Regra de Lipinski
- Inserir ou selecionar estruturas e calcular MW, logP, HBD, HBA, PSA, rotatable bonds
- Visualizar "espaço de druglikeness" com Regra dos 5 de Lipinski e extensões (Veber, Ghose)
- Gráfico: scatter plot MW vs logP com zona de druglikeness destacada
- Comparar múltiplos fármacos simultaneamente
- **Diferencial**: filtro de druglikeness visual e interativo para ensino de design de fármacos

### 3. Isosteria e Bioisosterismo
- Selecionar grupo funcional original (ex: -COOH, -OH, éster, amida)
- Explorar bioisósteros clássicos e não-clássicos com impacto em: pKa, logP, estabilidade metabólica
- Gráfico comparativo: propriedades do original vs bioisóstero (barras agrupadas)
- Casos reais: celecoxibe vs rofecoxibe, losartan vs valsartan
- **Diferencial**: ensino visual de estratégias de otimização molecular

### 4. Metabolismo de Fármacos e Pró-Fármacos
- Selecionar fármaco e visualizar reações de Fase I (CYP450: oxidação, redução, hidrólise) e Fase II (conjugação)
- Manipular atividade de CYP específicas e ver metabólitos gerados
- Simular pró-fármacos: ativação de enalapril→enalaprilato, codeína→morfina, clopidogrel→metabólito ativo
- Gráfico: cinética de conversão pró-fármaco → fármaco ativo vs tempo
- **Diferencial**: ponte visual entre química estrutural e farmacocinética clínica

### 5. Interação Fármaco-Receptor (Docking Simplificado)
- Selecionar alvo (receptor, enzima) e ligante
- Visualizar tipos de interação: ligação H, van der Waals, iônica, π-π stacking, hidrofóbica
- Manipular distância e orientação do ligante e observar variação da afinidade (ΔG, Ki)
- Gráfico: energia de ligação vs distância + diagrama de interações 2D
- **Diferencial**: conceitos de drug design molecular sem precisar de software complexo

### 6. Quiralidade e Estereoquímica Farmacológica
- Comparar enantiômeros R/S do mesmo fármaco (ex: omeprazol vs esomeprazol, ibuprofeno R vs S, talidomida)
- Visualizar diferenças em: potência, seletividade, toxicidade e metabolismo
- Gráficos: barras comparativas de atividade dos enantiômeros + distomer vs eutomer
- Conceitos: razão eudísmica, switch quiral, racemato vs enantiômero puro
- **Diferencial**: tema clássico mas sem ferramenta interativa de comparação

### 7. pKa, Ionização e Absorção de Fármacos
- Selecionar fármaco (ácido fraco, base fraca, anfótero/zwitterion)
- Manipular pH do meio (estômago pH 1.5, duodeno pH 6, sangue pH 7.4)
- Calcular fração ionizada/não-ionizada (Henderson-Hasselbalch) e prever absorção
- Gráfico: % forma não-ionizada vs pH com destaque dos compartimentos fisiológicos
- **Diferencial**: conecta físico-química com biofarmácia de forma visual e imediata

### 8. Planejamento Racional de Fármacos (QSAR Simplificado)
- Selecionar série congênere (ex: sulfonamidas, barbitúricos)
- Manipular descritores (logP, σ Hammett, Es de Taft, MR)
- Observar correlação com atividade biológica (equação de Hansch)
- Gráfico: regressão logP vs log(1/C) com parabólica de Hansch e ponto ótimo
- **Diferencial**: QSAR acessível e visual, sem necessidade de software estatístico

---

## Padrão Técnico (idêntico aos existentes)

Cada simulador seguirá a arquitetura consolidada:
- Sliders interativos + gráficos Recharts em tempo real
- 3 casos built-in + geração de casos com IA (`useSimulatorCases`)
- Integração com salas virtuais (`useVirtualRoomCase`) e modo exame (`ExamBanner`/`ExamFeedbackOverlay`)
- Desafios educativos (`SimulatorChallengeMode`) com 8-12 questões MCQ e ajuste de parâmetros
- Prompt viewer para admin (`AdminPromptViewer`)
- Categoria: **"Química Farmacêutica"** no catálogo

---

## Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/simuladores/quimica-farmaceutica/SimuladorSAR.tsx` |
| Criar | `src/pages/simuladores/quimica-farmaceutica/SimuladorLipinski.tsx` |
| Criar | `src/pages/simuladores/quimica-farmaceutica/SimuladorBioisosterismo.tsx` |
| Criar | `src/pages/simuladores/quimica-farmaceutica/SimuladorMetabolismo.tsx` |
| Criar | `src/pages/simuladores/quimica-farmaceutica/SimuladorDocking.tsx` |
| Criar | `src/pages/simuladores/quimica-farmaceutica/SimuladorQuiralidade.tsx` |
| Criar | `src/pages/simuladores/quimica-farmaceutica/SimuladorPkaAbsorcao.tsx` |
| Criar | `src/pages/simuladores/quimica-farmaceutica/SimuladorQSAR.tsx` |
| Editar | `src/pages/Simuladores.tsx` — adicionar 8 entradas na categoria "Química Farmacêutica" |
| Editar | `src/App.tsx` — registrar 16 rotas (8 diretas + 8 sala virtual) |
| Editar | `src/data/simulatorChallenges.ts` — desafios educativos para cada simulador |
| Editar | `src/data/nativeSystemPrompts.ts` — prompts de geração IA para cada simulador |

