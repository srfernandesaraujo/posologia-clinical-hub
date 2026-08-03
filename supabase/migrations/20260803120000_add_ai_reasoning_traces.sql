-- Item 16 do roadmap: trilha de raciocínio explicável da IA. O feedback do professor
-- gerado por feedback-agent hoje é 100% texto livre, sem nenhum critério estruturado, e
-- é efêmero (um refresh derruba a conversa inteira). Esta migration adiciona o registro
-- persistido e auditável: quando o professor clica "Finalizar e salvar avaliação",
-- feedback-agent passa a devolver (e salvar) a cadeia de critérios aplicada, não só o
-- texto final.
--
-- voice-patient-eval não precisa de tabela nova: seus rubricItems já persistem embutidos
-- em simulator_attempts.actions/room_submissions.actions via buildSimulatorDecisions() —
-- só faltava UI expansível, que é tratada no client.

CREATE TABLE public.ai_reasoning_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.virtual_rooms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  instrument text,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text NOT NULL,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_reasoning_traces_room_id ON public.ai_reasoning_traces(room_id);

ALTER TABLE public.ai_reasoning_traces ENABLE ROW LEVEL SECURITY;

-- Mesmo raciocínio de osce_certificates: só o professor dono da sala e admins podem ler
-- ou escrever. feedback-agent hoje não tem nenhuma visão para o aluno, então não há
-- policy de SELECT para outro papel.
CREATE POLICY "Room owners can manage ai reasoning traces"
  ON public.ai_reasoning_traces FOR ALL TO authenticated
  USING (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()))
  WITH CHECK (room_id IN (SELECT id FROM public.virtual_rooms WHERE created_by = auth.uid()));

CREATE POLICY "Admins can manage all ai reasoning traces"
  ON public.ai_reasoning_traces FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
