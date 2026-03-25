

## Análise: Elevar o Laboratório de Desenvolvimento de Fármacos ao Nível de Pesquisa Científica

### O que existe hoje

O laboratório atual possui 5 módulos em pipeline linear:
1. **Validação do Alvo** — Seleção de proteínas via UniProt/AlphaFold com visualização 3D
2. **Design do Protótipo** — Sliders de propriedades (MW, LogP, HBD, HBA) + input SMILES com Lipinski
3. **Docking & ADME** — Simulação rápida com cálculos determinísticos de ΔG, Ki, radar ADME
4. **Ensaio Clínico** — Curva Kaplan-Meier simplificada, variação farmacogenética
5. **Mini-Relatório** — Texto livre (hipótese, resultados, conclusão) + PDF

### Limitações para uso em pesquisa real

- Propriedades calculadas internamente com fórmulas simplificadas (não consulta dados reais)
- Sem integração com bancos de dados reais de moléculas (PubChem, ChEMBL, DrugBank)
- Sem capacidade de comparar múltiplos candidatos lado a lado
- Sem predição ADMET baseada em IA (a edge function `predict-admet` existe mas não é usada)
- Sem exportação de dados estruturados (CSV/Excel) para análise externa
- Sem histórico de experimentos salvos no banco
- Sem análise SAR (relação estrutura-atividade) entre compostos testados

### Melhorias Propostas (por impacto)

**Tier 1 — Dados Reais e Publicáveis**

| Funcionalidade | Descrição | Impacto |
|---|---|---|
| **Busca PubChem integrada ao M2** | Buscar compostos reais por nome/SMILES no PubChem, importando MW, LogP, TPSA, HBD, HBA automaticamente em vez de ajustar manualmente | Elimina dados fictícios; propriedades reais e citáveis |
| **Predição ADMET com IA (M3)** | Conectar o M3 à edge function `predict-admet` já existente para obter predições baseadas em IA (absorção, hepatotoxicidade, mutagenicidade, inibição CYP, penetração BHE, meia-vida) | Predições sofisticadas em vez de fórmulas determinísticas |
| **Consulta ChEMBL para bioatividade** | Buscar dados de bioatividade conhecida (IC50, EC50, Ki) de compostos reais contra o alvo selecionado no M1 | Contextualiza o protótipo com a literatura existente |

**Tier 2 — Fluxo de Pesquisa Profissional**

| Funcionalidade | Descrição | Impacto |
|---|---|---|
| **Biblioteca de Candidatos (Compound Library)** | Painel para adicionar múltiplos compostos, compará-los lado a lado em tabela com sorting por propriedade (MW, LogP, ADMET score, ΔG) | Permite screening virtual de séries de compostos |
| **Análise SAR automatizada** | Ao ter 3+ compostos na biblioteca, gerar automaticamente gráficos de correlação (LogP vs Absorção, MW vs ΔG) e identificar tendências | Gera insights publicáveis de relação estrutura-atividade |
| **Histórico de Experimentos (Supabase)** | Salvar cada experimento completo (alvo, compostos, resultados ADMET, docking, ensaio clínico) no banco de dados com timestamp | Permite retomar pesquisas e construir datasets |

**Tier 3 — Diferencial de Mercado Único**

| Funcionalidade | Descrição | Impacto |
|---|---|---|
| **Exportação Científica (CSV + PDF estruturado)** | Exportar toda a biblioteca de compostos + resultados em CSV para análise em R/Python, e PDF formatado como relatório de pesquisa (com tabelas, gráficos, referências) | Resultados prontos para publicação/TCC |
| **Módulo de Otimização Hit-to-Lead** | Painel com sugestões de modificações estruturais baseadas em IA: "Adicionar grupo hidroxila na posição X para melhorar absorção" | Simula o processo real de otimização medicinal |
| **Score de Druglikeness Composto** | Score unificado (0-100) combinando Lipinski, Veber (TPSA, rotatable bonds), PAINS alerts e Lead-likeness em um dashboard visual | Avaliação multi-critério como em softwares profissionais |

### Recomendação de Implementação (5 funcionalidades prioritárias)

1. **Busca PubChem no M2** — Importar propriedades reais de compostos conhecidos
2. **Predição ADMET com IA no M3** — Usar a edge function existente `predict-admet`
3. **Biblioteca de Candidatos** — Tabela comparativa de múltiplos compostos
4. **Exportação CSV + PDF estruturado** — Dados exportáveis para análise e publicação
5. **Score de Druglikeness Composto** — Dashboard visual multi-critério (Lipinski + Veber + PAINS)

### Detalhes Técnicos

**Arquivos novos:**
- `src/components/lab-virtual/CompoundLibraryPanel.tsx` — Tabela de compostos com sorting/filtering
- `src/components/lab-virtual/DruglikenessScorePanel.tsx` — Dashboard visual multi-critério

**Arquivos modificados:**
- `DrugDesignPanel.tsx` — Adicionar busca PubChem (API PUG REST) para importar propriedades reais
- `DockingADMEPanel.tsx` — Integrar chamada à edge function `predict-admet` na aba Docking
- `BancadaFarmacos.tsx` — Adicionar estado de compound library, novo módulo, exportação CSV
- `LabReportPanel.tsx` — Enriquecer PDF com tabelas de dados e gráficos

**APIs externas (já usadas no projeto):**
- PubChem PUG REST (já usado na bancada de Modelagem Molecular)
- Edge function `predict-admet` (já deployada, não conectada ao lab)

**Banco de dados:**
- Nova tabela `lab_experiments` para persistir sessões de pesquisa (opcional, pode ser implementada depois)

