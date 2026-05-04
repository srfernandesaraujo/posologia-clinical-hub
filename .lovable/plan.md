# Conceito de Turmas + Analytics por Sala

Hoje as salas virtuais e os analytics vivem soltos: cada sala é criada de forma isolada, os alunos cadastrados são repetidos em cada sala, e o Analytics é uma página separada (`/analytics`) que mistura dados de tudo. A proposta abaixo introduz a entidade **Turma** (classe) como unidade organizadora e move a visualização de desempenho para dentro de cada sala, no padrão da imagem de referência (Prova Fácil).

## Modelo conceitual

```text
Professor
   └── Turma (ex.: "Farmacologia 2026.1 — T01")
        ├── Alunos cadastrados (lista única reaproveitável)
        └── Salas Virtuais (várias por turma)
              ├── Atividade(s): simulador / laboratório / jogo clínico / prova
              ├── Participantes (ingressos efetivos — individuais ou grupos)
              └── Analytics da sala (desempenho, tempo, decisões, ranking)
```

Pontos-chave:
- Uma sala pertence a **uma** turma. O professor escolhe a turma ao criar a sala.
- A lista de alunos restritos da sala passa a vir da turma (não precisa colar e-mails toda vez). O professor pode marcar "toda a turma" ou selecionar um subconjunto.
- Cada sala mantém sua própria página `Detalhes` com abas: **Visão geral · Participantes · Analytics · Configurações**.
- A página global `/analytics` é substituída por `Turmas → Sala → Analytics`. Mantemos um atalho "Analytics consolidado da turma" para comparar salas dentro da mesma turma.

## Mudanças no banco

Novas tabelas:

- `classes` — `id, name, description, semester, created_by, created_at, archived_at`.
- `class_students` — `id, class_id, full_name, email, external_id (matrícula opcional), created_at`. Único `(class_id, lower(email))`.
- `class_members` (opcional, futuro) — co-professores/monitores com acesso à turma.

Alterações:

- `virtual_rooms`: adicionar `class_id uuid references classes(id) on delete set null` + índice. Migração popular `class_id` como `NULL` para salas existentes (continuam funcionando como "Sem turma").
- `room_participants`: nada obrigatório, mas adicionar `class_student_id uuid` (nullable) para correlacionar o ingresso ao aluno cadastrado da turma — habilita o "marcador" cadastrado/ingressou que já implementamos.
- `room_submissions`: já tem `room_id`, suficiente para analytics por sala.

RLS:

- `classes`: SELECT/INSERT/UPDATE/DELETE somente quando `auth.uid() = created_by` (ou admin via `has_role`).
- `class_students`: acesso restrito ao dono da turma (`exists (select 1 from classes c where c.id = class_id and c.created_by = auth.uid())`). Aluno autenticado pode ler apenas o próprio registro, filtrado por e-mail (via função security definer, opcional).
- Política existente de `virtual_rooms` permanece, apenas validando que se `class_id` for setado, o professor é dono da turma.

## Mudanças de UI

1. **Nova página `/turmas`** (substitui o ponto de entrada atual de "Salas Virtuais" no menu — Salas viram subitens).
   - Lista de turmas em cards: nome, semestre, contagem de alunos, contagem de salas, último acesso.
   - Botão "Nova turma" abre dialog com nome/descrição/semestre.

2. **Página `/turmas/:id`** com abas:
   - **Alunos**: tabela editável (nome, e-mail, matrícula). Importação CSV/colar lista. Reutilizado pelas salas.
   - **Salas virtuais**: lista das salas dessa turma + botão "Nova sala" (mesmo dialog atual, com `class_id` pré-preenchido). Ao escolher "Acesso restrito", o seletor de alunos é multiselect populado pela turma.
   - **Analytics da turma**: visão consolidada (média por sala, ranking de alunos somando todas as salas, evolução temporal).
   - **Configurações**: renomear, arquivar.

3. **Página `/turmas/:classId/salas/:roomId`** (detalhe da sala, padrão Prova Fácil):
   - Cabeçalho com PIN, status, link de compartilhamento, botões "Editar" / "Encerrar".
   - Abas:
     - **Visão geral**: descrição, atividades incluídas, contadores (cadastrados, ingressos, submissões, tempo médio, nota média).
     - **Participantes**: tabela única que mistura "cadastrados na turma" + "ingressos" com badges (`Cadastrado`, `Ingressou`, `Concluiu`), igual ao padrão já implementado em participantes — mas filtrando pela turma.
     - **Analytics**: gráficos de desempenho por aluno/grupo, por desafio, por etapa, decisões do simulador, tempo gasto, ranking. Tudo o que hoje existe em `/analytics`, recortado por `room_id`.
     - **Configurações**: editar título, prazo, modo prova, atividades, alunos vinculados.

4. **Ajustes de navegação**:
   - Sidebar: "Turmas" (novo) → dentro: "Salas virtuais" (atalho à listagem antiga, agora filtrável por turma) e "Analytics" (atalho a ranking global, opcional).
   - A rota antiga `/salas-virtuais` é mantida como listagem plana (todas as salas do professor) com filtro de turma; a rota `/analytics` redireciona para `/turmas` com aviso "Analytics agora vive dentro de cada sala/turma".

5. **Aluno**: fluxo de entrada não muda (PIN + e-mail). Internamente, ao validar e-mail em sala restrita, buscamos primeiro em `class_students` da turma da sala; se encontrado, o `room_participants.class_student_id` é preenchido — isso alimenta o marcador "cadastrado" automaticamente.

## Migração de dados

- Criar uma turma "Sem turma" por professor? Não — deixar `class_id` nulo. As páginas de turma ignoram salas sem turma; a listagem antiga continua mostrando-as e oferece botão "Mover para turma…".
- Para professores que já cadastraram listas de e-mails em salas restritas, oferecer no detalhe da sala um botão "Importar alunos para a turma" (extrai e-mails únicos das `room_participants.group_members` daquela sala e cria registros em `class_students`).

## Detalhes técnicos

Arquivos novos:
- `src/pages/Turmas.tsx`, `src/pages/TurmaDetalhe.tsx`, `src/pages/SalaDetalhe.tsx`.
- `src/components/turmas/ClassStudentsTable.tsx`, `ClassRoomsList.tsx`, `ClassAnalyticsPanel.tsx`.
- `src/components/salas/RoomDetailTabs.tsx`, `RoomAnalyticsPanel.tsx` (extrai a maior parte de `Analytics.tsx` parametrizando por `roomId`).
- `src/hooks/useClasses.ts`, `useClassStudents.ts`, `useRoomAnalytics.ts`.

Refatorações:
- `SalasVirtuais.tsx`: dialog de criar/editar passa a aceitar `class_id` e usar a lista de alunos da turma quando disponível.
- `Analytics.tsx`: extrair gráficos em componentes reutilizáveis recebendo `roomId` (ou `classId` + lista de roomIds). Página global vira "Resumo de turmas".
- `App.tsx`: adicionar rotas `/turmas`, `/turmas/:id`, `/turmas/:classId/salas/:roomId`.
- `SalaVirtualAluno.tsx`: ao validar e-mail, consultar também `class_students` da turma da sala para preencher `class_student_id`.

Edge functions: nenhuma nova obrigatória; tudo cabe em RLS + queries do client.

## Fora do escopo desta entrega

- Co-professores/monitores por turma (deixar a coluna preparada, UI depois).
- Importação direta a partir do SIGAA/AVA institucional.
- Comparação inter-turmas (pode vir como evolução do "Resumo de turmas").
