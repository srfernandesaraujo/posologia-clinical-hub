-- Dossiê psicométrico do certificado OSCE: nota ponderada (0-10) e análise de
-- itens por atividade (dificuldade/discriminação/peso recalculados por sala,
-- perfil de velocidade por questão). final_score (0-100) é mantido como está
-- para não quebrar certificados já emitidos e a página pública de verificação.

ALTER TABLE public.osce_certificates
  ADD COLUMN IF NOT EXISTS final_score_10 numeric(3,1),
  ADD COLUMN IF NOT EXISTS item_analysis jsonb NOT NULL DEFAULT '{}'::jsonb;
