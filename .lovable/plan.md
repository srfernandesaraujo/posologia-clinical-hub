

## Calculadoras de Ginecologia e Obstetrícia — Proposta

### Análise de Mercado

A maioria dos apps médicos brasileiros oferece apenas a Idade Gestacional e a Data Provável do Parto. Há uma lacuna enorme em ferramentas integradas que cubram o pré-natal completo, rastreio de risco e manejo clínico obstétrico. Isso representa uma oportunidade de diferencial significativo.

### Calculadoras Propostas (por prioridade)

**Tier 1 — Uso Diário (alta frequência, impacto imediato)**

| Calculadora | Descrição | Diferencial |
|---|---|---|
| **Idade Gestacional + DPP** | Calcula IG por DUM ou USG, data provável do parto (Naegele), idade gestacional corrigida | Base essencial — mas com visualização de timeline gestacional por trimestre (Recharts) |
| **Ganho de Peso Gestacional (IOM)** | Ganho recomendado por IMC pré-gestacional e IG atual, com gráfico de faixas ideais | Poucos apps mostram o gráfico com a curva da paciente plotada |
| **Risco Pré-Eclâmpsia (ACOG/NICE)** | Score baseado em fatores maternos (idade, IMC, história, PA, doppler uterino) | Calculadora rara em português; indica uso de AAS profilático |

**Tier 2 — Valor Clínico Diferencial**

| Calculadora | Descrição | Diferencial |
|---|---|---|
| **Bishop Score** | Avalia amadurecimento cervical para indução do parto (5 parâmetros) | Simples mas muito usado; poucos apps integram conduta por faixa |
| **Perfil Biofísico Fetal (PBF)** | Score 0-10 baseado em 5 parâmetros ultrassonográficos + CTG | Com recomendações de conduta por pontuação |
| **Rastreio de Diabetes Gestacional** | Interpreta TOTG 75g (critérios IADPSG/OMS), classifica resultado | Inclui fluxograma de conduta pós-diagnóstico |

**Tier 3 — Nicho Premium (grande diferencial de mercado)**

| Calculadora | Descrição | Diferencial |
|---|---|---|
| **Risco de Parto Prematuro (QR Fibronectina + Colo)** | Integra comprimento cervical + fibronectina fetal para estratificação de risco | Praticamente inexistente em apps brasileiros |
| **Dosagem de Sulfato de Magnésio** | Calcula dose de ataque e manutenção (Zuspan vs Pritchard), alerta de toxicidade | Ferramenta crítica para eclâmpsia/pré-eclâmpsia grave |
| **Vitalidade Fetal — Índice de Líquido Amniótico** | Classifica ILA e maior bolsão, com conduta por faixa (oligoâmnio/polidrâmnio) | Visual gauge com zonas de risco |

### Recomendação de Implementação (5 calculadoras)

1. **Idade Gestacional + DPP** — base obrigatória, timeline visual
2. **Ganho de Peso Gestacional (IOM)** — gráfico de curva com ponto da paciente
3. **Risco de Pré-Eclâmpsia** — diferencial competitivo forte
4. **Bishop Score** — uso clínico frequente em centros obstétricos
5. **Dosagem de Sulfato de Magnésio** — ferramenta crítica de emergência, quase inexistente

### Padrão Técnico

Cada calculadora seguirá o padrão existente:
- Dual mode (clínico/educativo), PDF export, histórico
- Visualizações Recharts com labels nos eixos
- `ClinicalReferences` com guidelines (ACOG, NICE, FIGO, FEBRASGO)
- `RelatedCalculators` cruzando as 5 entre si
- Categoria "Ginecologia e Obstetrícia" no catálogo com ícone temático

### Arquivos

- **5 novos**: `IdadeGestacional.tsx`, `GanhoPesoGestacional.tsx`, `RiscoPreEclampsia.tsx`, `BishopScore.tsx`, `SulfatoMagnesio.tsx`
- **Editados**: `Calculadoras.tsx` (categoria + 5 entradas), `App.tsx` (rotas), `ClinicalReferences.tsx`, `RelatedCalculators.tsx`

