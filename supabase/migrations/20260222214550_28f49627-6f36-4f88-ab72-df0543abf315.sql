
INSERT INTO public.tools (name, slug, type, description, short_description, icon, is_active, is_marketplace)
VALUES
  ('Risco Cardiovascular', 'risco-cardiovascular', 'calculadora', 'Calculadora de risco cardiovascular com modelos Framingham, ASCVD e SCORE2', 'Estime o risco cardiovascular em 10 anos', 'Heart', true, false),
  ('Desmame de Corticoide', 'desmame-corticoide', 'calculadora', 'Calculadora de esquema de desmame de corticoides', 'Gere um plano de desmame de corticoides', 'Pill', true, false),
  ('Equivalência de Opioides', 'equivalencia-opioides', 'calculadora', 'Calculadora de conversão e equivalência entre opioides', 'Converta doses entre opioides', 'Scale', true, false),
  ('Ajuste de Dose Renal', 'ajuste-dose-renal', 'calculadora', 'Calculadora de ajuste de dose baseado na função renal', 'Ajuste doses para insuficiência renal', 'Kidney', true, false),
  ('Equivalência de Antidepressivos', 'equivalencia-antidepressivos', 'calculadora', 'Calculadora de equivalência entre antidepressivos', 'Converta doses entre antidepressivos', 'Brain', true, false),
  ('HOMA-IR', 'homa-ir', 'calculadora', 'Calculadora de resistência insulínica HOMA-IR', 'Calcule o índice HOMA-IR', 'Activity', true, false),
  ('FINDRISC', 'findrisc', 'calculadora', 'Questionário FINDRISC para risco de diabetes tipo 2', 'Estime o risco de diabetes tipo 2', 'ClipboardCheck', true, false)
ON CONFLICT DO NOTHING;
