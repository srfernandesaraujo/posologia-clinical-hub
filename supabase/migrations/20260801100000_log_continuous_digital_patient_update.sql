-- Logs the "Paciente Digital Contínuo" feature (Fase 3, item 02 do roadmap) as
-- a shipped update so it shows up in the admin "Pipeline de Atualizações"
-- changelog and, automatically, in the Oráculo assistant's live "ATUALIZAÇÕES
-- RECENTES" context (see supabase/functions/oracle-agent/index.ts,
-- getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Paciente Digital Contínuo nos simuladores de Fisiologia',
  'Os 5 simuladores de Fisiologia com caso clínico (SNA, Depuração Renal, Equilíbrio Ácido-Base, Regulação Glicêmica e Eletrofisiologia Cardíaca) agora compartilham um único paciente fisiológico por sessão (sessionStorage): decisões em um simulador influenciam os baselines herdados pelos outros, com painel de proveniência em cada um e uma nova página de snapshot consolidado em /simuladores/paciente-continuo — recurso exclusivo do uso individual, desativado dentro de Sala Virtual.',
  'Simuladores',
  'high',
  now()
);
