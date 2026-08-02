-- Item 04 do roadmap: Salas Virtuais ao vivo — caso em equipe sincronizado por papéis.
-- Estado do caso é derivado como função pura do log de eventos (live_session_events),
-- não uma linha mutável — evita condições de corrida entre papéis distintos escrevendo
-- ao mesmo tempo (mesmo espírito do patientEngine.ts do item 02: função pura sobre histórico).

CREATE TABLE public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.virtual_rooms(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.room_activities(id) ON DELETE SET NULL,
  case_key text NOT NULL,
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'ended')),
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Papel assumido por cada participante numa sessão (1 papel por sessão, sem duplicar papel ou pessoa)
CREATE TABLE public.live_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.room_participants(id) ON DELETE CASCADE,
  role text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, role),
  UNIQUE (session_id, participant_id)
);

-- Log append-only: ações dos participantes, intercorrências injetadas pelo professor e eventos de sistema
CREATE TABLE public.live_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  actor_participant_id uuid REFERENCES public.room_participants(id) ON DELETE SET NULL,
  role text,
  event_type text NOT NULL CHECK (event_type IN ('action', 'intercorrencia', 'system')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_sessions_room_id ON public.live_sessions(room_id);
CREATE INDEX idx_live_session_participants_session_id ON public.live_session_participants(session_id);
CREATE INDEX idx_live_session_events_session_id ON public.live_session_events(session_id);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_events ENABLE ROW LEVEL SECURITY;

-- live_sessions: dono da sala (professor) e admin gerenciam; participantes anônimos
-- não escrevem direto (tudo passa pela edge function live-session-access com service role).
CREATE POLICY "Room owners can manage live sessions"
  ON public.live_sessions FOR ALL TO authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()))
  WITH CHECK (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()));

CREATE POLICY "Admins can manage all live sessions"
  ON public.live_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view live sessions of active rooms"
  ON public.live_sessions FOR SELECT TO anon, authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE is_active = true));

-- live_session_participants: leitura pública dentro de sessões de salas ativas (mostrar presença/papéis);
-- escrita só pelo dono da sala ou via service role (edge function).
CREATE POLICY "Room owners can manage live session participants"
  ON public.live_session_participants FOR ALL TO authenticated
  USING (session_id IN (
    SELECT ls.id FROM public.live_sessions ls
    JOIN public.virtual_rooms vr ON vr.id = ls.room_id
    WHERE vr.created_by = auth.uid()
  ))
  WITH CHECK (session_id IN (
    SELECT ls.id FROM public.live_sessions ls
    JOIN public.virtual_rooms vr ON vr.id = ls.room_id
    WHERE vr.created_by = auth.uid()
  ));

CREATE POLICY "Admins can manage all live session participants"
  ON public.live_session_participants FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view live session participants"
  ON public.live_session_participants FOR SELECT TO anon, authenticated
  USING (true);

-- live_session_events: leitura pública (timeline compartilhada); escrita de intercorrência/system
-- pelo dono da sala autenticado, escrita de ação de participante anônimo via service role.
CREATE POLICY "Room owners can manage live session events"
  ON public.live_session_events FOR ALL TO authenticated
  USING (session_id IN (
    SELECT ls.id FROM public.live_sessions ls
    JOIN public.virtual_rooms vr ON vr.id = ls.room_id
    WHERE vr.created_by = auth.uid()
  ))
  WITH CHECK (session_id IN (
    SELECT ls.id FROM public.live_sessions ls
    JOIN public.virtual_rooms vr ON vr.id = ls.room_id
    WHERE vr.created_by = auth.uid()
  ));

CREATE POLICY "Admins can manage all live session events"
  ON public.live_session_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view live session events"
  ON public.live_session_events FOR SELECT TO anon, authenticated
  USING (true);

-- Habilita Postgres Changes (CDC) na tabela de eventos para a timeline em tempo real.
-- Defensivo: se a publicação já for FOR ALL TABLES (ou a tabela já estiver incluída),
-- o ADD TABLE falharia — o bloco abaixo checa antes e engole qualquer erro benigno.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_session_events'
  ) THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_events;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;
