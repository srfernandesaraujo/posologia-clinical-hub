-- Grupos em Salas Virtuais: líder + observadores e modo "todos respondem" (estilo TBL).
--
-- Antes: todos os membros de um grupo atribuído pelo professor convergiam na mesma linha de
-- room_participants e cada um podia responder/enviar, gerando várias submissões do mesmo grupo.
-- Agora, por padrão o primeiro a entrar vira líder (único que marca/avança/envia) e os demais
-- acompanham em tempo (quase) real. Com group_mode = 'collective', todos respondem e cada
-- submissão carrega o nome/e-mail de quem enviou.

ALTER TABLE public.virtual_rooms
  ADD COLUMN IF NOT EXISTS group_mode text NOT NULL DEFAULT 'leader'
  CHECK (group_mode IN ('leader', 'collective'));

ALTER TABLE public.room_participants
  ADD COLUMN IF NOT EXISTS leader_member_id text,
  ADD COLUMN IF NOT EXISTS leader_member_name text,
  ADD COLUMN IF NOT EXISTS leader_seen_at timestamptz;

-- Quem está presente em cada grupo (identidade = e-mail, ou chave do dispositivo).
CREATE TABLE IF NOT EXISTS public.room_group_members (
  participant_id uuid NOT NULL REFERENCES public.room_participants(id) ON DELETE CASCADE,
  member_id text NOT NULL,
  member_name text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (participant_id, member_id)
);

-- Estado do desafio do grupo (pergunta atual, resposta marcada, feedback...) por atividade,
-- escrito só pelo líder e lido pelos observadores.
CREATE TABLE IF NOT EXISTS public.room_group_state (
  participant_id uuid NOT NULL REFERENCES public.room_participants(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (participant_id, activity_id)
);

-- Alunos não são autenticados: todo acesso passa pela edge function room-access
-- (service role). RLS ligado e sem policies = nenhum acesso direto pelo cliente.
ALTER TABLE public.room_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_group_state ENABLE ROW LEVEL SECURITY;
