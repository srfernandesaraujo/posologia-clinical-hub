-- Ensure the Google AI provider is tried first by callAI() (ordered by priority ascending),
-- and give the remaining providers a sane, deterministic default order.
-- Safe to run against a table with zero, some, or all providers configured.
UPDATE public.ai_api_keys SET priority = 0 WHERE provider = 'google';
UPDATE public.ai_api_keys SET priority = 10 WHERE provider = 'groq';
UPDATE public.ai_api_keys SET priority = 20 WHERE provider = 'openai';
UPDATE public.ai_api_keys SET priority = 30 WHERE provider = 'anthropic';
UPDATE public.ai_api_keys SET priority = 40 WHERE provider = 'openrouter';
