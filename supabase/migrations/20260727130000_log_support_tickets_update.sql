-- Logs the new technical support ticket system as a shipped update so it shows
-- up in the admin "Pipeline de Atualizações" changelog and, automatically, in
-- the Oráculo assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Sistema de chamados de suporte técnico',
  'Usuários logados agora podem abrir chamados de suporte em /suporte (assunto, categoria, descrição e anexo opcional), acompanhar status/prioridade e responder em thread com o admin; administradores gerenciam todos os chamados em /admin/tickets, com filtros, thread de resposta e uma aba de Diagnóstico (conta/plano, contexto técnico do navegador e atividade recente do usuário); notificações por e-mail são enviadas via Resend na abertura e a cada resposta.',
  'Admin',
  'medium',
  now()
);
