
-- Add unlimited access flag to profiles
ALTER TABLE public.profiles ADD COLUMN has_unlimited_access boolean NOT NULL DEFAULT false;
