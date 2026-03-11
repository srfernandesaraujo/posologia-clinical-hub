

# Plano: Aba SMILES no Módulo 2

## Resumo

Adicionar uma segunda versão do Módulo 2 (aba "SMILES") que permite entrada de notação SMILES com visualização 2D da molécula e sliders manuais para propriedades + validação Lipinski. A versão atual vira a aba "Sliders". Ambas compartilham o mesmo `DrugProperties` state.

## Abordagem

### Estrutura

- **`DrugDesignPanel.tsx`**: Adicionar `Tabs` (Radix) com duas abas: "Sliders" (conteúdo atual) e "SMILES" (novo conteúdo).
- O conteúdo SMILES fica dentro do mesmo componente para manter coesão e compartilhar `properties`/`onChange`.

### Aba SMILES — Layout em duas colunas

**Painel Esquerdo:**
- Input de texto para SMILES
- 3 botões de exemplo rápido: Aspirina (`CC(=O)Oc1ccccc1C(=O)O`), Ibuprofeno (`CC(C)Cc1ccc(cc1)C(C)C(=O)O`), Paracetamol (`CC(=O)Nc1ccc(O)cc1`)
- Visualização 2D da molécula via **API do PubChem** (imagem PNG): `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/{smiles}/PNG` — abordagem mais segura que SmilesDrawer (que pode ter problemas de build). Se a imagem falhar, exibe placeholder.

**Painel Direito:**
- 4 sliders idênticos ao modo Sliders, mas com ranges ajustados conforme spec (MW 0-1000, LogP -5 a 10, HBD 0-15, HBA 0-20)
- Indicadores Lipinski (reutiliza componentes existentes)
- Banner amarelo de alerta se >1 violação

### Detalhes técnicos

- A imagem PubChem é buscada com debounce (~500ms) ao digitar no input SMILES. O SMILES é URL-encoded.
- Ambas as abas escrevem no mesmo `properties` state → Módulos 3 e 4 reagem automaticamente.
- Sem novas dependências — usa fetch + img tag para renderizar a molécula 2D.

## Arquivo a editar

1. **`src/components/lab-virtual/DrugDesignPanel.tsx`** — Refatorar para conter Tabs com aba "Sliders" (código atual) e aba "SMILES" (novo).

