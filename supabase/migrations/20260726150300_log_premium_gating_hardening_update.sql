-- Logs the Premium/subscription enforcement hardening as a shipped update so it
-- shows up in the admin "Pipeline de Atualizações" changelog and, automatically,
-- in the Oráculo assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Assinatura Premium: gating fechado ponta a ponta',
  'Status de assinatura agora é persistido na tabela subscribers e sincronizado por um novo webhook do Stripe (stripe-webhook); Simuladores (incluindo dinâmicos criados por IA), Laboratório Virtual e MedView 3D passaram a ser bloqueados também por rota (deep link/refresh, não só pelo hub); o limite de 3 calculadoras/dia do plano Gratuito passou a ser verificado em toda navegação; a exportação de Relatórios em PDF passou a checar o plano (antes não havia nenhuma verificação); e as edge functions de geração por IA (generate-tool, generate-game, generate-lab-context, generate-simulation-scenario) agora validam o plano Premium no servidor.',
  'Segurança',
  'high',
  now()
);
