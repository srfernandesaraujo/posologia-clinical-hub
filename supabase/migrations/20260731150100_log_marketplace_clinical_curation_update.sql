-- Logs the Marketplace clinical curation feature (audit-marketplace-tool edge
-- function + ai_audit_status/clinically_validated columns on tools +
-- /admin/marketplace-review) as a shipped update so it shows up in the admin
-- "Pipeline de Atualizações" changelog and, automatically, in the Oráculo
-- assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Curadoria clínica do Marketplace',
  'Calculadoras publicadas por usuários no Marketplace agora passam por auditoria automática de IA (edge function audit-marketplace-tool) contra literatura/faixas de referência clínicas — a publicação continua imediata, mas uma ferramenta sinalizada com risco clínico real é despublicada automaticamente até revisão humana; um admin pode aprovar manualmente em /admin/marketplace-review para conceder o selo "Validado clinicamente", exibido nos cards de /marketplace.',
  'Integrações',
  'high',
  now()
);
