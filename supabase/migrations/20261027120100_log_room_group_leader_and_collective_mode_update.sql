-- Logs the Salas Virtuais group leader/observer roles and the "Todos do grupo respondem (estilo TBL)"
-- mode as a shipped update, so it shows up in the admin "Pipeline de Atualizações" changelog and,
-- automatically, in the Oráculo assistant's live "ATUALIZAÇÕES RECENTES" context.
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Salas Virtuais: líder/observadores no grupo e modo "todos respondem" (TBL)',
  'Em grupos atribuídos pelo professor o primeiro a entrar vira líder (marca, avança e envia) e os demais observam em tempo real, com passagem/assunção de liderança; novo toggle do professor "Todos do grupo respondem (estilo TBL)" registra quem enviou cada resposta, exibido em "Enviado por" (sem comparação gRAT ainda).',
  'Salas Virtuais',
  'medium',
  now()
);
