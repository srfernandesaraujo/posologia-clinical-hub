-- Logs the new "Gestão da Cadeia de Suprimentos Farmacêuticos" simulator (new category
-- "Assistência Farmacêutica") and the skills-based upgrade of the AI simulator builder
-- (generate-tool) as a shipped update, so it shows up in the admin "Pipeline de Atualizações"
-- changelog and, automatically, in the Oráculo assistant's live "ATUALIZAÇÕES RECENTES"
-- context (see supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Simulador de Cadeia de Suprimentos e criador de simuladores com skills',
  'Novo simulador "Gestão da Cadeia de Suprimentos Farmacêuticos" (/simuladores/cadeia-suprimentos, categoria nova "Assistência Farmacêutica", 6 casos do ciclo seleção-programação-aquisição-armazenamento-distribuição-dispensação, total agora 111 simuladores em 14 categorias) e criador de simuladores por IA (Premium) reforçado com 13 skills por tipo de simulador, revisão automática de qualidade, até 7 etapas e o novo painel "modelo" (parâmetros com controles deslizantes, fórmulas e gráfico).',
  'Simuladores',
  'medium',
  now()
);
