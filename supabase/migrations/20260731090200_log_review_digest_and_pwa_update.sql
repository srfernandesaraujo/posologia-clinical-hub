-- Logs the weekly spaced-review email/dashboard recommendations and the
-- offline-capable PWA as shipped updates so they show up in the admin
-- "Pipeline de Atualizações" changelog and, automatically, in the Oráculo
-- assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES
  (
    'update',
    'done',
    'Revisão espaçada semanal (e-mail + Dashboard)',
    'Usuários com o opt-in ativo (Minha Conta → Preferências) recebem toda segunda-feira um e-mail via Resend com até 5 sugestões de calculadoras/simuladores parados há 14+ dias ou de categorias frequentadas mas nunca abertas; a mesma lógica de recência/cobertura alimenta o bloco "Recomendado para você" no Dashboard.',
    'Infraestrutura',
    'medium',
    now()
  ),
  (
    'update',
    'done',
    'App instalável e calculadoras offline (PWA)',
    'A plataforma agora pode ser instalada como aplicativo (PWA); após a primeira visita, as 34 calculadoras continuam funcionando sem internet, com um banner avisando que resultados offline só são salvos no histórico ao reconectar.',
    'Infraestrutura',
    'medium',
    now()
  );
