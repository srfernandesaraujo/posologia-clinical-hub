

## Analise: Elevar o Laboratorio de Modelagem Molecular ao Nivel de Pesquisa Cientifica

### O que existe hoje

O laboratorio possui 4 modulos + relatorio:
1. **M1 - Busca de Composto** -- Busca por nome no PubChem, importa propriedades (MW, LogP, HBD, HBA, TPSA, SMILES, formula) e exibe estrutura 2D
2. **M2 - Editor Molecular** -- Visualizacao 2D/3D (3Dmol.js com fallback em cadeia), modificacoes funcionais por append de SMILES (metila, hidroxila, amina, fluor, cloro, carbonila), edicao manual, historico de modificacoes com undo
3. **M3 - Predicao In Silico** -- Lipinski automatico via PubChem (atualiza com debounce), ADMET via edge function `predict-admet` com IA (absorcao, hepatotoxicidade, mutagenicidade, BHE, CYP450, ligacao plasmatica)
4. **M4 - Bioatividade e Alvos** -- Busca ChEMBL (IC50, EC50, Ki contra alvos) + Open Targets (associacoes doenca-alvo com score)
5. **M5 - Relatorio** -- Texto livre + PDF

### Limitacoes para pesquisa real

- Sem biblioteca de compostos comparativa (analisa 1 composto por vez)
- Sem score de druglikeness multi-criterio (so Lipinski basico)
- Sem exportacao de dados estruturados (CSV)
- Sem historico de sessoes salvo no banco
- Editor molecular limitado (append de grupos funcionais no final do SMILES, nao substitui/modifica posicoes)
- Sem similaridade molecular (buscar analogos de um composto)
- Sem visualizacao de propriedades comparativas (graficos radar/scatter)
- Sem integracao com UniProt/RCSB PDB para alvos proteicos

### Melhorias Propostas (por impacto)

**Tier 1 -- Capacidade de Pesquisa Comparativa**

| Funcionalidade | Descricao | Impacto |
|---|---|---|
| **Biblioteca de Compostos** | Painel para adicionar multiplos compostos, compara-los em tabela com sorting (MW, LogP, ADMET score, bioatividade). Exportacao CSV | Permite screening virtual de series de compostos |
| **Score Druglikeness Multi-Criterio** | Score 0-100 combinando Lipinski, Veber (TPSA ≤ 140, rotatable bonds ≤ 10), Ghose, Lead-likeness e alertas PAINS em dashboard visual | Avaliacao profissional como em softwares comerciais |
| **Busca de Similaridade Molecular** | Dado um composto, buscar analogos no PubChem por similaridade (Tanimoto ≥ 0.8) para encontrar candidatos alternativos | Expande o espaco quimico explorado |

**Tier 2 -- Integracao com Bases de Dados Proteicos**

| Funcionalidade | Descricao | Impacto |
|---|---|---|
| **Modulo de Alvo Proteico (UniProt/RCSB PDB)** | Buscar proteinas-alvo por nome ou gene, visualizar estrutura 3D via RCSB PDB, exibir informacoes funcionais do UniProt | Conecta o composto ao seu alvo biologico real |
| **Docking Conceitual** | Visualizar composto e proteina-alvo simultaneamente, calcular estimativas de afinidade baseadas em propriedades moleculares | Simula o pipeline real de drug discovery |

**Tier 3 -- Diferencial de Mercado**

| Funcionalidade | Descricao | Impacto |
|---|---|---|
| **Analise SAR Automatizada** | Com 3+ compostos na biblioteca, gerar graficos de correlacao (LogP vs ADMET score, MW vs bioatividade) e identificar tendencias | Insights publicaveis de relacao estrutura-atividade |
| **Historico de Experimentos (Supabase)** | Salvar sessoes completas (compostos, propriedades, ADMET, bioatividade) no banco, com possibilidade de retomar | Permite construir datasets longitudinais |
| **Exportacao Cientifica PDF Estruturado** | PDF formatado como relatorio de pesquisa com tabelas de propriedades, graficos comparativos, referencias bibliograficas | Resultados prontos para publicacao/TCC |

### Recomendacao de Implementacao (5 funcionalidades prioritarias)

1. **Biblioteca de Compostos com Tabela Comparativa** -- Adicionar compostos analisados a uma lista, comparar lado a lado com sorting, exportar CSV
2. **Score Druglikeness Multi-Criterio** -- Dashboard visual com Lipinski + Veber + Ghose + Lead-likeness + PAINS
3. **Busca de Similaridade Molecular** -- PubChem Similarity Search API para encontrar analogos estruturais
4. **Modulo de Alvo Proteico** -- Busca UniProt + visualizacao 3D do alvo via RCSB PDB (reutiliza 3Dmol.js ja integrado)
5. **Analise SAR + Exportacao Cientifica** -- Graficos de correlacao com Recharts + PDF estruturado com tabelas

### Detalhes Tecnicos

**Arquivos novos:**
- `src/components/lab-virtual/molmod/CompoundLibraryPanel.tsx` -- Tabela comparativa com sorting, remocao e exportacao CSV
- `src/components/lab-virtual/molmod/DruglikenessPanel.tsx` -- Dashboard multi-criterio com radar chart (Recharts)
- `src/components/lab-virtual/molmod/SimilaritySearchPanel.tsx` -- Busca de analogos via PubChem Similarity API
- `src/components/lab-virtual/molmod/ProteinTargetPanel.tsx` -- Busca UniProt + visualizacao RCSB PDB via 3Dmol.js

**Arquivos modificados:**
- `BancadaModelagemMolecular.tsx` -- Adicionar estado de biblioteca, novos modulos, exportacao
- `CompoundSearchPanel.tsx` -- Botao "Adicionar a Biblioteca" alem de "Usar no Editor"

**APIs externas (gratuitas, sem chave):**
- PubChem PUG REST: Similarity Search (`/compound/fastsimilarity_2d/smiles/.../property/.../JSON`)
- UniProt REST API: Busca de proteinas (`https://rest.uniprot.org/uniprotkb/search`)
- RCSB PDB: Estruturas 3D (`https://files.rcsb.org/download/{PDB_ID}.pdb`)
- 3Dmol.js: Ja integrado no projeto para visualizacao 3D

