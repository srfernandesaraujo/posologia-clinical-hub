

## Plano: Simulador de Infecções e Antibioticoterapia

### Visao Geral
Criar o simulador **"Infecções e Antibioticoterapia"** (slug: `infeccoes-antibioticos`) na categoria **Farmacologia Clínica**, baseado nas 6 aulas (11-16) sobre ITU (epidemiologia, tratamento, grupos especiais) e Diarreia Infecciosa (tipos, disenteria vs diarreia aquosa, complicacoes). Seguira o padrao dos simuladores existentes com botao "Iniciar", graficos dinamicos Recharts e modo desafio.

### Conceito Pedagogico
O aluno recebe um paciente com infeccao (ITU ou diarreia infecciosa) e deve:
1. **Classificar a infeccao** (ITU nao-complicada, ITU complicada/pielonefrite, ITU de repeticao, diarreia aquosa, disenteria)
2. **Interpretar exames** (uroanalise: nitrito, esterase, piuria, cultura; coprocultura, leucocitos fecais)
3. **Selecionar antibiotico** conforme algoritmo de seleção (espectro, resistencia local, concentracao urinaria/intestinal)
4. **Ajustar dose e duracao** via sliders, considerando grupo especial (gestante, idoso, DRC, crianca, cateter)
5. **Observar dinamicamente** nos graficos: carga bacteriana ao longo do tempo, concentracao do antibiotico no sitio de infeccao, e riscos de efeitos adversos

### Elementos Interativos Dinamicos (botao Iniciar)
- **Grafico 1 -- Carga Bacteriana (UFC/mL x tempo)**: LineChart animado mostrando a reducao da contagem bacteriana ao longo de 7-14 dias conforme o antibiotico e dose escolhidos. Linha de referencia em 10^5 UFC/mL (limiar de ITU)
- **Grafico 2 -- Concentracao no Sitio (Cp x t)**: Curva do antibiotico no plasma e no sitio-alvo (urina ou intestino) com MIC do patogeno como linha de referencia
- **Grafico 3 -- Riscos de Efeitos Adversos**: BarChart com risco relativo por sistema (GI, tendinite/ruptura, nefrotoxicidade, disbiose/C.difficile, fotossensibilidade, prolongamento QT)
- **Painel Clinico**: Temperatura, leucocitos, PCR, sintomas residuais -- reagindo em tempo real

### Parametros Ajustaveis (Sliders/Selects)
- Tipo de infeccao (ITU nao-complicada / ITU complicada / Pielonefrite / Diarreia aquosa / Disenteria)
- Classe do antibiotico (Fluoroquinolona, Betalactamico, Sulfonamida, Nitrofurantoina, Fosfomicina, Macrolideo, Aminoglicosideo)
- Farmaco especifico: ITU (nitrofurantoina, fosfomicina, SMX-TMP, ciprofloxacino, norfloxacino, amoxicilina, cefalexina, ceftriaxona) e Diarreia (ciprofloxacino, azitromicina, metronidazol, doxiciclina, SRO)
- Dose (mg) com limites baseados em evidencia
- Intervalo posologico (h) e duracao do tratamento (dias)
- Via de administracao (VO, EV, IM)
- Grupo especial (toggles: gestante, idoso >65a, DRC, crianca, cateter vesical, imunossuprimido)
- Hidratacao/SRO (para diarreia)

### 5 Casos Clinicos Nativos

| # | Condicao | Titulo | Cenario |
|---|----------|--------|---------|
| 1 | **ITU nao-complicada** | Cistite em mulher jovem -- Selecao de antibiotico | V.Q., 20 anos, disuria, polaciuria, dor suprapubica, sem febre. Uroanalise: nitrito+, leucocitos 10-15/campo, bastonetes gram-negativos. Aluno deve selecionar entre nitrofurantoina, fosfomicina ou SMX-TMP conforme padroes de resistencia local. Evitar fluoroquinolonas na ITU nao-complicada. |
| 2 | **ITU complicada / Pielonefrite** | Pielonefrite com escalonamento | M.R., 35 anos, febre 38.8C, dor lombar, nausea, vomito, leucocitose. Urocultura: E. coli ESBL. Aluno escala de VO para EV (ceftriaxona -> ertapenem), interpreta antibiograma, planeja step-down. |
| 3 | **ITU em grupo especial -- Gestante** | ITU na gestacao -- Antibioticos seguros | A.L., 28 anos, 24 semanas gestacao, bacteriuria assintomatica com E. coli. Aluno identifica que bacteriuria assintomatica DEVE ser tratada na gestante. Seleciona antibiotico seguro (cefalexina, amoxicilina, nitrofurantoina ate 36 sem). Contraindica SMX-TMP (1o/3o tri) e fluoroquinolonas. |
| 4 | **Diarreia aquosa vs Disenteria** | Diarreia infecciosa -- Algoritmo de conduta | J.S., 45 anos, diarreia aquosa ha 3 dias, sem sangue, sem febre. Aluno diferencia diarreia aquosa (viral/toxigenica) de disenteria, decide por SRO + medidas nao-farmacologicas. Evolucao: paciente retorna com fezes sanguinolentas e febre -> disenteria, aluno seleciona ciprofloxacino ou azitromicina. |
| 5 | **Complicacoes da diarreia** | Diarreia grave com desidratacao e C. difficile | F.T., 72 anos, internado, diarreia pos-antibioticoterapia (clindamicina), desidratacao moderada, toxina C. difficile positiva. Aluno corrige desidratacao (SRO/EV), suspende antibiotico causador, inicia metronidazol ou vancomicina oral. Monitora complicacoes: megacolon toxico, disturbio eletrolitico. |

### Arquivos a Criar
- `src/pages/simuladores/SimuladorInfeccoesAntibioticos.tsx` -- Componente principal (~800 linhas)

### Arquivos a Editar
- `src/pages/Simuladores.tsx` -- Adicionar entrada no array NATIVE_SIMULATORS (categoria "Farmacologia Clinica")
- `src/App.tsx` -- Adicionar rotas `/simuladores/infeccoes-antibioticos` e `/sala/simulador/infeccoes-antibioticos/:visitorId`
- `src/hooks/useSimulatorCases.ts` -- Adicionar slug `infeccoes-antibioticos` ao SIMULATOR_SLUGS
- `src/pages/SalasVirtuais.tsx` -- Adicionar ao SIMULATOR_OPTIONS na categoria "Farmacologia Clinica"
- `src/data/nativeCaseCatalog.ts` -- Adicionar os 5 casos nativos
- `src/data/nativeSystemPrompts.ts` -- Adicionar system prompt para geracao de casos IA
- `src/data/simulatorChallenges.ts` -- Adicionar 10 desafios (mix de multipla escolha e ajuste)

### Padrao Tecnico
Segue exatamente o padrao dos simuladores existentes: `useSimulatorCases`, `useVirtualRoomCase`, `ExamBanner`, `ExamFeedbackOverlay`, `SimulatorChallengeMode`, botao "Mostrar Resultados" com redirecionamento 15s, suporte light/dark mode.

