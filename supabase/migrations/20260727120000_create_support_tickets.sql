-- Sistema de chamados de suporte técnico: agora que a plataforma é paga e vai
-- ter múltiplos clientes, o formulário de contato avulso (contact_messages)
-- não é suficiente — precisamos de um canal com thread de mensagens, status
-- e histórico por usuário, mais um painel de diagnóstico para o admin.

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'outro' CHECK (category IN ('bug', 'duvida', 'financeiro', 'sugestao', 'outro')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  -- Contexto técnico do navegador capturado no momento da abertura do chamado
  -- (userAgent, rota, resolução, idioma) — não há telemetria de erro no app hoje,
  -- então isso é o que fica disponível para o admin sem precisar pedir print.
  diagnostic_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_updated_at ON public.support_tickets(updated_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tickets, admins view all"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Status/prioridade só mudam pela mão do admin; o usuário só interage via
-- mensagens (uma nova mensagem do usuário reabre o chamado, ver hook no app).
CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Thread de mensagens do chamado (a descrição inicial é a primeira mensagem)
CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  sender_role text NOT NULL CHECK (sender_role IN ('user', 'admin')),
  message text NOT NULL,
  attachment_url text,
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can message on their own tickets, admins on any"
  ON public.support_ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Users can view messages on their own tickets, admins on any"
  ON public.support_ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Bucket privado para anexos de chamados: {user_id}/{ticket_id}/{filename}
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload attachments to their own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own attachments, admins view all"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
