

## Plano: Nova Categoria — Farmacoterapia Laboratorial (8 Simuladores × 5 Casos × 6 Desafios)

### Resumo

Criar 8 novos simuladores na categoria "Farmacoterapia Laboratorial" onde o aluno interpreta resultados laboratoriais (hemograma, gasometria, bioquímica, coagulograma, etc.) e faz ajustes farmacoterapêuticos. Cada simulador terá 5 casos clínicos nativos com 6 desafios MCQ interativos no padrão do Manejo da Dor. O diferencial visual será a presença de **painéis laboratoriais interativos** (valores editáveis, gauges coloridos, gráficos de tendência) que o aluno manipula antes de responder.

---

### Arquitetura Visual (altamente visual)

Cada simulador terá layout consistente:

```text
┌──────────────────────────────────────────────────────────┐
│  Painel do Paciente (nome, idade, comorbidades, cenário) │
├───────────────┬──────────────────────────────────────────┤
│  CONTROLES    │  PAINEL LABORATORIAL PRINCIPAL           │
│  - Fármaco    │  ┌────────┐ ┌────────┐ ┌────────┐       │
│  - Dose       │  │ Hb 7.2 │ │ Leuc   │ │ Plaq   │       │
│  - Intervalo  │  │ ▼ BAIXO│ │12.500  │ │ 45k    │       │
│  - Via        │  └────────┘ └────────┘ └────────┘       │
│  - Toggles    │  Gauge visual com cores (verde/amarelo/  │
│    DRC, HAS,  │  vermelho) + valores de referência       │
│    Gestante   │                                          │
│               │  Gráfico de Tendência (72h/7d/30d)       │
│               │  → valores lab mudam com a terapia       │
├───────────────┴──────────────────────────────────────────┤
│  Sinais Vitais (FC, PA, FR, SpO2, Temp)                  │
├──────────────────────────────────────────────────────────┤
│  Gráfico Cp × Tempo   │  Barras Risco de EA              │
├──────────────────────────────────────────────────────────┤
│  Desafios (SimulatorChallengeMode)                       │
└──────────────────────────────────────────────────────────┘
```

**Elementos visuais especiais por simulador:**
- **Hemograma**: Gauges para Hb, VCM, HCM, Leucócitos (com diferencial em barras), Plaquetas
- **Ácido-Base**: Gasometria arterial interativa (pH, pCO2, HCO3, BE, AG) + nomograma visual
- **Hepatopatias**: Hepatograma com ALT/AST/FA/GGT/Bilirr/Albumina/TP + score Child-Pugh calculado
- **Disfunção Renal**: Calculadora ClCr/TFG embutida + classificação DRC colorida (G1-G5)
- **Infecção**: Leucograma diferencial em barras empilhadas + PCR/PCT em gauge + termômetro
- **Dislipidemia**: Lipidograma + score Framingham calculado + metas LDL coloridas
- **Glicemia/HbA1c**: Gráfico glicêmico 24h + HbA1c gauge com alvo personalizado
- **Coagulação**: Coagulograma (TP/INR/TTPa) + cascata visual simplificada com pontos de ação dos fármacos

---

### Os 8 Simuladores

#### 1. Hemograma e Condutas Hematológicas
**Slug**: `farmacoterapia-hemograma`
**Engine**: Painel com Hb, Ht, VCM, HCM, CHCM, RDW, Leucócitos totais (neutro/linfo/mono/eosino/baso), Plaquetas. Fármacos: Sulfato Ferroso, Ácido Fólico, Vitamina B12, Eritropoetina, Filgrastim, Ácido Tranexâmico, Transfusão (CH/CP).
**5 Casos**: (1) Anemia microcítica ferropriva, (2) Anemia megaloblástica B12, (3) Neutropenia febril pós-QT, (4) Plaquetopenia + sangramento, (5) Leucocitose reacional vs leucemia

#### 2. Distúrbios Ácido-Base e Eletrólitos
**Slug**: `farmacoterapia-acido-base`
**Engine**: Gasometria (pH, pCO2, pO2, HCO3, BE, AG, lactato) + eletrólitos (Na, K, Ca, Mg, Cl). Fármacos: NaHCO3, KCl, NaCl 0.9%/3%, Gluconato Ca, MgSO4, Furosemida, Poliestirenossulfonato, Insulina+Glicose.
**5 Casos**: (1) Acidose metabólica AG alto (cetoacidose), (2) Alcalose metabólica hipoclorêmica (vômitos), (3) Hipocalemia + toxicidade digitálica, (4) Hipercalemia + arritmia, (5) Hiponatremia dilucional (SIADH)

#### 3. Hepatopatias e Ajuste Terapêutico
**Slug**: `farmacoterapia-hepatopatia`
**Engine**: ALT, AST, FA, GGT, Bilirrubinas (D/I/T), Albumina, TP/INR + Child-Pugh calculado. Fármacos: Paracetamol, NAC, Estatinas, Azólicos, Isoniazida, Amiodarona, Metformina, Lactulose, Rifaximina.
**5 Casos**: (1) Hepatotoxicidade por paracetamol (dose-dependente), (2) Hepatite medicamentosa por isoniazida, (3) Cirrose Child-Pugh C + ajuste de doses, (4) Interação azólico + estatina, (5) Encefalopatia hepática

#### 4. Disfunção Renal e Ajuste de Dose
**Slug**: `farmacoterapia-renal`
**Engine**: Creatinina, Ureia, ClCr (Cockcroft-Gault calculado), TFG (CKD-EPI), K, Na + classificação DRC (G1-G5). Fármacos: Vancomicina, Gentamicina, Metformina, Digoxina, AINEs, Alopurinol, Gabapentina, Lítio.
**5 Casos**: (1) Vancomicina em DRC G3 — ajuste por TFG, (2) Metformina em DRC G4 — contraindicação, (3) Gentamicina — nefrotoxicidade progressiva, (4) AINE em idoso com DRC G2→G4, (5) Digoxina em DRC — acúmulo e toxicidade

#### 5. Sinais Laboratoriais de Infecção
**Slug**: `farmacoterapia-infeccao-lab`
**Engine**: Leucograma diferencial (barras empilhadas), PCR, PCT, Lactato, Hemoculturas, Temp. Fármacos: Amoxicilina, Ceftriaxona, Piperacilina-Tazobactam, Vancomicina, Meropenem, Oseltamivir.
**5 Casos**: (1) Pneumonia comunitária — leucocitose + PCR alta, (2) Sepse — PCT >10 + lactato >4, (3) Infecção viral vs bacteriana — PCR baixa, linfocitose, (4) Neutropenia febril — antibiótico empírico imediato, (5) Desescalonamento guiado por cultura

#### 6. Dislipidemia e Risco Cardiovascular
**Slug**: `farmacoterapia-dislipidemia`
**Engine**: CT, HDL, LDL (calculado Friedewald), TG, Apo-B, CPK + Score de Framingham calculado + meta LDL dinâmica. Fármacos: Atorvastatina, Rosuvastatina, Ezetimiba, Fenofibrato, Evolocumabe (iPCSK9), Ômega-3.
**5 Casos**: (1) Risco alto — LDL 180 + meta <70, (2) Intolerância à estatina (mialgia + CPK), (3) Hipertrigliceridemia isolada >500 (risco pancreatite), (4) Risco muito alto (pós-IAM) — terapia combinada, (5) Dislipidemia familiar — LDL refratário

#### 7. Glicemia e HbA1c
**Slug**: `farmacoterapia-glicemia`
**Engine**: Glicemia jejum, pós-prandial, HbA1c (gauge com alvo), Perfil glicêmico 24h (gráfico). Fármacos: Metformina, Glibenclamida, Empagliflozina, Liraglutida, Insulina NPH, Insulina Lispro, Pioglitazona.
**5 Casos**: (1) DM2 recém-diagnosticado — metformina 1ª linha, (2) HbA1c >9% — terapia combinada, (3) Hipoglicemia por sulfonilureia em idoso, (4) DM2 + DRC — contraindicação metformina + opções, (5) Insulinização — transição de oral para basal-bolus

#### 8. Distúrbios da Coagulação
**Slug**: `farmacoterapia-coagulacao`
**Engine**: TP, INR, TTPa, Plaquetas, Fibrinogênio, D-dímero + cascata visual simplificada. Fármacos: Varfarina, Heparina NF, Enoxaparina, Apixabana, Rivaroxabana, Dabigatrana, Vitamina K, Protamina, Idarucizumabe.
**5 Casos**: (1) INR supra-terapêutico com varfarina — ajuste vs reversão, (2) TEP — anticoagulação inicial + manutenção, (3) FA + DOAC — escolha e monitoramento, (4) Pré-operatório — suspensão de anticoagulante + bridge, (5) CIVD — interpretação + suporte

---

### Problemas preventivos (lições dos simuladores anteriores)

| Problema | Correção |
|----------|----------|
| Slider step grande demais | Step adaptativo por faixa de dose |
| Valores laboratoriais não mudam com terapia | Engine calcula valores lab pós-terapia (ex: Hb sobe 1g/dL/semana com ferro) |
| Gráfico monotônico sem variação | Tendência laboratorial dinâmica: melhora/piora conforme fármaco+dose |
| Desafio pede funcionalidade inexistente | Cada desafio usa APENAS controles presentes no simulador |
| Feedback com termos internos | Sem variáveis internas nos textos |
| Sem activeCaseIndex | Tracking desde o início em todos os 8 simuladores |
| simulatorState incompleto para challenges | Passar labValues, selectedDrug, dose, specialGroups, sideEffectData |

---

### Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/simuladores/farmacoterapia-laboratorial/SimuladorHemograma.tsx` | Criar |
| `src/pages/simuladores/farmacoterapia-laboratorial/SimuladorAcidoBase.tsx` | Criar |
| `src/pages/simuladores/farmacoterapia-laboratorial/SimuladorHepatopatia.tsx` | Criar |
| `src/pages/simuladores/farmacoterapia-laboratorial/SimuladorRenal.tsx` | Criar |
| `src/pages/simuladores/farmacoterapia-laboratorial/SimuladorInfeccaoLab.tsx` | Criar |
| `src/pages/simuladores/farmacoterapia-laboratorial/SimuladorDislipidemia.tsx` | Criar |
| `src/pages/simuladores/farmacoterapia-laboratorial/SimuladorGlicemia.tsx` | Criar |
| `src/pages/simuladores/farmacoterapia-laboratorial/SimuladorCoagulacao.tsx` | Criar |
| `src/data/simulatorChallenges.ts` | Adicionar 8 funções `get[X]Challenges(caseIndex)` (240 desafios total) |
| `src/pages/Simuladores.tsx` | Adicionar 8 entradas na lista NATIVE_SIMULATORS com categoria "Farmacoterapia Laboratorial" |
| `src/App.tsx` | Adicionar 8 rotas + imports |

---

### Implementação incremental sugerida

Dado o volume (8 simuladores × ~600 linhas cada + 240 desafios), implementar em 4 etapas:

1. **Etapa 1**: Simuladores 1 e 2 (Hemograma + Ácido-Base) + desafios + rotas
2. **Etapa 2**: Simuladores 3 e 4 (Hepatopatia + Renal) + desafios
3. **Etapa 3**: Simuladores 5 e 6 (Infecção Lab + Dislipidemia) + desafios
4. **Etapa 4**: Simuladores 7 e 8 (Glicemia + Coagulação) + desafios

Cada etapa entrega simuladores funcionais e testáveis.

**Deseja aprovar a Etapa 1 (Hemograma + Ácido-Base) para iniciar a implementação?**

