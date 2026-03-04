

## Plano: Provas de Simulação em Salas Virtuais

### Situação Atual

Hoje, uma sala virtual (`virtual_rooms`) vincula-se a **um único simulador** (`simulator_slug`) e opcionalmente **um único caso clínico** (`case_id`). O aluno entra via PIN, identifica-se, e é direcionado para aquele simulador/caso específico.

### Objetivo

Permitir que o professor monte uma **prova de simulação** dentro da sala virtual, composta por **múltiplos simuladores** e **múltiplos casos clínicos** selecionados, formando uma sequência de atividades que o aluno deve completar.

---

### 1. Nova Tabela: `room_activities`

Armazena cada item da prova (simulador + caso) vinculado à sala:

```text
room_activities
├── id (uuid, PK)
├── room_id (uuid, FK → virtual_rooms.id, ON DELETE CASCADE)
├── simulator_slug (text, NOT NULL)
├── case_id (uuid, nullable, FK → simulator_cases.id)
├── position (integer, NOT NULL) — ordem na prova
├── created_at (timestamptz)
```

RLS: mesmas regras de `virtual_rooms` — dono da sala gerencia, anon/authenticated visualizam se sala ativa.

### 2. Alteração na tabela `virtual_rooms`

- Os campos `simulator_slug` e `case_id` tornam-se **opcionais** (nullable). Quando a sala usa o modelo de prova (múltiplas atividades), esses campos ficam nulos e as atividades vêm de `room_activities`. Quando há apenas um simulador (modo legado), continuam funcionando como antes — compatibilidade total.
- Novo campo opcional: `description` (text) — já existe na tabela.

### 3. Alteração na tabela `room_submissions`

- Novo campo: `activity_id` (uuid, nullable, FK → room_activities.id) — identifica a qual atividade da prova a submissão se refere. Nullable para manter compatibilidade com salas legadas.

### 4. UI do Professor — Criação da Sala (SalasVirtuais.tsx)

Reformular o dialog de criação:

1. Manter campo **Título** e **Data de Expiração**.
2. Substituir o seletor único de simulador por uma **lista de atividades** com botão "Adicionar Atividade":
   - Cada atividade: Select de simulador + Select de caso clínico (carregado dinamicamente por `simulator_slug` da `simulator_cases`).
   - Botão de remover atividade e drag/reorder (ou setas cima/baixo para simplificar).
3. Ao salvar: criar a sala e inserir os registros em `room_activities` com `position` sequencial.
4. Manter retrocompatibilidade: se só 1 atividade, pode opcionalmente usar o modelo legado.

### 5. UI do Professor — Detalhes da Sala

- Exibir a lista de atividades da prova (simulador + caso) na ordem definida.
- Nos resultados dos participantes, agrupar submissões por atividade, mostrando score por etapa e score geral da prova.

### 6. UI do Aluno — Fluxo de Prova (SalaVirtualAluno.tsx)

Ao entrar na sala com múltiplas atividades:

1. Tela "Tudo pronto" mostra um **resumo da prova**: lista de atividades com simulador e caso.
2. Botão "Iniciar Prova" leva à **primeira atividade**.
3. Ao concluir cada atividade (submissão), o aluno é direcionado automaticamente para a **próxima atividade** da lista.
4. Ao concluir todas, tela de **resultado final** com score geral.
5. O `sessionStorage` passa a incluir `activityId` e a lista de atividades restantes.

### 7. Migration SQL

```sql
-- Tornar simulator_slug nullable em virtual_rooms
ALTER TABLE public.virtual_rooms 
  ALTER COLUMN simulator_slug DROP NOT NULL;

-- Tabela de atividades da prova
CREATE TABLE public.room_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.virtual_rooms(id) ON DELETE CASCADE,
  simulator_slug text NOT NULL,
  case_id uuid REFERENCES public.simulator_cases(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, position)
);

ALTER TABLE public.room_activities ENABLE ROW LEVEL SECURITY;

-- RLS
CREATE POLICY "Room owners can manage activities"
  ON public.room_activities FOR ALL TO authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()));

CREATE POLICY "Anyone can view activities of active rooms"
  ON public.room_activities FOR SELECT TO anon, authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE is_active = true));

CREATE POLICY "Admins can manage all activities"
  ON public.room_activities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Campo activity_id em room_submissions
ALTER TABLE public.room_submissions 
  ADD COLUMN activity_id uuid REFERENCES public.room_activities(id) ON DELETE SET NULL;
```

### 8. Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/new_migration.sql` | Criar tabela e alterar schema |
| `src/integrations/supabase/types.ts` | Atualizar tipos |
| `src/pages/SalasVirtuais.tsx` | Novo dialog de criação com lista de atividades; detalhes agrupados por atividade |
| `src/pages/SalaVirtualAluno.tsx` | Fluxo sequencial de prova com navegação entre atividades |
| Rotas de simulador (`/sala/simulador/:slug`) | Receber `activityId` do contexto e submeter com ele |

### Resumo

A mudança central é criar a tabela `room_activities` como relação 1:N com `virtual_rooms`, permitindo montar provas com N simuladores/casos. O fluxo do aluno passa a ser sequencial (atividade 1 → 2 → ... → resultado). O modelo atual de sala com um único simulador continua funcionando sem quebrar nada.

