-- Item 10 do roadmap: OSCE digital certificado. O modo "Simulada" de Salas Virtuais
-- já sequencia estações avaliadas (room_activities) e registra resultado por estação
-- (room_submissions), mas nunca consolidava um resultado final nem emitia certificado.
-- Esta migration adiciona a peça final: certificado emitido pelo professor, com
-- detalhamento por competência e um sinal leve (não-bloqueante) de integridade de prova.

ALTER TABLE public.room_submissions
  ADD COLUMN tab_switch_count integer NOT NULL DEFAULT 0;

CREATE TABLE public.osce_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.virtual_rooms(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.room_participants(id) ON DELETE CASCADE,
  verification_code text NOT NULL UNIQUE,
  student_name text NOT NULL,
  exam_title text NOT NULL,
  final_score integer NOT NULL,
  competency_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  integrity_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_by uuid NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (room_id, participant_id)
);

CREATE INDEX idx_osce_certificates_room_id ON public.osce_certificates(room_id);
CREATE INDEX idx_osce_certificates_verification_code ON public.osce_certificates(verification_code);

ALTER TABLE public.osce_certificates ENABLE ROW LEVEL SECURITY;

-- Só o professor dono da sala e admins gerenciam certificados. Deliberadamente SEM
-- nenhuma policy pública de SELECT: uma policy USING (true) aqui vazaria nome de
-- todo aluno certificado para qualquer client anônimo — o mesmo erro que já foi
-- corrigido em virtual_rooms/room_authorized_emails (ver 20260515132332, 20260614180926).
-- A verificação pública passa só pela edge function certificate-verify (service role).
CREATE POLICY "Room owners can manage osce certificates"
  ON public.osce_certificates FOR ALL TO authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()))
  WITH CHECK (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()));

CREATE POLICY "Admins can manage all osce certificates"
  ON public.osce_certificates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
