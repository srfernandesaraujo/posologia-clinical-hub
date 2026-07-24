
INSERT INTO public.tools (slug, name, short_description, type, formula, is_active) VALUES
('interacoes', 'Interações Medicamentosas', 'Analise interações entre fármacos com dados do RxNav (NIH) e cenários clínicos.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('manejo-dor', 'Manejo da Dor e Analgesia', 'Classifique a dor e prescreva pelo protocolo da Escada Analgésica da OMS.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('inflamacao-aines', 'Inflamação e Anti-inflamatórios', 'Selecione AINEs e corticoides considerando seletividade COX e comorbidades.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('infeccoes-antibioticos', 'Infecções e Antibioticoterapia', 'Trate ITU e diarreia infecciosa.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('tratamento-asma', 'Tratamento da Asma', 'Classifique gravidade e selecione Steps GINA.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('farmacoterapia-hemograma', 'Hemograma e Condutas Hematológicas', 'Interprete hemograma e ajuste farmacoterapia.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('farmacoterapia-acido-base', 'Distúrbios Ácido-Base e Eletrólitos', 'Interprete gasometria e corrija distúrbios.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('farmacoterapia-hepatopatia', 'Hepatopatias e Ajuste Hepático', 'Interprete função hepática e ajuste doses.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('farmacoterapia-renal', 'Função Renal e Ajuste de Dose', 'Calcule ClCr/TFG e ajuste nefrotóxicos.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('farmacoterapia-infeccao-lab', 'Marcadores de Infecção e Antibioticoterapia', 'Interprete PCR, PCT, lactato para guiar antimicrobianos.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('farmacoterapia-dislipidemia', 'Perfil Lipídico e Risco Cardiovascular', 'Analise lipídios e defina metas.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('farmacoterapia-glicemia', 'Glicemia, Diabetes e Insulinoterapia', 'Interprete glicemia e HbA1c.', 'simulador', '{"type":"simulator"}'::jsonb, true),
('farmacoterapia-coagulacao', 'Coagulação e Anticoagulantes', 'Interprete INR, TTPa e coagulograma.', 'simulador', '{"type":"simulator"}'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;
