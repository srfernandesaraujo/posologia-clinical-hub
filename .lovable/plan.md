

## Plano: Simulador de Manejo da Dor e Analgesia

### Visão Geral
Criar o simulador **"Manejo da Dor e Analgesia"** (slug: `manejo-dor`) na categoria **Farmacologia Clínica**, baseado no conteúdo das 6 aulas sobre dor. O simulador terá gráficos dinâmicos com Recharts, botão "Iniciar" para simulação animada, 5 casos clínicos nativos e modo desafio.

### Conceito Pedagógico
O aluno recebe um paciente com dor e deve:
1. **Classificar o tipo de dor** (nociceptiva, neuropática, fibromialgia, oncológica)
2. **Avaliar intensidade** (EVA 0-10) e comorbidades
3. **Selecionar tratamento** pela Escala Analgésica da OMS (Degraus 1-3)
4. **Ajustar doses** via sliders e observar gráficos dinâmicos de: curva de concentração plasmática (Cp x t), nível de dor ao longo do tempo, efeitos adversos
5. **Interpretar consequências** das escolhas (toxicidade hepática do paracetamol, elevação da PA por AINEs, depressão respiratória por opioides, tolerância)

### Elementos Interativos Dinâmicos (botão Iniciar)
- **Gráfico 1 — Escala de Dor (EVA)**: Linha animada mostrando a intensidade da dor nas primeiras 72h conforme o tratamento escolhido
- **Gráfico 2 — Concentração Plasmática**: Curvas Cp x t dos fármacos escolhidos com faixa terapêutica e limiar de toxicidade
- **Gráfico 3 — Efeitos Adversos**: BarChart mostrando risco relativo de EA (constipação, náusea, depressão respiratória, nefrotoxicidade, hepatotoxicidade)
- **Painel de Sinais Vitais**: FC, PA, FR, SpO2 — reagindo em tempo real às escolhas farmacológicas

### Parâmetros Ajustáveis (Sliders)
- Classe farmacológica (não-opioide, opioide fraco, opioide forte, adjuvante)
- Fármaco específico dentro da classe
- Dose (mg) com limites baseados em evidência
- Intervalo posológico (h)
- Via de administração (VO, EV, TD, SC)
- Adjuvantes (gabapentina, pregabalina, duloxetina, amitriptilina)

### 5 Casos Clínicos Nativos

| # | Tipo de Dor | Título | Cenário |
|---|-------------|--------|---------|
| 1 | **Aguda** | Dor pós-operatória | Paciente 45 anos, pós-colecistectomia, EVA 7/10, sem comorbidades. Escalonamento de analgésicos não-opioides a opioides fracos. |
| 2 | **Neuropática** | Lombalgia com radiculopatia | Paciente 62 anos (caso J.P. das aulas), HAS, obesidade, depressão. Paracetamol ineficaz, dose excessiva. Antidepressivos/anticonvulsivantes como alternativa. |
| 3 | **Fibromialgia** | Fibromialgia com insônia | Mulher 38 anos, dor difusa crônica, fadiga, sono não-reparador. Sensibilização central. Duloxetina + pregabalina + terapia não-farmacológica. Opioides contraindicados. |
| 4 | **Oncológica** | Dor oncológica — Escalonamento | Paciente 58 anos (caso L.V.), carcinoma estágio IV, dor neuropática + nociceptiva. Escala OMS degrau 3: morfina → hidromorfona → fentanil TD. Manejo de tolerância. |
| 5 | **Oncológica (avançada)** | Rotação de opioides e desmame | Continuação do caso L.V. Tolerância ao fentanil, intoxicação opioide, rotação para metadona, planejamento de desmame. Síndrome de abstinência. |

### Arquivos a Criar
- `src/pages/simuladores/SimuladorManejoDor.tsx` — Componente principal (~800 linhas)

### Arquivos a Editar
- `src/pages/Simuladores.tsx` — Adicionar entrada no array NATIVE_SIMULATORS (categoria "Farmacologia Clínica")
- `src/App.tsx` — Adicionar rotas `/simuladores/manejo-dor` e `/sala/simulador/manejo-dor/:visitorId`
- `src/hooks/useSimulatorCases.ts` — Adicionar slug `manejo-dor` ao SIMULATOR_SLUGS
- `src/pages/SalasVirtuais.tsx` — Adicionar ao SIMULATOR_OPTIONS na categoria "Farmacologia Clínica"
- `src/data/nativeCaseCatalog.ts` — Adicionar os 5 casos nativos
- `src/data/nativeSystemPrompts.ts` — Adicionar system prompt para geração de casos IA
- `src/data/simulatorChallenges.ts` — Adicionar 10 desafios (mix de múltipla escolha e ajuste)

### Padrão Técnico
Segue exatamente o padrão dos simuladores existentes: `useSimulatorCases`, `useVirtualRoomCase`, `ExamBanner`, `ExamFeedbackOverlay`, `SimulatorChallengeMode`, botão "Mostrar Resultados" com redirecionamento 15s, suporte light/dark mode.

