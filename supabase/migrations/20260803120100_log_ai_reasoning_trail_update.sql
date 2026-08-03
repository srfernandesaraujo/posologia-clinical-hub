-- Logs the explainable AI reasoning trail (roadmap item 16) as a shipped update so it
-- shows up in the admin "Pipeline de Atualizações" changelog and, automatically, in the
-- Oráculo assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Trilha de Raciocínio Explicável da IA',
  'No Feedback de Simulação, o botão "Finalizar e salvar avaliação" faz a IA gerar (via tool calling) uma cadeia auditável de critérios — instrumento aplicado, observação real da sala, referência e veredito por critério — persistida em ai_reasoning_traces e reaberta em "Avaliações salvas nesta sala"; a mesma UI expansível (ReasoningTrail) passou a exibir a rubrica do Paciente-IA por Voz e as decisões do Analytics.',
  'Salas Virtuais',
  'medium',
  now()
);
