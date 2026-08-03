-- Item 11 do roadmap: certificação com créditos de educação continuada. Diferente do
-- certificado OSCE (item 10, escopado a "1 sala/prova"), a trilha aqui é a categoria de
-- simulador já usada pelo Mapa de Competências (useMastery.ts) — cobre qualquer uso da
-- plataforma, não só Salas Virtuais. É só o artefato técnico verificável (PDF + código
-- público); o reconhecimento formal junto a conselhos profissionais (CFF/CRF/CFM) é um
-- trâmite institucional fora do escopo deste código.

CREATE TABLE public.education_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_name text NOT NULL,
  track_category text NOT NULL,
  mastery_pct integer NOT NULL,
  distinct_simulators integer NOT NULL,
  credit_hours numeric NOT NULL,
  verification_code text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, track_category)
);

CREATE INDEX idx_education_credits_verification_code ON public.education_credits(verification_code);

ALTER TABLE public.education_credits ENABLE ROW LEVEL SECURITY;

-- Dono do crédito só enxerga o próprio; sem policy pública (mesmo raciocínio de
-- osce_certificates — student_name não pode vazar via SELECT público). Verificação
-- pública passa só pela edge function education-credit-verify (service role).
CREATE POLICY "Users can view their own education credits"
  ON public.education_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all education credits"
  ON public.education_credits FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Sem policy de INSERT/UPDATE para authenticated: emissão só via edge function
-- education-credit-issue (service role), que recalcula elegibilidade a partir de
-- simulator_attempts no servidor — impede o client inserir um crédito fabricado.
