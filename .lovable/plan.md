

## Plano: Calculadora de Ajuste de Dose Oncológico (Renal e Hepático)

### Resumo
Criar uma terceira calculadora de Oncologia com 3 abas: **Carboplatina (Calvert)**, **Ajuste Renal Geral** (Cockcroft-Gault + antineoplásico), e **Ajuste Hepático** (NCI-ODWG para IV, Child-Pugh para TKIs orais). Seguirá o mesmo padrão visual das calculadoras existentes.

**Slug**: `ajuste-dose-oncologico`

---

### Aba 1 — Carboplatina (Fórmula de Calvert)
- **Inputs**: AUC alvo (dropdown: 4, 5, 6, 7), TFG (input numérico ou calcular via Cockcroft-Gault inline com peso/idade/sexo/creatinina)
- **Fórmula**: Dose (mg) = AUC × (TFG + 25)
- **Resultado**: Dose em mg, alerta se TFG < 15 ou > 125 (cap)

### Aba 2 — Ajuste Renal Geral
- **Inputs**: Peso, idade, sexo, creatinina sérica → calcula ClCr (Cockcroft-Gault)
- **Select de antineoplásico**: Lista com ~15-20 fármacos comuns (cisplatina, capecitabina, metotrexato, lenalidomida, pemetrexede, etc.)
- **Tabela de ajuste**: Para cada fármaco, faixas de ClCr (>60, 30-60, 15-30, <15/diálise) com % de dose ou contraindicação
- **Resultado**: RiskGauge com ClCr, recomendação de dose ajustada

### Aba 3 — Ajuste Hepático
- **Sub-seleção**: QT venosa (NCI-ODWG) ou TKI oral (Child-Pugh)
- **NCI-ODWG**: Inputs de bilirrubina total, AST, ULN → classificação (Normal, Grupo A/B/C/D) + select de fármaco → recomendação
- **Child-Pugh**: Inputs de bilirrubina, albumina, INR, ascite, encefalopatia → score A/B/C + select de TKI → recomendação
- **Resultado**: Classificação + ajuste de dose por fármaco

---

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/AjusteDoseOncologico.tsx` | Página principal (~700 linhas) |

### Arquivos a Editar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Calculadoras.tsx` | +1 entrada NATIVE_CALCULATORS + slug |
| `src/App.tsx` | Rota `/calculadoras/ajuste-dose-oncologico` |
| `src/data/nativeSystemPrompts.ts` | System prompt do slug |
| `src/components/calculators/ClinicalReferences.tsx` | Referências (Calvert 1989, NCI-ODWG, Child-Pugh) |
| `src/components/calculators/RelatedCalculators.tsx` | Relacionar com as 2 calculadoras oncológicas existentes |

### Padrão Visual
- Layout `grid-cols-1 lg:grid-cols-3` (2/3 inputs + 1/3 resultados)
- Header com AdminPromptViewer, ShareToolButton, CalculationHistory
- Painel direito: RiskGauge, recomendações, PDF, ClinicalReferences, RelatedCalculators
- Tabs para alternar entre os 3 instrumentos

