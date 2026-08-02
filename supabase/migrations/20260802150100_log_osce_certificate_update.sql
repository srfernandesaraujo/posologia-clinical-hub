-- Logs the OSCE digital certificate (roadmap item 10) as a shipped update so it shows
-- up in the admin "Pipeline de Atualizações" changelog and, automatically, in the
-- Oráculo assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Certificado OSCE em Salas Virtuais',
  'Ao concluir todas as estações de uma Atividade Simulada, o professor agora pode emitir um certificado por aluno com nota final, desempenho por competência e um sinal leve de integridade de prova (trocas de aba/tela-cheia); gera PDF com código de verificação único, revogável, com verificação pública sem login em /verificar-certificado/:codigo.',
  'Salas Virtuais',
  'high',
  now()
);
