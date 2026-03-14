

## Plano: Seletor Sketchfab / BioDigital no MedView 3D

### Resumo
Adicionar um toggle que permite ao usuário alternar entre **Sketchfab** (atual) e **BioDigital Human** como provedor de visualização 3D. O BioDigital funcionará via embed básico de iframe (sem developer key), exibindo modelos públicos anatômicos.

---

### Componentes

**1. Novo componente `BioDigital3DViewer.tsx`**
- Iframe simples apontando para `https://human.biodigital.com/widget/?be=<MODEL_ID>`
- Mesma interface visual do `External3DViewer` (borda, loading state, placeholder quando sem modelo)
- Sem API programática (toolbar será desabilitada no modo BioDigital)

**2. Novo componente `BioDigitalModelSearch.tsx`**
- Campo de busca que abre resultados do BioDigital em uma lista curada (IDs pré-mapeados por especialidade)
- Como BioDigital não tem API de busca pública gratuita, usaremos uma **lista curada de modelos** por especialidade (heart, knee, skull, etc.) que o usuário pode selecionar
- Alternativa: link direto para `human.biodigital.com/search?q=` abrindo em nova aba para o usuário copiar o ID

**3. Seletor de provedor (toggle)**
- Componente inline com dois botões (Sketchfab | BioDigital) posicionado ao lado do botão de busca existente
- Estado `provider: "sketchfab" | "biodigital"` em cada página de procedimento
- Quando BioDigital ativo: mostra `BioDigital3DViewer` + busca curada; toolbar desabilitada com tooltip explicativo
- Quando Sketchfab ativo: comportamento atual mantido integralmente

**4. Dados curados BioDigital**
- Arquivo `src/data/biodigitalModels.ts` com mapeamento de modelos por especialidade:
  - Cardiologia: coração, artérias coronárias, stent
  - Ortopedia: joelho, quadril, coluna
  - Odontologia: mandíbula, implante
  - etc.
- Cada entrada: `{ id: string, name: string, specialty: string }`

---

### Arquivos editados/criados

| Arquivo | Ação |
|---------|------|
| `src/components/medview3d/BioDigital3DViewer.tsx` | **Criar** — iframe viewer |
| `src/components/medview3d/BioDigitalModelSearch.tsx` | **Criar** — seletor de modelos curados |
| `src/components/medview3d/ProviderToggle.tsx` | **Criar** — toggle Sketchfab/BioDigital |
| `src/data/biodigitalModels.ts` | **Criar** — catálogo curado |
| `src/pages/medview3d/*.tsx` (6 arquivos) | **Editar** — adicionar estado `provider`, renderizar viewer/search condicional, desabilitar toolbar no modo BioDigital |
| `src/components/medview3d/MedViewToolbar.tsx` | **Editar** — aceitar prop `disabled` para modo BioDigital |

### Comportamento
- Por padrão, abre com **Sketchfab** (comportamento atual preservado)
- Toggle troca o viewer instantaneamente; ao voltar para Sketchfab, recarrega o modelo curado do step atual
- Toolbar mostra tooltip "Ferramentas indisponíveis no modo BioDigital" quando desabilitada
- Estado do provider é local por página (não persiste entre navegações)

