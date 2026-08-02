-- Logs the client-side "student risk" analytics signal (roadmap item 05) as a shipped
-- update so it shows up in the admin "Pipeline de Atualizações" changelog and,
-- automatically, in the Oráculo assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Sinal de risco por aluno no Analytics',
  'Novo badge "Observar"/"Atenção" na tabela de desempenho por aluno (Salas Virtuais → Analytics e em cada Turma), calculado 100% no navegador a partir dos dados já coletados — sem tabela nova e sem IA/ML: queda de nota, abandono de atividades e tempo de resposta atípico em relação à turma. Inclui o card "Alunos que precisam de atenção" no topo da aba Salas Virtuais do Analytics.',
  'Salas Virtuais',
  'medium',
  now()
);
