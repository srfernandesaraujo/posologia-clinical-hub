

# Plano: Agente de Feedback Especializado em Simulações

## Objetivo

Transformar o Agente de Feedback em um agente especializado que acessa as salas virtuais do professor, carrega dados de desempenho dos alunos (submissions, scores, ações) e gera feedback individualizado por aluno usando instrumentos validados.

## Fluxo do Agente

1. **Listar salas virtuais** do usuário logado ao iniciar a conversa
2. Usuário **seleciona uma sala** (por nome ou número)
3. O frontend **busca dados completos** da sala: participantes, submissions, activities
4. Esses dados são injetados no contexto da conversa como mensagem de sistema
5. O agente segue o fluxo de feedback (escolha de tipo, instrumento, perguntas) mas agora **aplicado ao desempenho real dos alunos**
6. O agente pode dar feedback individual por aluno ou geral da turma

## Mudanças Técnicas

### 1. Frontend — `src/pages/AgenteFeedback.tsx`
- Ao iniciar, buscar as salas virtuais do usuário (`virtual_rooms` + `room_participants` + `room_submissions` + `room_activities`)
- Exibir lista de salas como cards clicáveis antes do chat
- Quando o usuário seleciona uma sala, montar um contexto JSON com:
  - Nome da sala, simulador, atividades
  - Lista de alunos com seus scores, ações e tempo gasto
- Enviar esse contexto como parte do body para o edge function
- Manter a interface de chat existente após seleção da sala

### 2. Backend — `supabase/functions/feedback-agent/index.ts`
- Aceitar campo opcional `roomContext` no body
- Quando `roomContext` está presente, injetar uma mensagem de sistema adicional com os dados de desempenho dos alunos
- Atualizar o `SYSTEM_PROMPT` para incluir instruções sobre como analisar dados de simulação:
  - Identificar alunos com baixo desempenho
  - Analisar padrões de erros nas ações
  - Gerar feedback individual estruturado
  - Comparar desempenho entre alunos

### 3. Edições no `AppLayout.tsx`
- Atualizar o label do item de menu para "Feedback de Simulação"

## Arquivos a editar

| Arquivo | Ação |
|---------|------|
| `src/pages/AgenteFeedback.tsx` | Reescrever com seleção de sala + injeção de contexto |
| `supabase/functions/feedback-agent/index.ts` | Adicionar suporte a `roomContext` e prompt especializado |
| `src/components/layouts/AppLayout.tsx` | Atualizar label do menu |

