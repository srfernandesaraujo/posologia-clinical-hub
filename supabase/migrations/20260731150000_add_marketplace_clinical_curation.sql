-- Curadoria clínica do Marketplace: publicação continua imediata, mas cada
-- calculadora publicada passa por auditoria de IA (audit-marketplace-tool) e
-- só ganha o selo "Validado clinicamente" depois de aprovação de admin.
ALTER TABLE public.tools
  ADD COLUMN ai_audit_status text NOT NULL DEFAULT 'pending'
    CHECK (ai_audit_status IN ('pending', 'clear', 'flagged')),
  ADD COLUMN ai_audit_notes text,
  ADD COLUMN ai_audited_at timestamptz,
  ADD COLUMN clinically_validated boolean NOT NULL DEFAULT false,
  ADD COLUMN clinically_validated_by uuid REFERENCES auth.users(id),
  ADD COLUMN clinically_validated_at timestamptz;

-- "Users can update their own tools" (USING auth.uid() = created_by, sem
-- WITH CHECK) permite ao dono atualizar qualquer coluna da própria
-- ferramenta — mesma classe de bug já corrigida em
-- profiles.has_unlimited_access (prevent_unlimited_access_self_grant).
-- Sem isso, o dono poderia se auto-aprovar via update client-side direto.
CREATE OR REPLACE FUNCTION public.protect_clinical_review_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chamada da edge function audit-marketplace-tool (service role): libera.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.ai_audit_status := OLD.ai_audit_status;
    NEW.ai_audit_notes := OLD.ai_audit_notes;
    NEW.ai_audited_at := OLD.ai_audited_at;
    NEW.clinically_validated := OLD.clinically_validated;
    NEW.clinically_validated_by := OLD.clinically_validated_by;
    NEW.clinically_validated_at := OLD.clinically_validated_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_clinical_review_fields ON public.tools;

CREATE TRIGGER trg_protect_clinical_review_fields
BEFORE UPDATE ON public.tools
FOR EACH ROW
EXECUTE FUNCTION public.protect_clinical_review_fields();
