

## Plan: Implementar 5 Calculadoras Pediátricas

### Overview
Create 5 new pediatric clinical calculators following the existing pattern (dual mode clinico/educativo, PDF export, calculation history, clinical references, related calculators).

### New Calculators

| # | Calculator | Route | File |
|---|-----------|-------|------|
| 1 | Curvas de Crescimento OMS (Z-Score) | `/calculadoras/curvas-crescimento-oms` | `src/pages/CurvasCrescimentoOMS.tsx` |
| 2 | Bilirrubina Neonatal (Bhutani/AAP) | `/calculadoras/bilirrubina-neonatal` | `src/pages/BilirrubinanNeonatal.tsx` |
| 3 | TFG Pediátrica (Schwartz) | `/calculadoras/schwartz-pediatrico` | `src/pages/SchwartzPediatrico.tsx` |
| 4 | PEWS (Pediatric Early Warning Score) | `/calculadoras/pews` | `src/pages/Pews.tsx` |
| 5 | Drogas Vasoativas Pediátricas | `/calculadoras/drogas-vasoativas-pediatricas` | `src/pages/DrogasVasoativasPediatricas.tsx` |

### Calculator Details

**1. Curvas de Crescimento OMS (Z-Score)**
- Inputs: sexo, idade (meses), peso (kg), comprimento/estatura (cm), perimetro cefalico (cm)
- Calculates Z-scores using simplified LMS tables (WHO 0-5 years)
- Recharts LineChart showing percentile curves (P3, P15, P50, P85, P97) with patient point plotted
- Classification: magreza severa, magreza, eutrofico, sobrepeso, obesidade
- References: WHO 2006 Growth Standards

**2. Bilirrubina Neonatal (Bhutani/AAP)**
- Inputs: bilirrubina total (mg/dL), idade do RN (horas), idade gestacional, fatores de risco
- Nomograma de Bhutani: classifica em zonas (baixo, intermediario-baixo, intermediario-alto, alto risco)
- Recharts AreaChart with risk zones and patient point plotted
- Indica necessidade de fototerapia/exsanguineotransfusao baseado em AAP 2004/2022
- References: AAP Clinical Practice Guideline, Bhutani VK et al. Pediatrics 1999

**3. TFG Pediátrica (Schwartz)**
- Inputs: creatinina serica (mg/dL), altura (cm), constante k (selecao por faixa etaria)
- Formula: TFG = k × altura(cm) / creatinina
- Constantes: RN prematuro (0.33), RN a termo (0.45), crianca 1-12a (0.55), adolescente F (0.55), adolescente M (0.70)
- Bedside Schwartz 2009: k=0.413 (universal)
- RiskGauge visualization + staging KDIGO
- References: Schwartz GJ et al. JASN 2009

**4. PEWS (Pediatric Early Warning Score)**
- Inputs: comportamento, cardiovascular, respiratorio (0-3 pontos cada)
- Score 0-9, com faixas: 0-2 (baixo risco), 3-4 (moderado), ≥5 (alto - acionar equipe de emergencia)
- ScoreBar visualization with color bands
- Recomendacoes de conduta por faixa
- References: Monaghan A. Nursing Times 2005

**5. Drogas Vasoativas Pediátricas**
- Inputs: peso (kg), droga selecionada, dose desejada (mcg/kg/min), concentracao da solucao
- Drogas: Dopamina, Dobutamina, Noradrenalina, Adrenalina, Milrinona, Nitroprussiato
- Calcula: velocidade de infusao (mL/h), diluicao padrao, dose em mcg/min
- Table with common dose ranges per drug
- References: PALS/AHA Guidelines

### Files to Modify

1. **5 new page files** (listed above) - each ~200-250 lines following DosePediatrica/HollidaySegar pattern
2. **`src/pages/Calculadoras.tsx`** - Add 5 entries to `NATIVE_CALCULATORS` array and slugs to `NATIVE_SLUGS`
3. **`src/App.tsx`** - Add imports and routes for all 5 calculators (both authenticated `/calculadoras/...` routes)
4. **`src/data/nativeSystemPrompts.ts`** - Add system prompts for admin viewer
5. **`src/components/calculators/ClinicalReferences.tsx`** - Add reference entries for each calculator

### Technical Pattern (per calculator)
- Dual mode toggle (clinico/educativo)
- Patient name + date fields
- jsPDF export
- `useCalculationHistory` integration via `SaveToHistoryButton`
- `ShareToolButton` for embedding
- `ClinicalReferences` and `RelatedCalculators` components
- Recharts visualizations with proper axis labels
- Responsive layout with Tailwind

