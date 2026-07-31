-- Logs the "Oráculo como preceptor socrático" feature as a shipped update so
-- it shows up in the admin "Pipeline de Atualizações" changelog and,
-- automatically, in the Oráculo assistant's live "ATUALIZAÇÕES RECENTES"
-- context (see supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Oráculo como preceptor socrático em simuladores',
  'Quando o usuário abre o Oráculo dentro da página de um simulador e sua tentativa individual mais recente (simulator_attempts) teve decisões erradas, o assistente passa a agir como preceptor: pergunta sobre uma decisão específica em vez de responder direto (método do preceptor de um minuto), só revelando a resposta ideal se o usuário insistir ou já tiver respondido — nova ação rápida "Refletir sobre este caso" no widget. A function agora também verifica o JWT do usuário antes de ler dados privados de simulator_attempts, em vez de confiar no userId solto do corpo da requisição.',
  'Integrações',
  'medium',
  now()
);
