-- Logs the adaptive mastery engine (simulator_attempts persistence + points
-- for solo simulators + Mapa de Competências in /gamificacao) as a shipped
-- update so it shows up in the admin "Pipeline de Atualizações" changelog
-- and, automatically, in the Oráculo assistant's live "ATUALIZAÇÕES
-- RECENTES" context (see supabase/functions/oracle-agent/index.ts,
-- getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Motor de maestria adaptativa (Mapa de Competências)',
  'Simuladores resolvidos individualmente (fora de Sala Virtual) agora persistem o score em simulator_attempts e creditam pontos de gamificação proporcionais ao score, algo que antes só acontecia em Salas Virtuais; a nova aba "Competências" em /gamificacao mostra um score de maestria por categoria de simulador (média dos scores reais ponderada por recência, meia-vida de 30 dias), com um teaser da categoria mais forte/mais fraca no Dashboard.',
  'Simuladores',
  'medium',
  now()
);
