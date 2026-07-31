-- Revisão espaçada semanal: preferência de opt-in por usuário (default true).
-- Coluna comum de perfil, não afetada pelo trigger que bloqueia auto-promoção
-- de has_unlimited_access (esse trigger só reage a mudanças nessa coluna específica).
ALTER TABLE public.profiles
  ADD COLUMN weekly_digest_opt_in boolean NOT NULL DEFAULT true;
