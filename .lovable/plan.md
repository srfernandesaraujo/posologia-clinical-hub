

## Laboratório de Modelagem Molecular — Plano de Construção

### Visão Geral

Nova bancada no hub de Laboratório Virtual com 5 módulos seguindo o padrão M1-M5 existente. Integra APIs públicas reais (PubChem, ChEMBL, Open Targets) e visualização molecular 2D/3D. O 3Dmol.js já está carregado globalmente no projeto.

### Arquitetura dos Módulos

```text
M1 — Busca e Seleção (PubChem)
  ↓ SMILES + propriedades originais
M2 — Editor Molecular + Modificações Guiadas
  ↓ SMILES modificado
M3 — Predição In Silico (Lipinski + ADMET)
  ↓ Score de drug-likeness
M4 — Dados Bioativos e Alvos (ChEMBL + Open Targets)
  ↓ Análise cruzada
M5 — Relatório (LabReportPanel)
```

### Limitação Técnica Importante

**RDKit.js** (WebAssembly): O pacote `@rdkit/rdkit` é grande (~15MB WASM) e tem compatibilidade instável com Vite/bundlers. Em vez de embutir RDKit.js no client, usaremos uma abordagem híbrida:
- **Cálculos de Lipinski**: feitos com parsing SMILES simplificado no frontend (contagem de átomos O/N, estimativa de MW por soma atômica) + validação via PubChem API para propriedades exatas
- **Renderização 2D**: via PubChem PNG endpoint (já usado no DrugDesignPanel existente)
- **Renderização 3D**: via 3Dmol.js (já carregado) + PubChem SDF endpoint
- **Modificações moleculares**: botões que aplicam transformações SMILES simples (concatenação de grupos funcionais) + edge function com IA para modificações mais complexas
- **ADMET**: edge function que consulta IA para predição baseada em SMILES

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/lab-virtual/BancadaModelagemMolecular.tsx` | Página principal — orquestra os 5 módulos |
| `src/components/lab-virtual/molmod/CompoundSearchPanel.tsx` | **M1** — Busca PubChem por nome, retorna SMILES + propriedades + estrutura 2D/3D |
| `src/components/lab-virtual/molmod/MoleculeEditorPanel.tsx` | **M2** — Visualização 2D (PubChem PNG) + 3D (3Dmol.js SDF) + botões de modificação funcional (Metila, Hidroxila, Amina, Halogênios) que editam o SMILES |
| `src/components/lab-virtual/molmod/InSilicoPredictionPanel.tsx` | **M3** — Lipinski (cálculo local), TPSA estimada, drug-likeness score + botão "Análise ADMET" via edge function |
| `src/components/lab-virtual/molmod/BioactivityPanel.tsx` | **M4** — Consulta ChEMBL API (atividade contra alvos) + Open Targets (associação doença-alvo) |
| `supabase/functions/predict-admet/index.ts` | Edge function — recebe SMILES, usa IA (callAI) para predição ADMET estruturada (hepatotoxicidade, mutagenicidade, solubilidade, BBB) |

### Arquivos a Editar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/LaboratorioVirtual.tsx` | Adicionar card "Modelagem Molecular" ao array `benches` |
| `src/App.tsx` | Adicionar rota `/laboratorio-virtual/modelagem-molecular` |
| `supabase/config.toml` | Adicionar `[functions.predict-admet]` |
| `supabase/functions/generate-lab-context/index.ts` | Adicionar case `"modelagem-molecular"` para geração de contexto com IA |

### Detalhes por Módulo

**M1 — Busca de Composto (CompoundSearchPanel)**
- Input de texto com nome do fármaco
- GET `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{nome}/JSON` → extrai CID, SMILES canônico (CanonicalSMILES), MW, XLogP, HBD, HBA, TPSA
- GET `.../PNG` para imagem 2D
- GET `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{nome}/SDF` para 3D no 3Dmol.js
- Exibe painel "Dados Clínicos Originais" com propriedades reais
- Botão "Usar este composto" que passa o SMILES para M2

**M2 — Editor Molecular (MoleculeEditorPanel)**
- Exibe molécula atual (2D via PubChem PNG do SMILES, 3D via 3Dmol.js)
- Painel lateral "Modificações Funcionais" com botões:
  - Metila (–CH₃): adiciona `C` ao SMILES
  - Hidroxila (–OH): adiciona `O` 
  - Amina (–NH₂): adiciona `N`
  - Flúor (–F): adiciona `F`
  - Cloro (–Cl): adiciona `Cl`
- Cada clique aplica a modificação e atualiza visualizações
- Input SMILES manual para edição direta
- Histórico de modificações (lista de SMILES anteriores)

**M3 — Predição In Silico (InSilicoPredictionPanel)**
- Cálculo local de Lipinski (MW, LogP, HBD, HBA estimados via PubChem property API para o SMILES modificado)
- GET `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/{SMILES}/property/MolecularWeight,XLogP,HBondDonorCount,HBondAcceptorCount,TPSA/JSON`
- Indicadores visuais (verde/amarelo/vermelho) para cada critério
- Botão "Executar Análise ADMET" → chama edge function `predict-admet`
- Resultados ADMET: hepatotoxicidade, mutagenicidade, solubilidade aquosa, penetração BBB, com semáforos

**M4 — Bioatividade e Alvos (BioactivityPanel)**
- Busca ChEMBL: `https://www.ebi.ac.uk/chembl/api/data/molecule/search?q={nome}&format=json` → lista atividades biológicas (IC50, EC50, Ki contra alvos)
- Busca Open Targets: `https://api.platform.opentargets.org/api/v4/graphql` (POST GraphQL) → associações doença-alvo do composto
- Tabela de alvos biológicos com scores de associação
- Tabela de doenças relacionadas

**M5 — Relatório (LabReportPanel)** — usa componente existente

### Edge Function: predict-admet

Recebe `{ smiles }`, usa `callAI` com tool calling para retornar predições ADMET estruturadas baseadas na estrutura molecular. O prompt instrui a IA a agir como sistema de predição ADMET, analisando o SMILES e retornando scores para: absorção oral, solubilidade, hepatotoxicidade, mutagenicidade, penetração BBB, ligação a proteínas plasmáticas.

### AIContextGenerator — Case "modelagem-molecular"

Gera um composto base com SMILES real, propriedades PubChem, e sugere modificações a explorar.

### Notas Técnicas

- Todas as chamadas a PubChem/ChEMBL/Open Targets são feitas diretamente do frontend (APIs públicas, sem necessidade de chave)
- PubChem tem rate limit de 5 req/seg — usar debounce de 500ms nas buscas
- A modificação de SMILES por concatenação é simplificada (não gera todas as posições possíveis de substituição). Para modificações mais complexas, o M2 oferece input SMILES manual
- 3Dmol.js aceita formato SDF diretamente (`viewer.addModel(sdfData, "sdf")`)

