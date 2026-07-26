-- Logs the documentation/Oráculo sync work as a shipped update so it shows up
-- both in the admin "Pipeline de Atualizações" changelog and, automatically,
-- in the Oráculo assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Documentação e Oráculo sincronizados com o catálogo real',
  'Corrigidas contagens defasadas de calculadoras (34) e simuladores (107 em 12 categorias, incluindo Genética e Farmacoterapia Laboratorial); MedView 3D passou a constar na documentação; aba técnica atualizada (Vite 7, React Router v7, Tailwind 3.4, provedor de IA multi-modelo); e o Oráculo passou a consultar automaticamente o Pipeline de Atualizações (system_updates) para aprender sobre novidades futuras sem precisar de redeploy.',
  'Admin',
  'high',
  now()
);
