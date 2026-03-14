

# MedView 3D — Demonstração de Procedimentos Médicos

## Visão Geral

Novo módulo do sistema chamado **"MedView 3D"** que permite a profissionais de saúde demonstrar procedimentos cirúrgicos e clínicos usando modelos anatômicos 3D interativos embutidos via iframe (Sketchfab Viewer API como placeholder inicial, preparado para BioDigital Human API).

O módulo segue o padrão organizacional existente: uma **página-índice** com sidebar de categorias (igual a Simuladores/Calculadoras/Jogos) e **páginas individuais** para cada procedimento.

---

## Estrutura de Arquivos

```text
src/pages/
  MedView3D.tsx                          ← Página-índice com sidebar + grid/list
  medview3d/
    OrtopediaProteses.tsx                ← Pinos, placas, prótese joelho/quadril
    CardiologiaStent.tsx                 ← Cateter, balão, stent
    OdontologiaImplantes.tsx             ← Extrações, implantes, ortodontia
    FarmacologiaDispositivos.tsx          ← Implante subcutâneo, DIU, terapias-alvo
    DermatologiaCirurgiaPlastica.tsx      ← Toxina botulínica, preenchedores
    CirurgiaGeralLaparoscopia.tsx         ← Colecistectomia, apendicectomia

src/components/medview3d/
    External3DViewer.tsx                 ← Componente iframe responsivo
    MedViewToolbar.tsx                   ← Barra de ferramentas médicas
    ProcedureTimeline.tsx                ← Slider de linha do tempo do procedimento
    ProcedureStepCard.tsx                ← Card com descrição do passo atual
```

---

## Componentes Principais

### 1. External3DViewer
- Recebe `modelId` (string) como prop
- Renderiza um `<iframe>` responsivo apontando para Sketchfab embed (`https://sketchfab.com/models/{modelId}/embed`)
- Preparado com ref para futura integração via `postMessage` com Sketchfab Viewer API ou BioDigital Human API
- Controles de rotação e zoom nativos do iframe

### 2. MedViewToolbar
- Botões com ícones Lucide:
  - **Isolar Estrutura** (`Focus`) — `handleIsolateStructure()` stub
  - **Raio-X / Transparência** (`Layers`) — `handleToggleTransparency()` stub
  - **Play Animação** (`Play`) — `handlePlayAnimation()` stub
  - **Anotações** (`MessageCircle`) — `handleAddAnnotation()` stub
- Todas as funções são stubs com comentários explicando que enviarão `postMessage` para a API do iframe

### 3. ProcedureTimeline
- Componente `Slider` (já existente em `ui/slider.tsx`)
- Array de passos do procedimento com `{ stepNumber, title, description, modelId? }`
- Ao mover o slider, atualiza o passo atual e opcionalmente troca o modelo/anotação no viewer
- Botões "Anterior" e "Próximo" (`ChevronLeft`, `ChevronRight`)

### 4. Página-índice MedView3D.tsx
- Layout idêntico ao de Simuladores: sidebar com categorias, busca, toggle grid/list
- 6 categorias com procedimentos listados como cards

---

## Categorias e Procedimentos

| Categoria | Procedimentos |
|---|---|
| Ortopedia e Traumatologia | Prótese de joelho, Prótese de quadril, Fixação com placa e parafusos |
| Cardiologia Intervencionista | Angioplastia com stent, Cateterismo cardíaco |
| Odontologia e Bucomaxilofacial | Implante dentário, Extração de dente incluso, Movimentação ortodôntica |
| Farmacologia e Dispositivos | Inserção de DIU, Implante subdérmico, Via de terapia-alvo |
| Dermatologia e Cirurgia Plástica | Aplicação de toxina botulínica, Preenchimento facial |
| Cirurgia Geral | Colecistectomia laparoscópica, Apendicectomia laparoscópica |

---

## Layout da Página de Procedimento

```text
┌─────────────────────────────────────────────────────┐
│  ← Voltar    Prótese de Joelho    [categoria badge] │
├───────────────────────────────┬─────────────────────┤
│                               │  Toolbar Médica     │
│                               │  ┌───┐ Isolar       │
│    External3DViewer           │  ┌───┐ Raio-X       │
│    (iframe Sketchfab)         │  ┌───┐ Play         │
│    ~70% da largura            │  ┌───┐ Anotações    │
│                               │                     │
├───────────────────────────────┴─────────────────────┤
│  Timeline: ◄ [====●===========] ►  Passo 2 de 5    │
│  "Posicionamento do guia femoral"                   │
└─────────────────────────────────────────────────────┘
```

Design: tons de azul clínico (`sky-50`, `slate-100`), branco, tipografia limpa. Prioriza espaço do iframe.

---

## Integração no Sistema

1. **AppLayout.tsx** — Adicionar item de navegação "MedView 3D" com ícone `Eye` ou `Scan`
2. **App.tsx** — Registrar rotas:
   - `/medview-3d` → página-índice
   - `/medview-3d/ortopedia-proteses` → página do procedimento (e assim para cada um)
3. **Home.tsx / Documentacao.tsx** — Adicionar seção descritiva do novo módulo
4. **Modelos placeholder** — Usar IDs públicos de modelos anatômicos do Sketchfab (ex: coração, joelho, crânio) como demonstração inicial

---

## Detalhes Técnicos

- **Sem dependência de Three.js** — todo o 3D é delegado ao iframe externo
- **Stubs com postMessage** — cada função de toolbar terá um padrão:
  ```typescript
  // Será integrado com Sketchfab Viewer API ou BioDigital Human API
  // via iframe.contentWindow.postMessage(...)
  const handleIsolateStructure = () => {
    toast.info("Função será integrada com a API do visualizador 3D");
  };
  ```
- **Slider nativo** — reutiliza `@/components/ui/slider` existente
- **Feature gating** — módulo disponível para todos os planos (ou configurável via `useFeatureGating`)

