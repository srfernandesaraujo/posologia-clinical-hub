-- Logs the education-continuing-credit certification (roadmap item 11) as a shipped
-- update so it shows up in the admin "Pipeline de Atualizações" changelog and,
-- automatically, in the Oráculo assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Créditos de Educação Continuada',
  'Na aba Competências de /gamificacao, cada trilha (categoria de simulador) com maestria ponderada ≥70% e 3+ simuladores distintos concluídos libera emissão de um certificado verificável em PDF com código de verificação público em /verificar-credito/:codigo; recurso Premium, elegibilidade recalculada no servidor.',
  'Simuladores',
  'medium',
  now()
);
