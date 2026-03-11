

# Simuladores de Nutrição — 8 Simuladores Modulares (M1-M5)

## Resumo

Criar 8 simuladores para a categoria **Nutrição** seguindo o padrão consolidado: estrutura modular M1-M5, decisão ativa em todos os módulos, feedback final com desfecho clínico (SimulatorFeedback), dashboard de casos (nativos + IA), botão voltar, Como Usar, AdminPromptViewer e system prompts.

---

## Os 8 Simuladores

### 1. Avaliação Nutricional Antropométrica
- **M1**: Caso clínico (idade, sexo, peso, altura, circunferências, dobras cutâneas)
- **M2**: Aluno calcula IMC, % gordura corporal e classifica o estado nutricional entre opções (eutrófico, sobrepeso, obesidade I/II/III, desnutrição) — o sistema fornece as medidas brutas
- **M3**: Aluno escolhe os indicadores de risco (múltipla escolha com distratores: circunferência abdominal, relação cintura-quadril, dobra tricipital, etc.) e classifica o risco cardiovascular/metabólico
- **M4**: Aluno define metas nutricionais (perda/ganho de peso, alvo calórico) selecionando entre opções
- **Feedback**: Projeção de evolução antropométrica em 3/6 meses baseado nas metas escolhidas

### 2. Triagem Nutricional (NRS-2002 / MNA / MUST)
- **M1**: Caso clínico hospitalar/geriátrico com dados de admissão
- **M2**: Aluno aplica a ferramenta de triagem, pontuando cada item manualmente (o sistema apresenta os dados clínicos, o aluno escolhe a pontuação de cada critério)
- **M3**: Aluno classifica o risco nutricional (sem risco / em risco / alto risco) e decide a conduta: monitorar, plano nutricional ou TN precoce
- **M4**: Aluno seleciona a via de alimentação (oral, SNE, SNJ, NPT) e justifica com base no quadro
- **Feedback**: Evolução do paciente (recuperação vs. desnutrição hospitalar) baseada na adequação da triagem e da conduta

### 3. Cálculo de Necessidades Energéticas (Harris-Benedict / Mifflin)
- **M1**: Caso clínico com dados antropométricos e condição clínica (queimadura, pós-operatório, sepse, etc.)
- **M2**: Aluno escolhe a equação preditiva adequada e o fator de atividade/injúria entre opções (com distratores). O sistema apresenta 4 opções de GET calculado — aluno escolhe o correto
- **M3**: Aluno distribui os macronutrientes (% PTN, CHO, LIP) usando sliders, respeitando as recomendações para a condição clínica. O sistema valida a distribuição em tempo real
- **M4**: Aluno monta o plano alimentar: escolhe o tipo de dieta (hipercalórica, hiperproteica, hipossódica, etc.) e define o fracionamento
- **Feedback**: Adequação calórico-proteica vs. necessidades reais, risco de síndrome de realimentação, balanço nitrogenado projetado

### 4. Terapia Nutricional Enteral (TNE)
- **M1**: Paciente em UTI/enfermaria com indicação de suporte enteral
- **M2**: Aluno escolhe a fórmula enteral (polimérica, oligomérica, elementar, especializada) entre opções com justificativa clínica. Aluno decide a via (SNG, SNE, gastrostomia)
- **M3**: Aluno calcula o volume, a velocidade de infusão e a progressão do gotejamento (escolha entre 4 protocolos de progressão). O sistema mostra o cálculo para validação
- **M4**: Sistema apresenta uma complicação (diarreia, resíduo gástrico alto, obstrução da sonda, síndrome de realimentação) — aluno escolhe a conduta de manejo
- **Feedback**: Evolução nutricional do paciente (alcance da meta calórica, complicações evitadas/ocorridas)

### 5. Terapia Nutricional Parenteral (TNP)
- **M1**: Caso de paciente com contraindicação de via enteral (íleo paralítico, fístula, pancreatite grave)
- **M2**: Aluno prescreve a solução parenteral: escolhe os componentes (glicose %, aminoácidos %, lipídeos %), eletrólitos e vitaminas. O sistema calcula a osmolaridade e indica se necessita acesso central
- **M3**: Aluno avalia a compatibilidade farmacêutica (múltipla escolha: quais medicamentos são compatíveis com a NP em Y?) e decide o acesso venoso (periférico vs. central)
- **M4**: Sistema apresenta alteração laboratorial (hiperglicemia, hipertrigliceridemia, hipofosfatemia) — aluno ajusta a prescrição
- **Feedback**: Desfecho metabólico e nutricional baseado nas decisões de composição e manejo

### 6. Avaliação e Conduta em Disfagia
- **M1**: Paciente com AVC/idoso com queixa de engasgos, apresentando dados clínicos e avaliação funcional
- **M2**: Aluno realiza avaliação à beira-leito: escolhe os testes a aplicar (teste de água, ausculta cervical, oximetria) entre opções. O sistema revela os resultados de cada teste selecionado
- **M3**: Aluno classifica o grau de disfagia (FOIS 1-7) entre opções e decide a consistência alimentar (líquido fino, néctar, mel, pudim, sólido macio, etc.)
- **M4**: Aluno define as estratégias compensatórias (postura de queixo, deglutição supraglótica, espessamento) e decide se solicita videofluoroscopia/nasofibro
- **Feedback**: Risco de broncoaspiração projetado, adequação nutricional oral, evolução da deglutição

### 7. Nutrição no Paciente Renal Crônico
- **M1**: Caso de DRC (estágios 3-5, dialítico ou pré-dialítico) com exames laboratoriais (ureia, creatinina, K, P, Ca, albumina)
- **M2**: Aluno define a prescrição dietética: quota proteica (g/kg), restrição de K, P, Na e líquidos, escolhendo entre faixas com distratores para cada estágio
- **M3**: Aluno analisa o recordatório alimentar de 24h do paciente e identifica inadequações (múltipla escolha: alimentos ricos em K oculto, P de aditivos, excesso proteico)
- **M4**: Aluno propõe substituições alimentares e suplementação (quelantes de fósforo, cálcio, eritropoietina-orientação) escolhendo entre opções
- **Feedback**: Evolução laboratorial projetada (K, P, albumina) e risco de complicações (hipercalemia, osteodistrofia)

### 8. Nutrição Materno-Infantil (Gestação e Lactação)
- **M1**: Gestante com dados obstétricos (IG, IMC pré-gestacional, ganho de peso atual, exames)
- **M2**: Aluno classifica o estado nutricional usando a curva de Atalah e define a faixa de ganho de peso recomendada (escolha entre opções)
- **M3**: Aluno prescreve a suplementação (ácido fólico, ferro, cálcio, vitamina D, ômega-3) — para cada nutriente, decide dose e período, com distratores de doses incorretas
- **M4**: Sistema apresenta intercorrência (diabetes gestacional, anemia, pré-eclâmpsia) — aluno ajusta a dieta e a suplementação
- **Feedback**: Desfecho materno-fetal projetado (ganho de peso adequado, risco de macrossomia, anemia neonatal)

---

## Infraestrutura (padrão consolidado)

Cada simulador terá:
1. **Dashboard de casos** (NativeCaseCard + AICaseCard via `useSimulatorCases`)
2. **Botão Voltar** (`ArrowLeft` → `/simuladores`)
3. **SimulatorHowToUse** com steps específicos
4. **AdminPromptViewer** com prompt do simulador
5. **SimulatorFeedback** (ScoreGauge + decisões vs ideal + narrativa clínica)
6. **LabReportPanel** (M5 — relatório exportável)

---

## Arquivos a Criar

**8 simuladores** (novos):
- `src/pages/simuladores/nutricao/SimuladorAvaliacaoNutricional.tsx`
- `src/pages/simuladores/nutricao/SimuladorTriagemNutricional.tsx`
- `src/pages/simuladores/nutricao/SimuladorNecessidadesEnergeticas.tsx`
- `src/pages/simuladores/nutricao/SimuladorTNE.tsx`
- `src/pages/simuladores/nutricao/SimuladorTNP.tsx`
- `src/pages/simuladores/nutricao/SimuladorDisfagia.tsx`
- `src/pages/simuladores/nutricao/SimuladorNutricaoRenal.tsx`
- `src/pages/simuladores/nutricao/SimuladorNutricaoMaternoInfantil.tsx`

## Arquivos a Editar

- `src/pages/Simuladores.tsx` — 8 novos entries em `NATIVE_SIMULATORS` com `category: "Nutrição"`
- `src/App.tsx` — 8 imports + 8 rotas (`/simuladores/nutricao/*`)
- `src/data/nativeSystemPrompts.ts` — 8 system prompts
- `src/hooks/useSimulatorCases.ts` — 8 slugs em `SIMULATOR_SLUGS`
- `supabase/functions/generate-case/index.ts` — 8 prompts para geração de casos IA

