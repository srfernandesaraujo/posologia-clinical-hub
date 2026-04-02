

## Plano: Simulador de Inflamação e Anti-inflamatórios

### Visao Geral
Criar o simulador **"Inflamação e Anti-inflamatórios"** (slug: `inflamacao-aines`) na categoria **Farmacologia Clínica**, baseado nas 4 aulas (Aulas 7-10) sobre osteoartrite, AINEs, artrite reumatoide com corticoides e efeitos adversos dos corticoides. Seguira o mesmo padrao dos simuladores de Fisiologia com botao "Iniciar", graficos dinamicos Recharts e modo desafio.

### Conceito Pedagogico
O aluno recebe um paciente com condição inflamatória e deve:
1. **Classificar a condição** (osteoartrite vs artrite reumatoide)
2. **Selecionar o anti-inflamatório** considerando critérios de seleção do AINE (seletividade COX-1/COX-2, meia-vida, pKa) ou corticoide (potência, duração de ação)
3. **Ajustar dose e intervalo** via sliders
4. **Avaliar comorbidades e populações especiais** (HAS, úlcera péptica, osteopenia, idosos, doença renal)
5. **Observar consequências dinâmicas** nos gráficos: concentração plasmática, nível de inflamação/dor, riscos de efeitos adversos

### Elementos Interativos Dinamicos (botao Iniciar)
- **Grafico 1 -- Concentração Plasmatica (Cp x t)**: Curva animada do AINE ou corticoide ao longo de 72h, com faixa terapêutica e limiar toxico
- **Grafico 2 -- Nivel de Inflamação/Dor**: LineChart animado mostrando reducao da inflamação articular e dor (EVA) ao longo do tempo
- **Grafico 3 -- Riscos de Efeitos Adversos**: BarChart com risco relativo por sistema (GI/gastrico, cardiovascular, renal, osseo, endocrino, imunologico) -- reagindo a seletividade COX e dose de corticoide
- **Painel de Sinais Vitais**: PA, FC, TFG estimada, glicemia -- reagindo as escolhas farmacológicas

### Parametros Ajustaveis (Sliders/Selects)
- Condição inflamatória (osteoartrite / artrite reumatoide)
- Classe farmacológica (AINE não-seletivo, AINE COX-2 seletivo, Corticoide, Tópico)
- Fármaco específico: AINEs (ibuprofeno, naproxeno, diclofenaco, celecoxibe, meloxicam) e Corticoides (hidrocortisona, prednisona, prednisolona, metilprednisolona, dexametasona)
- Dose (mg) com limites baseados em evidência
- Intervalo posológico (h)
- Via de administração (VO, tópica, intra-articular)
- Gastroproteção (IBP sim/não)
- Comorbidades do paciente (toggles: HAS, DRC, úlcera péptica, osteoporose, diabetes)

### 5 Casos Clinicos Nativos

| # | Condição | Titulo | Cenário |
|---|----------|--------|---------|
| 1 | **Osteoartrite** | OA de joelho -- Seleção de AINE | R.T., 60 anos, dor joelho direito, HAS, dislipidemia, história de úlcera péptica. Paracetamol insuficiente. Aluno deve escolher AINE considerando risco GI e cardiovascular, seletividade COX e necessidade de IBP. |
| 2 | **Osteoartrite com comorbidades** | OA em idosa polimedicada | S.L., 67 anos, joelho esquerdo, HAS + osteopenia + depressão + DRGE. Paracetamol 4g/dia ineficaz. Aluno avalia interações (metoprolol, citalopram), escolhe entre celecoxibe + IBP ou tópico (diclofenaco gel). Critérios de pKa e meia-vida. |
| 3 | **Artrite reumatoide** | AR inicial -- Introdução de corticoide | T.W., 42 anos, rigidez matinal prolongada, edema simétrico mãos/pés, olhos secos. Aluno seleciona corticoide (prednisona), ajusta dose e horário (ciclo circadiano -- administrar à noite para pico matinal). |
| 4 | **AR crônica -- EA do corticoide** | Efeitos adversos dose e tempo-dependentes | W.M., usando prednisona 10mg/dia há 1 ano, PA descontrolada, insônia. Aluno identifica EA dose-dependentes vs tempo-dependentes, planeja redução de dose e monitora riscos (osteoporose, Cushing, supressão adrenal). |
| 5 | **AR -- Desmame de corticoide** | Desmame e síndrome de abstinência | Continuação do caso W.M. Aluno planeja esquema de desmame gradual (redução de 1-2,5mg a cada 2-4 semanas), monitora reativação da doença vs síndrome de abstinência, compreende supressão do eixo HPA. |

### Arquivos a Criar
- `src/pages/simuladores/SimuladorInflamacaoAINEs.tsx` -- Componente principal (~800 linhas)

### Arquivos a Editar
- `src/pages/Simuladores.tsx` -- Adicionar entrada no array NATIVE_SIMULATORS (categoria "Farmacologia Clínica")
- `src/App.tsx` -- Adicionar rotas `/simuladores/inflamacao-aines` e `/sala/simulador/inflamacao-aines/:visitorId`
- `src/hooks/useSimulatorCases.ts` -- Adicionar slug `inflamacao-aines` ao SIMULATOR_SLUGS
- `src/pages/SalasVirtuais.tsx` -- Adicionar ao SIMULATOR_OPTIONS na categoria "Farmacologia Clínica"
- `src/data/nativeCaseCatalog.ts` -- Adicionar os 5 casos nativos
- `src/data/nativeSystemPrompts.ts` -- Adicionar system prompt para geração de casos IA
- `src/data/simulatorChallenges.ts` -- Adicionar 10 desafios (mix de múltipla escolha e ajuste)

### Padrao Tecnico
Segue exatamente o padrão dos simuladores existentes: `useSimulatorCases`, `useVirtualRoomCase`, `ExamBanner`, `ExamFeedbackOverlay`, `SimulatorChallengeMode`, botão "Mostrar Resultados" com redirecionamento 15s, suporte light/dark mode.

