

## Plano Expandido: Melhorias para TODAS as Calculadoras

### Situação Atual

O sistema tem **três camadas** de calculadoras:

1. **7 nativas** (hardcoded): Risco CV, Desmame Corticoides, Equivalência Opioides, Ajuste Dose Renal, Equivalência Antidepressivos, HOMA-IR, FINDRISC — cada uma com página própria e lógica customizada
2. **8 dinâmicas do sistema** (tabela `tools`, `created_by = NULL`): Risco Cardiovascular, Desmame de Corticoide, Equivalência de Opioides, Ajuste Dose Renal, Equivalência de Antidepressivos, HOMA-IR, FINDRISC, **Escala de Coma de Glasgow** — renderizadas pelo `ToolDetail.tsx` genérico
3. **4+ criadas por usuários**: Escore CURB-65, HAS-BLED, Apgar, CHA₂DS₂-VASc — também via `ToolDetail.tsx`

**Problema visível na imagem**: as 7 nativas aparecem **duplicadas** com suas versões dinâmicas, resultando em cards repetidos na listagem.

---

### Fase 0 — Resolver Duplicação

Remover os 7 registros duplicados da tabela `tools` (ou filtrar no frontend) para que cada calculadora apareça apenas uma vez. Alternativa: ocultar os cards dinâmicos quando já existe uma versão nativa com o mesmo slug.

**Arquivo**: `src/pages/Calculadoras.tsx` — filtrar `tools` excluindo slugs que já existem em `NATIVE_CALCULATORS`.

---

### Fase 1 — Melhorias no Motor Genérico (`ToolDetail.tsx`)

Estas melhorias beneficiam TODAS as calculadoras dinâmicas (Glasgow, CURB-65, HAS-BLED, Apgar, CHA₂DS₂-VASc e futuras):

1. **Gauge visual de resultado**: Após o cálculo, exibir um componente `RiskGauge` (semicircular com Recharts) colorido por faixa de interpretação. O `ToolDetail` já tem acesso às `interpretations` com ranges e cores — basta renderizar um gauge quando houver resultado numérico.

2. **Referências clínicas inline**: Adicionar campo `references` ao schema de `ToolFormula`. Quando presente, exibir seção "Referências" abaixo do resultado com links clicáveis. Retroalimentar as calculadoras existentes no banco.

3. **Calculadoras Relacionadas**: Componente `RelatedCalculators` que sugere outras ferramentas da mesma categoria após o resultado. Consulta simples à tabela `tools` filtrando pela mesma `category_id`.

4. **Barra de interpretação segmentada**: Para escores como Glasgow (3-15), CURB-65 (0-5), HAS-BLED (0-9), Apgar (0-10) — renderizar uma barra horizontal segmentada com a posição do paciente marcada. Aplica-se automaticamente quando a fórmula tem múltiplas interpretações com ranges numéricos.

**Arquivos**:
- Criar `src/components/calculators/RiskGauge.tsx`
- Criar `src/components/calculators/RelatedCalculators.tsx`
- Criar `src/components/calculators/ScoreBar.tsx`
- Editar `src/pages/ToolDetail.tsx` — integrar os 3 componentes após o bloco de resultado

---

### Fase 2 — Melhorias nas 7 Calculadoras Nativas

Como detalhado no plano anterior:

| Calculadora | Melhoria Principal |
|---|---|
| Risco CV | Gauge semicircular + comparação automática 3 modelos |
| Desmame Corticoides | AreaChart da curva de redução semanal |
| Equivalência Opioides | Barras horizontais comparativas |
| Ajuste Dose Renal | Gauge eGFR + barra KDIGO + expandir para 30+ fármacos |
| Equivalência Antidepressivos | Radar chart de perfis + modo comparação |
| HOMA-IR | Gauge com zonas de resistência |
| FINDRISC | Barra segmentada por faixa de risco |

Adicionar referências clínicas e calculadoras relacionadas a todas.

**Arquivos**: as 7 páginas em `src/pages/` + componentes compartilhados da Fase 1.

---

### Fase 3 — Melhorias Transversais

1. **Tendência temporal no histórico**: Adicionar sparklines ao `CalculationHistory.tsx` mostrando evolução de valores ao longo do tempo por paciente.

2. **Atualizar calculadoras dinâmicas no banco**: Executar UPDATE nas calculadoras Glasgow, CURB-65, HAS-BLED, Apgar, CHA₂DS₂-VASc para adicionar `references` e melhorar `interpretations` com cores e recomendações.

---

### Resumo de Impacto

- **Fase 0**: Corrige duplicação visível na imagem — impacto imediato na UX
- **Fase 1**: Beneficia TODAS as calculadoras (atuais e futuras) via motor genérico — maior ROI
- **Fase 2**: Diferencial premium nas 7 nativas com gráficos específicos
- **Fase 3**: Acompanhamento longitudinal e enriquecimento de dados

Recomendo implementar na ordem: Fase 0 → Fase 1 → Fase 2 → Fase 3.

