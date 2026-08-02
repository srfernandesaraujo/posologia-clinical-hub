-- Logs the "Caso em Equipe (ao vivo)" live team-case activity (roadmap item 04) as a
-- shipped update so it shows up in the admin "Pipeline de Atualizações" changelog and,
-- automatically, in the Oráculo assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Caso em Equipe (ao vivo) em Salas Virtuais',
  'Nova modalidade de atividade dentro de Salas Virtuais: um caso clínico sincronizado ao vivo (papéis de médico, farmacêutico e enfermagem) que múltiplos participantes assumem na mesma sessão, com timeline compartilhada em tempo real e intercorrências injetadas pelo professor. Ao encerrar, gera automaticamente uma submissão por participante, integrando-se ao Analytics existente sem tela de relatório nova. 1 caso-piloto disponível ("Sepse grave — admissão na UTI").',
  'Salas Virtuais',
  'high',
  now()
);
