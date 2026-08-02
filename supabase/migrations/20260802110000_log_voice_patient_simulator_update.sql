-- Logs the "Paciente-IA por Voz" simulator (Fase 3, item 09 do roadmap) as a
-- shipped update so it shows up in the admin "Pipeline de Atualizações"
-- changelog and, automatically, in the Oráculo assistant's live "ATUALIZAÇÕES
-- RECENTES" context (see supabase/functions/oracle-agent/index.ts,
-- getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Simulador Paciente-IA por Voz',
  'Novo simulador de anamnese e comunicação por voz (Farmácia Clínica): o aluno grava perguntas por microfone, a IA transcreve (Groq/OpenAI Whisper) e um paciente simulado responde em texto e em voz alta (Web Speech API), com avaliação final da anamnese por IA. Exclusivo do plano Premium, limite diário de 15 turnos de voz por usuário (primeiro rate limit real de custo de IA no backend) e não disponível em Salas Virtuais.',
  'Simuladores',
  'high',
  now()
);
