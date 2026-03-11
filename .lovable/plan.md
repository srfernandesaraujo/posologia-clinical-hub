

# Plano: Laboratório Virtual de Desenvolvimento de Fármacos

## Resumo

Criar uma nova seção "Laboratório Virtual" no sistema — uma ferramenta standalone (não um simulador clínico com casos) com 4 módulos interativos: Validação do Alvo (visualização 3D via AlphaFold), Design do Protótipo (Lipinski), Simulação de Docking/ADME e Ensaios Clínicos Simulados. Tema escuro, dashboard científico.

---

## Arquitetura

O Laboratório Virtual é uma **página independente** (não segue o padrão dos simuladores clínicos com casos nativos/IA). É uma ferramenta interativa contínua onde os módulos se comunicam em tempo real.

```text
┌─────────────────────────────────────────────────────┐
│  LaboratorioVirtual.tsx (página principal)           │
│  ┌─────────────┐  ┌──────────────┐                  │
│  │ TargetPanel  │  │ DrugDesign   │                  │
│  │ (Módulo 1)   │  │ Panel (Mód2) │                  │
│  └─────────────┘  └──────────────┘                  │
│  ┌─────────────┐  ┌──────────────┐                  │
│  │ DockingADME  │  │ ClinicalTrial│                  │
│  │ Panel (Mód3) │  │ Panel (Mód4) │                  │
│  └─────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────┘
```

---

## Módulo 1: Validação do Alvo (AlphaFold)

**Componente:** `src/components/lab-virtual/TargetValidationPanel.tsx`

- **Dropdown (Select)** com 9 proteínas pré-programadas:
  - Receptor Beta-1 Adrenérgico (P08588)
  - Receptor Opioide Mi (P35372)
  - Receptor de Glicocorticoides (P04150)
  - COX-2 (P35354)
  - ECA (P12821)
  - HMG-CoA Redutase (P04035)
  - Acetilcolinesterase (P22303)
  - Protease Mpro SARS-CoV-2 (P0DTD1)
  - PBP2 S. aureus (P0A050)
- Campo de busca livre para IDs UniProt customizados
- Fetch da API pública AlphaFold: `https://alphafold.ebi.ac.uk/api/prediction/{uniprotId}`
- Visualização 3D via **3Dmol.js** (carregada via CDN/script tag, sem pacote npm — é a abordagem mais compatível com React)
- Spinner durante carregamento, exibição de metadados da proteína (nome, organismo, confiança)

## Módulo 2: Design do Protótipo (Lipinski)

**Componente:** `src/components/lab-virtual/DrugDesignPanel.tsx`

- 4 Sliders (Radix UI Slider já existente):
  - Peso Molecular (100–800 g/mol)
  - LogP (-2 a 7)
  - Doadores HB (0–10)
  - Aceitadores HB (0–15)
- Validação Lipinski em tempo real com indicadores verde/vermelho (Badge)
- Tooltips explicativos em cada termo técnico
- Estado compartilhado com Módulo 3 via props/state lifting

## Módulo 3: Simulação de Docking e ADME

**Componente:** `src/components/lab-virtual/DockingADMEPanel.tsx`

- Botão "Simular Interação Fármaco-Receptor"
- Cálculo mock com lógica matemática plausível baseada nos inputs do Módulo 2:
  - ΔG (energia de ligação) derivado de MW, LogP, HBD, HBA
  - Scores ADME (Absorção, Distribuição, Metabolismo, Excreção, Toxicidade) calculados por fórmulas heurísticas
- Gráfico de Radar ADME via **Recharts** (já instalado)
- Card com ΔG e Ki estimados

## Módulo 4: Ensaios Clínicos Simulados

**Componente:** `src/components/lab-virtual/ClinicalTrialPanel.tsx`

- Simulação de eficácia em "população virtual" com variação genética
- Inputs: tamanho da amostra, fases (I/II/III)
- Resultados mock: taxa de resposta, efeitos adversos, curva de Kaplan-Meier simplificada (Recharts AreaChart)
- Variação genética: metabolizadores lentos/rápidos/ultrarrápidos afetam outcomes

---

## Arquivos a criar

1. **`src/pages/LaboratorioVirtual.tsx`** — Página principal com layout grid 2x2, tema escuro forçado, state management central
2. **`src/components/lab-virtual/TargetValidationPanel.tsx`** — Módulo 1
3. **`src/components/lab-virtual/DrugDesignPanel.tsx`** — Módulo 2
4. **`src/components/lab-virtual/DockingADMEPanel.tsx`** — Módulo 3
5. **`src/components/lab-virtual/ClinicalTrialPanel.tsx`** — Módulo 4
6. **`src/components/lab-virtual/MoleculeViewer.tsx`** — Wrapper React para 3Dmol.js

## Arquivos a editar

1. **`src/App.tsx`** — Adicionar rota `/laboratorio-virtual` (protegida)
2. **`src/components/layouts/AppLayout.tsx`** — Adicionar item "Laboratório Virtual" no menu/sidebar
3. **`index.html`** — Adicionar script CDN do 3Dmol.js: `<script src="https://3Dmol.org/build/3Dmol-min.js"></script>`

## Detalhes técnicos

- **3Dmol.js**: Carregado via CDN no index.html. O wrapper React usa `useRef` + `useEffect` para criar o viewer (`$3Dmol.createViewer`). Busca o PDB/CIF da API AlphaFold e renderiza em ribbon/surface com toggle.
- **Estado compartilhado**: A página principal mantém `drugProperties` (MW, LogP, HBD, HBA) e `selectedTarget` como state. Módulo 2 atualiza as props, Módulo 3 lê para recalcular quando o botão é clicado.
- **Tema escuro**: Classes Tailwind `bg-gray-950 text-gray-100` no container principal, cards com `bg-gray-900 border-gray-800`.
- **Sem dependências novas** além do CDN do 3Dmol.js — usa Recharts (já instalado), Radix Slider/Select/Tooltip (já instalados).

