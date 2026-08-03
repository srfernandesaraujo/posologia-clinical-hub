-- Logs the new "Informática em Saúde" simulator category (roadmap item 17) as a shipped
-- update so it shows up in the admin "Pipeline de Atualizações" changelog and,
-- automatically, in the Oráculo assistant's live "ATUALIZAÇÕES RECENTES" context (see
-- supabase/functions/oracle-agent/index.ts, getRecentUpdatesBlock()).
INSERT INTO public.system_updates (type, status, title, description, category, priority, implemented_at)
VALUES (
  'update',
  'done',
  'Simulador de Prontuário Eletrônico (FHIR)',
  'Novo simulador (/simuladores/prontuario-fhir) e nova categoria "Informática em Saúde": navegue um prontuário clínico longitudinal (2-3 consultas) por abas Demografia/Problemas/Medicações/Exames/Linha do Tempo e veja cada seção mapeada, seção a seção, para o recurso FHIR correspondente (Patient, Condition, MedicationRequest, Observation, ServiceRequest) via mapeamento determinístico — sem IA, sem biblioteca de validação FHIR. Selecionável normalmente em Salas Virtuais.',
  'Simuladores',
  'medium',
  now()
);
