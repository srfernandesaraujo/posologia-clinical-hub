

## Plano: Duas Calculadoras Clínicas de Oncologia

### Resumo
Criar duas calculadoras clínicas na categoria **Oncologia**: (1) Predição de Risco de Não Adesão em Pacientes Oncológicos (4 instrumentos) e (2) Predição de Reações Adversas a Antineoplásicos (3 instrumentos). Ambas seguem o padrão existente (layout 2/3 + 1/3, RiskGauge, ClinicalReferences, RelatedCalculators, AdminPromptViewer, PDF).

### Calculadora 1 — Risco de Não Adesão Oncológica
**Slug**: `adesao-oncologia`  
**Instrumentos selecionáveis via Tabs/Select**:
- **ARMS** (12 itens, escala 1-4; score 12-48; quanto maior = pior adesão)
- **MOATT** (16 itens; checklist de competências do paciente em terapia oral)
- **Morisky MMAS-4** (4 itens sim/não; 0=alta adesão, 4=baixa) e **MMAS-8** (8 itens; <6=baixa, 6-7=média, 8=alta)
- **AQT** (itens sobre terapia-alvo; score composto)

**Resultado**: RiskGauge com faixas (Alta/Média/Baixa adesão), condutas farmacêuticas sugeridas, PDF exportável.

### Calculadora 2 — Reações Adversas a Antineoplásicos
**Slug**: `toxicidade-antineoplasicos`  
**Instrumentos selecionáveis**:
- **CARG** (idade, tipo tumor, nº drogas, hemoglobina, ClCr, quedas, atividade social, etc. → % risco toxicidade grau 3-5)
- **CRASH** (2 sub-scores: hematológico + não-hematológico; variáveis como LDH, albumina, ECOG, esquema QT)
- **HFA-ICOS (ESC)** (classificação de risco cardiotoxicidade: baixo/médio/alto/muito alto baseado em fatores + tipo de antineoplásico)

**Resultado**: RiskGauge, recomendações de monitoramento, PDF exportável.

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/AdesaoOncologia.tsx` | Calculadora 1 (~600 linhas) |
| `src/pages/ToxicidadeAntineoplasicos.tsx` | Calculadora 2 (~600 linhas) |

### Arquivos a Editar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Calculadoras.tsx` | Adicionar 2 entradas em NATIVE_CALCULATORS + NATIVE_SLUGS + categoria "Oncologia" com ícone e cor |
| `src/App.tsx` | Importar e registrar rotas `/calculadoras/adesao-oncologia` e `/calculadoras/toxicidade-antineoplasicos` |
| `src/data/nativeSystemPrompts.ts` | Adicionar prompts para ambos os slugs |
| `src/components/calculators/ClinicalReferences.tsx` | Adicionar referências para ambos os slugs |
| `src/components/calculators/RelatedCalculators.tsx` | Adicionar NATIVE_PATHS e RELATED_MAP para ambos os slugs (relacionando entre si) |

### Padrão Visual (idêntico a RiscoCardiovascular)
- Layout `grid-cols-1 lg:grid-cols-3`: inputs à esquerda (2 cols), resultados à direita (1 col)
- Header com ícone, título, ShareToolButton, AdminPromptViewer, CalculationHistory
- Painel direito: RiskGauge, condutas/recomendações, botão PDF, ClinicalReferences, RelatedCalculators
- Escala de risco visual com bolinhas coloridas

### Referências Clínicas Incluídas
**Calc 1**: Krikorian et al. (ARMS, 2007), Kav et al. (MOATT, 2010), Morisky et al. (MMAS, 1986/2008), literatura AQT  
**Calc 2**: Hurria et al. (CARG, 2011), Extermann et al. (CRASH, 2012), Lyon et al. (HFA-ICOS/ESC, 2022)

