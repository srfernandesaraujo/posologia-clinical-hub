

## Laboratório de Simulação Realística — Plano de Implementação

### Visão Geral

Criar uma nova bancada no Laboratório Virtual chamada **"Simulação Realística"** onde o aluno recebe o prontuário de um paciente virtual e toma decisões clínicas passo a passo (análise de exames, escolha de condutas, verificação de interações, ajuste de dose). Cada decisão altera o estado do paciente em tempo real, criando uma árvore de decisão ramificada.

### Arquitetura

A bancada será composta por **5 painéis modulares** (mesmo padrão do lab de Fármacos), com integração à **Lovable AI** para gerar cenários ramificados dinamicamente:

```text
┌─────────────────────────────────────────────────────┐
│  Bancada: Simulação Realística                       │
│                                                       │
│  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │ M1 — Prontuário  │  │ M2 — Painel de Decisão   │  │
│  │ (Patient Record) │  │ (Branching Choices)       │  │
│  │ - Dados pessoais │  │ - 3-4 opções por etapa   │  │
│  │ - Sinais vitais  │  │ - Feedback por escolha   │  │
│  │ - Medicações     │  │ - Timer opcional         │  │
│  │ - Exames labs    │  │ - Justificativa clínica  │  │
│  └──────────────────┘  └──────────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │ M3 — Monitor do  │  │ M4 — Linha do Tempo      │  │
│  │ Paciente         │  │ (Decision Tree)          │  │
│  │ - Sinais vitais  │  │ - Caminho percorrido     │  │
│  │   em tempo real  │  │ - Score acumulado        │  │
│  │ - Gráficos       │  │ - Branches disponíveis   │  │
│  │ - Alertas        │  │ - Progress bar           │  │
│  └──────────────────┘  └──────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐ │
│  │ M5 — Mini-Relatório (LabReportPanel reutilizado) │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Integração com IA (Lovable AI)

Uma **edge function** `generate-simulation-scenario` usará a Lovable AI Gateway para gerar cenários completos de simulação realística com árvore de decisão. O professor pode escolher entre cenários pré-definidos ou gerar novos via IA informando especialidade, complexidade e tema.

A IA retornará via **tool calling** um JSON estruturado contendo:
- Dados do paciente (nome, idade, queixa, histórico, medicamentos, exames)
- Árvore de etapas com 4-6 nós de decisão, cada um com 3-4 opções
- Efeitos de cada escolha nos sinais vitais do paciente
- Score e feedback por decisão
- Desfecho final baseado no caminho percorrido

### Cenários Pré-definidos

8 cenários nativos cobrindo áreas-chave:
1. Emergência Hipertensiva
2. Choque Séptico
3. Cetoacidose Diabética  
4. Intoxicação Medicamentosa
5. Reação Anafilática
6. Insuficiência Renal Aguda
7. Dor Torácica (diagnóstico diferencial)
8. Politerapia no Idoso (cascata de prescrição)

### Integração com API Externa — OpenFDA

Para enriquecer o laboratório com dados reais, integrar à **OpenFDA API** (gratuita, sem chave):
- `api.fda.gov/drug/label.json` — Buscar bulas e interações por nome do fármaco
- `api.fda.gov/drug/event.json` — Eventos adversos reportados
- Quando o aluno prescreve um medicamento, o sistema consulta automaticamente a OpenFDA para alertas de interação e efeitos adversos reais

### Arquivos a Criar/Editar

1. **`src/pages/lab-virtual/BancadaSimulacaoRealistica.tsx`** — Página principal da bancada (similar a BancadaFarmacos)
2. **`src/components/lab-virtual/PatientRecordPanel.tsx`** — M1: Prontuário do paciente com dados dinâmicos
3. **`src/components/lab-virtual/BranchingDecisionPanel.tsx`** — M2: Painel de decisão ramificada com opções e feedback
4. **`src/components/lab-virtual/PatientMonitorPanel.tsx`** — M3: Monitor de sinais vitais com gráficos Recharts em tempo real
5. **`src/components/lab-virtual/DecisionTimelinePanel.tsx`** — M4: Linha do tempo com árvore de decisões e score
6. **`supabase/functions/generate-simulation-scenario/index.ts`** — Edge function para geração de cenários via Lovable AI
7. **`src/pages/LaboratorioVirtual.tsx`** — Adicionar card da nova bancada
8. **`src/App.tsx`** — Adicionar rota `/laboratorio-virtual/simulacao-realistica`

### Integração com Salas Virtuais

A bancada seguirá o mesmo padrão dos demais simuladores:
- Hook `useVirtualRoomCase` para modo sala virtual
- Botão "Enviar Resultados" via `LabReportPanel` em modo VR
- Score baseado na porcentagem de decisões corretas
- Decisões estruturadas enviadas ao Analytics (label, escolha do aluno, escolha ideal, correto/incorreto)

### Detalhes Técnicos

- **Estado do paciente**: Objeto reativo que muda a cada decisão (sinais vitais, exames, alertas). Os gráficos do Monitor atualizam automaticamente.
- **Score**: Cada decisão tem peso; score final = soma ponderada de acertos / total possível * 100.
- **OpenFDA**: Chamadas client-side diretas (API pública, sem CORS issues, sem chave necessária).
- **IA**: Edge function com `LOVABLE_API_KEY`, modelo `google/gemini-3-flash-preview`, retorno via tool calling estruturado.

