

## Geração de Contexto com IA para Todos os Laboratórios Virtuais

### Visão Geral

Adicionar um botão **"Gerar Contexto com IA"** no Módulo 1 de cada bancada, ao lado dos itens pré-cadastrados. Ao clicar, a IA gera um **contexto completo** com todos os dados necessários para o fluxo inteiro daquela bancada (não apenas o M1, mas todos os módulos subsequentes), retornado via tool calling em formato estruturado.

### Arquitetura

```text
┌─────────────────────────────────────────────────┐
│  Bancada (M1 - Seleção de Contexto)             │
│  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ Lista Nativa │  │ 🤖 Gerar com IA         │  │
│  │ (Select)     │  │ (Input tema + botão)    │  │
│  └──────────────┘  └──────┬──────────────────┘  │
│                           │                      │
│                    Edge Function                 │
│                    generate-lab-context           │
│                           │                      │
│              Retorna contexto completo            │
│              para todos os módulos M1→M5         │
└─────────────────────────────────────────────────┘
```

### Edge Function: `generate-lab-context`

Uma **única edge function** que recebe o `labType` (ex: `"farmacos"`, `"microbiologia"`, `"toxicologia"`) e um `theme` opcional do usuário. O system prompt e o schema do tool calling variam por `labType`.

Cada `labType` define:
- **System prompt** específico com as regras do laboratório
- **Tool schema** com a estrutura de dados que aquele lab espera (ex: para Fármacos → proteína alvo + propriedades do protótipo + dados de docking + ensaio clínico; para Microbiologia → bactéria + mapa de resistência + dados de crescimento; etc.)

A função usa o `callAI` compartilhado existente (prioriza provedores externos, fallback para Lovable AI).

### Dados Gerados por Laboratório

| Lab | Contexto gerado pela IA |
|-----|------------------------|
| **Fármacos** | Proteína alvo (nome, ID fictício, categoria, fármacos relacionados), propriedades sugeridas do protótipo (MW, LogP, HBD, HBA), dados de afinidade para docking |
| **Microbiologia** | Bactéria (nome, gram, habitat, mecanismos de resistência), mapa de MIC/breakpoints para 6 antibióticos, parâmetros de curva de crescimento |
| **Toxicologia** | Substância (nome, LD50, ED50, Hill N, mecanismo de toxicidade, uso clínico), modelo animal sugerido |
| **Farmacogenômica** | Fármaco (nome, enzima CYP, tipo pro/drug, parâmetros PK base), fenótipos com fatores de metabolismo |
| **Estabilidade** | Formulação (nome, k25, ordem cinética, Ea, concentração inicial), condições de armazenamento sugeridas |
| **Controle de Qualidade** | Analito (nome, concentração verdadeira, unidade, especificação), método analítico sugerido |
| **Epidemiologia** | Exposição (nome, OR base), desfecho (nome, prevalência), tipo de estudo sugerido |
| **Biotecnologia** | Gene/proteína (nome, MW, temp ótima, IPTG ótimo), vetor e cepa sugeridos |
| **Perícia Forense** | Caso criminal completo (narrativa, vítima, 3 suspeitos, amostras químicas com espectros, matrizes biológicas com cromatogramas, perfis de DNA, culpado correto, explicações) |
| **Simulação Realística** | Já possui geração via IA (edge function `generate-simulation-scenario`) — apenas adicionar botão de tema livre |

### Mudanças na UI (Padrão para todos os labs)

Em cada bancada, no M1, adicionar ao lado do `<Select>` existente:
- Um `<Collapsible>` ou seção com ícone `Sparkles`
- Input de texto: "Descreva o tema ou contexto desejado (opcional)"
- Botão "Gerar com IA" com loading state
- Ao receber o contexto, preenche automaticamente os estados do lab como se o usuário tivesse selecionado um item nativo

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/generate-lab-context/index.ts` | Edge function única com branching por `labType`, system prompts e schemas específicos |
| `src/components/lab-virtual/AIContextGenerator.tsx` | Componente reutilizável com input + botão + loading, usado em todos os labs |

### Arquivos a Editar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/lab-virtual/BancadaFarmacos.tsx` | Adicionar `AIContextGenerator` no M1, callback para setar `selectedTarget` e `drugProperties` |
| `src/pages/lab-virtual/BancadaMicrobiologia.tsx` | Adicionar `AIContextGenerator`, callback para injetar bactéria + resistência customizada |
| `src/pages/lab-virtual/BancadaToxicologia.tsx` | Adicionar `AIContextGenerator`, callback para injetar substância customizada |
| `src/pages/lab-virtual/BancadaFarmacogenomica.tsx` | Adicionar `AIContextGenerator`, callback para injetar fármaco + parâmetros PK |
| `src/pages/lab-virtual/BancadaEstabilidade.tsx` | Adicionar `AIContextGenerator`, callback para injetar formulação |
| `src/pages/lab-virtual/BancadaControleQualidade.tsx` | Adicionar `AIContextGenerator`, callback para injetar analito |
| `src/pages/lab-virtual/BancadaEpidemiologia.tsx` | Adicionar `AIContextGenerator`, callback para injetar exposição + desfecho |
| `src/pages/lab-virtual/BancadaBiotecnologia.tsx` | Adicionar `AIContextGenerator`, callback para injetar gene + vetor |
| `src/pages/lab-virtual/BancadaPericiaForense.tsx` | Adicionar `AIContextGenerator`, callback para injetar cenário forense completo |
| `src/pages/lab-virtual/BancadaSimulacaoRealistica.tsx` | Adicionar input de tema livre (já usa IA, apenas expandir para aceitar tema customizado) |
| `supabase/config.toml` | Adicionar `[functions.generate-lab-context]` com `verify_jwt = false` |

### Restrição de Acesso

A geração com IA será restrita a usuários **admin** (conforme regra existente do sistema). O componente `AIContextGenerator` verificará a role do usuário e exibirá lock badge para não-admins.

### Fluxo Técnico

1. Usuário clica "Gerar com IA" → `AIContextGenerator` chama `supabase.functions.invoke("generate-lab-context", { body: { labType, theme } })`
2. Edge function seleciona o prompt/schema do `labType`, chama `callAI` com tool calling
3. Retorna o contexto estruturado
4. O componente pai recebe via callback `onContextGenerated(data)` e injeta nos estados do lab
5. O lab prossegue normalmente com os dados gerados, como se fossem nativos

