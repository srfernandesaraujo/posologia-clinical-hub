
-- Add clinical references to Glasgow
UPDATE tools SET formula = jsonb_set(
  COALESCE(formula, '{}'::jsonb),
  '{references}',
  '[
    {"title": "Glasgow Coma Scale at 40 years: standing the test of time", "source": "Lancet Neurol", "year": "2014"},
    {"title": "The Glasgow structured approach to assessment of the Glasgow Coma Scale", "source": "Teasdale et al.", "year": "2014", "url": "https://www.glasgowcomascale.org"},
    {"title": "ATLS – Advanced Trauma Life Support", "source": "American College of Surgeons", "year": "2018"}
  ]'::jsonb
)
WHERE slug = 'escala-coma-glasgow-moderna';

-- Add clinical references to CURB-65
UPDATE tools SET formula = jsonb_set(
  COALESCE(formula, '{}'::jsonb),
  '{references}',
  '[
    {"title": "Defining community acquired pneumonia severity on presentation to hospital (CURB-65)", "source": "Thorax", "year": "2003", "url": "https://doi.org/10.1136/thorax.58.5.377"},
    {"title": "BTS Guidelines for the Management of Community Acquired Pneumonia", "source": "British Thoracic Society", "year": "2009"},
    {"title": "ATS/IDSA Guidelines for CAP in Adults", "source": "Am J Respir Crit Care Med", "year": "2019", "url": "https://doi.org/10.1164/rccm.201908-1581ST"}
  ]'::jsonb
)
WHERE slug = 'curb-65-pneumonia-pac';

-- Add clinical references to HAS-BLED
UPDATE tools SET formula = jsonb_set(
  COALESCE(formula, '{}'::jsonb),
  '{references}',
  '[
    {"title": "A novel user-friendly score (HAS-BLED) to assess risk of major bleeding", "source": "Chest", "year": "2010", "url": "https://doi.org/10.1378/chest.10-0134"},
    {"title": "ESC Guidelines for the management of atrial fibrillation", "source": "European Heart Journal", "year": "2020", "url": "https://doi.org/10.1093/eurheartj/ehaa612"},
    {"title": "2023 ACC/AHA/ACCP/HRS Guideline for AF", "source": "Circulation", "year": "2024"}
  ]'::jsonb
)
WHERE slug = 'calculadora-has-bled-risco-de-sangramento';

-- Add clinical references to Apgar
UPDATE tools SET formula = jsonb_set(
  COALESCE(formula, '{}'::jsonb),
  '{references}',
  '[
    {"title": "A Proposal for a New Method of Evaluation of the Newborn Infant", "source": "Anesthesia & Analgesia (Virginia Apgar)", "year": "1953"},
    {"title": "The Apgar Score: Historical Perspectives", "source": "Neonatology", "year": "2015"},
    {"title": "AAP/ACOG Neonatal Resuscitation Guidelines", "source": "Pediatrics", "year": "2021", "url": "https://doi.org/10.1542/peds.2020-038505E"}
  ]'::jsonb
)
WHERE slug = 'calculadora-de-apgar-avaliacao-inicial-do-recem-nascido';

-- Add clinical references to CHA2DS2-VASc
UPDATE tools SET formula = jsonb_set(
  COALESCE(formula, '{}'::jsonb),
  '{references}',
  '[
    {"title": "Guidelines for the management of atrial fibrillation (CHA₂DS₂-VASc)", "source": "European Heart Journal (ESC)", "year": "2020", "url": "https://doi.org/10.1093/eurheartj/ehaa612"},
    {"title": "Refining Clinical Risk Stratification for Predicting Stroke in AF", "source": "Chest", "year": "2010", "url": "https://doi.org/10.1378/chest.09-1584"},
    {"title": "2023 ACC/AHA/ACCP/HRS Guideline for AF", "source": "Circulation", "year": "2024"}
  ]'::jsonb
)
WHERE slug = 'score-chads-vasc-avc';
