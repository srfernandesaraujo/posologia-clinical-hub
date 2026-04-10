

## Plano: Analytics Robusto para Simuladores Dinâmicos

### Problema Identificado
Existem dois tipos de submissão no sistema:

1. **Simuladores com desafios (challenge_results)** -- enviam dados estruturados questão a questão. O Analytics já renderiza de forma rica (Imagem 1).

2. **Simuladores dinâmicos (sem desafios)** -- enviam apenas `actions` com dados brutos mínimos como `{ drug: "Ibuprofeno", dose: 400 }` ou `{ userAnswers, correctCount, totalCount }`. O Analytics mostra apenas "PRM1: —" com o score (Imagem 2).

### Solução: Duas Frentes

**Frente 1 -- Enriquecer os dados enviados pelos simuladores** (submissão estruturada com `decisions[]`)

Cada simulador dinâmico passará a enviar os `actions` no formato `{ type: "simulator_decisions", decisions: [...], summary: {...} }`, onde cada `decision` tem:
- `label` (ex: "Fármaco Selecionado", "Dose", "Gastroproteção")
- `userChoice` (o que o aluno escolheu)
- `idealChoice` (o que seria ideal para aquele caso)
- `correct` (boolean)
- `category` (agrupamento: "Seleção", "Posologia", "Segurança", "Monitoramento")
- `weight` (importância relativa na pontuação)
- `explanation` (justificativa pedagógica breve)

Os simuladores afetados (cada um terá sua lógica de `buildDecisions` customizada):

| Simulador | Decisões a capturar |
|-----------|-------------------|
| **PRM** | Para cada fármaco: identificação do PRM (sim/não), tipo (Segurança/Efetividade/Indicação/Adesão), justificativa |
| **SOAP** | Para cada seção S/O/A/P: palavras-chave presentes vs ausentes, completude |
| **MAI** | Para cada critério MAI: classificação A/B/C do aluno vs ideal |
| **Cascata de Prescrição** | Para cada medicamento: identificação correta da cascata |
| **Dispensação 344** | Por etapa: acolhimento, verificação de campos, questões legais, decisão, orientação |
| **Insulina** | Regime, tipo basal/prandial, TDD, repartição basal%, glicemias resultantes |
| **Manejo da Dor** | Fármaco, dose, adjuvante, EVA final, escada OMS |
| **Inflamação/AINEs** | Fármaco, seletividade COX, gastroproteção, EVA final, riscos |
| **Infecções/Antibióticos** | Antibiótico, dose, hidratação, carga bacteriana final, warnings |
| **Tratamento da Asma** | Fármacos, step GINA, dispositivo, VEF1 final, warnings |
| **Interações** | Identificação de interações, classificação, conduta |
| **Bomba de Infusão** | Velocidade, concentração, dose/kg/min |
| **Desmame Benzo** | Esquema de redução, ritmo, sintomas monitorados |

Todos os simuladores de **Fisiologia**, **Bioquímica**, **Farmacologia básica**, **Farmacotécnica**, **Química Farmacêutica** e **Genética** que não têm desafios também serão atualizados com o mesmo padrão.

**Frente 2 -- Enriquecer a renderização no Analytics** (`ParticipantDetail`)

O componente `ParticipantDetail` no `Analytics.tsx` já trata `challenge_results` (questões) e `decisions[]` (legacy). Precisa ser expandido para tratar o novo formato `simulator_decisions`:

- **Cards de decisão por categoria** com ícone verde/vermelho, agrupados por categoria (Seleção, Posologia, Segurança, Monitoramento)
- **Resumo por categoria** (ex: "Seleção: 2/3 corretas, Posologia: 1/2, Segurança: 3/3")
- **Gráfico radar** de competências por categoria
- **Indicadores pedagógicos**: "Ponto forte: Segurança | Ponto fraco: Posologia"
- **Explicação pedagógica** para cada decisão incorreta
- **Comparativo vs sala** (já existente, será reaproveitado)

### Arquivos a Editar

**Simuladores (Frente 1)** -- ~30 arquivos, cada um com alteração localizada na chamada `submitResults`:
- `src/pages/simuladores/SimuladorPRM.tsx`
- `src/pages/simuladores/SimuladorSOAP.tsx`
- `src/pages/simuladores/SimuladorMAI.tsx`
- `src/pages/simuladores/SimuladorCascataPrescricao.tsx`
- `src/pages/simuladores/SimuladorInsulina.tsx`
- `src/pages/simuladores/SimuladorManejoDor.tsx`
- `src/pages/simuladores/SimuladorInflamacaoAINEs.tsx`
- `src/pages/simuladores/SimuladorInfeccoesAntibioticos.tsx`
- `src/pages/simuladores/SimuladorTratamentoAsma.tsx`
- `src/pages/simuladores/SimuladorInteracoes.tsx`
- `src/pages/simuladores/SimuladorBombaInfusao.tsx`
- `src/pages/simuladores/SimuladorDesmameBenzo.tsx`
- `src/pages/simuladores/SimuladorAcompanhamento.tsx`
- `src/pages/simuladores/farmacologia/SimuladorDispensacao344.tsx`
- `src/pages/simuladores/farmacologia/SimuladorDoseResposta.tsx`
- `src/pages/simuladores/farmacologia/SimuladorTransducaoSinal.tsx`
- `src/pages/simuladores/farmacologia/SimuladorJanelaTerapeutica.tsx`
- `src/pages/simuladores/farmacologia/SimuladorBloqueioNeuromuscular.tsx`
- `src/pages/simuladores/farmacologia/SimuladorViasAdministracao.tsx`
- `src/pages/simuladores/farmacologia/SimuladorFarmacoAutonomica.tsx`
- `src/pages/simuladores/farmacologia/SimuladorToleranciaDependencia.tsx`
- `src/pages/simuladores/farmacologia/SimuladorFarmacogenomica.tsx`
- Todos os simuladores de Fisiologia, Bioquímica, Farmacotécnica, Química Farmacêutica, Genética e Docência (~35 arquivos)

**Analytics (Frente 2)**:
- `src/pages/Analytics.tsx` -- Expandir `ParticipantDetail` para renderizar `simulator_decisions`

### Formato de Dados Padronizado

```text
actions = {
  type: "simulator_decisions",
  simulatorSlug: "prm",
  decisions: [
    {
      label: "Amoxicilina 500mg — PRM?",
      userChoice: "Sem PRM",
      idealChoice: "Sem PRM",
      correct: true,
      category: "Identificação",
      explanation: "Amoxicilina em dose adequada..."
    },
    ...
  ],
  summary: {
    score: 75,
    totalDecisions: 4,
    correctDecisions: 3,
    categories: {
      "Identificação": { correct: 2, total: 2 },
      "Classificação": { correct: 1, total: 2 }
    },
    strengths: ["Identificação de PRM"],
    weaknesses: ["Classificação do tipo de PRM"],
    pedagogicalNote: "Revise os critérios de..."
  }
}
```

### Observação Importante
O formato é retrocompatível: submissões antigas continuarão sendo renderizadas normalmente. O Analytics detecta o `type` do actions para decidir qual template de renderização usar.

### Estimativa
Devido ao volume de arquivos (~50+), a implementação será feita em lotes: primeiro os simuladores de Farmacologia Clínica (os mais críticos para o professor), depois os de Farmacologia Básica/Fisiologia/Bioquímica, e por fim o Analytics expandido.

