

## Plano: Simulador de Tratamento da Asma

### Visao Geral
Criar o simulador **"Tratamento da Asma"** (slug: `tratamento-asma`) na categoria **Farmacologia Clinica**, baseado nas 3 aulas (17-19) sobre fisiopatologia da asma, tratamento farmacologico (Steps GINA) e asma em situacoes especiais. Seguira o padrao dos simuladores existentes (ManejoDor, InflamacaoAINEs, InfeccoesAntibioticos) com botao "Iniciar", graficos dinamicos Recharts e modo desafio.

### Conceito Pedagogico
O aluno recebe um paciente asmatico e deve:
1. **Classificar a gravidade** (intermitente, persistente leve/moderada/grave) com base em sintomas e espirometria (VEF1, PFE, VEF1/CVF)
2. **Selecionar o Step GINA** (1-5) e os farmacos de controle e resgate
3. **Ajustar dose e dispositivo** via sliders (CI dose, LABA, LAMA, anti-IgE)
4. **Avaliar situacoes especiais** (gestante, crianca <5 anos, idoso, asma induzida por exercicio, asma + DRGE)
5. **Observar dinamicamente** nos graficos: funcao pulmonar (VEF1%), frequencia de crises, efeitos adversos

### Elementos Interativos Dinamicos (botao Iniciar)
- **Grafico 1 — Funcao Pulmonar (VEF1% x semanas)**: LineChart animado mostrando melhora do VEF1% predito ao longo de 12 semanas conforme o tratamento
- **Grafico 2 — Frequencia de Crises**: LineChart mostrando numero de exacerbacoes/semana, uso de SABA de resgate
- **Grafico 3 — Efeitos Adversos**: BarChart com riscos por sistema (candidíase oral, disfonia, supressao adrenal, taquicardia, tremor, osteoporose)
- **Painel Clinico**: SpO2, FR, PFE (L/min), sintomas noturnos/semana — reagindo em tempo real

### Parametros Ajustaveis (Sliders/Selects)
- Gravidade da asma (Intermitente / Persistente Leve / Moderada / Grave)
- Step GINA (1-5)
- Corticoide inalatorio: beclometasona, budesonida, fluticasona propionato, mometasona — com dose (baixa/media/alta em mcg)
- Broncodilatador de longa duracao: formoterol, salmeterol, tiotropio (LAMA)
- Resgate: salbutamol (SABA) vs formoterol+CI (MART)
- Terapia adicional: montelucaste, omalizumabe (anti-IgE), teofilina, corticoide oral
- Dispositivo inalatorio (pMDI, pMDI+espacador, DPI, nebulizador)
- Situacao especial (toggles: gestante, crianca <5 anos, idoso, exercicio, DRGE, obesidade)

### 5 Casos Clinicos Nativos

| # | Cenario | Titulo | Descricao |
|---|---------|--------|-----------|
| 1 | **Asma intermitente — Espirometria** | Classificacao e espirometria inicial | P.S., 22 anos, tosse noturna esporadica, sibilos ao esforco 1x/mes. Espirometria: VEF1 92%, VEF1/CVF 0.82, prova broncodilatadora positiva (+15%). Aluno classifica gravidade, interpreta espirometria e seleciona Step 1 GINA (SABA sob demanda ou CI+formoterol sob demanda). |
| 2 | **Asma persistente moderada — Step-up** | Escalonamento terapeutico | M.C., 35 anos, sintomas diarios, despertar noturno >1x/semana, VEF1 68%. Em uso de CI dose baixa sem controle. Aluno escalona para Step 3 (CI dose media + LABA) ou Step 4, avalia tecnica inalatoria e adesao, decide entre ICS-formoterol MART vs ICS+SABA. |
| 3 | **Asma grave — Terapia biologica** | Asma grave refrataria | R.A., 48 anos, multiplas internacoes, uso cronico de prednisona, VEF1 45%, eosinofilos elevados, IgE total 450. Aluno identifica fenomipo (alergico/eosinofilico), seleciona Step 5 (CI dose alta + LABA + LAMA + anti-IgE/anti-IL5), planeja desmame de corticoide oral. |
| 4 | **Asma na gestacao** | Asma em situacao especial — Gestante | A.F., 30 anos, 20 semanas, asma persistente leve, medo de usar CI. Aluno explica seguranca dos CI na gestacao (budesonida preferida), risco de asma nao controlada para mae e feto, seleciona step adequado. |
| 5 | **Crise asmatica aguda** | Exacerbacao grave no PS | L.T., 16 anos, dispneia intensa, FR 32, SpO2 89%, PFE 35% predito, fala em palavras. Aluno classifica gravidade da crise (grave vs risco de vida), inicia salbutamol nebulizado + ipratropio + O2 + corticoide sistemico, avalia necessidade de sulfato de magnesio EV. |

### Arquivos a Criar
- `src/pages/simuladores/SimuladorTratamentoAsma.tsx` — Componente principal (~800 linhas)

### Arquivos a Editar
- `src/pages/Simuladores.tsx` — Adicionar entrada no array NATIVE_SIMULATORS (categoria "Farmacologia Clinica")
- `src/App.tsx` — Adicionar rotas `/simuladores/tratamento-asma` e `/sala/simulador/tratamento-asma/:visitorId`
- `src/hooks/useSimulatorCases.ts` — Adicionar slug `tratamento-asma` ao SIMULATOR_SLUGS
- `src/pages/SalasVirtuais.tsx` — Adicionar ao SIMULATOR_OPTIONS na categoria "Farmacologia Clinica"
- `src/data/nativeCaseCatalog.ts` — Adicionar os 5 casos nativos
- `src/data/nativeSystemPrompts.ts` — Adicionar system prompt para geracao de casos IA
- `src/data/simulatorChallenges.ts` — Adicionar 10 desafios (mix de multipla escolha e ajuste)

### Padrao Tecnico
Segue exatamente o padrao dos simuladores existentes: `useSimulatorCases`, `useVirtualRoomCase`, `ExamBanner`, `ExamFeedbackOverlay`, `SimulatorChallengeMode`, botao "Mostrar Resultados" com redirecionamento 15s, suporte light/dark mode.

